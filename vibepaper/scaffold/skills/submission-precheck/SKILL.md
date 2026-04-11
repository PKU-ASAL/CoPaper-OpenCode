---
name: submission-precheck
description: Performs comprehensive pre-submission checks on paper.md covering format, citations, figures, word count, completeness, data authenticity, and overall quality. Generates a structured precheck report. Use this skill when the user wants to verify their paper is ready for submission.
---

# Submission Precheck Skill

This skill performs a comprehensive pre-submission check on `paper.md` before submitting to a conference or journal. It runs 7 targeted checks covering format compliance, citation integrity, figure/table references, word count, content completeness, data authenticity, and overall quality. It generates a structured report at `.agents/precheck_report.md` and never modifies any source files.

## When to Use This Skill

- User says "submission precheck", "投稿前检查", or "预检"
- User wants to verify their paper is ready for submission
- User says "check before submit" or "pre-submission check"
- User wants a final quality gate before sending to a venue
- User asks "is my paper ready for submission?"

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `paper.md` | **Required** | Step 1 (start) | Primary paper content; all 7 checks read this |
| `writingrules.md` | **Required** | Step 1 (start) | Format constraints and structural rules; needed for Check 1 (Format) and Check 5 (Completeness) |
| `relatedwork/paper_list.bib` | Conditional | Step 2 (Citation Check) | BibTeX references; needed for Check 2 (Citations) |
| `fig/` | Conditional | Step 2 (Figure/Table Check) | Figure assets directory; needed for Check 3 (Figures/Tables) |
| `.agents/state.json` | Conditional | Step 1 (start) | Project state including `latex_template` config; needed for Check 4 (Word Count) |
| `.agents/cross_index.json` | Conditional | Step 1 (start) | Cross-reference index; used for completeness verification |

If some files do not exist (e.g., `paper_list.bib`, `.agents/cross_index.json`), note their absence and continue with available context. Do not block the workflow for missing optional files.

## The 7 Pre-Submission Checks

### Check 1: Format Check (格式检查)

Verify that `paper.md` conforms to VibePaper structural rules defined in `writingrules.md`.

**Sub-checks:**

a. **Topic sentence length** — Every Level 6 header (`######`) must be ≤ 50 characters. Scan all `######` lines and flag any that exceed the limit.

b. **Supporting sentence length** — Every paragraph body under a Level 6 header must be ≤ 500 characters. For each Level 6 section, measure the text between that header and the next header (or end of section). Flag any that exceed the limit.

c. **Metadata completeness** — Every Level 2-5 header should have an `<!-- description: ... -->` metadata comment. Scan for headers at Level 2-5 that lack a description field. Flag any missing metadata.

d. **Heading hierarchy** — Verify that heading levels are used correctly: Level 1 for title, Level 2-5 for structure, Level 6 for content paragraphs. Flag any misuse (e.g., body text directly under Level 2-5 headers without a Level 6 sub-header).

**Status criteria:**
- ✅ PASS: All format rules satisfied, zero violations
- ⚠️ WARN: 1-3 minor violations (e.g., slightly over character limits)
- ❌ FAIL: 4+ violations or any critical structural issue

### Check 2: Citation Check (引用检查)

Verify that all citations in `paper.md` are properly linked to entries in `paper_list.bib`.

**Sub-checks:**

a. **Orphan citations** — Find all `\cite{...}` references in `paper.md`. For each citation key, verify a matching entry exists in `paper_list.bib`. Flag any citation key with no corresponding BibTeX entry.

b. **Orphan references** — Find all entries in `paper_list.bib`. For each entry, verify it is cited at least once in `paper.md`. Flag any BibTeX entry that is never referenced (unused bibliography entries).

c. **Citation format consistency** — Verify that all citations use `\cite{key}` format consistently. Flag any non-standard citation formats (e.g., raw URLs, `[1]`-style numeric references without `\cite{}`).

**Status criteria:**
- ✅ PASS: All citations matched, no orphans
- ⚠️ WARN: 1-2 orphan references (unused bib entries)
- ❌ FAIL: Any orphan citations (missing bib entries) or format inconsistencies

### Check 3: Figure/Table Check (图表检查)

Verify that all figures and tables referenced in `paper.md` exist as actual assets, and vice versa.

**Sub-checks:**

a. **Referenced figures exist** — Find all image references in `paper.md` (e.g., `![...](fig/...)` or `![](fig/...)`). For each referenced path, verify the file exists in the `fig/` directory. Flag any missing figure files.

