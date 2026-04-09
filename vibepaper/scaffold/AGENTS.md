# AGENTS.md

## OVERVIEW
###### VibePaper: CLI + skills for structured paper workflows
<!-- description: Project purpose and core value proposition -->
VibePaper combines a Python CLI with specialized agent skills for structured academic paper writing.
It manages a six-phase workflow, persists shared project state in `.agents/state.json`, and scaffolds reusable writing assets into any target project directory.
The system prioritizes structural integrity, reproducible workflow state, and skill-guided execution over raw AI generation.

## STRUCTURE
###### Runtime package, scaffold bundle, and skill assets
<!-- description: File organization and structural rules -->
- `vibepaper/`: Python package implementing CLI, state management, event logs, git integration, reports, and scaffold copy logic.
- `.agents/skills/`: Skill library available inside the initialized project.
- `storyline.md`: Research storyline starter template copied by `vibe init`.
- `paper.md`: Paper framework starter template copied by `vibe init`.
- `writingrules.md`: Definitive guide for structural and content constraints.
- `templates/`: Template guidance and LaTeX template drop-in directory.
- `.agents/state.json` and `.agents/events.jsonl`: Shared workflow state and append-only event log.

## WHERE TO LOOK
###### Key workflow files inside an initialized project
<!-- description: Critical paths for development and usage -->
- `.agents/skills/vibepaper-manage/`: CLI automation guidance for agents managing the project lifecycle.
- `.agents/skills/storyline-helper/`: Interactive storyline refinement.
- `.agents/skills/writing-orchestrator/`: Writing progress scan and routing.
- `.agents/state.json`: Phase status, git identity, and checker summary.
- `.agents/events.jsonl`: Operational event history.
- `storyline.md` and `paper.md`: Human-authored core content.

## CONVENTIONS
###### CLI and document handling rules
<!-- description: Coding and writing standards -->
- Levels 1-5 (`#` to `#####`) are for structural organization only.
- Level 6 (`######`) is the only level permitted for paragraph content.
- Topic sentences (Level 6 titles) must be ≤ 50 characters.
- Supporting content (paragraph body) must be ≤ 500 characters.
- Metadata must use HTML comments: `<!-- description: ... -->`.
- `--root` is a global CLI option and must appear before the subcommand.
- Use full phase names (`storyline`, `literature`, `discussion`, `experiments`, `writing`, `latex_review`) rather than stage letters.
- Prefer the CLI to update workflow state instead of manually editing `.agents/state.json` or `.agents/events.jsonl`.

## ANTI-PATTERNS
###### Common mistakes in the current implementation
<!-- description: What to avoid during development and writing -->
- Do not modify 2-5 level headings in `paper.md`.
- Do not write body text directly under levels 1-5.
- Do not use `.github/skills/` (incorrect path in some docs); use `.agents/skills/`.
- Do not rely on AI for meaningful content generation; use it for optimization and checking.
- Do not place `--root` after subcommands such as `init` or `status`.
- Do not assume `commit`, `rollback`, or `diff` work outside a Git repository.
- Do not assume `report` requires Git; it runs without Git and reports the missing repository in the output.

## COMMANDS
###### Current CLI behaviors agents should rely on
<!-- description: Essential commands for agent interaction -->
- `vibe --root <project-dir> init --name "<project>" --domain "<domain>"`: Initializes a project in any directory and scaffolds `.agents/skills/`, `storyline.md`, `paper.md`, `writingrules.md`, and `AGENTS.md`.
- `vibe --root <project-dir> status [--json]`: Reads workflow status from `.agents/state.json` and recomputes `current_phase` from actual phase statuses.
- `vibe --root <project-dir> set-phase <phase> --status <status> [--reason <reason>]`: Explicitly sets a phase status and recomputes `current_phase`.
- `vibe --root <project-dir> skip <phase> --reason "<reason>"`: Marks a phase as skipped.
- `vibe --root <project-dir> log [--phase ...] [--operator ...] [--last N]`: Queries the event log.
- `vibe --root <project-dir> report [--since YYYY-MM-DD] [--output file]`: Generates a progress report.
- `vibe --root <project-dir> relatedwork status|import|sync-bib|download|register-summary|build-index ...`: Manages canonical literature metadata in `relatedwork/literature.json`, synchronizes `relatedwork/paper_list.bib`, downloads PDFs, registers summaries, and rebuilds `.agents/cross_index.json`.
- `vibe --root <project-dir> commit -m "<message>" [--phase <phase>]`, `vibe --root <project-dir> rollback <phase>`, and `vibe --root <project-dir> diff <phase-a> <phase-b>`: Git-backed phase management commands.

## NOTES
###### Current version notes
<!-- description: Miscellaneous critical information -->
- LaTeX support: Use `$...$` for inline and `$$...$$` for block formulas.
- Node expansion: Nodes ending in numbers (e.g., "Challenge 1") can be duplicated.
- Image handling: JPG/PNG/GIF supported, max 5MB, stored in `fig/`.
- `vibe init` is intentionally non-destructive for existing `storyline.md`, `paper.md`, `writingrules.md`, `AGENTS.md`, and already-present skill directories.
- `current_phase` is derived from actual phase statuses during CLI status updates instead of staying fixed at the init-time default.
- Canonical per-paper literature metadata now lives in `relatedwork/literature.json`; `.agents/state.json` keeps only aggregate literature progress counters.
