import { PHASES, type VibePaperState } from "./schema.js"

export function summarizeState(state: VibePaperState): string {
  const lines = [
    `Project: ${state.project?.name || "unknown"} (${state.project?.domain || "unknown"})`,
    `Current phase: ${state.workflow.current_phase}`,
    "Phases:",
  ]
  for (const phase of PHASES) lines.push(`- ${phase}: ${state.workflow.phases[phase]?.status || "unknown"}`)
  return lines.join("\n")
}

export function renderContextSummary(state: VibePaperState): string {
  return [
    "VibePaper project active.",
    "",
    "Progress",
    `- Current phase: ${state.workflow.current_phase}`,
    "",
    "Rules",
    "- Use VibePaper plugin tools for state changes.",
    "- Do not directly edit .vibepaper/state.json or .vibepaper/events.jsonl.",
  ].join("\n")
}
