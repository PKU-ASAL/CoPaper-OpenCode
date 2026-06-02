"""Tests for copaper.cli module (Task 6)."""

from __future__ import annotations

import json
from pathlib import Path

from click.testing import CliRunner, Result

from copaper.cli import main


def _invoke(runner: CliRunner, args: list[str]) -> Result:
    """Invoke CLI with catch_exceptions=False for clearer tracebacks."""
    return runner.invoke(main, args, catch_exceptions=False)


class TestInit:
    """Tests for the 'copaper init' command."""

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

    def test_init_scaffolds_skills_storyline_and_paper(self, tmp_path: Path) -> None:
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
        assert (skills_dir / "copaper-manage").is_dir()

        assert (tmp_path / "storyline.md").exists()
        assert (tmp_path / "paper.md").exists()
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
    """Tests for the 'copaper status' command."""

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

    def test_status_recomputes_current_phase_from_phase_state(
        self, tmp_path: Path
    ) -> None:
        runner = CliRunner()
        _ = _invoke(
            runner, ["--root", str(tmp_path), "init", "--name", "J", "--domain", "SE"]
        )

        state_path = tmp_path / ".agents" / "state.json"
        state = json.loads(state_path.read_text(encoding="utf-8"))
        state["phases"]["storyline"]["status"] = "complete"
        state["phases"]["storyline"]["completed_at"] = "2026-04-09T00:00:00+00:00"
        state["current_phase"] = "storyline"
        state_path.write_text(
            json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        result = _invoke(runner, ["--root", str(tmp_path), "status", "--json"])
        assert result.exit_code == 0, result.output

        updated = json.loads(result.output)
        assert updated["current_phase"] == "literature"

    def test_status_no_project_shows_error(self, tmp_path: Path) -> None:
        runner = CliRunner()
        result = _invoke(runner, ["--root", str(tmp_path), "status"])
        assert result.exit_code != 0
        assert (
            "No project found" in result.output
            or "Run 'copaper init' first" in result.output
        )


class TestSkip:
    """Tests for the 'copaper skip' command."""

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

    def test_skip_phase_updates_current_phase(self, tmp_path: Path) -> None:
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
                "storyline",
                "--reason",
                "use imported draft",
            ],
        )
        assert result.exit_code == 0, result.output
        assert "Current phase is now 'literature'" in result.output

        state = json.loads(
            (tmp_path / ".agents" / "state.json").read_text(encoding="utf-8")
        )
        assert state["current_phase"] == "literature"


class TestSetPhase:
    """Tests for the 'copaper set-phase' command."""

    def test_set_phase_complete_advances_current_phase(self, tmp_path: Path) -> None:
        runner = CliRunner()
        _ = _invoke(
            runner, ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"]
        )

        result = _invoke(
            runner,
            ["--root", str(tmp_path), "set-phase", "storyline", "--status", "complete"],
        )
        assert result.exit_code == 0, result.output
        assert "Current phase is now 'literature'" in result.output

        state = json.loads(
            (tmp_path / ".agents" / "state.json").read_text(encoding="utf-8")
        )
        assert state["phases"]["storyline"]["status"] == "complete"
        assert state["current_phase"] == "literature"

    def test_set_phase_warns_on_unmet_dependencies(self, tmp_path: Path) -> None:
        runner = CliRunner()
        _ = _invoke(
            runner, ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"]
        )

        result = _invoke(
            runner,
            [
                "--root",
                str(tmp_path),
                "set-phase",
                "discussion",
                "--status",
                "in_progress",
            ],
        )
        assert result.exit_code == 0, result.output
        assert "recommended dependencies" in result.output
        assert "Current phase is now 'discussion'" in result.output


