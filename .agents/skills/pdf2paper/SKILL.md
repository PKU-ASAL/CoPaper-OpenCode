---
name: pdf2paper
description: Converts an existing PDF draft into paper.md section by section by extracting text, mapping claims into the existing paper framework, and polishing wording without inventing new content.
---

# PDF to Paper Skill

This skill converts an existing PDF draft into `paper.md` incrementally, one section at a time.
It is designed for cases where the PDF already contains most of the technical narrative, and the task is structured migration plus light polishing.

## When to Use This Skill

- User asks to import an existing PDF draft into `paper.md`
- User wants section-by-section conversion instead of one-shot rewrite
- User wants to preserve claims from PDF while adapting to VibePaper structure

Typical triggers:
- `convert pdf to paper.md`
- `从PDF初稿生成paper.md`
- `将位于 <path> 的pdf转变为paper.md`
- `把 <path>.pdf 逐section转换到 paper.md`
- `use $pdf2paper to convert <path>.pdf to paper.md`
- `调用 pdf2paper，将 <path>.pdf 转为 <target>/paper.md`

## Paper Structure Reference

The paper follows VibePaper structure. Key rules for this skill:
- **Level 1-5** (`#` to `#####`): Structural headings only — do NOT modify these in `paper.md`.
- **Level 6** (`######`): Content paragraphs. Title = topic sentence (≤50 chars). Body = supporting text (≤500 chars).
- **Metadata**: HTML comments `<!-- description: ... -->` guide what each section should contain.

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `paper.md` | Conditional | Step 1 and Step 8 | Target framework; if missing, initialize project first |
| `*.pdf` | **Required** | Step 2 | Source draft content |
| `writingrules.md` | Conditional | Step 3 | Optional structure validation if available |
| `.agents/state.json` | Optional | Step 9 | Update writing phase status |
| `fig/` | Optional | Step 5 | Keep references to figure files mentioned in PDF |

Preferred source example:
- `target/example_project/draft.pdf`

## Core Principle

Preserve source meaning. Do not invent research claims.

This skill is a converter + editor, not a paper generator. It should:
- extract what the PDF already says
- map content to existing `paper.md` sections
- polish wording for clarity and fit

It should not:
- create new results, datasets, or citations not present in the PDF
- silently rewrite the whole document at once

Path safety rule:
- If the user does not provide a PDF path in the request, the agent MUST ask for a path and wait.
- The agent MUST NOT scan directories, glob files, or guess candidate PDF files automatically.
- Accepted path forms are absolute or relative paths explicitly provided by the user.

## Supported Formats

- Text-based `pdf`: supported
- Scanned/image-only `pdf`: supported with OCR fallback, but must explicitly mark low-confidence extraction

## Extraction Strategy

Use this fallback order:

1. Prefer `pdftotext` or equivalent text extraction.
2. If extraction quality is poor, use OCR fallback.
3. Keep page numbers for traceability.

For each extracted chunk, capture:
- page range
- candidate section meaning (intro/method/experiments/etc.)
- key claims, numbers, and citations

## Mapping Rules (PDF -> paper.md)

Map by semantics, not by exact heading names.

Typical cues:
- Motivation/problem framing -> introduction/problem sections
- Prior approaches and gaps -> related-work sections
- Design and mechanisms -> method/design sections
- Setup, metrics, baselines, results -> experiment sections
- Threats/limitations/discussion -> discussion sections
- Final takeaways -> conclusion sections

If one PDF paragraph supports multiple destinations, split conservatively and keep each inserted paragraph scoped to one `#####` target.

## Strict Workflow

### Step 1: Validate inputs

1. Check whether the user explicitly provided a source `.pdf` path.
2. If source path is not specified, ask exactly one concise question:
   - `请提供要转换的 PDF 文件路径（例如：target/example_project/draft.pdf）。`
3. Do not scan the filesystem for PDF candidates when the path is missing.
4. Wait for user-provided absolute or relative path.
5. Confirm source `.pdf` exists.
6. If missing, stop and report exact missing path.
7. Check whether `paper.md` exists:
   - if yes, continue normal mapping and in-place update flow
   - if no, continue conversion in draft mode and initialize project at Step 8 before final write

