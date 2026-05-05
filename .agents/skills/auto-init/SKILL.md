---
name: auto-init
description: Detect when the user wants to start a new VibePaper paper project or initialize a workspace, run `vibe --root . init` when needed, then inspect the current workflow phase and immediately begin the appropriate next phase work.
---

# Auto Init

This skill initializes a VibePaper project when the user expresses intent to start a new paper or workspace.

## Input Files

| File | Required | When Used | Purpose |
|------|----------|-----------|---------|
| `.agents/state.json` | Optional | Before and after initialization | Detect project state and inspect the current workflow phase |
| `paper.md` | Optional | Before initialization | Detect existing scaffolded paper content |
| `storyline.md` | Optional | Before initialization | Detect existing scaffolded storyline content |
| `.git/` | Optional | After initialization | Detect whether the current folder is already a Git repository |

## Triggers

Use this skill when the user asks to start or initialize a VibePaper paper project, including phrases such as:

- "start working"
- "start writing paper"
- "new paper"
- "initialize project"
- "开始工作"
- "开始写论文"
- "新建论文"
- "初始化项目"

## Workflow

1. Check whether the current directory already looks initialized by looking for `.agents/state.json`, `paper.md`, or `storyline.md`.
2. If it is already initialized, skip initialization and continue with the phase continuation workflow below.
3. If it is not initialized, collect the project name and research domain from the user request.
4. If either value is missing, ask the user for the missing value before running the command.
5. Run:

```bash
vibe --root . init --name "<project_name>" --domain "<domain>"
```

6. After initialization succeeds, tell the user where the scaffold was created.
7. If `git` is installed and the current folder is not already inside a Git work tree, initialize Git:

```bash
command -v git
git rev-parse --is-inside-work-tree
git init
```

Only run `git init` when `command -v git` succeeds and `git rev-parse --is-inside-work-tree` reports that the folder is not a Git work tree. If `git` is not installed, skip this step and continue.
8. Continue immediately by checking status:

```bash
vibe --root . status --json
```

9. Read `current_phase` from the JSON output and begin that phase's work without waiting for another user command.

## Phase Continuation

After `vibe --root . status --json`, use this routing:

| Current Phase | Begin This Work |
|---------------|-----------------|
| `storyline` | Start `storyline-helper`: help the user build or refine `storyline.md` section by section |
| `literature` | Start `relatedwork-finder`: identify, import, download, summarize, or index related work as appropriate |
| `discussion` | Start `socratic-discussion`: examine the research idea, risks, claims, and checker-aligned dimensions |
| `experiments` | Start `experiment-analyzer`: inspect experiment plans, code, results, or missing evaluation artifacts |
| `writing` | Start `writing-orchestrator`: inspect paper completion and begin writing the next needed section |
| `latex_review` | Start `markdown2latex` or submission review work depending on whether LaTeX output already exists |

If the phase requires information the user has not provided, ask only for the missing information needed to proceed in that phase.

## Constraints

- Do not reinitialize an existing project without explicit user confirmation.
- Keep `--root` before the `init` subcommand.
- Use the CLI for initialization instead of manually creating `.agents/state.json`.
- Do not run `git init` when the current folder is already inside an existing Git work tree.
- Do not require Git; if it is unavailable, continue the VibePaper workflow.
- Do not stop after initialization when status can be read; continue into the current phase workflow.
