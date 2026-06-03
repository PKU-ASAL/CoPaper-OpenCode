---
name: latex-final-writer
description: Guides the post-paper.md LaTeX final-draft workflow. Use when the user has a completed paper.md and wants to write the final LaTeX paper from a downloaded conference template, create writing_plan.md, initialize tex/ structure, draft sections, or revise the LaTeX final draft.
---

# LaTeX Final-Draft Writer Skill

This skill manages the workflow from a completed `paper.md` to a conference-ready LaTeX final draft in a user-provided template directory, usually `tex/` at the project root.

## When to Use This Skill

- User says they have finished `paper.md` and want to write the LaTeX final paper.
- User says “写 LaTeX 终稿”, “生成终稿”, “根据模板写论文”, “create writing_plan.md”, or “初始化 tex 大纲”.
- User provides or downloads a conference/journal LaTeX template into the project root.
- User asks to continue section-by-section LaTeX writing according to a writing plan.
- User asks to review or revise the LaTeX final draft after the full draft is written.

Do not use this skill for converting an existing LaTeX paper back into `paper.md`; use `latex2markdown` for that. Do not use it for generic Markdown-only writing; use `writing-orchestrator`, `markdown-helper`, or `mad-writer`.

## Core Principle

The LaTeX final draft must be a faithful, technically precise expansion of the already established research content. The agent may improve structure, wording, LaTeX formatting, and claim boundaries, but must not invent new experiments, numbers, citations, assumptions, or research claims.

## Input Files

| File/Directory | Required | Purpose |
|---|---:|---|
| `paper.md` | Required | Canonical paper content and claim source. |
| `storyline.md` | Strongly recommended | High-level problem, insight, design, and evaluation plan. |
| `writingrules.md` | Required | CoPaper structure and content constraints. |
| `relatedwork/literature.json` | Conditional | Canonical related-work metadata. |
| `relatedwork/papers/*.md` | Conditional | Paper summaries used to write Related Work accurately. |
| `.agents/cross_index.json` | Conditional | Concept-to-literature map, if available. |
| `tex/` or user template directory | Required before LaTeX writing | Target LaTeX template and output directory. |
| `fig/` and/or user figure assets | Conditional | Source figures to copy into `tex/fig/`. |
| `writing_plan.md` | Created or updated by this workflow | Section plan, page budget, figure/table plan, and claim constraints. |

If the template directory or required source files are missing, stop and ask the user to provide them. Do not fabricate template files or figure assets.

## Workflow Overview

### Phase 1: Template Intake

1. Confirm the user has downloaded the target LaTeX template into the project root, normally as `tex/`.
2. Inspect the template structure:
   - main entry file, e.g. `tex/main.tex`;
   - section files, e.g. `tex/tex/*.tex`;
   - bibliography file, e.g. `tex/references.bib`;
   - figure directory, e.g. `tex/fig/`;
   - class/style files and page-limit notes.
3. Identify compilation command from the template where possible. Prefer `latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex` from inside the template directory unless the template documents another command.
4. Report the detected template structure and any missing required folders/files before editing.

### Phase 2: Writing Plan Creation

Create or update `writing_plan.md` at the project root before drafting LaTeX prose.

The plan should follow the style of the project’s existing `writing_plan.md` and include:

1. **Writing target and current state**
   - target venue or format;
   - page limit and page budget;
   - current completion status of each LaTeX section.
2. **Core storyline and contribution hierarchy**
   - problem;
   - key insight;
   - main design components;
   - evaluation claims;
   - explicit claim boundaries.
3. **Section-by-section outline**
   - abstract;
   - introduction;
   - background/motivation;
   - method/design;
   - analysis/theory, if any;
   - evaluation;
   - discussion/threats;
   - related work;
   - conclusion.
4. **Figure/table plan**
   - each figure/table label;
   - intended source file;
   - target LaTeX path under `tex/fig/`;
   - which section uses it;
   - what claim it supports and what it does not support.
5. **Writing order**
   - usually technical trunk first, then evaluation, discussion/related work, background/introduction, abstract/conclusion;
   - adapt order to the paper’s risk profile.
