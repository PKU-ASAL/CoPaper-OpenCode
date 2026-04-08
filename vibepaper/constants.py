"""Phase and status constants for VibePaper pipeline.

Defines the 6-phase writing pipeline, status values, phase ordering,
and dependency graph. Modeled after AutoResearchClaw's Stage/StageStatus pattern.
"""

from __future__ import annotations

from enum import Enum


class Phase(str, Enum):
    """The 6 phases of the VibePaper writing pipeline.

    Each phase corresponds to a major workflow stage:
      storyline    - Define research storyline and core insight
      literature   - Find, read, and cross-index related work
      discussion   - Multi-round discussion to refine arguments
      experiments  - Run experiments or skip with justification
      writing      - Write paper.md section by section
      latex_review - Convert to LaTeX and review
    """

    STORYLINE = "storyline"
    LITERATURE = "literature"
    DISCUSSION = "discussion"
    EXPERIMENTS = "experiments"
    WRITING = "writing"
    LATEX_REVIEW = "latex_review"


class PhaseStatus(str, Enum):
    """Status values for each phase in the pipeline."""

    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETE = "complete"
    SKIPPED = "skipped"


# Ordered list of phases defining pipeline sequence
PHASE_ORDER: list[Phase] = [
    Phase.STORYLINE,
    Phase.LITERATURE,
    Phase.DISCUSSION,
    Phase.EXPERIMENTS,
    Phase.WRITING,
    Phase.LATEX_REVIEW,
]

# Dependency graph: each phase depends on these phases being complete first
PHASE_DEPENDENCIES: dict[Phase, list[Phase]] = {
    Phase.STORYLINE: [],
    Phase.LITERATURE: [Phase.STORYLINE],
    Phase.DISCUSSION: [Phase.STORYLINE, Phase.LITERATURE],
    Phase.EXPERIMENTS: [Phase.DISCUSSION],
    Phase.WRITING: [Phase.DISCUSSION],
    Phase.LATEX_REVIEW: [Phase.WRITING],
}
