---
name: ppt2storyline
description: Converts a research PPT/PPTX deck into storyline.md by extracting slide text, mapping it to existing storyline sections, and polishing wording without inventing new claims.
---

# PPT to Storyline Skill

This skill converts a research slide deck into `storyline.md`.
It is designed for the common case where the PPT structure is already close to storyline sections, so the main task is extraction, mapping, and light polishing.

## When to Use This Skill

- User asks to generate `storyline.md` directly from a PPT/PPTX file
- User already has a mature presentation and wants quick storyline bootstrapping
- User explicitly says PPT content and storyline are mostly aligned

Typical triggers:
- `convert ppt to storyline`
- `从PPT生成storyline`
- `use slides to fill storyline`
- `将位于 <path> 的pptx文件转变为storyline.md`
- `把 <path>.pptx 转成 storyline.md`
- `读取 <path>.pptx 并生成 storyline.md`
- `use $ppt2storyline to convert <path>.pptx to storyline.md`
- `调用 ppt2storyline，将 <path>.pptx 转为 <target>/storyline.md`

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `storyline.md` | Conditional | Step 1 and Step 7 | Target template and section structure; inspect through `vibepaper_storyline_structure_status` if present |
| `*.pptx` | **Required** | Step 2 | Source research content; extract through `vibepaper_ppt_extract` |
| `.agents/state.json` | Optional | Step 8 | Updated only through `vibepaper_workflow_set_phase` |
| `relatedwork/` | Optional | Step 4 | Cross-check paper names/citations if needed |

Preferred source example for this project:
- `target/example_project/research_slides.pptx`

## Core Principle

Preserve source meaning. Do not invent research claims.

The skill is a converter + polisher, not an autonomous author.
It should reuse what is explicitly stated in slides and only perform:
- wording cleanup
- structure alignment
- concise academic phrasing

Path safety rule:
- If the user does not provide a PPT/PPTX path in the request, the agent MUST ask for a path and wait.
- The agent MUST NOT scan directories, glob files, or guess candidate PPT files automatically.
- Accepted path forms are absolute or relative paths explicitly provided by the user.

## Supported Formats

- `pptx`: fully supported (direct extraction)
- `ppt`: not directly parsed here; ask user to convert to `.pptx` first

## Extraction Strategy

Call `vibepaper_ppt_extract` for source extraction when the OpenCode plugin tool is available.

This tool is read-only and requires an explicit `.pptx` path. It does not scan directories, guess source files, write `storyline.md`, update `.agents/state.json`, append `.agents/events.jsonl`, or advance workflow phases.

Use the tool output to capture:
- slide number
- title text (if any)
- bullet/body text
- source hash for traceability
- speaker notes only if explicitly requested through the tool argument

Do not replace `vibepaper_ppt_extract` with prompt-only extraction instructions, shell unzip commands, `python-pptx`, or directory scans when the plugin tool is available.

## Mapping Rules (Slide -> Storyline)

Map by semantics, not by exact title string.

Recommended mapping cues:
- Problem statement/phenomenon -> `问题描述`
- Impact/motivation/evidence -> `问题重要性`
- Background/concepts -> `背景知识`
- Existing methods/baselines -> `解决问题的现有相关方法`
- Shared weakness/challenge -> `现有相关方法的共性缺陷` / `解决共性缺陷的难点/挑战`
- Key idea/contribution -> `Insights`
- Design/architecture/modules -> `设计方案：Overview` and component sections
- Evaluation/ablation/case study -> experiment-related sections

If one slide supports multiple sections, split its points conservatively.

## Strict Workflow

### Step 1: Validate files

1. Check whether the user explicitly provided a source `.pptx` path.
2. If source path is not specified, ask exactly one concise question before continuing:
   - `请提供要转换的 PPTX 文件路径（例如：target/example_project/research_slides.pptx）。`
3. Do not scan the filesystem for PPT/PPTX candidates when the path is missing.
4. Wait for user-provided absolute or relative path.
5. Confirm source `.pptx` exists.
6. If missing, stop and report exact missing path.
7. Check whether `storyline.md` exists:
   - if yes, continue normal mapping and in-place update flow
   - if no, continue conversion in draft mode and initialize project at Step 7 before final write

### Step 2: Extract slide text

