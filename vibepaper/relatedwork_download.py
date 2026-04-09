"""PDF download helpers for related-work metadata."""

from __future__ import annotations

import argparse
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from vibepaper.literature import DownloadStatus, LiteratureCatalog

_CHUNK_SIZE = 8192
_PDF_MAGIC = b"%PDF"
_ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/octet-stream",
    "binary/octet-stream",
}


@dataclass
class DownloadResult:
    paper_id: str
    success: bool
    path: str | None = None
    error: str | None = None
    content_type: str | None = None
    attempts: int = 0


class DownloadValidationError(Exception):
    """Raised when downloaded content is not a valid PDF."""


def validate_pdf_file(file_path: Path) -> tuple[bool, str]:
    if not file_path.exists():
        return False, "Downloaded file does not exist."

    if file_path.stat().st_size == 0:
        return False, "Downloaded file is empty."

    with open(file_path, "rb") as file_obj:
        header = file_obj.read(8)
    if not header.startswith(_PDF_MAGIC):
        return False, "Downloaded content is not a PDF file."

    with open(file_path, "rb") as file_obj:
        file_obj.seek(max(file_path.stat().st_size - 1024, 0))
        footer = file_obj.read()
    if b"%%EOF" not in footer:
        return False, "Downloaded PDF is missing EOF marker."

    return True, "ok"


def download_pdf(
    url: str,
    destination: Path,
    *,
    retries: int = 3,
    timeout: int = 30,
) -> DownloadResult:
    destination.parent.mkdir(parents=True, exist_ok=True)
    last_error = "Unknown download error."
    last_content_type: str | None = None

    for attempt in range(1, retries + 1):
        temp_path = destination.with_suffix(destination.suffix + ".part")
        try:
            request = Request(
                url,
                headers={
                    "User-Agent": "VibePaper/0.1 (+https://vibepaper.local)",
                    "Accept": "application/pdf,application/octet-stream;q=0.9,*/*;q=0.5",
                },
            )
            with (
                urlopen(request, timeout=timeout) as response,
                open(temp_path, "wb") as file_obj,
            ):
                content_type = response.headers.get_content_type()
                last_content_type = content_type
                if (
                    content_type
                    and content_type.lower() not in _ALLOWED_CONTENT_TYPES
                    and content_type.lower().startswith("text/")
                ):
                    raise DownloadValidationError(
                        f"Unexpected content type: {content_type}"
                    )

                while True:
                    chunk = response.read(_CHUNK_SIZE)
                    if not chunk:
                        break
                    file_obj.write(chunk)

            is_valid, reason = validate_pdf_file(temp_path)
            if not is_valid:
                raise DownloadValidationError(reason)

            temp_path.replace(destination)
            return DownloadResult(
                paper_id="",
                success=True,
                path=str(destination),
                content_type=last_content_type,
                attempts=attempt,
            )
        except (HTTPError, URLError, OSError, DownloadValidationError) as exc:
            last_error = str(exc)
            if temp_path.exists():
                temp_path.unlink()
            if attempt < retries:
                time.sleep(0.2 * attempt)

    return DownloadResult(
        paper_id="",
        success=False,
        error=last_error,
        content_type=last_content_type,
        attempts=retries,
    )


def download_papers(
    project_root: str | Path,
    *,
    paper_id: str | None = None,
    retry_failed: bool = False,
) -> dict[str, Any]:
    catalog = LiteratureCatalog(project_root)
    catalog.load()
    candidates = catalog.iter_download_candidates(
        paper_id=paper_id,
        retry_failed=retry_failed,
    )

    results: list[DownloadResult] = []
    for paper in candidates:
        current_paper_id = str(paper["paper_id"])
        pdf_url = str(paper.get("pdf_url") or "").strip()
        if not pdf_url:
            catalog.mark_download_result(
                current_paper_id,
                DownloadStatus.FAILED,
                error="No PDF download link available.",
            )
            results.append(
                DownloadResult(
                    paper_id=current_paper_id,
                    success=False,
                    error="No PDF download link available.",
                )
            )
            continue

        destination = catalog.pdfs_dir / f"{current_paper_id}.pdf"
        result = download_pdf(pdf_url, destination)
        result.paper_id = current_paper_id
        if result.success:
            catalog.mark_download_result(
                current_paper_id,
                DownloadStatus.DOWNLOADED,
                pdf_path=destination,
                error=None,
            )
        else:
            catalog.mark_download_result(
                current_paper_id,
                DownloadStatus.FAILED,
                error=result.error,
            )
        results.append(result)

    catalog.save()

    return {
        "catalog_path": str(catalog.catalog_file),
        "processed": len(results),
        "downloaded": sum(1 for result in results if result.success),
        "failed": sum(1 for result in results if not result.success),
        "results": [result.__dict__ for result in results],
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download related-work PDFs from relatedwork/literature.json"
    )
    parser.add_argument("--root", default=".", help="Project root directory")
    parser.add_argument("--paper-id", default=None, help="Download only one paper")
    parser.add_argument(
        "--retry-failed",
        action="store_true",
        help="Retry previously failed downloads",
    )
    args = parser.parse_args()

    outcome = download_papers(
        args.root,
        paper_id=args.paper_id,
        retry_failed=args.retry_failed,
    )

    for result in outcome["results"]:
        if result["success"]:
            print(f"[downloaded] {result['paper_id']} -> {result['path']}")
        else:
            print(f"[failed] {result['paper_id']} -> {result['error']}")

    print(
        f"Processed {outcome['processed']} papers: "
        f"{outcome['downloaded']} downloaded, {outcome['failed']} failed."
    )


if __name__ == "__main__":
    main()
