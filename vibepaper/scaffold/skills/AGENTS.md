# AGENTS.md (Skills)

## OVERVIEW
###### Skill catalog for writing and workflow automation
<!-- description: Purpose of the skills directory and its role in VibePaper -->
The `.agents/skills/` directory contains the reusable skill library shipped with VibePaper.
Each skill is a self-contained module that extends the agent's capabilities for a specific academic task or workflow-management task.
These skills are bundled into initialized projects by `vibe init`.

## STRUCTURE
###### Standardized skill module organization
<!-- description: Internal organization of each skill folder -->
- `SKILL.md`: The core definition file containing YAML frontmatter and instructions.
- `README.md`: (Optional) User-facing documentation for the skill.
- `scripts/`: (Optional) Supporting automation or processing scripts.
- `template.md`: (Optional) extra prompt/template material used by a specific skill.

## WHERE TO LOOK
###### Important skills in the current catalog
<!-- description: Catalog of skills in this directory -->
- `vibepaper-manage`: Teaches agents how to call the `vibe` CLI for init/status/set-phase/skip/log/report/diff/commit/rollback workflows.
- `human-comment-helper`: Adds structured reviewer feedback and synthetic examples.
- `latex2markdown`: Imports content from LaTeX files into the VibePaper structure.
- `markdown-helper`: Interactive assistance for writing and improving `paper.md`.
- `markdown-review`: Quality assurance check for novelty, importance, and correctness.
- `markdown2latex`: High-quality export from `paper.md` to conference-ready LaTeX.
- `relatedwork-finder`: Automated literature search and BibTeX/summary generation.
- `storyline-helper`: Interactive, section-by-section guidance for constructing and refining the research storyline in `storyline.md`, including reverse extraction from `paper.md`.
- `writing-orchestrator`: Scans `paper.md`, recommends the next section, and routes work into drafting/review skills.
- `submission-precheck`: Runs a final submission-oriented quality pass.

## CONVENTIONS
###### Requirements for skill definition and activation
<!-- description: Rules for creating and triggering skills -->
- **YAML Frontmatter**: Every `SKILL.md` must start with `name` and `description`.
- **Triggers**: Skills are activated via natural language (e.g., "help me write", "find related work").
- **Quality Gates**: Use `markdown-review` to validate content before final export.
- **Format Mapping**: Conversion skills must maintain semantic meaning across formats.
- **Math Support**: Preserve `$...$` and `$$...$$` during all transformations.
- **CLI Accuracy**: Any skill that instructs agents to use `vibe` must match the actual commands implemented in `vibepaper/cli.py`.
- **Scaffold Sync**: New or changed skills must be mirrored into the packaged scaffold.

## ANTI-PATTERNS
###### Common mistakes in skill usage and development
<!-- description: What to avoid when working with skills -->
- Do not bypass `writingrules.md` constraints in any skill logic.
- Do not modify Level 1-5 headers during automated content insertion.
- Do not generate final paper content without user-provided insights or data.
- Do not use absolute paths; always use relative paths from the workspace root.
- Do not duplicate core structural rules already defined in the root `AGENTS.md`.
- Do not document nonexistent CLI options or outdated command syntax.
- Do not tell agents to edit `.agents/state.json` directly when `vibe` already supports the workflow update.
- Do not forget that `--root` must be placed before the subcommand.
