---
name: writing-orchestrator
description: Orchestrates structured paper framework writing by scanning paper.md completion status, recommending writing order, and offering fine mode (markdown-helper), strict mode (state-machine-markdown-helper), or fast mode (mad-writer). Auto-triggers 7-checker review after each section. Use this skill when the user wants to write or start writing their paper systematically.
---

# Writing-Orchestrator Skill

This skill is the human-led writing coordinator for VibePaper.
It inspects `paper.md`, shows what is complete or still empty, recommends the next section based on logical dependency, and routes the user to `markdown-helper`, `state-machine-markdown-helper`, or `mad-writer` while treating `markdown-review` as the mandatory review gate.

## When to Use This Skill

Use this skill when the user wants to write the paper systematically instead of jumping directly into freeform drafting.

Typical triggers:
- `write paper framework`
- `撰写论文框架`
- `开始写论文`
- `systematically write my paper`
- `which section should I write next`

Use it when the user wants to:
- scan `paper.md` and understand current completion status
- get a progress overview before writing
- receive a recommended writing order
- choose between a careful mode and a faster mode
- enforce a seven-checker review after each completed section

This skill is an orchestrator, not a direct replacement for drafting or revision skills.

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `paper.md` | **Required** | Step 1 (structure status) | Primary target; inspect through `vibepaper_paper_structure_status` for Level 2-5 completion and Level 5 writing targets |
| `storyline.md` | Conditional | When recommending writing order | Research narrative for dependency-aware section ordering |
| Checker status | Conditional | Step 6 and Step 7 | Use `vibepaper_checker_status` for read-only checker run status, stale signals, and severity counts |
| `.agents/state.json` | Conditional | Step 8 (progress tracking) | Workflow phase status via `vibepaper_workflow_set_phase`; arbitrary writing metadata only if a dedicated tool exists |
| `.agents/cross_index.json` | Conditional | When routing to markdown-helper or mad-writer | Paper-technique mappings; pass to downstream skills for literature context |
| `relatedwork/papers/*.md` | Conditional | When routing to markdown-helper or mad-writer | Individual literature summaries; pass to downstream skills, not read directly by orchestrator |
| `fig/` | Conditional | When routing to markdown-helper or mad-writer | Available figures; pass to downstream skills for visual references |

Do NOT read `writingrules.md` — this skill delegates writing to `markdown-helper` or `mad-writer`, which handle structure rules internally.

If some sources are missing, continue with available context and state what is missing.

## Completion Scan Rules

The orchestrator must call `vibepaper_paper_structure_status` to inspect `paper.md` completion instead of manually scanning headings when the plugin tool is available.

This tool is read-only. It does not write `paper.md`, update `.agents/state.json`, append `.agents/events.jsonl`, or advance workflow phases.

Use the tool output as the source of truth:
- `headings`: Level 2-5 structure with `complete`, `partial`, or `incomplete` status
- `level5Targets`: primary operational writing targets
- `nextTarget`: first incomplete Level 5 writing target
- `violations`: structural problems such as body text under Level 2-5 headings or Level 6 length violations

Reporting refinement:
- Use **partial** for parent nodes whose descendants are mixed.
- Treat Level 5 nodes as the primary operational writing targets.
- Never modify Level 2-5 headings during scanning.

## Workflow

### Step 1: Call `vibepaper_paper_structure_status`

1. Call `vibepaper_paper_structure_status`.
2. Use the returned `headings`, `level5Targets`, `nextTarget`, `summary`, and `violations`.
3. If the tool reports missing or invalid `paper.md`, stop and tell the user the framework file is required first.
4. Do not reproduce this scan manually, shell out to parse markdown, or infer completion from ad hoc file reads when the plugin tool is available.

### Step 2: Display structure overview and progress summary

Show a compact overview of the paper structure.

Recommended output shape: show counts for Complete / Partial / Incomplete and then print the relevant heading tree with status markers such as `## Introduction [partial]` and `### Existing Methods [incomplete]`.

