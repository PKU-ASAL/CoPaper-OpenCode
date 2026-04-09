"""Weekly report and diff report generation."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from vibepaper.constants import PHASE_ORDER
from vibepaper.eventlog import EventLogger
from vibepaper.git_ops import GitManager
from vibepaper.identity import IdentityManager
from vibepaper.state import StateManager


def generate_weekly_report(
    repo_path: str = ".",
    since_date: str | None = None,
    identity_manager: IdentityManager | None = None,
) -> str:
    """Generate a Markdown weekly report.

    Args:
        repo_path: Path to the project root.
        since_date: ISO date string (e.g. "2026-04-01"). If None, last 7 days.
        identity_manager: Optional IdentityManager for operator grouping.

    Returns:
        Markdown-formatted report string.
    """
    sm = StateManager(repo_path)
    state = sm.load()
    sm.recompute_current_phase()
    sm.save()
    state = sm._state

    log_path = str(sm.project_root / ".agents" / "events.jsonl")
    el = EventLogger(log_path)

    # Build report
    lines: list[str] = []
    lines.append(f"# Weekly Report — {state['project']['name']}")
    lines.append("")
    lines.append(f"Generated: {datetime.now().isoformat()[:19]}")
    lines.append(f"Current Phase: {state['current_phase']}")
    if since_date:
        lines.append(f"Period: since {since_date}")
    lines.append("")

    # Phase progress
    lines.append("## Phase Progress")
    lines.append("")
    for phase in PHASE_ORDER:
        pname = phase.value
        pstatus = state["phases"][pname]["status"]
        lines.append(f"- **{pname}**: {pstatus}")
    lines.append("")

    # Git commit summary grouped by author
    lines.append("## Commit Summary")
    lines.append("")
    try:
        gm = GitManager(repo_path)
        commits_by_author: dict[str, list[dict[str, Any]]] = {}
        for phase in PHASE_ORDER:
            for c in gm.get_phase_commits(phase.value):
                # Filter by since_date if provided
                if since_date and c["date"][:10] < since_date:
                    continue
                author = c["author"]
                commits_by_author.setdefault(author, []).append(c)

        if commits_by_author:
            for author, commits in commits_by_author.items():
                lines.append(f"### {author}")
                lines.append("")
                for c in commits:
                    msg_first_line = c["message"].splitlines()[0]
                    lines.append(
                        f"- `{c['sha'][:8]}` {msg_first_line} ({c['date'][:10]})"
                    )
                lines.append("")
        else:
            lines.append("No commits found for the period.")
            lines.append("")
    except Exception:
        lines.append("Git repository not available.")
        lines.append("")

    # Event log statistics
    lines.append("## Event Log Statistics")
    lines.append("")
    entries = el.query(since=since_date)
    if entries:
        action_counts: dict[str, int] = {}
        for entry in entries:
            action = entry.get("action", "unknown")
            action_counts[action] = action_counts.get(action, 0) + 1
        for action, count in sorted(action_counts.items()):
            lines.append(f"- {action}: {count}")
    else:
        lines.append("No events found for the period.")
    lines.append("")

    return "\n".join(lines)


def generate_diff_report(repo_path: str, phase_a: str, phase_b: str) -> str:
    """Generate a diff report between two phases.

    Args:
        repo_path: Path to the project root.
        phase_a: Earlier phase label.
        phase_b: Later phase label.

    Returns:
        Diff string or message if no diff available.
    """
    gm = GitManager(repo_path)
    diff = gm.diff_between_phases(phase_a, phase_b)

    if not diff:
        return f"No diff available between '{phase_a}' and '{phase_b}' (one or both phases have no commits)."

    lines: list[str] = []
    lines.append(f"# Diff: {phase_a} → {phase_b}")
    lines.append("")
    lines.append("```diff")
    lines.append(diff)
    lines.append("```")
    return "\n".join(lines)
