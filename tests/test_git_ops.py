"""Tests for copaper.git_ops module (Task 8)."""

from __future__ import annotations

from pathlib import Path

import git
import pytest

from copaper.eventlog import EventLogger
from copaper.git_ops import GitManager


def _init_repo(tmp_path: Path) -> git.Repo:
    """Create a temporary git repo with an initial commit."""
    repo = git.Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@test.com").release()
    (tmp_path / "README.md").write_text("# Test\n")
    repo.index.add(["README.md"])
    repo.index.commit("Initial commit")
    return repo


class TestCommitPhaseCreatesFormattedCommit:
    def test_commit_contains_phase_prefix_and_coauthor(self, tmp_path: Path):
        _init_repo(tmp_path)
        gm = GitManager(str(tmp_path))
        (tmp_path / "storyline.md").write_text("## Insight\n")
        sha = gm.commit_phase("storyline", "add insight section")
        commit = gm.repo.commit(sha)
        assert commit.message.startswith("[storyline]")
        assert "Co-authored-by: CoPaper AI <ai@copaper>" in commit.message
        assert "add insight section" in commit.message


class TestCommitPhaseWithSpecificFiles:
    def test_only_specified_files_committed(self, tmp_path: Path):
        _init_repo(tmp_path)
        gm = GitManager(str(tmp_path))
        (tmp_path / "file1.txt").write_text("hello")
        (tmp_path / "file2.txt").write_text("world")
        sha = gm.commit_phase("writing", "add file1", files=["file1.txt"])
        commit = gm.repo.commit(sha)
        committed_paths = {
            item.a_path for item in commit.tree.diff(gm.repo.commit("HEAD~1"))
        }
        assert "file1.txt" in committed_paths
        assert "file2.txt" not in committed_paths


class TestHasUncommittedChanges:
    def test_dirty_after_modification_clean_after_commit(self, tmp_path: Path):
        _init_repo(tmp_path)
        gm = GitManager(str(tmp_path))
        assert not gm.has_uncommitted_changes()
        (tmp_path / "README.md").write_text("# Modified\n")
        assert gm.has_uncommitted_changes()
        gm.commit_phase("writing", "update readme")
        assert not gm.has_uncommitted_changes()


class TestRollbackResetsToPhaseCommit:
    def test_rollback_moves_head_to_earlier_phase(self, tmp_path: Path):
        _init_repo(tmp_path)
        gm = GitManager(str(tmp_path))
        (tmp_path / "storyline.md").write_text("insight\n")
        sha_storyline = gm.commit_phase("storyline", "add storyline")
        (tmp_path / "literature.md").write_text("papers\n")
        sha_literature = gm.commit_phase("literature", "add literature")
        result = gm.rollback_to_phase("storyline")
        assert result == sha_storyline
        assert gm.repo.head.commit.hexsha == sha_storyline


class TestGetPhaseCommitsFiltersCorrectly:
    def test_returns_only_matching_phase_commits(self, tmp_path: Path):
        _init_repo(tmp_path)
        gm = GitManager(str(tmp_path))
        (tmp_path / "a.txt").write_text("a\n")
        gm.commit_phase("storyline", "first")
        (tmp_path / "b.txt").write_text("b\n")
        gm.commit_phase("literature", "second")
        (tmp_path / "c.txt").write_text("c\n")
        gm.commit_phase("storyline", "third")
        storyline_commits = gm.get_phase_commits("storyline")
        literature_commits = gm.get_phase_commits("literature")
        assert len(storyline_commits) == 2
        assert len(literature_commits) == 1
        assert all(c["message"].startswith("[storyline]") for c in storyline_commits)
        assert literature_commits[0]["message"].startswith("[literature]")


class TestGetCommitterInfo:
    def test_returns_configured_name_and_email(self, tmp_path: Path):
        _init_repo(tmp_path)
        gm = GitManager(str(tmp_path))
        info = gm.get_committer_info()
        assert info["name"] == "Test User"
        assert info["email"] == "test@test.com"


class TestDiffBetweenPhases:
    def test_diff_is_nonempty_for_different_phases(self, tmp_path: Path):
        _init_repo(tmp_path)
        gm = GitManager(str(tmp_path))
        (tmp_path / "storyline.md").write_text("insight\n")
        gm.commit_phase("storyline", "add storyline")
        (tmp_path / "literature.md").write_text("papers\n")
        gm.commit_phase("literature", "add literature")
        diff = gm.diff_between_phases("storyline", "literature")
        assert len(diff) > 0
        assert "literature.md" in diff


class TestCommitPhaseLogsToEventLogger:
    def test_event_logged_on_commit(self, tmp_path: Path):
        _init_repo(tmp_path)
        log_path = tmp_path / ".agents" / "events.jsonl"
        logger = EventLogger(str(log_path))
        gm = GitManager(str(tmp_path), event_logger=logger)
        (tmp_path / "notes.txt").write_text("notes\n")
        gm.commit_phase("writing", "add notes")
        events = logger.query(phase="writing")
        assert len(events) == 1
        assert events[0]["action"] == "commit_phase"
        assert events[0]["result"] == "success"
