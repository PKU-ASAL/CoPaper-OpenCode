---
name: experiment-analyzer
description: Helps users understand experiment code, analyze results, and review experimental protocols. Use this skill when the user wants to analyze experiments, understand code, or review experimental design.
---

# Experiment Analyzer Skill

This skill helps users understand experiment code, analyze experimental results, and review experimental protocols. It operates in four distinct modes, each tailored to a specific phase of the experiment workflow. The skill bridges the gap between raw experiment artifacts and the structured evaluation sections required by `paper.md`.

## When to Use This Skill

- User says "analyze experiments" or "帮我分析实验"
- User says "understand experiment code" or "理解实验代码"
- User says "analyze results" or "分析实验结果"
- User says "review experimental protocol" or "审查实验方案"
- User says "review experimental design" or "审查实验设计"
- User wants help interpreting experimental data or results
- User wants to skip experiments and provide data directly ("skip experiments" / "跳过实验")
- User wants to map experiment code to research questions

## Workflow

### Step 1: Determine Mode

Ask the user which mode they need. Present the four options clearly:

a) **Code Understanding** — Analyze experiment code structure, identify key modules, data flow, and how code maps to research questions.
b) **Result Analysis** — Interpret experimental data (CSV/JSON/text), compare baselines, generate analysis reports, and suggest supplementary experiments.
c) **Protocol Review** — Review experimental design for rigor and completeness (delegates to `evaluation-protocol-checker`).
d) **Skip** — User provides data directly; skip the experiment phase and update state accordingly.

**STOP AND WAIT** for the user to select a mode before proceeding.

### Step 2a: Code Understanding Mode

This mode helps users understand their experiment codebase and how it relates to their research questions.

1. **Scan code directory**: Ask the user for the path to their experiment code directory. Use the `Read` and `Glob` tools to explore the directory structure.
2. **Identify key modules**: Locate entry points, configuration files, data processing pipelines, model definitions, training scripts, and evaluation scripts.
3. **Map code to RQs**: Read `storyline.md` and `paper.md` to extract the stated research questions. Then trace each RQ to the corresponding code module(s) that address it.
4. **Generate architecture document**: Produce a structured summary including:
   - Directory tree with brief descriptions of each module
   - Data flow diagram (text-based): input → preprocessing → model → evaluation → output
   - RQ-to-code mapping table (which RQ is tested by which script/config)
   - Key dependencies and their versions
   - Entry points and how to run each experiment
5. **Annotate key modules**: For each major module, provide:
   - Purpose (what it does)
   - Inputs and outputs
   - How it connects to other modules
   - Which RQ(s) it addresses
6. **Present to user**: Display the architecture document and RQ mapping. Ask the user if they want to dive deeper into any specific module.

### Step 2b: Result Analysis Mode

This mode helps users interpret experimental data and generate analysis reports.

1. **Locate result files**: Ask the user for the path to their experiment results. Accept CSV, JSON, TXT, or log file formats. Use `Glob` to discover files if a directory is provided.
2. **Read and parse data**: Use the `Read` tool to load result files. Parse tables, extract metrics, and identify the structure of each result file.
3. **Compare baselines**: For each metric, compare the user's method against baselines. Highlight:
   - Which metrics show improvement and by how much
   - Which metrics show degradation
   - Statistical significance (if reported)
   - Best and worst performing scenarios
4. **Cross-reference with RQs**: Read `storyline.md` and `paper.md` to identify stated RQs. For each RQ, determine:
   - Is this RQ answered by the available results?
   - Are there gaps where results are missing?
   - Do the results support or contradict the claimed insight?
5. **Generate analysis report**: Produce a structured report including:
   - Per-RQ result summary (answered / partially answered / not answered)
   - Metric comparison table (method vs. baselines)
   - Key findings and their implications
   - Gaps and missing experiments
6. **Suggest supplementary experiments**: Based on gaps identified, suggest:
   - Additional experiments needed to answer unanswered RQs
   - Ablation studies that would strengthen claims
   - Parameter sensitivity analyses
   - Additional baselines worth comparing against
7. **Present to user**: Display the analysis report. Ask if they want to refine any section or run additional analyses.

### Step 2c: Protocol Review Mode

This mode reviews the experimental design for rigor and completeness. It delegates the core analysis to the `evaluation-protocol-checker` skill.

1. **Invoke evaluation-protocol-checker**: Use the `evaluation-protocol-checker` skill to perform a comprehensive protocol review. This checks:
   - RQ coverage (insight alignment, design alignment)
   - Threats to validity (internal, external, construct, conclusion)
   - Baseline selection adequacy
   - Metric appropriateness
   - Protocol completeness
