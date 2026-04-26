import { type Plugin } from "@opencode-ai/plugin"

import { registerVibePaperHooks } from "./opencode/hooks.js"
import { registerVibePaperTools } from "./opencode/tools.js"
import { type PluginOptions } from "./opencode/context.js"

export const VibePaperPlugin: Plugin = async (ctx, options?: PluginOptions) => ({
  tool: registerVibePaperTools(ctx, options),
  ...registerVibePaperHooks(ctx, options),
})

export const server = VibePaperPlugin
export default VibePaperPlugin
