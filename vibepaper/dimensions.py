"""Discussion dimensions for multi-round paper refinement."""

DIMENSIONS: list[str] = [
    "novelty",
    "soundness",
    "significance",
    "clarity",
    "completeness",
    "reproducibility",
    "ethics",
]


def get_uncovered_dimensions(state: dict) -> list[str]:
    """Return dimensions not yet covered in discussion rounds."""
    pass
