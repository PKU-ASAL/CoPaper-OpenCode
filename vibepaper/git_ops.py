"""Git operations: phase-based commits, rollback, diffs, and identity management.

GitManager wraps GitPython to provide structured git operations aligned with
the VibePaper pipeline phases. Each commit is tagged with a phase prefix
(e.g. ``[storyline]``) and includes a VibePaper co-author trailer.
"""

from __future__ import annotations

import configparser
from typing import TYPE_CHECKING

import git

if TYPE_CHECKING:
    from vibepaper.eventlog import EventLogger


class GitManager:
    """Manage git operations for the VibePaper pipeline.

    Parameters:
        repo_path: Path to the git repository (default ``"."``).
        event_logger: Optional :class:`EventLogger` for recording operations.
    """

    def __init__(
        self,
        repo_path: str = ".",
        event_logger: EventLogger | None = None,
    ) -> None:
        self.repo = git.Repo(repo_path)
        self.event_logger = event_logger

    def commit_phase(
        self,
        phase: str,
        message: str,
        files: list[str] | None = None,
        force: bool = False,
    ) -> str:
        """Stage changes and create a phase-tagged commit.

        Args:
            phase: Pipeline phase label (e.g. ``"storyline"``).
            message: Human-readable commit message body.
            files: Specific file paths to stage.  ``None`` stages all
                changes (``git add -A``).
            force: If ``True``, create a commit even when there are no
                staged changes (empty commit).

        Returns:
            The hex SHA of the new commit.

        Raises:
            ValueError: If there are no staged changes and *force* is
                ``False``.
        """
        if files is not None:
            self.repo.index.add(files)
        else:
            self.repo.git.add("-A")

        has_staged = bool(self.repo.index.diff("HEAD"))

        # For initial repos with no prior commits, diff("HEAD") fails;
        # fall back to checking index entries.
        if not has_staged:
            try:
                has_staged = bool(self.repo.index.diff("HEAD"))
            except Exception:
                has_staged = bool(self.repo.index.entries)

        if not has_staged and not force:
            raise ValueError(
                "No staged changes to commit. Use force=True to create an empty commit."
            )

        formatted_message = (
            f"[{phase}] {message}\n\nCo-authored-by: VibePaper AI <ai@vibepaper>"
        )

        if self.event_logger is not None:
            self.event_logger.log("commit_phase", "system", "success", phase=phase)

        commit = self.repo.index.commit(formatted_message)

        return commit.hexsha

    def has_uncommitted_changes(self) -> bool:
        """Return ``True`` if the working tree has uncommitted changes."""
        return self.repo.is_dirty(untracked_files=True)

    def get_phase_commits(self, phase: str) -> list[dict]:
        """Return all commits whose message starts with ``[{phase}]``.

        Returns:
            List of dicts with keys ``sha``, ``message``, ``author``,
            ``date`` (ISO-format string).
        """
        prefix = f"[{phase}]"
        results: list[dict] = []
        for commit in self.repo.iter_commits():
            if commit.message.startswith(prefix):
                results.append(
                    {
                        "sha": commit.hexsha,
                        "message": commit.message,
                        "author": str(commit.author),
                        "date": commit.committed_datetime.isoformat(),
                    }
                )
        return results

    def rollback_to_phase(self, phase: str) -> str | None:
        """Soft-reset HEAD to the last commit of *phase*.

        Uses ``git reset --soft`` so the working tree and index are
        preserved — only HEAD is moved.

        Args:
            phase: Pipeline phase label to roll back to.

        Returns:
            The hex SHA of the commit reset to, or ``None`` if no
            commit for the phase was found.
        """
        commits = self.get_phase_commits(phase)
        if not commits:
            return None

        # get_phase_commits returns newest-first; take the first match
        target_sha = commits[0]["sha"]
        self.repo.git.reset("--soft", target_sha)

        if self.event_logger is not None:
            self.event_logger.log("rollback_to_phase", "system", "success", phase=phase)

        return target_sha

    def diff_between_phases(self, phase_a: str, phase_b: str) -> str:
        """Return the diff between the last commits of two phases.

        Args:
            phase_a: Earlier phase label.
            phase_b: Later phase label.

        Returns:
            Diff string, or empty string if either phase has no commits.
        """
        commits_a = self.get_phase_commits(phase_a)
        commits_b = self.get_phase_commits(phase_b)

        if not commits_a or not commits_b:
            return ""

        sha_a = commits_a[0]["sha"]
        sha_b = commits_b[0]["sha"]
        return self.repo.git.diff(sha_a, sha_b)

    def get_committer_info(self) -> dict:
        """Read the git user identity from the repository config.

        Returns:
            Dict with ``name`` and ``email`` keys.  Falls back to
            ``"Unknown"`` / ``"unknown@unknown"`` when config values
            are missing.
        """
        reader = self.repo.config_reader()
        try:
            name = reader.get_value("user", "name", "Unknown")
        except (configparser.NoSectionError, configparser.NoOptionError):
            name = "Unknown"
        try:
            email = reader.get_value("user", "email", "unknown@unknown")
        except (configparser.NoSectionError, configparser.NoOptionError):
            email = "unknown@unknown"
        return {"name": name, "email": email}
