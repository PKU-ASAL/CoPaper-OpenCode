import { appendFile, mkdir } from "node:fs/promises"
import path from "node:path"

import { eventsFile } from "./paths.js"
import { type VibePaperEvent } from "./schema.js"
import { tryReadState } from "./state.js"

export async function appendEvent(root: string, action: string, result: string, metadata: Record<string, unknown>): Promise<void> {
  const state = await tryReadState(root)
  if (!state) return
  const target = eventsFile(root)
  await mkdir(path.dirname(target), { recursive: true })
  const event: VibePaperEvent = {
    timestamp: new Date().toISOString(),
    operator: "opencode-plugin",
    phase: state.workflow.current_phase,
    action,
    result,
    metadata,
  }
  await appendFile(target, `${JSON.stringify(event)}\n`, "utf-8")
}