The overview must:
- show completed and incomplete sections clearly
- expose partial parent sections clearly
- include a numeric summary
- make the next writing target easy to choose

### Step 3: Recommend writing order based on logical dependencies

Recommend the next section based on dependency, not only on textual position.

Core dependency chain:
1. `Insight`
2. `Problem Definition`
3. `Existing Methods`
4. `Technical Limitations`
5. `Method Design`
6. `Experiments`

Practical paper-level order:
1. Introduction core
2. Related Work
3. Method
4. Experiments
5. Discussion
6. Conclusion

Recommendation rules:
- prefer the earliest incomplete section whose prerequisites already exist
- prefer core argument sections before polish sections
- explain why the recommended section unlocks later writing

### Step 4: User selects a section and chooses a mode

After showing the overview and recommendation, ask the user which section they want to write.
Then offer exactly three writing modes.

#### Fine Mode (精细模式)

Invoke `markdown-helper`.

Use this mode when:
- the section is strategically important
- the user wants paragraph-by-paragraph confirmation
- the section contains core claims, motivation, or method novelty

Requirements:
- keep the human in the loop for each paragraph
- rely on `markdown-helper` instead of re-implementing its logic
- preserve its review-before-insert workflow

#### Strict Mode (严格模式/状态机模式)

Invoke `state-machine-markdown-helper`.

Use this mode when:
- the user is writing a section heavily dependent on long literature constraints and RAG
- maximum protection against LLM hallucination and context pollution is needed
- strict phase isolation (Gather Facts -> Isolate Write -> Save -> Reset) is desired

Requirements:
- rely on `state-machine-markdown-helper` for the execution logic
- alert the user that this mode requires starting a new chat context after every paragraph

#### Fast Mode (快速模式)

Invoke `mad-writer`.

Use this mode when:
- the section is less delicate
- the user wants faster progress on a larger unfinished region
- the section is descriptive, comparative, or bulk-writing heavy

Requirements:
- rely on `mad-writer` for write→check→fix cycles
- keep the scope tied to the selected section or selected target group
- let the human review the resulting section outcome
- do not duplicate `mad-writer` logic here

### Step 5: Auto-trigger seven-checker review after each section

After the selected section is complete, automatically invoke `markdown-review`.
This review is mandatory after every completed section.

The required checker order is:
1. `problem-checker`
2. `novelty-checker`
3. `technical-depth-checker`
4. `logic-checker`
5. `clarity-checker`
6. `evaluation-protocol-checker`
7. `data-checker`

Never skip this review stage.

### Step 6: Show seven-checker results and suggest revision path

After review:
1. call `vibepaper_checker_status` to read the current checker status, severity counts, stale signals, and precheck evidence
2. show a compact seven-checker summary from the review output plus the tool status
3. separate Critical, Major, and Minor issues
4. explain which issues matter most for the finished section
5. if the user wants durable checker summaries, restate the checker record details and route the confirmed action to `@vibepaper-recorder` so it can call `vibepaper_checker_record`
6. ask whether modifications are needed
7. if yes, suggest `review-revise`

Do not fabricate checker results.
Use real review output or `vibepaper_checker_status`; do not read `.agents/state.json` directly just to infer checker status when the plugin tool is available.

### Step 7: Run a final full review after all sections are complete

When the scan shows no incomplete writing targets remain:
1. announce that the framework is fully populated
2. run one final full `markdown-review`
3. call `vibepaper_checker_status` to verify status freshness and severity counts
4. present the final seven-checker summary
5. suggest `review-revise` if unresolved issues remain

This final pass checks whole-paper consistency instead of only local section quality.

### Step 8: Update workflow phase with plugin tools

At the end of each cycle, update workflow phase status through the OpenCode plugin tool when appropriate.

Use `vibepaper_workflow_set_phase`:
- after accepted writing edits, set `phase: "writing"` and `status: "in_progress"`
- after all writing targets and the final full review are complete, set `phase: "writing"` and `status: "complete"`

