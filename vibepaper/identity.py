"""User identity detection from git config and role management."""

from __future__ import annotations

import configparser

import git


class IdentityManager:
    """Detect user identity from git config and manage roles.

    Parameters:
        repo_path: Path to the git repository (default ".").
    """

    VALID_ROLES: tuple[str, ...] = ("student", "advisor", "collaborator")

    def __init__(self, repo_path: str = ".") -> None:
        self._repo_path: str = repo_path
        self._role: str = "student"
        self._git_name: str | None = None
        self._git_email: str | None = None

    def detect_from_git(self) -> dict[str, str]:
        """Read user.name and user.email from git config.

        Returns:
            Dict with keys "name" and "email".
            Falls back to "Unknown" / "unknown@unknown" if not configured.
        """
        try:
            repo = git.Repo(self._repo_path)
            reader = repo.config_reader()
            try:
                self._git_name = str(reader.get_value("user", "name", "Unknown"))
            except (configparser.NoSectionError, configparser.NoOptionError):
                self._git_name = "Unknown"
            try:
                self._git_email = str(
                    reader.get_value("user", "email", "unknown@unknown")
                )
            except (configparser.NoSectionError, configparser.NoOptionError):
                self._git_email = "unknown@unknown"
        except (git.InvalidGitRepositoryError, git.NoSuchPathError):
            self._git_name = "Unknown"
            self._git_email = "unknown@unknown"

        return {"name": self._git_name, "email": self._git_email}

    def get_role(self) -> str:
        """Return the current role (default: 'student')."""
        return self._role

    def set_role(self, role: str) -> None:
        """Set the user role.

        Args:
            role: One of 'student', 'advisor', 'collaborator'.

        Raises:
            ValueError: If role is not valid.
        """
        if role not in self.VALID_ROLES:
            raise ValueError(
                f"Invalid role '{role}'. Must be one of {self.VALID_ROLES}"
            )
        self._role = role

    def get_display_name(self) -> str:
        """Return a display name combining git name and role.

        Returns:
            String like "John Doe (student)" or "Unknown (student)" if not detected.
        """
        name = self._git_name or "Unknown"
        return f"{name} ({self._role})"
