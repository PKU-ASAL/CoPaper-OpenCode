"""Event log (.agents/events.jsonl) append and query.

EventLogger provides append-only JSON Lines logging for the VibePaper
pipeline. Each event is a single JSON object on one line, enabling
concurrent-safe appends and simple line-by-line querying.
"""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_MAX_LOG_SIZE = 10 * 1024 * 1024  # 10 MB rotation threshold

_VALID_OPERATORS = {"user", "ai", "system"}


class EventLogger:
    """Append-only JSON Lines event logger with query and rotation support.

    Each call to ``log()`` appends one JSON object (one line) to the log
    file.  The file is rotated when it exceeds 10 MB — the current file
    is renamed to ``<basename>.1`` and a fresh file is started.

    Thread safety is provided by a ``threading.Lock`` that serialises
    write (append + rotation) operations.
    """

    def __init__(self, log_path: str = ".agents/events.jsonl") -> None:
        self.log_path = Path(log_path)
        self._lock = threading.Lock()

    def log(
        self,
        action: str,
        operator: str,
        result: str,
        **metadata: Any,
    ) -> None:
        """Append one event to the log file.

        Args:
            action: Short verb describing what happened
                (e.g. ``"search_papers"``).
            operator: Who initiated the action — must be one of
                ``"user"``, ``"ai"``, ``"system"``.
            result: Outcome of the action — e.g. ``"success"`` or
                ``"failure"``.
            **metadata: Arbitrary key-value pairs.  ``phase`` and
                ``session_id`` are promoted to top-level fields if
                provided; everything else is nested under a
                ``metadata`` key.

        Raises:
            ValueError: If *operator* is not one of the valid values.
        """
        if operator not in _VALID_OPERATORS:
            raise ValueError(
                f"Invalid operator '{operator}'. "
                f"Must be one of: {', '.join(sorted(_VALID_OPERATORS))}"
            )

        phase = metadata.pop("phase", None)
        session_id = metadata.pop("session_id", None)

        event: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "operator": operator,
            "phase": phase,
            "action": action,
            "result": result,
        }
        if session_id is not None:
            event["session_id"] = session_id
        if metadata:
            event["metadata"] = metadata

        line = json.dumps(event, ensure_ascii=False, separators=(",", ":"))

        with self._lock:
            self._ensure_parent_dir()
            self._rotate_if_needed()
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(line + "\n")

    def query(
        self,
        phase: str | None = None,
        operator: str | None = None,
        last_n: int | None = None,
        since: str | None = None,
    ) -> list[dict[str, Any]]:
        """Read and filter events from the log file.

        Args:
            phase: If provided, only return events whose ``phase``
                field matches this value.
            operator: If provided, only return events whose
                ``operator`` field matches this value.
            last_n: If provided, return only the last *N* events
                (after other filters are applied).
            since: If provided, only return events whose
                ``timestamp`` is >= this ISO-format string.

        Returns:
            List of event dicts matching all specified filters.
        """
        events = self._read_all()

        if phase is not None:
            events = [e for e in events if e.get("phase") == phase]
        if operator is not None:
            events = [e for e in events if e.get("operator") == operator]
        if since is not None:
            events = [e for e in events if e.get("timestamp", "") >= since]
        if last_n is not None:
            events = events[-last_n:]

        return events

    def export(self, format: str = "jsonl") -> str:
        """Read the entire log and return as a string.

        Args:
            format: Output format.  Currently only ``"jsonl"`` is
                supported.

        Returns:
            The raw JSON Lines content of the log file.

        Raises:
            ValueError: If *format* is not ``"jsonl"``.
        """
        if format != "jsonl":
            raise ValueError(
                f"Unsupported export format: '{format}'. Only 'jsonl' is supported."
            )
        if not self.log_path.exists():
            return ""
        return self.log_path.read_text(encoding="utf-8")

    def _ensure_parent_dir(self) -> None:
        """Create parent directories for the log file if they don't exist."""
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def _rotate_if_needed(self) -> None:
        """Rotate the log file if it exceeds the size limit.

        The current file is renamed to ``<basename>.1`` (overwriting any
        previous backup) and a fresh file will be started on the next
        write.
        """
        if not self.log_path.exists():
            return
        try:
            size = self.log_path.stat().st_size
        except OSError:
            return
        if size >= _MAX_LOG_SIZE:
            backup = self.log_path.with_suffix(self.log_path.suffix + ".1")
            self.log_path.replace(backup)

    def _read_all(self) -> list[dict[str, Any]]:
        """Read every line from the log file and parse as JSON.

        Malformed lines are silently skipped.
        """
        if not self.log_path.exists():
            return []

        events: list[dict[str, Any]] = []
        with open(self.log_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        return events