b. **No orphan figures** — List all files in `fig/` directory. For each file, verify it is referenced in `paper.md`. Flag any figure files that are not used (orphan assets).

c. **Figure captions present** — For each figure reference in `paper.md`, verify it has a caption or descriptive text. Flag figures without captions.

d. **Table references** — Find all markdown tables in `paper.md`. Verify each table has a label or caption. Flag tables without identification.

**Status criteria:**
- ✅ PASS: All figures/tables properly referenced and captioned
- ⚠️ WARN: 1-2 orphan figures or missing captions
- ❌ FAIL: Any referenced figure missing from fig/ directory

### Check 4: Word Count (字数统计)

Count words per section and compare against the target venue's page limits.

**Sub-checks:**

a. **Per-section word count** — For each Level 2 section in `paper.md`, count the total words in all content under that section (including Level 6 paragraphs). Report word counts per section.

b. **Total word count** — Calculate the total word count of the entire paper (excluding metadata comments).

c. **Venue comparison** — Read `.agents/state.json` for `latex_template` configuration to determine the target venue's page limit. Estimate whether the current word count fits within the expected page range (roughly 500-600 words per page for double-column format, 300-400 for single-column). Flag sections that appear disproportionately long or short.

d. **Balance check** — Flag sections where the word count is less than 50 words (likely incomplete) or more than 3x the average section length (likely too long).

**Status criteria:**
- ✅ PASS: Word count within expected range, sections balanced
- ⚠️ WARN: 1-2 sections slightly over/under target
- ❌ FAIL: Total word count significantly exceeds or falls short of venue limits

### Check 5: Completeness Check (完整性检查)

Scan `paper.md` for empty or placeholder content.

**Sub-checks:**

a. **Empty Level 6 sections** — Find all Level 6 headers (`######`) that have no content below them (i.e., the next line is another header or the section is blank). Flag all empty sections.

b. **Placeholder text detection** — Scan for common placeholder patterns:
   - "TODO", "FIXME", "TBD", "XXX"
   - "INSERT HERE", "WRITE HERE", "FILL IN"
   - "Lorem ipsum" or similar boilerplate
   - Bracketed placeholders like `[...]`, `[insert ...]`
   - Chinese placeholders: "待补充", "待写", "待完成"

c. **Required sections check** — Verify that all required sections exist per `writingrules.md` and the paper template. For a typical research paper, verify presence of: Introduction/Problem, Method/Design, Evaluation/Experiment, Related Work, Conclusion. Flag any missing required sections.

**Status criteria:**
- ✅ PASS: No empty sections, no placeholders, all required sections present
- ⚠️ WARN: 1-2 minor placeholders or a single empty section
- ❌ FAIL: Multiple empty sections, significant placeholder text, or missing required sections

### Check 6: Data Authenticity Check (数据真实性检查)

Invoke the `data-checker` skill to verify that no fabricated or placeholder data remains in the paper.

**Sub-checks:**

a. **Bogus marker scan** — Search `paper.md` for all `⚠️ [BOGUS` markers, `⚠️ TABLE CONTAINS BOGUS DATA` warnings, `⚠️ FIGURE PLACEHOLDER` warnings, and `REPLACE WITH` instructions. Any such marker is a critical blocker.

b. **Placeholder number detection** — Look for placeholder number patterns like `X%`, `Y times`, `Z ms` where X/Y/Z are literal variable letters rather than actual values.

c. **Reproduction script verification** — For each table and figure in `paper.md`, check whether a reproduction script link exists and whether the referenced script file is present in the repository.

d. **Data consistency** — Cross-reference the same metric across different sections to ensure values are consistent (e.g., if accuracy is reported as 92.1% in one section and 91.8% in another without explanation).

**Integration with data-checker:**
This check invokes the `data-checker` skill and collects its findings. The data-checker provides detailed analysis of bogus data markers, missing reproduction scripts, and data inconsistencies. Use its output to populate the Data Authenticity section of the precheck report.

**Status criteria:**
- ✅ PASS: No bogus markers, all data appears authentic
- ⚠️ WARN: Minor data inconsistencies found
- ❌ FAIL: Any ⚠️ BOGUS markers present, or missing reproduction scripts for key results

### Check 7: Overall Quality Check (全面质量检查)

Invoke the `markdown-review` skill (which orchestrates all 7 checkers) to assess overall paper quality.

