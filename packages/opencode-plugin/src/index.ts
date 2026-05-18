import { tool, type Plugin } from "@opencode-ai/plugin"
import { buildVibePaperAgentConfig, type OpenCodeAgentConfig } from "./agent-config"
import { setLatestVibePaperAgentRuntimeState } from "./agent-diagnostics"
import { recordArtifactReadiness, renderArtifactRecordOutput } from "./artifact-record"
import { buildArtifactStatus, renderArtifactStatusOutput } from "./artifacts"
import { recordCheckerResult, renderCheckerRecordOutput } from "./checker-record"
import { buildCheckerStatus, renderCheckerStatusOutput } from "./checker-status"
import { buildDashboardResult, renderDashboardOutput } from "./dashboard"
import { buildPaperStructureStatus, renderPaperStructureStatusOutput } from "./paper-structure"
import { buildPdfExtract, renderPdfExtractOutput } from "./pdf-extract"
import { buildPptExtract, renderPptExtractOutput } from "./ppt-extract"
import { applyProjectInit, renderProjectInitApplyOutput } from "./project-init"
import { buildRelatedworkStatus, renderRelatedworkStatusOutput } from "./relatedwork-status"
import { renderRelatedworkToolOutput, runRelatedworkBuildIndex, runRelatedworkClean, runRelatedworkDownload, runRelatedworkImport, runRelatedworkKeywords, runRelatedworkRegisterSummary, runRelatedworkSearch, runRelatedworkSummarize, runRelatedworkSyncBib } from "./relatedwork-tools"
import { buildStorylineStructureStatus, renderStorylineStructureStatusOutput } from "./storyline-structure"
import { buildWorkflowStatus, queryWorkflowLog, renderWorkflowLogOutput, renderWorkflowSetPhaseOutput, renderWorkflowStatusOutput, setWorkflowPhase } from "./workflow"
import { ARTIFACT_CONFIDENCE, ARTIFACT_RECORD_IDS, ARTIFACT_STATUSES, CHECKER_ISSUE_SEVERITIES, CHECKER_RECORD_IDS, CHECKER_RECORD_STATUSES, WORKFLOW_OPERATORS, WORKFLOW_PHASE_STATUSES } from "./types"

const packageVersion = "0.1.0"

type PluginConfigInput = Parameters<NonNullable<Awaited<ReturnType<Plugin>>["config"]>>[0]

