"""Integration with the 7 advisor checker skills.

Tracks checker run results in state.json and parses checker output.
"""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


# The 7 checker names
CHECKER_NAMES = [
    "problem-checker",
    "novelty-checker",
    "technical-depth-checker",
    "logic-checker",
    "clarity-checker",
    "evaluation-protocol-checker",
    "data-checker",
]


class CheckerTracker:
    """Tracks 7-checker run results in state.json."""

    def __init__(self, project_root: str) -> None:
        self.project_root = Path(project_root)
        self.state_path = self.project_root / ".agents" / "state.json"

    def _load_state(self) -> dict[str, Any]:
        """Load state.json."""
        if not self.state_path.exists():
            raise FileNotFoundError(f"state.json not found: {self.state_path}")
        return json.loads(self.state_path.read_text(encoding="utf-8"))

    def _save_state(self, state: dict[str, Any]) -> None:
        """Save state.json atomically."""
        tmp = self.state_path.with_suffix(".tmp")
        tmp.write_text(
            json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        tmp.replace(self.state_path)

    def record_checker_run(self, checker_name: str, results: dict[str, int]) -> None:
        """Record a checker run result.

        Args:
            checker_name: One of CHECKER_NAMES
            results: Dict with severity counts, e.g. {"critical": 0, "major": 2, "minor": 1}
        """
        if checker_name not in CHECKER_NAMES:
            raise ValueError(
                f"Unknown checker: {checker_name}. Must be one of {CHECKER_NAMES}"
            )

        state = self._load_state()
        if "checkers" not in state:
            state["checkers"] = {}

        state["checkers"][checker_name] = {
            "last_run": datetime.now(timezone.utc).isoformat(),
            "issues": {
                "critical": results.get("critical", 0),
                "major": results.get("major", 0),
                "minor": results.get("minor", 0),
            },
        }
        self._save_state(state)

    def get_checker_status(self) -> dict[str, Any]:
        """Return all checkers' latest status."""
        state = self._load_state()
        return state.get("checkers", {})

    def get_unresolved_issues(
        self, severity: str | None = None
    ) -> list[dict[str, Any]]:
        """Return unresolved issues across all checkers.

        Args:
            severity: Filter by severity ("critical", "major", "minor") or None for all.
        """
        state = self._load_state()
        checkers = state.get("checkers", {})
        issues: list[dict[str, Any]] = []

        for checker_name, data in checkers.items():
            resolved = set(data.get("resolved_ids", []))
            for issue in data.get("issue_list", []):
                if issue["id"] in resolved:
                    continue
                if severity and issue.get("severity") != severity:
                    continue
                issues.append({**issue, "checker": checker_name})
        return issues

    def mark_issue_resolved(self, issue_id: str) -> bool:
        """Mark an issue as resolved. Returns True if found and marked."""
        state = self._load_state()
        checkers = state.get("checkers", {})

        for data in checkers.values():
            for issue in data.get("issue_list", []):
                if issue["id"] == issue_id:
                    if "resolved_ids" not in data:
                        data["resolved_ids"] = []
                    if issue_id not in data["resolved_ids"]:
                        data["resolved_ids"].append(issue_id)
                    self._save_state(state)
                    return True
        return False


def parse_checker_output(text: str) -> list[dict[str, Any]]:
    """Parse checker HTML comment output to extract issues.

    Parses format like:
    <!-- AI Comments:
    [CRITICAL] Problem statement is vague
    [MAJOR] Missing comparison with baseline
    [MINOR] Typo in section 3.2
    -->

    Returns list of issue dicts with id, severity, and message.
    """
    issues: list[dict[str, Any]] = []
    # Find all AI Comments blocks
    pattern = r"<!--\s*AI Comments:\s*(.*?)-->"
    for match in re.finditer(pattern, text, re.DOTALL):
        block = match.group(1)
        # Parse individual issues
        issue_pattern = r"\[(CRITICAL|MAJOR|MINOR)\]\s*(.+)"
        for issue_match in re.finditer(issue_pattern, block, re.IGNORECASE):
            severity = issue_match.group(1).lower()
            message = issue_match.group(2).strip()
            issues.append(
                {
                    "id": uuid.uuid4().hex[:8],
                    "severity": severity,
                    "message": message,
                }
            )
    return issues


def format_checker_results(results: dict[str, Any]) -> str:
    """Format checker status into a human-readable summary."""
    if not results:
        return "No checker results recorded yet."

    lines = ["# Checker Status Summary", ""]
    lines.append("| Checker | Last Run | Critical | Major | Minor |")
    lines.append("|---------|----------|----------|-------|-------|")

    for name in CHECKER_NAMES:
        if name in results:
            data = results[name]
            issues = data.get("issues", {})
            last_run = data.get("last_run", "never")[:19]  # trim to seconds
            lines.append(
                f"| {name} | {last_run} | {issues.get('critical', 0)} | {issues.get('major', 0)} | {issues.get('minor', 0)} |"
            )
        else:
            lines.append(f"| {name} | not run | - | - | - |")

    return "\n".join(lines)


# Legacy stub — kept for backward compatibility with test_checker_main.py
def run_checkers(
    paper_path: str = "paper.md", checkers: list[str] | None = None
) -> None:
    """Run selected checker skills and return results dict.

    Not yet implemented — placeholder for future integration.
    """
    pass
