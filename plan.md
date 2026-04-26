# VibePaper OpenCode Plugin Development Plan

## 1. Product Direction

VibePaper will be rebuilt as a global OpenCode plugin. The plugin is the primary runtime for project initialization, workflow management, writing orchestration, agent/task lifecycle, context memory, dashboard UX, and harness safety.

The existing Python CLI is legacy. It should not receive new features. It can remain temporarily as implementation reference and test oracle, but the end state is full removal of the Python CLI runtime.

## 2. Confirmed Decisions

- The plugin is installed globally; initialized projects store only project configuration, state, memory, events, and artifacts.
- Runtime state moves from `.agents/state.json` to `.vibepaper/state.json`.
- Python CLI will eventually be fully removed, not kept as a permanent compatibility layer.
- Phase is used for progress tracking, project memory, dashboard display, and context injection. Phase is not the basis for hard write restrictions.
- Start with Markdown dashboard UX, then build TUI after the data model and renderer are stable.
- Critical workflows are plugin-managed from the beginning. Skills remain as auxiliary cognitive protocols, prompts, or agent personas.
- Keep `storyline.md` as a human-readable project storyline artifact.
- `/vibeinit` creates minimal `paper.md`, `storyline.md`, and `writingrules.md` by default.
- `/vibeinit` does not create `.agents/skills/` by default. Skills can be exported later through a dedicated workflow if needed.

## 3. Target Project Layout

After initialization, a minimal VibePaper project should look like this:

```text
.vibepaper/
  state.json
  config.json
  events.jsonl
  memory.json
  tasks.json
  artifacts.json
  reports/
  cache/

paper.md
storyline.md
writingrules.md
```

Optional directories such as `relatedwork/` and `fig/` should be created lazily when their workflows start.

## 4. State Model v1

### `.vibepaper/state.json`

`state.json` stores project identity and workflow progress only.

```json
{
  "schema_version": 1,
  "project": {
    "name": "Untitled Paper",
    "domain": "unspecified",
    "language": "en",
    "created_at": "2026-04-26T00:00:00.000Z"
  },
  "workflow": {
    "current_phase": "storyline",
    "phases": {
      "storyline": {
        "status": "in_progress",
        "started_at": "2026-04-26T00:00:00.000Z",
        "completed_at": null
      },
      "literature": {
        "status": "not_started",
        "started_at": null,
        "completed_at": null
      },
      "writing": {
        "status": "not_started",
        "started_at": null,
        "completed_at": null
      },
      "review": {
        "status": "not_started",
        "started_at": null,
        "completed_at": null
      },
      "submission": {
        "status": "not_started",
        "started_at": null,
        "completed_at": null
      }
    }
  },
  "last_updated_at": "2026-04-26T00:00:00.000Z"
}
```

### `.vibepaper/artifacts.json`

`artifacts.json` stores file readiness and section-level writing status.

```json
{
  "schema_version": 1,
  "artifacts": {
    "paper.md": {
      "type": "paper",
      "status": "template",
      "sections": {}
    },
    "storyline.md": {
      "type": "storyline",
      "status": "template"
    },
    "writingrules.md": {
      "type": "writing_rules",
      "status": "minimal"
    }
  }
}
```

### `.vibepaper/memory.json`

`memory.json` stores project memory for OpenCode context injection.

```json
{
  "schema_version": 1,
  "project_summary": "",
  "latest_decisions": [],
  "open_questions": [],
  "context_notes": []
}
```

### `.vibepaper/tasks.json`

`tasks.json` stores OpenCode child-session task lifecycle state.

```json
{
  "schema_version": 1,
  "tasks": {}
}
```

### `.vibepaper/events.jsonl`

`events.jsonl` is append-only. It records actions such as project initialization, workflow starts, artifact updates, task creation, checker results, and quality decisions.

## 5. Plugin Architecture

The plugin should be organized around a pure TypeScript core plus thin OpenCode adapters.

```text
packages/opencode-plugin/src/
  index.ts
  core/
    schema.ts
    paths.ts
    atomic.ts
    state.ts
    config.ts
    eventlog.ts
    memory.ts
    artifacts.ts
    scaffold.ts
    dashboard.ts
    policy.ts
  opencode/
    tools.ts
    hooks.ts
    context.ts
  workflows/
    init.ts
    storyline.ts
    writing.ts
    review.ts
  skills/
    registry.ts
    prompts/
  assets/
    templates/
```

