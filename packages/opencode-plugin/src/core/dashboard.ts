import { PHASES, type VibePaperState } from "./schema.js"
import { type InitProjectResult } from "./scaffold.js"

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

function listOrNone(items: string[]): string[] {
  return items.length > 0 ? items.map((item) => `- ${item}`) : ["- none"]
}

export function renderInitDashboard(result: InitProjectResult): string {
  const state = result.state
  const title = result.alreadyInitialized ? "VibePaper Already Initialized" : "VibePaper Initialized"
  return [
    title,
    "",
    "Project",
    `- Name: ${state.project?.name || "Untitled Paper"}`,
    `- Domain: ${state.project?.domain || "unspecified"}`,
    `- Language: ${state.project?.language || "en"}`,
    `- Current phase: ${state.workflow.current_phase}`,
    "",
    result.alreadyInitialized ? "Existing Runtime" : "Created",
    ...listOrNone(result.alreadyInitialized ? result.skipped : result.created),
    "",
    "Skipped Existing Files",
    ...listOrNone(result.alreadyInitialized ? [] : result.skipped),
    "",
    "Overwritten",
    ...listOrNone(result.overwritten),
    "",
    "Next",
    "- Run /vibestatus to inspect the project.",
    "- Run /vibenext to start the storyline workflow.",
  ].join("\n")
}
