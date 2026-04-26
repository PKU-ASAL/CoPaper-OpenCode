import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { PHASES, type Phase, type PhaseStatus, type VibePaperState } from "./schema.js"
import { stateFile } from "./paths.js"

export async function readState(root: string): Promise<VibePaperState> {
  const raw = await readFile(stateFile(root), "utf-8")
  return JSON.parse(raw) as VibePaperState
}

export async function tryReadState(root: string): Promise<VibePaperState | null> {
  try {
    return await readState(root)
  } catch {
    return null
  }
}

export async function writeState(root: string, state: VibePaperState): Promise<void> {
  const target = stateFile(root)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, `${JSON.stringify(state, null, 2)}\n`, "utf-8")
}

export function recomputeCurrentPhase(state: VibePaperState): Phase {
  const inProgress = PHASES.find((phase) => state.workflow.phases[phase]?.status === "in_progress")
  if (inProgress) return inProgress
  return PHASES.find((phase) => !["complete", "skipped"].includes(String(state.workflow.phases[phase]?.status))) || "submission"
}

export function setPhaseStatus(state: VibePaperState, phase: Phase, status: PhaseStatus, reason?: string): VibePaperState {
  const next = structuredClone(state)
  const now = new Date().toISOString()
  const phaseData = next.workflow.phases[phase]
  phaseData.status = status
  phaseData.completed_at = status === "complete" ? now : null
  if (status === "in_progress" && !phaseData.started_at) phaseData.started_at = now
  if (status === "skipped") phaseData.skip_reason = reason || ""
  next.workflow.current_phase = recomputeCurrentPhase(next)
  next.last_updated_at = now
  return next
}
