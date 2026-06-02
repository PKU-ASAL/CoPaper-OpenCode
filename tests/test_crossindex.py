"""Tests for copaper.crossindex module (Task 7)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from copaper.crossindex import CrossIndex


class TestAddPaperAndQuery:
    """Test adding papers and querying by tech point."""

    def test_add_paper_query_by_tech_point(self):
        idx = CrossIndex(index_path="/tmp/unused.json")
        idx.add_paper("ceedvla2025", "CEED-VLA", ["early_exit", "jitter"])
        idx.add_paper("rapid2026", "RAPID", ["early_exit", "edge_cloud"])

        result = idx.query_by_tech_point("early_exit")
        assert sorted(result) == ["ceedvla2025", "rapid2026"]

        result = idx.query_by_tech_point("jitter")
        assert result == ["ceedvla2025"]

    def test_add_paper_query_by_tech_point_case_insensitive(self):
        idx = CrossIndex(index_path="/tmp/unused.json")
        idx.add_paper("p1", "Paper One", ["Distributed Consensus"])

        assert idx.query_by_tech_point("distributed_consensus") == ["p1"]
        assert idx.query_by_tech_point("Distributed Consensus") == ["p1"]


class TestBidirectionalQuery:
    """Test bidirectional queries: tech_point→papers and paper→tech_points."""

    def test_bidirectional_query(self):
        idx = CrossIndex(index_path="/tmp/unused.json")
        idx.add_paper(
            "ceedvla2025",
            "CEED-VLA: Consistency VLA",
            ["early_exit", "jitter", "jacobi_decoding"],
        )

        papers = idx.query_by_tech_point("early_exit")
        assert papers == ["ceedvla2025"]

        info = idx.query_by_paper("ceedvla2025")
        assert info is not None
        assert info["title"] == "CEED-VLA: Consistency VLA"
        assert "early_exit" in info["tech_points"]
        assert "jitter" in info["tech_points"]

    def test_query_by_paper_returns_none_for_unknown(self):
        idx = CrossIndex(index_path="/tmp/unused.json")
        assert idx.query_by_paper("nonexistent") is None

    def test_query_by_tech_point_returns_empty_for_unknown(self):
        idx = CrossIndex(index_path="/tmp/unused.json")
        assert idx.query_by_tech_point("unknown_term") == []


class TestCoverageReportIdentifiesGaps:
    """Test coverage report identifies gaps against storyline terms."""

    def test_coverage_report_with_gaps(self, tmp_path: Path):
        idx = CrossIndex(index_path=str(tmp_path / "idx.json"))
        idx.add_paper("p1", "Paper One", ["early_exit", "jitter"])

        storyline = tmp_path / "storyline.md"
        storyline.write_text(
            "##### **Early Exit**\n\nSome text\n\n"
            "##### **Jitter Mitigation**\n\nMore text\n\n"
            "##### **KV Cache**\n\nUncovered topic\n",
            encoding="utf-8",
        )

        report = idx.get_coverage_report(storyline_path=str(storyline))
        assert "early_exit" in report["covered"] or "Early Exit" in report["covered"]
        assert report["coverage_ratio"] > 0
        assert report["paper_count"] == 1

    def test_coverage_report_missing_storyline(self, tmp_path: Path):
        idx = CrossIndex(index_path=str(tmp_path / "idx.json"))
        idx.add_paper("p1", "Paper One", ["early_exit"])

        report = idx.get_coverage_report(
            storyline_path=str(tmp_path / "nonexistent.md")
        )
        assert report["covered"] == []
        assert report["gaps"] == []
        assert report["coverage_ratio"] == 0.0


class TestSaveLoadRoundtrip:
    """Test save and load roundtrip preserves data."""

    def test_save_load_roundtrip(self, tmp_path: Path):
        index_path = tmp_path / ".agents" / "cross_index.json"
        idx = CrossIndex(index_path=str(index_path))

        idx.add_paper("ceedvla2025", "CEED-VLA", ["early_exit", "jitter"])
        idx.add_paper("rapid2026", "RAPID", ["early_exit", "edge_cloud"])
        idx.save()

        idx2 = CrossIndex(index_path=str(index_path))
        idx2.load()

        assert idx2.query_by_paper("ceedvla2025") is not None
        assert idx2.query_by_paper("rapid2026") is not None
        assert sorted(idx2.query_by_tech_point("early_exit")) == [
            "ceedvla2025",
            "rapid2026",
        ]
        assert idx2._data["last_updated"] != ""

    def test_load_raises_on_missing_file(self, tmp_path: Path):
        idx = CrossIndex(index_path=str(tmp_path / "missing.json"))
        with pytest.raises(FileNotFoundError):
            idx.load()


class TestRemovePaper:
    """Test removing papers cleans up tech_points."""

    def test_remove_paper_cleans_up(self):
        idx = CrossIndex(index_path="/tmp/unused.json")
        idx.add_paper("p1", "Paper One", ["early_exit", "jitter"])
        idx.add_paper("p2", "Paper Two", ["early_exit"])

        idx.remove_paper("p1")

        assert idx.query_by_paper("p1") is None
        assert idx.query_by_tech_point("early_exit") == ["p2"]
        assert idx.query_by_tech_point("jitter") == []

    def test_remove_nonexistent_paper_is_noop(self):
        idx = CrossIndex(index_path="/tmp/unused.json")
        idx.add_paper("p1", "Paper One", ["early_exit"])
        idx.remove_paper("nonexistent")
        assert idx.query_by_paper("p1") is not None


class TestBuildFromPapers:
    """Test building index from paper summary files."""

    def test_build_from_papers_dir(self, tmp_path: Path):
        papers_dir = tmp_path / "papers"
        papers_dir.mkdir()

        (papers_dir / "ceedvla2025.md").write_text(
            "# CEED-VLA: Consistency VLA\n\n"
            "## Key Contributions\n\n"
            "The paper proposes **early_exit** decoding and **consistency_distillation**.\n\n"
            "### Jitter Mitigation\n\n"
            "Addresses **jitter** in real-time control.\n",
            encoding="utf-8",
        )

        idx = CrossIndex(index_path=str(tmp_path / "idx.json"))
        idx.build_from_papers(papers_dir=str(papers_dir))

        info = idx.query_by_paper("ceedvla2025")
        assert info is not None
        assert "CEED-VLA" in info["title"]
        assert "early_exit" in info["tech_points"]

    def test_build_from_nonexistent_dir(self):
        idx = CrossIndex(index_path="/tmp/unused.json")
        idx.build_from_papers(papers_dir="/nonexistent/path")
        assert len(idx._data["papers"]) == 0