class TestLog:
    """Tests for the 'copaper log' command."""

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
    """Tests for the 'copaper commit' command."""

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

    def test_commit_auto_detects_recomputed_current_phase(self, tmp_path: Path) -> None:
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

        state_path = tmp_path / ".agents" / "state.json"
        state = json.loads(state_path.read_text(encoding="utf-8"))
        state["phases"]["storyline"]["status"] = "complete"
        state["phases"]["storyline"]["completed_at"] = "2026-04-09T00:00:00+00:00"
        state["current_phase"] = "storyline"
        state_path.write_text(
            json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        (tmp_path / "draft.md").write_text("Draft content", encoding="utf-8")

        result = _invoke(
            runner,
            ["--root", str(tmp_path), "commit", "-m", "auto phase commit", "--force"],
        )
        assert result.exit_code == 0, result.output
        assert "Committed [literature]" in result.output


class TestRollback:
    """Tests for the 'copaper rollback' command."""

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
        assert updated["current_phase"] == "storyline"


class TestReport:
    """Tests for the 'copaper report' command."""

    def test_report_generates_output(self, tmp_path: Path) -> None:
        """Test that 'copaper report' generates markdown output."""
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
    """Tests for the 'copaper diff' command."""

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


class TestRelatedwork:
    """Tests for the 'copaper relatedwork' command group."""

    def test_relatedwork_import_updates_catalog_and_state(self, tmp_path: Path) -> None:
        runner = CliRunner()
        _ = _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "TestPaper", "--domain", "SE"],
        )

        input_path = tmp_path / "search_cache.json"
        input_path.write_text(
            json.dumps(
                {
                    "papers": [
                        {
                            "paper_id": "song2025ceed",
                            "title": "CEED-VLA",
                            "authors": ["Song, W", "Chen, J"],
                            "year": 2025,
                            "venue": "arXiv",
                            "bibtex": "@article{song2025ceed, title={CEED-VLA}, author={Song, W and Chen, J}, year={2025}}",
                            "pdf_url": "https://example.com/ceed.pdf",
                        }
                    ]
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        result = _invoke(
            runner,
            [
                "--root",
                str(tmp_path),
                "relatedwork",
                "import",
                "--input",
                str(input_path),
            ],
        )
        assert result.exit_code == 0, result.output
        assert "Added 1 papers" in result.output

        catalog = json.loads(
            (tmp_path / "relatedwork" / "literature.json").read_text(encoding="utf-8")
        )
        assert "song2025ceed" in catalog["papers"]

        state = json.loads(
            (tmp_path / ".agents" / "state.json").read_text(encoding="utf-8")
        )
        assert state["phases"]["literature"]["papers_found"] == 1
        assert (
            state["phases"]["literature"]["catalog_path"]
            == "relatedwork/literature.json"
        )

    def test_relatedwork_status_json(self, tmp_path: Path) -> None:
        runner = CliRunner()
        _ = _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "TestPaper", "--domain", "SE"],
        )

        result = _invoke(
            runner,
            ["--root", str(tmp_path), "relatedwork", "status", "--json"],
        )
        assert result.exit_code == 0, result.output
        data = json.loads(result.output)
        assert data["counts"]["papers_found"] == 0
        assert data["catalog_path"] == "relatedwork/literature.json"

    def test_relatedwork_sync_bib_writes_entries(self, tmp_path: Path) -> None:
        runner = CliRunner()
        _ = _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "TestPaper", "--domain", "SE"],
        )

        input_path = tmp_path / "search_cache.json"
        input_path.write_text(
            json.dumps(
                [
                    {
                        "paper_id": "song2025ceed",
                        "title": "CEED-VLA",
                        "authors": ["Song, W", "Chen, J"],
                        "year": 2025,
                        "venue": "arXiv",
                    }
                ],
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        _ = _invoke(
            runner,
            [
                "--root",
                str(tmp_path),
                "relatedwork",
                "import",
                "--input",
                str(input_path),
            ],
        )

        result = _invoke(
            runner,
            ["--root", str(tmp_path), "relatedwork", "sync-bib"],
        )
        assert result.exit_code == 0, result.output
        assert "Synchronized" in result.output
        assert "song2025ceed" in (
            tmp_path / "relatedwork" / "paper_list.bib"
        ).read_text(encoding="utf-8")

    def test_relatedwork_register_summary_and_build_index(self, tmp_path: Path) -> None:
        runner = CliRunner()
        _ = _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "TestPaper", "--domain", "SE"],
        )

        input_path = tmp_path / "search_cache.json"
        input_path.write_text(
            json.dumps(
                [
                    {
                        "paper_id": "song2025ceed",
                        "title": "CEED-VLA",
                        "authors": ["Song, W", "Chen, J"],
                        "year": 2025,
                        "venue": "arXiv",
                    }
                ],
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        _ = _invoke(
            runner,
            [
                "--root",
                str(tmp_path),
                "relatedwork",
                "import",
                "--input",
                str(input_path),
            ],
        )

        summary_path = tmp_path / "relatedwork" / "papers" / "song2025ceed.md"
        summary_path.parent.mkdir(parents=True, exist_ok=True)
        summary_path.write_text(
            "# CEED-VLA\n\n## Early Exit\n\nThis paper studies **early_exit**.\n",
            encoding="utf-8",
        )

        result = _invoke(
            runner,
            [
                "--root",
                str(tmp_path),
                "relatedwork",
                "register-summary",
                "--paper-id",
                "song2025ceed",
                "--summary-path",
                str(summary_path),
            ],
        )
        assert result.exit_code == 0, result.output

        result = _invoke(
            runner,
            ["--root", str(tmp_path), "relatedwork", "build-index"],
        )
        assert result.exit_code == 0, result.output
        assert "Built .agents/cross_index.json" in result.output
        assert (tmp_path / ".agents" / "cross_index.json").exists()

        state = json.loads(
            (tmp_path / ".agents" / "state.json").read_text(encoding="utf-8")
        )
        assert state["phases"]["literature"]["summaries_done"] == 1
        assert state["phases"]["literature"]["cross_index_built"] is True
