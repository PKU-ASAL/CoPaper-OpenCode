"""State file (.agents/state.json) read/write and validation.

StateManager is the single source of truth for project progress.
It handles atomic reads/writes to prevent corruption and provides
convenience methods for phase status management.
"""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from vibepaper.constants import PHASE_DEPENDENCIES, Phase, PhaseStatus
from vibepaper.schema import DEFAULT_STATE


class StateFileError(Exception):
    """Raised when the state file cannot be read or parsed."""


class StateManager:
    """Manages the .agents/state.json file for a VibePaper project.

    Provides atomic read/write operations and convenience methods for
    querying and updating phase status in the writing pipeline.
    """

    def __init__(self, project_root: str) -> None:
        self.project_root = Path(project_root)
        self._state_file = self.project_root / ".agents" / "state.json"
        self._state: dict[str, Any] = {}

    def init_project(self, name: str, domain: str) -> None:
        """Create .agents/ directory and write initial state.json.

        Args:
            name: Project name.
            domain: Research domain (e.g., "software engineering").
        """
        agents_dir = self.project_root / ".agents"
        agents_dir.mkdir(parents=True, exist_ok=True)

        state = _deep_copy_default_state()
        state["project"]["name"] = name
        state["project"]["domain"] = domain
        state["project"]["created_at"] = datetime.now(timezone.utc).isoformat()

        self._state = state
        self.save()

    def load(self) -> dict[str, Any]:
        """Read state.json into self._state and return it.

        Raises:
            StateFileError: If the file does not exist or contains
                invalid JSON.
        """
        if not self._state_file.exists():
            raise StateFileError(
                f"State file not found: {self._state_file}. "
                "Run 'vibe init' to create a new project."
            )

        try:
            raw = self._state_file.read_text(encoding="utf-8")
            self._state = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise StateFileError(
                f"State file contains invalid JSON: {self._state_file}. "
                f"Parse error: {exc}"
            ) from exc

        return self._state

    def save(self) -> None:
        """Persist self._state to state.json using atomic write.

        Writes to a temporary file in the same directory first, then
        uses os.replace() to atomically rename it to the final path.
        This prevents corruption if the process crashes mid-write.
        """
        agents_dir = self._state_file.parent
        agents_dir.mkdir(parents=True, exist_ok=True)

        # Write to a temp file in the same directory to ensure
        # os.replace() is atomic (same filesystem).
        fd, tmp_path = tempfile.mkstemp(
            dir=str(agents_dir),
            prefix=".state_tmp_",
            suffix=".json",
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(self._state, f, indent=2, ensure_ascii=False)
            os.replace(tmp_path, str(self._state_file))
        except BaseException:
            # Clean up temp file on failure; ignore errors if it's
            # already gone (e.g., os.replace succeeded partially).
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            raise

    def get_phase_status(self, phase: str) -> str:
        """Return the status string for the given phase.

        Args:
            phase: One of the Phase enum values (e.g., "storyline").

        Returns:
            Status string (e.g., "not_started", "complete").

        Raises:
            KeyError: If the phase is not found in state.
        """
        return self._state["phases"][phase]["status"]

    def set_phase_status(self, phase: str, status: str, **metadata: Any) -> None:
        """Update a phase's status and optional metadata fields.

        Automatically sets ``completed_at`` to the current UTC timestamp
        when status is "complete".

        Args:
            phase: One of the Phase enum values.
            status: One of the PhaseStatus enum values.
            **metadata: Additional key-value pairs to merge into the
                phase dict (e.g., papers_found=5, skip_reason="...").
        """
        phase_data = self._state["phases"][phase]
        phase_data["status"] = status

        if status == PhaseStatus.COMPLETE:
            phase_data["completed_at"] = datetime.now(timezone.utc).isoformat()

        phase_data.update(metadata)

        # TODO: EventLogger integration (Task 5)
        # self._log_event("phase_status_changed", phase=phase, status=status)

    def get_current_phase(self) -> str:
        """Return the current_phase value from state."""
        return self._state["current_phase"]

    def skip_phase(self, phase: str, reason: str) -> None:
        """Mark a phase as skipped with a reason.

        Args:
            phase: One of the Phase enum values.
            reason: Human-readable explanation for skipping.
        """
        self.set_phase_status(phase, PhaseStatus.SKIPPED, skip_reason=reason)

    def rollback_phase(self, phase: str) -> None:
        """Reset a phase back to not_started and clear completed_at.

        Args:
            phase: One of the Phase enum values.
        """
        phase_data = self._state["phases"][phase]
        phase_data["status"] = PhaseStatus.NOT_STARTED
        phase_data.pop("completed_at", None)

    def check_dependencies(self, phase: str) -> list[str]:
        """Return dependency phase names that are NOT complete or skipped.

        Args:
            phase: One of the Phase enum values.

        Returns:
            List of phase name strings whose dependencies are unmet.
        """
        phase_enum = Phase(phase)
        deps = PHASE_DEPENDENCIES.get(phase_enum, [])
        unmet: list[str] = []
        for dep in deps:
            dep_status = self._state["phases"][dep.value]["status"]
            if dep_status not in (PhaseStatus.COMPLETE, PhaseStatus.SKIPPED):
                unmet.append(dep.value)
        return unmet


def _deep_copy_default_state() -> dict[str, Any]:
    """Return a deep copy of DEFAULT_STATE using JSON round-trip.

    This avoids importing copy.deepcopy and guarantees all nested
    structures are independent copies.
    """
    return json.loads(json.dumps(DEFAULT_STATE))
