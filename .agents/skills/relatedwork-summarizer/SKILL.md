---
name: relatedwork-summarizer
description: Generate sequential multimodal summaries for downloaded papers and build literature cross-index.
---

# Related Work Summarizer Skill

This skill generates serialized multimodal summaries for downloaded PDFs, builds cross-references, and creates a final literature coverage report.

## When to Use This Skill

- User requests to summarize related work, generate PDF summaries, or build literature coverage.
- After `relatedwork-finder` has successfully downloaded PDFs.

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `storyline.md` | Required | Step 2 | Used to compare technical coverage and gaps |
| `relatedwork/literature.json` | Required | Step 1 | Canonical metadata catalog; used to find papers with `downloaded` status |
| `.agents/skills/relatedwork-finder/template.md` | Required | Step 1 | Template for PDF summary generation; passed to subagent |

## Action Logging

You MUST log your tools usage (such as file reads, MCP tool calls, file modifications) during the execution of this skill.
After invoking any tool, run a terminal command to append a structured JSON log to `.agents/events.jsonl`.
**Example Action Logging Command:**
`echo '{"timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'", "operator": "Agent", "action": "tool_call", "result": "success", "tool_name": "read_file", "target": "path/to/file"}' >> .agents/events.jsonl`

## Instructions (STRICT INTERACTIVE WORKFLOW)

You MUST follow this step-by-step interactive workflow. **STOP and wait for user confirmation after each step marked with [WAIT FOR CONFIRMATION].**

### Step 1: Target Scope Parsing [WAIT FOR CONFIRMATION]
- Check if the user specified a specific paper to summarize (e.g., by Title or ID).
- If a single specific paper IS requested:
  - Verify it exists in `relatedwork/literature.json` and its `download_status` is `downloaded`.
  - If the paper is NOT downloaded or NOT found, **REFUSE** the request immediately and explain why.
  - Setting: Your target queue contains ONLY this requested paper.
- If NO specific paper is requested:
  - Setting: Your target queue contains ALL papers whose `download_status` is `downloaded`.
- **ACTION**: Present the target queue of paper(s) to summarize.
- **STOP**: Ask "I have identified the target paper(s). Should I proceed with generating summaries?"

### Step 2: Sequential PDF Summaries [WAIT FOR CONFIRMATION PER PAPER]
- **CRITICAL - MULTI-MODAL & ISOLATED CONTEXT**: You MUST NOT summarize the PDFs yourself in the current context. You MUST ensure each PDF is summarized in its own dedicated context window using the multi-modal model.
- **Approach**: Process each paper in your target queue **STRICTLY ONE BY ONE sequentially**. Do NOT launch multiple tasks in parallel. Do NOT generate all summaries at once.
- **Context Management**: When transitioning to a new paper, you MUST explicitly load the current target PDF, AND you must instruct the system/subagent to ignore or clear any memory of the previously summarized PDF to prevent token overflow and cross-contamination.
- **Workflow per paper**:
  1. Evaluate your target queue. Tell the user which paper is up next. Ask: "Should I spawn the agent to summarize the next paper: [Next Paper Title]?"
  2. **STOP** here and wait for the user to say yes.
  3. Once confirmed, spawn a `task` agent using the multimodal agent type (`subagent_type="multimodal-looker"`, `run_in_background=false`) to summarize it.
  4. In the `prompt`, provide the absolute path of the PDF, `storyline.md`, and `.agents/skills/relatedwork-finder/template.md`.
  5. Explicitly instruct the sub-agent to: Use the `Read` tool on the PDF and `template.md`, and generate a highly detailed summary `.md` file in `relatedwork/papers/` strictly following the template. The summary MUST extract in-depth technical mechanisms, methodology, empirical results, and limitations, rather than merely stating its high-level relationship to `storyline.md`.
  6. After the task completes, run `vibe --root . relatedwork register-summary --paper-id <paper-id> --summary-path relatedwork/papers/<paper-id>.md`.
  7. **CRITICAL ACTION - IMMEDIATE WRITE & UPDATE**: To avoid hallucinations and data loss, you MUST immediately synthesize the key points from the newly generated `relatedwork/papers/<paper-id>.md`. Then, read the master `relatedwork/summary.md` document. **IMPORTANT**: Check if a summary for this specific paper already exists in `summary.md`. If it DOES exist, UPDATE/REPLACE the existing section. If it does NOT exist, APPEND it. (This rule applies whether you are processing a single requested paper or a full queue). The integrated content MUST be richly detailed—including the paper's core technical approaches, quantitative metrics, and exact limitations—structured professionally using level-2 (`##`) and level-6 (`######`) headings. Do NOT wait until all papers are summarized to update `summary.md`.
  8. **ACTION**: Inform the user: "I have finished summarizing [Current Paper Title] and immediately saved its findings into relatedwork/summary.md."
  9. Determine if there is a next paper in the queue. 
  10. **STOP & ASK**: If another paper is next, ask "The next paper is [Next Paper Title]. Should I proceed to summarize it? I will ensure the context of the previous paper is removed before starting." (If it's the last paper or the ONLY paper in the queue, announce completion and move to Step 3).
- Repeat this sequential process for all papers in your target queue.

### Step 3: Build Cross-Index [WAIT FOR CONFIRMATION]
- After all paper summaries in the target queue are complete, build the cross-reference index.
- Run `vibe --root . relatedwork build-index` to scan all `relatedwork/papers/*.md` summaries and update `.agents/cross_index.json`.
- For more accurate tech point extraction, spawn a `task` agent to analyze each paper summary and extract key technical concepts.
- Generate a coverage report by comparing against `storyline.md`.
- **ACTION**: Present the coverage report to the user, showing:
  - Covered technical points (with paper references)
  - Gap areas (technical points in storyline with no literature coverage)
  - Overall coverage ratio
- **STOP**: Ask "Here is the literature coverage report. Would you like to search for more papers to fill the gaps?"

### Step 4: Finalize Summary Document
- Review the incrementally built `relatedwork/summary.md` and perform any final formatting or categorization needed.
- Respond with "I have summarized the targeted papers and finalized relatedwork/summary.md."
- Keep `relatedwork/literature.json` as the canonical metadata artifact.
- Remove `relatedwork/search_cache.json` after final completion if it exists.