2. **Review checker results**: Read the output from `evaluation-protocol-checker`. Summarize the key findings for the user.
3. **Discuss with user**: Present the protocol review results and discuss:
   - Critical issues that must be addressed before running experiments
   - Major issues that could weaken evaluation
   - Minor improvements that could strengthen rigor
   - Specific suggestions for each identified gap
4. **Iterate**: If the user wants to revise their protocol, help them update `paper.md` accordingly, then re-run the protocol review.

**Note**: The `evaluation-protocol-checker` skill uses a detailed 10-category issue taxonomy and standardized comment format. Refer to its SKILL.md for the full classification system.

### Step 2d: Skip Mode

This mode is for users who already have experimental data and want to skip the experiment phase entirely.

1. **Confirm intent**: Ask the user to confirm they want to skip the experiment phase. Warn them that skipping means no code understanding, result analysis, or protocol review will be performed.
2. **Collect data path**: Ask the user for the path to their existing data file(s). These will be referenced in `paper.md` but not analyzed by this skill.
3. **Update workflow phase**: Restate the skip reason and wait for explicit user confirmation. Then call `copaper_workflow_set_phase` with `phase: "experiments"`, `status: "skipped"`, and the confirmed `reason`; the tool writes `.agents/state.json` and appends `.agents/events.jsonl`.
4. **Inform user**: Tell the user that the experiment phase has been marked as skipped. Suggest that they may still want to use Result Analysis mode later if they need help interpreting their data.

### Step 3: Update Workflow State

After completing any mode (except Skip, which updates workflow state in Step 2d), update workflow phase status through the OpenCode plugin tool:

1. Restate the intended phase update to the user.
2. Wait for explicit confirmation.
3. Call `copaper_workflow_set_phase` with `phase: "experiments"` and `status: "complete"` after code/result/protocol analysis is complete; the tool writes `.agents/state.json` and appends `.agents/events.jsonl`.
4. Do not manually edit `.agents/state.json` when the plugin tool is available.
5. The current plugin does not expose a dedicated tool for storing experiment metadata such as `mode_used`, `last_updated`, or `data_files`; mention this limitation instead of writing those fields directly.

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `storyline.md` | **Required** | Step 2a/2b (mapping experiments to RQs) | Research narrative for mapping code/results to research questions |
| `paper.md` | **Required** | Step 2a/2b (understanding evaluation needs) | Paper structure and evaluation section requirements |
| `.agents/state.json` | Tool-managed | Step 3 (end) and Step 2d (skip mode) | Update experiment phase via `copaper_workflow_set_phase`; do not edit directly |
| User-provided experiment code path | Conditional | Step 2a (Code Understanding mode) | Directory of experiment code to analyze |
| User-provided result file paths | Conditional | Step 2b (Result Analysis mode) | CSV/JSON/TXT/log files with experimental results |

Do NOT read `writingrules.md` — this skill does not need paper structure rules for analysis tasks.

## Must NOT Do

- **NEVER** run or execute experiment code. This skill only reads and analyzes code, never runs it.
- **NEVER** generate a full experiment project from scratch. The user must provide their own code and data.
- **NEVER** modify user code. Analysis is read-only; suggest changes but do not apply them.
- **NEVER** fabricate or invent experimental results. Only report what exists in the data files.
- **NEVER** skip the mode selection step. Always ask the user which mode they need first.
- **NEVER** bypass CoPaper structure constraints when suggesting content for `paper.md` (Level 6 title ≤50 chars, body ≤500 chars, do not modify Level 2-5 headers).
- **NEVER** insert content into `paper.md` without the user explicitly reviewing and accepting it.
- **NEVER** modify Level 1-5 headers in `paper.md`. Only suggest Level 6 content additions.

## Important Notes

1. **Read-only analysis**: This skill reads code and data but never modifies them. All suggestions are presented to the user for review.
2. **RQ alignment is critical**: Every analysis mode should cross-reference results or code with the stated research questions in `storyline.md` and `paper.md`.
3. **Protocol review delegates to evaluation-protocol-checker**: The Protocol Review mode does not duplicate the checker's logic. It invokes the checker and then discusses results with the user.
4. **State tracking**: Use `copaper_workflow_set_phase` after completing a mode to maintain workflow continuity.
5. **Bilingual support**: Trigger words and user-facing prompts should accommodate both English and Chinese inputs.
6. **Data formats**: Result Analysis mode supports CSV, JSON, TXT, and common log file formats. If the user provides an unsupported format, ask them to convert it first.
