---
name: relatedwork-finder
description: Find the related work papers in the relatedwork folder based on storyline.md or paper.md content.
---

# Related Work Finder Skill

This skill automatically finds related work papers, records canonical metadata through the `vibe` CLI, downloads PDFs through the `vibe` CLI, and generates serialized multimodal summaries based on the research storyline or paper content.

## When to Use This Skill

- User requests to find related work (e.g., "find related work").

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `storyline.md` | Required if present | Step 1 (start) | Primary source for keyword extraction, research questions, methods, and challenges |
| `paper.md` | Fallback | Step 1 (if `storyline.md` missing) | Alternative source for keyword extraction when `storyline.md` is absent |
| `relatedwork/search_cache.json` | Read/write | Steps 2-3 | Cache for search metadata (paper_id, title, authors, year, venue, bibtex, arxiv_id, pdf_url, source_queries) |
| `relatedwork/paper_list.bib` | Required | Step 3 | BibTeX entries for formalizing the reference list |
| `relatedwork/literature.json` | Required | Steps 2-6 (after import) | Canonical metadata catalog; read after `vibe relatedwork import` to track download status and summary paths |
| `.agents/skills/relatedwork-finder/template.md` | Required | Step 5 | Template for PDF summary generation; passed to subagent |

Do NOT read `writingrules.md` — this skill does not need paper structure rules.

## Search & Caching Strategy

1. **Stateful Search**: To avoid redundant API calls and information drift, you MUST cache the metadata of all found papers during Step 2.
2. **Cache File**: Create `relatedwork/search_cache.json` to store:
   - `paper_id` (preferred BibTeX key; if unavailable, create a stable slug)
   - `title`, `authors`, `year`, `venue/journal`
   - `bibtex` (fetched from source during Step 2)
   - `arxiv_id` (if applicable)
   - `pdf_url` (direct link to PDF or landing page)
   - `source_queries` (the Scholar/arXiv query strings that found the paper)
3. **Canonical Catalog**: After updating `relatedwork/search_cache.json`, you MUST import it into `relatedwork/literature.json` via `vibe --root . relatedwork import --input relatedwork/search_cache.json`. `relatedwork/literature.json` is the canonical metadata store used by BibTeX sync, downloads, and summary tracking.
4. **arXiv Search**: Use `websearch_web_search_exa` with `includeDomains: ["arxiv.org"]` to find recent preprints.
5. **Google Scholar Search**: MUST use `serper_google_search_scholar` (Google Scholar API via Serper MCP) to find published papers and citations.
6. **BibTeX Accuracy**: Fetch the paper's metadata from the source (e.g., arXiv abstract page or Google Scholar snippet) IMMEDIATELY during the search phase. Do NOT wait for user confirmation to fetch metadata.

## PDF Download

1. **Storage Location**: Save all downloaded PDFs to `relatedwork/pdfs/`.
2. **Naming Convention**: Name PDF files using the BibTeX key from the cache (e.g., `shi2026streamingvla.pdf`).
3. **Failure Recording**: If a PDF cannot be downloaded after 3 retries, the CLI records that failure in `relatedwork/literature.json`. Do not fake a success state.

## Action Logging

You MUST log your tools usage (such as file reads, MCP tool calls, file modifications) during the execution of this skill.
After invoking any tool, run a terminal command to append a structured JSON log to `.agents/events.jsonl`.
**Example Action Logging Command:**
`echo '{"timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'", "operator": "Agent", "action": "tool_call", "result": "success", "tool_name": "read_file", "target": "path/to/file"}' >> .agents/events.jsonl`

## Instructions (STRICT INTERACTIVE WORKFLOW)

You MUST follow this step-by-step interactive workflow. **STOP and wait for user confirmation after each step marked with [WAIT FOR CONFIRMATION].**

### Step 1: Parse Input & Extract Keywords [WAIT FOR CONFIRMATION]
- Read `storyline.md` (or `paper.md`).
- Extract 5-10 research keywords and search queries.
- **ACTION**: Present the extracted keywords and queries to the user.
- **STOP**: Ask "These are the keywords and search queries I extracted. Do you want to modify or add any before I start the search?"

### Step 2: Search & Cache Metadata [WAIT FOR CONFIRMATION]
- Perform searches on arXiv and Google Scholar.
- Google Scholar searches MUST use `serper_google_search_scholar`.
- For EVERY promising result, fetch its BibTeX, ArXiv ID, and PDF URL.
- **CRITICAL**: You MUST also search for and explicitly extract the publication venue or journal (e.g., CVPR, NeurIPS, IEEE T-RO, or arXiv preprint) for each paper during the search.
- **ACTION**: Save all metadata (including `venue/journal`) to `relatedwork/search_cache.json`.
- **ACTION**: Immediately run `vibe --root . relatedwork import --input relatedwork/search_cache.json` so the canonical catalog in `relatedwork/literature.json` stays synchronized with the search cache.
- **ACTION**: Present a numbered list of found papers (with authors, years, and venue) to the user.
- **STOP**: Ask "Here is the list of papers I found. Which ones should I keep? (Metadata is already cached for all entries)."

### Step 3: Formalize BibTeX List [WAIT FOR CONFIRMATION]
- Read `relatedwork/search_cache.json` and `relatedwork/paper_list.bib`.
- Filter entries based on user selection from Step 2 and rewrite `relatedwork/search_cache.json` if the keep-list changed.
- If `paper_list.bib` contains papers missing from `relatedwork/literature.json`, you MUST use `serper_google_search_scholar` to enrich them into JSON metadata and then run `vibe --root . relatedwork import --input <that-json>`.
- Run `vibe --root . relatedwork sync-bib` to write missing metadata-backed entries into `relatedwork/paper_list.bib` and to import any remaining bib-only entries into `relatedwork/literature.json`.
- **ACTION**: Show the final BibTeX entries to the user.
- **STOP**: Ask "I have formalized the BibTeX entries in paper_list.bib. Should I proceed to download PDFs and write summaries?"

### Step 4: Download PDFs [WAIT FOR CONFIRMATION]
- Download PDFs only through the command `vibe --root . relatedwork download`.
- Do NOT hand-write download results into JSON; let the CLI update `relatedwork/literature.json`.
- If the user wants to retry failed downloads later, use `vibe --root . relatedwork download --retry-failed`.
- **ACTION**: Present the status of downloaded PDFs to the user.
- **STOP AND TERMINATE**: This skill's responsibility strictly ENDS HERE. You MUST STOP execution. Ask the user: "I have finished finding the related work and downloading the PDFs. Would you like to continue and switch to the `relatedwork-summarizer` skill to generate summaries now?"
