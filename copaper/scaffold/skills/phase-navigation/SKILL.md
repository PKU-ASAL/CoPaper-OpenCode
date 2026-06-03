---
name: phase-navigation
description: Inspect the current CoPaper workflow phase, move forward, move backward, or jump to a named phase when the user asks to view, advance, return, roll back, or switch phases in OpenCode, then invoke the skill for the active phase. Uses `copaper status --json` and `copaper set-phase` instead of editing state files.
---

# Phase Navigation

This skill inspects and moves a CoPaper project between workflow phases through the `copaper` CLI.

## Input Files

| File | Required | When Used | Purpose |
|------|----------|-----------|---------|
| `.agents/state.json` | Required | Start | Read workflow state through `copaper status --json` |
| `.agents/events.jsonl` | Optional | After phase change | CLI appends phase transition events |

## Triggers

Use this skill when the user asks to change workflow phase, including:

- "what phase are we in"
- "show current phase"
- "check current phase"
- "go to next phase"
- "advance to the next phase"
- "go back to previous phase"
- "return to literature"
- "roll back to discussion"
- "jump to writing"
- "switch to experiments"
- "当前阶段是什么"
- "查看当前阶段"
- "进入下一阶段"
- "跳转到下一个 phase"
- "回到上一个阶段"
- "回退到 literature"
- "退回 discussion 阶段"
- "跳到 writing"
- "切换到 experiments 阶段"

## Phase Names

Valid phase names are `storyline`, `literature`, `discussion`, `experiments`, `writing`, and `latex_review`.

Accept clear aliases such as "latex", "review", "paper writing", or "related work", then map them to valid phase names.

## Workflow

1. Check current project status:

```bash
copaper --root . status --json
```

2. If the user only asked to view or check the current phase, report `current_phase`, summarize the phase statuses briefly, and suggest the active phase's next work. Do not mutate state.

3. If the user asked for the next phase, read `current_phase` and advance by marking the current phase complete:

```bash
copaper --root . set-phase <current_phase> --status complete
```

The phase order is:

```text
storyline -> literature -> discussion -> experiments -> writing -> latex_review
```

4. If the user asked to go back to the previous phase, compute the previous phase from the phase order and treat it as the target rollback phase. If already at `storyline`, explain that it is the first phase.

5. If the user asked to return or roll back to a specific earlier phase, verify that the target phase is before the current phase in the phase order. If the target phase is later than the current phase, treat the request as a normal jump instead.

6. To return to a previous phase, set the target phase to `in_progress`, then reset every later phase to `not_started`:

```bash
copaper --root . set-phase <target_phase> --status in_progress
copaper --root . set-phase <later_phase_1> --status not_started
copaper --root . set-phase <later_phase_2> --status not_started
```

Run one `set-phase` command for each phase after the target. This preserves earlier completed work while making the returned phase the active workflow point.

7. If the user asked for a specific phase without rollback language, set that phase to `in_progress`:

```bash
copaper --root . set-phase <target_phase> --status in_progress
```

8. If the user asks to skip a phase, use:

```bash
copaper --root . skip <phase> --reason "<reason>"
```

If no reason is provided, ask for a short reason before skipping.

9. After any successful phase change, run `copaper --root . status --json` again and hand off to the active phase skill. Do not rely on OpenCode to auto-trigger another skill; explicitly open that skill's `SKILL.md` and continue its workflow.

## Skill Invocation

After a phase change succeeds, immediately load and use the active phase's skill. Do not stop at reporting the new phase unless the user explicitly asked only to view status.

Important: skill chaining is manual. The agent must directly read the target `SKILL.md` file and continue working under that skill's instructions in the same turn.

| Current Phase | Skill File to Open | Immediate Action |
|---------------|--------------------|------------------|
| `storyline` | `.agents/skills/storyline-helper/SKILL.md` | Start storyline construction or refinement |
| `literature` | `.agents/skills/relatedwork-finder/SKILL.md` | Start literature search, import, download, or indexing work |
| `discussion` | `.agents/skills/socratic-discussion/SKILL.md` | Start claim, risk, and design examination |
| `experiments` | `.agents/skills/experiment-analyzer/SKILL.md` | Start experiment planning, code inspection, or result analysis |
| `writing` | `.agents/skills/writing-orchestrator/SKILL.md` | Inspect paper completion and start the next writing task |
| `latex_review` | `.agents/skills/template-latex-export/SKILL.md` if a final template export is requested, otherwise `.agents/skills/markdown2latex/SKILL.md` | Start final LaTeX generation or review work |

If the invoked skill needs missing inputs, ask only for the minimum information needed by that skill. For example, after entering `literature`, ask for topic constraints or seed papers only if they are not already available.

If the target skill file is missing, say which file is missing and fall back to `copaper-manage` only for workflow-state inspection. Do not stop silently.

## Constraints

- Do not edit `.agents/state.json` manually.
- Keep `--root` before the subcommand.
- Viewing the current phase is read-only; do not call `set-phase` or `skip` for a status-only request.
- Viewing the current phase does not require invoking another skill unless the user also asks to continue work.
- After a successful forward jump, backward jump, skip, or explicit phase switch, open the active phase skill file and continue its workflow in the same turn.
- Do not invent phase names outside the valid phase list.
- If already at `latex_review` and the user asks for the next phase, explain that it is the final phase and show the current status.
- If already at `storyline` and the user asks for the previous phase, explain that it is the first phase and show the current status.
- Do not use `copaper rollback` for phase navigation unless the user explicitly asks to restore a Git commit; this skill changes workflow phase state, not repository contents.
- If `copaper status --json` fails because the project is not initialized, use `auto-init` first.
