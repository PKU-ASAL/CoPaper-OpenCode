"""Tests for vibepaper.relatedwork_search."""

from __future__ import annotations

import io
import json
from pathlib import Path
from urllib.error import HTTPError

import pytest
from click.testing import CliRunner

from vibepaper import relatedwork_search
from vibepaper.cli import _load_env_file, main as cli_main
from vibepaper.relatedwork_search import (
    DEFAULT_S2_BASE,
    SemanticScholarError,
    _auth_headers,
    resolve_api_key,
    resolve_base_url,
    s2_paper_to_record,
    search_papers,
    write_search_cache,
)


def _fake_s2_paper(
    *,
    paper_id: str = "abc123",
    title: str = "Streaming VLA",
    authors: list[str] | None = None,
    year: int | None = 2025,
    venue: str = "CVPR",
    arxiv_id: str | None = "2501.12345",
    pdf_url: str | None = "https://example.com/paper.pdf",
    bibtex: str | None = "@inproceedings{shi2025streaming, title={Streaming VLA}, author={Shi, A and Liu, B}, year={2025}}",
    publication_types: list[str] | None = None,
    tldr_text: str | None = "A streaming VLA model.",
) -> dict:
    paper: dict = {
        "paperId": paper_id,
        "title": title,
        "year": year,
        "venue": venue,
        "authors": [
            {"authorId": str(i), "name": name}
            for i, name in enumerate(authors or ["Shi, A", "Liu, B"])
        ],
        "externalIds": {"ArXiv": arxiv_id} if arxiv_id else {},
        "openAccessPdf": {"url": pdf_url} if pdf_url else {},
        "publicationVenue": {"name": venue},
        "citationStyles": {"bibtex": bibtex} if bibtex else {},
        "publicationTypes": publication_types or [],
        "tldr": {"text": tldr_text} if tldr_text else {},
    }
    return paper


class _FakeResponse:
    def __init__(self, body: bytes) -> None:
        self._buffer = io.BytesIO(body)

    def read(self, size: int = -1) -> bytes:
        return self._buffer.read(size)

    def __enter__(self) -> "_FakeResponse":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        return False


def _make_urlopen(payloads_by_query: dict[str, dict]):
    def _urlopen(request, timeout: int = 30) -> _FakeResponse:
        url = getattr(request, "full_url", str(request))
        for query_substring, payload in payloads_by_query.items():
            if f"query={query_substring}" in url.replace("+", " ").replace("%20", " "):
                return _FakeResponse(json.dumps(payload).encode("utf-8"))
        return _FakeResponse(b'{"data": []}')

    return _urlopen


class TestS2Normalization:
    def test_extracts_paper_id_from_bibtex(self) -> None:
        record = s2_paper_to_record(_fake_s2_paper(), ["streaming vla"])

        assert record["paper_id"] == "shi2025streaming"
        assert record["title"] == "Streaming VLA"
        assert record["authors"] == ["Shi, A", "Liu, B"]
        assert record["year"] == 2025
        assert record["venue"] == "CVPR"
        assert record["arxiv_id"] == "2501.12345"
        assert record["pdf_url"] == "https://example.com/paper.pdf"
        assert record["source"] == "semantic_scholar"
        assert record["source_queries"] == ["streaming vla"]
        assert record["semantic_scholar_id"] == "abc123"
        assert record["tldr"] == "A streaming VLA model."

    def test_falls_back_to_arxiv_pdf_when_open_access_missing(self) -> None:
        paper = _fake_s2_paper(pdf_url=None, arxiv_id="2401.99999")
        record = s2_paper_to_record(paper, ["q"])

        assert record["pdf_url"] == "https://arxiv.org/pdf/2401.99999.pdf"

    def test_sanitizes_weird_bibtex_type(self) -> None:
        paper = _fake_s2_paper(
            bibtex="@['JournalArticle', 'Conference']{shi2025streaming, title={X}}",
            publication_types=["Conference"],
        )
        record = s2_paper_to_record(paper, ["q"])

        assert record["bibtex"].startswith("@inproceedings{shi2025streaming")
        assert record["paper_id"] == "shi2025streaming"

    def test_generates_paper_id_when_bibtex_missing(self) -> None:
        paper = _fake_s2_paper(bibtex=None, authors=["Doe, Jane"], title="A Cool Idea")
        record = s2_paper_to_record(paper, ["q"])

        assert record["paper_id"].startswith("doe2025")
        assert record["bibtex"] == ""

    def test_prefers_publication_venue_then_journal_then_arxiv(self) -> None:
        paper = _fake_s2_paper(venue="", arxiv_id="2501.00001")
        paper["publicationVenue"] = {}
        paper["journal"] = {"name": "T-RO"}
        record = s2_paper_to_record(paper, ["q"])
        assert record["venue"] == "T-RO"

        paper["journal"] = {}
        record = s2_paper_to_record(paper, ["q"])
        assert record["venue"] == "arXiv"


