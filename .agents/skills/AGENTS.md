# AGENTS.md (Skills)

## OVERVIEW
###### Specialized functional modules for academic paper lifecycle
<!-- description: Purpose of the skills directory and its role in VibePaper -->
The `.agents/skills/` directory contains specialized logic for paper writing, review, and conversion.
Each skill is a self-contained module that extends the agent's capabilities for specific academic tasks.
Skills prioritize structural adherence to `writingrules.md` and `paper.md` templates.

## STRUCTURE
###### Standardized skill module organization
<!-- description: Internal organization of each skill folder -->
- `SKILL.md`: The core definition file containing YAML frontmatter and instructions.
- `README.md`: (Optional) User-facing documentation for the skill.
- `scripts/`: (Optional) Supporting automation or processing scripts.

## WHERE TO LOOK
###### Available skills and their primary functions
<!-- description: Catalog of skills in this directory -->
- `human-comment-helper`: Adds structured reviewer feedback and synthetic examples.
- `latex2markdown`: Imports content from LaTeX files into the VibePaper structure.
- `markdown-helper`: Interactive assistance for writing and improving `paper.md`.
- `markdown-review`: Quality assurance check for novelty, importance, and correctness.
- `markdown2latex`: High-quality export from `paper.md` to conference-ready LaTeX.
- `relatedwork-finder`: Automated literature search and BibTeX/summary generation.
- `storyline-helper`: Interactive, section-by-section guidance for constructing and refining the research storyline in `storyline.md`.

## CONVENTIONS
###### Requirements for skill definition and activation
<!-- description: Rules for creating and triggering skills -->
- **YAML Frontmatter**: Every `SKILL.md` must start with `name` and `description`.
- **Triggers**: Skills are activated via natural language (e.g., "help me write", "find related work").
- **Quality Gates**: Use `markdown-review` to validate content before final export.
- **Format Mapping**: Conversion skills must maintain semantic meaning across formats.
- **Math Support**: Preserve `$...$` and `$$...$$` during all transformations.

## ANTI-PATTERNS
###### Common mistakes in skill usage and development
<!-- description: What to avoid when working with skills -->
- Do not bypass `writingrules.md` constraints in any skill logic.
- Do not modify Level 1-5 headers during automated content insertion.
- Do not generate final paper content without user-provided insights or data.
- Do not use absolute paths; always use relative paths from the workspace root.
- Do not duplicate core structural rules already defined in the root `AGENTS.md`.
