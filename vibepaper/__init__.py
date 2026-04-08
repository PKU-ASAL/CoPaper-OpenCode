"""VibePaper - AI-assisted academic writing framework."""

__version__ = "0.1.0"

from vibepaper.constants import Phase, PhaseStatus, PHASE_ORDER, PHASE_DEPENDENCIES
from vibepaper.schema import STATE_SCHEMA

__all__ = [
    "__version__",
    "Phase",
    "PhaseStatus",
    "PHASE_ORDER",
    "PHASE_DEPENDENCIES",
    "STATE_SCHEMA",
]
