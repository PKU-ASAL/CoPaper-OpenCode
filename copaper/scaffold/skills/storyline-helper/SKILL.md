---
name: storyline-helper
description: Guides users through constructing and refining their research storyline in storyline.md. It can also reverse-extract storyline structure from an existing paper.md. Interactive, section-by-section workflow that polishes user input without inventing content. Triggers on "help me write storyline", "帮我写 storyline", "构建研究主线".
---

# Storyline Helper Skill

This skill guides users through constructing their research storyline in `storyline.md`. It follows a strictly controlled, interactive, section-by-section workflow that **only polishes user-provided input** — it never auto-generates storyline content. The user's research insight is the soul of the paper; this skill helps express it clearly and structurally.

## When to Use This Skill

- User requests to help write storyline (e.g., "help me write storyline", "帮我写 storyline", "构建研究主线")
- User wants to systematically fill in their storyline section by section
- User wants to refine or improve existing storyline content
- User already has `paper.md` and wants to reverse-extract or backfill `storyline.md`

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `storyline.md` | **Required** | Step 1 (structure status) | Primary target file; inspect through `copaper_storyline_structure_status` for empty/partial/filled sections |
| `paper.md` | Conditional | Reverse-extraction mode only | Source for reverse-extracting storyline content when `storyline.md` is sparse |
| `.agents/state.json` | Tool-managed | Step 5 (after applying edits) | Update storyline phase through `copaper_workflow_set_phase`; do not edit the file directly |

Do NOT read `writingrules.md` — this skill works with the existing `storyline.md` structure directly.

## Storyline Structure Overview

`storyline.md` contains approximately 19 sections organized under `#####` headers. Each section has instructional guidance (bold text) and TODO placeholders. The sections form a logical research narrative:

| # | Section | Purpose |
|---|---------|---------|
| 1 | 问题描述 | One-sentence problem definition with key points |
| 2 | 问题重要性 | Evidence-based arguments for why the problem matters |
| 3 | 问题重要性：实证研究（选填） | Empirical study design to support importance claims |
| 4 | 背景知识 | Technical background and key concepts |
| 5 | 解决问题的现有相关方法 | Direct and indirect existing methods, their limitations |
| 6 | 现有相关方法的共性缺陷 | Root-cause analysis of shared limitations |
| 7 | 解决共性缺陷的难点/挑战 | Technical challenges in overcoming shared limitations |
| 8 | Insights | Core new insights (1-3, ideally 1) |
| 9 | 新的 Insights 的本质区别 | Fundamental differences from prior approaches |
| 10 | 新的 Insights 的技术难点 | Technical difficulties in realizing the insights |
| 11 | 新的 Insights 的正确性：Insight 1 | Conceptual justification for insight correctness |
| 12 | Motivating Example | Concrete example showing deficiency and insight advantage |
| 13 | 新的 Insights 下解决难点/挑战的思路 | Solution approach based on insights |
| 14 | 设计方案：Overview | Architecture overview with key components |
| 15 | 设计方案：组件1 | Component-level design details |
| 16 | 实验：架构设计有效性 | Multiple experiment sections (metrics, baselines, datasets, methods, results) |
| 17 | 实验：讨论现有方法性能不够好的技术原因 | Analysis of why baselines underperform |
| 18 | 实验：Insights 正确性 | Experimental validation of insights |
| 19 | 实验：重要模块对实验结果的影响 | Ablation study for key modules |
| 20 | 关于实验部分的典型拒稿理由 | Common rejection reasons to avoid |

## Section Detection Logic

Use `copaper_storyline_structure_status` for section readiness whenever the plugin tool is available. The tool is read-only and validates that `storyline.md` is present, safe, and structurally readable. It does not write `storyline.md`, update `.agents/state.json`, append `.agents/events.jsonl`, or advance workflow phases.

The tool classifies sections using this logic:

A section is considered **empty** if, after its `#####` header line, the content contains only:
- `TODO` placeholders (any line containing `TODO`)
- Blank lines
- The section's instructional guidance text (bold lines starting with `**`)

A section is considered **filled** if it contains substantive content beyond TODO placeholders and instructional text.

Do not replace `copaper_storyline_structure_status` with prompt-only section scans, shell existence checks, shell parsing, or manual completion inference when the plugin tool is available.

## State Management

This skill updates workflow progress through the OpenCode plugin tool:
- When the first section is filled: call `copaper_workflow_set_phase` with `phase: "storyline"` and `status: "in_progress"`.
- When all sections are filled: call `copaper_workflow_set_phase` with `phase: "storyline"` and `status: "complete"`.
- Before calling the tool, restate the phase/status update and wait for explicit user confirmation.
- The tool call writes `.agents/state.json` and appends the workflow event to `.agents/events.jsonl`.
- Do not call `copaper set-phase`, use `StateManager.set_phase_status`, or manually edit `.agents/state.json` when the plugin tool is available.

## Reverse Extraction Mode (`paper.md` → `storyline.md`)

This skill also supports a reverse path when the user already has substantial `paper.md` content but wants to reconstruct or refine `storyline.md`.

Use this mode when:

- `storyline.md` is sparse but `paper.md` already contains concrete claims, motivation, method, or evaluation planning
- the user explicitly asks to derive storyline from paper
- the user wants to compare the current paper draft against the original storyline and backfill missing storyline sections