Responsibilities:

- `index.ts`: registers tools and hooks only.
- `core/*`: pure TypeScript logic with no OpenCode dependency.
- `opencode/*`: OpenCode plugin integration and API adaptation.
- `workflows/*`: plugin-managed research and writing flows.
- `skills/*`: auxiliary prompts, checker rubrics, and agent personas.
- `assets/templates/*`: minimal starter files for initialization.

## 6. Harness Policy

Harness policy protects safety and data integrity. It does not use phase as a write-permission boundary.

Initial policy rules:

- Block direct writes to `.vibepaper/state.json`.
- Block direct writes to `.vibepaper/events.jsonl`.
- Block deletion of `.vibepaper/`.
- Block path traversal or writes outside the project root.
- Block destructive git commands such as `git reset --hard`.
- Require preview or confirmation before overwriting important artifacts.
- Treat reviewer agents as read-only by default.
- Require workflow tools or explicit approval for writer agent artifact writes.

Policy decisions should use this shape:

```ts
type PolicyDecision = {
  decision: "allow" | "ask" | "warn" | "block"
  reason: string
  suggestion?: string
}
```

## 7. Context Memory Injection

The plugin should inject concise project memory into OpenCode context when a VibePaper project is active.

Example system context:

```text
VibePaper project active.

Progress
- Current phase: storyline
- Recommended next action: refine the research storyline

Memory
- Project summary: empty
- Latest decisions: none
- Open questions: none

Rules
- Use VibePaper plugin tools for state changes.
- Do not directly edit .vibepaper/state.json or .vibepaper/events.jsonl.
```

Context injection should use phase for progress awareness, not for write restrictions.

## 8. Milestones

### M0: Architecture Reset

Status: completed.

Completed in this milestone:

- Refactored the plugin entrypoint into a thin `index.ts` that registers tools and hooks.
- Added initial `core/` modules for schema, paths, state, event log, dashboard, and policy.
- Added initial `opencode/` modules for context resolution, tools, and hooks.
- Switched plugin runtime assumptions from `.agents/state.json` to `.vibepaper/state.json` and `.vibepaper/events.jsonl`.
- Removed phase-based `paper.md` write blocking from the plugin policy model.
- Kept safety-focused policy checks for protected runtime files, project-root escape, `.vibepaper/` deletion, and `git reset --hard`.
- Updated the plugin smoke script to use a `.vibepaper` fixture instead of Python CLI initialization.
- Verified with TypeScript typecheck, plugin smoke script, plugin tests, and the full Python test suite.

Goal: prepare the repository for plugin-native development.

Tasks:

- Freeze Python CLI feature development.
- Split current plugin MVP into `core/` and `opencode/` modules.
- Define `.vibepaper` paths and schema types.
- Remove phase-based write restrictions from the new policy model.
- Keep only safety/data-integrity restrictions in harness policy.

Acceptance criteria:

- `index.ts` is a thin registration layer.
- Core modules are testable without OpenCode runtime.
- No new features are added to the Python CLI.

### M1: `/vibeinit` MVP

Goal: initialize a minimal VibePaper project from a global OpenCode plugin.

Tools and commands:

- `vibepaper_init`
- `/vibeinit`

Input shape:

```ts
type InitArgs = {
  name?: string
  domain?: string
  language?: "en" | "zh"
  force?: boolean
}
```

Behavior:

- Create `.vibepaper/state.json`.
- Create `.vibepaper/config.json`.
- Create `.vibepaper/events.jsonl`.
- Create `.vibepaper/memory.json`.
- Create `.vibepaper/tasks.json`.
- Create `.vibepaper/artifacts.json`.
- Create minimal `paper.md`.
- Create minimal `storyline.md`.
- Create minimal `writingrules.md`.
- Do not overwrite existing files by default.
- Record an `init_project` event.
- Return a Markdown dashboard after initialization.

Minimal `paper.md`:

```markdown
# Untitled Paper

## Abstract

## Introduction

## Background

## Design

## Evaluation

## Discussion

## Related Work

## Conclusion
```