6. **Hard writing constraints**
   - no invented experiments or numbers;
   - no claim beyond `paper.md`, `storyline.md`, related-work summaries, or actual experimental evidence;
   - no unsupported novelty or safety claims;
   - all claims must stay inside the evaluated scope.

Ask the user to confirm the plan before large-scale drafting unless they explicitly request autonomous execution.

### Phase 3: Template Outline Initialization

Initialize the LaTeX template so that it has the intended paper skeleton before writing full prose.

1. Update `main.tex` only as needed to include the target section files in the correct order.
2. Create or update section files under the template’s section directory, for example:
   - `tex/tex/abstract.tex`
   - `tex/tex/intro.tex`
   - `tex/tex/background.tex` or `tex/tex/bg.tex`
   - `tex/tex/method.tex` or `tex/tex/design.tex`
   - `tex/tex/evaluation.tex`
   - `tex/tex/discussion.tex`
   - `tex/tex/relatedwork.tex`
   - `tex/tex/conclusion.tex`
3. Insert only structural section/subsection headings and necessary figure/table skeletons at this stage.
4. Preserve the template’s class, package conventions, bibliography style, and author/title format unless the user asks to change them.
5. Guide the user to copy required figure files into the template figure directory, usually `tex/fig/`.
6. Do not invent placeholder experimental figures. If a figure is missing, insert a TODO comment or ask the user for the file.

### Phase 4: Section-by-Section LaTeX Writing

Write the final LaTeX draft according to `writing_plan.md`. Work one section at a time.

Before writing each section, read and deeply understand the relevant sources:

1. Always read the corresponding part of `paper.md`.
2. Read `storyline.md` when the section touches problem, insight, design, or evaluation narrative.
3. Read `writing_plan.md` to enforce page budget, section intent, and claim boundaries.
4. For Related Work, read:
   - `relatedwork/literature.json`;
   - relevant `relatedwork/papers/*.md` summaries;
   - `.agents/cross_index.json`, if present.
5. For Evaluation, read actual result tables, figure data, experiment notes, and any scripts or data files that the user identifies as authoritative.
6. For LaTeX integration, read existing neighboring section files to maintain terminology and notation consistency.

Writing requirements:

- Produce conference-style LaTeX prose, not a mechanical paragraph-by-paragraph copy from `paper.md`.
- Preserve all math notation and define symbols before use.
- Use `\cite{...}` only for references that exist in the bibliography or that the user explicitly asks to add.
- Do not fabricate related-work summaries; only use downloaded/summarized papers or user-provided citation facts.
- Do not fabricate numerical results or experimental setup details.
- Keep Introduction and Conclusion natural; avoid unnecessary subsections unless the venue or template expects them.
- Keep captions concise but self-contained.
- Keep scope qualifiers close to strong claims, especially for safety, timing, theorem, empirical, or deployment claims.
- When a section relies on a claim boundary, write the boundary explicitly rather than burying it only in Discussion.

After drafting a section:

1. Check that the section satisfies its `writing_plan.md` purpose.
2. Check that all cited claims have support in `paper.md`, related-work summaries, or experiment evidence.
3. Check notation consistency with already written LaTeX sections.
4. Run a targeted read-through for unsupported claims, duplicated content, and page-budget risk.
5. If the user wants strict gating, run the relevant checker skill or ask for user confirmation before moving to the next section.

### Phase 5: Full-Draft Review and Revision

After all LaTeX sections are written, the user may ask for review or revision. Handle these requests as LaTeX final-draft tasks, not as free-form rewriting.

Common review modes:

- logic and claim-evidence consistency;
- data and experiment consistency;
- related-work citation accuracy;
- novelty and differentiation;
- technical depth;
- safety/scope boundary;
- AI-style writing artifacts;
- page-limit compression;
- LaTeX compile errors, undefined references, overfull boxes, and float placement.

Review workflow:

