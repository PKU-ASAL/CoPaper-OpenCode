import { renderContextSummary, renderInitDashboard } from "../core/dashboard.js"
import { enforceToolPolicy } from "../core/policy.js"
import { initProject, type InitProjectArgs } from "../core/scaffold.js"
import { readState } from "../core/state.js"
import { type PluginContextLike, type PluginOptions, resolveToolRoot } from "./context.js"

function parseInitArguments(raw: string): InitProjectArgs {
  const args: InitProjectArgs = {}
  const tokens = raw.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((token) => token.replace(/^"|"$/g, "")) || []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const next = tokens[index + 1]
    if (token === "--name" && next) {
      args.name = next
      index += 1
    } else if (token === "--domain" && next) {
      args.domain = next
      index += 1
    } else if (token === "--language" && (next === "en" || next === "zh")) {
      args.language = next
      index += 1
    } else if (token === "--force") {
      args.force = true
    }
  }
  return args
}

export function registerVibePaperHooks(ctx: PluginContextLike, options?: PluginOptions) {
  return {
    "tool.execute.before": async (input: { tool: string }, output: { args: Record<string, unknown> }) => {
      const root = resolveToolRoot(ctx, options)
      await enforceToolPolicy(root, input.tool, output.args)
    },

    "command.execute.before": async (input: { command: string; arguments: string }, output: { parts: Array<Record<string, unknown>> }) => {
      const command = input.command.replace(/^\//, "").toLowerCase()
      if (command !== "vibeinit") return
      const root = resolveToolRoot(ctx, options)
      const dashboard = renderInitDashboard(await initProject(root, parseInitArguments(input.arguments)))
      output.parts.push({ type: "text", text: dashboard })
    },

    "experimental.chat.system.transform": async (_input: unknown, output: { system: string[] }) => {
      try {
        const state = await readState(resolveToolRoot(ctx, options))
        output.system.push(renderContextSummary(state))
      } catch {
        return
      }
    },
  }
}
