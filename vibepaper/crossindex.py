"""Cross-index builder for literature references.

Provides bidirectional mapping between technical points and papers,
enabling queries like "which papers cover distributed consensus?" and
"what technical points does paper X address?".
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path


class CrossIndex:
    """Bidirectional cross-reference index between papers and technical points.

    Internal data structure::

        {
            "tech_points": {
                "distributed_consensus": ["ceedvla2025", "rapid2026"],
                ...
            },
            "papers": {
                "ceedvla2025": {
                    "title": "CEED-VLA: ...",
                    "tech_points": ["distributed_consensus", ...]
                },
                ...
            },
            "last_updated": "2025-01-01T00:00:00Z"
        }
    """

    def __init__(self, index_path: str = ".agents/cross_index.json") -> None:
        self._path = Path(index_path)
        self._data: dict = {
            "tech_points": {},
            "papers": {},
            "last_updated": "",
        }

    # ------------------------------------------------------------------
    # Mutating operations
    # ------------------------------------------------------------------

    def add_paper(self, paper_id: str, title: str, tech_points: list[str]) -> None:
        """Add a paper to the index, updating both directions."""
        self._data["papers"][paper_id] = {
            "title": title,
            "tech_points": list(tech_points),
        }

        for point in tech_points:
            normalized = self._normalize(point)
            if normalized not in self._data["tech_points"]:
                self._data["tech_points"][normalized] = []
            if paper_id not in self._data["tech_points"][normalized]:
                self._data["tech_points"][normalized].append(paper_id)

        stored_points = set(self._data["papers"][paper_id]["tech_points"])
        for point in list(self._data["tech_points"].keys()):
            if point not in {self._normalize(p) for p in stored_points}:
                if (
                    paper_id in self._data["tech_points"][point]
                    and len(self._data["tech_points"][point]) == 1
                ):
                    del self._data["tech_points"][point]

    def remove_paper(self, paper_id: str) -> None:
        """Remove a paper and clean up tech_points references."""
        if paper_id not in self._data["papers"]:
            return

        paper_info = self._data["papers"][paper_id]
        for point in paper_info.get("tech_points", []):
            normalized = self._normalize(point)
            if normalized in self._data["tech_points"]:
                self._data["tech_points"][normalized] = [
                    pid
                    for pid in self._data["tech_points"][normalized]
                    if pid != paper_id
                ]
                if not self._data["tech_points"][normalized]:
                    del self._data["tech_points"][normalized]

        del self._data["papers"][paper_id]

    # ------------------------------------------------------------------
    # Query operations
    # ------------------------------------------------------------------

    def query_by_tech_point(self, point: str) -> list[str]:
        """Return list of paper_ids that cover the given tech point."""
        normalized = self._normalize(point)
        return list(self._data["tech_points"].get(normalized, []))

    def query_by_paper(self, paper_id: str) -> dict | None:
        """Return paper info dict or None if paper_id not found."""
        entry = self._data["papers"].get(paper_id)
        if entry is None:
            return None
        return {
            "title": entry["title"],
            "tech_points": list(entry["tech_points"]),
        }

    # ------------------------------------------------------------------
    # Build from paper summaries
    # ------------------------------------------------------------------

    def build_from_papers(self, papers_dir: str = "relatedwork/papers") -> None:
        """Scan all *.md files in papers_dir and build the index.

        Extracts:
        - paper_id from filename stem
        - title from first ``# `` header
        - tech_points from section headers (##, ###) and bold terms (**term**)
        """
        papers_path = Path(papers_dir)
        if not papers_path.is_dir():
            return

        for md_file in sorted(papers_path.glob("*.md")):
            paper_id = md_file.stem
            content = md_file.read_text(encoding="utf-8")

            title = self._extract_title(content)
            tech_points = self._extract_tech_points(content)

            self.add_paper(paper_id, title, tech_points)

    # ------------------------------------------------------------------
    # Coverage report
    # ------------------------------------------------------------------

    def get_coverage_report(self, storyline_path: str = "storyline.md") -> dict:
        """Compare storyline key terms against indexed tech_points.

        Returns a dict with:
        - covered: terms that have matching papers
        - gaps: terms with no matching papers
        - coverage_ratio: covered / total
        - paper_count: total number of papers in index
        """
        storyline = Path(storyline_path)
        if not storyline.is_file():
            return {
                "covered": [],
                "gaps": [],
                "coverage_ratio": 0.0,
                "paper_count": len(self._data["papers"]),
            }

        content = storyline.read_text(encoding="utf-8")
        terms = self._extract_tech_points(content)

        covered = []
        gaps = []
        for term in terms:
            normalized = self._normalize(term)
            if normalized in self._data["tech_points"]:
                covered.append(term)
            else:
                gaps.append(term)

        total = len(terms)
        ratio = len(covered) / total if total > 0 else 0.0

        return {
            "covered": covered,
            "gaps": gaps,
            "coverage_ratio": round(ratio, 2),
            "paper_count": len(self._data["papers"]),
        }

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self) -> None:
        """Write index data to index_path as JSON with timestamp."""
        self._data["last_updated"] = datetime.now(timezone.utc).isoformat()
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(
            json.dumps(self._data, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    def load(self) -> None:
        """Read index_path into internal data. Raises FileNotFoundError if missing."""
        if not self._path.is_file():
            raise FileNotFoundError(f"Cross-index file not found: {self._path}")
        raw = self._path.read_text(encoding="utf-8")
        self._data = json.loads(raw)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize(term: str) -> str:
        """Normalize a tech point term for consistent lookup."""
        return term.strip().lower().replace(" ", "_").replace("-", "_")

    @staticmethod
    def _extract_title(content: str) -> str:
        """Extract title from the first ``# `` header in markdown content."""
        match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        if match:
            return match.group(1).strip()
        return ""

    @staticmethod
    def _extract_tech_points(content: str) -> list[str]:
        """Extract tech points from section headers and bold terms.

        Uses simple regex-based extraction (not LLM-based):
        - Section headers (## and ###) become tech points
        - Bold terms (**term**) become tech points
        - Deduplicates while preserving order
        """
        points: list[str] = []
        seen: set[str] = set()

        # Extract section headers (## and ###)
        for match in re.finditer(r"^#{2,3}\s+(.+)$", content, re.MULTILINE):
            header = match.group(1).strip()
            header = re.sub(r"^\d+(\.\d+)*\s+", "", header)
            if header and header not in seen:
                seen.add(header)
                points.append(header)

        # Extract bold terms (**term**)
        for match in re.finditer(r"\*\*([^*]+)\*\*", content):
            term = match.group(1).strip()
            if len(term) > 60:
                continue
            if term and term not in seen:
                seen.add(term)
                points.append(term)

        return points
