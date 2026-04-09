---
name: relatedwork-finder
description: Find the related work papers in the relatedwork folder based on storyline.md or paper.md content.
---

# Related Work Finder Skill

This skill automatically finds related work papers, records canonical metadata through the `vibe` CLI, downloads PDFs through the `vibe` CLI, and generates serialized multimodal summaries based on the research storyline or paper content.

## When to Use This Skill

- User requests to find related work (e.g., "find related work").

## VibePaper Structure Rules

Before searching, read `writingrules.md` to understand the paper structure. The main paper file is `paper.md`.

## Input Sources

This skill prioritizes input sources in the following order:

1. **Primary Source**: `storyline.md` - If this file exists, parse it first to extract research keywords, core research questions, proposed methods, and key challenges.
2. **Fallback Source**: `paper.md` - If `storyline.md` does not exist, fall back to reading `paper.md`.

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
- **STOP**: Ask "I have finished downloading the PDFs. Should I proceed to summarize each paper one by one sequentially?"

### Step 5: Sequential PDF Summaries [WAIT FOR CONFIRMATION PER PAPER]
- **CRITICAL - MULTI-MODAL & ISOLATED CONTEXT**: You MUST NOT summarize the PDFs yourself in the current context. You MUST ensure each PDF is summarized in its own dedicated context window using the multi-modal model.
- **Approach**: Process each paper **ONE BY ONE sequentially**. Do NOT launch multiple tasks in parallel. Do NOT use `run_in_background=true` for paper summaries.
- Only summarize papers whose `download_status` is `downloaded` in `relatedwork/literature.json` (or equivalently via `vibe --root . relatedwork status --json`).
- For each paper, ask "Should I spawn the agent to summarize [Paper Title]?"
- Once confirmed, spawn a `task` agent using the multimodal agent type (`subagent_type="multimodal-looker"`, `run_in_background=false`) to summarize it.
- In the `prompt`, provide the absolute path of the PDF, `storyline.md`, and `.agents/skills/relatedwork-finder/template.md`.
- Explicitly instruct the sub-agent to:
  1. Use the `Read` tool on the PDF (which loads it as a multi-modal attachment).
  2. Use the `Read` tool on `template.md`.
  3. Generate a detailed summary `.md` file in `relatedwork/papers/` strictly following the sections and structure defined in `template.md`, filling in the publication venue from the cache.
- After the task completes, run `vibe --root . relatedwork register-summary --paper-id <paper-id> --summary-path relatedwork/papers/<paper-id>.md`.
- Then present the summary status and ask for confirmation before moving to the next paper.
- Repeat this sequential process for all downloaded PDFs.

### Step 6: Build Cross-Index [WAIT FOR CONFIRMATION]
- After all paper summaries are complete, build the cross-reference index.
- Run `vibe --root . relatedwork build-index` to scan all `relatedwork/papers/*.md` summaries and update `.agents/cross_index.json`.
- For more accurate tech point extraction, spawn a `task` agent to analyze each paper summary and extract key technical concepts.
- Generate a coverage report by comparing against `storyline.md`.
- **ACTION**: Present the coverage report to the user, showing:
  - Covered technical points (with paper references)
  - Gap areas (technical points in storyline with no literature coverage)
  - Overall coverage ratio
- **STOP**: Ask "Here is the literature coverage report. Would you like to search for more papers to fill the gaps?"

### Step 7: Write Final Summary Document
- Write `relatedwork/summary.md` categorizing the literature.
- Respond with "Found X related work papers in the relatedwork folder."
- Keep `relatedwork/literature.json` as the canonical metadata artifact.
- Remove `relatedwork/search_cache.json` after final completion.
