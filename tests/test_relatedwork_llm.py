"""Tests for the LLM-backed relatedwork keywords / summarize CLI."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest
from click.testing import CliRunner

from vibepaper import relatedwork_keywords, relatedwork_summarize
from vibepaper.cli import main as cli_main
from vibepaper.literature import LiteratureCatalog
from vibepaper.llm_client import (
    LLMConfigError,
    TokenBucket,
    resolve_api_key,
    resolve_base_url,
    resolve_model,
)


# ---------------------------------------------------------------------------
# OpenAI client fakes
# ---------------------------------------------------------------------------


@dataclass
class _FakeMessage:
    content: str


@dataclass
class _FakeChoice:
    message: _FakeMessage


@dataclass
class _FakeCompletion:
    choices: list[_FakeChoice]


class _FakeCompletions:
    def __init__(self, responder) -> None:
        self._responder = responder
        self.calls: list[dict[str, Any]] = []

    def create(self, **kwargs: Any) -> _FakeCompletion:
        self.calls.append(kwargs)
        reply = self._responder(kwargs)
        return _FakeCompletion(choices=[_FakeChoice(message=_FakeMessage(content=reply))])


class _FakeChat:
    def __init__(self, responder) -> None:
        self.completions = _FakeCompletions(responder)


class FakeOpenAIClient:
    def __init__(self, responder) -> None:
        self.chat = _FakeChat(responder)


def _make_responder(text: str):
    def _respond(_kwargs: dict[str, Any]) -> str:
        return text

    return _respond


# ---------------------------------------------------------------------------
# llm_client resolvers
# ---------------------------------------------------------------------------


class TestLLMResolvers:
    def test_resolve_model_uses_env(self, monkeypatch) -> None:
        monkeypatch.setenv("VIBEPAPER_MODEL", "gpt-4o-mini")
        assert resolve_model() == "gpt-4o-mini"

    def test_resolve_model_explicit_overrides_env(self, monkeypatch) -> None:
        monkeypatch.setenv("VIBEPAPER_MODEL", "gpt-4o-mini")
        assert resolve_model("custom-model") == "custom-model"

    def test_resolve_model_missing_raises(self, monkeypatch) -> None:
        monkeypatch.delenv("VIBEPAPER_MODEL", raising=False)
        with pytest.raises(LLMConfigError):
            resolve_model()

    def test_resolve_api_key_missing_raises(self, monkeypatch) -> None:
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        with pytest.raises(LLMConfigError):
            resolve_api_key()

    def test_resolve_base_url_optional(self, monkeypatch) -> None:
        monkeypatch.delenv("OPENAI_BASE_URL", raising=False)
        assert resolve_base_url() is None
        monkeypatch.setenv("OPENAI_BASE_URL", "https://proxy.example.com/v1")
        assert resolve_base_url() == "https://proxy.example.com/v1"


# ---------------------------------------------------------------------------
# TokenBucket
# ---------------------------------------------------------------------------


class TestTokenBucket:
    def test_initial_burst_consumed_without_sleep(self) -> None:
        bucket = TokenBucket(rate_per_sec=16.0, capacity=4)
        for _ in range(4):
            slept = bucket.acquire()
            assert slept == 0.0

    def test_blocks_when_capacity_exhausted(self) -> None:
        bucket = TokenBucket(rate_per_sec=100.0, capacity=1)
        bucket.acquire()  # drain
        start = time.monotonic()
        slept = bucket.acquire()
        elapsed = time.monotonic() - start
        assert slept > 0
        # At 100 QPS, refill of 1 token takes ~10ms; allow generous slack.
        assert elapsed >= 0.005

    def test_invalid_rate_raises(self) -> None:
        with pytest.raises(ValueError):
            TokenBucket(rate_per_sec=0)


# ---------------------------------------------------------------------------
# Keywords
# ---------------------------------------------------------------------------


class TestParseQueries:
    def test_strips_list_markers_and_quotes(self) -> None:
        raw = (
            "1. streaming vision language action\n"
            "2) robot policy diffusion\n"
            '- "open-vocabulary manipulation"\n'
            "• action chunking transformer\n"
            "STREAMING VISION LANGUAGE ACTION\n"  # dup (case-insensitive)
        )
        queries = relatedwork_keywords.parse_queries(raw, max_count=10)
        assert queries == [
            "streaming vision language action",
            "robot policy diffusion",
            "open-vocabulary manipulation",
            "action chunking transformer",
        ]

    def test_caps_at_max_count(self) -> None:
        raw = "\n".join(f"query {i}" for i in range(20))
        queries = relatedwork_keywords.parse_queries(raw, max_count=5)
        assert queries == [f"query {i}" for i in range(5)]


class TestExtractKeywords:
    def test_writes_queries_to_file(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        (tmp_path / "storyline.md").write_text(
            "We study streaming VLA models for robot manipulation.\n",
            encoding="utf-8",
        )
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        monkeypatch.setenv("VIBEPAPER_MODEL", "fake-model")

        responder = _make_responder(
            "streaming vision language action\n"
            "robot manipulation policy\n"
            "diffusion robot policy\n"
        )
        client = FakeOpenAIClient(responder)

        outcome = relatedwork_keywords.extract_keywords(
            tmp_path,
            count=3,
            client=client,
        )

        assert outcome.queries == [
            "streaming vision language action",
            "robot manipulation policy",
            "diffusion robot policy",
        ]
        target = tmp_path / "relatedwork" / "queries.txt"
        assert target.exists()
        assert target.read_text(encoding="utf-8").splitlines() == outcome.queries
        # The fake client should have been called once with the resolved model.
        call = client.chat.completions.calls[0]
        assert call["model"] == "fake-model"

    def test_falls_back_to_paper_md(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        (tmp_path / "paper.md").write_text("# Draft\n\nIntro.\n", encoding="utf-8")
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        monkeypatch.setenv("VIBEPAPER_MODEL", "fake-model")

        client = FakeOpenAIClient(_make_responder("only one query\n"))
        outcome = relatedwork_keywords.extract_keywords(
            tmp_path, count=4, client=client
        )
        assert outcome.queries == ["only one query"]

    def test_raises_when_model_returns_empty(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        (tmp_path / "storyline.md").write_text("something\n", encoding="utf-8")
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        monkeypatch.setenv("VIBEPAPER_MODEL", "fake-model")

        client = FakeOpenAIClient(_make_responder("   \n   \n"))
        with pytest.raises(LLMConfigError):
            relatedwork_keywords.extract_keywords(tmp_path, client=client)


# ---------------------------------------------------------------------------
# Summarize
# ---------------------------------------------------------------------------


_TINY_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R "
    b"/Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
    b"4 0 obj\n<< /Length 55 >>\nstream\n"
    b"BT /F1 12 Tf 10 100 Td (Hello related work paper sample) Tj ET\n"
    b"endstream\nendobj\n"
    b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
    b"xref\n0 6\n"
    b"0000000000 65535 f \n"
    b"0000000010 00000 n \n"
    b"0000000059 00000 n \n"
    b"0000000110 00000 n \n"
    b"0000000220 00000 n \n"
    b"0000000320 00000 n \n"
    b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n400\n%%EOF\n"
)


def _seed_catalog_with_paper(tmp_path: Path, *, paper_id: str = "demo2025paper") -> Path:
    catalog = LiteratureCatalog(tmp_path)
    catalog.load()
    pdf_path = catalog.pdfs_dir / f"{paper_id}.pdf"
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    pdf_path.write_bytes(_TINY_PDF)
    catalog.import_records(
        [
            {
                "paper_id": paper_id,
                "title": "Demo Paper",
                "authors": ["Doe, Jane"],
                "year": 2025,
                "venue": "arXiv",
                "pdf_path": str(pdf_path.relative_to(tmp_path)),
                "download_status": "downloaded",
            }
        ]
    )
    catalog.save()
    return pdf_path


def _seed_storyline_and_template(tmp_path: Path) -> None:
    (tmp_path / "storyline.md").write_text(
        "We study streaming policies for robot manipulation.\n",
        encoding="utf-8",
    )
    template_dir = tmp_path / ".agents" / "skills" / "relatedwork-finder"
    template_dir.mkdir(parents=True, exist_ok=True)
    (template_dir / "template.md").write_text(
        "# [Paper Title]\n\n## 1. 文献核心 Insight / Contribution\n[Describe]\n",
        encoding="utf-8",
    )


class TestExtractPdfText:
    def test_reads_minimal_pdf(self, tmp_path: Path) -> None:
        pdf = tmp_path / "doc.pdf"
        pdf.write_bytes(_TINY_PDF)
        text, pages = relatedwork_summarize.extract_pdf_text(
            pdf, max_bytes=10 * 1024 * 1024
        )
        assert pages == 1
        assert "Hello related work paper sample" in text

    def test_rejects_oversized_pdf(self, tmp_path: Path) -> None:
        pdf = tmp_path / "doc.pdf"
        pdf.write_bytes(_TINY_PDF)
        with pytest.raises(relatedwork_summarize.PdfExtractionError):
            relatedwork_summarize.extract_pdf_text(pdf, max_bytes=10)


class TestSummarizePapers:
    def test_writes_summary_and_registers(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        _seed_catalog_with_paper(tmp_path)
        _seed_storyline_and_template(tmp_path)
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        monkeypatch.setenv("VIBEPAPER_MODEL", "fake-model")

        client = FakeOpenAIClient(
            _make_responder("# Demo Paper\n\n## 1. 文献核心\nFake summary body.\n")
        )

        outcome = relatedwork_summarize.summarize_papers(
            tmp_path, qps=100.0, concurrency=1, client=client
        )

        assert outcome.processed == 1
        assert outcome.succeeded == 1
        assert outcome.failed == 0

        summary_file = tmp_path / "relatedwork" / "papers" / "demo2025paper.md"
        assert summary_file.exists()
        assert "Fake summary body." in summary_file.read_text(encoding="utf-8")

        catalog = LiteratureCatalog(tmp_path)
        catalog.load()
        paper = catalog.get_paper("demo2025paper")
        assert paper is not None
        assert paper["summary_exists"] is True
        assert paper["summary_path"] == "relatedwork/papers/demo2025paper.md"

    def test_skips_already_summarized_without_force(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        _seed_catalog_with_paper(tmp_path)
        _seed_storyline_and_template(tmp_path)
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        monkeypatch.setenv("VIBEPAPER_MODEL", "fake-model")

        existing = tmp_path / "relatedwork" / "papers" / "demo2025paper.md"
        existing.parent.mkdir(parents=True, exist_ok=True)
        existing.write_text("prior summary\n", encoding="utf-8")

        catalog = LiteratureCatalog(tmp_path)
        catalog.load()
        catalog.register_summary("demo2025paper", existing)
        catalog.save()

        client = FakeOpenAIClient(_make_responder("should not be called"))

        outcome = relatedwork_summarize.summarize_papers(
            tmp_path, qps=100.0, concurrency=1, client=client
        )

        assert outcome.processed == 0
        assert outcome.skipped == 1
        assert client.chat.completions.calls == []

    def test_force_resummarizes(self, tmp_path: Path, monkeypatch) -> None:
        _seed_catalog_with_paper(tmp_path)
        _seed_storyline_and_template(tmp_path)
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        monkeypatch.setenv("VIBEPAPER_MODEL", "fake-model")

        existing = tmp_path / "relatedwork" / "papers" / "demo2025paper.md"
        existing.parent.mkdir(parents=True, exist_ok=True)
        existing.write_text("prior\n", encoding="utf-8")

        catalog = LiteratureCatalog(tmp_path)
        catalog.load()
        catalog.register_summary("demo2025paper", existing)
        catalog.save()

        client = FakeOpenAIClient(_make_responder("# Fresh\nNew summary.\n"))

        outcome = relatedwork_summarize.summarize_papers(
            tmp_path,
            qps=100.0,
            concurrency=1,
            force=True,
            client=client,
        )

        assert outcome.processed == 1
        assert outcome.succeeded == 1
        assert "New summary" in (
            tmp_path / "relatedwork" / "papers" / "demo2025paper.md"
        ).read_text(encoding="utf-8")

    def test_oversized_pdf_marked_failed(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        _seed_catalog_with_paper(tmp_path)
        _seed_storyline_and_template(tmp_path)
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        monkeypatch.setenv("VIBEPAPER_MODEL", "fake-model")

        client = FakeOpenAIClient(_make_responder("should not be called"))

        outcome = relatedwork_summarize.summarize_papers(
            tmp_path,
            qps=100.0,
            concurrency=1,
            max_pdf_bytes=10,
            client=client,
        )

        assert outcome.processed == 1
        assert outcome.failed == 1
        assert outcome.succeeded == 0
        assert "exceeds limit" in (outcome.results[0].error or "")
        assert client.chat.completions.calls == []

    def test_paper_id_filter(self, tmp_path: Path, monkeypatch) -> None:
        _seed_catalog_with_paper(tmp_path, paper_id="alpha")
        _seed_catalog_with_paper(tmp_path, paper_id="beta")
        _seed_storyline_and_template(tmp_path)
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        monkeypatch.setenv("VIBEPAPER_MODEL", "fake-model")

        client = FakeOpenAIClient(_make_responder("# Only Beta\nBody."))

        outcome = relatedwork_summarize.summarize_papers(
            tmp_path,
            paper_id="beta",
            qps=100.0,
            concurrency=1,
            client=client,
        )

        assert outcome.processed == 1
        assert outcome.results[0].paper_id == "beta"


# ---------------------------------------------------------------------------
# CLI integration
# ---------------------------------------------------------------------------


def _invoke(runner: CliRunner, args: list[str]):
    return runner.invoke(cli_main, args, catch_exceptions=False)


class TestCli:
    def test_keywords_command_missing_model_errors(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        runner = CliRunner()
        _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"],
        )
        (tmp_path / "storyline.md").write_text("text\n", encoding="utf-8")
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        monkeypatch.delenv("VIBEPAPER_MODEL", raising=False)

        result = _invoke(
            runner, ["--root", str(tmp_path), "relatedwork", "keywords"]
        )
        assert result.exit_code != 0
        assert "VIBEPAPER_MODEL" in result.output

    def test_summarize_command_missing_api_key_errors(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        runner = CliRunner()
        _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"],
        )
        _seed_catalog_with_paper(tmp_path)
        _seed_storyline_and_template(tmp_path)
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        monkeypatch.setenv("VIBEPAPER_MODEL", "fake-model")

        result = _invoke(
            runner, ["--root", str(tmp_path), "relatedwork", "summarize"]
        )
        assert result.exit_code != 0
        assert "OPENAI_API_KEY" in result.output
