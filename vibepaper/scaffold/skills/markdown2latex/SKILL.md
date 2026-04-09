---
name: markdown2latex
description: Converts markdown academic paper content to high-quality LaTeX format suitable for top-tier conferences and journals. Supports user-provided conference templates for format adaptation. Use this skill when the user wants to generate LaTeX from paper.md.
---

# Markdown to LaTeX Conversion Skill

This skill converts markdown academic paper content into high-quality LaTeX format following academic writing standards for computer science research papers.

## When to Use This Skill

- User requests to convert paper.md to LaTeX (e.g., "convert paper.md to LaTeX")
- User wants to generate LaTeX for a full document or specific sections
- User needs academic paper formatting with proper structure and style

## VibePaper Structure Rules

Before converting, read `writingrules.md` to understand the full structure. Key rules:

### Header Levels
| Level | Purpose | LaTeX Mapping |
|-------|---------|---------------|
| Level 1 `#` | Paper title | `\title{}` |
| Level 2-5 `##`~`#####` | Structure framework | `\section{}`, `\subsection{}`, etc. |
| Level 6 `######` | Content paragraph | Topic sentence → paragraph content |

### Content Structure
- **Topic Sentence** (Level 6 header): Becomes the opening sentence of the paragraph
- **Supporting Sentences** (paragraph body): Follows the topic sentence with evidence
- **Metadata**: `description` fields provide context but are not included in LaTeX output

## Instructions

### For Full Document Conversion

You are an expert academic researcher in computer science and LaTeX professional.
Your task is to write a full, high-quality academic paper in English targeted to the top tier conferences and journals based on the hints provided in `paper.md`.

**Instructions:**
- **Hint Usage**: Each Level 6 header is a topic sentence. The paragraph content provides supporting details. Organize and expand as needed.
- **Structure**: Map Level 2-5 headers to LaTeX sections. Map Level 6 headers to paragraph content.
- **Writing Style**: 
  1. Maintain a formal academic tone throughout. Use precise language, avoid colloquialisms, and ensure clarity. Write in active voice where appropriate. 
  2. Ensure that each paragraph follows a "topic‑to‑support" structure: the opening sentence (topic sentence) should clearly state the core idea of the paragraph. Subsequent sentences should provide rigorous supporting details.
- **Citations**: If the markdown includes citations (e.g., [1], [Smith et al., 2020]), include them properly in the LaTeX using \cite{}. Do NOT make up citations.
- **LaTeX Formatting**: 
  - Use \documentclass{article} (or similar).
  - Use standard LaTeX commands for sections, lists, and formatting.
  - Preserve any math formulas found in the markdown (e.g., $...$).
  - If the markdown suggests a figure or table, create a placeholder LaTeX environment.
- **Output**: Output ONLY valid LaTeX code. No surrounding markdown code blocks.

### For Section-Specific Conversion

You are an expert academic researcher in computer science and LaTeX professional.
Your task is to write a full, high-quality academic paper section in English targeted to the top tier conferences and journals based on the hints provided in `paper.md`.

**Instructions:**
- **Content Expansion**: Each Level 6 header is a topic sentence. Expand into full paragraphs.
- **Structure**: Use natural paragraph breaks. Do not use subsections and itemize in Introduction and Conclusion.
- **Writing Style**: 
  1. Maintain a formal academic tone throughout. Use precise language, avoid colloquialisms, and ensure clarity. Write in active voice where appropriate. 
  2. Ensure that each paragraph follows a "topic‑to‑support" structure.
- **Citations**: If the markdown includes citations (e.g., [1], [Smith et al., 2020]), include them properly in the LaTeX using \cite{}. Do NOT make up citations.
- **LaTeX Formatting**: 
  - Use standard LaTeX commands for sections, lists, and formatting.
  - Preserve any math formulas found in the markdown (e.g., $...$).
  - If the markdown suggests a figure or table, create a placeholder LaTeX environment.
- **Output**: Output ONLY valid LaTeX code. No surrounding markdown code blocks.


## Conference Template Adaptation

This skill supports user-provided LaTeX templates for specific conferences or journals.

### Template Workflow

Before converting, check if a template is configured:

1. **Check Template Configuration**: Read `.agents/state.json` and look for `"latex_template"` field.
   - If present, read the template file at the specified path.
   - If absent, ask the user: *"Do you have a specific conference/journal LaTeX template? Please provide the file path, or I'll use a generic article format."*

2. **Analyze Template Structure**: When a template is provided:
   - Read the `.tex` file to identify:
     - Document class and options (e.g., `\documentclass[sigconf]{acmart}`)
     - Required packages
     - Page limits or formatting constraints (from comments or class options)
     - Section structure requirements (e.g., some templates require specific section names)
     - Author/affiliation format
     - Bibliography style
   - Report findings to the user before proceeding.

3. **Adapt Conversion**: During LaTeX generation:
   - Use the template's `\documentclass` instead of generic `article`
   - Follow the template's package requirements
   - Adapt section naming if the template requires specific names
   - Use the template's bibliography style (e.g., `\bibliographystyle{ACM-Reference-Format}`)
   - Respect page limits by adjusting content density if needed

4. **Record Template**: After successful configuration, update `.agents/state.json`:
   ```json
   {
     "latex_template": "path/to/template.tex",
     "target_venue": "ICSE 2026"
   }
   ```

### Supported Template Formats

| Format | Example |
|--------|---------|
| ACM (acmart) | ICSE, FSE, ASE |
| IEEE (IEEEtran) | TSE, ICPC, SANER |
| Springer (llncs) | LNCS series |
| Custom | Any user-provided .tex template |

### Important Notes
- Templates are NOT built-in. The user must provide their own template file.
- Templates are NOT auto-downloaded. The user places the file in their project.
- The skill adapts to the template; it does not modify the template itself.

## Input Format

The input is `paper.md` with:
- Section headers (# Header, ## Subheader, etc.)
- Level 6 headers (######) as topic sentences
- Paragraph content as supporting sentences
- Citations in brackets [1] or [Author et al., Year]
- Math formulas in $ or $$
- Figure/table placeholders

## Output Format

Pure LaTeX code without any markdown code blocks or explanations. The output should be:
- For full documents: Complete LaTeX document with \documentclass, \begin{document}, etc.
- For sections: Section content with \section{} command and paragraph content

## Examples

**User Request:**
"Convert the Introduction section from paper.md to LaTeX"

**Expected Action:**
1. Read the Introduction section from paper.md
2. Apply the section-specific conversion instructions above
3. Output only the LaTeX code for that section

**User Request:**
"Generate complete LaTeX document from paper.md"

**Expected Action:**
1. Read the entire paper.md file
2. Apply the full document conversion instructions above
3. Output a complete LaTeX document ready to compile
