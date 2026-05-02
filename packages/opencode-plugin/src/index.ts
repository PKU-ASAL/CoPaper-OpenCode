import { tool, type Plugin } from "@opencode-ai/plugin"
import { buildArtifactStatus, renderArtifactStatusOutput } from "./artifacts"
import { buildDashboardResult, renderDashboardOutput } from "./dashboard"
import { applyProjectInit, renderProjectInitApplyOutput } from "./project-init"
import { buildWorkflowStatus, queryWorkflowLog, renderWorkflowLogOutput, renderWorkflowSetPhaseOutput, renderWorkflowStatusOutput, setWorkflowPhase } from "./workflow"
import { WORKFLOW_OPERATORS, WORKFLOW_PHASE_STATUSES } from "./types"

const packageVersion = "0.1.0"

export const VibePaperPlugin: Plugin = async ({ directory, worktree, client }) => {
  await client?.app?.log?.({
    body: { service: "vibepaper", level: "info", message: "VibePaper OpenCode plugin initialized" },
  }).catch(() => undefined)

  return {
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

export default VibePaperPlugin
