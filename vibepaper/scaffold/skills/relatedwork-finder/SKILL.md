---
name: relatedwork-finder
description: Find the related work papers in the relatedwork folder based on storyline.md or paper.md content.
---

# Related Work Finder Skill

This skill automatically finds related-work papers. Every substantive step (keyword extraction, Semantic Scholar search, BibTeX sync, PDF download) is delegated to a `vibe` CLI subcommand, so the skill never calls MCP search tools or spawns subagents. The skill's job is to orchestrate the CLI calls and interact with the user.

## When to Use This Skill

- User requests to find related work (e.g., "find related work").

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `storyline.md` | Required if present | Step 1 (input to CLI) | Primary source for keyword extraction by `vibe relatedwork keywords` |
| `paper.md` | Fallback | Step 1 (auto-fallback) | Used by the CLI when `storyline.md` is missing |
| `relatedwork/queries.txt` | Read/write | Steps 1-2 | One query per line; written by `vibe relatedwork keywords`, consumed by `vibe relatedwork search --queries-file` |
| `relatedwork/search_cache.json` | Read/write | Steps 2-3 | Cache for search metadata (paper_id, title, authors, year, venue, bibtex, arxiv_id, pdf_url, source_queries) — written by `vibe relatedwork search` |
| `relatedwork/paper_list.bib` | Required | Step 3 | BibTeX entries for formalizing the reference list |
| `relatedwork/literature.json` | Required | Steps 2-6 (after import) | Canonical metadata catalog; read after `vibe relatedwork import` to track download status and summary paths |
| `.agents/skills/relatedwork-finder/template.md` | Required | Step 5 | Template for PDF summary generation; passed to subagent |

Do NOT read `writingrules.md` — this skill does not need paper structure rules.

## Search & Caching Strategy

