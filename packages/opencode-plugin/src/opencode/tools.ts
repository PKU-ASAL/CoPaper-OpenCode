import { tool } from "@opencode-ai/plugin"

import { summarizeState } from "../core/dashboard.js"
import { appendEvent } from "../core/eventlog.js"
import { PHASES, STATUSES } from "../core/schema.js"
import { readState, setPhaseStatus, writeState } from "../core/state.js"
import { type PluginContextLike, type PluginOptions, type ToolContextLike, resolveToolRoot, unwrap } from "./context.js"

export function registerVibePaperTools(ctx: PluginContextLike, options?: PluginOptions) {
  return {
    vibepaper_status: tool({
      description: "Read the VibePaper project state and summarize the current progress.",
      args: {
        root: tool.schema.string().optional().describe("Project root, relative to the OpenCode worktree."),
      },
      async execute(args, context: ToolContextLike) {
        const root = resolveToolRoot(ctx, options, context, args.root)
        const state = await readState(root)
        return summarizeState(state)
      },
    }),

    vibepaper_set_phase: tool({
      description: "Update VibePaper progress through the plugin state manager and append an event log entry.",
      args: {
        phase: tool.schema.enum(PHASES).describe("Phase to update."),
        status: tool.schema.enum(STATUSES).describe("New phase status."),
        reason: tool.schema.string().optional().describe("Reason for skip or manual transition."),
        root: tool.schema.string().optional().describe("Project root, relative to the OpenCode worktree."),
      },
      async execute(args, context: ToolContextLike) {
        const root = resolveToolRoot(ctx, options, context, args.root)
        const state = await readState(root)
        const next = setPhaseStatus(state, args.phase, args.status, args.reason)
        await writeState(root, next)
        await appendEvent(root, "set_phase_status", "success", { phase: args.phase, status: args.status, reason: args.reason || "" })
        return summarizeState(next)
      },
    }),

    vibepaper_spawn_agent: tool({
      description: "Create an OpenCode child session and route a VibePaper task prompt to a named agent.",
      args: {
        agent: tool.schema.string().describe("OpenCode agent name, such as explore or vibepaper-reviewer."),
        prompt: tool.schema.string().describe("Task prompt to send to the child session."),
        title: tool.schema.string().optional().describe("Child session title."),
        parentSessionID: tool.schema.string().optional().describe("Parent session ID. Defaults to the current session."),
      },
      async execute(args, context: ToolContextLike) {
        const parentID = args.parentSessionID || context.sessionID
        const root = resolveToolRoot(ctx, options, context)
        const client = ctx.client as {
          session: {
            create(input: unknown): Promise<unknown>
            prompt(input: unknown): Promise<unknown>
            promptAsync?: (input: unknown) => Promise<unknown>
          }
        }
        const created = unwrap<{ id: string }>(
          await client.session.create({
            body: {
              parentID,
              title: args.title || `VibePaper ${args.agent}`,
            },
          }),
        )
        const promptInput = {
          path: { id: created.id },
          body: {
            agent: args.agent,
            parts: [{ type: "text", text: args.prompt }],
          },
        }
        if (client.session.promptAsync) await client.session.promptAsync(promptInput)
        else await client.session.prompt(promptInput)
        await appendEvent(root, "spawn_agent", "success", { agent: args.agent, child_session: created.id, parent_session: parentID })
        return JSON.stringify({ task_id: created.id, parent_session: parentID, agent: args.agent })
      },
    }),
  }
}
