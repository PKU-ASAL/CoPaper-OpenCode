# AGENTS.md

## Purpose
- This is the development repo for VibePaper: a Python CLI plus OpenCode skills for structured academic paper workflows.
- `vibe` and `python -m vibepaper` both enter `vibepaper.cli:main`; `vibepaper/` is the runtime package.
- `vibepaper/scaffold/` is bundled package data copied into new projects by `vibe init`.
- `.agents/skills/` is the source skill library; each skill is discovered through `SKILL.md` YAML frontmatter.

## Setup And Checks
- Install for development from the repo root with `pip install -e .[dev]` on Python `>=3.10`.
- Run all tests with `python -m pytest tests/ -v`; coverage uses `python -m pytest tests/ --cov=vibepaper --cov-report=term`.
- Focused checks: `python -m pytest tests/test_cli.py -v`, `python -m pytest tests/test_scaffold.py -v`, `python -m pytest tests/test_skill_conventions.py -v`.
- There is no Makefile, task runner, CI workflow, pre-commit config, ruff config, mypy config, or formatter config; `pyproject.toml` and pytest are the executable sources of truth.

## Where To Look
- `vibepaper/cli.py`: Click command surface, including global `--root`, related-work commands, and Git-backed commands.
- `vibepaper/state.py`, `vibepaper/schema.py`, `vibepaper/constants.py`: workflow state shape, phase names, statuses, order, and dependencies.
- `vibepaper/scaffold.py`: non-destructive scaffold copying used by `vibe init`.
- `vibepaper/literature.py`, `vibepaper/crossindex.py`, `vibepaper/relatedwork_download.py`: related-work catalog, cross-index, and PDF download behavior.
- `vibepaper/eventlog.py`, `vibepaper/git_ops.py`, `vibepaper/report.py`: event logging, phase commits/rollback/diff, and reports.
- `tests/acceptance_checklist.md`: manual end-to-end workflow checks when CLI behavior changes.

## CLI Gotchas
- `--root` is a global Click option and must appear before the subcommand: `vibe --root <dir> status`, not `vibe status --root <dir>`.
- Use full phase names only: `storyline`, `literature`, `discussion`, `experiments`, `writing`, `latex_review`.
- Prefer CLI commands over hand-editing `.agents/state.json` or `.agents/events.jsonl`; `status`, `set-phase`, `skip`, and related-work commands recompute derived state.
- `vibe skip <phase> --reason "..."` should include a reason, though the CLI allows omitting it.
- `vibe commit`, `vibe rollback`, and `vibe diff` require a Git repo; `vibe report` still runs without Git and reports the missing Git summary.
- `vibe commit -m "..." --force` creates an empty phase commit; `vibe rollback <phase> -y` skips confirmation and uses a soft reset.
- `vibe init` is intentionally non-destructive for existing `storyline.md`, `paper.md`, `writingrules.md`, `AGENTS.md`, and existing skill directories.

## Related Work And Runtime State
- `relatedwork/literature.json` is the canonical per-paper catalog; `.agents/state.json` stores only aggregate literature counters.
- `vibe relatedwork import --input <json>` expects a JSON array of paper records or an object with a `papers` array, such as serper/arXiv cache output.
- `vibe relatedwork sync-bib` synchronizes `relatedwork/paper_list.bib`; `vibe relatedwork build-index` writes `.agents/cross_index.json` from `relatedwork/papers/*.md`.
- `.agents/events.jsonl` is append-only JSONL and rotates at 10 MB to `.agents/events.jsonl.1`.
- `.gitignore` hides important runtime artifacts: `relatedwork/`, `fig/`, `.agents/state.json`, `.agents/events.jsonl`, `.sisyphus`, local `opencode*` files, and root-level draft paper files; do not rely on `git status` to find them.

## Skill And Scaffold Rules
- There are 23 source skills, including `relatedwork-summarizer`; the older "22 skills" wording in docs is stale.
- When changing `.agents/skills/<skill>/SKILL.md` or checker `examples.md`, mirror the same change under `vibepaper/scaffold/skills/<skill>/`.
- Run `python -m pytest tests/test_skill_conventions.py -v` after skill edits; it catches missing `## Input Files`, bad `writingrules.md` read policies, checker example drift, and source/scaffold mismatches.
- Run `python -m pytest tests/test_scaffold.py -v` after changes to `vibepaper/scaffold/`, scaffold starters, or `vibe init` behavior.
- Do not use `.github/skills/`; this repo uses `.agents/skills/`.
- Keep root `AGENTS.md` development-focused. `vibepaper/scaffold/AGENTS.md` is intentionally different because it is copied into new paper-writing projects.
- Paper structure rules belong in `writingrules.md`; do not duplicate long writing-format tutorials here.

## Branch Boundary
- `main` is the full development branch with Python code, tests, scaffold assets, and all skills.
- `vibepaper-opencode` is a stripped consumer-facing branch with only docs, templates, and a small skill subset; edits on `main` do not automatically update that branch.
