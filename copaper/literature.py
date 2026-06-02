"""Related-work catalog management.

Stores canonical per-paper metadata in ``relatedwork/literature.json`` and
provides helpers for BibTeX synchronization, summary registration, and
cross-index construction.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any


class LiteratureCatalogError(Exception):
    """Raised when literature metadata cannot be processed."""


class DownloadStatus(str, Enum):
    """Persisted download status for a paper."""

    PENDING = "pending"
    DOWNLOADED = "downloaded"
    FAILED = "failed"
    MANUAL = "manual"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _relative_path(path: Path, root: Path) -> str:
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def _normalize_authors(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        if " and " in value:
            parts = re.split(r"\s+and\s+", value)
            return [part.strip() for part in parts if part.strip()]
        if ";" in value:
            return [part.strip() for part in value.split(";") if part.strip()]
        stripped = value.strip()
        return [stripped] if stripped else []
    return []


def _extract_arxiv_id(value: str | None) -> str | None:
    if not value:
        return None
    match = re.search(r"(\d{4}\.\d{4,5}(?:v\d+)?)", value)
    if match:
        return match.group(1)
    return None


def extract_bibtex_key(bibtex: str | None) -> str | None:
    if not bibtex:
        return None
    match = re.search(r"@\w+\s*\{\s*([^,\s]+)", bibtex, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None


def _generate_paper_id(title: str, authors: list[str], year: int | None) -> str:
    author_token = "paper"
    if authors:
        first_author = authors[0]
        if "," in first_author:
            author_token = first_author.split(",", 1)[0].strip() or author_token
        else:
            author_token = (
                first_author.split()[-1] if first_author.split() else author_token
            )

    title_tokens = [
        token for token in re.findall(r"[A-Za-z0-9]+", title.lower()) if token
    ]
    suffix = "".join(title_tokens[:2]) or "untitled"
    year_text = str(year) if year is not None else "0000"
    return f"{_slugify(author_token)}{year_text}{_slugify(suffix)[:24]}"


def _bibtex_field(entry: str, field_names: list[str]) -> str | None:
    for field_name in field_names:
        pattern = re.compile(
            rf"{field_name}\s*=\s*(\{{(?P<braced>.*?)\}}|\"(?P<quoted>.*?)\")",
            re.IGNORECASE | re.DOTALL,
        )
        match = pattern.search(entry)
        if match:
            value = match.group("braced") or match.group("quoted") or ""
            cleaned = re.sub(r"\s+", " ", value).strip()
            if cleaned:
                return cleaned
    return None


def split_bibtex_entries(text: str) -> list[str]:
    entries: list[str] = []
    index = 0
    length = len(text)

    while index < length:
        start = text.find("@", index)
        if start == -1:
            break

        brace_start = text.find("{", start)
        if brace_start == -1:
            break

        depth = 0
        cursor = brace_start
        while cursor < length:
            char = text[cursor]
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    entries.append(text[start : cursor + 1].strip())
                    index = cursor + 1
                    break
            cursor += 1
        else:
            break

    return entries


def parse_bibtex_entries(text: str) -> dict[str, dict[str, Any]]:
    parsed: dict[str, dict[str, Any]] = {}

    for entry in split_bibtex_entries(text):
        key = extract_bibtex_key(entry)
        if key is None:
            continue

        title = _bibtex_field(entry, ["title"]) or ""
        authors = _normalize_authors(_bibtex_field(entry, ["author"]) or "")
        venue = _bibtex_field(entry, ["journal", "booktitle"]) or ""
        year_text = _bibtex_field(entry, ["year"]) or ""
        arxiv_id = _extract_arxiv_id(
            _bibtex_field(entry, ["eprint", "archiveprefix", "journal", "note"]) or ""
        )

        year: int | None = None
        if year_text.isdigit():
            year = int(year_text)

        parsed[key] = {
            "paper_id": key,
            "title": title,
            "authors": authors,
            "year": year,
            "venue": venue,
            "arxiv_id": arxiv_id,
            "bibtex": entry.strip(),
        }

    return parsed


def render_bibtex_entry(paper: dict[str, Any]) -> str:
    paper_id = str(paper["paper_id"])
    title = str(paper.get("title") or "Untitled")
    authors = paper.get("authors") or []
    author_text = " and ".join(
        str(author).strip() for author in authors if str(author).strip()
    )
    year = paper.get("year")
    venue = str(paper.get("venue") or "")
    arxiv_id = str(paper.get("arxiv_id") or "")

    entry_type = "article"
    venue_field = "journal"
    if venue and not any(
        token in venue.lower() for token in ["arxiv", "journal", "transactions"]
    ):
        entry_type = "inproceedings"
        venue_field = "booktitle"

    fields = [
        f"  title={{{title}}}",
        f"  author={{{author_text or 'Unknown'}}}",
    ]

    if venue:
        fields.append(f"  {venue_field}={{{venue}}}")
    if year is not None:
        fields.append(f"  year={{{year}}}")
    if arxiv_id:
        fields.append(f"  eprint={{{arxiv_id}}}")

    return f"@{entry_type}{{{paper_id},\n" + ",\n".join(fields) + "\n}"


class LiteratureCatalog:
    """Read/write manager for ``relatedwork/literature.json``."""

    def __init__(self, project_root: str | Path) -> None:
        self.project_root = Path(project_root)
        self.relatedwork_dir = self.project_root / "relatedwork"
        self.catalog_file = self.relatedwork_dir / "literature.json"
        self.paper_list_file = self.relatedwork_dir / "paper_list.bib"
        self.pdfs_dir = self.relatedwork_dir / "pdfs"
        self.papers_dir = self.relatedwork_dir / "papers"
        self._data: dict[str, Any] = self._default_catalog()

    @staticmethod
    def _default_catalog() -> dict[str, Any]:
        return {
            "version": 1,
            "updated_at": "",
            "papers": {},
        }

    def ensure_dirs(self) -> None:
        self.relatedwork_dir.mkdir(parents=True, exist_ok=True)
        self.pdfs_dir.mkdir(parents=True, exist_ok=True)
        self.papers_dir.mkdir(parents=True, exist_ok=True)

    def load(self) -> dict[str, Any]:
        self.ensure_dirs()
        if not self.catalog_file.exists():
            self._data = self._default_catalog()
            return self._data

        raw = self.catalog_file.read_text(encoding="utf-8")
        self._data = json.loads(raw)
        self._data.setdefault("papers", {})
        self.refresh_artifact_statuses()
        return self._data

    def save(self) -> None:
        self.ensure_dirs()
        self.refresh_artifact_statuses()
        self._data["updated_at"] = _utc_now()

        fd, temp_path = tempfile.mkstemp(
            dir=str(self.relatedwork_dir),
            prefix=".literature_tmp_",
            suffix=".json",
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as file_obj:
                json.dump(self._data, file_obj, indent=2, ensure_ascii=False)
            os.replace(temp_path, self.catalog_file)
        except BaseException:
            try:
                os.unlink(temp_path)
            except OSError:
                pass
            raise

    def list_papers(self) -> list[dict[str, Any]]:
        self.refresh_artifact_statuses()
        papers = [paper.copy() for paper in self._data.get("papers", {}).values()]
        return sorted(papers, key=lambda item: str(item["paper_id"]))

    def get_paper(self, paper_id: str) -> dict[str, Any] | None:
        self.refresh_artifact_statuses()
        paper = self._data.get("papers", {}).get(paper_id)
        if paper is None:
            return None
        return paper.copy()

    def import_records(self, records: list[dict[str, Any]]) -> dict[str, int]:
        imported = 0
        updated = 0

        for record in records:
            normalized = self._normalize_record(record)
            paper_id = str(normalized["paper_id"])
            existing = self._data["papers"].get(paper_id)
            if existing is None:
                normalized["added_at"] = _utc_now()
                normalized["updated_at"] = normalized["added_at"]
                self._data["papers"][paper_id] = normalized
                imported += 1
                continue

            merged = existing.copy()
            changed = False
            for field in [
                "title",
                "year",
                "venue",
                "arxiv_id",
                "bibtex",
                "pdf_url",
                "pdf_path",
                "summary_path",
                "download_error",
                "source",
            ]:
                new_value = normalized.get(field)
                if new_value not in (None, "", []):
                    if merged.get(field) != new_value:
                        merged[field] = new_value
                        changed = True

            if normalized.get("authors"):
                if merged.get("authors") != normalized["authors"]:
                    merged["authors"] = normalized["authors"]
                    changed = True

            if normalized.get("download_status") and not (
                merged.get("download_status") == DownloadStatus.DOWNLOADED.value
                and normalized["download_status"] == DownloadStatus.PENDING.value
            ):
                if merged.get("download_status") != normalized["download_status"]:
                    merged["download_status"] = normalized["download_status"]
                    changed = True

            queries = merged.get("source_queries") or []
            merged_queries = list(queries)
            for query in normalized.get("source_queries") or []:
                if query not in merged_queries:
                    merged_queries.append(query)
                    changed = True
            merged["source_queries"] = merged_queries

            if changed:
                merged["updated_at"] = _utc_now()
                self._data["papers"][paper_id] = merged
                updated += 1

        self.refresh_artifact_statuses()
        return {"imported": imported, "updated": updated}

    def sync_bib(self) -> dict[str, int]:
        self.ensure_dirs()
        self.refresh_artifact_statuses()

        existing_entries: dict[str, dict[str, Any]] = {}
        if self.paper_list_file.exists():
            existing_entries = parse_bibtex_entries(
                self.paper_list_file.read_text(encoding="utf-8")
            )

        added_from_bib = 0
        for paper_id, entry in existing_entries.items():
            if paper_id not in self._data["papers"]:
                imported = self.import_records([entry])
                added_from_bib += imported["imported"]

        final_entries: dict[str, str] = {
            paper_id: str(entry["bibtex"]).strip()
            for paper_id, entry in existing_entries.items()
            if entry.get("bibtex")
        }

        written_to_bib = 0
        for paper in self.list_papers():
            paper_id = str(paper["paper_id"])
            bibtex = str(paper.get("bibtex") or "").strip()
            rendered = bibtex or render_bibtex_entry(paper)
            if final_entries.get(paper_id) != rendered:
                written_to_bib += 1
            final_entries[paper_id] = rendered

        text = "\n\n".join(
            final_entries[paper_id] for paper_id in sorted(final_entries)
        )
        if text:
            text += "\n"
        self.paper_list_file.write_text(text, encoding="utf-8")

        return {
            "added_from_bib": added_from_bib,
            "written_to_bib": written_to_bib,
            "total_entries": len(final_entries),
        }

    def register_summary(self, paper_id: str, summary_path: str | Path) -> None:
        paper = self._data.get("papers", {}).get(paper_id)
        if paper is None:
            raise LiteratureCatalogError(
                f"Paper '{paper_id}' not found in literature catalog."
            )

        summary = Path(summary_path)
        if not summary.exists():
            raise LiteratureCatalogError(f"Summary file not found: {summary}")

        paper["summary_path"] = _relative_path(summary, self.project_root)
        paper["summary_exists"] = True
        paper["updated_at"] = _utc_now()

    def mark_download_result(
        self,
        paper_id: str,
        status: DownloadStatus,
        *,
        pdf_path: str | Path | None = None,
        error: str | None = None,
    ) -> None:
        paper = self._data.get("papers", {}).get(paper_id)
        if paper is None:
            raise LiteratureCatalogError(
                f"Paper '{paper_id}' not found in literature catalog."
            )

        paper["download_status"] = status.value
        paper["download_error"] = error or None
        if pdf_path is not None:
            paper["pdf_path"] = _relative_path(Path(pdf_path), self.project_root)
        paper["updated_at"] = _utc_now()
        self.refresh_artifact_statuses()

    def iter_download_candidates(
        self,
        paper_id: str | None = None,
        retry_failed: bool = False,
    ) -> list[dict[str, Any]]:
        self.refresh_artifact_statuses()
        papers = self.list_papers()
        if paper_id is not None:
            return [paper for paper in papers if str(paper["paper_id"]) == paper_id]

        candidates: list[dict[str, Any]] = []
        for paper in papers:
            status = str(paper.get("download_status") or DownloadStatus.PENDING.value)
            if paper.get("pdf_exists"):
                continue
            if status == DownloadStatus.PENDING.value:
                candidates.append(paper)
            elif retry_failed and status == DownloadStatus.FAILED.value:
                candidates.append(paper)
        return candidates

    def build_cross_index(self) -> dict[str, Any]:
        from copaper.crossindex import CrossIndex

        index = CrossIndex(
            index_path=str(self.project_root / ".agents" / "cross_index.json")
        )
        index.build_from_papers(str(self.papers_dir))
        index.save()
        return index.get_coverage_report(str(self.project_root / "storyline.md"))

    def get_status_summary(self) -> dict[str, Any]:
        self.refresh_artifact_statuses()
        papers = self.list_papers()
        cross_index_path = self.project_root / ".agents" / "cross_index.json"

        counts = {
            "papers_found": len(papers),
            "papers_downloaded": sum(1 for paper in papers if paper.get("pdf_exists")),
            "download_failures": sum(
                1
                for paper in papers
                if paper.get("download_status") == DownloadStatus.FAILED.value
            ),
            "summaries_done": sum(1 for paper in papers if paper.get("summary_exists")),
            "cross_index_built": cross_index_path.exists(),
        }

        return {
            "catalog_path": _relative_path(self.catalog_file, self.project_root),
            "bib_path": _relative_path(self.paper_list_file, self.project_root),
            "pdf_dir": _relative_path(self.pdfs_dir, self.project_root),
            "summary_dir": _relative_path(self.papers_dir, self.project_root),
            "counts": counts,
            "papers": papers,
        }

    def refresh_artifact_statuses(self) -> None:
        for paper in self._data.get("papers", {}).values():
            pdf_path = paper.get("pdf_path")
            pdf_exists = False
            if isinstance(pdf_path, str) and pdf_path.strip():
                resolved_pdf = self.project_root / pdf_path
                pdf_exists = resolved_pdf.exists()
            paper["pdf_exists"] = pdf_exists

            if (
                pdf_exists
                and paper.get("download_status") != DownloadStatus.MANUAL.value
            ):
                paper["download_status"] = DownloadStatus.DOWNLOADED.value
            elif (
                not pdf_exists
                and paper.get("download_status") == DownloadStatus.DOWNLOADED.value
            ):
                paper["download_status"] = DownloadStatus.PENDING.value

            summary_path = paper.get("summary_path")
            summary_exists = False
            if isinstance(summary_path, str) and summary_path.strip():
                resolved_summary = self.project_root / summary_path
                summary_exists = resolved_summary.exists()
            paper["summary_exists"] = summary_exists

    def _normalize_record(self, record: dict[str, Any]) -> dict[str, Any]:
        title = str(record.get("title") or "").strip()
        authors = _normalize_authors(record.get("authors"))

        year_value = record.get("year")
        year: int | None = None
        if isinstance(year_value, int):
            year = year_value
        elif isinstance(year_value, str) and year_value.strip().isdigit():
            year = int(year_value.strip())

        venue = str(
            record.get("venue")
            or record.get("journal")
            or record.get("conference")
            or ""
        ).strip()
        bibtex = str(record.get("bibtex") or "").strip()
        arxiv_id = (
            str(record.get("arxiv_id") or "").strip()
            or _extract_arxiv_id(bibtex)
            or _extract_arxiv_id(str(record.get("pdf_url") or ""))
            or None
        )
        pdf_url = str(record.get("pdf_url") or record.get("pdf_link") or "").strip()

        paper_id = (
            str(record.get("paper_id") or record.get("bibtex_key") or "").strip()
            or extract_bibtex_key(bibtex)
            or _generate_paper_id(title, authors, year)
        )

        download_status_value = str(record.get("download_status") or "").strip()
        if download_status_value:
            download_status = DownloadStatus(download_status_value).value
        else:
            download_status = DownloadStatus.PENDING.value

        pdf_path_value = str(record.get("pdf_path") or "").strip()
        if pdf_path_value:
            download_status = DownloadStatus.DOWNLOADED.value

        summary_path_value = str(record.get("summary_path") or "").strip()
        source_queries = record.get("source_queries") or []
        if isinstance(source_queries, str):
            source_queries = [source_queries]

        return {
            "paper_id": paper_id,
            "title": title,
            "authors": authors,
            "year": year,
            "venue": venue,
            "arxiv_id": arxiv_id,
            "bibtex": bibtex,
            "pdf_url": pdf_url,
            "download_status": download_status,
            "download_error": str(record.get("download_error") or "").strip() or None,
            "pdf_path": pdf_path_value or None,
            "summary_path": summary_path_value or None,
            "source_queries": [
                str(query).strip() for query in source_queries if str(query).strip()
            ],
            "source": str(record.get("source") or "").strip() or None,
            "pdf_exists": bool(pdf_path_value),
            "summary_exists": bool(summary_path_value),
        }
