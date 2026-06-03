---
name: state-machine-markdown-helper
description: Helps users write and improve markdown academic paper content using a strict state-machine workflow with context isolation to prevent hallucinations. Use this skill when the user explicitly requests strict state-machine writing or high-fidelity paragraph-by-paragraph writing with RAG.
---

# State Machine Markdown Helper Skill

This skill helps users write markdown content for computer science research papers following the CoPaper GUI structure. It uses a strictly controlled, subagent-based sequential writing workflow to maximize writing quality and user control.

## When to Use This Skill

- User requests to help write paper.md (e.g., "help me write paper.md")
- User wants to systematically draft paragraph by paragraph.
- User wants to improve the quality of markdown academic writing.

## Paper Structure Reference

The paper follows CoPaper structure. Key rules for this skill:
- **Level 1** (`#`): Paper title only.
- **Level 2-5** (`##` to `#####`): Structural headings only — do NOT modify these.
- **Level 6** (`######`): Content paragraphs. Title = topic sentence (≤50 chars). Body = supporting text (≤500 chars).
- **Metadata**: HTML comments `<!-- description: ... -->` guide what each section should contain.

Do NOT read `writingrules.md` — the essential structure rules are inlined above.

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `paper.md` | **Required** | State 0 (outline), State 1 (structure status), State 2 (subagent prompt) | Primary writing target; call `copaper_paper_structure_status` to identify empty Level 5 sections, then read targeted context as needed |
| `storyline.md` | **Required** | State 0 (outline) and State 2 (subagent prompt) | Core research narrative, insights, and method for grounding |
| `.agents/cross_index.json` | Optional but preferred | State 1 (before reading relatedwork summaries) | Cross-reference index; consult FIRST to identify which `relatedwork/papers/*.md` files are relevant to the current section |
| `relatedwork/papers/*.md` | Optional | State 1 (only the summaries identified via cross-index) | Individual literature summaries; read ONLY the specific files identified through `.agents/cross_index.json` lookup |
| `.agents/state.json` | Conditional | State 1 (when writing experiment sections) | Use `copaper_workflow_status` for read-only phase status/current phase/next-step context; read state directly only for fields not exposed by plugin tools, such as `data_files` |
| `fig/` | Conditional | State 2 (when writing sections that reference visuals) | Available figures; list paths so the subagent can reference them |

When the orchestrator needs literature context in State 1, it MUST:
1. Read `.agents/cross_index.json` first to find which papers cover the current section's technical points.
2. Read ONLY the specific `relatedwork/papers/*.md` files identified by the cross-index lookup.
3. Do NOT read all files under `relatedwork/papers/` indiscriminately.

## Strict State-Machine Writing Workflow

The Orchestrator MUST act as a **State Machine** executing a continuous `Read -> Write -> Check -> Save -> Next` loop. To prevent context pollution and hallucination over long writing sessions, **each paragraph generation MUST manage citations strictly and run in a fresh, isolated context**.

You must explicitly announce your current state to the user in every message (e.g., `[State 1: Context Gathering]`). **NEVER use multi-threading/parallel execution.** Write EXACTLY ONE paragraph (Level 6 node) at a time.

### State 0: Initialization (Overall Outline)
*(Execute once per session before starting paragraph writing)*
1. Read `storyline.md` and the existing structure of `paper.md` (Level 1-5 headers and their descriptions).
2. Launch a subagent to propose a comprehensive outline of Level 6 titles (Topic Sentences, ≤50 chars) for each empty Level 5 section.
3. **Present the Outline** and ask for confirmation: *"Here is the proposed overall paragraph outline. Do you want to Accept, Modify, or Regenerate?"*
4. **STOP AND WAIT**. Once approved, continue to State 1.

### State 1: Context & Literature Gathering (READ)
1. Call `copaper_paper_structure_status` to locate the next incomplete Level 5 writing target. Use the tool's `nextTarget`, `level5Targets`, `summary`, and `violations` instead of manually scanning `paper.md`.
2. **Retrieve RAG Data:**
   - Search `.agents/cross_index.json` first to identify papers relevant to this section's technical points.
   - Read snippets from `relatedwork/summary.md`.
   - If deeper details are needed, use `read_file` on the specific `.md` files in `relatedwork/papers/`.
   - If writing experiments, call `copaper_workflow_status` to check workflow phase status, current phase, and next-step recommendation. Use its phase table to verify whether `experiments` is `complete`. If experiment data paths are still needed, read `.agents/state.json` only for `data_files` because the current plugin does not expose a dedicated data-file lookup tool.