**Sub-checks:**

a. **Critical issues** — Count the number of Critical-severity issues from the markdown-review output. Any Critical issue is a submission blocker.

b. **Major issues** — Count the number of Major-severity issues. Multiple Major issues may warrant revision before submission.

c. **Minor issues** — Count the number of Minor-severity issues. These are polish items.

d. **Overall assessment** — Based on the aggregate of all checker results, determine an overall quality rating:
   - **Ready**: No Critical issues, ≤ 2 Major issues
   - **Almost Ready**: No Critical issues, 3-5 Major issues
   - **Needs Work**: Any Critical issues, or 6+ Major issues

**Integration with markdown-review:**
This check invokes the `markdown-review` skill, which runs all seven checkers (problem, novelty, technical-depth, logic, clarity, evaluation-protocol, data) in sequence. Collect the summary statistics from its comprehensive report to populate the Overall Quality section of the precheck report.

**Status criteria:**
- ✅ PASS: No Critical issues, ≤ 2 Major issues
- ⚠️ WARN: No Critical issues, 3-5 Major issues
- ❌ FAIL: Any Critical issues or 6+ Major issues

## Workflow

### Step 1: Read Context Sources

Read all context sources listed above. If some files do not exist (e.g., `paper_list.bib`, `.agents/cross_index.json`), note their absence and continue with available context. Do not block the workflow for missing optional files.

### Step 2: Run Checks 1-5 Sequentially

Perform Format Check, Citation Check, Figure/Table Check, Word Count, and Completeness Check one by one. For each check:
1. Execute the sub-checks described above
2. Record all issues found with specific locations and details
3. Assign a status (PASS / WARN / FAIL)

### Step 3: Run Check 6 (Data Authenticity)

Invoke the `data-checker` skill. Collect its findings and map them to the Data Authenticity check status. Focus on:
- Presence of any ⚠️ BOGUS markers (automatic FAIL)
- Missing reproduction scripts (WARN or FAIL depending on severity)
- Data inconsistencies (WARN)

### Step 4: Run Check 7 (Overall Quality)

Invoke the `markdown-review` skill. Collect the comprehensive review report and extract:
- Number of Critical issues
- Number of Major issues
- Number of Minor issues
- Overall assessment

### Step 5: Generate Precheck Report

Compile all findings into `.agents/precheck_report.md` following the output format below.

### Step 6: Present Summary to User

Display a concise summary of the precheck results. Highlight any FAIL items that block submission. Provide actionable recommendations.

## Output Format

Generate `.agents/precheck_report.md` with the following structure:

```markdown
# Pre-Submission Check Report

Generated: [ISO 8601 timestamp]
Paper: [paper title from Level 1 header]

## Summary

| # | Check | Status | Issues |
|---|-------|--------|--------|
| 1 | Format (格式) | ✅ PASS / ⚠️ WARN / ❌ FAIL | [count] |
| 2 | Citations (引用) | ✅ PASS / ⚠️ WARN / ❌ FAIL | [count] |
| 3 | Figures/Tables (图表) | ✅ PASS / ⚠️ WARN / ❌ FAIL | [count] |
| 4 | Word Count (字数) | ✅ PASS / ⚠️ WARN / ❌ FAIL | [count] |
| 5 | Completeness (完整性) | ✅ PASS / ⚠️ WARN / ❌ FAIL | [count] |
| 6 | Data Authenticity (数据真实性) | ✅ PASS / ⚠️ WARN / ❌ FAIL | [count] |
| 7 | Overall Quality (全面质量) | ✅ PASS / ⚠️ WARN / ❌ FAIL | [count] |

**Submission Readiness**: ✅ READY / ⚠️ ALMOST READY / ❌ NOT READY

## Details

### 1. Format Check (格式检查)

**Status**: ✅ PASS / ⚠️ WARN / ❌ FAIL

**Findings**:
- [Specific finding with location]
- [Specific finding with location]

**Recommendations**:
- [Suggested fix]
- [Suggested fix]

### 2. Citation Check (引用检查)

**Status**: ✅ PASS / ⚠️ WARN / ❌ FAIL

**Orphan Citations** (missing bib entries):
- `\cite{key}` — no matching entry in paper_list.bib

**Orphan References** (unused bib entries):
- `author2024title` — not cited in paper.md

**Format Issues**:
- [Description of format inconsistency]

**Recommendations**:
- [Suggested fix]

### 3. Figure/Table Check (图表检查)

**Status**: ✅ PASS / ⚠️ WARN / ❌ FAIL

**Missing Figures** (referenced but not found):
- `fig/architecture.png` — referenced in paper.md but not found in fig/

**Orphan Figures** (in fig/ but not referenced):
- `fig/old_diagram.png` — exists in fig/ but not referenced in paper.md

**Missing Captions**:
- Figure at [location] — no caption provided

**Recommendations**:
- [Suggested fix]

### 4. Word Count (字数统计)

**Status**: ✅ PASS / ⚠️ WARN / ❌ FAIL

| Section | Word Count | Assessment |
|---------|-----------|-------------|
| Introduction | [count] | OK / Too Short / Too Long |
| Method | [count] | OK / Too Short / Too Long |
| ... | ... | ... |
| **Total** | **[count]** | **OK / Over Limit / Under Limit** |

**Target**: [venue] — approximately [X] pages, [Y] words expected

**Recommendations**:
- [Suggested adjustment]

### 5. Completeness Check (完整性检查)

**Status**: ✅ PASS / ⚠️ WARN / ❌ FAIL

**Empty Sections**:
- `###### [section title]` — no content

