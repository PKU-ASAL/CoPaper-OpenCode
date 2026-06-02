"""Tests for related-work catalog and download helpers."""

from __future__ import annotations

import io
from pathlib import Path

from copaper.literature import LiteratureCatalog, extract_bibtex_key
from copaper.relatedwork_download import download_papers, validate_pdf_file


class TestLiteratureCatalog:
    def test_import_records_creates_catalog_and_generates_ids(
        self, tmp_path: Path
    ) -> None:
        catalog = LiteratureCatalog(tmp_path)
        catalog.load()

        result = catalog.import_records(
            [
                {
                    "title": "Consistency Vision Language Action",
                    "authors": ["Song, W", "Chen, J"],
                    "year": 2025,
                    "venue": "arXiv",
                    "bibtex": "@article{song2025ceed, title={Consistency Vision Language Action}, author={Song, W and Chen, J}, year={2025}}",
                    "pdf_url": "https://example.com/paper.pdf",
                }
            ]
        )
        catalog.save()

        assert result == {"imported": 1, "updated": 0}
        saved = catalog.load()
        assert "song2025ceed" in saved["papers"]
        assert (
            saved["papers"]["song2025ceed"]["title"]
            == "Consistency Vision Language Action"
        )

    def test_sync_bib_merges_bib_only_entries(self, tmp_path: Path) -> None:
        catalog = LiteratureCatalog(tmp_path)
        catalog.load()
        catalog.import_records(
            [
                {
                    "paper_id": "rapid2026",
                    "title": "RAPID",
                    "authors": ["Zheng, Z"],
                    "year": 2026,
                    "venue": "arXiv",
                }
            ]
        )

        bib_path = tmp_path / "relatedwork" / "paper_list.bib"
        bib_path.parent.mkdir(parents=True, exist_ok=True)
        bib_path.write_text(
            "@article{song2025ceed,\n"
            "  title={CEED-VLA},\n"
            "  author={Song, W and Chen, J},\n"
            "  journal={arXiv preprint arXiv:2506.13725},\n"
            "  year={2025}\n"
            "}\n",
            encoding="utf-8",
        )

        result = catalog.sync_bib()
        catalog.save()
        summary = catalog.get_status_summary()

        assert result["added_from_bib"] == 1
        assert result["total_entries"] == 2
        assert len(summary["papers"]) == 2
        assert "song2025ceed" in catalog.load()["papers"]
        assert "rapid2026" in bib_path.read_text(encoding="utf-8")

    def test_register_summary_marks_summary_exists(self, tmp_path: Path) -> None:
        catalog = LiteratureCatalog(tmp_path)
        catalog.load()
        catalog.import_records(
            [
                {
                    "paper_id": "paper1",
                    "title": "Paper One",
                    "authors": ["Doe, Jane"],
                    "year": 2024,
                }
            ]
        )

        summary_path = tmp_path / "relatedwork" / "papers" / "paper1.md"
        summary_path.parent.mkdir(parents=True, exist_ok=True)
        summary_path.write_text("# Paper One\n\n## Insight\n", encoding="utf-8")

        catalog.register_summary("paper1", summary_path)
        catalog.save()

        paper = catalog.get_paper("paper1")
        assert paper is not None
        assert paper["summary_exists"] is True
        assert paper["summary_path"] == "relatedwork/papers/paper1.md"


class _FakeHeaders:
    def __init__(self, content_type: str) -> None:
        self._content_type = content_type

    def get_content_type(self) -> str:
        return self._content_type


class _FakeResponse:
    def __init__(self, content: bytes, content_type: str = "application/pdf") -> None:
        self._buffer = io.BytesIO(content)
        self.headers = _FakeHeaders(content_type)

    def read(self, size: int = -1) -> bytes:
        return self._buffer.read(size)

    def __enter__(self) -> _FakeResponse:
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        return False


class TestRelatedworkDownload:
    def test_validate_pdf_file_rejects_html(self, tmp_path: Path) -> None:
        html_path = tmp_path / "bad.pdf"
        html_path.write_bytes(b"<html>login</html>")

        is_valid, reason = validate_pdf_file(html_path)
        assert is_valid is False
        assert "not a PDF" in reason

    def test_download_papers_marks_downloaded(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        from copaper import relatedwork_download

        pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF"
        monkeypatch.setattr(
            relatedwork_download,
            "urlopen",
            lambda request, timeout=30: _FakeResponse(pdf_bytes),
        )

        catalog = LiteratureCatalog(tmp_path)
        catalog.load()
        catalog.import_records(
            [
                {
                    "paper_id": "paper1",
                    "title": "Paper One",
                    "authors": ["Doe, Jane"],
                    "year": 2024,
                    "pdf_url": "https://example.com/paper1.pdf",
                }
            ]
        )
        catalog.save()

        outcome = download_papers(tmp_path)
        catalog.load()
        paper = catalog.get_paper("paper1")

        assert outcome["downloaded"] == 1
        assert paper is not None
        assert paper["download_status"] == "downloaded"
        assert paper["pdf_exists"] is True
        assert (tmp_path / "relatedwork" / "pdfs" / "paper1.pdf").exists()


class TestBibtexHelpers:
    def test_extract_bibtex_key(self) -> None:
        assert (
            extract_bibtex_key("@article{song2025ceed, title={CEED-VLA}}")
            == "song2025ceed"
        )
