"""State schema definition for VibePaper projects.

The state.json file is the single source of truth for project progress.
It lives at .agents/state.json and is shared between the CLI and OpenCode Skills.
"""

from __future__ import annotations

from typing import Any

# JSON-serializable schema for .agents/state.json
# Each value is a Python type annotation used for validation, not a runtime schema.
# The actual state file stores concrete values conforming to these types.
STATE_SCHEMA: dict[str, Any] = {
    "project": {
        "name": str,
        "created_at": str,
        "domain": str,
    },
    "phases": {
        "storyline": {
            "status": str,  # PhaseStatus enum value
            "completed_at": str | None,
            "metadata": dict,
        },
        "literature": {
            "status": str,
            "papers_found": int,
            "summaries_done": int,
            "cross_index_built": bool,
        },
        "discussion": {
            "status": str,
            "rounds": int,
            "dimensions_covered": list,
        },
        "experiments": {
            "status": str,
            "skip_reason": str | None,
            "data_files": list,
        },
        "writing": {
            "status": str,
            "sections_complete": int,
            "sections_total": int,
        },
        "latex_review": {
            "status": str,
            "review_rounds": int,
            "comments_addressed": int,
            "comments_total": int,
        },
    },
    "current_phase": str,  # One of Phase enum values
    "event_log_path": str,  # Default: .agents/events.jsonl
    "git": {
        "auto_commit": bool,
        "identity": {
            "role": str,
            "git_name": str,
            "git_email": str,
        },
    },
    "checkers": {},  # Reserved for T9b checker integration
}

# Default values for a new project state
DEFAULT_STATE: dict[str, Any] = {
    "project": {
        "name": "",
        "created_at": "",
        "domain": "",
    },
    "phases": {
        "storyline": {
            "status": "not_started",
            "completed_at": None,
            "metadata": {},
        },
        "literature": {
            "status": "not_started",
            "papers_found": 0,
            "summaries_done": 0,
            "cross_index_built": False,
        },
        "discussion": {
            "status": "not_started",
            "rounds": 0,
            "dimensions_covered": [],
        },
        "experiments": {
            "status": "not_started",
            "skip_reason": None,
            "data_files": [],
        },
        "writing": {
            "status": "not_started",
            "sections_complete": 0,
            "sections_total": 0,
        },
        "latex_review": {
            "status": "not_started",
            "review_rounds": 0,
            "comments_addressed": 0,
            "comments_total": 0,
        },
    },
    "current_phase": "storyline",
    "event_log_path": ".agents/events.jsonl",
    "git": {
        "auto_commit": False,
        "identity": {
            "role": "assistant",
            "git_name": "VibePaper Bot",
            "git_email": "bot@vibepaper.dev",
        },
    },
    "checkers": {},
}
