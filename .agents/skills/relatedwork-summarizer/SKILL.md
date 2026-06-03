---
name: relatedwork-summarizer
description: Drive the relatedwork summarization CLI, build the literature cross-index, and produce a coverage report.
---

# Related Work Summarizer Skill

This skill orchestrates per-paper summarization for downloaded PDFs by calling the `vibe relatedwork summarize` CLI, builds the literature cross-index via `vibe relatedwork build-index`, and produces a coverage report comparing summaries to `storyline.md`. The skill itself does not read PDFs, spawn subagents, or call MCP tools — all heavy lifting lives in the CLI.

## When to Use This Skill

- User requests to summarize related work, generate PDF summaries, or build literature coverage.
- After `relatedwork-finder` has successfully downloaded PDFs.

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| Relatedwork status | Required | Steps 1, 2, 4 | Call `vibepaper_relatedwork_status` for read-only catalog, download, summary, BibTeX, and cross-index state |
| `relatedwork/literature.json` | Required | Steps 1, 4 | Canonical catalog used by the CLI; inspect queue state through `vibepaper_relatedwork_status` when available |
| `storyline.md` | Required | Steps 2, 3 | Passed to the CLI as context for the "relation to our work" section, and used by the coverage report |
| `.agents/skills/relatedwork-finder/template.md` | Required | Step 2 | Summary template; passed to the CLI |
| `relatedwork/papers/<paper_id>.md` | Read/write | Steps 2-3 | Per-paper summary files written by the CLI |
| `relatedwork/summary.md` | Read/write | Step 3 | Aggregated multi-paper summary (skill maintains this file) |
| `.agents/cross_index.json` | Read/write | Step 4 | Built by `vibe relatedwork build-index` |

## Required Environment

The summarization CLI uses an OpenAI-compatible LLM. Before running this skill, confirm the following are set (typically in `.env`):

- `OPENAI_API_KEY` — required
- `VIBEPAPER_MODEL` — required (e.g. `gpt-4o-mini`)
- `OPENAI_BASE_URL` — optional, only if using a proxy endpoint

If any of these are missing the CLI will fail loudly; do NOT try to summarize by reading the PDFs yourself.

## Action Logging

You MUST log your tools usage during the execution of this skill.
After invoking any tool, append a structured JSON log to `.agents/events.jsonl`.
**Example Action Logging Command:**
`echo '{"timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'", "operator": "Agent", "action": "tool_call", "result": "success", "tool_name": "read_file", "target": "path/to/file"}' >> .agents/events.jsonl`

## Instructions (STRICT INTERACTIVE WORKFLOW)

You MUST follow this step-by-step interactive workflow. **STOP and wait for user confirmation after each step marked with [WAIT FOR CONFIRMATION].**

### Step 1: Target Scope Parsing [WAIT FOR CONFIRMATION]
- Call `vibepaper_relatedwork_status` first. This tool is read-only and reports which papers are downloaded and which already have summaries; do not replace it with prompt-only status text or manual state inspection.
- Check if the user requested a specific paper (by title or `paper_id`):
  - If yes: verify the paper exists in the tool output and its `downloadStatus` is `downloaded` with `pdfExists=true`. If not, REFUSE the request and explain why. The target queue contains ONLY this paper.
  - If no: the target queue contains every paper with `downloadStatus=downloaded`, `pdfExists=true`, and `summaryExists=false`.
- **ACTION**: Present the target queue (paper_id + title for each entry) to the user. Note the count.
- **STOP**: Ask "I will summarize these N papers. Should I proceed?" If the user wants to force-redo papers that already have summaries, they should answer yes and tell you to use `--force`.

### Step 2: Run Summarize CLI [WAIT FOR CONFIRMATION]
- Run the summarize CLI. For the full queue:

  ```bash
  vibe --root . relatedwork summarize
  ```

  For a single paper (when the user specified one in Step 1):

  ```bash
  vibe --root . relatedwork summarize --paper-id <paper_id>
  ```

  Add `--force` if the user wants to re-summarize already-summarized papers. Other useful flags: `--qps 16` (default), `--concurrency 8` (default; worker threads), `--model <name>` (override `VIBEPAPER_MODEL`).
- The CLI:
  1. Extracts PDF text with `pypdf`
  2. Sends `storyline.md` + the template + the PDF text to the configured LLM
  3. Writes `relatedwork/papers/<paper_id>.md`
  4. Calls `register-summary` automatically (updates `literature.json`)
- Do NOT spawn subagents. Do NOT use any `multimodal-looker` agent type. Do NOT read PDFs yourself. The CLI handles parallelism, rate limiting, and oversized-PDF failures internally.
- After the CLI finishes, parse its stdout. For each `[ok]` line: open the new `relatedwork/papers/<paper_id>.md` and synthesize its key points (technical mechanism, methodology, empirical results, limitations) into `relatedwork/summary.md` under a `## <paper_id>: <Title>` heading. If a section for that `paper_id` already exists in `summary.md`, REPLACE it; otherwise APPEND it.
- For each `[fail]` line, leave the paper alone. Surface the error to the user.
- Call `vibepaper_relatedwork_status` again to verify summary counts after the CLI updates `literature.json`.
- **ACTION**: Tell the user "Summarized X papers via the CLI (Y succeeded, Z failed). I have updated `relatedwork/summary.md` with the new sections." List any failures.
- **STOP**: Ask "Should I proceed to build the cross-index and generate the coverage report?"

### Step 3: Build Cross-Index & Coverage Report [WAIT FOR CONFIRMATION]
- Run `vibe --root . relatedwork build-index`. The CLI scans `relatedwork/papers/*.md`, updates `.agents/cross_index.json`, and emits a coverage report (covered points, gaps, ratio) against `storyline.md`.
- Do NOT spawn task agents to "improve" the index in this skill — the CLI is authoritative. (If LLM-augmented technical-point extraction is added later it will be exposed as a `--use-llm` flag on the same CLI.)
- **ACTION**: Present the coverage report verbatim:
  - Covered technical points (with paper references)
  - Gap areas (technical points in storyline with no literature coverage)
  - Overall coverage ratio
- **STOP**: Ask "Here is the literature coverage report. Would you like to go back and search for more papers to fill the gaps (relatedwork-finder), or finalize summary.md (Step 4)?"

### Step 4: Finalize Summary Document
- Read `relatedwork/summary.md` end-to-end and reorganize entries into thematic groups if the user requested it (e.g., by method family, by problem setting). Otherwise leave the order unchanged.
- Keep `relatedwork/literature.json` as the canonical metadata artifact. Do NOT delete it.
- Call `vibepaper_relatedwork_status` before the final response if you need to report final literature, summary, BibTeX, or cross-index counts.
- If `relatedwork/search_cache.json` is no longer needed, ask the user before removing it.
- Respond with "I have finalized `relatedwork/summary.md`."