1. Read the relevant LaTeX files, not only `paper.md`.
2. Compare strong claims against `paper.md`, `storyline.md`, experiment evidence, and related-work summaries.
3. Report findings with exact file and line references.
4. For user-approved revisions, edit only the relevant LaTeX files.
5. Run targeted checks after edits. Compile only when useful or requested, or when changes could affect LaTeX validity.

## Recommended Writing Order

Default order for a new LaTeX final draft:

1. Template and figure/table setup.
2. `writing_plan.md`.
3. Technical trunk: system model, method/design, analysis.
4. Evaluation.
5. Discussion/threats and related work.
6. Background/motivation.
7. Introduction.
8. Abstract and conclusion.
9. Full-paper consistency pass.
10. Compilation and submission-oriented checks.

Rationale: write the technical and evidence-bearing sections first so that Introduction, Abstract, and Conclusion do not overclaim.

## Writing Plan Template

Use this structure when creating `writing_plan.md`:

```markdown
# <Paper Title> 写作大纲与计划

## 1. 写作目标与当前状态

### 1.1 写作目标
- 目标稿件：<venue/template/page limit>。
- 主线：<one-sentence storyline>。
- 核心贡献层级：
  1. <contribution 1>
  2. <contribution 2>
  3. <contribution 3>

### 1.2 当前写作状态
- 模板目录：`tex/`。
- 编译命令：`<command>`。
- 已完成：<files/sections>。
- 待完成：<files/sections>。

## 2. 篇幅预算

| Part | 目标页数 | 当前状态 |
|---|---:|---|
| Abstract |  |  |
| Introduction |  |  |
| Background |  |  |
| Method / Design |  |  |
| Analysis |  |  |
| Evaluation |  |  |
| Discussion |  |  |
| Related Work |  |  |
| Conclusion |  |  |
| **Total** |  |  |

## 3. 正文大纲

### Abstract
- <claims and evidence>

### 1. Introduction
- <motivation, gap, insight, results, contributions>

### 2. Background / Motivation
- <concepts and motivation evidence>

### 3. Method / Design
- <technical structure>

### 4. Analysis / Theory
- <assumptions, property, proof scope>

### 5. Evaluation
- <RQs, setup, metrics, results, boundaries>

### 6. Discussion / Threats
- <scope and limitations>

### 7. Related Work
- <categories and differentiation>

### 8. Conclusion
- <scoped takeaway>

## 4. 图表计划

### Figures
1. **Fig.1** — <caption intent>. File: `tex/fig/<file>`.

### Tables
1. **Table 1** — <caption intent>. Label: `<label>`.

## 5. 写作顺序
- Phase 0: Template and figures.
- Phase 1: Technical trunk.
- Phase 2: Evaluation.
- Phase 3: Discussion and related work.
- Phase 4: Background, introduction, abstract, conclusion.
- Phase 5: Full-paper checks.

## 6. 写作约束
- <do-not-invent constraints>
- <claim boundaries>
- <terminology rules>
- <page-limit strategy>
```

## Common Pitfalls

- Do not treat `paper.md` as optional. It is the canonical source for final LaTeX content.
- Do not write from memory when writing a section; re-read relevant sources first.
- Do not fabricate related work or citations.
- Do not add numerical results without user-provided evidence.
- Do not overclaim in Abstract/Introduction before the body supports the claim.
- Do not bury important safety, timing, or deployment-scope limitations only in Discussion.
- Do not ignore the template’s bibliography, package, and figure conventions.
- Do not copy figures into the wrong folder; final LaTeX usually expects `tex/fig/` or the template’s configured figure path.
- Do not run broad rewrites after the final draft unless the user asks; use targeted review and revision.

## Final Checks

Before declaring the LaTeX final draft ready:

1. Compile the template if appropriate:
   ```powershell
   latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex
   ```
   Run from the template directory, e.g. `tex/`.
2. Check undefined references and citations.
3. Check page count against the venue limit.
4. Check figure/table references and file existence.
5. Check all major claims against `paper.md`, `storyline.md`, and evidence.
6. Check that related work citations match actual summarized papers or verified bibliographic facts.
7. Check that Abstract, Introduction, Evaluation, Discussion, and Conclusion use the same scope and terminology.