1. Call `vibepaper_ppt_extract` with the explicit user-provided `.pptx` path.
2. Use the returned slides in order.
3. Build an intermediate note like:
   - `Slide 03: [Title]`
   - bullets...
4. Keep extraction artifacts concise and traceable.

### Step 3: Build section evidence map

1. Call `vibepaper_storyline_structure_status` to list all `#####` sections in `storyline.md`.
2. For each section, attach supporting slide snippets.
3. Mark section status:
   - `grounded`: sufficient slide evidence
   - `partial`: some evidence
   - `missing`: no evidence

### Step 4: Draft section content (polish only)

For each target section:
1. Rewrite slide points into clean storyline prose.
2. Keep original claims and strength unchanged.
3. Do not add new numbers, experiments, or citations.
4. Keep unresolved parts as TODO placeholders.

### Step 5: User review gate

Before writing to file, present the drafted section and ask for confirmation:
- Accept
- Modify
- Skip this section

Do not silently overwrite many sections without confirmation.

### Step 6: Apply edits safely

1. Edit only content under existing `#####` headers.
2. Do not modify section hierarchy or guidance scaffolding.
3. Replace only matching TODO/content blocks for accepted sections.
4. If `storyline.md` is missing, hold accepted converted content in memory/temporary draft and apply it after Step 7 initialization.

### Step 7: Project bootstrap check (start-stage friendly)

After conversion is accepted, ask for the current project directory:

- `请确认当前项目路径（project dir）。`

Then validate:

1. `<project-dir>/.agents/skills/` exists and is non-empty
2. `<project-dir>/storyline.md` exists

If `storyline.md` is missing:

1. Ask for:
   - project `name`
   - project `domain`
2. Restate the project directory, project `name`, and project `domain`.
3. Wait for explicit user confirmation.
4. Call `vibepaper_init_apply` with `name` and `domain`; the tool initializes OpenCode-managed VibePaper core files and refuses conflicts.
5. Then apply the accepted converted content into the initialized `storyline.md`.

Do not manually create `storyline.md`, `paper.md`, `writingrules.md`, `AGENTS.md`, `.agents/state.json`, or `.agents/events.jsonl` when `vibepaper_init_apply` is available.

If only `.agents/skills/` is missing or incomplete, report that the current OpenCode plugin initialization writes core project files only and does not install the skill library. Do not claim `vibepaper_init_apply` can repair missing skills. Continue only if `storyline.md` exists and the current skill instructions are available in the active agent context.

### Step 8: Update workflow status

After accepted edits:
- If at least one storyline section is filled, set storyline phase to `in_progress`.
- If all storyline sections are materially filled, set storyline phase to `complete`.

Use `vibepaper_workflow_set_phase` for this update. Before calling it, restate the target phase and status and wait for explicit user confirmation. The tool call writes `.agents/state.json` and appends the workflow event to `.agents/events.jsonl`.

Do not run `vibe set-phase` and do not manually edit `.agents/state.json` when the OpenCode plugin tool is available.

## Output Requirements

- Primary output: updated `storyline.md`
- Secondary output: short conversion summary including:
  - source PPT path
  - sections updated
  - sections skipped/missing evidence
  - TODOs intentionally kept

## Quality Bar

Each inserted section should be:
- faithful to slide content
- concise and readable
- logically connected to neighboring storyline sections
- free of fabricated claims

## Must NOT Do

- **NEVER** fabricate claims not present in PPT
- **NEVER** invent numeric results, datasets, or baselines
- **NEVER** alter `storyline.md` section hierarchy (`#####` structure)
- **NEVER** delete unresolved TODOs without evidence
- **NEVER** rewrite the whole file in one blind pass
- **NEVER** treat this as a full paper-writing skill

## Recommended Default Invocation

For this repository, default to:
- source: `target/example_project/research_slides.pptx`
- target: `target/example_project/storyline.md` if present, otherwise project-root `storyline.md`

## End Condition

Stop when one of the following is true:
- user accepts the converted sections for this run
- no more sections can be grounded from PPT evidence
- user pauses or requests manual continuation

At stop time, report:
- completed sections
- unresolved sections (missing slide evidence)
- whether storyline phase status was updated

Next-step prompt rule:
- If unresolved storyline sections remain, explicitly offer both options:
  1. Continue and help finish `storyline.md` (recommended).
  2. Skip for now and directly run `find related work`.
- If all storyline content is complete, suggest proceeding to `find related work`.
