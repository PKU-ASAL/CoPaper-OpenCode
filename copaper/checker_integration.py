"""Integration with the 7 advisor checker skills.

Tracks checker run results in state.json and parses checker output.
"""

from __future__ import annotations

import json
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from copaper.eventlog import EventLogger


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

CHECKER_ALIASES = {
    name: name for name in CHECKER_NAMES
} | {
    name.removesuffix("-checker"): name for name in CHECKER_NAMES
}


@dataclass(frozen=True)
class CheckerHarnessResult:
    """Result collected for one checker run."""

    checker: str
    paper_path: str
    issues: dict[str, int]
    issue_list: list[dict[str, Any]]

    @property
    def total(self) -> int:
        """Return the total number of unresolved issues."""
        return sum(self.issues.values())

    def as_dict(self) -> dict[str, Any]:
        """Return a JSON-serializable representation."""
        return {
            "checker": self.checker,
            "paper_path": self.paper_path,
            "issues": self.issues,
            "issue_list": self.issue_list,
            "total": self.total,
        }


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

    def record_checker_result(self, result: CheckerHarnessResult) -> None:
        """Record a full checker harness result.

        This keeps the legacy severity-count format while adding an
        ``issue_list`` that downstream skills can resolve item by item.
        """
        if result.checker not in CHECKER_NAMES:
            raise ValueError(
                f"Unknown checker: {result.checker}. Must be one of {CHECKER_NAMES}"
            )

        state = self._load_state()
        if "checkers" not in state:
            state["checkers"] = {}

        existing = state["checkers"].get(result.checker, {})
        state["checkers"][result.checker] = {
            "last_run": datetime.now(timezone.utc).isoformat(),
            "issues": result.issues,
            "issue_list": result.issue_list,
            "resolved_ids": existing.get("resolved_ids", []),
            "source": {
                "type": "paper_ai_comments",
                "paper_path": result.paper_path,
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
        checker_match = re.search(
            r"(?:checker|检查器)\s*[:：]\s*([a-zA-Z0-9_-]+(?:-checker)?)",
            block,
            re.IGNORECASE,
        )
        checker = (
            normalize_checker_name(checker_match.group(1))
            if checker_match is not None
            and checker_match.group(1).strip().lower().replace("_", "-")
            in CHECKER_ALIASES
            else None
        )
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
                    "checker": checker,
                    "raw_block": block.strip(),
                }
            )
    return issues


def normalize_checker_name(name: str) -> str:
    """Return the canonical checker name for a full name or short alias."""
    normalized = name.strip().lower().replace("_", "-")
    if normalized in CHECKER_ALIASES:
        return CHECKER_ALIASES[normalized]
    raise ValueError(f"Unknown checker: {name}. Must be one of {CHECKER_NAMES}")


def _selected_checkers(checkers: list[str] | None) -> list[str]:
    if checkers is None:
        return CHECKER_NAMES.copy()
    return [normalize_checker_name(name) for name in checkers]


def _severity_counts(issues: list[dict[str, Any]]) -> dict[str, int]:
    counts = {"critical": 0, "major": 0, "minor": 0}
    for issue in issues:
        severity = issue.get("severity")
        if severity in counts:
            counts[severity] += 1
    return counts


def _issue_mentions_checker(issue: dict[str, Any], checker: str) -> bool:
    explicit_checker = issue.get("checker")
    if explicit_checker is not None:
        return explicit_checker == checker

    raw = str(issue.get("raw_block", "")).lower()
    short = checker.removesuffix("-checker")
    return bool(
        re.search(rf"(?:checker|检查器)\s*[:：]\s*{re.escape(checker)}\b", raw)
        or re.search(rf"(?:checker|检查器)\s*[:：]\s*{re.escape(short)}\b", raw)
    )


def _stable_issue_id(checker: str, issue: dict[str, Any], index: int) -> str:
    key = f"{checker}:{issue.get('severity', '')}:{issue.get('message', '')}:{index}"
    return uuid.uuid5(uuid.NAMESPACE_URL, key).hex[:8]


class CheckerHarness:
    """Collect checker issues from a CoPaper paper into project state.

    The harness does not execute AI skills itself. It consumes the
    standardized ``<!-- AI Comments: ... -->`` blocks that checker skills
    insert into ``paper.md`` and records normalized results in
    ``.agents/state.json``.
    """

    def __init__(
        self,
        project_root: str = ".",
        paper_path: str = "paper.md",
        event_logger: EventLogger | None = None,
    ) -> None:
        self.project_root = Path(project_root)
        self.paper_path = Path(paper_path)
        if not self.paper_path.is_absolute():
            self.paper_path = self.project_root / self.paper_path
        self.tracker = CheckerTracker(str(self.project_root))
        self.event_logger = event_logger

    def collect(
        self,
        checkers: list[str] | None = None,
        *,
        write_state: bool = True,
    ) -> dict[str, CheckerHarnessResult]:
        """Collect checker results from the configured paper.

        Args:
            checkers: Optional full checker names or short aliases.
            write_state: Persist results to ``.agents/state.json`` when true.

        Returns:
            Mapping from checker name to harness result.
        """
        if not self.paper_path.exists():
            raise FileNotFoundError(f"paper not found: {self.paper_path}")

        selected = _selected_checkers(checkers)
        paper_text = self.paper_path.read_text(encoding="utf-8")
        all_issues = parse_checker_output(paper_text)
        has_checker_markers = any(
            any(_issue_mentions_checker(issue, checker) for checker in CHECKER_NAMES)
            for issue in all_issues
        )

        results: dict[str, CheckerHarnessResult] = {}
        for checker in selected:
            if has_checker_markers:
                issues = [
                    issue
                    for issue in all_issues
                    if _issue_mentions_checker(issue, checker)
                ]
            else:
                issues = all_issues

            result = CheckerHarnessResult(
                checker=checker,
                paper_path=str(self.paper_path.relative_to(self.project_root))
                if self.paper_path.is_relative_to(self.project_root)
                else str(self.paper_path),
                issues=_severity_counts(issues),
                issue_list=[
                    {
                        "id": _stable_issue_id(checker, issue, index),
                        "severity": issue["severity"],
                        "message": issue["message"],
                    }
                    for index, issue in enumerate(issues)
                ],
            )
            results[checker] = result

            if write_state:
                self.tracker.record_checker_result(result)
                if self.event_logger is not None:
                    self.event_logger.log(
                        "collect_checker_result",
                        "ai",
                        "success",
                        phase="writing",
                        checker=checker,
                        paper_path=result.paper_path,
                        total_issues=result.total,
                    )

        return results


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


def run_checkers(
    paper_path: str = "paper.md",
    checkers: list[str] | None = None,
    *,
    project_root: str = ".",
    write_state: bool = False,
) -> None:
    """Compatibility entry point for checker collection.

    Historically this function was a no-op and returned ``None``. It now
    drives the deterministic harness when possible, while preserving the
    ``None`` return value expected by older callers.
    """
    harness = CheckerHarness(project_root=project_root, paper_path=paper_path)
    harness.collect(checkers=checkers, write_state=write_state)
    return None
