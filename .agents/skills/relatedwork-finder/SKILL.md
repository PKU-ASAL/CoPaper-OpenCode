---
name: relatedwork-finder
description: Find the related work papers in the relatedwork folder based on storyline.md or paper.md content.
---

# Related Work Finder Skill

This skill automatically finds related work papers, prepares canonical metadata, and generates serialized multimodal summaries based on the research storyline or paper content. The current OpenCode plugin does not expose related-work import, sync, download, or summary-registration tools; when those managed operations are needed, report the tool gap and ask before using any CLI fallback.

## When to Use This Skill

- User requests to find related work (e.g., "find related work").

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `storyline.md` | Required if present | Step 1 (start) | Primary source for keyword extraction, research questions, methods, and challenges |
| `paper.md` | Fallback | Step 1 (if `storyline.md` missing) | Alternative source for keyword extraction when `storyline.md` is absent |
| `relatedwork/search_cache.json` | Read/write | Steps 2-3 | Cache for search metadata (paper_id, title, authors, year, venue, bibtex, arxiv_id, pdf_url, source_queries) |
| `relatedwork/paper_list.bib` | Required | Step 3 | BibTeX entries for formalizing the reference list |
| `relatedwork/literature.json` | Required after managed import | Steps 2-6 (after import) | Canonical metadata catalog; the current OpenCode plugin has no relatedwork import tool, so ask before using any CLI fallback |
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
3. **Canonical Catalog**: After updating `relatedwork/search_cache.json`, the catalog must be imported into `relatedwork/literature.json`. The current OpenCode plugin does not expose `relatedwork import`; do not invent a plugin tool. Ask the user before using any CLI fallback.
4. **arXiv Search**: Use `websearch_web_search_exa` with `includeDomains: ["arxiv.org"]` to find recent preprints.
5. **Google Scholar Search**: MUST use `serper_google_search_scholar` (Google Scholar API via Serper MCP) to find published papers and citations.
6. **BibTeX Accuracy**: Fetch the paper's metadata from the source (e.g., arXiv abstract page or Google Scholar snippet) IMMEDIATELY during the search phase. Do NOT wait for user confirmation to fetch metadata.

## PDF Download

1. **Storage Location**: Save all downloaded PDFs to `relatedwork/pdfs/`.
2. **Naming Convention**: Name PDF files using the BibTeX key from the cache (e.g., `shi2026streamingvla.pdf`).
3. **Failure Recording**: If a PDF cannot be downloaded after 3 retries, the CLI records that failure in `relatedwork/literature.json`. Do not fake a success state.

## Action Logging

Use OpenCode plugin tools for workflow/artifact events when available. The current plugin does not expose a generic tool-call event logger or relatedwork event writer; do not append logs manually in plugin-based workflows.
If the user asks to inspect workflow event history, call `vibepaper_workflow_log` for read-only querying of `.agents/events.jsonl` instead of reading the file directly.

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
- **ACTION**: Tell the user that `relatedwork import` is required to synchronize `relatedwork/literature.json`, but the current OpenCode plugin has no equivalent tool. Ask before using any CLI fallback.
- **ACTION**: Present a numbered list of found papers (with authors, years, and venue) to the user.
- **STOP**: Ask "Here is the list of papers I found. Which ones should I keep? (Metadata is already cached for all entries)."

### Step 3: Formalize BibTeX List [WAIT FOR CONFIRMATION]
- Read `relatedwork/search_cache.json` and `relatedwork/paper_list.bib`.
- Filter entries based on user selection from Step 2 and rewrite `relatedwork/search_cache.json` if the keep-list changed.
- If `paper_list.bib` contains papers missing from `relatedwork/literature.json`, use `serper_google_search_scholar` to enrich them into JSON metadata. Then report that the current OpenCode plugin has no `relatedwork import` or `relatedwork sync-bib` tool and ask before using any CLI fallback.
- **ACTION**: Show the final BibTeX entries to the user.
- **STOP**: Ask "I have formalized the BibTeX entries in paper_list.bib. Should I proceed to download PDFs and write summaries?"

### Step 4: Download PDFs [WAIT FOR CONFIRMATION]
- PDF download status must be recorded by a managed relatedwork operation. The current OpenCode plugin has no `relatedwork download` or retry tool; do not hand-write download results into JSON. Ask before using any CLI fallback.
- **ACTION**: Present the status of downloaded PDFs to the user.
- **STOP AND TERMINATE**: This skill's responsibility strictly ENDS HERE. You MUST STOP execution. Ask the user: "I have finished finding the related work and downloading the PDFs. Would you like to continue and switch to the `relatedwork-summarizer` skill to generate summaries now?"
