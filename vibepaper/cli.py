"""CLI entry point for the `vibe` command."""

from __future__ import annotations

import json
import sys

import click

import vibepaper
from vibepaper.constants import PHASE_ORDER, PhaseStatus
from vibepaper.eventlog import EventLogger
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

    log_path = str(sm.project_root / ".agents" / "events.jsonl")
    el = EventLogger(log_path)
    el.log("init_project", "user", "success", phase="storyline")

    click.echo(f"Project '{name}' ({domain}) initialised at {sm._state_file}")


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


if __name__ == "__main__":
    main()
