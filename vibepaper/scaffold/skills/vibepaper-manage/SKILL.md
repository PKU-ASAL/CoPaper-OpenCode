---
name: vibepaper-manage
description: Teaches agents how to manage a VibePaper project through the OpenCode plugin tools, including dashboard, initialization, artifact readiness, workflow status, event log inspection, and phase updates. Use this skill whenever the task is about workflow/state management rather than direct paper writing.
---

# VibePaper-Manage Skill

This skill tells an agent how to manage a VibePaper project through the OpenCode plugin tools instead of shell commands, prompt-only instructions, or manual edits to workflow files.

Use this skill when the task is about project lifecycle management, initialization, workflow status, phase control, artifact readiness, or event log inspection.

## When to Use This Skill

Use this skill when the user asks to:

- initialize a VibePaper project from OpenCode
- check current workflow status
- inspect recent workflow history
- mark a phase as `not_started`, `in_progress`, `complete`, or `skipped`
- check artifact readiness
- record artifact readiness after confirmation
- check checker status, severity counts, stale signals, and precheck evidence
- record checker run summaries after confirmation
- understand what to do next in the VibePaper workflow

Typical triggers:

- `check workflow status`
- `show VibePaper dashboard`
- `skip experiments for this project`
- `record artifact readiness`
- `manage this paper with OpenCode`

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `.agents/state.json` | Tool-managed | Status, phase, artifact-record, and initialization flows | Access only through plugin tools when possible; contains workflow phases and artifact records |
| `.agents/events.jsonl` | Tool-managed | Workflow history inspection | Access through `vibepaper_workflow_log`; do not read or append directly |
| `storyline.md` | Optional | Artifact readiness inspection | Checked by `vibepaper_artifact_status` as part of read-only evidence |
| `paper.md` | Optional | Artifact readiness inspection | Checked by `vibepaper_artifact_status` as part of read-only evidence |
| `relatedwork/` | Optional | Artifact readiness inspection | Checked by `vibepaper_artifact_status` as part of read-only evidence |
| `.agents/cross_index.json` | Optional | Artifact readiness inspection | Checked by `vibepaper_artifact_status` as part of read-only evidence |
| Checker status | Optional | Checker inspection | Access through `vibepaper_checker_status`; do not inspect `.agents/state.json` directly just to infer checker status |

## OpenCode Plugin Tools

Prefer these plugin tools whenever they are available:

| User intent | Plugin tool |
|---|---|
| Show project dashboard / init preview | `vibepaper_dashboard` |
| Initialize core VibePaper files after confirmation | `vibepaper_init_apply` |
| Read artifact readiness | `vibepaper_artifact_status` |
| Record artifact readiness after confirmation | `vibepaper_artifact_record` |
| Read workflow phase status and next step | `vibepaper_workflow_status` |
| Read recent workflow events | `vibepaper_workflow_log` |
| Update a workflow phase after confirmation | `vibepaper_workflow_set_phase` |
| Read checker run status and stale signals | `vibepaper_checker_status` |
| Record checker run summary after confirmation | `vibepaper_checker_record` |

Do not hand-edit:

- `.agents/state.json`
- `.agents/events.jsonl`

The plugin tools are the supported automation surface for the workflow state they cover.

## Tool Boundaries

The current OpenCode plugin does not yet expose tools for:

- `relatedwork import`
- `relatedwork sync-bib`
- `relatedwork download`
- `relatedwork register-summary`
- `relatedwork build-index`
- `report`
- Git-backed `commit`, `rollback`, or `diff`
- checker issue-resolution writes
- arbitrary metadata updates inside `.agents/state.json`

When a requested action needs one of those missing capabilities, state that no plugin tool currently exists for it. Use a terminal command only if the user explicitly asks for a CLI fallback.

## Initialization Workflow

Use `vibepaper_dashboard` first to check whether initialization is needed.

If initialization is needed:

1. Ask for the project name and research domain.
2. Restate the initialization target, project name, and domain.
3. Wait for explicit confirmation.
4. Call `vibepaper_init_apply` with `name` and `domain`.
5. Show the tool output to the user.

The tool call, not a prompt-only instruction, initializes the OpenCode-managed VibePaper core files and refuses conflicts. Do not manually create those core files when the plugin tool is available.

The plugin initialization writes only the core files defined by the plugin, such as `paper.md`, `storyline.md`, `writingrules.md`, `AGENTS.md`, `.agents/state.json`, and `.agents/events.jsonl`. Do not claim it installs `.agents/skills/` unless the tool output says so.

## Status and Inspection

Use `vibepaper_workflow_status` for read-only inspection of workflow phase status, current phase, phase table, and next-step recommendation. Do not read `.agents/state.json` directly for phase state when this plugin tool is available.

Use `vibepaper_workflow_log` for read-only inspection of `.agents/events.jsonl`. Do not read the event log file directly when this plugin tool is available.

Supported filters:

- `lastN`
- `phase`
- `operator`

Use `vibepaper_artifact_status` for read-only inspection of artifact readiness, evidence, confidence, and recommendation. Do not manually infer readiness from files or `.agents/state.json` when this plugin tool is available.

It inspects artifacts such as `storyline.md`, `paper.md`, `relatedwork/`, `.agents/skills/`, `.agents/cross_index.json`, and checker results.

