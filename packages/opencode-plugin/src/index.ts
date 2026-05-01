import { tool, type Plugin } from "@opencode-ai/plugin"
import { buildDashboardResult, renderDashboardOutput } from "./dashboard"

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
    },
  }
}

export default VibePaperPlugin
