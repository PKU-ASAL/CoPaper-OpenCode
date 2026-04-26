"""Scaffold logic for `vibe init`.

Copies bundled skills and starter documents into a new project directory.
The scaffold templates live under ``vibepaper/scaffold/`` as package data.
"""

from __future__ import annotations

import shutil
from pathlib import Path


def _scaffold_dir() -> Path:
    """Return the path to the bundled scaffold directory."""
    return Path(__file__).resolve().parent / "scaffold"


def _copy_missing_tree(src: Path, dst: Path) -> None:
    if not src.exists():
        return
    dst.mkdir(parents=True, exist_ok=True)
    for item in sorted(src.iterdir()):
        target = dst / item.name
        if item.is_dir():
            _copy_missing_tree(item, target)
        elif not target.exists():
            shutil.copy2(str(item), str(target))


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


def copy_paper(project_root: str | Path) -> Path:
    """Copy bundled ``paper.md`` into *project_root*.

    If the file already exists it is **not** overwritten.

    Returns:
        The destination file path.
    """
    src = _scaffold_dir() / "paper.md"
    dst = Path(project_root) / "paper.md"

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


def copy_opencode_config(project_root: str | Path) -> Path:
    src = _scaffold_dir() / "opencode.json"
    dst = Path(project_root) / "opencode.json"

    if not dst.exists() and src.exists():
        shutil.copy2(str(src), str(dst))

    return dst


def copy_opencode_assets(project_root: str | Path) -> Path:
    src = _scaffold_dir() / ".opencode"
    dst = Path(project_root) / ".opencode"
    _copy_missing_tree(src, dst)
    return dst


def scaffold_project(project_root: str | Path) -> None:
    """Run the full scaffold: skills and starter markdown files."""
    copy_skills(project_root)
    copy_storyline(project_root)
    copy_paper(project_root)
    copy_writingrules(project_root)
    copy_agents_md(project_root)
    copy_opencode_config(project_root)
    copy_opencode_assets(project_root)