### Step 2: Extract PDF content

1. Extract text in reading order.
2. Build an intermediate traceable note with page indices.
3. Mark extraction confidence:
   - `high`: direct text extraction
   - `medium`: mixed quality
   - `low`: OCR-heavy and error-prone

### Step 3: Scan target framework

1. Read `paper.md` structure (`#` to `#####`) and descriptions.
2. If available, read `writingrules.md` for additional constraints.
3. Build a target section map for insertion planning.

### Step 4: Build section evidence map

For each target `#####` section:
1. attach relevant PDF snippets with page references
2. classify as:
   - `grounded`: enough evidence to draft
   - `partial`: weak or incomplete evidence
   - `missing`: no evidence

### Step 5: Draft one section at a time (polish only)

For each selected section:
1. Rewrite extracted points into compliant Level 6 paragraphs.
2. Keep claims and numeric values unchanged.
3. Preserve citation intent from PDF text; do not fabricate references.
4. Keep unresolved content as TODO placeholders when evidence is missing.

### Step 6: User review gate (required)

Before writing each section, present the candidate content and ask:
- Accept
- Modify
- Skip this section

Do not apply unreviewed section edits.

### Step 7: Apply accepted edits safely

1. Edit only under existing `#####` headings.
2. Do not alter Level 1-5 structure.
3. Insert or replace only the accepted Level 6 content for that section.
4. If `paper.md` is missing, hold accepted converted content in temporary draft and apply it after Step 8 initialization.

### Step 8: Project bootstrap check (start-stage friendly)

After conversion content is accepted, ask for the current project directory:

- `请确认当前项目路径（project dir）。`

Then validate:

1. `<project-dir>/.agents/skills/` exists and is non-empty
2. `<project-dir>/paper.md` exists

If either check fails:

1. Ask for:
   - project `name`
   - project `domain`
2. Run initialization first:
```bash
vibe --root <project-dir> init --name "<name>" --domain "<domain>"
```
3. Then apply the accepted converted content into initialized `paper.md`.

### Step 9: Update workflow status

After accepted edits:
- If at least one writing section is filled, set `writing` phase to `in_progress`.
- If all intended conversion sections are materially filled, set `writing` phase to `complete`.

Prefer CLI updates:
```bash
vibe --root <project-dir> set-phase writing --status in_progress
vibe --root <project-dir> set-phase writing --status complete
```

If CLI is unavailable, update `.agents/state.json` carefully and preserve unrelated fields.

## Output Requirements

- Primary output: updated `paper.md`
- Secondary output: concise conversion summary including:
  - source PDF path
  - extraction confidence level
  - sections updated
  - sections skipped/missing evidence
  - TODO placeholders intentionally kept

## Quality Bar

Each inserted paragraph should be:
- faithful to PDF content
- structurally compliant with VibePaper rules
- concise and readable
- traceable to source pages

## Must NOT Do

- **NEVER** invent claims not present in PDF
- **NEVER** invent experiment numbers, datasets, or baselines
- **NEVER** modify Level 1-5 structure in `paper.md`
- **NEVER** rewrite the full paper in one blind pass
- **NEVER** hide low-confidence OCR extraction; disclose it
- **NEVER** treat this as autonomous writing without user confirmation

## Recommended Default Invocation

For this repository, default to:
- source: `target/example_project/draft.pdf`
- target: `target/example_project/paper.md` if present, otherwise project-root `paper.md`

## End Condition

Stop when one of the following is true:
- user accepts converted sections for this run
- no additional sections can be grounded from PDF evidence
- user pauses or requests manual continuation

At stop time, report:
- completed sections
- unresolved sections (missing PDF evidence)
- whether writing phase status was updated

Next-step prompt rule:
- At the end of each run, explicitly offer both options:
  1. Run `find related work`.
  2. Go directly to the next step: `socratic discussion`.