Use `vibepaper_checker_status` for read-only inspection of checker run status, Critical/Major/Minor counts, stale signals, and `.agents/precheck_report.md` evidence. This tool does not run checkers, write checker results, mark issues resolved, update workflow phases, or record artifact readiness.

Use `vibepaper_checker_record` only after a checker has actually run and the user explicitly confirms the summary to persist. This tool writes the `checkers` area in `.agents/state.json` and appends a `record_checker_result` event to `.agents/events.jsonl`. It does not run checker skills, mark individual issues resolved, update workflow phases, or record artifact readiness.

## Phase Control

Use `vibepaper_workflow_set_phase` when a phase should be explicitly marked as:

- `not_started`
- `in_progress`
- `complete`
- `skipped`

Before calling the tool:

1. Restate the target phase and next status.
2. If status is `skipped`, restate the reason.
3. Wait for explicit user confirmation.

Then call:

```text
vibepaper_workflow_set_phase({
  phase: "<phase>",
  status: "<status>",
  reason: "<reason if skipped>"
})
```

The tool call, not a prompt-only instruction, updates `.agents/state.json` and appends the workflow event to `.agents/events.jsonl`.

Valid phase names are project-defined and should come from `vibepaper_workflow_status`. Common defaults are:

- `storyline`
- `literature`
- `discussion`
- `experiments`
- `writing`
- `latex_review`

Do not use stage letters such as `A`, `B`, or `D`.

## Artifact Readiness

Use `vibepaper_artifact_status` for read-only readiness, evidence, confidence, and recommendation before deciding whether an artifact should be recorded. This tool does not modify files or workflow state.

When the user explicitly asks to record readiness:

1. Restate artifact, status, confidence, evidence, and reason.
2. Wait for explicit confirmation.
3. Route the confirmed record action to `@vibepaper-recorder`.
4. The recorder calls `vibepaper_artifact_record`.

The tool call, not a prompt-only instruction, writes the `artifacts` area in `.agents/state.json` and appends the readiness event to `.agents/events.jsonl`.
It records artifact readiness only. It does not automatically advance phases.
The plugin rejects readiness recording from other agents.

Use only plugin-supported record values:

- `artifact`: `storyline`, `paper`, `relatedwork`, `cross_index`, or `checker_results`
- `status`: `missing`, `template`, `partial`, `ready`, `stale`, or `unknown`
- `confidence`: `low`, `medium`, or `high`
- `evidence`: one or more concrete evidence strings
- `reason`: a non-empty human-readable reason

## Checker Result Recording

Use `vibepaper_checker_status` first when you need to inspect existing checker freshness or counts.

When the user explicitly asks to record a checker result:

1. Verify the result came from actual checker output, such as `markdown-review` or an individual checker skill.
2. Restate checker, status, Critical/Major/Minor counts, summary, evidence, issue list if provided, and reason.
3. Wait for explicit confirmation.
4. Route the confirmed record action to `@vibepaper-recorder`.
5. The recorder calls `vibepaper_checker_record`.

Use only plugin-supported checker record values:

- `checker`: `problem-checker`, `novelty-checker`, `technical-depth-checker`, `logic-checker`, `clarity-checker`, `evaluation-protocol-checker`, or `data-checker`
- `status`: `clean`, `issues_found`, or `unknown`
- `critical`, `major`, `minor`: non-negative integer issue counts
- `summary`: a non-empty summary from actual checker output
- `evidence`: one or more concrete evidence strings
- `reason`: a non-empty human-readable reason
- `issues`: optional normalized issue list; this is for recording only and does not mark issues resolved

## Recommended Automation Patterns

### Pattern 1: Dashboard

1. Call `vibepaper_dashboard`.
2. If ready, call `vibepaper_artifact_status` to inspect artifact readiness, evidence, confidence, and recommendation.
3. Then call `vibepaper_workflow_status`.
4. Optionally call `vibepaper_workflow_log`.

### Pattern 2: Safe Workflow Inspection

1. Call `vibepaper_workflow_status` to get the current phase, phase table, and next-step recommendation.
2. Call `vibepaper_workflow_log` with `lastN` or optional `phase`/`operator` filters to query `.agents/events.jsonl` read-only.
3. Decide the next action from the returned state.

### Pattern 3: Skip a Non-Applicable Phase

1. Confirm the phase is genuinely not needed.
2. Ask for or restate the skip reason.
3. Wait for confirmation.
4. Call `vibepaper_workflow_set_phase` with `status: "skipped"`.
5. Call `vibepaper_workflow_status` to verify the result.

## Must NOT Do

- **NEVER** hand-edit `.agents/state.json` for actions covered by plugin tools.
- **NEVER** append to `.agents/events.jsonl` for workflow phase changes covered by plugin tools.
- **NEVER** read `.agents/events.jsonl` directly for workflow history when `vibepaper_workflow_log` is available.
- **NEVER** update phases without explicit user confirmation.
- **NEVER** use shell `vibe` commands when an equivalent plugin tool exists.
- **NEVER** claim unsupported plugin capabilities exist.
- **NEVER** read `.agents/state.json` directly just to infer checker status when `vibepaper_checker_status` is available.

## End Condition

Stop when the requested management action is complete and verified.

Always report:

- which plugin tool was used
- which project root it targeted, if shown by the tool output
- what files or workflow state changed
- any missing plugin capability that affected the request