3. **Output Fact Sheet:** Generate a strictly formatted "**Fact & Citation Sheet**" containing the core claims to be written and their exact citation tags (e.g., `[@author2024]`).
4. **Announce and Ask**: Show the target section and Fact Sheet to the user. Ask: *"Target section: **[Level 5 Title]**. Shall I launch the writing subagent using this Fact Sheet?"*
5. **STOP AND WAIT** for confirmation. Don't proceed.

`copaper_paper_structure_status` is read-only. It does not write `paper.md`, update `.agents/state.json`, append `.agents/events.jsonl`, or advance workflow phases. Do not replace it with prompt-only heading scans, shell parsing, or manual completion inference when the plugin tool is available.

### State 2: Fresh Subagent Drafting (WRITE)
1. Once confirmed, launch an independent subagent (`runSubagent` or `task`). **CRITICAL: Ensure it operates in a fresh context.** Do not pass your entire chat history.
2. **Prompt Requirements**: The subagent prompt MUST include:
   - "Draft EXACTLY ONE Level 6 node for: [Level 5 Title]."
   - "Use this Fact & Citation Sheet: [Insert Fact Sheet from State 1]. You MUST include the correct `[@citations]`."
   - "Follow structure: Level 6 title ≤50 chars, body ≤500 chars. DO NOT modify Level 2-5 headers."
   - "Read `storyline.md` for core narrative and `paper.md` for surrounding context."
   - "Check `fig/` directory with `Glob('fig/*')` if relevant."
   - "**Style Instructions:** Plain academic language, concise, persuasive, standard English/Chinese terminology mix ('Loss' instead of '误差')."
3. Wait for the subagent to return the drafted text.

### State 3: Self-Check & Human Review (CHECK)
1. **Self-Check**: Verify the drafted paragraph stringently: Is the body ≤500 chars? Are citations correctly applied?
2. **Human Review**: Display the drafted paragraph to the user.
3. **Ask**: *"Here is the drafted paragraph. Do you want to Accept, Modify (provide feedback), or Rewrite completely?"*
4. **STOP AND WAIT**. If modified, relaunch the subagent with the feedback.

### State 4: Apply & Save (SAVE)
1. Use the `Edit` tool to safely insert the drafted Level 6 node under the target Level 5 node in `paper.md`.
2. Do not manually append to `.agents/events.jsonl`; the current plugin does not expose a generic event-append tool for paragraph insertion logs.

### State 5: Context Reset (NEXT LOOP)
1. To prevent context explosion and memory leak across paragraphs, you MUST halt the loop and require the user to clear the context.
2. **Output this exact message to the user**: 
   > *"Paragraph inserted successfully. To prevent context pollution and hallucinations over long writing sessions, please clear the context / open a new chat and say 'Continue writing' to proceed to the next paragraph."*
3. **STOP AND TERMINATE CURRENT SESSION**. Do not proceed to the next paragraph in this chat.

## Action Logging

Use plugin tools for workflow events whenever possible. The current OpenCode plugin only appends events for supported tool actions such as `copaper_workflow_set_phase` and `copaper_artifact_record`; it does not expose a generic event-append tool for paragraph insertion logs.

Do not append to `.agents/events.jsonl` manually when using the plugin-based workflow. Report this limitation if the user asks for paragraph-level event logging.
If the user asks to inspect workflow event history, call `copaper_workflow_log` for read-only querying instead of reading `.agents/events.jsonl` directly.

## Crucial Anti-Patterns
- **NEVER** write multiple paragraphs at once without user interactive review.
- **NEVER** start paragraph writing without generating and validating the overall outline first (Step 1).
- **NEVER** insert content into `paper.md` without the user explicitly reviewing and accepting the draft in Step 4.
- **NEVER** modify Level 2-5 headers. Only append Level 6 nodes.
