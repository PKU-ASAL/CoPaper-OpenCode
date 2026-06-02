# packages/opencode-plugin/src/

## Responsibility

###### OpenCode integration layer
This folder implements the CoPaper OpenCode plugin, local installer CLI, slash-command templates, managed subagent injection, and tool handlers that expose CoPaper project status and controlled state updates inside OpenCode.

###### CoPaper project operations
It bridges OpenCode to CoPaper artifacts: project initialization, readiness dashboards, workflow phase state, checker records, artifact readiness records, related-work workflows, structure status, and read-only PDF/PPTX extraction.

###### Safety boundary
Most tools are read-only. State-writing tools validate agent identity, paths, inputs, event-log targets, and user-confirmed arguments before touching `.agents/state.json`, `.agents/events.jsonl`, or generated project files.

## Design Patterns

###### Thin tool registry
`index.ts` registers every `copaper_*` tool with OpenCode schemas, then delegates to focused modules that return typed result objects and render human-readable Markdown plus JSON payloads.

###### Build and render split
Status modules follow `build*Result` plus `render*Output` pairs. Builders detect roots, inspect files, normalize errors, and produce schema-versioned results; renderers handle localized tables and summaries.

###### Preflight before writes
Write paths use readiness checks, conflict detection, canonical event-log validation, symlink/non-file rejection, inside-root assertions, and atomic writes before changing project or OpenCode config files.

###### Managed overlay
Agent and command injection are treated as an overlay: existing unmanaged user config is retained, CoPaper-managed fingerprints/markers identify safe replacements, and conflicts become diagnostics instead of overwrites.

###### Python command facade
Related-work write tools are TypeScript facades over the Python `copaper` CLI. The bridge resolves `.venv/bin/copaper` first, falls back to `uv run --project <root> copaper`, captures bounded output, and reports structured errors.

## Data & Control Flow

###### Plugin startup
`CoPaperPlugin` logs initialization, filters previously injected agents from user config, calls `buildCoPaperAgentConfig`, records runtime diagnostics, injects current agents, and registers all OpenCode tools.

###### Dashboard path
`copaper_dashboard` runs `doctor`, derives installation health, inspects readiness, builds an init preview, and, only for ready roots, includes artifact status, workflow status, and recent workflow log entries.

###### Initialization path
The installer CLI updates OpenCode config and slash-command files. The plugin init tool separately creates CoPaper project files from templates after checking `readiness` and `init-preview` conflicts.

###### State update path
Workflow, checker, and artifact record tools read `.agents/state.json`, validate requested changes, write updated state atomically, then append canonical JSONL events to `.agents/events.jsonl` when preflight succeeds.

###### Related-work path
Related-work tools detect the root, assemble `copaper relatedwork ...` args, run the Python bridge with per-command timeouts, refresh related-work status, and patch literature phase counters plus events for write subcommands.

###### Import extraction path
PDF/PPTX extractors require explicit in-project paths, enforce extension and size limits, reject symlinks/non-files, hash sources, extract best-effort text locally, and never scan or mutate project state.

## Integration Points

###### OpenCode plugin API
`index.ts` uses `@opencode-ai/plugin` to provide the config hook and tool map. OpenCode supplies `directory`, `worktree`, `client`, `context.directory`, `context.worktree`, and `context.agent`.

###### OpenCode project files
`installer.ts`, `config.ts`, and `templates.ts` manage `opencode.json`/`opencode.jsonc` plugin entries and `.opencode/commands/{copaper,copaper-doctor,copaper-relatedwork}.md` command wrappers with CoPaper markers.

###### CoPaper artifacts
Readiness and status modules inspect `paper.md`, `storyline.md`, `writingrules.md`, `AGENTS.md`, `.agents/state.json`, `.agents/events.jsonl`, `.agents/precheck_report.md`, `.agents/cross_index.json`, and `relatedwork/` files.

###### Python CLI bridge
`python-bridge.ts` is used by `relatedwork-tools.ts` and `doctor.ts` to locate and run `copaper`, surface `copaper-cli-unavailable`, `bridge-timeout`, spawn failures, and nonzero exits without hiding stdout/stderr.

###### Config and i18n
`copaper-config.ts` reads `.opencode/copaper.json` for locale, default model/temperature, and per-agent overrides. `i18n.ts` resolves `zh-CN`/`en-US` text via explicit locale or `COPAPER_LANG`.

## Key Files

###### Entry and registration
- `index.ts`: OpenCode plugin entry, agent injection hook, and complete `copaper_*` tool registration.
- `cli.ts`: `copaper-opencode init|doctor` Bun CLI wrapper for installation and diagnostics.

###### Agent injection
- `agent-config.ts`: merges default agent profiles with `.opencode/copaper.json`, detects name conflicts, and builds OpenCode agent configs.
- `agent-profiles.ts`: defines CoPaper subagent roles, prompts, boundaries, and default permission profiles.
- `permission-profiles.ts`: read/write permission matrices for read-only, storyline, paper, recorder, and literature agents.
- `agent-diagnostics.ts`: stores latest runtime agent state and converts diagnostics into doctor checks.

###### Install and doctor
- `installer.ts`: plans/applies OpenCode config and command-file installation with backups and force rules.
- `doctor.ts`: verifies root, config, plugin entry, command files, Python CLI availability, and injected-agent health.
- `templates.ts`: renders managed slash-command templates and marker checks.

###### Dashboard and readiness
- `dashboard.ts`: composes doctor, readiness, init preview, artifact, workflow, and recent event summaries.
- `readiness.ts`: classifies required and optional CoPaper files as ready, missing, blocked, invalid, user-owned, or managed.
- `init-preview.ts`: converts readiness into safe init actions for project scaffolding.
- `project-init.ts` and `project-templates.ts`: write initial CoPaper project files and state after conflict preflight.

###### Workflow and records
- `workflow.ts`: reads workflow status/logs, sets phase statuses, recomputes current phase, patches phase metadata, and appends events.
- `artifact-record.ts`: records artifact readiness with content hashes and canonical event-log writes.
- `checker-record.ts`: records checker results with severity counts, issue metadata, provenance, and events.

###### Status tools
- `artifacts.ts`: scans storyline, paper, relatedwork, cross-index, skills, checker reports, recorded readiness, and recommendations.
- `checker-status.ts`: summarizes checker state and stale precheck reports relative to `paper.md`.
- `relatedwork-status.ts`: inspects catalog, BibTeX, PDFs, summaries, search cache, queries, and cross-index counts.
- `paper-structure.ts` and `storyline-structure.ts`: parse Markdown structure, completion targets, TODO coverage, and violations.

###### Related work bridge
- `relatedwork-tools.ts`: builds relatedwork CLI invocations, refreshes status, and patches literature phase counters/events.
- `python-bridge.ts`: resolves and executes the Python `copaper` CLI with timeout, env cleanup, command display, and bounded stream capture.

###### Import extraction
- `pdf-extract.ts`: extracts text from explicit in-root PDFs using PDF text operators and Flate streams.
- `ppt-extract.ts`: extracts slide and optional notes text from explicit in-root PPTX ZIP/XML content.

###### Utilities and types
- `root.ts`: detects project roots from explicit root, OpenCode config/command marker, worktree, git root, or cwd.
- `fs-utils.ts`: central inside-root checks, backup paths, and atomic writes.
- `config.ts`: JSONC-safe OpenCode plugin config merge logic.
- `i18n.ts`: localized message catalog and locale resolution.
- `types.ts`: shared constants, result schemas, tool option types, and validation enums.
