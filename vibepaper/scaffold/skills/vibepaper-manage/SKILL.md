---
name: vibepaper-manage
description: Teaches agents how to manage a VibePaper project through the `vibe` CLI, including project initialization, status checks, phase skipping, event log inspection, reports, and Git-backed phase operations. Use this skill whenever the task is about workflow/state management rather than direct paper writing.
---

# VibePaper-Manage Skill

This skill tells an agent how to manage a VibePaper project through the `vibe` CLI instead of manually editing workflow files.

Use this skill when the task is about project lifecycle management, scaffold initialization, workflow status, phase control, reports, or Git-backed phase operations.

## When to Use This Skill

Use this skill when the user asks to:

- initialize a VibePaper project in any folder
- check current workflow status
- skip a phase with a reason
- inspect the event log
- generate a weekly/progress report
- compare two phase snapshots
- create a phase-aware commit
- rollback to the latest commit of a phase
- automate project setup for a new paper repository

Typical triggers:

- `initialize a vibepaper project`
- `用 vibe 初始化论文项目`
- `check vibe status`
- `skip experiments for this project`
- `generate a vibe report`
- `manage this paper with vibe cli`

## Core Principle

Prefer the `vibe` CLI for workflow management.

Do **not** hand-edit these files when the CLI already supports the action:

- `.agents/state.json`
- `.agents/events.jsonl`

The CLI is the supported automation surface and keeps workflow state, event logs, and Git-backed operations consistent.

## Command Surface

The currently supported commands are:

- `init`
- `status`
- `commit`
- `rollback`
- `log`
- `skip`
- `report`
- `diff`

Use `python -m vibepaper ...` only when `vibe` is not available on PATH.

## Critical CLI Rules

### Rule 1: `--root` is a global option

`--root` must appear **before** the subcommand.

Correct:

```bash
vibe --root /path/to/project status
vibe --root /path/to/project init --name "My Paper" --domain "software engineering"
```

Incorrect:

```bash
vibe status --root /path/to/project
vibe init --root /path/to/project --name "My Paper" --domain "software engineering"
```

### Rule 2: Use real phase names

Valid phase names are:

- `storyline`
- `literature`
- `discussion`
- `experiments`
- `writing`
- `latex_review`

Do not use stage letters such as `A`, `B`, or `D`.

### Rule 3: Know which commands need Git

- `commit` requires a Git repository
- `rollback` requires a Git repository
- `diff` requires phase commits in Git
- `report` can run without Git, but will report the missing Git repository in the output

## Initialization Workflow

### `vibe init`

Use this to initialize a VibePaper project in the target directory.

Example:

```bash
vibe --root /path/to/project init --name "My Paper" --domain "software engineering"
```

This creates:

- `.agents/state.json`
- `.agents/events.jsonl`
- `.agents/skills/` with the bundled skills
- `storyline.md`
- `writingrules.md`
- `AGENTS.md`

Initialization behavior:

- works in any independent folder
- does not overwrite existing `storyline.md`, `writingrules.md`, `AGENTS.md`, or already-existing skill directories
- prompts before reinitializing when `.agents/state.json` already exists

If `vibe` is not on PATH, use:

```bash
python -m vibepaper --root /path/to/project init --name "My Paper" --domain "software engineering"
```

## Status and Inspection

### `vibe status`

Use this to inspect the project workflow state.

Human-readable:

```bash
vibe --root /path/to/project status
```

JSON output for scripting:

```bash
vibe --root /path/to/project status --json
```

Use `--json` when another tool or agent needs to parse the current phase or phase statuses.

### `vibe log`

Use this to inspect workflow history from `.agents/events.jsonl`.

Examples:

```bash
vibe --root /path/to/project log
vibe --root /path/to/project log --phase storyline
vibe --root /path/to/project log --operator user
vibe --root /path/to/project log --last 10
vibe --root /path/to/project log --since 2026-04-01
```

Use this when you need to understand what actions were already performed.

## Phase Control

### `vibe skip`

Use this when a phase should be intentionally skipped.

Example:

```bash
vibe --root /path/to/project skip experiments --reason "the paper is theoretical and does not require experiments"
```

Notes:

- `--reason` is optional in the implementation, but recommended
- the phase argument must be a full phase name
- the skip action is recorded in the event log

## Reporting

### `vibe report`

Use this to generate a progress report.

Examples:

```bash
vibe --root /path/to/project report
vibe --root /path/to/project report --since 2026-04-01
vibe --root /path/to/project report --output progress.md
```

Use this when the user asks for a weekly summary, progress snapshot, or a handoff-style report.

### `vibe diff`

Use this to compare two phase snapshots when commits exist.

Example:

```bash
vibe --root /path/to/project diff storyline writing
```

Use this only when the relevant phases already have commits.

## Git-Backed Phase Operations

### `vibe commit`

Use this to create a phase-aware commit.

Examples:

```bash
vibe --root /path/to/project commit -m "finish storyline draft"
vibe --root /path/to/project commit --phase storyline -m "finish storyline draft"
vibe --root /path/to/project commit --phase writing -m "section draft" --force
```

Behavior:

- if `--phase` is omitted, the CLI tries to read `current_phase` from `.agents/state.json`
- commit message is prefixed with the phase
- Git repository is required

### `vibe rollback`

Use this to rollback to the latest commit associated with a phase.

Examples:

```bash
vibe --root /path/to/project rollback storyline
vibe --root /path/to/project rollback storyline -y
```

Behavior:

- Git repository is required
- the CLI asks for confirmation unless `-y` is used
- phase state is reset after rollback when possible

## Recommended Automation Patterns

### Pattern 1: Bootstrap a new project

1. Create or choose the target directory
2. Run `vibe --root <dir> init --name ... --domain ...`
3. Run `vibe --root <dir> status`
4. Verify scaffolded files exist

### Pattern 2: Safe workflow inspection

1. Run `vibe --root <dir> status --json`
2. Run `vibe --root <dir> log --operator user --last 20`
3. Decide whether to skip/report/commit based on the actual state

### Pattern 3: Skip a non-applicable phase

1. Confirm the phase is genuinely not needed
2. Run `vibe --root <dir> skip <phase> --reason "..."`
3. Re-run `status` to verify the result

### Pattern 4: Git-backed checkpointing

1. Ensure the directory is a Git repository
2. Make the content changes first
3. Run `vibe --root <dir> commit --phase <phase> -m "..."`
4. Use `vibe --root <dir> diff <phase-a> <phase-b>` or `git log` for confirmation

## Decision Rules

Use the CLI action that matches the user intent:

- user wants a project created → `init`
- user wants current progress → `status`
- user wants workflow history → `log`
- user wants to skip a phase → `skip`
- user wants a progress summary → `report`
- user wants phase-to-phase comparison → `diff`
- user wants a tracked milestone commit → `commit`
- user wants to move back to an earlier phase checkpoint → `rollback`

## Must NOT Do

- **NEVER** put `--root` after the subcommand
- **NEVER** use stage letters instead of real phase names
- **NEVER** hand-edit `.agents/state.json` for actions the CLI already supports
- **NEVER** tell the user that `report` requires Git
- **NEVER** run `commit`, `rollback`, or `diff` as if they will work without Git context
- **NEVER** describe outdated init behavior; it now scaffolds skills and starter files

## End Condition

Stop when the requested management action is complete and verified.

Always report:

- which `vibe` command was used
- which project root it targeted
- what files or workflow state changed
- any Git-related limitation that affected the command
