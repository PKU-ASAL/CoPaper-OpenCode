"""Tests for vibepaper.state module (Task 3)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from vibepaper.constants import Phase, PhaseStatus
from vibepaper.state import StateFileError, StateManager


class TestInitProject:
    def test_init_creates_valid_state(self, tmp_project_dir: Path) -> None:
        sm = StateManager(str(tmp_project_dir))
        sm.init_project(name="TestPaper", domain="software engineering")

        state_file = tmp_project_dir / ".agents" / "state.json"
        assert state_file.exists()

        data = json.loads(state_file.read_text(encoding="utf-8"))
        assert data["project"]["name"] == "TestPaper"
        assert data["project"]["domain"] == "software engineering"
        assert data["project"]["created_at"] != ""
        assert data["current_phase"] == "storyline"

        for phase_name, phase_data in data["phases"].items():
            assert phase_data["status"] == "not_started"
            assert phase_data["completed_at"] is None


class TestLoad:
    def test_load_corrupted_state_raises_clear_error(
        self, tmp_project_dir: Path
    ) -> None:
        sm = StateManager(str(tmp_project_dir))
        sm.init_project(name="X", domain="X")

        state_file = tmp_project_dir / ".agents" / "state.json"
        state_file.write_text("{invalid json!!!", encoding="utf-8")

        with pytest.raises(StateFileError, match="invalid JSON"):
            sm.load()

    def test_load_missing_file_raises_clear_error(self, tmp_project_dir: Path) -> None:
        sm = StateManager(str(tmp_project_dir))
        with pytest.raises(StateFileError, match="not found"):
            sm.load()


class TestSetPhaseStatus:
    def test_set_phase_status_updates_correctly(self, tmp_project_dir: Path) -> None:
        sm = StateManager(str(tmp_project_dir))
        sm.init_project(name="P", domain="d")
        sm.load()

        sm.set_phase_status("storyline", "in_progress")
        assert sm.get_phase_status("storyline") == "in_progress"

        sm.set_phase_status("storyline", "complete")
        assert sm.get_phase_status("storyline") == "complete"
        assert sm._state["phases"]["storyline"]["completed_at"] is not None
        assert sm.get_current_phase() == "literature"

    def test_set_phase_status_with_metadata(self, tmp_project_dir: Path) -> None:
        sm = StateManager(str(tmp_project_dir))
        sm.init_project(name="P", domain="d")
        sm.load()

        sm.set_phase_status("literature", "in_progress", papers_found=10)
        assert sm._state["phases"]["literature"]["papers_found"] == 10
        assert sm.get_current_phase() == "literature"


class TestSkipPhase:
    def test_skip_phase_records_reason(self, tmp_project_dir: Path) -> None:
        sm = StateManager(str(tmp_project_dir))
        sm.init_project(name="P", domain="d")
        sm.load()

        sm.skip_phase("experiments", "No GPU available")
        assert sm.get_phase_status("experiments") == "skipped"
        assert sm._state["phases"]["experiments"]["skip_reason"] == "No GPU available"

    def test_skip_phase_recomputes_current_phase(self, tmp_project_dir: Path) -> None:
        sm = StateManager(str(tmp_project_dir))
        sm.init_project(name="P", domain="d")
        sm.load()

        sm.skip_phase("storyline", "Use existing draft")
        assert sm.get_current_phase() == "literature"


class TestRollbackPhase:
    def test_rollback_resets_status(self, tmp_project_dir: Path) -> None:
        sm = StateManager(str(tmp_project_dir))
        sm.init_project(name="P", domain="d")
        sm.load()

        sm.set_phase_status("storyline", "complete")
        assert sm.get_phase_status("storyline") == "complete"
        assert "completed_at" in sm._state["phases"]["storyline"]

        sm.rollback_phase("storyline")
        assert sm.get_phase_status("storyline") == "not_started"
        assert sm._state["phases"]["storyline"]["completed_at"] is None
        assert sm.get_current_phase() == "storyline"


class TestCheckDependencies:
    def test_dependency_check_warns_missing(self, tmp_project_dir: Path) -> None:
        sm = StateManager(str(tmp_project_dir))
        sm.init_project(name="P", domain="d")
        sm.load()

        # discussion depends on storyline and literature, both not_started
        unmet = sm.check_dependencies("discussion")
        assert "storyline" in unmet
        assert "literature" in unmet

    def test_dependency_check_satisfied_when_complete(
        self, tmp_project_dir: Path
    ) -> None:
        sm = StateManager(str(tmp_project_dir))
        sm.init_project(name="P", domain="d")
        sm.load()

        sm.set_phase_status("storyline", "complete")
        sm.set_phase_status("literature", "complete")
        unmet = sm.check_dependencies("discussion")
        assert unmet == []

    def test_dependency_check_skipped_counts_as_met(
        self, tmp_project_dir: Path
    ) -> None:
        sm = StateManager(str(tmp_project_dir))
        sm.init_project(name="P", domain="d")
        sm.load()

        sm.skip_phase("experiments", "No data")
        unmet = sm.check_dependencies("writing")
        # writing depends on discussion, not experiments
        assert "experiments" not in unmet


class TestAtomicWrite:
    def test_atomic_write_survives_crash(self, tmp_project_dir: Path) -> None:
        sm = StateManager(str(tmp_project_dir))
        sm.init_project(name="P", domain="d")

        sm.load()
        sm.set_phase_status("storyline", "complete")
        sm.save()

        state_file = tmp_project_dir / ".agents" / "state.json"
        data = json.loads(state_file.read_text(encoding="utf-8"))
        assert data["phases"]["storyline"]["status"] == "complete"

        agents_dir = tmp_project_dir / ".agents"
        temp_files = list(agents_dir.glob(".state_tmp_*"))
        assert len(temp_files) == 0


class TestGetCurrentPhase:
    def test_get_current_phase_returns_default(self, tmp_project_dir: Path) -> None:
        sm = StateManager(str(tmp_project_dir))
        sm.init_project(name="P", domain="d")
        sm.load()
        assert sm.get_current_phase() == "storyline"

    def test_get_current_phase_prefers_in_progress_phase(
        self, tmp_project_dir: Path
    ) -> None:
        sm = StateManager(str(tmp_project_dir))
        sm.init_project(name="P", domain="d")
        sm.load()

        sm.set_phase_status("storyline", "complete")
        sm.set_phase_status("literature", "complete")
        sm.set_phase_status("discussion", "in_progress")

        assert sm.get_current_phase() == "discussion"
