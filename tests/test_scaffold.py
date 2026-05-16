"""Tests for vibepaper.scaffold module."""

from __future__ import annotations

from pathlib import Path

from vibepaper.scaffold import (
    copy_agents_md,
    copy_paper,
    copy_skills,
    copy_storyline,
    copy_templates,
    copy_writingrules,
    scaffold_project,
)


class TestCopySkills:
    def test_copies_all_skill_directories(self, tmp_path: Path) -> None:
        dst = copy_skills(tmp_path)
        assert dst == tmp_path / ".agents" / "skills"
        assert dst.is_dir()

        skill_dirs = [d.name for d in dst.iterdir() if d.is_dir()]
        assert "storyline-helper" in skill_dirs
        assert "markdown-helper" in skill_dirs
        assert "relatedwork-finder" in skill_dirs
        assert "vibepaper-manage" in skill_dirs

    def test_copies_skills_agents_md(self, tmp_path: Path) -> None:
        _ = copy_skills(tmp_path)
        agents_md = tmp_path / ".agents" / "skills" / "AGENTS.md"
        assert agents_md.exists()

    def test_each_skill_has_skill_md(self, tmp_path: Path) -> None:
        _ = copy_skills(tmp_path)
        skills_dir = tmp_path / ".agents" / "skills"
        for skill_dir in skills_dir.iterdir():
            if skill_dir.is_dir():
                assert (skill_dir / "SKILL.md").exists(), (
                    f"{skill_dir.name} missing SKILL.md"
                )

    def test_does_not_overwrite_existing_skill(self, tmp_path: Path) -> None:
        skills_dir = tmp_path / ".agents" / "skills" / "storyline-helper"
        skills_dir.mkdir(parents=True)
        marker = skills_dir / "SKILL.md"
        _ = marker.write_text("custom content", encoding="utf-8")

        _ = copy_skills(tmp_path)

        assert marker.read_text(encoding="utf-8") == "custom content"

    def test_adds_missing_skills_alongside_existing(self, tmp_path: Path) -> None:
        existing = tmp_path / ".agents" / "skills" / "storyline-helper"
        existing.mkdir(parents=True)
        _ = (existing / "SKILL.md").write_text("custom", encoding="utf-8")

        _ = copy_skills(tmp_path)

        assert (existing / "SKILL.md").read_text(encoding="utf-8") == "custom"
        assert (tmp_path / ".agents" / "skills" / "markdown-helper").is_dir()


class TestCopyStoryline:
    def test_copies_storyline(self, tmp_path: Path) -> None:
        dst = copy_storyline(tmp_path)
        assert dst == tmp_path / "storyline.md"
        assert dst.exists()
        content = dst.read_text(encoding="utf-8")
        assert "问题描述" in content

    def test_does_not_overwrite_existing(self, tmp_path: Path) -> None:
        existing = tmp_path / "storyline.md"
        existing.write_text("my storyline", encoding="utf-8")

        _ = copy_storyline(tmp_path)

        assert existing.read_text(encoding="utf-8") == "my storyline"


class TestCopyPaper:
    def test_copies_paper(self, tmp_path: Path) -> None:
        dst = copy_paper(tmp_path)
        assert dst == tmp_path / "paper.md"
        assert dst.exists()
        content = dst.read_text(encoding="utf-8")
        assert "# 论文的题目" in content

    def test_does_not_overwrite_existing(self, tmp_path: Path) -> None:
        existing = tmp_path / "paper.md"
        existing.write_text("my paper", encoding="utf-8")

        _ = copy_paper(tmp_path)

        assert existing.read_text(encoding="utf-8") == "my paper"


class TestCopyWritingrules:
    def test_copies_writingrules(self, tmp_path: Path) -> None:
        dst = copy_writingrules(tmp_path)
        assert dst == tmp_path / "writingrules.md"
        assert dst.exists()
        content = dst.read_text(encoding="utf-8")
        assert "写作规则" in content

    def test_does_not_overwrite_existing(self, tmp_path: Path) -> None:
        existing = tmp_path / "writingrules.md"
        _ = existing.write_text("custom rules", encoding="utf-8")

        _ = copy_writingrules(tmp_path)

        assert existing.read_text(encoding="utf-8") == "custom rules"


class TestCopyAgentsMd:
    def test_copies_agents_md(self, tmp_path: Path) -> None:
        dst = copy_agents_md(tmp_path)
        assert dst == tmp_path / "AGENTS.md"
        assert dst.exists()
        content = dst.read_text(encoding="utf-8")
        assert "VibePaper" in content

    def test_does_not_overwrite_existing(self, tmp_path: Path) -> None:
        existing = tmp_path / "AGENTS.md"
        _ = existing.write_text("custom agents", encoding="utf-8")

        _ = copy_agents_md(tmp_path)

        assert existing.read_text(encoding="utf-8") == "custom agents"


class TestScaffoldProject:
    def test_creates_all_scaffold_files(self, tmp_path: Path) -> None:
        scaffold_project(tmp_path)

        assert (tmp_path / ".agents" / "skills").is_dir()
        assert (tmp_path / "storyline.md").exists()
        assert (tmp_path / "paper.md").exists()
        assert (tmp_path / "writingrules.md").exists()
        assert (tmp_path / "AGENTS.md").exists()
        assert (tmp_path / "templates" / "latex" / "README.md").exists()

        skill_dirs = [
            d.name for d in (tmp_path / ".agents" / "skills").iterdir() if d.is_dir()
        ]
        source_skills_path = (
            Path(__file__).resolve().parent.parent / ".agents" / "skills"
        )
        source_skill_dirs = [d.name for d in source_skills_path.iterdir() if d.is_dir()]
        assert len(skill_dirs) == len(source_skill_dirs)


class TestCopyTemplates:
    def test_creates_latex_template_dropin_dir(self, tmp_path: Path) -> None:
        dst = copy_templates(tmp_path)
        assert dst == tmp_path / "templates"
        assert (tmp_path / "templates" / "latex" / "README.md").exists()

    def test_does_not_overwrite_existing_template_readme(self, tmp_path: Path) -> None:
        existing = tmp_path / "templates" / "latex" / "README.md"
        existing.parent.mkdir(parents=True)
        existing.write_text("custom template instructions", encoding="utf-8")

        _ = copy_templates(tmp_path)

        assert existing.read_text(encoding="utf-8") == "custom template instructions"
