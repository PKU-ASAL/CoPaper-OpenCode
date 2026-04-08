"""Tests for vibepaper.cli module (Task 6)."""

from __future__ import annotations

import json
from pathlib import Path

from click.testing import CliRunner

from vibepaper.cli import main


def _invoke(runner: CliRunner, args: list[str]) -> object:
    """Invoke CLI with catch_exceptions=False for clearer tracebacks."""
    return runner.invoke(main, args, catch_exceptions=False)


class TestInit:
    """Tests for the 'vibe init' command."""

    def test_init_creates_project(self, tmp_path: Path) -> None:
        runner = CliRunner()
        result = _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "TestPaper", "--domain", "SE"],
        )
        assert result.exit_code == 0, result.output
        assert "TestPaper" in result.output
        assert "SE" in result.output

        state_file = tmp_path / ".agents" / "state.json"
        assert state_file.exists()
        state = json.loads(state_file.read_text(encoding="utf-8"))
        assert state["project"]["name"] == "TestPaper"
        assert state["project"]["domain"] == "SE"

    def test_init_existing_project_warns(self, tmp_path: Path) -> None:
        runner = CliRunner()
        # First init succeeds
        _invoke(
            runner, ["--root", str(tmp_path), "init", "--name", "A", "--domain", "B"]
        )
        # Second init — decline confirmation
        result = _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "C", "--domain", "D"],
            # input "n" to decline the confirmation prompt
        )
        # When run without input, Click's confirm defaults to False (abort)
        # so the second init should show a warning and abort
        assert "already exists" in result.output or "Aborted" in result.output

    def test_init_creates_event_log(self, tmp_path: Path) -> None:
        runner = CliRunner()
        _invoke(
            runner, ["--root", str(tmp_path), "init", "--name", "X", "--domain", "Y"]
        )

        log_file = tmp_path / ".agents" / "events.jsonl"
        assert log_file.exists()
        lines = log_file.read_text(encoding="utf-8").strip().splitlines()
        assert len(lines) >= 1
        event = json.loads(lines[0])
        assert event["action"] == "init_project"
        assert event["result"] == "success"


class TestStatus:
    """Tests for the 'vibe status' command."""

    def test_status_shows_phases(self, tmp_path: Path) -> None:
        runner = CliRunner()
        _invoke(
            runner, ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"]
        )

        result = _invoke(runner, ["--root", str(tmp_path), "status"])
        assert result.exit_code == 0, result.output

        for phase in [
            "storyline",
            "literature",
            "discussion",
            "experiments",
            "writing",
            "latex_review",
        ]:
            assert phase in result.output

        assert "Current Phase" in result.output
        assert "Project:" in result.output

    def test_status_json_output(self, tmp_path: Path) -> None:
        runner = CliRunner()
        _invoke(
            runner, ["--root", str(tmp_path), "init", "--name", "J", "--domain", "SE"]
        )

        result = _invoke(runner, ["--root", str(tmp_path), "status", "--json"])
        assert result.exit_code == 0, result.output

        data = json.loads(result.output)
        assert data["project"]["name"] == "J"
        assert data["project"]["domain"] == "SE"
        assert "phases" in data
        assert data["current_phase"] == "storyline"

    def test_status_no_project_shows_error(self, tmp_path: Path) -> None:
        runner = CliRunner()
        result = _invoke(runner, ["--root", str(tmp_path), "status"])
        assert result.exit_code != 0
        assert (
            "No project found" in result.output
            or "Run 'vibe init' first" in result.output
        )