export const VibePaperPlugin: Plugin = async ({ directory, worktree, client }) => {
  await client?.app?.log?.({
    body: { service: "vibepaper", level: "info", message: "VibePaper OpenCode plugin initialized" },
  }).catch(() => undefined)

  let managedAgentFingerprints = new Map<string, string>()

  return {
    async config(input: PluginConfigInput) {
      const retainedAgents: Record<string, OpenCodeAgentConfig> = {}
      for (const [agentName, agentConfig] of Object.entries(input.agent ?? {})) {
        if (agentConfig === undefined) continue
        const previousManagedFingerprint = managedAgentFingerprints.get(agentName)
        if (previousManagedFingerprint !== undefined && agentConfigFingerprint(agentConfig) === previousManagedFingerprint) continue
        retainedAgents[agentName] = agentConfig as OpenCodeAgentConfig
      }

      const result = buildVibePaperAgentConfig({ root: directory, existingAgents: retainedAgents })
      setLatestVibePaperAgentRuntimeState(result.runtime, directory)
      managedAgentFingerprints = new Map(Object.entries(result.injectedAgents).map(([agentName, agentConfig]) => [agentName, agentConfigFingerprint(agentConfig)]))
      input.agent = { ...retainedAgents, ...result.injectedAgents } as PluginConfigInput["agent"]
    },
    tool: {
      vibepaper_dashboard: tool({
        description: "Show VibePaper project readiness and init preview. Read-only, does not modify files.",
        args: {},
        async execute(_args, context) {
          const result = await buildDashboardResult({ cwd: context.directory, worktree: context.worktree, packageVersion })
          return renderDashboardOutput(result)
        },
      }),
      vibepaper_init_apply: tool({
        description: "Apply VibePaper project initialization after explicit user confirmation. Writes core files only and refuses conflicts.",
        args: {
          name: tool.schema.string().describe("Project name"),
          domain: tool.schema.string().describe("Research domain"),
        },
        async execute(args, context) {
          const result = await applyProjectInit({ cwd: context.directory, worktree: context.worktree, name: args.name, domain: args.domain })
          return renderProjectInitApplyOutput(result)
        },
      }),
      vibepaper_artifact_status: tool({
        description: "Show read-only VibePaper artifact readiness, evidence, and recommendation. Does not modify files or workflow state.",
        args: {},
        async execute(_args, context) {
          const result = await buildArtifactStatus({ cwd: context.directory, worktree: context.worktree })
          return renderArtifactStatusOutput(result)
        },
      }),
      vibepaper_paper_structure_status: tool({
        description: "Show read-only paper.md structure completion, Level 5 writing targets, next target, and structural issues. Does not modify files.",
        args: {},
        async execute(_args, context) {
          const result = await buildPaperStructureStatus({ cwd: context.directory, worktree: context.worktree })
          return renderPaperStructureStatusOutput(result)
        },
      }),
      vibepaper_storyline_structure_status: tool({
        description: "Show read-only storyline.md section readiness, next storyline target, and TODO coverage. Does not modify files.",
        args: {},
        async execute(_args, context) {
          const result = await buildStorylineStructureStatus({ cwd: context.directory, worktree: context.worktree })
          return renderStorylineStructureStatusOutput(result)
        },
      }),
      vibepaper_pdf_extract: tool({
        description: "Extract text from a user-specified PDF inside the project. Read-only; does not scan for files or modify project state.",
        args: {
          path: tool.schema.string().describe("Explicit relative or in-project absolute path to the PDF file"),
          maxBytes: tool.schema.number().int().min(1).optional().describe("Optional maximum PDF size in bytes"),
        },
        async execute(args, context) {
          const result = await buildPdfExtract({ cwd: context.directory, worktree: context.worktree, path: args.path, maxBytes: args.maxBytes })
          return renderPdfExtractOutput(result)
        },
      }),
      vibepaper_ppt_extract: tool({
        description: "Extract slide text from a user-specified PPTX inside the project. Read-only; does not scan for files or modify project state.",
        args: {
          path: tool.schema.string().describe("Explicit relative or in-project absolute path to the PPTX file"),
          includeNotes: tool.schema.boolean().optional().describe("Whether to include speaker notes when notes XML is present"),
          maxBytes: tool.schema.number().int().min(1).optional().describe("Optional maximum PPTX size in bytes"),
        },
        async execute(args, context) {
          const result = await buildPptExtract({ cwd: context.directory, worktree: context.worktree, path: args.path, includeNotes: args.includeNotes, maxBytes: args.maxBytes })
          return renderPptExtractOutput(result)
        },
      }),
      vibepaper_checker_status: tool({
        description: "Show read-only checker result status, severity counts, stale signals, and precheck report evidence. Does not run checkers or modify files.",
        args: {},
        async execute(_args, context) {
          const result = await buildCheckerStatus({ cwd: context.directory, worktree: context.worktree })
          return renderCheckerStatusOutput(result)
        },
      }),
      vibepaper_relatedwork_status: tool({
        description: "Show read-only related-work catalog, BibTeX, PDF, summary, and cross-index status. Does not run search, import, download, summarize, build-index, or modify files.",
        args: {},
        async execute(_args, context) {
          const result = await buildRelatedworkStatus({ cwd: context.directory, worktree: context.worktree })
          return renderRelatedworkStatusOutput(result)
        },
      }),
      vibepaper_relatedwork_keywords: tool({
        description: "Extract relatedwork keywords from storyline.md (or paper.md fallback) via the Python CLI. Read-only; does not write files.",
        args: {
          source: tool.schema.string().optional().describe("Optional source markdown path (defaults to storyline.md)"),
          count: tool.schema.number().int().min(1).max(30).optional().describe("Number of keywords to return (1-30)"),
        },
        async execute(args, context) {
          const result = await runRelatedworkKeywords({ cwd: context.directory, worktree: context.worktree, source: args.source, count: args.count })
          return renderRelatedworkToolOutput(result)
        },
      }),
      vibepaper_relatedwork_search: tool({
        description: "Search related work via Semantic Scholar / arXiv. Writes relatedwork/search_cache.json. Requires explicit user confirmation before invoking.",
        args: {
          queries: tool.schema.array(tool.schema.string()).min(1).describe("List of search query strings"),
          queriesFile: tool.schema.string().optional().describe("Optional path to a file containing one query per line"),
          limit: tool.schema.number().int().min(1).optional().describe("Optional per-query result limit"),
        },
        async execute(args, context) {
          const result = await runRelatedworkSearch({ cwd: context.directory, worktree: context.worktree, queries: args.queries, queriesFile: args.queriesFile, limit: args.limit })
          return renderRelatedworkToolOutput(result)
        },
      }),
      vibepaper_relatedwork_import: tool({
        description: "Import relatedwork/search_cache.json into relatedwork/literature.json. Writes the literature catalog. Requires explicit user confirmation.",
        args: {
          input: tool.schema.string().optional().describe("Optional input cache path (defaults to relatedwork/search_cache.json)"),
        },
        async execute(args, context) {
          const result = await runRelatedworkImport({ cwd: context.directory, worktree: context.worktree, input: args.input })
          return renderRelatedworkToolOutput(result)
        },
      }),
      vibepaper_relatedwork_sync_bib: tool({
        description: "Synchronize relatedwork/paper_list.bib with the literature catalog. Writes the bibliography. Requires explicit user confirmation.",
        args: {},
        async execute(_args, context) {
          const result = await runRelatedworkSyncBib({ cwd: context.directory, worktree: context.worktree })
          return renderRelatedworkToolOutput(result)
        },
      }),
      vibepaper_relatedwork_download: tool({
        description: "Download related-work PDFs into relatedwork/pdfs/. Writes files. Requires explicit user confirmation.",
        args: {
          paperId: tool.schema.string().optional().describe("Optional paper id to download (defaults to all queued papers)"),
          all: tool.schema.boolean().optional().describe("Force re-download for all known papers"),
        },
        async execute(args, context) {
          const result = await runRelatedworkDownload({ cwd: context.directory, worktree: context.worktree, paperId: args.paperId, all: args.all })
          return renderRelatedworkToolOutput(result)
        },
      }),
      vibepaper_relatedwork_summarize: tool({
        description: "Generate LLM-backed PDF summaries into relatedwork/papers/. Writes markdown summary files. Requires explicit user confirmation.",
        args: {
          paperId: tool.schema.string().optional().describe("Optional paper id to summarize (defaults to all eligible papers)"),
          storyline: tool.schema.string().optional().describe("Optional storyline markdown path (defaults to storyline.md)"),
          template: tool.schema.string().optional().describe("Optional summary template markdown path"),
        },
        async execute(args, context) {
          const result = await runRelatedworkSummarize({ cwd: context.directory, worktree: context.worktree, paperId: args.paperId, storyline: args.storyline, template: args.template })
          return renderRelatedworkToolOutput(result)
        },
      }),
      vibepaper_relatedwork_register_summary: tool({
        description: "Register an existing PDF summary in relatedwork/literature.json. Writes the literature catalog. Requires explicit user confirmation.",
        args: {
          paperId: tool.schema.string().describe("Paper id whose summary path should be registered"),
          path: tool.schema.string().describe("Relative path to the markdown summary file under relatedwork/papers/"),
        },
        async execute(args, context) {
          const result = await runRelatedworkRegisterSummary({ cwd: context.directory, worktree: context.worktree, paperId: args.paperId, path: args.path })
          return renderRelatedworkToolOutput(result)
        },
      }),
      vibepaper_relatedwork_build_index: tool({
        description: "Build the cross-paper index at .agents/cross_index.json from relatedwork/papers/. Writes the index. Requires explicit user confirmation.",
        args: {},
        async execute(_args, context) {
          const result = await runRelatedworkBuildIndex({ cwd: context.directory, worktree: context.worktree })
          return renderRelatedworkToolOutput(result)
        },
      }),
      vibepaper_relatedwork_clean: tool({
        description: "Clean stale related-work entries (orphan PDFs/summaries, dropped catalog entries). Writes files. Requires explicit user confirmation.",
        args: {
          dryRun: tool.schema.boolean().optional().describe("Preview cleanup without applying changes"),
        },
        async execute(args, context) {
          const result = await runRelatedworkClean({ cwd: context.directory, worktree: context.worktree, dryRun: args.dryRun })
          return renderRelatedworkToolOutput(result)
        },
      }),
      vibepaper_checker_record: tool({
        description: "Record a checker run summary after explicit user confirmation. Writes state.checkers and appends an event; does not resolve individual issues.",
        args: {
          checker: tool.schema.enum(CHECKER_RECORD_IDS).describe("Checker id to record"),
          status: tool.schema.enum(CHECKER_RECORD_STATUSES).describe("Checker run status"),
          critical: tool.schema.number().int().min(0).describe("Number of Critical issues"),
          major: tool.schema.number().int().min(0).describe("Number of Major issues"),
          minor: tool.schema.number().int().min(0).describe("Number of Minor issues"),
          summary: tool.schema.string().describe("Short human-readable checker summary"),
          evidence: tool.schema.array(tool.schema.string()).min(1).describe("Evidence supporting this checker record"),
          reason: tool.schema.string().describe("Human-readable reason for recording this checker result"),
          issues: tool.schema.array(tool.schema.object({
            severity: tool.schema.enum(CHECKER_ISSUE_SEVERITIES),
            message: tool.schema.string(),
            location: tool.schema.string().optional(),
            suggestion: tool.schema.string().optional(),
            id: tool.schema.string().optional(),
          })).optional().describe("Optional normalized issue list; this does not mark issues resolved"),
        },
        async execute(args, context) {
          const result = await recordCheckerResult({ cwd: context.directory, worktree: context.worktree, agent: context.agent, checker: args.checker, status: args.status, critical: args.critical, major: args.major, minor: args.minor, summary: args.summary, evidence: args.evidence, reason: args.reason, issues: args.issues })
          return renderCheckerRecordOutput(result)
        },
      }),
      vibepaper_artifact_record: tool({
        description: "Record VibePaper artifact readiness after explicit user confirmation. Writes artifact state and appends an event record; does not modify workflow phases.",
        args: {
          artifact: tool.schema.enum(ARTIFACT_RECORD_IDS).describe("Artifact id to record"),
          status: tool.schema.enum(ARTIFACT_STATUSES).describe("Recorded artifact readiness status"),
          confidence: tool.schema.enum(ARTIFACT_CONFIDENCE).describe("Confidence for the recorded status"),
          evidence: tool.schema.array(tool.schema.string()).min(1).describe("Evidence supporting the recorded status"),
          reason: tool.schema.string().describe("Human-readable reason for the record"),
          contentHash: tool.schema.string().optional().describe("Optional precomputed content hash"),
        },
        async execute(args, context) {
          const result = await recordArtifactReadiness({ cwd: context.directory, worktree: context.worktree, agent: context.agent, artifact: args.artifact, status: args.status, confidence: args.confidence, evidence: args.evidence, reason: args.reason, contentHash: args.contentHash })
          return renderArtifactRecordOutput(result)
        },
      }),
      vibepaper_workflow_status: tool({
        description: "Show VibePaper workflow progress, phases, and next step recommendation. Read-only, does not modify files.",
        args: {},
        async execute(_args, context) {
          const result = await buildWorkflowStatus({ cwd: context.directory, worktree: context.worktree })
          return renderWorkflowStatusOutput(result)
        },
      }),
      vibepaper_workflow_log: tool({
        description: "Show recent VibePaper workflow event records with optional filters. Read-only, does not modify files.",
        args: {
          lastN: tool.schema.number().int().min(1).max(50).optional().describe("Maximum number of recent records to return, from 1 to 50"),
          phase: tool.schema.string().optional().describe("Optional workflow phase id filter"),
          operator: tool.schema.enum(WORKFLOW_OPERATORS).optional().describe("Optional event operator filter"),
        },
        async execute(args, context) {
          const result = await queryWorkflowLog({ cwd: context.directory, worktree: context.worktree, lastN: args.lastN, phase: args.phase, operator: args.operator })
          return renderWorkflowLogOutput(result)
        },
      }),
      vibepaper_workflow_set_phase: tool({
        description: "Set a VibePaper workflow phase status after explicit user confirmation. Writes workflow state and appends an event record.",
        args: {
          phase: tool.schema.string().describe("Workflow phase id to update"),
          status: tool.schema.enum(WORKFLOW_PHASE_STATUSES).describe("Next workflow phase status"),
          reason: tool.schema.string().optional().describe("Reason for the change; required by the workflow engine when status is skipped"),
        },
        async execute(args, context) {
          const result = await setWorkflowPhase({ cwd: context.directory, worktree: context.worktree, phase: args.phase, status: args.status, reason: args.reason })
          return renderWorkflowSetPhaseOutput(result)
        },
      }),
    },
  }
}

function agentConfigFingerprint(agentConfig: unknown): string {
  return JSON.stringify(toStableJsonValue(agentConfig))
}

function toStableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toStableJsonValue)
  if (!isPlainObject(value)) return value

  const stableObject: Record<string, unknown> = {}
  for (const key of Object.keys(value).sort()) {
    stableObject[key] = toStableJsonValue(value[key])
  }
  return stableObject
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export default VibePaperPlugin
