import { EVENTS_FILE, STATE_FILE, isProjectRelativeEscape, normalizeProjectPath } from "./paths.js"

export type PolicyDecision = {
  decision: "allow" | "ask" | "warn" | "block"
  reason: string
  suggestion?: string
}

const WRITE_TOOLS = new Set(["edit", "write", "apply_patch"])
const PROTECTED_FILES = new Set([STATE_FILE, EVENTS_FILE])

function allow(reason = "Allowed by VibePaper policy."): PolicyDecision {
  return { decision: "allow", reason }
}

function block(reason: string, suggestion?: string): PolicyDecision {
  return { decision: "block", reason, suggestion }
}

export function extractPatchPaths(root: string, patchText: string): string[] {
  const paths: string[] = []
  const pattern = /^\*\*\* (?:Add File|Update File|Delete File|Move to):\s+(.+)$/gm
  for (const match of patchText.matchAll(pattern)) {
    paths.push(normalizeProjectPath(root, match[1].trim()))
  }
  return paths
}

export function extractWritePaths(root: string, toolName: string, args: Record<string, unknown>): string[] {
  if (toolName === "apply_patch") {
    const patchText = typeof args.patchText === "string" ? args.patchText : ""
    return extractPatchPaths(root, patchText)
  }

  const directPath = args.filePath || args.path
  if (typeof directPath === "string") return [normalizeProjectPath(root, directPath)]
  return []
}

export function evaluateWritePolicy(root: string, toolName: string, args: Record<string, unknown>): PolicyDecision {
  if (!WRITE_TOOLS.has(toolName)) return allow()
  const targetPaths = extractWritePaths(root, toolName, args)
  if (targetPaths.length === 0) return allow()

  const escaped = targetPaths.find(isProjectRelativeEscape)
  if (escaped) {
    return block("VibePaper policy blocked writes outside the project root.", "Choose a path inside this VibePaper project.")
  }

  const protectedTarget = targetPaths.find((projectPath) => PROTECTED_FILES.has(projectPath))
  if (protectedTarget) {
    return block(
      `VibePaper policy blocked direct edits to ${protectedTarget}; use VibePaper plugin tools instead.`,
      "Use vibepaper tools so state changes are validated and logged.",
    )
  }

  return allow()
}

export function evaluateBashPolicy(command: string): PolicyDecision {
  const normalized = command.toLowerCase().replaceAll("\\", "/")
  if (/git\s+reset\s+--hard/.test(normalized)) {
    return block("VibePaper policy blocked git reset --hard inside a VibePaper project.")
  }

  const mentionsProtectedFile = normalized.includes(STATE_FILE) || normalized.includes(EVENTS_FILE)
  const writesFile = /[>|]|set-content|out-file|remove-item|rm\s+|del\s+|rmdir\s+/.test(normalized)
  if (mentionsProtectedFile && writesFile) {
    return block("VibePaper policy blocked shell writes to protected .vibepaper runtime files.", "Use VibePaper plugin tools instead.")
  }

  if (/remove-item\s+.*\.vibepaper|rm\s+.*\.vibepaper|rmdir\s+.*\.vibepaper/.test(normalized)) {
    return block("VibePaper policy blocked deleting the .vibepaper runtime directory.")
  }

  return allow()
}

export function enforceDecision(decision: PolicyDecision): void {
  if (decision.decision !== "block") return
  throw new Error(decision.suggestion ? `${decision.reason} ${decision.suggestion}` : decision.reason)
}

export async function enforceToolPolicy(root: string, toolName: string, args: Record<string, unknown>): Promise<void> {
  if (toolName === "bash" && typeof args.command === "string") enforceDecision(evaluateBashPolicy(args.command))
  enforceDecision(evaluateWritePolicy(root, toolName, args))
}
