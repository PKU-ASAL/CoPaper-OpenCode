---
name: latex2markdown
description: Extracts content from LaTeX files to fill in paper.md. Use this skill when the user wants to import content from existing LaTeX papers into the VibePaper structure.
---

# LaTeX to Markdown Conversion Skill

This skill extracts content from LaTeX academic papers and fills it into the VibePaper markdown structure defined in `writingrules.md`.

## When to Use This Skill

- User requests to convert LaTeX to paper.md (e.g., "convert LaTeX to paper.md", "import my LaTeX paper")
- User wants to extract content from existing LaTeX files to fill paper.md
- User needs to migrate LaTeX content to the VibePaper structure

## VibePaper Structure Rules

Before converting, read `writingrules.md` to understand the full structure. Key rules:

### Header Levels
| Level | Purpose |
|-------|---------|
| Level 1-5 `#`~`#####` | Structure framework (do not modify) |
| Level 6 `######` | Content paragraph (topic sentence) |

### Content Writing Rules
- **Topic Sentence** (Level 6 header): ≤ 50 characters, summarizes paragraph core point
- **Supporting Sentences** (paragraph body): ≤ 500 characters, with evidence, data, reasoning

## Instructions

### Core Principle

**Do not modify the structure of paper.md.** Only fill in content under each section based on the `description` guidance.

**You can leave empty sections if there is no corresponding content in the LaTeX files.**

**Do not use the comments in Latex**

### Step-by-Step Process

1. **Read paper.md**: Understand the existing structure and `description` fields
2. **Read LaTeX files**: Extract relevant content (title, sections, paragraphs, figures, tables)
3. **Match content to structure**: Map LaTeX content to corresponding sections in paper.md based on semantic meaning, not just section names
4. **Write topic sentences**: Extract key points as Level 6 headers (≤ 50 characters)
5. **Write supporting sentences**: Add detailed content as paragraph body (≤ 500 characters)
6. **Handle special elements**: Process figures, tables, algorithms, equations appropriately

### Content Extraction Rules

#### From LaTeX to paper.md

| LaTeX Element | paper.md Mapping |
|---------------|------------------|
| `\title{}` | Level 1 header `#` |
| `\section{}` | Match to corresponding section based on content meaning |
| `\subsection{}` | Match to corresponding subsection in paper.md |
| Paragraphs | Extract as Level 6 header + supporting sentences |
| `\begin{figure}` | Reference in text, add image to `fig/` folder |
| `\begin{table}` | Convert to markdown table or describe in text |
| `\begin{algorithm}` | Describe algorithm in supporting sentences |
| `\begin{lstlisting}` | Describe code logic in supporting sentences |
| `$...$`, `$$...$$` | Preserve as inline/block math formulas |
| `\cite{}`, `\bibitem{}` | Preserve as `[Author et al., Year]` format |


#### Paragraph Conversion

For each paragraph in LaTeX:
1. **Identify the topic**: What is the main point of this paragraph?
2. **Write topic sentence**: Summarize in ≤ 50 characters as Level 6 header
3. **Extract supporting content**: Keep essential evidence, data, reasoning (≤ 500 characters)
4. **Match to paper.md section**: Find the appropriate section based on `description` guidance
5. **Split if needed**: If content exceeds 500 chars, split into multiple paragraphs with different topic sentences

#### Special Elements Handling

**Figures:**
- Extract figure content description as supporting sentences
- Note figure reference in text (e.g., "如图X所示...")
- If user provides image files, copy to `fig/` folder

**Tables:**
- Convert small tables to markdown format
- For large tables, summarize key findings in supporting sentences
- Preserve table captions as descriptions

**Algorithms:**
- Describe algorithm purpose and key steps in supporting sentences
- Note complexity if mentioned (e.g., "时间复杂度为O(n log n)")

**Equations:**
- Preserve math formulas as `$...$` or `$$...$$`
- Explain equation meaning in supporting sentences if needed

### Examples

**Example 1: Paragraph Conversion**

**LaTeX Input:**
```latex
\section{Introduction}
Our system achieves 92\% detection rate for APT attacks, 
compared to 78\% for the state-of-the-art method HOLMES.
The improvement comes from modeling temporal correlations 
between attack stages, which traditional methods ignore.
```

**paper.md Output:**
```markdown


**Example 2: Section Matching**

**LaTeX Input:**
```latex
\section{Related Work}
Traditional intrusion detection systems can be categorized 
into signature-based and anomaly-based approaches. 
Signature-based methods [1] detect known attacks but fail 
on zero-day threats. Anomaly-based methods [2] can detect 
novel attacks but suffer from high false positive rates.
```

**paper.md Output:**
```markdown
## 业界当前解决方案
<!-- description: 概述当前业界主流的解决方案和方法 -->

### 第一类解决方案
<!-- description: 概述第一类方法的思路和局限 -->

###### Signature-based IDS detects known attacks only
Signature-based methods detect known attacks but fail on zero-day threats. They match attack patterns against predefined rules [1].
```

## Important Notes

1. **Preserve Math**: Keep LaTeX math formulas as `$...$` or `$$...$$`
2. **Preserve Citations**: Keep citation references as `[Author, Year]`
3. **Respect Limits**: Topic sentence ≤ 50 chars, supporting sentences ≤ 500 chars
4. **Follow Description**: Write content that matches each section's `description` guidance
5. **No Structure Changes**: Never modify Level 1-5 headers in paper.md
6. **Semantic Matching**: Match LaTeX content to paper.md sections by meaning, not just names
7. **Leave Empty**: If no matching content exists, leave the section empty rather than forcing content
