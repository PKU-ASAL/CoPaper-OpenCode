"""Tests for `copaper relatedwork clean`."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from click.testing import CliRunner

from copaper import relatedwork_clean
from copaper.cli import main as cli_main
from copaper.literature import LiteratureCatalog
from copaper.relatedwork_clean import (
    CleanOutcome,
    clean_relatedwork,
    plan_targets,
)


def _seed_relatedwork(tmp_path: Path) -> dict[str, Path]:
    """Create representative relatedwork artifacts so clean has something to delete."""
    catalog = LiteratureCatalog(tmp_path)
    catalog.load()
    catalog.import_records(
        [
            {
                "paper_id": "demo2025paper",
                "title": "Demo",
                "authors": ["Doe, Jane"],
                "year": 2025,
                "venue": "arXiv",
                "pdf_path": "relatedwork/pdfs/demo2025paper.pdf",
                "download_status": "downloaded",
            }
        ]
    )
    catalog.save()

    pdf = catalog.pdfs_dir / "demo2025paper.pdf"
    pdf.write_bytes(b"%PDF-1.4 fake")
    summary = catalog.papers_dir / "demo2025paper.md"
    summary.write_text("# Demo\nbody.\n", encoding="utf-8")
    bib = tmp_path / "relatedwork" / "paper_list.bib"
    bib.write_text("@article{demo2025paper,title={Demo}}\n", encoding="utf-8")
    cache = tmp_path / "relatedwork" / "search_cache.json"
    cache.write_text('{"papers": []}\n', encoding="utf-8")
    cross = tmp_path / ".agents" / "cross_index.json"
    cross.parent.mkdir(parents=True, exist_ok=True)
    cross.write_text('{"points": {}}\n', encoding="utf-8")

    return {
        "pdf": pdf,
        "summary": summary,
        "bib": bib,
        "cache": cache,
        "cross": cross,
        "catalog": catalog.catalog_file,
        "relatedwork_dir": tmp_path / "relatedwork",
    }


def _force_permanent_delete(monkeypatch) -> None:
    """Stop tests from littering the real macOS trash."""
    monkeypatch.setattr(
        relatedwork_clean, "_delete_via_trash", lambda _path: False
    )


def _invoke(runner: CliRunner, args: list[str], **kwargs):
    return runner.invoke(cli_main, args, catch_exceptions=False, **kwargs)


class TestPlanTargets:
    def test_lists_both_targets(self, tmp_path: Path) -> None:
        targets = plan_targets(tmp_path)
        assert [path.name for path in targets] == ["relatedwork", "cross_index.json"]


class TestCleanRelatedwork:
    def test_dry_run_does_not_delete_or_reset_state(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        _force_permanent_delete(monkeypatch)
        runner = CliRunner()
        _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"],
        )
        seeded = _seed_relatedwork(tmp_path)

        outcome = clean_relatedwork(tmp_path, dry_run=True)

        assert outcome.dry_run is True
        assert outcome.state_reset is False
        # Both planned targets reported as "would remove"
        assert len(outcome.removed) == 2
        # Files still on disk
        assert seeded["pdf"].exists()
        assert seeded["catalog"].exists()
        assert seeded["cross"].exists()

    def test_clean_removes_files_and_resets_state(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        _force_permanent_delete(monkeypatch)
        runner = CliRunner()
        _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"],
        )
        seeded = _seed_relatedwork(tmp_path)

        # Bump literature phase counters so we can assert they get zeroed.
        state_path = tmp_path / ".agents" / "state.json"
        state = json.loads(state_path.read_text(encoding="utf-8"))
        state["phases"]["literature"]["papers_found"] = 7
        state["phases"]["literature"]["papers_downloaded"] = 5
        state["phases"]["literature"]["summaries_done"] = 3
        state["phases"]["literature"]["cross_index_built"] = True
        state["phases"]["literature"]["status"] = "in_progress"
        state_path.write_text(json.dumps(state), encoding="utf-8")

        outcome = clean_relatedwork(tmp_path)

        assert outcome.dry_run is False
        assert outcome.state_reset is True
        assert outcome.used_trash is False  # forced fallback
        assert sorted(Path(p).name for p in outcome.removed) == [
            "cross_index.json",
            "relatedwork",
        ]

        # Files gone
        assert not seeded["relatedwork_dir"].exists()
        assert not seeded["cross"].exists()

        # State zeroed
        new_state = json.loads(state_path.read_text(encoding="utf-8"))
        literature = new_state["phases"]["literature"]
        assert literature["status"] == "not_started"
        assert literature["papers_found"] == 0
        assert literature["papers_downloaded"] == 0
        assert literature["summaries_done"] == 0
        assert literature["cross_index_built"] is False

    def test_nothing_to_clean(self, tmp_path: Path, monkeypatch) -> None:
        _force_permanent_delete(monkeypatch)
        runner = CliRunner()
        _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"],
        )

        outcome = clean_relatedwork(tmp_path)

        assert outcome.removed == []
        assert len(outcome.skipped) == 2
        # State has nothing to reset semantically, but the function still
        # touches state to keep counts canonical.
        assert outcome.state_reset is True

    def test_delete_fn_is_injectable(self, tmp_path: Path) -> None:
        runner = CliRunner()
        _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"],
        )
        _seed_relatedwork(tmp_path)

        recorded: list[Path] = []

        def _stub(path: Path) -> bool:
            recorded.append(path)
            # Simulate trash success without actually deleting.
            import shutil

            if path.is_dir():
                shutil.rmtree(path)
            else:
                path.unlink()
            return True

        outcome = clean_relatedwork(tmp_path, delete_fn=_stub)

        assert outcome.used_trash is True
        assert {p.name for p in recorded} == {"relatedwork", "cross_index.json"}


class TestCleanCli:
    def test_cli_requires_confirmation_then_aborts(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        _force_permanent_delete(monkeypatch)
        runner = CliRunner()
        _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"],
        )
        _seed_relatedwork(tmp_path)

        result = _invoke(
            runner,
            ["--root", str(tmp_path), "relatedwork", "clean"],
            input="n\n",
        )

        assert result.exit_code == 0
        assert "Aborted." in result.output
        # Nothing actually removed
        assert (tmp_path / "relatedwork").exists()
        assert (tmp_path / ".agents" / "cross_index.json").exists()

    def test_cli_yes_skips_confirmation_and_removes(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        _force_permanent_delete(monkeypatch)
        runner = CliRunner()
        _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"],
        )
        _seed_relatedwork(tmp_path)

        result = _invoke(
            runner,
            ["--root", str(tmp_path), "relatedwork", "clean", "--yes"],
        )

        assert result.exit_code == 0, result.output
        assert "[cleaned]" in result.output
        assert "reset to not_started" in result.output
        assert not (tmp_path / "relatedwork").exists()
        assert not (tmp_path / ".agents" / "cross_index.json").exists()

    def test_cli_dry_run_does_not_delete(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        _force_permanent_delete(monkeypatch)
        runner = CliRunner()
        _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"],
        )
        _seed_relatedwork(tmp_path)

        result = _invoke(
            runner,
            ["--root", str(tmp_path), "relatedwork", "clean", "--dry-run"],
        )

        assert result.exit_code == 0, result.output
        assert "--dry-run" in result.output
        assert (tmp_path / "relatedwork").exists()
        assert (tmp_path / ".agents" / "cross_index.json").exists()

    def test_cli_reports_nothing_to_clean(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        _force_permanent_delete(monkeypatch)
        runner = CliRunner()
        _invoke(
            runner,
            ["--root", str(tmp_path), "init", "--name", "P", "--domain", "D"],
        )

        result = _invoke(
            runner,
            ["--root", str(tmp_path), "relatedwork", "clean", "--yes"],
        )

        assert result.exit_code == 0, result.output
        assert "Nothing to clean" in result.output
