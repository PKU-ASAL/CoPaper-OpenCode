---
name: markdown-helper
description: Helps users write and improve markdown academic paper content following VibePaper GUI structure. Use this skill when the user wants to write or improve paper.md content for academic quality.
---

# Markdown Helper Skill

This skill helps users write markdown content for computer science research papers following the VibePaper GUI structure. It uses a strictly controlled, subagent-based sequential writing workflow to maximize writing quality and user control.

## When to Use This Skill

- User requests to help write paper.md (e.g., "help me write paper.md")
- User wants to systematically draft paragraph by paragraph.
- User wants to improve the quality of markdown academic writing.

## Paper Structure Reference

The paper follows VibePaper structure. Key rules for this skill:
- **Level 1** (`#`): Paper title only.
- **Level 2-5** (`##` to `#####`): Structural headings only — do NOT modify these.
- **Level 6** (`######`): Content paragraphs. Title = topic sentence (≤50 chars). Body = supporting text (≤500 chars).
- **Metadata**: HTML comments `<!-- description: ... -->` guide what each section should contain.

Do NOT read `writingrules.md` — the essential structure rules are inlined above.

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `paper.md` | **Required** | State 0 (outline), State 1 (scan), State 2 (subagent prompt) | Primary writing target; scan for empty sections, read for context |
| `storyline.md` | **Required** | State 0 (outline) and State 2 (subagent prompt) | Core research narrative, insights, and method for grounding |
| `.agents/cross_index.json` | Optional but preferred | State 1 (before reading relatedwork summaries) | Cross-reference index; consult FIRST to identify which `relatedwork/papers/*.md` files are relevant to the current section |
| `relatedwork/papers/*.md` | Optional | State 1 (only the summaries identified via cross-index) | Individual literature summaries; read ONLY the specific files identified through `.agents/cross_index.json` lookup |
| `.agents/state.json` | Conditional | State 1 (when writing experiment sections) | Use `vibepaper_workflow_status` for read-only phase status/current phase/next-step context; read state directly only for fields not exposed by plugin tools, such as `data_files` |
| `fig/` | Conditional | State 2 (when writing sections that reference visuals) | Available figures; list paths so the subagent can reference them |

When the orchestrator needs literature context in State 1, it MUST:
1. Read `.agents/cross_index.json` first to find which papers cover the current section's technical points.
2. Read ONLY the specific `relatedwork/papers/*.md` files identified by the cross-index lookup.
3. Do NOT read all files under `relatedwork/papers/` indiscriminately.

## Strict Step-by-Step Writing Workflow

The Orchestrator MUST follow this interactive, sequential workflow strictly. **NEVER use multi-threading/parallel execution for writing tasks.** Write EXACTLY ONE paragraph (Level 6 node) at a time.

### Step 1: Generate Overall Outline (WAIT FOR USER)
1. When starting a writing session, before drafting individual paragraphs, generate a comprehensive outline of what will be written.
2. Read `storyline.md` and the existing structure of `paper.md` (Level 1-5 headers and their descriptions).
3. Launch a subagent to propose a high-level outline. This outline should consist of proposed Level 6 titles (Topic Sentences, ≤50 chars) for each empty Level 5 section.
4. **Present the Outline**: Show the proposed list of Level 6 titles grouped under their respective Level 5 headers to the user.
5. **Ask for Confirmation**: *"Here is the proposed overall paragraph outline (topic sentences) for the paper sections. Do you want to Accept, Modify, or Regenerate?"*
6. **STOP AND WAIT** for user confirmation. Once the user approves the outline, proceed to draft paragraphs one by one.

