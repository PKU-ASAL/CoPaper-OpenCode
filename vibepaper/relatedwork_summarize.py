"""Per-paper summarization via an OpenAI-compatible LLM.

For each paper marked ``download_status=downloaded`` in
``relatedwork/literature.json`` that lacks a summary, extract the PDF text
with ``pypdf``, send it to the configured model alongside ``storyline.md``
and the summary template, and write the result to
``relatedwork/papers/<paper_id>.md`` (registering it via
``LiteratureCatalog.register_summary``).

Concurrency is bounded by a thread pool; the request rate is capped by a
shared :class:`TokenBucket` (default 16 QPS).
"""

from __future__ import annotations

import argparse
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from vibepaper.literature import LiteratureCatalog
from vibepaper.llm_client import (
    LLMConfig,
    TokenBucket,
    build_client,
    load_config,
)

DEFAULT_QPS = 16.0
DEFAULT_CONCURRENCY = 8
DEFAULT_MAX_PDF_BYTES = 50 * 1024 * 1024  # 50 MB
DEFAULT_TEMPLATE_PATH = ".agents/skills/relatedwork-finder/template.md"
DEFAULT_STORYLINE_PATH = "storyline.md"
MAX_PDF_TEXT_CHARS = 80_000


SYSTEM_PROMPT = (
    "You are a research assistant summarizing academic papers for a "
    "literature review. You ALWAYS follow the user-provided markdown "
    "template exactly, filling each section with content drawn from the "
    "paper's text. You write concisely, prioritize technical accuracy, and "
    "explicitly tie the paper to the user's storyline where the template "
    "asks for it. Output ONLY the filled-in markdown, no preamble, no "
    "trailing commentary."
)


@dataclass
class SummaryResult:
    paper_id: str
    success: bool
    summary_path: str | None = None
    error: str | None = None
    pages: int = 0
    chars: int = 0


@dataclass
class SummarizeOutcome:
    processed: int
    succeeded: int
    failed: int
    skipped: int
    results: list[SummaryResult] = field(default_factory=list)


class PdfExtractionError(Exception):
    """Raised when a PDF cannot be turned into usable text."""


def _read_template(project_root: Path, template: str | Path | None) -> str:
    path = (
        Path(template)
        if template is not None
        else project_root / DEFAULT_TEMPLATE_PATH
    )
    if not path.exists():
        raise FileNotFoundError(f"Template not found: {path}")
    return path.read_text(encoding="utf-8")


def _read_storyline(project_root: Path, storyline: str | Path | None) -> str:
    if storyline is not None:
        path = Path(storyline)
    else:
        candidate = project_root / DEFAULT_STORYLINE_PATH
        if not candidate.exists():
            candidate = project_root / "paper.md"
        path = candidate

    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def extract_pdf_text(pdf_path: Path, *, max_bytes: int) -> tuple[str, int]:
    """Read the PDF, return (text, page_count). Raises on oversized / unreadable."""
    if not pdf_path.exists():
        raise PdfExtractionError(f"PDF not found: {pdf_path}")

    size = pdf_path.stat().st_size
    if size <= 0:
        raise PdfExtractionError(f"PDF is empty: {pdf_path}")
    if size > max_bytes:
        raise PdfExtractionError(
            f"PDF exceeds limit ({size} > {max_bytes} bytes): {pdf_path}"
        )

    try:
        from pypdf import PdfReader
        from pypdf.errors import PdfReadError
    except ImportError as exc:  # pragma: no cover - dependency declared
        raise PdfExtractionError(f"pypdf not available: {exc}") from exc

    try:
        reader = PdfReader(str(pdf_path))
    except (PdfReadError, OSError) as exc:
        raise PdfExtractionError(f"Cannot open PDF: {exc}") from exc

    page_count = len(reader.pages)
    fragments: list[str] = []
    for index, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except (PdfReadError, ValueError):
            text = ""
        text = text.strip()
        if text:
            fragments.append(f"[Page {index + 1}]\n{text}")
        if sum(len(fragment) for fragment in fragments) > MAX_PDF_TEXT_CHARS:
            fragments.append("[... truncated for length ...]")
            break

    body = "\n\n".join(fragments).strip()
    if not body:
        raise PdfExtractionError(
            f"No extractable text in {pdf_path} (scanned PDF?)."
        )
    return body, page_count


