"""CLI entry point for the `vibe` command."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import click

import vibepaper
from vibepaper.constants import PHASE_ORDER, PhaseStatus
from vibepaper.eventlog import EventLogger
from vibepaper.scaffold import scaffold_project
from vibepaper.state import StateFileError, StateManager

_STATUS_DISPLAY = {
    PhaseStatus.COMPLETE: "[done]",
    PhaseStatus.IN_PROGRESS: "[>>]",
    PhaseStatus.SKIPPED: "[skip]",
    PhaseStatus.NOT_STARTED: "[    ]",
}


@click.group()
@click.option(
    "--root",
    default=".",
    help="Project root directory.",
    show_default=True,
)
@click.version_option(version=vibepaper.__version__)
@click.pass_context
def main(ctx: click.Context, root: str) -> None:
    """VibePaper - AI-assisted academic writing framework."""
    ctx.ensure_object(dict)
    ctx.obj["root"] = root


@main.command()
@click.option("--name", prompt="Project name", help="Name of the research project")
@click.option(
    "--domain",
    prompt="Research domain",
    help="Research domain (e.g., 'software engineering')",
)
@click.pass_context
def init(ctx: click.Context, name: str, domain: str) -> None:
    """Initialise a new VibePaper project."""
    root = ctx.obj["root"]
    sm = StateManager(root)

    if sm._state_file.exists():
        click.echo(f"Warning: Project already exists at {sm._state_file}")
        if not click.confirm("Reinitialise?"):
            click.echo("Aborted.")
            return

    sm.init_project(name, domain)
    scaffold_project(root)

    log_path = str(sm.project_root / ".agents" / "events.jsonl")
    el = EventLogger(log_path)
    el.log("init_project", "user", "success", phase="storyline")

    click.echo(f"Project '{name}' ({domain}) initialised at {sm._state_file}")
    click.echo("Scaffolded: .agents/skills/, storyline.md, writingrules.md, AGENTS.md")


@main.command()
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
@click.pass_context
def status(ctx: click.Context, as_json: bool) -> None:
    """Show current project status."""
    root = ctx.obj["root"]
    sm = StateManager(root)

    try:
        state = sm.load()
    except StateFileError as exc:
        click.echo(f"Error: {exc}", err=True)
        click.echo("No project found. Run 'vibe init' first.", err=True)
        sys.exit(1)

    if as_json:
        click.echo(json.dumps(state, indent=2, ensure_ascii=False))
        return

    project = state["project"]
    current_phase = state["current_phase"]

    click.echo(f"Project: {project['name']} ({project['domain']})")
    click.echo(f"Created: {project['created_at']}")
    click.echo(f"Current Phase: {current_phase}")
    click.echo()
    click.echo(f"{'Phase':<20}{'Status'}")
    click.echo("-" * 28)

    for phase in PHASE_ORDER:
        phase_name = phase.value
        phase_status_str = state["phases"][phase_name]["status"]
        phase_status = PhaseStatus(phase_status_str)
        marker = _STATUS_DISPLAY.get(phase_status, "[?]")
        click.echo(f"{phase_name:<20}{marker} {phase_status_str}")


@main.command()
@click.option(
    "--phase", default=None, help="Phase name (auto-detected from state if omitted)"
)
@click.option("--message", "-m", required=True, help="Commit message")
@click.option("--force", is_flag=True, help="Force commit even with no staged changes")
@click.pass_context
def commit(ctx, phase, message, force):
    """Create a phase-aware git commit."""
    root = ctx.obj["root"]
    sm = StateManager(root)

    if phase is None:
        try:
            state = sm.load()
            phase = state["current_phase"]
        except StateFileError:
            click.echo("Error: No project found. Run 'vibe init' first.", err=True)
            sys.exit(1)

    log_path = str(sm.project_root / ".agents" / "events.jsonl")
    el = EventLogger(log_path)

    from vibepaper.git_ops import GitManager

    gm = GitManager(root, event_logger=el)

    try:
        sha = gm.commit_phase(phase, message, force=force)
        click.echo(f"Committed [{phase}] {message}")
        click.echo(f"SHA: {sha[:8]}")
    except ValueError as exc:
        click.echo(f"Error: {exc}", err=True)
        sys.exit(1)
    except Exception as exc:
        click.echo(f"Error: {exc}", err=True)
        sys.exit(1)


@main.command()
@click.argument("phase")
@click.option("--yes", "-y", is_flag=True, help="Skip confirmation prompt")
@click.pass_context
def rollback(ctx, phase, yes):
    """Rollback to the last commit of a phase."""
    root = ctx.obj["root"]
    sm = StateManager(root)

    log_path = str(sm.project_root / ".agents" / "events.jsonl")
    el = EventLogger(log_path)

    from vibepaper.git_ops import GitManager

    gm = GitManager(root, event_logger=el)

    commits = gm.get_phase_commits(phase)
    if not commits:
        click.echo(f"No commits found for phase '{phase}'.", err=True)
        sys.exit(1)

    target = commits[0]
    click.echo(
        f"Will rollback to: {target['sha'][:8]} - {target['message'].splitlines()[0]}"
    )

    if not yes and not click.confirm("Proceed?"):
        click.echo("Aborted.")
        return

    sha = gm.rollback_to_phase(phase)
    if sha is None:
        click.echo(f"Error: Could not find commit for phase '{phase}'.", err=True)
        sys.exit(1)

    try:
        state = sm.load()
    except StateFileError:
        state = None

    if state is not None and phase in state.get("phases", {}):
        sm.rollback_phase(phase)
        sm.save()

    click.echo(f"Rolled back to [{phase}] at {sha[:8]}")


@main.command(name="log")
@click.option("--phase", default=None, help="Filter by phase")
@click.option("--operator", default=None, help="Filter by operator")
@click.option("--last", "last_n", default=None, type=int, help="Show last N entries")
@click.option("--since", default=None, help="Show entries since date (ISO format)")
@click.pass_context
def log_cmd(ctx, phase, operator, last_n, since):
    """Query the operation log."""
    root = ctx.obj["root"]
    sm = StateManager(root)

    log_path = str(sm.project_root / ".agents" / "events.jsonl")
    el = EventLogger(log_path)

    entries = el.query(phase=phase, operator=operator, last_n=last_n, since=since)

    if not entries:
        click.echo("No log entries found.")
        return

    click.echo(f"{'Time':<22}{'Operator':<10}{'Phase':<14}{'Action':<20}{'Result'}")
    click.echo("-" * 74)

    for entry in entries:
        ts = entry.get("timestamp", "")[:19]  # trim to seconds
        op = entry.get("operator", "")
        ph = entry.get("phase", entry.get("metadata", {}).get("phase", ""))
        action = entry.get("action", "")
        result = entry.get("result", "")
        click.echo(f"{ts:<22}{op:<10}{ph:<14}{action:<20}{result}")


@main.command()
@click.argument("phase")
@click.option("--reason", "-r", default="", help="Reason for skipping")
@click.pass_context
def skip(ctx, phase, reason):
    """Skip a phase with an optional reason."""
    root = ctx.obj["root"]
    sm = StateManager(root)

    try:
        sm.load()
    except StateFileError:
        click.echo("Error: No project found. Run 'vibe init' first.", err=True)
        sys.exit(1)

    sm.skip_phase(phase, reason=reason)
    sm.save()

    log_path = str(sm.project_root / ".agents" / "events.jsonl")
    el = EventLogger(log_path)
    el.log("skip_phase", "user", "success", phase=phase, reason=reason)

    click.echo(f"Phase '{phase}' skipped.")
    if reason:
        click.echo(f"Reason: {reason}")


@main.command()
@click.option(
    "--since",
    default=None,
    help="Show entries since date (ISO format, e.g. 2026-04-01)",
)
@click.option(
    "--output", "-o", default=None, help="Write report to file instead of stdout"
)
@click.pass_context
def report(ctx: click.Context, since: str | None, output: str | None) -> None:
    """Generate a weekly progress report."""
    root = ctx.obj["root"]

    from vibepaper.report import generate_weekly_report

    try:
        md = generate_weekly_report(repo_path=root, since_date=since)
    except Exception as exc:
        click.echo(f"Error generating report: {exc}", err=True)
        sys.exit(1)

    if output:
        Path(output).write_text(md, encoding="utf-8")
        click.echo(f"Report written to {output}")
    else:
        click.echo(md)


@main.command(name="diff")
@click.argument("phase_a")
@click.argument("phase_b")
@click.pass_context
def diff_cmd(ctx: click.Context, phase_a: str, phase_b: str) -> None:
    """Show diff between two phases."""
    root = ctx.obj["root"]

    from vibepaper.report import generate_diff_report

    try:
        result = generate_diff_report(root, phase_a, phase_b)
    except Exception as exc:
        click.echo(f"Error: {exc}", err=True)
        sys.exit(1)

    click.echo(result)


if __name__ == "__main__":
    main()
