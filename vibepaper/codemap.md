# vibepaper/

<!-- description: Runtime package architecture map. -->

## Responsibility

<!-- description: Folder-level runtime role. -->

###### CLI-centered workflow runtime

`vibepaper/` implements the `vibe` command, project state persistence, append-only event logging, scaffold copying, related-work automation, checker status tracking, Git-backed phase operations, reports, and OpenAI-compatible LLM helpers for structured paper workflows.

###### Six-phase project coordinator

The package models the workflow as `storyline`, `literature`, `discussion`, `experiments`, `writing`, and `latex_review`. It stores durable progress in `.agents/state.json`, records operations in `.agents/events.jsonl`, and treats generated artifacts such as `relatedwork/literature.json` and `.agents/cross_index.json` as phase evidence.

## Design Patterns

<!-- description: Main architectural patterns. -->

###### Click command facade

`vibepaper/cli.py` is the command facade. It keeps user I/O, validation, and exit behavior at the boundary while delegating durable state to `StateManager`, event writes to `EventLogger`, related-work storage to `LiteratureCatalog`, and specialized jobs to small pipeline modules.

###### Manager objects over JSON files

`vibepaper/state.py`, `vibepaper/eventlog.py`, `vibepaper/literature.py`, `vibepaper/git_ops.py`, and `vibepaper/checker_integration.py` wrap individual storage or integration concerns. State and literature writes use atomic replace patterns; the event log uses append-only JSON Lines plus simple rotation.

###### Lazy external dependencies

CLI commands import costly or optional integrations only when invoked. Semantic Scholar calls live in `vibepaper/relatedwork_search.py`, OpenAI client creation in `vibepaper/llm_client.py`, PDF parsing in `vibepaper/relatedwork_summarize.py`, and GitPython access in `vibepaper/git_ops.py`.

###### Dataclass job results

Batch-style operations return structured outcomes instead of printing internally. `SearchOutcome`, `KeywordsOutcome`, `DownloadResult`, `SummarizeOutcome`, `SummaryResult`, and `CleanOutcome` let CLI commands log events, update phase counters, and render concise user-facing summaries.

## Data & Control Flow

<!-- description: Runtime data movement. -->

###### Project initialization

`vibe --root <dir> init` creates `.agents/state.json` through `StateManager.init_project`, copies bundled assets through `scaffold_project`, creates `.agents/skills/`, starter markdown files, and `AGENTS.md`, then logs an `init_project` event.

###### State and event updates

Status-changing commands load `.agents/state.json`, mutate phase fields, recompute `current_phase` from actual statuses, save atomically, and append an event. `status` also recomputes before display so stale `current_phase` values are corrected from persisted phase state.

###### Related-work pipeline

`relatedwork keywords` reads `storyline.md` or `paper.md`, asks the LLM for queries, and writes `relatedwork/queries.txt`. `relatedwork search` calls Semantic Scholar and writes `relatedwork/search_cache.json`; `import` normalizes records into `relatedwork/literature.json`; `sync-bib` reconciles `relatedwork/paper_list.bib`.

###### PDFs, summaries, and index

`relatedwork download` selects pending catalog entries, downloads and validates PDFs into `relatedwork/pdfs/`, and updates download status. `summarize` extracts PDF text, fills the related-work template via the LLM, writes `relatedwork/papers/<paper_id>.md`, registers summaries, and `build-index` creates `.agents/cross_index.json`.

###### Reports and Git control

`commit`, `rollback`, and `diff` route through `GitManager` for phase-prefixed commits, soft reset rollback, and phase-to-phase diffs. `report` loads state, reads phase-tagged commits and event statistics, and emits Markdown without requiring Git availability for the event/state portions.

###### Checker and discussion flow

Checker skills can be tracked through `CheckerTracker`, which stores latest severity counts and resolved issue IDs in `.agents/state.json`. `parse_checker_output` extracts `[CRITICAL]`, `[MAJOR]`, and `[MINOR]` issues from AI comment blocks, while `dimensions.py` provides checker-aligned Socratic dimensions.

## Integration Points

<!-- description: External and internal boundaries. -->

###### Command-line entry points

`vibepaper/cli.py` exposes the Click command tree used by the installed `vibe` command. `vibepaper/__main__.py` forwards `python -m vibepaper` to the same command group, and `vibepaper/__init__.py` exports version, phase enums, phase order, dependencies, and state schema.

###### Filesystem contract

The runtime expects project artifacts relative to `--root`: `.agents/state.json`, `.agents/events.jsonl`, `.agents/skills/`, `storyline.md`, `paper.md`, `writingrules.md`, `relatedwork/literature.json`, `relatedwork/paper_list.bib`, `relatedwork/pdfs/`, `relatedwork/papers/`, and `.agents/cross_index.json`.

###### External services and libraries

Semantic Scholar integration uses `S2_API_KEY`, `SEMANTIC_SCHOLAR_API_KEY`, and optional `S2_API_BASE`. LLM integration uses `OPENAI_API_KEY`, optional `OPENAI_BASE_URL`, and `VIBEPAPER_MODEL`. PDF summarization depends on `pypdf`; Git operations and identity detection depend on GitPython.

###### Scaffold and skills

`vibepaper/scaffold.py` copies package data from `vibepaper/scaffold/` into target projects. It is intentionally non-destructive for existing starter files and skill directories, but refreshes the skills-level `AGENTS.md` so scaffolded skill guidance stays current.

## Key Files

<!-- description: Important package modules. -->

###### CLI and workflow schema

`vibepaper/cli.py` defines all `vibe` commands and subcommands. `vibepaper/constants.py` defines phase enums, statuses, order, and dependencies. `vibepaper/schema.py` defines the JSON-shaped state schema and default project state.

###### Persistence modules

`vibepaper/state.py` owns `.agents/state.json` lifecycle and phase helpers. `vibepaper/eventlog.py` owns append/query/export for `.agents/events.jsonl`. `vibepaper/literature.py` owns canonical related-work metadata, BibTeX sync, artifact status refresh, summary registration, and cross-index delegation.

###### Related-work modules

`vibepaper/relatedwork_keywords.py` extracts search queries with the LLM. `vibepaper/relatedwork_search.py` queries Semantic Scholar and caches normalized records. `vibepaper/relatedwork_download.py` downloads and validates PDFs. `vibepaper/relatedwork_summarize.py` extracts PDF text and writes LLM summaries. `vibepaper/relatedwork_clean.py` resets related-work artifacts.

###### Index, checkers, and discussion

`vibepaper/crossindex.py` builds and queries paper-to-topic mappings. `vibepaper/checker_integration.py` records checker outcomes and parses AI comments. `vibepaper/dimensions.py` defines checker-aligned discussion dimensions and Socratic question banks.

###### Git, reporting, and LLM

`vibepaper/git_ops.py` wraps GitPython for phase commits, rollback, diffs, and committer lookup. `vibepaper/report.py` builds weekly progress and phase diff reports. `vibepaper/identity.py` detects Git identity and roles. `vibepaper/llm_client.py` resolves OpenAI-compatible config and rate limits batch LLM calls.

###### Package entry and scaffold

`vibepaper/scaffold.py` copies bundled project assets from `vibepaper/scaffold/`. `vibepaper/__main__.py` enables module execution. `vibepaper/__init__.py` exposes the public package constants used by callers and tests.
