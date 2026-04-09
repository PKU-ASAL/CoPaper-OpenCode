"""Scaffold logic for `vibe init`.

Copies bundled .agents/skills/ and storyline.md into a new project directory.
The scaffold templates live under vibepaper/scaffold/ as package data.
"""

from __future__ import annotations

import shutil
from pathlib import Path


def _scaffold_dir() -> Path:
    """Return the path to the bundled scaffold directory."""
    return Path(__file__).resolve().parent / "scaffold"


def copy_skills(project_root: str | Path) -> Path:
    """Copy bundled skills into ``<project_root>/.agents/skills/``.

    Existing skill directories are **not** overwritten — only missing
    skills are added.  The top-level ``AGENTS.md`` inside skills/ is
    always refreshed.

    Returns:
        The destination skills directory.
    """
    src = _scaffold_dir() / "skills"
    dst = Path(project_root) / ".agents" / "skills"
    dst.mkdir(parents=True, exist_ok=True)

    if not src.exists():
        return dst

    # Always refresh the skills-level AGENTS.md
    agents_md = src / "AGENTS.md"
    if agents_md.exists():
        shutil.copy2(str(agents_md), str(dst / "AGENTS.md"))

    # Copy each skill sub-directory if it doesn't already exist
    for skill_dir in sorted(src.iterdir()):
        if not skill_dir.is_dir():
            continue
        target = dst / skill_dir.name
        if target.exists():
            continue
        shutil.copytree(str(skill_dir), str(target))

    return dst


def copy_storyline(project_root: str | Path) -> Path:
    """Copy bundled ``storyline.md`` into *project_root*.

    If the file already exists it is **not** overwritten.

    Returns:
        The destination file path.
    """
    src = _scaffold_dir() / "storyline.md"
    dst = Path(project_root) / "storyline.md"

    if not dst.exists() and src.exists():
        shutil.copy2(str(src), str(dst))

    return dst


def copy_writingrules(project_root: str | Path) -> Path:
    """Copy bundled ``writingrules.md`` into *project_root*.

    If the file already exists it is **not** overwritten.

    Returns:
        The destination file path.
    """
    src = _scaffold_dir() / "writingrules.md"
    dst = Path(project_root) / "writingrules.md"

    if not dst.exists() and src.exists():
        shutil.copy2(str(src), str(dst))

    return dst


def copy_agents_md(project_root: str | Path) -> Path:
    """Copy bundled root ``AGENTS.md`` into *project_root*.

    If the file already exists it is **not** overwritten.

    Returns:
        The destination file path.
    """
    src = _scaffold_dir() / "AGENTS.md"
    dst = Path(project_root) / "AGENTS.md"

    if not dst.exists() and src.exists():
        shutil.copy2(str(src), str(dst))

    return dst


def scaffold_project(project_root: str | Path) -> None:
    """Run the full scaffold: skills, storyline, writingrules, AGENTS.md."""
    copy_skills(project_root)
    copy_storyline(project_root)
    copy_writingrules(project_root)
    copy_agents_md(project_root)
