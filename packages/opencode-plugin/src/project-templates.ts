import type { ProjectFileTemplate, ProjectState, ProjectTemplateInput } from "./types"

const paperTemplate = `# Paper
###### Manuscript Workspace
<!-- description: Working paper draft area -->
Draft the manuscript here as the storyline, evidence, and review phases mature.
`

const storylineTemplate = `# Storyline
###### Research Thread
<!-- description: Initial storyline workspace -->
Capture the problem, central claim, evidence plan, and reader journey for the paper.
`

const writingRulesTemplate = `# Writing Rules
###### Structural Constraints
<!-- description: Required Markdown writing rules -->
Use heading levels 1-5 only for structure. Place body text under level 6 headings with description metadata.
`

const agentsTemplate = `# AGENTS.md
## OVERVIEW
###### CoPaper Project Guidance
<!-- description: Local agent guidance -->
This project was initialized by CoPaper. Keep shared state in \`.agents/state.json\` and events in \`.agents/events.jsonl\`.

## CONVENTIONS
###### Document Structure
<!-- description: Markdown structure constraints -->
Use heading levels 1-5 only for structure. Place body text under level 6 headings with description metadata.
`

export function buildProjectState(input: ProjectTemplateInput): ProjectState {
  return {
    project: {
      name: input.name,
      created_at: input.createdAt,
      domain: input.domain,
    },
    phases: {
      storyline: { status: "not_started", completed_at: null, metadata: {} },
      literature: {
        status: "not_started",
        completed_at: null,
        catalog_path: "relatedwork/literature.json",
        papers_found: 0,
        papers_downloaded: 0,
        download_failures: 0,
        summaries_done: 0,
        cross_index_built: false,
      },
      discussion: { status: "not_started", completed_at: null, rounds: 0, dimensions_covered: [] },
      experiments: { status: "not_started", completed_at: null, skip_reason: null, data_files: [] },
      writing: { status: "not_started", completed_at: null, sections_complete: 0, sections_total: 0 },
      latex_review: { status: "not_started", completed_at: null, review_rounds: 0, comments_addressed: 0, comments_total: 0 },
    },
    current_phase: "storyline",
    event_log_path: ".agents/events.jsonl",
    git: {
      auto_commit: false,
      identity: {
        role: "assistant",
        git_name: "CoPaper Bot",
        git_email: "bot@copaper.dev",
      },
    },
    checkers: {},
  }
}

export function buildProjectFiles(input: ProjectTemplateInput): ProjectFileTemplate[] {
  return [
    { path: "paper.md", content: paperTemplate },
    { path: "storyline.md", content: storylineTemplate },
    { path: "writingrules.md", content: writingRulesTemplate },
    { path: "AGENTS.md", content: agentsTemplate },
    { path: ".agents/state.json", content: `${JSON.stringify(buildProjectState(input), null, 2)}\n` },
    { path: ".agents/events.jsonl", content: "" },
  ]
}
