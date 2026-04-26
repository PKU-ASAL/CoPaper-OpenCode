import { renderContextSummary } from "../core/dashboard.js"
import { enforceToolPolicy } from "../core/policy.js"
import { readState } from "../core/state.js"
import { type PluginContextLike, type PluginOptions, resolveToolRoot } from "./context.js"

export function registerVibePaperHooks(ctx: PluginContextLike, options?: PluginOptions) {
  return {
    "tool.execute.before": async (input: { tool: string }, output: { args: Record<string, unknown> }) => {
      const root = resolveToolRoot(ctx, options)
      await enforceToolPolicy(root, input.tool, output.args)
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