Before calling the tool, restate the phase/status update and wait for explicit user confirmation. The `vibepaper_workflow_set_phase` call writes `.agents/state.json` and appends `.agents/events.jsonl`; do not replace it with prompt-only status text.

The current OpenCode plugin does not expose a dedicated tool for arbitrary writing metadata such as current mode, selected section path, completion snapshot, or review-revise history. It can record confirmed checker run summaries through `vibepaper_checker_record`. Do not manually edit `.agents/state.json` for unsupported fields when using the plugin-based workflow; report the limitation instead.

## Writing Order Recommendation

Use this recommendation table when advising the user.

| Order | Section Focus | Why It Comes Here |
|---|---|---|
| 1 | Insight | The paper needs a clear core claim before other sections can align. |
| 2 | Problem Definition | The reader must understand what matters and why it matters. |
| 3 | Existing Methods | Prior work defines the baseline and contextualizes the gap. |
| 4 | Technical Limitations | The paper must explain why current methods are insufficient. |
| 5 | Method Design | The solution should respond directly to the stated gap. |
| 6 | Experiments | Evaluation is convincing only after goals and design are clear. |
| 7 | Discussion | Interpretation depends on method details and evidence. |
| 8 | Conclusion | The ending should summarize arguments that already exist. |

Rationale summary: Insight anchors the story, problem definition turns it into a research need, prior work and limitations justify the new method, method design answers the validated problem, and experiments validate the claims. Discussion and conclusion usually come later because they synthesize earlier work. If the user chooses a later section first, allow it, but explain the dependency tradeoff.

## Writing Modes Comparison

Use this comparison when the user is choosing a mode.

| Dimension | Fine Mode (`markdown-helper`) | Strict Mode (`state-machine-markdown-helper`) | Fast Mode (`mad-writer`) |
|---|---|---|---|
| Chinese label | 精细模式 | 严格模式 / 状态机模式 | 快速模式 |
| Control level | Very high | Absolute | Moderate |
| Writing unit | One paragraph at a time | One paragraph at a time (isolated) | Section-oriented batch output |
| Human confirmation | Required for each paragraph | Required + must reset chat | Review after batch output |
| Best for | Core arguments, fast iteration | Highly technical/RAG sections, long narratives | Backgrounds, bulk descriptions |
| Strength | Fluid precision | Perfect grounding, zero memory leak | Speed and throughput |
| Risk | LLM context might balloon over time | Slow, frequent interaction breaks | Less paragraph-level precision |

Mode guidance: Fine Mode is best for fluid paragraph-by-paragraph arguments; Strict Mode is essential for rigorous, RAG-heavy writing where hallucination must be zero; Fast Mode is better for large baseline sections where structural bulk drafting is acceptable.

The interaction loop must remain section-by-section: scan, summarize, recommend, let the user pick a section and mode, invoke the downstream skill, run `markdown-review`, report results, update workflow phase through `vibepaper_workflow_set_phase` when appropriate, and return to the overview. Do not silently expand into full-paper auto-writing.

## Must NOT Do

- **NEVER** replace `markdown-helper` or `mad-writer`; call them instead
- **NEVER** auto-write the entire paper in one pass
- **NEVER** skip the seven-checker review after a completed section
- **NEVER** modify Level 2-5 framework headings during orchestration
- **NEVER** fabricate completion state without reading `paper.md`
- **NEVER** fabricate checker results instead of invoking or reading `markdown-review`
- **NEVER** manually edit `.agents/state.json` for workflow phase updates when `vibepaper_workflow_set_phase` is available

## End Condition

Stop cleanly when:
- the user pauses after the current overview
- the user finishes one selected section and stops
- the paper framework is fully populated and the final review has run

At stop time, summarize:
- the last completed section
- which mode was used
- current completion counts
- whether seven-checker review ran
- whether follow-up revision is recommended
