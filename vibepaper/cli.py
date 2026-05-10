"""CLI entry point for the `vibe` command."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

import click

import vibepaper
from vibepaper.constants import PHASE_ORDER, PhaseStatus
from vibepaper.eventlog import EventLogger
from vibepaper.literature import LiteratureCatalog, LiteratureCatalogError
from vibepaper.scaffold import scaffold_project
from vibepaper.state import StateFileError, StateManager

_STATUS_DISPLAY = {
    PhaseStatus.COMPLETE: "[done]",
    PhaseStatus.IN_PROGRESS: "[>>]",
    PhaseStatus.SKIPPED: "[skip]",
    PhaseStatus.NOT_STARTED: "[    ]",
}


def _load_env_file(env_path: Path) -> int:
    """Best-effort KEY=VALUE loader for ``.env``. Returns count of vars set.

    Skips silently if the file is missing. Existing environment variables
    take precedence — a value already in ``os.environ`` is never overwritten.
    """
    if not env_path.exists() or not env_path.is_file():
        return 0
    count = 0
    try:
        text = env_path.read_text(encoding="utf-8")
    except OSError:
        return 0
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.lower().startswith("export "):
            line = line[len("export ") :].lstrip()
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if not key or key in os.environ:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        os.environ[key] = value
        count += 1
    return count


def _load_state_manager_or_exit(root: str) -> StateManager:
    sm = StateManager(root)
    try:
        sm.load()
    except StateFileError:
        click.echo("Error: No project found. Run 'vibe init' first.", err=True)
        sys.exit(1)
    return sm


def _sync_literature_phase_state(
    sm: StateManager, catalog: LiteratureCatalog
) -> dict[str, Any]:
    summary = catalog.get_status_summary()
    phase_data = sm._state["phases"]["literature"]
    counts = summary["counts"]

    phase_data["catalog_path"] = summary["catalog_path"]
    phase_data["papers_found"] = counts["papers_found"]
    phase_data["papers_downloaded"] = counts["papers_downloaded"]
    phase_data["download_failures"] = counts["download_failures"]
    phase_data["summaries_done"] = counts["summaries_done"]
    phase_data["cross_index_built"] = counts["cross_index_built"]

    if phase_data["status"] == PhaseStatus.NOT_STARTED and counts["papers_found"] > 0:
        phase_data["status"] = PhaseStatus.IN_PROGRESS.value

    sm.recompute_current_phase()
    sm.save()
    return summary


def _load_relatedwork_records(input_path: Path) -> list[dict[str, Any]]:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return [record for record in payload if isinstance(record, dict)]
    if isinstance(payload, dict):
        papers = payload.get("papers")
        if isinstance(papers, list):
            return [record for record in papers if isinstance(record, dict)]
    raise ValueError(
        "Expected a JSON array of papers or an object with a 'papers' array."
    )


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

    root_path = Path(root)
    for candidate in (root_path / ".env", Path.cwd() / ".env"):
        if _load_env_file(candidate):
            break


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
    click.echo(
        "Scaffolded: .agents/skills/, storyline.md, paper.md, writingrules.md, AGENTS.md"
    )


@main.command()
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
@click.pass_context
def status(ctx: click.Context, as_json: bool) -> None:
    """Show current project status."""
    root = ctx.obj["root"]
    sm = StateManager(root)

    try:
        state = sm.load()
        sm.recompute_current_phase()
        sm.save()
        state = sm._state
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


@main.group(name="relatedwork")
@click.pass_context
def relatedwork_group(ctx: click.Context) -> None:
    """Manage related-work metadata, BibTeX, PDFs, and indices."""


@relatedwork_group.command(name="status")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
@click.pass_context
def relatedwork_status(ctx: click.Context, as_json: bool) -> None:
    """Show related-work catalog status."""
    root = ctx.obj["root"]
    sm = _load_state_manager_or_exit(root)
    catalog = LiteratureCatalog(root)
    catalog.load()
    summary = _sync_literature_phase_state(sm, catalog)

    if as_json:
        click.echo(json.dumps(summary, indent=2, ensure_ascii=False))
        return

    counts = summary["counts"]
    click.echo(f"Catalog: {summary['catalog_path']}")
    click.echo(f"BibTeX: {summary['bib_path']}")
    click.echo(
        "Papers: "
        f"{counts['papers_found']} total, "
        f"{counts['papers_downloaded']} downloaded, "
        f"{counts['download_failures']} failed, "
        f"{counts['summaries_done']} summarized"
    )

    papers = summary["papers"]
    if not papers:
        click.echo("No related-work metadata recorded yet.")
        return

    click.echo()
    click.echo(f"{'ID':<24}{'PDF':<12}{'Summary':<10}{'Year':<8}Title")
    click.echo("-" * 90)
    for paper in papers:
        year = paper.get("year") or ""
        title = str(paper.get("title") or "")
        click.echo(
            f"{paper['paper_id']:<24}"
            f"{paper.get('download_status', ''):<12}"
            f"{('yes' if paper.get('summary_exists') else 'no'):<10}"
            f"{str(year):<8}"
            f"{title}"
        )


@relatedwork_group.command(name="search")
@click.option(
    "--query",
    "queries",
    multiple=True,
    help="Search query (repeatable).",
)
@click.option(
    "--queries-file",
    "queries_file",
    default=None,
    type=click.Path(exists=True, dir_okay=False, path_type=Path),
    help="Text file with one query per line (lines starting with # ignored).",
)
@click.option(
    "--limit",
    default=20,
    show_default=True,
    type=click.IntRange(1, 100),
    help="Results per query (max 100).",
)
@click.option(
    "--year",
    default=None,
    help="Year or year range, e.g. '2023' or '2020-2024'.",
)
@click.option(
    "--fields-of-study",
    "fields_of_study",
    default=None,
    help="Comma-separated S2 fields of study (e.g. 'Computer Science').",
)
@click.option(
    "--venue",
    default=None,
    help="Comma-separated venue filter (e.g. 'CVPR,NeurIPS').",
)
@click.option(
    "--open-access",
    "open_access_only",
    is_flag=True,
    help="Restrict results to papers with a public PDF.",
)
@click.option(
    "--cache-path",
    "cache_path",
    default=None,
    type=click.Path(dir_okay=False, path_type=Path),
    help="Override cache path (default: <root>/relatedwork/search_cache.json).",
)
@click.option(
    "--api-base",
    "api_base",
    default=None,
    help="Override S2 base URL (env: S2_API_BASE). Use to point at a proxy.",
)
@click.pass_context
def relatedwork_search_cmd(
    ctx: click.Context,
    queries: tuple[str, ...],
    queries_file: Path | None,
    limit: int,
    year: str | None,
    fields_of_study: str | None,
    venue: str | None,
    open_access_only: bool,
    cache_path: Path | None,
    api_base: str | None,
) -> None:
    """Search Semantic Scholar and write metadata to relatedwork/search_cache.json."""
    root = ctx.obj["root"]
    sm = _load_state_manager_or_exit(root)

    from vibepaper.relatedwork_search import (
        SemanticScholarError,
        _read_queries_file,
        resolve_api_key,
        resolve_base_url,
        run as run_search,
    )

    collected: list[str] = list(queries)
    if queries_file is not None:
        collected.extend(_read_queries_file(queries_file))

    if not collected:
        click.echo(
            "Error: provide at least one --query or a --queries-file with entries.",
            err=True,
        )
        sys.exit(1)

    api_key = resolve_api_key()
    base_url = resolve_base_url(api_base)

    try:
        outcome = run_search(
            root,
            queries=collected,
            limit=limit,
            year=year,
            fields_of_study=fields_of_study,
            open_access_only=open_access_only,
            venue=venue,
            cache_path=cache_path,
            api_key=api_key,
            base_url=base_url,
        )
    except SemanticScholarError as exc:
        click.echo(f"Error: {exc}", err=True)
        sys.exit(1)
    except ValueError as exc:
        click.echo(f"Error: {exc}", err=True)
        sys.exit(1)

    log_path = str(sm.project_root / ".agents" / "events.jsonl")
    el = EventLogger(log_path)
    el.log(
        "search_relatedwork_metadata",
        "user",
        "success",
        phase="literature",
        queries=outcome.queries,
        papers_found=len(outcome.papers),
        cache_path=outcome.cache_path,
        api_key_used=outcome.api_key_used,
        endpoint=base_url,
    )

    click.echo(
        f"Searched {len(outcome.queries)} queries, "
        f"found {len(outcome.papers)} unique papers."
    )
    click.echo(f"Cache written to {outcome.cache_path}")
    click.echo(f"Endpoint: {base_url}")
    click.echo(
        f"Next: vibe --root {root} relatedwork import --input {outcome.cache_path}"
    )
    if not outcome.api_key_used:
        click.echo(
            "Hint: set S2_API_KEY (or SEMANTIC_SCHOLAR_API_KEY) in .env "
            "for higher rate limits."
        )


@relatedwork_group.command(name="import")
@click.option(
    "--input",
    "input_path",
    required=True,
    type=click.Path(exists=True, dir_okay=False, path_type=Path),
    help="JSON file containing literature metadata.",
)
@click.pass_context
def relatedwork_import(ctx: click.Context, input_path: Path) -> None:
    """Import related-work metadata from a JSON file."""
    root = ctx.obj["root"]
    sm = _load_state_manager_or_exit(root)
    catalog = LiteratureCatalog(root)
    catalog.load()

    try:
        records = _load_relatedwork_records(input_path)
    except (ValueError, json.JSONDecodeError) as exc:
        click.echo(f"Error: {exc}", err=True)
        sys.exit(1)

    result = catalog.import_records(records)
    catalog.save()
    summary = _sync_literature_phase_state(sm, catalog)

    log_path = str(sm.project_root / ".agents" / "events.jsonl")
    el = EventLogger(log_path)
    el.log(
        "import_relatedwork_metadata",
        "user",
        "success",
        phase="literature",
        imported=result["imported"],
        updated=result["updated"],
        input_path=str(input_path),
        papers_found=summary["counts"]["papers_found"],
    )

    click.echo(
        f"Imported related-work metadata from {input_path}. "
        f"Added {result['imported']} papers and updated {result['updated']} papers."
    )


@relatedwork_group.command(name="sync-bib")
@click.pass_context
def relatedwork_sync_bib(ctx: click.Context) -> None:
    """Synchronize literature metadata with relatedwork/paper_list.bib."""
    root = ctx.obj["root"]
    sm = _load_state_manager_or_exit(root)
    catalog = LiteratureCatalog(root)
    catalog.load()
    result = catalog.sync_bib()
    catalog.save()
    _ = _sync_literature_phase_state(sm, catalog)

    log_path = str(sm.project_root / ".agents" / "events.jsonl")
    el = EventLogger(log_path)
    el.log(
        "sync_relatedwork_bib",
        "user",
        "success",
        phase="literature",
        added_from_bib=result["added_from_bib"],
        written_to_bib=result["written_to_bib"],
        total_entries=result["total_entries"],
    )

    click.echo(
        "Synchronized relatedwork/paper_list.bib with literature metadata. "
        f"Added {result['added_from_bib']} metadata entries from BibTeX and wrote {result['written_to_bib']} BibTeX entries."
    )


@relatedwork_group.command(name="download")
@click.option("--paper-id", default=None, help="Download only one paper by ID")
@click.option(
    "--retry-failed",
    is_flag=True,
    help="Retry papers whose previous downloads failed",
)
@click.pass_context
def relatedwork_download_cmd(
    ctx: click.Context,
    paper_id: str | None,
    retry_failed: bool,
) -> None:
    """Download related-work PDFs recorded in literature metadata."""
    root = ctx.obj["root"]
    sm = _load_state_manager_or_exit(root)

    from vibepaper.relatedwork_download import download_papers

    outcome = download_papers(root, paper_id=paper_id, retry_failed=retry_failed)

    catalog = LiteratureCatalog(root)
    catalog.load()
    _ = _sync_literature_phase_state(sm, catalog)

    log_path = str(sm.project_root / ".agents" / "events.jsonl")
    el = EventLogger(log_path)
    el.log(
        "download_relatedwork_pdfs",
        "user",
        "success",
        phase="literature",
        processed=outcome["processed"],
        downloaded=outcome["downloaded"],
        failed=outcome["failed"],
        paper_id=paper_id,
    )

    for result in outcome["results"]:
        if result["success"]:
            click.echo(f"[downloaded] {result['paper_id']} -> {result['path']}")
        else:
            click.echo(f"[failed] {result['paper_id']} -> {result['error']}")

    click.echo(
        f"Processed {outcome['processed']} papers: "
        f"{outcome['downloaded']} downloaded, {outcome['failed']} failed."
    )


@relatedwork_group.command(name="register-summary")
@click.option("--paper-id", required=True, help="Paper ID in literature metadata")
@click.option(
    "--summary-path",
    required=True,
    type=click.Path(exists=True, dir_okay=False, path_type=Path),
    help="Markdown summary path to register",
)
@click.pass_context
def relatedwork_register_summary(
    ctx: click.Context,
    paper_id: str,
    summary_path: Path,
) -> None:
    """Register a completed paper summary in literature metadata."""
    root = ctx.obj["root"]
    sm = _load_state_manager_or_exit(root)
    catalog = LiteratureCatalog(root)
    catalog.load()

    try:
        catalog.register_summary(paper_id, summary_path)
    except LiteratureCatalogError as exc:
        click.echo(f"Error: {exc}", err=True)
        sys.exit(1)

    catalog.save()
    summary = _sync_literature_phase_state(sm, catalog)

    log_path = str(sm.project_root / ".agents" / "events.jsonl")
    el = EventLogger(log_path)
    el.log(
        "register_relatedwork_summary",
        "user",
        "success",
        phase="literature",
        paper_id=paper_id,
        summary_path=str(summary_path),
        summaries_done=summary["counts"]["summaries_done"],
    )

    click.echo(f"Registered summary for '{paper_id}' at {summary_path}.")


@relatedwork_group.command(name="build-index")
@click.pass_context
def relatedwork_build_index(ctx: click.Context) -> None:
    """Build the literature cross-index from relatedwork/papers/*.md."""
    root = ctx.obj["root"]
    sm = _load_state_manager_or_exit(root)
    catalog = LiteratureCatalog(root)
    catalog.load()
    report = catalog.build_cross_index()
    catalog.save()
    summary = _sync_literature_phase_state(sm, catalog)

    log_path = str(sm.project_root / ".agents" / "events.jsonl")
    el = EventLogger(log_path)
    el.log(
        "build_relatedwork_index",
        "user",
        "success",
        phase="literature",
        covered=len(report["covered"]),
        gaps=len(report["gaps"]),
        coverage_ratio=report["coverage_ratio"],
    )

    click.echo("Built .agents/cross_index.json from relatedwork/papers/*.md.")
    click.echo(
        "Coverage: "
        f"{len(report['covered'])} covered, "
        f"{len(report['gaps'])} gaps, ratio={report['coverage_ratio']}"
    )
    click.echo(
        f"State updated: {summary['counts']['summaries_done']} summaries, "
        f"cross_index_built={summary['counts']['cross_index_built']}"
    )


@main.command(name="set-phase")
@click.argument(
    "phase",
    type=click.Choice([phase.value for phase in PHASE_ORDER], case_sensitive=False),
)
@click.option(
    "--status",
    "new_status",
    required=True,
    type=click.Choice([status.value for status in PhaseStatus], case_sensitive=False),
    help="New phase status.",
)
@click.option("--reason", "reason", default="", help="Reason when using skipped status")
@click.pass_context
def set_phase_cmd(ctx: click.Context, phase: str, new_status: str, reason: str) -> None:
    """Set an explicit phase status and recompute current phase."""
    root = ctx.obj["root"]
    sm = StateManager(root)

    try:
        sm.load()
    except StateFileError:
        click.echo("Error: No project found. Run 'vibe init' first.", err=True)
        sys.exit(1)

    if new_status in (PhaseStatus.IN_PROGRESS, PhaseStatus.COMPLETE):
        unmet = sm.check_dependencies(phase)
        if unmet:
            click.echo(
                f"Warning: recommended dependencies for '{phase}' are not yet complete/skipped: {', '.join(unmet)}"
            )

    metadata: dict[str, str] = {}
    if new_status == PhaseStatus.SKIPPED:
        metadata["skip_reason"] = reason

    sm.set_phase_status(phase, new_status, **metadata)
    sm.save()

    log_path = str(sm.project_root / ".agents" / "events.jsonl")
    el = EventLogger(log_path)
    el.log(
        "set_phase_status",
        "user",
        "success",
        phase=phase,
        status=new_status,
        reason=reason,
    )

    click.echo(f"Phase '{phase}' set to {new_status}.")
    click.echo(f"Current phase is now '{sm.get_current_phase()}'.")


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
            sm.load()
            sm.recompute_current_phase()
            sm.save()
            phase = sm.get_current_phase()
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
@click.argument(
    "phase",
    type=click.Choice([phase.value for phase in PHASE_ORDER], case_sensitive=False),
)
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
@click.argument(
    "phase",
    type=click.Choice([phase.value for phase in PHASE_ORDER], case_sensitive=False),
)
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
    click.echo(f"Current phase is now '{sm.get_current_phase()}'.")
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
