# LaTeX Templates

This directory is for storing conference/journal LaTeX templates.

## Usage

1. Download the LaTeX template from your target venue's website
2. Place the `.cls` and `.tex` template files in this directory
3. Tell the agent: "Use template from templates/your-template.tex"
4. The template path will be recorded in `.agents/state.json`

## Example Structure

```
templates/
├── README.md          (this file)
├── acmart.cls         (ACM template class file)
├── sample-sigconf.tex (ACM conference template)
└── IEEEtran.cls       (IEEE template class file)
```

## Notes

- Templates are NOT included in this repository
- Download templates from the official conference/journal website
- Common sources:
  - ACM: https://www.acm.org/publications/proceedings-template
  - IEEE: https://www.ieee.org/conferences/publishing/templates.html
  - Springer LNCS: https://www.springer.com/gp/computer-science/lncs/conference-proceedings-guidelines