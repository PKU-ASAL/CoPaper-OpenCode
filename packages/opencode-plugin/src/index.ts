import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { type Plugin, tool } from "@opencode-ai/plugin"

const PHASES = [
  "storyline",
  "literature",
  "discussion",
  "experiments",
  "writing",
  "latex_review",
] as const

const STATUSES = ["not_started", "in_progress", "complete", "skipped"] as const

type Phase = (typeof PHASES)[number]
type PhaseStatus = (typeof STATUSES)[number]

type VibePaperState = {
  project?: {
    name?: string
    domain?: string
  }
  phases: Record<string, Record<string, unknown> & { status?: PhaseStatus; completed_at?: string | null }>
  current_phase: Phase
  event_log_path?: string
}

type PluginOptions = {
  mode?: "balanced" | "strict"
  root?: string
}

function unwrap<T>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response) return (response as { data: T }).data
  return response as T
}

function resolveRoot(base: string, configuredRoot?: string, requestedRoot?: string): string {
  const root = requestedRoot || configuredRoot || base
  return path.resolve(base, root)
}

function normalizeProjectPath(root: string, filePath: string): string {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(root, filePath)
  return path.relative(root, absolute).replaceAll(path.sep, "/") || "."
}

function stateFile(root: string): string {
  return path.join(root, ".agents", "state.json")
}

async function readState(root: string): Promise<VibePaperState> {
  const raw = await readFile(stateFile(root), "utf-8")
  return JSON.parse(raw) as VibePaperState
}

async function tryReadState(root: string): Promise<VibePaperState | null> {
  try {
    return await readState(root)
  } catch {
    return null
  }
}

async function writeState(root: string, state: VibePaperState): Promise<void> {
  await writeFile(stateFile(root), `${JSON.stringify(state, null, 2)}\n`, "utf-8")
}

async function appendEvent(root: string, action: string, result: string, metadata: Record<string, unknown>): Promise<void> {
  const state = await tryReadState(root)
  if (!state) return
  const eventPath = path.resolve(root, state.event_log_path || ".agents/events.jsonl")
  await mkdir(path.dirname(eventPath), { recursive: true })
  const event = {
    timestamp: new Date().toISOString(),
    operator: "opencode-plugin",
    phase: state.current_phase,
    action,
    result,
    metadata,
  }
  await appendFile(eventPath, `${JSON.stringify(event)}\n`, "utf-8")
}

function recomputeCurrentPhase(state: VibePaperState): Phase {
  const inProgress = PHASES.find((phase) => state.phases[phase]?.status === "in_progress")
  if (inProgress) return inProgress
  return PHASES.find((phase) => !["complete", "skipped"].includes(String(state.phases[phase]?.status))) || "latex_review"
}

function extractPatchPaths(root: string, patchText: string): string[] {
  const paths: string[] = []
  const pattern = /^\*\*\* (?:Add File|Update File|Delete File|Move to):\s+(.+)$/gm
  for (const match of patchText.matchAll(pattern)) {
    paths.push(normalizeProjectPath(root, match[1].trim()))
  }
  return paths
}

function extractWritePaths(root: string, toolName: string, args: Record<string, unknown>): string[] {
  if (toolName === "apply_patch") {
    const patchText = typeof args.patchText === "string" ? args.patchText : ""
    return extractPatchPaths(root, patchText)
  }

  const directPath = args.filePath || args.path
  if (typeof directPath === "string") return [normalizeProjectPath(root, directPath)]
  return []
}

function pathIsStateFile(projectPath: string): boolean {
  return projectPath === ".agents/state.json"
}

function pathIsPaper(projectPath: string): boolean {
  return projectPath === "paper.md"
}

async function blockInvalidWrite(root: string, toolName: string, args: Record<string, unknown>): Promise<void> {
  if (!["edit", "write", "apply_patch"].includes(toolName)) return
  const targetPaths = extractWritePaths(root, toolName, args)
  if (targetPaths.length === 0) return
  const state = await tryReadState(root)
  if (!state) return

  const stateTarget = targetPaths.find(pathIsStateFile)
  if (stateTarget) {
    throw new Error("VibePaper policy blocked direct edits to .agents/state.json; use vibepaper_set_phase instead.")
  }

  const paperTarget = targetPaths.find(pathIsPaper)
  if (state.current_phase === "literature" && paperTarget) {
    throw new Error("VibePaper policy blocked paper.md edits during the literature phase.")
  }
}