1. **Single Backend (Semantic Scholar)**: All searches go through the `vibe relatedwork search` CLI, which queries the Semantic Scholar Graph API. S2's index covers arXiv preprints, major CS/AI venues (CVPR, NeurIPS, ICML, ACL, etc.), and most journals. Do NOT call `serper_google_search_scholar`, `websearch_web_search_exa`, or any other external search tool from this skill — the CLI is the single source of truth.
2. **Stateful Cache**: The CLI writes `relatedwork/search_cache.json` (envelope: `{"papers": [...]}`) with one entry per deduplicated paper, including:
   - `paper_id` (extracted from S2's BibTeX key, or generated as `<author><year><titletoken>`)
   - `title`, `authors`, `year`, `venue`
   - `bibtex` (sanitized from S2 `citationStyles.bibtex`)
   - `arxiv_id` (from S2 `externalIds.ArXiv`)
   - `pdf_url` (from `openAccessPdf.url`, falling back to `https://arxiv.org/pdf/<arxiv_id>.pdf`)
   - `source_queries` (which CLI `--query` arguments returned this paper)
   - `tldr` (S2 model-generated one-sentence summary, when present — useful for filtering)
3. **API Key (optional but recommended)**: Set `SEMANTIC_SCHOLAR_API_KEY` in the environment before running this skill to lift the shared anonymous rate limit (~100 req / 5 min) up to 1 req/sec. The CLI auto-detects the env var; without it the CLI still works but may hit 429s on busy days (it retries with exponential backoff up to 4 attempts).
4. **Canonical Catalog**: After `relatedwork/search_cache.json` is reviewed and trimmed by the user, you MUST import it into `relatedwork/literature.json` via `vibe --root . relatedwork import --input relatedwork/search_cache.json`. `relatedwork/literature.json` is the canonical metadata store used by BibTeX sync, downloads, and summary tracking.

## PDF Download

1. **Storage Location**: Save all downloaded PDFs to `relatedwork/pdfs/`.
2. **Naming Convention**: Name PDF files using the BibTeX key from the cache (e.g., `shi2026streamingvla.pdf`).
3. **Failure Recording**: If a PDF cannot be downloaded after 3 retries, the CLI records that failure in `relatedwork/literature.json`. Do not fake a success state.

## Action Logging

You MUST log your tools usage (such as file reads, MCP tool calls, file modifications) during the execution of this skill.
After invoking any tool, run a terminal command to append a structured JSON log to `.agents/toolevents.jsonl`.
**Example Action Logging Command:**
`echo '{"timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'", "operator": "Agent", "action": "tool_call", "result": "success", "tool_name": "read_file", "target": "path/to/file"}' >> .agents/toolevents.jsonl`

## Instructions (STRICT INTERACTIVE WORKFLOW)

You MUST follow this step-by-step interactive workflow. **STOP and wait for user confirmation after each step marked with [WAIT FOR CONFIRMATION].**

### Step 1: Extract Keywords [WAIT FOR CONFIRMATION]
- Run `vibe --root . relatedwork keywords --count 8` (adjust `--count` if the storyline is unusually broad/narrow). The CLI reads `storyline.md` (falling back to `paper.md`), calls the configured LLM via `VIBEPAPER_MODEL`, and writes the queries one-per-line to `relatedwork/queries.txt`.
- Do NOT extract keywords yourself in this context. Do NOT call any MCP search tool. The CLI is the single source of truth.
- After the CLI finishes, `cat relatedwork/queries.txt` and present the list to the user.
- **STOP**: Ask "These are the queries the CLI extracted. Do you want to edit `relatedwork/queries.txt` (add/remove/replace lines) before I run the search?"
- If the user edits the file, re-read it before Step 2.

### Step 2: Search & Cache Metadata [WAIT FOR CONFIRMATION]
- Run the search CLI consuming the queries file from Step 1:

  ```bash
  vibe --root . relatedwork search \
      --queries-file relatedwork/queries.txt \
      --limit 20 \
      --year 2022-2026
  ```

  **默认过滤(可覆盖)**:`--fields-of-study "Computer Science"` 和 `--open-access`(只要有公开 PDF 的)默认就生效 —— 多数情况下不用显式写。要关掉:`--fields-of-study ""`(空串禁用学科过滤)或 `--no-open-access`。

  其他常用 flag:`--limit N`(每条 query,max 100)、`--year 2020-2024`、`--venue "CVPR,NeurIPS"`(限定 venue;`arXiv.org` 也算 venue)。`--query "..."` 仍接受作为 `--queries-file` 的替代。
- The CLI writes `relatedwork/search_cache.json` with deduplicated metadata (BibTeX, arXiv ID, PDF URL, venue, TLDR) — you do NOT need to fetch BibTeX, venue, or PDF URLs separately. Do NOT hand-edit the cache to "enrich" it; rerun the CLI with refined queries instead.
- **ACTION**: Read `relatedwork/search_cache.json` and present a numbered list of papers to the user. Show `title`, `authors[0]+et al.`, `year`, `venue`, and `tldr` (if present) for each entry.
- **STOP**: Ask "Here is the list of papers the CLI found. Which ones should I keep? (Metadata is already cached for all entries.)"

### Step 3: Formalize BibTeX List [WAIT FOR CONFIRMATION]
- If the user dropped any entries, rewrite `relatedwork/search_cache.json` keeping only the selected papers (preserve the `{"papers": [...]}` envelope).
- Run `vibe --root . relatedwork import --input relatedwork/search_cache.json` to merge the kept entries into `relatedwork/literature.json`.
- If `paper_list.bib` already contains papers missing from `relatedwork/literature.json`, you MAY rerun `vibe --root . relatedwork search --query "<title>"` to enrich them, then re-import.
- Run `vibe --root . relatedwork sync-bib` to write metadata-backed entries into `relatedwork/paper_list.bib` and to import any remaining bib-only entries into `relatedwork/literature.json`.
- **ACTION**: Show the final BibTeX entries to the user.
- **STOP**: Ask "I have formalized the BibTeX entries in paper_list.bib. Should I proceed to download PDFs and write summaries?"

### Step 4: Download PDFs [WAIT FOR CONFIRMATION]
- Download PDFs only through the command `vibe --root . relatedwork download`.
- Do NOT hand-write download results into JSON; let the CLI update `relatedwork/literature.json`.
- If the user wants to retry failed downloads later, use `vibe --root . relatedwork download --retry-failed`.
- **ACTION**: Present the status of downloaded PDFs to the user.
- **STOP AND TERMINATE**: This skill's responsibility strictly ENDS HERE. You MUST STOP execution. Ask the user: "I have finished finding the related work and downloading the PDFs. Would you like to continue and switch to the `relatedwork-summarizer` skill to generate summaries now?"
