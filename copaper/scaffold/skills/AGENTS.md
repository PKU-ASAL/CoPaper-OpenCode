# AGENTS.md (Skills)

## OVERVIEW
###### Skill catalog for writing and workflow automation
<!-- description: Purpose of the skills directory and its role in CoPaper -->
The `.agents/skills/` directory contains the reusable skill library shipped with CoPaper.
Each skill is a self-contained module that extends the agent's capabilities for a specific academic task or workflow-management task.
These skills are bundled into initialized projects by `copaper init`.

## STRUCTURE
###### Standardized skill module organization
<!-- description: Internal organization of each skill folder -->
- `SKILL.md`: The core definition file containing YAML frontmatter and instructions.
- `README.md`: (Optional) User-facing documentation for the skill.
- `scripts/`: (Optional) Supporting automation or processing scripts.
- `template.md`: (Optional) extra prompt/template material used by a specific skill.

## WHERE TO LOOK
###### Important skills in the current catalog
<!-- description: Catalog of skills in this directory -->
- `copaper-manage`: Teaches agents how to use OpenCode plugin tools for dashboard, initialization, artifact readiness, workflow status, phase updates, and workflow log inspection.
- `human-comment-helper`: Adds structured reviewer feedback and synthetic examples.
- `latex2markdown`: Imports content from LaTeX files into the CoPaper structure.
- `markdown-helper`: Interactive assistance for writing and improving `paper.md`.
- `markdown-review`: Quality assurance check for novelty, importance, and correctness.
- `markdown2latex`: High-quality export from `paper.md` to conference-ready LaTeX.
- `pdf2paper`: Converts an existing PDF draft into `paper.md` section by section with faithful mapping and light polishing.
- `ppt2storyline`: Converts a research PPT/PPTX deck into `storyline.md` with faithful mapping and light polishing.
- `relatedwork-finder`: Automated literature search, BibTeX sync, and PDF downloading.
- `relatedwork-summarizer`: Generates sequential multimodal summaries for downloaded papers and builds the literature cross-index.
- `storyline-helper`: Interactive, section-by-section guidance for constructing and refining the research storyline in `storyline.md`, including reverse extraction from `paper.md`.
- `writing-orchestrator`: Scans `paper.md`, recommends the next section, and routes work into drafting/review skills.
- `submission-precheck`: Runs a final submission-oriented quality pass.

## CONVENTIONS
###### Requirements for skill definition and activation
<!-- description: Rules for creating and triggering skills -->
- **YAML Frontmatter**: Every `SKILL.md` must start with `name` and `description`.
- **Triggers**: Skills are activated via natural language (e.g., "help me write", "find related work").
- **Quality Gates**: Use `markdown-review` to validate content before final export.
- **Format Mapping**: Conversion skills must maintain semantic meaning across formats.
- **Math Support**: Preserve `$...$` and `$$...$$` during all transformations.
- **OpenCode Plugin Tools**: When available, skills MUST use `copaper_dashboard`, `copaper_init_apply`, `copaper_artifact_status`, `copaper_artifact_record`, `copaper_workflow_status`, `copaper_workflow_log`, and `copaper_workflow_set_phase` instead of shell `copaper` commands or manual `.agents/state.json` / `.agents/events.jsonl` edits.
- **Project Initialization**: After explicit user confirmation and collection of project `name` and `domain`, call `copaper_init_apply` to initialize OpenCode-managed CoPaper core files. Do not describe initialization as a prompt-only action or manually create the core files when the plugin tool is available.
- **Workflow Status Queries**: For read-only workflow phase status, current phase, phase table, and next-step recommendation, call `copaper_workflow_status`. Do not read `.agents/state.json` directly for phase state when the plugin tool is available.
- **Paper Structure Queries**: For read-only `paper.md` Level 2-5 completion, Level 5 writing targets, next writing target, and structural issues, call `copaper_paper_structure_status`. Do not reimplement this as prompt-only heading scans or shell parsing when the plugin tool is available.
- **Storyline Structure Queries**: For read-only `storyline.md` `#####` section readiness, TODO coverage, and next storyline target, call `copaper_storyline_structure_status`. Do not reimplement this as prompt-only section scans when the plugin tool is available.
- **Import Extraction**: For user-specified PDF and PPTX imports, call `copaper_pdf_extract` or `copaper_ppt_extract`. These tools are read-only and require an explicit user-provided absolute or relative path; do not run separate shell existence checks, scan directories, glob for candidates, or guess source files.
- **Checker Status Queries**: For read-only checker run status, Critical/Major/Minor counts, stale signals, and `.agents/precheck_report.md` evidence, call `copaper_checker_status`. Do not read `.agents/state.json` or `.agents/precheck_report.md` directly just to infer checker status when the plugin tool is available.
- **Reviewer Boundary**: Route checker review, checker-result summarization, and issue explanation to `@copaper-reviewer` when available. The reviewer is read-only and must not edit `paper.md` or write checker records directly.
- **Phase Updates**: After explicit user confirmation, call `copaper_workflow_set_phase`; the tool writes `.agents/state.json` and appends `.agents/events.jsonl`. Do not describe this as a prompt-only action.
- **Workflow Log Queries**: For read-only inspection of `.agents/events.jsonl`, call `copaper_workflow_log` with optional `lastN`, `phase`, and `operator` filters. Do not read the event log file directly when the plugin tool is available.
- **Artifact Readiness Queries**: For read-only artifact readiness, evidence, confidence, and recommendation, call `copaper_artifact_status`. Do not manually infer readiness from files or `.agents/state.json` when the plugin tool is available.
- **Artifact Readiness Records**: After explicit user confirmation, route artifact readiness recording to `@copaper-recorder`; the recorder calls `copaper_artifact_record`, which writes the `artifacts` area in `.agents/state.json` and appends `.agents/events.jsonl`. Do not describe readiness recording as a prompt-only action.
- **Recorder Boundary**: `copaper_artifact_record` must be invoked through `@copaper-recorder`; other agents should route the recording action rather than calling it directly.
- **Unsupported Tool Gaps**: If the OpenCode plugin does not yet expose a needed capability, state the gap explicitly instead of inventing a plugin tool or falling back silently.
- **Scaffold Sync**: New or changed skills must be mirrored into the packaged scaffold.

## ANTI-PATTERNS
###### Common mistakes in skill usage and development
<!-- description: What to avoid when working with skills -->
- Do not bypass `writingrules.md` constraints in any skill logic.
- Do not modify Level 1-5 headers during automated content insertion.
- Do not generate final paper content without user-provided insights or data.
- Do not invent absolute paths. Only use absolute paths when the user explicitly provided them or a plugin tool contract accepts them.
- Do not duplicate core structural rules already defined in the root `AGENTS.md`.
- Do not document nonexistent plugin tools or outdated CLI-only workflows.
- Do not tell agents to edit `.agents/state.json` directly when an OpenCode plugin tool supports the workflow update.
