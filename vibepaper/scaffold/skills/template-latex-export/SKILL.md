---
name: template-latex-export
description: Convert `paper.md` into a final LaTeX paper project using a user-provided conference or journal template placed under `templates/latex/`. Use when the user asks to generate the final LaTeX paper from the VibePaper markdown draft with a local template.
---

# Template LaTeX Export

This skill converts `paper.md` into a final LaTeX paper using a template that the user has placed in `templates/latex/`.

## Input Files

| File | Required | When Used | Purpose |
|------|----------|-----------|---------|
| `paper.md` | Required | Start | Source VibePaper draft to convert |
| `writingrules.md` | Required | Start | Interpret VibePaper heading and paragraph structure |
| `templates/latex/` | Required | Start | User-provided LaTeX template directory |
| `relatedwork/paper_list.bib` | Optional | Bibliography step | BibTeX entries to copy or reference |
| `fig/` | Optional | Asset step | Figures referenced by the paper |

## Workflow

1. Confirm that `templates/latex/` exists and contains at least one `.tex` template file.
2. If no template exists, ask the user to place the target venue template under `templates/latex/` and stop. Do not invent or download a template.
3. Read `paper.md` and `writingrules.md`.
4. Inspect the template files to identify the main `.tex` file, document class, bibliography commands, package conventions, and author/title placeholders.
5. Create or update an output directory such as `target/latex/`.
6. Copy the template contents into `target/latex/`, preserving class files, style files, bibliography style files, images, and auxiliary files.
7. Convert `paper.md` into LaTeX content:
   - `#` becomes the paper title unless the template already has a title placeholder.
   - `##` to `#####` become sectioning commands appropriate for the template.
   - `######` headings become topic sentences at the start of paragraphs, followed by their body text.
   - HTML metadata comments are omitted.
   - `$...$` and `$$...$$` math are preserved.
   - Existing citation markers are preserved or converted conservatively; do not invent citations.
8. Insert the converted content into the copied template. Prefer explicit placeholders such as `CONTENT_HERE`, `% CONTENT`, or `\input{sections/...}` when present. If no placeholder exists, replace only the main body between `\begin{document}` and bibliography/backmatter commands.
9. Copy `relatedwork/paper_list.bib` into the output directory when present and wire it to the template's bibliography command if needed.
10. Copy referenced figures from `fig/` when present.
11. Report the output directory and main `.tex` file. If a LaTeX engine is available and the user asked for compilation, compile from the output directory.

## Constraints

- The user must provide the template in `templates/latex/`; do not auto-download templates.
- Preserve the original template files in `templates/latex/`; write generated output under `target/latex/`.
- Do not fabricate author names, affiliations, citations, venue names, or experimental results.
- Do not remove template license comments or required style files.
- If multiple `.tex` files look like main files, ask the user which one to use.
- Keep the conversion faithful to `paper.md`; polish only enough to produce valid LaTeX.