**Placeholder Text Found**:
- [Location]: "[placeholder text]"

**Missing Required Sections**:
- [Section name] — not found in paper.md

**Recommendations**:
- [Suggested fix]

### 6. Data Authenticity Check (数据真实性检查)

**Status**: ✅ PASS / ⚠️ WARN / ❌ FAIL

**Bogus Data Markers**: [count found]
- [Location]: [marker text]

**Reproduction Scripts**: [X/Y tables and figures have script links]
- [Missing script details]

**Data Consistency**: [X inconsistencies found]
- [Details]

**Recommendations**:
- [Suggested fix]

### 7. Overall Quality Check (全面质量检查)

**Status**: ✅ PASS / ⚠️ WARN / ❌ FAIL

**Critical Issues**: [count]
**Major Issues**: [count]
**Minor Issues**: [count]

**Top Issues**:
1. [Critical/Major issue summary]
2. [Critical/Major issue summary]

**Recommendations**:
- [Suggested fix]

## Submission Decision

Based on the 7 checks above:

- ✅ **READY**: All checks PASS, or only WARN with minor issues. Paper can be submitted.
- ⚠️ **ALMOST READY**: Some checks WARN, no FAIL. Paper can be submitted after minor revisions.
- ❌ **NOT READY**: Any check FAIL. Paper must be revised before submission.

**Blocking Issues** (must fix before submission):
1. [Issue description]
2. [Issue description]

**Recommended Actions** (should fix before submission):
1. [Action description]
2. [Action description]

**Optional Improvements** (nice to fix):
1. [Improvement description]
2. [Improvement description]
```

## Must NOT Do

- **NEVER** auto-fix problems — this skill only reports issues, it does not modify `paper.md` or any source files
- **NEVER** check LaTeX compilation — that is the responsibility of the `markdown2latex` skill
- **NEVER** modify `paper.md`, `writingrules.md`, `paper_list.bib`, or any other source file
- **NEVER** skip any of the 7 checks — all checks must be performed regardless of earlier results
- **NEVER** fabricate checker results — always invoke the actual `data-checker` and `markdown-review` skills for Checks 6 and 7
- **NEVER** delete or overwrite an existing `.agents/precheck_report.md` without preserving its content — append a timestamp or version if needed

## Important Notes

1. **Report-only skill**: This skill generates a report and presents findings. It does not make any changes to the paper.
2. **Sequential execution**: Checks 1-5 are performed directly by this skill. Checks 6-7 invoke other skills.
3. **Data-checker integration**: Check 6 relies on the `data-checker` skill for bogus data detection. Its findings are incorporated into the precheck report.
4. **Markdown-review integration**: Check 7 relies on the `markdown-review` skill for overall quality assessment. Its findings are incorporated into the precheck report.
5. **Submission readiness**: The final submission decision is based on the aggregate of all 7 checks. A single FAIL on any check means the paper is NOT READY for submission.
6. **Character limits**: The 50-character topic sentence limit and 500-character supporting sentence limit are defined in `writingrules.md` and must be checked against the actual content in `paper.md`.
7. **BibTeX handling**: If `paper_list.bib` does not exist, the Citation Check should report this as a WARN (citations cannot be verified) rather than a FAIL.