class TestSearchPapers:
    def test_dedupes_across_queries_and_merges_source_queries(
        self, monkeypatch
    ) -> None:
        paper = _fake_s2_paper()
        monkeypatch.setattr(
            relatedwork_search,
            "urlopen",
            _make_urlopen(
                {
                    "vla": {"data": [paper]},
                    "robot": {"data": [paper]},
                }
            ),
        )

        records = search_papers(["vla", "robot"], limit=5, inter_query_delay=0)

        assert len(records) == 1
        assert sorted(records[0]["source_queries"]) == ["robot", "vla"]

    def test_passes_year_filter(self, monkeypatch) -> None:
        captured: list[str] = []

        def _urlopen(request, timeout: int = 30) -> _FakeResponse:
            captured.append(request.full_url)
            return _FakeResponse(b'{"data": []}')

        monkeypatch.setattr(relatedwork_search, "urlopen", _urlopen)

        search_papers(["vla"], limit=3, year="2020-2024")

        assert any("year=2020-2024" in url for url in captured)
        assert any("limit=3" in url for url in captured)

    def test_retries_on_429_then_succeeds(self, monkeypatch) -> None:
        attempts = {"count": 0}

        def _urlopen(request, timeout: int = 30) -> _FakeResponse:
            attempts["count"] += 1
            if attempts["count"] < 2:
                raise HTTPError(
                    request.full_url, 429, "Too Many Requests", hdrs=None, fp=None
                )
            return _FakeResponse(json.dumps({"data": [_fake_s2_paper()]}).encode())

        monkeypatch.setattr(relatedwork_search, "urlopen", _urlopen)
        monkeypatch.setattr(relatedwork_search.time, "sleep", lambda _seconds: None)

        records = search_papers(["vla"], limit=2, retries=3)

        assert len(records) == 1
        assert attempts["count"] == 2

    def test_raises_after_exhausting_retries(self, monkeypatch) -> None:
        def _urlopen(request, timeout: int = 30) -> _FakeResponse:
            raise HTTPError(
                request.full_url, 429, "Too Many Requests", hdrs=None, fp=None
            )

        monkeypatch.setattr(relatedwork_search, "urlopen", _urlopen)
        monkeypatch.setattr(relatedwork_search.time, "sleep", lambda _seconds: None)

        with pytest.raises(SemanticScholarError):
            search_papers(["vla"], retries=2)

    def test_rejects_empty_queries(self) -> None:
        with pytest.raises(ValueError):
            search_papers(["", "  "])


class TestWriteSearchCache:
    def test_writes_papers_envelope(self, tmp_path: Path) -> None:
        path = tmp_path / "relatedwork" / "search_cache.json"

        write_search_cache(
            [{"paper_id": "x", "title": "X", "authors": []}],
            path,
        )

        data = json.loads(path.read_text(encoding="utf-8"))
        assert data == {"papers": [{"paper_id": "x", "title": "X", "authors": []}]}


def _invoke(runner: CliRunner, args: list[str]):
    return runner.invoke(cli_main, args, catch_exceptions=False)