Minimal `storyline.md`:

```markdown
# Research Storyline

## Problem

## Motivation

## Key Insight

## Approach

## Contributions

## Evaluation Plan

## Open Questions
```

Minimal `writingrules.md`:

```markdown
# Writing Rules

- Write clearly and concretely.
- Prefer claims that are backed by evidence.
- Mark uncertain claims explicitly.
- Keep placeholders visible until real content is available.
```

Acceptance criteria:

- Empty directory can be initialized.
- Re-running init does not overwrite user files.
- The `.vibepaper` state files are valid.
- `events.jsonl` includes `init_project`.
- The init response is a useful Markdown dashboard.

### M2: Markdown Dashboard

Goal: make status and visualization useful before TUI work starts.

Tools and commands:

- `vibepaper_status`
- `vibepaper_dashboard`
- `/vibestatus`
- `/vibedashboard`

Dashboard sections:

- Project identity.
- Phase progress.
- Artifact readiness.
- Project memory summary.
- Active tasks.
- Safety status.
- Recommended next action.

Acceptance criteria:

- Uninitialized directories show an init recommendation.
- Initialized projects show a complete Markdown dashboard.
- Dashboard output has snapshot tests.

### M3: State, Event, Artifact, and Memory Core

Goal: build a reliable `.vibepaper` runtime.

Tasks:

- Atomic state writes.
- Schema validation.
- Event append and query.
- Artifact scanning and updating.
- Memory updating and rendering.
- State repair diagnostics.

Tools and commands:

- `vibepaper_events`
- `vibepaper_doctor`
- `vibepaper_repair`

Acceptance criteria:

- Corrupted state produces clear diagnostics.
- Event log remains append-only.
- Artifact status can be recalculated from files.

### M4: Policy Kernel

Goal: enforce safety and data integrity through plugin hooks.

Tasks:

- Move all hook decisions into `core/policy.ts`.
- Test all allow, warn, ask, and block cases.
- Ensure phase does not hard-block normal artifact editing.

Acceptance criteria:

- Direct writes to `.vibepaper/state.json` are blocked.
- Direct writes to `.vibepaper/events.jsonl` are blocked.
- Deleting `.vibepaper/` is blocked.
- `git reset --hard` is blocked.
- Editing `paper.md` is not blocked solely because of phase.

### M5: `/vibenext` and Storyline Workflow

Goal: implement the first plugin-managed writing workflow.

Tools and commands:

- `vibepaper_next`
- `vibepaper_storyline_start`
- `vibepaper_storyline_update`
- `vibepaper_storyline_complete`
- `/vibenext`
- `/vibestoryline`

Workflow collects:

- Problem.
- Motivation.
- Target reader or user.
- Key insight.
- Approach.
- Contributions.
- Evaluation plan.
- Related work positioning.
- Open questions.

Acceptance criteria:

- Storyline workflow can run without a skill.
- `storyline.md` is updated through workflow logic.
- `memory.json` receives a project summary.
- `artifacts.json` marks `storyline.md` as draft or complete.
- Dashboard recommends the next workflow step.

### M6: Writing Workflow v1

Goal: manage section-level writing through the plugin.

Tools and commands:

- `vibepaper_write_section`
- `vibepaper_review_section`
- `vibepaper_update_section_status`
- `/vibewrite`
- `/vibewrite-section`
- `/vibereview-section`

Acceptance criteria:

- A selected section can be drafted.
- Writes provide preview or clear confirmation flow.
- `paper.md` is updated safely.
- `artifacts.json` tracks section status.
- Dashboard shows section-level progress.

### M7: Agent and Task Lifecycle

Goal: make OpenCode child sessions first-class VibePaper tasks.

Tools:

- `vibepaper_task_create`
- `vibepaper_task_list`
- `vibepaper_task_status`
- `vibepaper_task_collect`
- `vibepaper_task_cancel`

Acceptance criteria:

- Child session creation updates `tasks.json`.
- Active tasks are shown in the dashboard.
- Task collection records events.
- Reviewer tasks are read-only by default.
- Writer outputs go through policy and confirmation.

### M8: Checker and Quality Gate

Goal: manage review quality through plugin-controlled checker state.

