"""Tests for vibepaper.cli module (Task 6)."""

from __future__ import annotations

import json
from pathlib import Path

from click.testing import CliRunner, Result

from vibepaper.cli import main


def _invoke(runner: CliRunner, args: list[str]) -> Result:
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

    def test_init_scaffolds_skills_and_storyline(self, tmp_path: Path) -> None:
        runner = CliRunner()
        result = _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"],
        )
        assert result.exit_code == 0, result.output
        assert "Scaffolded" in result.output

        skills_dir = tmp_path / ".agents" / "skills"
        assert skills_dir.is_dir()
        assert (skills_dir / "AGENTS.md").exists()
        assert (skills_dir / "storyline-helper").is_dir()
        assert (skills_dir / "markdown-helper").is_dir()
        assert (skills_dir / "vibepaper-manage").is_dir()

        assert (tmp_path / "storyline.md").exists()
        assert (tmp_path / "writingrules.md").exists()
        assert (tmp_path / "AGENTS.md").exists()

    def test_init_existing_project_warns(self, tmp_path: Path) -> None:
        runner = CliRunner()
        # First init succeeds
        _ = _invoke(
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
        _ = _invoke(
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
        _ = _invoke(
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
        _ = _invoke(
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


class TestSkip:
    """Tests for the 'vibe skip' command."""

    def test_skip_phase_updates_state(self, tmp_path: Path) -> None:
        runner = CliRunner()
        _ = _invoke(
            runner, ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"]
        )
        result = _invoke(
            runner,
            [
                "--root",
                str(tmp_path),
                "skip",
                "experiments",
                "--reason",
                "user provided data",
            ],
        )
        assert result.exit_code == 0, result.output
        assert "skipped" in result.output.lower()

        state = json.loads(
            (tmp_path / ".agents" / "state.json").read_text(encoding="utf-8")
        )
        assert state["phases"]["experiments"]["status"] == "skipped"


class TestLog:
    """Tests for the 'vibe log' command."""

    def test_log_shows_entries(self, tmp_path: Path) -> None:
        runner = CliRunner()
        _ = _invoke(
            runner, ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"]
        )
        result = _invoke(runner, ["--root", str(tmp_path), "log", "--last", "5"])
        assert result.exit_code == 0, result.output
        assert "init_project" in result.output

    def test_log_empty(self, tmp_path: Path) -> None:
        runner = CliRunner()
        (tmp_path / ".agents").mkdir(parents=True, exist_ok=True)
        result = _invoke(runner, ["--root", str(tmp_path), "log"])
        assert result.exit_code == 0, result.output
        assert "No log entries" in result.output


class TestCommit:
    """Tests for the 'vibe commit' command."""

    def test_commit_creates_phase_commit(self, tmp_path: Path) -> None:
        import git

        repo = git.Repo.init(tmp_path)
        repo.config_writer().set_value("user", "name", "Test").release()
        repo.config_writer().set_value("user", "email", "t@t.com").release()
        (tmp_path / "README.md").write_text("# Test", encoding="utf-8")
        repo.index.add(["README.md"])
        repo.index.commit("Initial commit")

        runner = CliRunner()
        _ = _invoke(
            runner, ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"]
        )

        (tmp_path / "draft.md").write_text("Draft content", encoding="utf-8")

        result = _invoke(
            runner,
            [
                "--root",
                str(tmp_path),
                "commit",
                "-m",
                "initial draft",
                "--phase",
                "storyline",
            ],
        )
        assert result.exit_code == 0, result.output
        assert "Committed" in result.output
        assert "storyline" in result.output


class TestRollback:
    """Tests for the 'vibe rollback' command."""

    def test_rollback_to_phase(self, tmp_path: Path) -> None:
        import git

        repo = git.Repo.init(tmp_path)
        repo.config_writer().set_value("user", "name", "Test").release()
        repo.config_writer().set_value("user", "email", "t@t.com").release()
        (tmp_path / "README.md").write_text("# Test", encoding="utf-8")
        repo.index.add(["README.md"])
        repo.index.commit("Initial commit")

        runner = CliRunner()
        _ = _invoke(
            runner, ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"]
        )

        (tmp_path / "draft.md").write_text("Draft v1", encoding="utf-8")
        _invoke(
            runner,
            ["--root", str(tmp_path), "commit", "-m", "v1", "--phase", "storyline"],
        )

        result = _invoke(
            runner, ["--root", str(tmp_path), "rollback", "storyline", "-y"]
        )
        assert result.exit_code == 0, result.output
        assert "Rolled back" in result.output

    def test_rollback_resets_phase_state(self, tmp_path: Path) -> None:
        import git

        repo = git.Repo.init(tmp_path)
        repo.config_writer().set_value("user", "name", "Test").release()
        repo.config_writer().set_value("user", "email", "t@t.com").release()
        _ = (tmp_path / "README.md").write_text("# Test", encoding="utf-8")
        repo.index.add(["README.md"])
        repo.index.commit("Initial commit")

        runner = CliRunner()
        _ = _invoke(
            runner, ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"]
        )

        state_path = tmp_path / ".agents" / "state.json"
        state = json.loads(state_path.read_text(encoding="utf-8"))
        state["phases"]["storyline"]["status"] = "complete"
        state["phases"]["storyline"]["completed_at"] = "2026-04-09T00:00:00+00:00"
        state_path.write_text(
            json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        _ = (tmp_path / "draft.md").write_text("Draft v1", encoding="utf-8")
        _ = _invoke(
            runner,
            ["--root", str(tmp_path), "commit", "-m", "v1", "--phase", "storyline"],
        )

        result = _invoke(
            runner, ["--root", str(tmp_path), "rollback", "storyline", "-y"]
        )
        assert result.exit_code == 0, result.output

        updated = json.loads(state_path.read_text(encoding="utf-8"))
        assert updated["phases"]["storyline"]["status"] == "not_started"
        assert updated["phases"]["storyline"].get("completed_at") is None


class TestReport:
    """Tests for the 'vibe report' command."""

    def test_report_generates_output(self, tmp_path: Path) -> None:
        """Test that 'vibe report' generates markdown output."""
        runner = CliRunner()
        _ = _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "TestPaper", "--domain", "SE"],
        )
        result = _invoke(runner, ["--root", str(tmp_path), "report"])
        assert result.exit_code == 0, result.output
        assert "Weekly Report" in result.output
        assert "TestPaper" in result.output

    def test_report_with_since(self, tmp_path: Path) -> None:
        """Test report with --since flag."""
        runner = CliRunner()
        _ = _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "TestPaper", "--domain", "SE"],
        )
        result = _invoke(
            runner, ["--root", str(tmp_path), "report", "--since", "2020-01-01"]
        )
        assert result.exit_code == 0, result.output
        assert "since 2020-01-01" in result.output

    def test_report_output_to_file(self, tmp_path: Path) -> None:
        """Test report with --output flag writes to file."""
        runner = CliRunner()
        _ = _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "TestPaper", "--domain", "SE"],
        )
        out_file = str(tmp_path / "report.md")
        result = _invoke(
            runner, ["--root", str(tmp_path), "report", "--output", out_file]
        )
        assert result.exit_code == 0, result.output
        assert Path(out_file).exists()
        content = Path(out_file).read_text(encoding="utf-8")
        assert "Weekly Report" in content


class TestDiff:
    """Tests for the 'vibe diff' command."""

    def test_diff_no_git_repo(self, tmp_path: Path) -> None:
        """Test diff command when no git repo exists."""
        runner = CliRunner()
        _ = _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "TestPaper", "--domain", "SE"],
        )
        result = runner.invoke(
            main,
            ["--root", str(tmp_path), "diff", "storyline", "literature"],
            catch_exceptions=True,
        )
        # Should handle gracefully (error or message)
        assert (
            result.exit_code != 0
            or "Error" in result.output
            or "No diff" in result.output
        )