function blockInvalidBash(command: string): void {
  const normalized = command.toLowerCase()
  if (normalized.includes(".agents/state.json") && /[>|]|set-content|out-file/.test(normalized)) {
    throw new Error("VibePaper policy blocked shell writes to .agents/state.json; use vibepaper_set_phase instead.")
  }
  if (/git\s+reset\s+--hard/.test(normalized)) {
    throw new Error("VibePaper policy blocked git reset --hard inside a VibePaper project.")
  }
}

function summarizeState(state: VibePaperState): string {
  const lines = [
    `Project: ${state.project?.name || "unknown"} (${state.project?.domain || "unknown"})`,
    `Current phase: ${state.current_phase}`,
    "Phases:",
  ]
  for (const phase of PHASES) lines.push(`- ${phase}: ${state.phases[phase]?.status || "unknown"}`)
  return lines.join("\n")
}

export const VibePaperPlugin: Plugin = async (ctx, options?: PluginOptions) => {
  const configuredRoot = options?.root

  return {
    tool: {
      vibepaper_status: tool({
        description: "Read the VibePaper project state and summarize the current phase.",
        args: {
          root: tool.schema.string().optional().describe("Project root, relative to the OpenCode worktree."),
        },
        async execute(args, context) {
          const root = resolveRoot(context.worktree || ctx.worktree || ctx.directory, configuredRoot, args.root)
          const state = await readState(root)
          return summarizeState(state)
        },
      }),

      vibepaper_set_phase: tool({
        description: "Update a VibePaper phase through the plugin harness and append an event log entry.",
        args: {
          phase: tool.schema.enum(PHASES).describe("Phase to update."),
          status: tool.schema.enum(STATUSES).describe("New phase status."),
          reason: tool.schema.string().optional().describe("Reason for skip or manual transition."),
          root: tool.schema.string().optional().describe("Project root, relative to the OpenCode worktree."),
        },
        async execute(args, context) {
          const root = resolveRoot(context.worktree || ctx.worktree || ctx.directory, configuredRoot, args.root)
          const state = await readState(root)
          const phaseData = state.phases[args.phase]
          phaseData.status = args.status
          phaseData.completed_at = args.status === "complete" ? new Date().toISOString() : null
          if (args.status === "skipped") {
            if ("skip_reason" in phaseData) phaseData.skip_reason = args.reason || ""
            else {
              const metadata = typeof phaseData.metadata === "object" && phaseData.metadata !== null ? (phaseData.metadata as Record<string, unknown>) : {}
              phaseData.metadata = { ...metadata, skip_reason: args.reason || "" }
            }
          }
          state.current_phase = recomputeCurrentPhase(state)
          await writeState(root, state)
          await appendEvent(root, "set_phase_status", "success", { phase: args.phase, status: args.status, reason: args.reason || "" })
          return summarizeState(state)
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
        async execute(args, context) {
          const parentID = args.parentSessionID || context.sessionID
          const root = resolveRoot(context.worktree || ctx.worktree || ctx.directory, configuredRoot)
          const client = ctx.client as unknown as {
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
          const promptAsync = client.session.promptAsync
          if (promptAsync) {
            await promptAsync({
              path: { id: created.id },
              body: {
                agent: args.agent,
                parts: [{ type: "text", text: args.prompt }],
              },
            })
          } else {
            await client.session.prompt({
              path: { id: created.id },
              body: {
                agent: args.agent,
                parts: [{ type: "text", text: args.prompt }],
              },
            })
          }
          await appendEvent(root, "spawn_agent", "success", { agent: args.agent, child_session: created.id, parent_session: parentID })
          return JSON.stringify({ task_id: created.id, parent_session: parentID, agent: args.agent })
        },
      }),
    },

    "tool.execute.before": async (input, output) => {
      const root = resolveRoot(ctx.worktree || ctx.directory, configuredRoot)
      const args = output.args as Record<string, unknown>
      if (input.tool === "bash" && typeof args.command === "string") blockInvalidBash(args.command)
      await blockInvalidWrite(root, input.tool, args)
    },

    "experimental.chat.system.transform": async (_input, output) => {
      try {
        const state = await readState(resolveRoot(ctx.worktree || ctx.directory, configuredRoot))
        output.system.push(`VibePaper project active. Current phase: ${state.current_phase}. Use vibepaper_status and vibepaper_set_phase for workflow state; do not edit .agents/state.json directly.`)
      } catch {
        return
      }
    },
  }
}

export const server = VibePaperPlugin
export default VibePaperPlugin
