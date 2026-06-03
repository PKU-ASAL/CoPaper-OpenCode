"""Tests for skill SKILL.md documentation conventions."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_SKILLS_DIR = REPO_ROOT / ".agents" / "skills"
SCAFFOLD_SKILLS_DIR = REPO_ROOT / "copaper" / "scaffold" / "skills"

ALL_SKILL_NAMES = sorted(
    d.name
    for d in SOURCE_SKILLS_DIR.iterdir()
    if d.is_dir() and (d / "SKILL.md").exists()
)

CHECKER_NAMES = [
    "problem-checker",
    "clarity-checker",
    "logic-checker",
    "novelty-checker",
    "technical-depth-checker",
    "evaluation-protocol-checker",
    "data-checker",
]

WRITINGRULES_REQUIRED_SKILLS = {
    "submission-precheck",
    "markdown2latex",
    "latex2markdown",
    "template-latex-export",
}

SKILLS_WITH_EXAMPLES = set(CHECKER_NAMES)

_NEGATIVE_WRITINGRULES_PATTERNS = [
    r"Do NOT read.*writingrules\.md",
    r"does not need.*writingrules\.md",
    r"does NOT read.*writingrules\.md",
    r"does not overwrite.*writingrules\.md",
    r"read indirectly.*writingrules\.md",
    r"writingrules\.md.*read indirectly",
    r"instead of reading.*writingrules\.md",
    r"writingrules\.md.*indirectly by",
    r"such as.*writingrules\.md",
]


def _read_skill(skill_name: str, source: bool = True) -> str:
    base = SOURCE_SKILLS_DIR if source else SCAFFOLD_SKILLS_DIR
    return (base / skill_name / "SKILL.md").read_text(encoding="utf-8")


def _extract_section(content: str, heading: str) -> str | None:
    match = re.search(
        rf"^## {re.escape(heading)}\s*\n(.*?)(?=\n## |\Z)",
        content,
        re.MULTILINE | re.DOTALL,
    )
    return match.group(1) if match else None


def _strip_negative_writingrules_refs(content: str) -> str:
    filtered = content
    for pat in _NEGATIVE_WRITINGRULES_PATTERNS:
        filtered = re.sub(pat, "", filtered, flags=re.IGNORECASE)
    filtered = re.sub(r"- `writingrules\.md`\s*$", "", filtered, flags=re.MULTILINE)
    return filtered


class TestInputFilesSection:
    @pytest.mark.parametrize("skill_name", ALL_SKILL_NAMES)
    def test_has_input_files_section(self, skill_name: str) -> None:
        content = _read_skill(skill_name)
        assert re.search(r"^## Input Files", content, re.MULTILINE), (
            f"{skill_name}/SKILL.md is missing '## Input Files' section"
        )

    @pytest.mark.parametrize("skill_name", ALL_SKILL_NAMES)
    def test_input_files_has_table(self, skill_name: str) -> None:
        content = _read_skill(skill_name)
        section = _extract_section(content, "Input Files")
        assert section, f"{skill_name}/SKILL.md: ## Input Files section not found"
        assert "|" in section, (
            f"{skill_name}/SKILL.md: ## Input Files section has no table"
        )


class TestWritingrulesPolicy:
    @pytest.mark.parametrize(
        "skill_name",
        [s for s in ALL_SKILL_NAMES if s not in WRITINGRULES_REQUIRED_SKILLS],
    )
    def test_no_positive_writingrules_read(self, skill_name: str) -> None:
        content = _read_skill(skill_name)
        filtered = _strip_negative_writingrules_refs(content)
        positive_match = re.search(r"[Rr]ead\s+`?writingrules\.md`?", filtered)
        assert not positive_match, (
            f"{skill_name}/SKILL.md still instructs agents to read "
            f"writingrules.md (not in allow-list). "
            f"Found: {positive_match.group(0) if positive_match else ''}"
        )

    @pytest.mark.parametrize("skill_name", sorted(WRITINGRULES_REQUIRED_SKILLS))
    def test_writingrules_listed_as_required(self, skill_name: str) -> None:
        content = _read_skill(skill_name)
        section = _extract_section(content, "Input Files")
        assert section, f"{skill_name}/SKILL.md: ## Input Files section not found"
        assert "writingrules.md" in section, (
            f"{skill_name}/SKILL.md: writingrules.md not listed in Input Files table"
        )


class TestCheckerExamples:
    @pytest.mark.parametrize("skill_name", CHECKER_NAMES)
    def test_examples_md_exists(self, skill_name: str) -> None:
        path = SOURCE_SKILLS_DIR / skill_name / "examples.md"
        assert path.exists(), f"{skill_name} is missing examples.md"

    @pytest.mark.parametrize("skill_name", CHECKER_NAMES)
    def test_skill_md_references_examples(self, skill_name: str) -> None:
        content = _read_skill(skill_name)
        assert "examples.md" in content, (
            f"{skill_name}/SKILL.md does not reference examples.md"
        )

    @pytest.mark.parametrize("skill_name", CHECKER_NAMES)
    def test_no_inline_example_output_section(self, skill_name: str) -> None:
        content = _read_skill(skill_name)
        assert not re.search(r"^## Example Output", content, re.MULTILINE), (
            f"{skill_name}/SKILL.md still has '## Example Output' section "
            f"(examples should be in examples.md)"
        )

    @pytest.mark.parametrize("skill_name", CHECKER_NAMES)
    def test_has_paper_structure_reference(self, skill_name: str) -> None:
        content = _read_skill(skill_name)
        assert re.search(r"^## Paper Structure Reference", content, re.MULTILINE), (
            f"{skill_name}/SKILL.md is missing '## Paper Structure Reference'"
        )


class TestCrossIndexFiltering:
    @pytest.mark.parametrize("skill_name", ["markdown-helper", "review-revise"])
    def test_cross_index_first_instruction(self, skill_name: str) -> None:
        content = _read_skill(skill_name)
        assert re.search(r"cross_index\.json.*FIRST", content, re.IGNORECASE), (
            f"{skill_name}/SKILL.md does not instruct to read cross_index.json FIRST"
        )

    @pytest.mark.parametrize("skill_name", ["markdown-helper", "review-revise"])
    def test_no_indiscriminate_relatedwork_read(self, skill_name: str) -> None:
        content = _read_skill(skill_name)
        assert re.search(r"(ONLY.*specific|do NOT read all)", content, re.IGNORECASE), (
            f"{skill_name}/SKILL.md does not restrict relatedwork reads "
            f"to cross-index-identified files"
        )


class TestSourceScaffoldSync:
    @pytest.mark.parametrize("skill_name", ALL_SKILL_NAMES)
    def test_skill_md_matches_scaffold(self, skill_name: str) -> None:
        src = SOURCE_SKILLS_DIR / skill_name / "SKILL.md"
        scf = SCAFFOLD_SKILLS_DIR / skill_name / "SKILL.md"
        assert scf.exists(), f"Scaffold missing: {skill_name}/SKILL.md"
        assert src.read_text(encoding="utf-8") == scf.read_text(encoding="utf-8"), (
            f"{skill_name}/SKILL.md differs between source and scaffold"
        )

    @pytest.mark.parametrize("skill_name", sorted(SKILLS_WITH_EXAMPLES))
    def test_examples_md_matches_scaffold(self, skill_name: str) -> None:
        src = SOURCE_SKILLS_DIR / skill_name / "examples.md"
        scf = SCAFFOLD_SKILLS_DIR / skill_name / "examples.md"
        assert scf.exists(), f"Scaffold missing: {skill_name}/examples.md"
        assert src.read_text(encoding="utf-8") == scf.read_text(encoding="utf-8"), (
            f"{skill_name}/examples.md differs between source and scaffold"
        )


class TestYAMLFrontmatter:
    @pytest.mark.parametrize("skill_name", ALL_SKILL_NAMES)
    def test_has_frontmatter(self, skill_name: str) -> None:
        content = _read_skill(skill_name)
        assert content.startswith("---"), (
            f"{skill_name}/SKILL.md does not start with YAML frontmatter"
        )
        second_fence = content.index("---", 3)
        frontmatter = content[3:second_fence]
        assert "name:" in frontmatter, (
            f"{skill_name}/SKILL.md frontmatter missing 'name:'"
        )
        assert "description:" in frontmatter, (
            f"{skill_name}/SKILL.md frontmatter missing 'description:'"
        )
