"""Semantic Scholar search helpers for related-work metadata.

Hits the Semantic Scholar Graph API ``/paper/search`` endpoint for each query,
deduplicates results, normalizes them into the schema accepted by
:class:`copaper.literature.LiteratureCatalog`, and writes them to a cache
file (default ``relatedwork/search_cache.json``) ready to be imported via
``copaper relatedwork import``.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from copaper.literature import (
    _generate_paper_id,
    _normalize_authors,
    extract_bibtex_key,
)

DEFAULT_S2_BASE = "https://api.semanticscholar.org/graph/v1"
OFFICIAL_S2_HOST = "api.semanticscholar.org"
S2_FIELDS = ",".join(
    [
        "paperId",
        "title",
        "authors",
        "year",
        "venue",
        "publicationVenue",
        "journal",
        "externalIds",
        "openAccessPdf",
        "abstract",
        "tldr",
        "citationStyles",
        "publicationTypes",
    ]
)
DEFAULT_LIMIT = 20
MAX_LIMIT = 100
DEFAULT_TIMEOUT = 30
DEFAULT_RETRIES = 4
USER_AGENT = "CoPaper/0.1 (+https://copaper.local)"


class SemanticScholarError(Exception):
    """Raised when the Semantic Scholar API cannot be reached or parsed."""


@dataclass
class SearchOutcome:
    queries: list[str]
    papers: list[dict[str, Any]]
    cache_path: str
    api_key_used: bool


def resolve_base_url(override: str | None = None) -> str:
    """Pick the S2 base URL: explicit override > env > default."""
    candidate = (override or os.environ.get("S2_API_BASE") or DEFAULT_S2_BASE).strip()
    return candidate.rstrip("/") or DEFAULT_S2_BASE


def resolve_api_key(override: str | None = None) -> str | None:
    """Pick the S2 API key: explicit override > S2_API_KEY > SEMANTIC_SCHOLAR_API_KEY."""
    if override:
        return override.strip() or None
    for env_name in ("S2_API_KEY", "SEMANTIC_SCHOLAR_API_KEY"):
        value = (os.environ.get(env_name) or "").strip()
        if value:
            return value
    return None


def _is_official_host(base_url: str) -> bool:
    return OFFICIAL_S2_HOST in base_url.split("/", 3)[2] if "://" in base_url else False


def _auth_headers(base_url: str, api_key: str | None) -> dict[str, str]:
    """Pick auth header style from the base URL.

    Official S2 expects ``x-api-key``; third-party proxies expect
    ``Authorization: Bearer ...`` per their docs.
    """
    if not api_key:
        return {}
    if _is_official_host(base_url):
        return {"x-api-key": api_key}
    return {"Authorization": f"Bearer {api_key}"}


def _request_json(
    url: str,
    *,
    api_key: str | None,
    base_url: str | None = None,
    retries: int = DEFAULT_RETRIES,
    timeout: int = DEFAULT_TIMEOUT,
) -> dict[str, Any]:
    """GET ``url`` and parse JSON, retrying on 429 with exponential backoff."""

    headers: dict[str, str] = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }
    if api_key:
        host_basis = base_url or url
        headers.update(_auth_headers(host_basis, api_key))

    last_error: str = "Unknown Semantic Scholar error."
    for attempt in range(1, retries + 1):
        request = Request(url, headers=headers)
        try:
            with urlopen(request, timeout=timeout) as response:
                payload = response.read()
            return json.loads(payload.decode("utf-8"))
        except HTTPError as exc:
            if exc.code == 429 and attempt < retries:
                time.sleep(min(2 ** (attempt - 1), 16))
                last_error = f"HTTP 429 rate limited (attempt {attempt})."
                continue
            raise SemanticScholarError(
                f"Semantic Scholar returned HTTP {exc.code}: {exc.reason}"
            ) from exc
        except (URLError, OSError, json.JSONDecodeError) as exc:
            last_error = str(exc)
            if attempt < retries:
                time.sleep(min(2 ** (attempt - 1), 8))
                continue
            raise SemanticScholarError(
                f"Semantic Scholar request failed: {last_error}"
            ) from exc

    raise SemanticScholarError(last_error)


def _build_search_url(
    query: str,
    *,
    base_url: str,
    limit: int,
    year: str | None,
    fields_of_study: str | None,
    open_access_only: bool,
    venue: str | None,
) -> str:
    params: list[tuple[str, str]] = [
        ("query", query),
        ("limit", str(min(max(limit, 1), MAX_LIMIT))),
        ("fields", S2_FIELDS),
    ]
    if year:
        params.append(("year", year))
    if fields_of_study:
        params.append(("fieldsOfStudy", fields_of_study))
    if venue:
        params.append(("venue", venue))
    encoded = urlencode(params)
    if open_access_only:
        encoded += "&openAccessPdf"
    return f"{base_url}/paper/search?{encoded}"


_BIBTEX_TYPE_RE = re.compile(r"^\s*@\s*\[[^\]]*\]", re.MULTILINE)


def _sanitize_bibtex(bibtex: str | None, publication_types: list[str] | None) -> str:
    """S2 sometimes returns ``@['JournalArticle', 'Conference']{...}``; rewrite it."""

    if not bibtex:
        return ""
    if not _BIBTEX_TYPE_RE.search(bibtex):
        return bibtex.strip()

    types = [str(item).lower() for item in (publication_types or [])]
    if any("conference" in item or "proceedings" in item for item in types):
        replacement = "@inproceedings"
    elif any("book" in item for item in types):
        replacement = "@book"
    else:
        replacement = "@article"

    return _BIBTEX_TYPE_RE.sub(replacement, bibtex, count=1).strip()


def _venue_text(paper: dict[str, Any]) -> str:
    publication_venue = paper.get("publicationVenue") or {}
    if isinstance(publication_venue, dict):
        name = str(publication_venue.get("name") or "").strip()
        if name:
            return name

    journal = paper.get("journal") or {}
    if isinstance(journal, dict):
        name = str(journal.get("name") or "").strip()
        if name:
            return name

    venue = str(paper.get("venue") or "").strip()
    if venue:
        return venue

    if paper.get("externalIds", {}).get("ArXiv"):
        return "arXiv"
    return ""


def _pdf_url(paper: dict[str, Any]) -> str:
    open_access = paper.get("openAccessPdf") or {}
    if isinstance(open_access, dict):
        url = str(open_access.get("url") or "").strip()
        if url:
            return url

    arxiv_id = str(paper.get("externalIds", {}).get("ArXiv") or "").strip()
    if arxiv_id:
        return f"https://arxiv.org/pdf/{arxiv_id}.pdf"
    return ""


def s2_paper_to_record(
    paper: dict[str, Any],
    source_queries: Iterable[str],
) -> dict[str, Any]:
    """Map one Semantic Scholar paper object to the literature-catalog schema."""

    title = str(paper.get("title") or "").strip()
    authors_raw = paper.get("authors") or []
    if isinstance(authors_raw, list):
        author_names = [
            str(item.get("name")).strip()
            for item in authors_raw
            if isinstance(item, dict) and item.get("name")
        ]
    else:
        author_names = _normalize_authors(authors_raw)

    year_raw = paper.get("year")
    year: int | None = None
    if isinstance(year_raw, int):
        year = year_raw
    elif isinstance(year_raw, str) and year_raw.strip().isdigit():
        year = int(year_raw.strip())

    venue = _venue_text(paper)

    external_ids = paper.get("externalIds") or {}
    arxiv_id = ""
    if isinstance(external_ids, dict):
        arxiv_id = str(external_ids.get("ArXiv") or "").strip()

    publication_types_raw = paper.get("publicationTypes")
    publication_types = (
        [str(item) for item in publication_types_raw]
        if isinstance(publication_types_raw, list)
        else []
    )

    citation_styles = paper.get("citationStyles") or {}
    bibtex_raw = ""
    if isinstance(citation_styles, dict):
        bibtex_raw = str(citation_styles.get("bibtex") or "")
    bibtex = _sanitize_bibtex(bibtex_raw, publication_types)

    paper_id = (
        extract_bibtex_key(bibtex)
        or _generate_paper_id(title, author_names, year)
    )

    pdf_url = _pdf_url(paper)

    record: dict[str, Any] = {
        "paper_id": paper_id,
        "title": title,
        "authors": author_names,
        "year": year,
        "venue": venue,
        "arxiv_id": arxiv_id or None,
        "bibtex": bibtex,
        "pdf_url": pdf_url,
        "source": "semantic_scholar",
        "source_queries": [
            query.strip() for query in source_queries if query and query.strip()
        ],
    }

    s2_paper_id = str(paper.get("paperId") or "").strip()
    if s2_paper_id:
        record["semantic_scholar_id"] = s2_paper_id

    tldr = paper.get("tldr") or {}
    if isinstance(tldr, dict):
        tldr_text = str(tldr.get("text") or "").strip()
        if tldr_text:
            record["tldr"] = tldr_text

    return record


def search_papers(
    queries: Iterable[str],
    *,
    limit: int = DEFAULT_LIMIT,
    year: str | None = None,
    fields_of_study: str | None = None,
    open_access_only: bool = False,
    venue: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    retries: int = DEFAULT_RETRIES,
    timeout: int = DEFAULT_TIMEOUT,
    inter_query_delay: float = 1.1,
) -> list[dict[str, Any]]:
    """Run one search per query, dedupe by S2 paperId, return normalized records.

    Sleeps ``inter_query_delay`` seconds between consecutive queries to stay
    under Semantic Scholar's 1 req/sec keyed limit; the per-request retry path
    handles transient 429s on top of that.
    """

    cleaned_queries = [query.strip() for query in queries if query and query.strip()]
    if not cleaned_queries:
        raise ValueError("At least one non-empty query is required.")

    resolved_base = resolve_base_url(base_url)
    by_paper: dict[str, dict[str, Any]] = {}
    fallback_index = 0

    for index, query in enumerate(cleaned_queries):
        if index > 0 and inter_query_delay > 0:
            time.sleep(inter_query_delay)
        url = _build_search_url(
            query,
            base_url=resolved_base,
            limit=limit,
            year=year,
            fields_of_study=fields_of_study,
            open_access_only=open_access_only,
            venue=venue,
        )
        payload = _request_json(
            url,
            api_key=api_key,
            base_url=resolved_base,
            retries=retries,
            timeout=timeout,
        )
        data = payload.get("data") or []
        if not isinstance(data, list):
            continue

        for raw in data:
            if not isinstance(raw, dict):
                continue
            s2_paper_id = str(raw.get("paperId") or "").strip()
            if not s2_paper_id:
                fallback_index += 1
                s2_paper_id = f"_no_s2_id_{fallback_index}"

            existing = by_paper.get(s2_paper_id)
            if existing is None:
                by_paper[s2_paper_id] = s2_paper_to_record(raw, [query])
                continue

            existing_queries = list(existing.get("source_queries") or [])
            if query not in existing_queries:
                existing_queries.append(query)
                existing["source_queries"] = existing_queries

    return list(by_paper.values())


def write_search_cache(
    records: list[dict[str, Any]],
    cache_path: Path,
) -> None:
    """Atomically write ``records`` as ``{"papers": [...]}`` to ``cache_path``."""

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(
        {"papers": records},
        indent=2,
        ensure_ascii=False,
    )
    fd, temp_path = tempfile.mkstemp(
        dir=str(cache_path.parent),
        prefix=".search_cache_tmp_",
        suffix=".json",
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file_obj:
            file_obj.write(payload)
        os.replace(temp_path, cache_path)
    except BaseException:
        try:
            os.unlink(temp_path)
        except OSError:
            pass
        raise


def run(
    project_root: str | Path,
    *,
    queries: Iterable[str],
    limit: int = DEFAULT_LIMIT,
    year: str | None = None,
    fields_of_study: str | None = None,
    open_access_only: bool = False,
    venue: str | None = None,
    cache_path: str | Path | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    retries: int = DEFAULT_RETRIES,
    timeout: int = DEFAULT_TIMEOUT,
) -> SearchOutcome:
    """Search Semantic Scholar and write results to ``relatedwork/search_cache.json``."""

    cleaned_queries = [query.strip() for query in queries if query and query.strip()]
    if not cleaned_queries:
        raise ValueError("At least one non-empty query is required.")

    project_root_path = Path(project_root)
    target_path = (
        Path(cache_path)
        if cache_path is not None
        else project_root_path / "relatedwork" / "search_cache.json"
    )

    records = search_papers(
        cleaned_queries,
        limit=limit,
        year=year,
        fields_of_study=fields_of_study,
        open_access_only=open_access_only,
        venue=venue,
        api_key=api_key,
        base_url=base_url,
        retries=retries,
        timeout=timeout,
    )

    write_search_cache(records, target_path)

    return SearchOutcome(
        queries=cleaned_queries,
        papers=records,
        cache_path=str(target_path),
        api_key_used=bool(api_key),
    )


def _read_queries_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    queries: list[str] = []
    for line in text.splitlines():
        candidate = line.strip()
        if not candidate or candidate.startswith("#"):
            continue
        queries.append(candidate)
    return queries


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Search Semantic Scholar for related-work papers and cache results "
            "to relatedwork/search_cache.json."
        )
    )
    parser.add_argument("--root", default=".", help="Project root directory.")
    parser.add_argument(
        "--query",
        action="append",
        default=[],
        help="Search query (repeatable). Combine with --queries-file.",
    )
    parser.add_argument(
        "--queries-file",
        default=None,
        help="Path to a text file with one query per line (lines starting with # ignored).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"Results per query (1-{MAX_LIMIT}, default {DEFAULT_LIMIT}).",
    )
    parser.add_argument(
        "--year",
        default=None,
        help="Year or year range, e.g. '2023' or '2020-2024'.",
    )
    parser.add_argument(
        "--fields-of-study",
        default=None,
        help="Comma-separated S2 fields of study (e.g. 'Computer Science').",
    )
    parser.add_argument(
        "--venue",
        default=None,
        help="Comma-separated venue filter (e.g. 'CVPR,NeurIPS').",
    )
    parser.add_argument(
        "--open-access",
        action="store_true",
        help="Restrict results to papers with a public PDF.",
    )
    parser.add_argument(
        "--cache-path",
        default=None,
        help="Override cache path (default: <root>/relatedwork/search_cache.json).",
    )
    args = parser.parse_args()

    queries: list[str] = list(args.query)
    if args.queries_file:
        queries.extend(_read_queries_file(Path(args.queries_file)))

    if not queries:
        parser.error("Provide at least one --query or a --queries-file with entries.")

    api_key = resolve_api_key()
    base_url = resolve_base_url()

    outcome = run(
        args.root,
        queries=queries,
        limit=args.limit,
        year=args.year,
        fields_of_study=args.fields_of_study,
        open_access_only=args.open_access,
        venue=args.venue,
        cache_path=args.cache_path,
        api_key=api_key,
        base_url=base_url,
    )

    print(
        f"Searched {len(outcome.queries)} queries, found {len(outcome.papers)} unique papers."
    )
    print(f"Cache written to {outcome.cache_path}")
    print(f"Endpoint: {base_url}")
    if not outcome.api_key_used:
        print(
            "Hint: set S2_API_KEY (or SEMANTIC_SCHOLAR_API_KEY) for higher rate limits."
        )


if __name__ == "__main__":
    main()