class TestSearchCli:
    def test_search_command_writes_cache(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        runner = CliRunner()
        result = _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"],
        )
        assert result.exit_code == 0, result.output

        monkeypatch.setattr(
            relatedwork_search,
            "urlopen",
            _make_urlopen({"vla": {"data": [_fake_s2_paper()]}}),
        )
        monkeypatch.delenv("SEMANTIC_SCHOLAR_API_KEY", raising=False)

        result = _invoke(
            runner,
            [
                "--root",
                str(tmp_path),
                "relatedwork",
                "search",
                "--query",
                "vla",
                "--limit",
                "5",
            ],
        )

        assert result.exit_code == 0, result.output
        cache = tmp_path / "relatedwork" / "search_cache.json"
        assert cache.exists()
        payload = json.loads(cache.read_text(encoding="utf-8"))
        assert len(payload["papers"]) == 1
        assert payload["papers"][0]["paper_id"] == "shi2025streaming"
        assert "found 1 unique papers" in result.output

    def test_search_command_requires_query(self, tmp_path: Path) -> None:
        runner = CliRunner()
        _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"],
        )

        result = _invoke(
            runner,
            ["--root", str(tmp_path), "relatedwork", "search"],
        )
        assert result.exit_code != 0
        assert "at least one --query" in result.output

    def test_search_command_defaults_to_cs_and_open_access(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        runner = CliRunner()
        _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"],
        )

        captured: list[str] = []

        def _urlopen(request, timeout: int = 30) -> _FakeResponse:
            captured.append(request.full_url)
            return _FakeResponse(json.dumps({"data": [_fake_s2_paper()]}).encode())

        monkeypatch.setattr(relatedwork_search, "urlopen", _urlopen)

        result = _invoke(
            runner,
            [
                "--root",
                str(tmp_path),
                "relatedwork",
                "search",
                "--query",
                "vla",
            ],
        )

        assert result.exit_code == 0, result.output
        assert len(captured) == 1
        url = captured[0]
        assert "fieldsOfStudy=Computer+Science" in url or "fieldsOfStudy=Computer%20Science" in url
        assert url.endswith("&openAccessPdf")

    def test_search_command_disables_defaults_when_overridden(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        runner = CliRunner()
        _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"],
        )

        captured: list[str] = []

        def _urlopen(request, timeout: int = 30) -> _FakeResponse:
            captured.append(request.full_url)
            return _FakeResponse(json.dumps({"data": [_fake_s2_paper()]}).encode())

        monkeypatch.setattr(relatedwork_search, "urlopen", _urlopen)

        result = _invoke(
            runner,
            [
                "--root",
                str(tmp_path),
                "relatedwork",
                "search",
                "--query",
                "vla",
                "--fields-of-study",
                "",
                "--no-open-access",
            ],
        )

        assert result.exit_code == 0, result.output
        url = captured[0]
        # fieldsOfStudy as a query param key has '=' after it; the bare token
        # also appears inside the `fields=` list and must be ignored.
        assert "fieldsOfStudy=" not in url
        # openAccessPdf as a flag appears as "&openAccessPdf" at end; the bare
        # token inside the fields list is preceded by "," not "&".
        assert "&openAccessPdf" not in url


class TestResolvers:
    def test_resolve_base_url_default_when_no_env(self, monkeypatch) -> None:
        monkeypatch.delenv("S2_API_BASE", raising=False)
        assert resolve_base_url() == DEFAULT_S2_BASE

    def test_resolve_base_url_reads_env(self, monkeypatch) -> None:
        monkeypatch.setenv("S2_API_BASE", "https://proxy.example.com/s2/graph/v1/")
        assert resolve_base_url() == "https://proxy.example.com/s2/graph/v1"

    def test_resolve_base_url_explicit_overrides_env(self, monkeypatch) -> None:
        monkeypatch.setenv("S2_API_BASE", "https://proxy.example.com/s2/graph/v1")
        assert (
            resolve_base_url("https://other.example.com/x/")
            == "https://other.example.com/x"
        )

    def test_resolve_api_key_prefers_s2_over_legacy(self, monkeypatch) -> None:
        monkeypatch.setenv("S2_API_KEY", "primary")
        monkeypatch.setenv("SEMANTIC_SCHOLAR_API_KEY", "legacy")
        assert resolve_api_key() == "primary"

    def test_resolve_api_key_falls_back_to_legacy(self, monkeypatch) -> None:
        monkeypatch.delenv("S2_API_KEY", raising=False)
        monkeypatch.setenv("SEMANTIC_SCHOLAR_API_KEY", "legacy")
        assert resolve_api_key() == "legacy"

    def test_resolve_api_key_returns_none_when_unset(self, monkeypatch) -> None:
        monkeypatch.delenv("S2_API_KEY", raising=False)
        monkeypatch.delenv("SEMANTIC_SCHOLAR_API_KEY", raising=False)
        assert resolve_api_key() is None


class TestAuthHeaders:
    def test_official_host_uses_x_api_key(self) -> None:
        headers = _auth_headers(DEFAULT_S2_BASE, "secret-key")
        assert headers == {"x-api-key": "secret-key"}

    def test_proxy_host_uses_bearer(self) -> None:
        headers = _auth_headers(
            "https://s2api.ominiai.cn/s2/graph/v1", "sk-token"
        )
        assert headers == {"Authorization": "Bearer sk-token"}

    def test_no_key_yields_empty_headers(self) -> None:
        assert _auth_headers(DEFAULT_S2_BASE, None) == {}
        assert _auth_headers("https://proxy.example/x", None) == {}


