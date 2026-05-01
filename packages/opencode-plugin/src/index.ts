import { tool, type Plugin } from "@opencode-ai/plugin"
import { buildDashboardResult, renderDashboardOutput } from "./dashboard"
import { applyProjectInit, renderProjectInitApplyOutput } from "./project-init"

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
        async execute() {
          const result = await buildDashboardResult({ cwd: directory, worktree, packageVersion })
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
    },
  }
}

export default VibePaperPlugin
