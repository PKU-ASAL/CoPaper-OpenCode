"""Tests for checker_integration module."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from copaper.checker_integration import (
    CHECKER_NAMES,
    CheckerTracker,
    format_checker_results,
    parse_checker_output,
)


def _init_state(tmp_path: Path) -> None:
    """Create minimal state.json for testing."""
    agents_dir = tmp_path / ".agents"
    agents_dir.mkdir(parents=True, exist_ok=True)
    state = {"project_name": "Test", "phases": {}}
    (agents_dir / "state.json").write_text(json.dumps(state), encoding="utf-8")


class TestRecordCheckerRun:
    def test_record_creates_checkers_field(self, tmp_path: Path) -> None:
        _init_state(tmp_path)
        tracker = CheckerTracker(str(tmp_path))
        tracker.record_checker_run(
            "problem-checker", {"critical": 1, "major": 0, "minor": 2}
        )

        state = json.loads(
            (tmp_path / ".agents" / "state.json").read_text(encoding="utf-8")
        )
        assert "checkers" in state
        assert "problem-checker" in state["checkers"]
        assert state["checkers"]["problem-checker"]["issues"]["critical"] == 1

    def test_record_rejects_unknown_checker(self, tmp_path: Path) -> None:
        _init_state(tmp_path)
        tracker = CheckerTracker(str(tmp_path))
        with pytest.raises(ValueError, match="Unknown checker"):
            tracker.record_checker_run("fake-checker", {"critical": 0})


class TestGetCheckerStatus:
    def test_returns_empty_when_no_runs(self, tmp_path: Path) -> None:
        _init_state(tmp_path)
        tracker = CheckerTracker(str(tmp_path))
        assert tracker.get_checker_status() == {}

    def test_returns_recorded_status(self, tmp_path: Path) -> None:
        _init_state(tmp_path)
        tracker = CheckerTracker(str(tmp_path))
        tracker.record_checker_run(
            "logic-checker", {"critical": 0, "major": 1, "minor": 0}
        )
        status = tracker.get_checker_status()
        assert "logic-checker" in status
        assert status["logic-checker"]["issues"]["major"] == 1


class TestParseCheckerOutput:
    def test_parse_html_comments(self) -> None:
        text = """Some text
<!-- AI Comments:
[CRITICAL] Problem statement is vague
[MAJOR] Missing comparison with baseline
[MINOR] Typo in section 3.2
-->
More text"""
        issues = parse_checker_output(text)
        assert len(issues) == 3
        assert issues[0]["severity"] == "critical"
        assert issues[1]["severity"] == "major"
        assert issues[2]["severity"] == "minor"
        assert "vague" in issues[0]["message"]

    def test_parse_empty_text(self) -> None:
        assert parse_checker_output("no comments here") == []


class TestMarkIssueResolved:
    def test_mark_and_filter(self, tmp_path: Path) -> None:
        _init_state(tmp_path)
        tracker = CheckerTracker(str(tmp_path))
        state = json.loads(
            (tmp_path / ".agents" / "state.json").read_text(encoding="utf-8")
        )
        state["checkers"] = {
            "clarity-checker": {
                "last_run": "2024-01-01T00:00:00",
                "issues": {"critical": 0, "major": 1, "minor": 0},
                "issue_list": [
                    {
                        "id": "abc123",
                        "severity": "major",
                        "message": "Unclear paragraph",
                    }
                ],
            }
        }
        (tmp_path / ".agents" / "state.json").write_text(
            json.dumps(state), encoding="utf-8"
        )

        assert tracker.mark_issue_resolved("abc123") is True
        assert tracker.mark_issue_resolved("nonexistent") is False

        unresolved = tracker.get_unresolved_issues()
        assert len(unresolved) == 0


class TestFormatResults:
    def test_format_empty(self) -> None:
        assert "No checker results" in format_checker_results({})

    def test_format_with_data(self) -> None:
        results = {
            "problem-checker": {
                "last_run": "2024-01-01T00:00:00+00:00",
                "issues": {"critical": 1, "major": 2, "minor": 0},
            }
        }
        output = format_checker_results(results)
        assert "problem-checker" in output
        assert "not run" in output


class TestCheckerNames:
    def test_checker_names_count(self) -> None:
        assert len(CHECKER_NAMES) == 7

    def test_checker_names_contain_expected(self) -> None:
        expected = [
            "problem-checker",
            "novelty-checker",
            "technical-depth-checker",
            "logic-checker",
            "clarity-checker",
            "evaluation-protocol-checker",
            "data-checker",
        ]
        assert CHECKER_NAMES == expected
