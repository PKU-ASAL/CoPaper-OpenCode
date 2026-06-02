# Repository Atlas: CoPaper

<!-- description: Master architecture map for the repository. -->

## Project Responsibility

<!-- description: System-level role and scope. -->

###### Structured academic workflow platform

CoPaper combines a Python `copaper` CLI, scaffolded agent skills, project-state files, related-work automation, and an OpenCode plugin so researchers can manage a six-phase paper workflow with reproducible state and explicit artifact readiness.

###### Dual runtime architecture

The Python package owns canonical workflow operations and scaffold data. The TypeScript OpenCode package wraps those capabilities with plugin tools, managed commands, dashboards, agent profiles, permission boundaries, and selected direct file inspectors.

## System Entry Points

<!-- description: Primary files to inspect first. -->

###### Python CLI runtime

`copaper/cli.py` defines the `copaper` command tree, including project init, status, phase updates, event logs, reports, Git-backed phase commands, and `relatedwork` subcommands.

###### OpenCode plugin runtime

`packages/opencode-plugin/src/index.ts` exports the OpenCode plugin, injects CoPaper subagents, and registers `copaper_*` tools for dashboards, artifact status, workflow updates, checker records, related-work operations, and import extraction.

###### Package metadata

`pyproject.toml` packages the Python CLI and scaffold bundle. `packages/opencode-plugin/package.json` defines the npm package, plugin export, CLI binary, Bun scripts, dependencies, and release file set.

###### Agent-facing guidance

`AGENTS.md` defines repository conventions. `.agents/skills/` is the source skill library; `copaper/scaffold/skills/` is the packaged mirror copied by `copaper init`.

## Repository Directory Map

<!-- description: Aggregated folder responsibilities. -->

###### `copaper/`

Python runtime package for CLI commands, state persistence, event logs, scaffold copying, literature metadata, related-work LLM/search/download/summarization, checker tracking, cross-indexing, Git operations, and reports. Detailed map: [copaper/codemap.md](copaper/codemap.md).

###### `packages/`

Integration package workspace. It currently contains the OpenCode integration package published as `@copaper/opencode`. Detailed map: [packages/codemap.md](packages/codemap.md).

###### `packages/opencode-plugin/`

Bun/TypeScript OpenCode plugin package with plugin export, installer CLI, managed slash commands, agent profiles, dashboards, status tools, Python bridge, tests, build output, and packaging artifacts. Detailed map: [packages/opencode-plugin/codemap.md](packages/opencode-plugin/codemap.md).

###### `packages/opencode-plugin/src/`

TypeScript source for plugin registration, tool handlers, config parsing, project init, readiness dashboards, workflow/checker/artifact state updates, related-work bridge calls, import extraction, i18n, and safety utilities. Detailed map: [packages/opencode-plugin/src/codemap.md](packages/opencode-plugin/src/codemap.md).

###### `.agents/skills/`

Source skill library for storyline, literature, discussion, experiments, writing, review, conversion, checkers, submission, humanization, and CoPaper management. Tests enforce mirrored `SKILL.md` files in `copaper/scaffold/skills/`.

###### `tests/`

Pytest suite for Python CLI behavior, state/event persistence, scaffold copying, literature metadata, related-work workflows, cross-indexing, checker integration, Git helpers, reports, and skill conventions.

###### Root templates and docs

`storyline.md`, `paper.md`, and `writingrules.md` are starter artifacts copied into projects. `workflow-dataflow.md` records maintainer-level artifact and phase flow analysis. `README.md` documents usage in Chinese.

## Cross-System Flow

<!-- description: How the main subsystems interact. -->

###### Project bootstrap

`copaper init` or the plugin's `copaper_init_apply` creates project artifacts, `.agents/state.json`, `.agents/events.jsonl`, and skill assets. The Python scaffold copies bundled files; the plugin templates write a TypeScript-managed equivalent for OpenCode workflows.

###### Workflow state loop

Both runtimes read and write `.agents/state.json` and `.agents/events.jsonl`. Python does this through `StateManager` and `EventLogger`; the plugin uses TypeScript atomic writes and canonical event appenders for confirmed state-changing tools.

###### Literature pipeline

The Python CLI owns Semantic Scholar search, BibTeX sync, PDF download, LLM keyword extraction, LLM summarization, and cross-index construction. The plugin exposes those operations through `relatedwork-tools.ts`, which executes `copaper relatedwork ...` via `python-bridge.ts`.

###### Agent workflow loop

OpenCode loads the plugin, receives CoPaper subagent profiles, and uses permission profiles to separate read-only coordination from storyline edits, paper edits, state recording, and literature writes. Skills guide agents to prefer plugin tools over direct state edits.

## Design Constraints

<!-- description: Architectural invariants to preserve. -->

###### Non-destructive scaffolding

Existing user-authored `storyline.md`, `paper.md`, `writingrules.md`, `AGENTS.md`, and skill directories must not be overwritten accidentally. Managed command files and config patches use markers, backups, or explicit force options.

###### Structured paper format

Levels 1-5 are structural, Level 6 headings carry paragraph topics, and body text belongs only below Level 6 headings. These constraints shape starter files, skill behavior, checker expectations, and paper conversion workflows.

###### Shared state contract

`.agents/state.json`, `.agents/events.jsonl`, `relatedwork/literature.json`, `relatedwork/paper_list.bib`, `relatedwork/papers/`, and `.agents/cross_index.json` are the integration contract between CLI, plugin, skills, and reports.

###### Source and scaffold sync

Changes to `.agents/skills/` must be mirrored to `copaper/scaffold/skills/`; scaffold tests compare source and packaged skill files byte-for-byte.

## Quality Gates

<!-- description: Main validation commands. -->

###### Python tests

Use `pytest tests/` for CLI, state, event log, scaffold, related-work, checker, Git, report, and skill convention validation.

###### Plugin tests

Use `bun run test`, `bun run typecheck`, and `bun run build` in `packages/opencode-plugin/` for tool behavior, package smoke, TypeScript correctness, and distributable output.

###### Codemap state

`.slim/codemap.json` records hashes for core files selected by the codemap workflow. Re-run the codemap change detector after major edits and update affected `codemap.md` files.
