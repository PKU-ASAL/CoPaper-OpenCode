"""Shared pytest fixtures for CoPaper test suite."""

from __future__ import annotations

import copy
import subprocess
from pathlib import Path

import pytest

from copaper.schema import DEFAULT_STATE


@pytest.fixture
def tmp_project_dir(tmp_path: Path) -> Path:
    """Create a temporary directory with .agents/ subdirectory.

    Mimics the minimal CoPaper project structure needed for tests.
    """
    agents_dir = tmp_path / ".agents"
    agents_dir.mkdir()
    return tmp_path


@pytest.fixture
def sample_state() -> dict:
    """Return a deep copy of DEFAULT_STATE with all phases set to not_started.

    Uses deepcopy to prevent mutation between tests.
    """
    state = copy.deepcopy(DEFAULT_STATE)
    for phase_data in state["phases"].values():
        phase_data["status"] = "not_started"
    return state


@pytest.fixture
def mock_git_repo(tmp_path: Path) -> Path:
    """Create a temporary git repository with an initial commit.

    Uses subprocess (not gitpython) to keep conftest lightweight.
    """
    repo_path = tmp_path / "repo"
    repo_path.mkdir()

    subprocess.run(
        ["git", "init"],
        cwd=repo_path,
        check=True,
        capture_output=True,
    )
    subprocess.run(
        ["git", "config", "user.email", "test@example.com"],
        cwd=repo_path,
        check=True,
        capture_output=True,
    )
    subprocess.run(
        ["git", "config", "user.name", "Test User"],
        cwd=repo_path,
        check=True,
        capture_output=True,
    )

    # Create an initial file and commit so HEAD exists
    readme = repo_path / "README.md"
    readme.write_text("# Test Repo\n")
    subprocess.run(
        ["git", "add", "README.md"],
        cwd=repo_path,
        check=True,
        capture_output=True,
    )
    subprocess.run(
        ["git", "commit", "-m", "Initial commit"],
        cwd=repo_path,
        check=True,
        capture_output=True,
    )

    return repo_path
