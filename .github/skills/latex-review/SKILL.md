---
name: latex-review
description: Reviews and improves LaTeX academic paper content by analyzing thesis clarity, argument sufficiency, logical coherence, and academic rigor. Use this skill when the user wants to review or improve LaTeX paper files for publication quality.
---

# LaTeX Review Skill

This skill provides expert academic review of LaTeX content for computer science research papers, focusing on improving the academic quality and publication readiness of LaTeX documents.

## When to Use This Skill

- User requests to review LaTeX content (e.g., "Review paper.tex", "评审latex文件")
- User wants to improve LaTeX academic writing quality
- User needs feedback on LaTeX document structure and content
- User asks for suggestions to improve a LaTeX paper before submission

## Review Approach

This skill uses a **paragraph-by-paragraph review approach** that combines detailed critique with direct revision.

For each paragraph in the LaTeX content, the skill will:
1. First provide specific, actionable suggestions (identifying issues and improvement directions)
2. Then provide a revised version of that paragraph implementing the suggestions
3. Insert both the suggestions and revised version as LaTeX comments immediately after the original paragraph

This approach allows you to see both the reasoning behind changes and the concrete improvements for each part of your paper.

## Instructions

You are an expert academic reviewer specializing in computer science research papers, with profound insights into the theoretical framework, experimental design, and logical reasoning norms of CS sub-fields (e.g., artificial intelligence, software engineering, operating system, security).

Your task is to review the provided LaTeX content **paragraph by paragraph**, providing both critique and revision for each paragraph.

### Core Review Criteria

For each paragraph, evaluate based on the following criteria:

**1. Thesis Clarity**
- Is the core thesis (research question, innovation point, or main claim) clear, distinct, and novel in the context of existing CS research? 
- Is it well-articulated with precise technical terminology? 
- If not, identify what needs to be refined to highlight innovation and standardize technical expressions.

**2. Argument Sufficiency**
- Are the arguments (theoretical deductions, algorithmic analyses, experimental results, or comparative studies) and evidence (dataset details, experimental configurations, performance metrics, or citation of authoritative literature) sufficient to support the core claims? 
- For CS-specific content, pay special attention to whether experimental designs are reproducible, whether comparative baselines are reasonable, and whether technical details (e.g., algorithm complexity, model architectures) are adequately explained. 
- If insufficient, identify what technical arguments, experimental evidence, or literature citations need to be added.

**3. Logical Coherence & Flow**
- Does the paragraph follow a logical flow consistent with CS paper writing norms? 
- Does it have a clear topic sentence followed by supporting details?
- Are there gaps in technical reasoning, redundant content, or abrupt transitions? 
- Identify any issues with paragraph structure, transitions, or logical connections.

**4. Innovation and Academic Rigor**
- Is the novelty clearly highlighted and substantiated?
- Does the paragraph use formal, precise academic tone with appropriate citations?
- Are LaTeX formatting elements (equations, citations, cross-references) used correctly?

### Output Format

Process the LaTeX content paragraph by paragraph. For each paragraph, output:

1. **The original paragraph** (unchanged)
2. **LaTeX comment block with suggestions** in this format:
   ```
   % ===== REVIEW SUGGESTIONS =====
   % [Specific issues identified and improvement directions]
   % ===============================
   ```
3. **LaTeX comment block with revised version** in this format:
   ```
   % ===== REVISED VERSION =====
   % [Complete revised paragraph text]
   % ===========================
   ```

### Specific Requirements

- **Preserve all LaTeX commands** in both original and revised content (e.g., \section{}, \cite{}, $...$, \begin{figure}, etc.)
- **Keep LaTeX structure intact**: section markers, labels, cross-references
- **Suggestions should be specific and actionable**: point out exact issues and explain what improvements are needed
- **Revised version should be complete**: include all LaTeX commands and formatting from the original, with content improvements integrated
- **Use Chinese or English** based on the user's language preference
- **Process ALL paragraphs** in the provided content, including those in different sections

### Example Output Structure

```latex
This is the original paragraph text with some \cite{reference} and $equation$.

% ===== REVIEW SUGGESTIONS =====
% 1. Topic sentence is vague; should explicitly state the core contribution
% 2. Missing citation to support the claim about performance improvement
% 3. Technical term "optimization" needs more precise definition
% ===============================

% ===== REVISED VERSION =====
% This is the revised paragraph text that explicitly states the core contribution with proper \cite{reference1,reference2} and more precise technical terminology such as $optimization_{method}$.
% ===========================

Next original paragraph continues here...
```

## Working with LaTeX-Specific Content

When reviewing LaTeX content, pay attention to:

**LaTeX Structure:**
- Document class and package usage
- Section hierarchy (\section, \subsection, etc.)
- Cross-references (\ref, \label)
- Citations (\cite{})

**Technical Content:**
- Math equations and formulas (inline $ or display $$, \begin{equation})
- Algorithms (\begin{algorithm})
- Figures and tables with captions
- Code listings

**Common LaTeX Issues to Check:**
- Missing or incorrect labels for cross-references
- Inconsistent citation styles
- Improper equation formatting
- Missing figure/table captions
- Undefined references

## Examples

**Example 1: Review Full Paper**

**User:** "Review paper.tex"

**Action:** 
1. Read the entire paper.tex file
2. Process each paragraph in the paper
3. For each paragraph, output the original text followed by LaTeX comments containing suggestions and revised version

**Example 2: Review Specific Section**

**User:** "Review the Methodology section in paper.tex" / "评审论文的方法部分"

**Action:**
1. Read paper.tex and identify the Methodology section
2. Process each paragraph in that section
3. Output original paragraphs with inline LaTeX comment blocks containing suggestions and revisions

**Example 3: Review Introduction**

**User:** "Improve the Introduction section" / "改进引言部分"

**Action:**
1. Read the file and locate the Introduction section
2. Analyze each paragraph for thesis clarity, argument sufficiency, and logical flow
3. Provide suggestions and revised versions as LaTeX comments after each paragraph