def _build_user_prompt(
    paper: dict[str, Any],
    *,
    storyline_text: str,
    template_text: str,
    pdf_text: str,
) -> str:
    title = str(paper.get("title") or paper.get("paper_id") or "")
    authors = ", ".join(str(item) for item in (paper.get("authors") or []))
    year = str(paper.get("year") or "")
    venue = str(paper.get("venue") or "")
    arxiv_id = str(paper.get("arxiv_id") or "")

    header_parts = [
        f"Title: {title}",
        f"Authors: {authors}" if authors else "",
        f"Year: {year}" if year else "",
        f"Venue: {venue}" if venue else "",
        f"arXiv ID: {arxiv_id}" if arxiv_id else "",
    ]
    header = "\n".join(part for part in header_parts if part)

    storyline_block = (
        f"--- STORYLINE (our project) ---\n{storyline_text.strip()}\n"
        if storyline_text.strip()
        else "--- STORYLINE (our project) ---\n(no storyline provided)\n"
    )

    return (
        f"{header}\n\n"
        f"{storyline_block}\n"
        f"--- SUMMARY TEMPLATE (fill every section) ---\n{template_text.strip()}\n\n"
        f"--- PAPER FULL TEXT ---\n{pdf_text}\n\n"
        "Now produce the filled-in markdown summary. Replace the bracketed "
        "placeholders in the template with content derived from the paper. "
        "Keep section headings exactly as in the template."
    )