class TestEndToEndAuthHeader:
    """Verify the auth header sent on the wire for official vs. proxy."""

    def _capture_headers_for(
        self, monkeypatch, *, base_url: str, api_key: str
    ) -> dict[str, str]:
        captured: dict[str, dict[str, str]] = {}

        def _urlopen(request, timeout: int = 30) -> _FakeResponse:
            captured["headers"] = dict(request.header_items())
            return _FakeResponse(
                json.dumps({"data": [_fake_s2_paper()]}).encode("utf-8")
            )

        monkeypatch.setattr(relatedwork_search, "urlopen", _urlopen)
        search_papers(["q"], limit=1, api_key=api_key, base_url=base_url)
        return captured["headers"]

    def test_official_endpoint_sends_x_api_key(self, monkeypatch) -> None:
        headers = self._capture_headers_for(
            monkeypatch, base_url=DEFAULT_S2_BASE, api_key="secret-key"
        )
        # urllib lower-cases custom header names via Request.add_header
        normalized = {k.lower(): v for k, v in headers.items()}
        assert normalized.get("x-api-key") == "secret-key"
        assert "authorization" not in normalized

    def test_proxy_endpoint_sends_bearer(self, monkeypatch) -> None:
        headers = self._capture_headers_for(
            monkeypatch,
            base_url="https://s2api.ominiai.cn/s2/graph/v1",
            api_key="sk-token",
        )
        normalized = {k.lower(): v for k, v in headers.items()}
        assert normalized.get("authorization") == "Bearer sk-token"
        assert "x-api-key" not in normalized

    def test_url_targets_resolved_base(self, monkeypatch) -> None:
        captured: dict[str, str] = {}

        def _urlopen(request, timeout: int = 30) -> _FakeResponse:
            captured["url"] = request.full_url
            return _FakeResponse(b'{"data": []}')

        monkeypatch.setattr(relatedwork_search, "urlopen", _urlopen)
        search_papers(
            ["robot policy"],
            limit=2,
            base_url="https://proxy.example.com/s2/graph/v1",
        )
        assert captured["url"].startswith(
            "https://proxy.example.com/s2/graph/v1/paper/search?"
        )


class TestLoadEnvFile:
    def test_skips_missing_file(self, tmp_path: Path) -> None:
        assert _load_env_file(tmp_path / "missing.env") == 0

    def test_parses_basic_keyvalue_and_quotes(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        env_path = tmp_path / ".env"
        env_path.write_text(
            "# leading comment\n"
            "S2_API_KEY=raw-value\n"
            'S2_API_BASE="https://proxy.example.com/s2/graph/v1"\n'
            "EMPTY_VAR=\n"
            "export EXPORTED='exported-value'\n",
            encoding="utf-8",
        )

        for key in ("S2_API_KEY", "S2_API_BASE", "EMPTY_VAR", "EXPORTED"):
            monkeypatch.delenv(key, raising=False)

        count = _load_env_file(env_path)

        assert count == 4
        import os as _os

        assert _os.environ["S2_API_KEY"] == "raw-value"
        assert _os.environ["S2_API_BASE"] == "https://proxy.example.com/s2/graph/v1"
        assert _os.environ["EMPTY_VAR"] == ""
        assert _os.environ["EXPORTED"] == "exported-value"

    def test_does_not_override_existing_env(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        env_path = tmp_path / ".env"
        env_path.write_text("S2_API_KEY=from-file\n", encoding="utf-8")
        monkeypatch.setenv("S2_API_KEY", "from-shell")

        count = _load_env_file(env_path)

        import os as _os

        assert _os.environ["S2_API_KEY"] == "from-shell"
        assert count == 0

    def test_ignores_comments_and_blank_lines(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        env_path = tmp_path / ".env"
        env_path.write_text(
            "\n"
            "# only a comment\n"
            "   \n"
            "FOO=bar\n"
            "# trailing comment\n",
            encoding="utf-8",
        )
        monkeypatch.delenv("FOO", raising=False)

        assert _load_env_file(env_path) == 1
        import os as _os

        assert _os.environ["FOO"] == "bar"