Reverse extraction rules:

1. Read both `paper.md` and `storyline.md`.
2. Select exactly one storyline section at a time.
3. Extract only claims, evidence, constraints, or design points that already appear in `paper.md`.
4. Rewrite the extracted content so it fits the selected storyline section's template and TODO slots.
5. Preserve unresolved TODO placeholders for anything not supported by `paper.md`.
6. Present the candidate storyline section to the user for confirmation before editing `storyline.md`.

This is still a controlled polishing workflow, not autonomous content creation.

## Strict Step-by-Step Workflow

The Orchestrator MUST follow this interactive, sequential workflow strictly. **NEVER use multi-threading/parallel execution for storyline tasks.** Work on EXACTLY ONE section at a time.

### Step 1: Scan & Present (WAIT FOR USER)

1. Call `copaper_storyline_structure_status`.
2. If the tool reports missing, unsafe, or unreadable `storyline.md`, stop and report the tool error instead of manually scanning files.
3. Use the returned `sections`, `nextSection`, and `summary` to identify empty, partial, and filled storyline sections.
4. Compile a list of empty or partial sections with their section numbers and titles.
5. **Present to the user**: Show the list of empty sections and ask which one they want to work on next. Example:
   > "I found the following empty sections in your storyline:
   > 1. 问题描述
   > 2. 问题重要性
   > 5. 解决问题的现有相关方法
   > ...
   > Which section would you like to work on? You can also say 'next' to start from the first empty section."
6. **STOP AND WAIT** for user selection. Do not proceed.

### Step 2: Show Section Guidance & Collect Input (WAIT FOR USER)

1. Once the user selects a section, display the section's full content from `storyline.md` — including the instructional guidance (bold text) and all TODO placeholders.
2. Explain what this section requires in plain language, based on the instructional guidance.
3. **Ask the user**: *"Please provide your thoughts, data, or key points for this section. You can write in any format — bullet points, rough sentences, or even just keywords. I will help polish it into proper storyline content."*
4. **STOP AND WAIT** for user input. Do not proceed.

### Step 3: Polish via Subagent (Task Tool)

1. Once the user provides their input, use the `task` tool to launch an independent subagent (`category="writing"`, `run_in_background=false`).
2. **Prompt Requirements**: The prompt to the subagent MUST include:
   - "Please polish the user's input for storyline section: [Section Title]."
   - "The section's instructional guidance is: [extracted guidance text]."
   - "User's raw input: [user's exact input]."
   - "**CRITICAL RULES**:"
   - "1. Preserve the user's original meaning and intent. Do NOT add content the user did not mention."
   - "2. Only improve expression: fix grammar, clarify ambiguity, tighten wording, improve logical flow."
   - "3. Keep the same structure as the section template in `storyline.md` — maintain all bullet points, sub-items, and TODO placeholders that the user has NOT yet addressed."
   - "4. Replace only the TODO placeholders that correspond to the user's input."
   - "5. Use plain, academic language. Avoid buzzwords. Be concise."
   - "6. Do NOT force Chinese translations for technical terms; use English/Chinese mix per standard academic conventions."
   - "7. Output ONLY the polished section content (everything under the `#####` header, not including the header itself). DO NOT edit `storyline.md` yourself."
3. Wait for the subagent to return the polished text.

### Step 4: Review & Confirm (WAIT FOR USER)

1. Display the polished section content to the user.
2. **Ask**: *"Here is the polished content for section **[Section Title]**. Do you want to Accept, Modify (please provide feedback), or Rewrite completely?"*
3. **STOP AND WAIT** for user confirmation.

### Step 5: Apply or Iterate

- If **Accept**: The Orchestrator uses the `Edit` tool to replace the section content in `storyline.md` under the correct `#####` header. Then:
  1. Call `copaper_storyline_structure_status` again to check whether all sections are now filled.
  2. Restate the intended workflow update and wait for user confirmation.
  3. Call `copaper_workflow_set_phase` with `phase: "storyline"` and `status: "in_progress"` if any section is filled, or `status: "complete"` if all sections are filled.
  4. Treat the tool output as the audit record because it writes state and appends the workflow event.
  5. Ask the user: *"Section **[Section Title]** has been filled. Would you like to continue with the next empty section?"* If yes, loop back to Step 2 with the next empty section.
- If **Modify/Rewrite**: Launch the subagent again (use `session_id` to continue its context), passing the user's feedback. Repeat Step 4.

## Crucial Anti-Patterns

- **NEVER** auto-generate storyline content. The skill only polishes user-provided input.
- **NEVER** modify `storyline.md` structure (##### headers, instructional text). Only fill content under existing headers.
- **NEVER** skip user confirmation. Every section must be reviewed before writing.
- **NEVER** work on multiple sections at once. One section at a time.
- **NEVER** remove or alter TODO placeholders that the user has not addressed. Only replace TODOs that correspond to the user's input.
- **NEVER** add insights, data, or arguments that the user did not provide. The storyline must reflect the user's research, not AI fabrications.
- **NEVER** invent storyline content that is not present in the user's input or the existing `paper.md` when using reverse extraction mode.

## Trigger Words

This skill is activated when the user says any of the following:
- "help me write storyline"
- "帮我写 storyline"
- "构建研究主线"
- "write storyline"
- "fill in storyline"
- "完善 storyline"