def _summarize_single(
    catalog: LiteratureCatalog,
    paper: dict[str, Any],
    *,
    project_root: Path,
    storyline_text: str,
    template_text: str,
    config: LLMConfig,
    client,
    rate_limiter: TokenBucket,
    max_pdf_bytes: int,
) -> SummaryResult:
    paper_id = str(paper["paper_id"])
    pdf_relative = paper.get("pdf_path")
    if not isinstance(pdf_relative, str) or not pdf_relative.strip():
        return SummaryResult(
            paper_id=paper_id,
            success=False,
            error="No pdf_path recorded; run `vibe relatedwork download` first.",
        )

    pdf_path = project_root / pdf_relative
    try:
        pdf_text, pages = extract_pdf_text(pdf_path, max_bytes=max_pdf_bytes)
    except PdfExtractionError as exc:
        return SummaryResult(paper_id=paper_id, success=False, error=str(exc))

    user_prompt = _build_user_prompt(
        paper,
        storyline_text=storyline_text,
        template_text=template_text,
        pdf_text=pdf_text,
    )

    rate_limiter.acquire()
    try:
        completion = client.chat.completions.create(
            model=config.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
    except Exception as exc:  # noqa: BLE001 — surface any SDK / HTTP error
        return SummaryResult(
            paper_id=paper_id,
            success=False,
            error=f"LLM request failed: {exc}",
            pages=pages,
            chars=len(pdf_text),
        )

    body = (completion.choices[0].message.content or "").strip()
    if not body:
        return SummaryResult(
            paper_id=paper_id,
            success=False,
            error="LLM returned empty content.",
            pages=pages,
            chars=len(pdf_text),
        )

    summary_path = catalog.papers_dir / f"{paper_id}.md"
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(body + "\n", encoding="utf-8")

    return SummaryResult(
        paper_id=paper_id,
        success=True,
        summary_path=str(summary_path),
        pages=pages,
        chars=len(pdf_text),
    )


def _select_papers(
    catalog: LiteratureCatalog,
    *,
    paper_id: str | None,
    force: bool,
) -> tuple[list[dict[str, Any]], int]:
    papers = catalog.list_papers()
    skipped = 0
    selected: list[dict[str, Any]] = []
    for paper in papers:
        if paper_id is not None and str(paper["paper_id"]) != paper_id:
            continue
        if not paper.get("pdf_exists"):
            skipped += 1
            continue
        if paper.get("summary_exists") and not force:
            skipped += 1
            continue
        selected.append(paper)
    return selected, skipped


def summarize_papers(
    project_root: str | Path,
    *,
    paper_id: str | None = None,
    storyline: str | Path | None = None,
    template: str | Path | None = None,
    model: str | None = None,
    qps: float = DEFAULT_QPS,
    concurrency: int = DEFAULT_CONCURRENCY,
    force: bool = False,
    max_pdf_bytes: int = DEFAULT_MAX_PDF_BYTES,
    client=None,
) -> SummarizeOutcome:
    project_root_path = Path(project_root)
    catalog = LiteratureCatalog(project_root_path)
    catalog.load()

    selected, skipped = _select_papers(
        catalog, paper_id=paper_id, force=force
    )

    if not selected:
        return SummarizeOutcome(
            processed=0, succeeded=0, failed=0, skipped=skipped, results=[]
        )

    storyline_text = _read_storyline(project_root_path, storyline)
    template_text = _read_template(project_root_path, template)

    config = load_config(model_override=model)
    llm_client = client if client is not None else build_client(config)
    rate_limiter = TokenBucket(rate_per_sec=qps, capacity=max(int(qps), 1))

    results: list[SummaryResult] = []
    catalog_lock = threading.Lock()

    def _worker(paper: dict[str, Any]) -> SummaryResult:
        return _summarize_single(
            catalog,
            paper,
            project_root=project_root_path,
            storyline_text=storyline_text,
            template_text=template_text,
            config=config,
            client=llm_client,
            rate_limiter=rate_limiter,
            max_pdf_bytes=max_pdf_bytes,
        )

    if concurrency <= 1 or len(selected) == 1:
        for paper in selected:
            result = _worker(paper)
            results.append(result)
            if result.success and result.summary_path:
                with catalog_lock:
                    catalog.register_summary(result.paper_id, result.summary_path)
    else:
        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            future_map = {executor.submit(_worker, paper): paper for paper in selected}
            for future in as_completed(future_map):
                result = future.result()
                results.append(result)
                if result.success and result.summary_path:
                    with catalog_lock:
                        catalog.register_summary(
                            result.paper_id, result.summary_path
                        )

    catalog.save()

    succeeded = sum(1 for item in results if item.success)
    failed = sum(1 for item in results if not item.success)
    return SummarizeOutcome(
        processed=len(results),
        succeeded=succeeded,
        failed=failed,
        skipped=skipped,
        results=results,
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Summarize related-work PDFs via an OpenAI-compatible LLM, "
            "writing relatedwork/papers/<paper_id>.md per paper."
        )
    )
    parser.add_argument("--root", default=".", help="Project root directory.")
    parser.add_argument("--paper-id", default=None, help="Limit to one paper.")
    parser.add_argument(
        "--storyline", default=None, help="Storyline file (default: storyline.md)."
    )
    parser.add_argument(
        "--template", default=None, help="Summary template (default scaffold path)."
    )
    parser.add_argument(
        "--model", default=None, help="Override VIBEPAPER_MODEL."
    )
    parser.add_argument(
        "--qps", type=float, default=DEFAULT_QPS, help="Requests per second cap."
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=DEFAULT_CONCURRENCY,
        help="Max concurrent worker threads.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-summarize papers that already have a summary.",
    )
    parser.add_argument(
        "--max-pdf-bytes",
        type=int,
        default=DEFAULT_MAX_PDF_BYTES,
        help=f"Reject PDFs larger than this (bytes, default {DEFAULT_MAX_PDF_BYTES}).",
    )
    args = parser.parse_args()

    outcome = summarize_papers(
        args.root,
        paper_id=args.paper_id,
        storyline=args.storyline,
        template=args.template,
        model=args.model,
        qps=args.qps,
        concurrency=args.concurrency,
        force=args.force,
        max_pdf_bytes=args.max_pdf_bytes,
    )

    for result in outcome.results:
        if result.success:
            print(f"[ok]   {result.paper_id} -> {result.summary_path}")
        else:
            print(f"[fail] {result.paper_id} -> {result.error}")

    print(
        f"Processed {outcome.processed} papers: "
        f"{outcome.succeeded} succeeded, "
        f"{outcome.failed} failed, "
        f"{outcome.skipped} skipped."
    )


if __name__ == "__main__":
    main()
