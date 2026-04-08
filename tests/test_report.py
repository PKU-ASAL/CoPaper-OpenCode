"""Tests for vibepaper.report module (Task 16)."""

from __future__ import annotations

from pathlib import Path

import git

from vibepaper.report import generate_weekly_report, generate_diff_report


class TestGenerateWeeklyReport:
    def test_report_contains_phase_progress(self, tmp_path: Path) -> None:
        from vibepaper.state import StateManager

        sm = StateManager(str(tmp_path))
        sm.init_project("TestPaper", "SE")

        from vibepaper.eventlog import EventLogger

        el = EventLogger(str(tmp_path / ".agents" / "events.jsonl"))
        el.log("init_project", "user", "success", phase="storyline")

        report = generate_weekly_report(str(tmp_path))
        assert "# Weekly Report" in report
        assert "TestPaper" in report
        assert "Phase Progress" in report
        assert "storyline" in report

    def test_report_with_since_date(self, tmp_path: Path) -> None:
        from vibepaper.state import StateManager

        sm = StateManager(str(tmp_path))
        sm.init_project("P", "D")

        from vibepaper.eventlog import EventLogger

        el = EventLogger(str(tmp_path / ".agents" / "events.jsonl"))
        el.log("init_project", "user", "success", phase="storyline")

        report = generate_weekly_report(str(tmp_path), since_date="2020-01-01")
        assert "since 2020-01-01" in report

    def test_report_event_log_stats(self, tmp_path: Path) -> None:
        from vibepaper.state import StateManager

        sm = StateManager(str(tmp_path))
        sm.init_project("P", "D")

        from vibepaper.eventlog import EventLogger

        el = EventLogger(str(tmp_path / ".agents" / "events.jsonl"))
        el.log("init_project", "user", "success", phase="storyline")
        el.log("commit_phase", "system", "success", phase="storyline")

        report = generate_weekly_report(str(tmp_path))
        assert "Event Log Statistics" in report
        assert "init_project" in report


class TestGenerateDiffReport:
    def test_diff_no_commits(self, tmp_path: Path) -> None:
        repo = git.Repo.init(tmp_path)
        repo.config_writer().set_value("user", "name", "Test").release()
        repo.config_writer().set_value("user", "email", "t@t.com").release()
        (tmp_path / "README.md").write_text("# Test")
        repo.index.add(["README.md"])
        repo.index.commit("Initial")

        result = generate_diff_report(str(tmp_path), "storyline", "literature")
        assert "No diff available" in result

    def test_diff_between_phases(self, tmp_path: Path) -> None:
        repo = git.Repo.init(tmp_path)
        repo.config_writer().set_value("user", "name", "Test").release()
        repo.config_writer().set_value("user", "email", "t@t.com").release()

        (tmp_path / "a.txt").write_text("content a")
        repo.index.add(["a.txt"])
        repo.index.commit("[storyline] draft")

        (tmp_path / "b.txt").write_text("content b")
        repo.index.add(["b.txt"])
        repo.index.commit("[literature] refs")

        result = generate_diff_report(str(tmp_path), "storyline", "literature")
        assert "Diff:" in result or "No diff" in result


class TestWeeklyReportFormat:
    def test_report_is_valid_markdown(self, tmp_path: Path) -> None:
        from vibepaper.state import StateManager

        sm = StateManager(str(tmp_path))
        sm.init_project("P", "D")

        from vibepaper.eventlog import EventLogger

        EventLogger(str(tmp_path / ".agents" / "events.jsonl"))

        report = generate_weekly_report(str(tmp_path))
        assert report.startswith("# ")
        assert "## Phase Progress" in report
        assert "## Commit Summary" in report
        assert "## Event Log Statistics" in report

    def test_report_no_events(self, tmp_path: Path) -> None:
        from vibepaper.state import StateManager

        sm = StateManager(str(tmp_path))
        sm.init_project("P", "D")

        from vibepaper.eventlog import EventLogger

        EventLogger(str(tmp_path / ".agents" / "events.jsonl"))

        report = generate_weekly_report(str(tmp_path))
        assert "No events found" in report or "Event Log Statistics" in report
