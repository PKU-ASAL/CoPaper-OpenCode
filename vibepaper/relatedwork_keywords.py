"""Extract related-work search queries from storyline.md via an LLM.

The CLI subcommand ``vibe relatedwork keywords`` reads the project's
``storyline.md`` (or ``paper.md`` as fallback), asks the model for N distinct
search queries, and writes them one-per-line to ``relatedwork/queries.txt``.
The output file is the input expected by
``vibe relatedwork search --queries-file ...``.
"""

from __future__ import annotations

import argparse
import os
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path

from vibepaper.llm_client import (
    LLMConfigError,
    build_client,
    load_config,
)

DEFAULT_OUTPUT = "relatedwork/queries.txt"
DEFAULT_COUNT = 8
MAX_INPUT_CHARS = 32_000


SYSTEM_PROMPT = (
    "You help researchers find related work for an academic paper. "
    "Given a project's storyline or paper draft, you extract a focused list "
    "of search queries that will surface the most relevant prior work. "
    "Each query MUST be: (a) 3-8 words, (b) specific enough to avoid generic "
    "matches, (c) phrased as a search engine would expect (no quotes, no "
    "boolean operators), (d) different from the others (cover distinct sub-"
    "topics, methods, and competing approaches). Output ONLY the queries, "
    "one per line, no numbering, no commentary."
)


@dataclass
class KeywordsOutcome:
    queries: list[str]
    output_path: str
    model: str


def _read_source_text(project_root: Path, source: Path | None) -> tuple[Path, str]:
    candidates: list[Path] = []
    if source is not None:
        candidates.append(source)
    else:
        candidates.extend(
            [project_root / "storyline.md", project_root / "paper.md"]
        )

    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            text = candidate.read_text(encoding="utf-8")
            if text.strip():
                return candidate, text

    raise FileNotFoundError(
        "No usable source file: tried "
        + ", ".join(str(path) for path in candidates)
    )


def _truncate_for_prompt(text: str) -> str:
    if len(text) <= MAX_INPUT_CHARS:
        return text
    head = text[: MAX_INPUT_CHARS // 2]
    tail = text[-MAX_INPUT_CHARS // 2 :]
    return f"{head}\n\n[... truncated for length ...]\n\n{tail}"


def parse_queries(raw_text: str, *, max_count: int) -> list[str]:
    """Parse the model's reply into a clean query list."""
    queries: list[str] = []
    seen: set[str] = set()
    for line in raw_text.splitlines():
        candidate = line.strip()
        if not candidate:
            continue
        # Strip common list markers: "1.", "1)", "- ", "* ", "• "
        candidate = re.sub(r"^[\s\-\*\•]+", "", candidate)
        candidate = re.sub(r"^\d+[\.\)]\s+", "", candidate)
        # Strip surrounding quotes
        if len(candidate) >= 2 and candidate[0] == candidate[-1] and candidate[0] in {'"', "'"}:
            candidate = candidate[1:-1].strip()
        if not candidate:
            continue
        key = candidate.lower()
        if key in seen:
            continue
        seen.add(key)
        queries.append(candidate)
        if len(queries) >= max_count:
            break
    return queries


def _build_user_prompt(source_text: str, count: int) -> str:
    truncated = _truncate_for_prompt(source_text)
    return (
        f"Below is the project storyline / paper draft. Extract exactly "
        f"{count} distinct search queries that, taken together, will help find "
        "the most relevant related work. Aim for breadth across (a) the core "
        "problem, (b) the methods used, (c) competing or adjacent approaches, "
        "and (d) evaluation/benchmark prior art.\n\n"
        "---\n"
        f"{truncated}\n"
        "---\n\n"
        f"Now output exactly {count} queries, one per line, nothing else."
    )


def _write_queries_atomic(queries: list[str], destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    payload = "\n".join(queries) + ("\n" if queries else "")
    fd, temp_path = tempfile.mkstemp(
        dir=str(destination.parent),
        prefix=".queries_tmp_",
        suffix=".txt",
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file_obj:
            file_obj.write(payload)
        os.replace(temp_path, destination)
    except BaseException:
        try:
            os.unlink(temp_path)
        except OSError:
            pass
        raise


def extract_keywords(
    project_root: str | Path,
    *,
    source: str | Path | None = None,
    count: int = DEFAULT_COUNT,
    output: str | Path | None = None,
    model: str | None = None,
    client=None,
) -> KeywordsOutcome:
    """Run the keyword-extraction pipeline and write queries to disk."""
    project_root_path = Path(project_root)
    source_path = Path(source) if source else None
    resolved_source, source_text = _read_source_text(project_root_path, source_path)

    target = (
        Path(output)
        if output is not None
        else project_root_path / DEFAULT_OUTPUT
    )

    config = load_config(model_override=model)
    llm_client = client if client is not None else build_client(config)

    user_prompt = _build_user_prompt(source_text, count)
    completion = llm_client.chat.completions.create(
        model=config.model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
    )
    raw_text = completion.choices[0].message.content or ""
    queries = parse_queries(raw_text, max_count=count)

    if not queries:
        raise LLMConfigError(
            "Model returned no usable queries. Inspect raw reply: " + raw_text[:200]
        )

    _write_queries_atomic(queries, target)

    return KeywordsOutcome(
        queries=queries,
        output_path=str(target),
        model=config.model,
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Extract related-work search queries from storyline.md via an "
            "OpenAI-compatible LLM."
        )
    )
    parser.add_argument("--root", default=".", help="Project root directory.")
    parser.add_argument(
        "--from",
        dest="source",
        default=None,
        help="Source file (default: storyline.md, falling back to paper.md).",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=DEFAULT_COUNT,
        help=f"Number of queries to request (default {DEFAULT_COUNT}).",
    )
    parser.add_argument(
        "--out",
        default=None,
        help=f"Output file (default: <root>/{DEFAULT_OUTPUT}).",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Override VIBEPAPER_MODEL.",
    )
    args = parser.parse_args()

    outcome = extract_keywords(
        args.root,
        source=args.source,
        count=args.count,
        output=args.out,
        model=args.model,
    )

    print(
        f"Extracted {len(outcome.queries)} queries using {outcome.model}."
    )
    print(f"Written to {outcome.output_path}")
    for query in outcome.queries:
        print(f"  - {query}")


if __name__ == "__main__":
    main()