### Step 2: Scan & Propose Paragraph (WAIT FOR USER)
1. Read `paper.md` from top to bottom.
2. Locate the **FIRST Level 5 node (#####) or deeper that has NO Level 6 child nodes yet**.
3. Extract its `description` metadata (and reference its approved Level 6 title from Step 1).
4. **Announce and Ask**: Tell the user which section is next and its description. Ask: *"I found section **[Level 5 Title]** is next. Shall I launch a writing subagent to draft this paragraph based on our approved outline?"*
5. **STOP AND WAIT** for user confirmation. Do not proceed.

### Step 3: Delegate to Subagent
1. Once confirmed, use the `task` or `runSubagent` tool to launch an independent subagent for writing (`category="writing"`, `run_in_background=false`).
2. **Prompt Requirements**: The prompt to the subagent MUST include:
   - "Please draft EXACTLY ONE Level 6 node for the section: [Level 5 Title]."
   - "Follow the description: [description metadata] and the approved outline topic: [Approved Level 6 Title]."
   - "Follow the Paper Structure Reference: Level 6 title ≤50 chars, body ≤500 chars, do not modify Level 2-5 headers."
   - "Read `storyline.md` for core narrative."
   - "Read `paper.md` to understand context and what has been written so far."
   - "Read `.agents/cross_index.json` FIRST to identify which `relatedwork/papers/*.md` files are relevant to the current section's technical points. Then read ONLY those specific summaries — do NOT read all files under `relatedwork/papers/` indiscriminately."
   - "Call `vibepaper_workflow_status` to check workflow phase status, current phase, and next-step recommendation. Use its phase table to verify whether `experiments` is `complete`. If it is complete and experiment data paths are still needed, read `.agents/state.json` only for `data_files` because the current plugin does not expose a dedicated data-file lookup tool."
   - "Check `fig/` directory with `Glob('fig/*')`. If relevant figures exist, reference them in your writing using markdown image syntax."
   - "Output ONLY the drafted Level 6 node (###### Title + Content). DO NOT edit `paper.md` yourself."
   - "**Writing Style Instructions**: 
     1. Strictly follow the Paper Structure Reference: Level 6 title ≤50 chars, body ≤500 chars, do not modify Level 2-5 headers.
     2. Use plain, academic language. Do not use meaningless buzzwords, but maintain persuasive arguments.
     3. Be concise: if it can be said simply, do not artificially expand the text. Do not stretch to hit word limits.
     4. Maintain persuasive power by properly citing literature or evidence where applicable.
     5. You do not need to force Chinese translations for technical terms; use English/Chinese mix according to standard academic habits (e.g., use 'Loss' instead of forcing '误差')."
3. Wait for the subagent to return the drafted text.

### Step 4: Post-Writing Review (WAIT FOR USER)
1. Display the subagent's drafted paragraph to the user.
2. **Ask**: *"Here is the drafted paragraph. Do you want to Accept, Modify (please provide feedback), or Rewrite completely?"*
3. **STOP AND WAIT** for user confirmation.

### Step 5: Apply or Iterate
- If **Accept**: The Orchestrator uses the `Edit` tool to safely insert the drafted Level 6 node under the target Level 5 node in `paper.md`. Then loop back to Step 2.
- If **Modify/Rewrite**: Launch the subagent again (passing the context and user's feedback). Repeat Step 4.

## Action Logging

Use plugin tools for workflow events whenever possible. The current OpenCode plugin only appends events for supported tool actions such as `vibepaper_workflow_set_phase` and `vibepaper_artifact_record`; it does not expose a generic event-append tool for paragraph insertion logs.

Do not append to `.agents/events.jsonl` manually when using the plugin-based workflow. Report this limitation if the user asks for paragraph-level event logging.
If the user asks to inspect workflow event history, call `vibepaper_workflow_log` for read-only querying instead of reading `.agents/events.jsonl` directly.

## Crucial Anti-Patterns
- **NEVER** write multiple paragraphs at once without user interactive review.
- **NEVER** start paragraph writing without generating and validating the overall outline first (Step 1).
- **NEVER** insert content into `paper.md` without the user explicitly reviewing and accepting the draft in Step 4.
- **NEVER** modify Level 2-5 headers. Only append Level 6 nodes.
