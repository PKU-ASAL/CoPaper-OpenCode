"""Tests for vibepaper.identity module (Task 15)."""

from __future__ import annotations

from pathlib import Path

import git
import pytest

from vibepaper.identity import IdentityManager


class TestDetectFromGit:
    def test_detect_reads_git_config(self, tmp_path: Path) -> None:
        repo = git.Repo.init(tmp_path)
        repo.config_writer().set_value("user", "name", "Alice").release()
        repo.config_writer().set_value("user", "email", "alice@example.com").release()

        im = IdentityManager(str(tmp_path))
        info = im.detect_from_git()
        assert info["name"] == "Alice"
        assert info["email"] == "alice@example.com"

    def test_detect_fallback_no_git_repo(self, tmp_path: Path) -> None:
        im = IdentityManager(str(tmp_path))
        info = im.detect_from_git()
        assert info["name"] == "Unknown"
        assert info["email"] == "unknown@unknown"


class TestRole:
    def test_default_role_is_student(self) -> None:
        im = IdentityManager()
        assert im.get_role() == "student"

    def test_set_valid_role(self) -> None:
        im = IdentityManager()
        im.set_role("advisor")
        assert im.get_role() == "advisor"

    def test_set_invalid_role_raises(self) -> None:
        im = IdentityManager()
        with pytest.raises(ValueError, match="Invalid role"):
            im.set_role("admin")


class TestDisplayName:
    def test_display_name_after_detect(self, tmp_path: Path) -> None:
        repo = git.Repo.init(tmp_path)
        repo.config_writer().set_value("user", "name", "Bob").release()
        repo.config_writer().set_value("user", "email", "bob@test.com").release()

        im = IdentityManager(str(tmp_path))
        im.detect_from_git()
        assert im.get_display_name() == "Bob (student)"

    def test_display_name_without_detect(self) -> None:
        im = IdentityManager()
        assert im.get_display_name() == "Unknown (student)"