Tools and commands:

- `vibepaper_run_checker`
- `vibepaper_record_checker_result`
- `vibepaper_checker_status`
- `vibepaper_resolve_issue`
- `vibepaper_quality_gate`
- `/vibecheck`
- `/viberevise`

Acceptance criteria:

- Checker results are tracked in `.vibepaper` state.
- Unresolved issues are visible in the dashboard.
- Quality gate gives recommendations and warnings.
- Quality gate does not overuse hard blocking.

### M9: Skills as Auxiliary Assets

Goal: use skills as support prompts, not the core runtime.

Tasks:

- Move key prompt assets into plugin-controlled skill registry.
- Update prompts so they do not instruct users to run Python CLI.
- Make skills callable from plugin-managed workflows.
- Optionally implement `/vibeexport-skills` later.

Acceptance criteria:

- Storyline and writing workflows do not require `.agents/skills/`.
- Skills can enhance prompts without owning state transitions.

### M10: Related Work Workflow

Goal: rebuild literature support as a plugin-managed workflow after the core writing loop is stable.

Tools and commands:

- `vibepaper_literature_status`
- `vibepaper_literature_import`
- `vibepaper_literature_summarize`
- `vibepaper_literature_build_index`
- `vibepaper_literature_coverage`
- `/viberelated`

Acceptance criteria:

- `relatedwork/` is created lazily.
- Literature status appears in dashboard.
- Network and PDF download actions require approval.
- Coverage gaps are visible to the user.

### M11: TUI Renderer

Goal: build visual UI after Markdown dashboard and dashboard model are stable.

Tasks:

- Define a structured dashboard model.
- Keep Markdown as one renderer.
- Add TUI renderer using the same model.

Acceptance criteria:

- TUI does not duplicate business logic.
- TUI displays progress, artifacts, tasks, memory, quality, and next action.

### M12: Python CLI Removal

Goal: complete the transition to a pure OpenCode plugin project.

Tasks:

- Mark Python CLI as legacy in docs once plugin core is usable.
- Remove Python CLI after plugin covers init, dashboard, storyline, writing, tasks, quality, and related work basics.
- Remove Python scaffold runtime and Python-specific tests.
- Keep migration notes for old `.agents/state.json` projects.

Acceptance criteria:

- VibePaper can be used through OpenCode plugin only.
- No Python CLI is needed for primary workflows.

## 9. Testing Plan

New tests should be TypeScript-first.

Suggested structure:

```text
packages/opencode-plugin/test/
  init.test.ts
  state.test.ts
  config.test.ts
  eventlog.test.ts
  artifacts.test.ts
  dashboard.test.ts
  policy.test.ts
  context.test.ts
  workflow-storyline.test.ts
  workflow-writing.test.ts
  tasks.test.ts
  plugin-tools.test.ts
```

Required coverage:

- Empty directory initialization.
- Repeated initialization without overwriting user files.
- Minimal markdown file creation.
- `.vibepaper` schema validation.
- Event log append behavior.
- Markdown dashboard snapshots.
- Policy blocking for protected state files.
- Policy allowing normal `paper.md` edits independent of phase.
- Context memory injection.
- Storyline workflow artifact and memory updates.
- Task creation with mocked OpenCode child sessions.

The existing Python test suite may remain during transition, but new product behavior should be validated in the plugin package.

## 10. Immediate Next Steps

The next implementation batch should focus only on M0 and M1.

Recommended task order:

1. Restructure the plugin into thin OpenCode entrypoint plus pure TypeScript core.
2. Define `.vibepaper` paths and v1 schemas.
3. Implement `initProject()` in TypeScript.
4. Implement minimal template generation for `paper.md`, `storyline.md`, and `writingrules.md`.
5. Implement event logging for `init_project`.
6. Implement `vibepaper_init` tool.
7. Add a `/vibeinit` command path if supported by OpenCode global plugins; otherwise document the tool-first bootstrap path.
8. Implement init dashboard rendering.
9. Add TypeScript tests for init, state, event log, scaffold behavior, and dashboard output.
10. Update the smoke script to validate `.vibepaper` instead of `.agents`.

Do not start related work, checker migration, Git integration, or TUI until M0 and M1 are stable.
