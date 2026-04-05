# AGENTS.md

## OVERVIEW
###### VibePaper-Skill: AI-assisted academic writing framework
<!-- description: Project purpose and core value proposition -->
VibePaper-Skill provides specialized agent skills for structured academic paper writing.
It uses a tree-based Markdown structure to organize content from top-level sections down to individual paragraphs.
The system prioritizes structural integrity and template adherence over raw AI generation.

## STRUCTURE
###### Tree-based Markdown organization with strict hierarchy
<!-- description: File organization and structural rules -->
- `paper.md`: The primary document containing the full paper content.
- `.agents/skills/`: Directory containing all functional agent skills.
- `template/`: Source for `technical_paper.md` and `empirical_paper.md`.
- `writingrules.md`: Definitive guide for structural and content constraints.

## WHERE TO LOOK
###### Key locations for skills and configuration
<!-- description: Critical paths for development and usage -->
- `.agents/skills/human-comment-helper/`: Tools for structured reviewer feedback.
- `.agents/skills/latex2markdown/`: Logic for importing LaTeX into VibePaper.
- `.agents/skills/markdown-helper/`: Interactive writing assistance.
- `.agents/skills/markdown-review/`: Quality assurance and structural checks.
- `.agents/skills/markdown2latex/`: High-quality LaTeX export conversion.
- `.agents/skills/relatedwork-finder/`: Automated literature search and BibTeX management.

## CONVENTIONS
###### Strict formatting and metadata requirements
<!-- description: Coding and writing standards -->
- Levels 1-5 (`#` to `#####`) are for structural organization only.
- Level 6 (`######`) is the only level permitted for paragraph content.
- Topic sentences (Level 6 titles) must be ≤ 50 characters.
- Supporting content (paragraph body) must be ≤ 500 characters.
- Metadata must use HTML comments: `<!-- description: ... -->`.

## ANTI-PATTERNS
###### Common mistakes and forbidden actions
<!-- description: What to avoid during development and writing -->
- Do not modify 2-5 level headings in `paper.md`.
- Do not write body text directly under levels 1-5.
- Do not use `.github/skills/` (incorrect path in some docs); use `.agents/skills/`.
- Do not rely on AI for meaningful content generation; use it for optimization and checking.

## COMMANDS
###### Primary interaction triggers
<!-- description: Essential commands for agent interaction -->
- `help me write the paper`: Activates `markdown-helper`.
- `find related work`: Triggers `relatedwork-finder`.
- `check the novelty of this paper`: Invokes novelty checking logic.

## NOTES
###### Important implementation details
<!-- description: Miscellaneous critical information -->
- LaTeX support: Use `$...$` for inline and `$$...$$` for block formulas.
- Node expansion: Nodes ending in numbers (e.g., "Challenge 1") can be duplicated.
- Image handling: JPG/PNG/GIF supported, max 5MB, stored in `fig/`.
