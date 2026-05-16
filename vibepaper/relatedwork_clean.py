"""Reset the related-work pipeline back to a freshly-initialised state.

Removes (via ``trash`` when available, falling back to ``shutil`` /
``Path.unlink``) the entire ``relatedwork/`` tree and ``.agents/cross_index.json``,
then zeros out the literature-phase counters in ``.agents/state.json``.

The intent is to undo every artifact produced by ``vibe relatedwork`` so the
user can rerun the pipeline from scratch. PDFs and per-paper summaries are
included — there is no partial mode here.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from vibepaper.constants import PhaseStatus
from vibepaper.state import StateFileError, StateManager


RELATEDWORK_DIR = "relatedwork"
CROSS_INDEX_PATH = ".agents/cross_index.json"


@dataclass
class CleanOutcome:
    project_root: str
    removed: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    used_trash: bool = False
    state_reset: bool = False
    dry_run: bool = False


def _delete_via_trash(path: Path) -> bool:
    """Move ``path`` to trash. Return True iff the ``trash`` CLI handled it."""
    if shutil.which("trash") is None:
        return False
    try:
        subprocess.run(
            ["trash", str(path)],
            check=True,
            capture_output=True,
        )
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def _permanent_delete(path: Path) -> None:
    if path.is_dir() and not path.is_symlink():
        shutil.rmtree(path)
    else:
        path.unlink()


def _default_delete(path: Path) -> bool:
    """Best-effort delete: trash first, fall back to permanent removal."""
    if _delete_via_trash(path):
        return True
    _permanent_delete(path)
    return False


def _reset_literature_phase(state_manager: StateManager) -> None:
    phases = state_manager._state.get("phases", {})
    literature = phases.get("literature", {})
    literature["status"] = PhaseStatus.NOT_STARTED.value
    literature["completed_at"] = None
    literature["catalog_path"] = "relatedwork/literature.json"
    literature["papers_found"] = 0
    literature["papers_downloaded"] = 0
    literature["download_failures"] = 0
    literature["summaries_done"] = 0
    literature["cross_index_built"] = False
    state_manager.recompute_current_phase()
    state_manager.save()


def plan_targets(project_root: str | Path) -> list[Path]:
    """Return the paths the clean command would remove, in deletion order."""
    root = Path(project_root)
    return [
        root / RELATEDWORK_DIR,
        root / CROSS_INDEX_PATH,
    ]


def clean_relatedwork(
    project_root: str | Path,
    *,
    dry_run: bool = False,
    delete_fn: Callable[[Path], bool] | None = None,
) -> CleanOutcome:
    """Wipe relatedwork artifacts and reset literature-phase counters."""
    root = Path(project_root)
    outcome = CleanOutcome(project_root=str(root), dry_run=dry_run)

    delete = delete_fn if delete_fn is not None else _default_delete

    any_trash = False
    for path in plan_targets(root):
        if not path.exists() and not path.is_symlink():
            outcome.skipped.append(str(path))
            continue
        if dry_run:
            outcome.removed.append(str(path))
            continue
        used_trash = delete(path)
        any_trash = any_trash or used_trash
        outcome.removed.append(str(path))

    if dry_run:
        return outcome

    outcome.used_trash = any_trash

    try:
        state_manager = StateManager(str(root))
        state_manager.load()
    except StateFileError:
        return outcome

    _reset_literature_phase(state_manager)
    outcome.state_reset = True
    return outcome


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Wipe relatedwork progress (PDFs, summaries, catalog, BibTeX, "
            "cross-index) and reset the literature phase to not_started."
        )
    )
    parser.add_argument("--root", default=".", help="Project root directory.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List the paths that would be removed without deleting them.",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip the confirmation prompt.",
    )
    args = parser.parse_args()

    targets = [path for path in plan_targets(args.root) if path.exists()]
    if not targets:
        print("Nothing to clean. relatedwork/ and cross_index.json are already absent.")
        return

    print("Will remove (to trash if available):")
    for path in targets:
        print(f"  - {path}")
    print("Then reset the literature phase counters in .agents/state.json.")

    if args.dry_run:
        print("(--dry-run) No changes made.")
        return

    if not args.yes:
        answer = input("Proceed? [y/N] ").strip().lower()
        if answer not in {"y", "yes"}:
            print("Aborted.")
            return

    outcome = clean_relatedwork(args.root)
    for path in outcome.removed:
        print(f"[cleaned] {path}")
    if outcome.state_reset:
        print("Literature phase counters reset to not_started.")
    if not outcome.used_trash:
        print(
            "Note: `trash` CLI not available — items were permanently deleted."
        )


if __name__ == "__main__":
    main()
