import { existsSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import type { ReadinessItem, ReadinessItemStatus, ReadinessResult, ReadinessSummary } from "./types"

interface RequiredFileSpec {
  id: string
  path: string
  message: string
}

const REQUIRED_FILES: RequiredFileSpec[] = [
  { id: "paper", path: "paper.md", message: "Paper draft is ready." },
  { id: "storyline", path: "storyline.md", message: "Storyline is ready." },
  { id: "writing-rules", path: "writingrules.md", message: "Writing rules are ready." },
  { id: "events", path: ".agents/events.jsonl", message: "Event log is ready." },
]

function makeItem(id: string, path: string, status: ReadinessItemStatus, required: boolean, message: string): ReadinessItem {
  return { id, path, status, required, message }
}

function inspectRequiredFile(root: string, spec: RequiredFileSpec): ReadinessItem {
  const fullPath = join(root, spec.path)
  if (!existsSync(fullPath)) return makeItem(spec.id, spec.path, "missing", true, `${spec.path} is missing.`)

  try {
    if (!statSync(fullPath).isFile()) return makeItem(spec.id, spec.path, "conflict", true, `${spec.path} must be a file.`)
    readFileSync(fullPath)
  } catch {
    return makeItem(spec.id, spec.path, "conflict", true, `${spec.path} cannot be inspected.`)
  }

  return makeItem(spec.id, spec.path, "ready", true, spec.message)
}

function inspectStateFile(root: string): ReadinessItem {
  const path = ".agents/state.json"
  const fullPath = join(root, path)
  if (!existsSync(fullPath)) return makeItem("state", path, "missing", true, `${path} is missing.`)

  try {
    if (!statSync(fullPath).isFile()) return makeItem("state", path, "conflict", true, `${path} must be a file.`)
  } catch {
    return makeItem("state", path, "conflict", true, `${path} cannot be inspected.`)
  }

  try {
    const value = JSON.parse(readFileSync(fullPath, "utf8"))
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return makeItem("state", path, "invalid", true, `${path} must contain a JSON object.`)
    }
  } catch {
    return makeItem("state", path, "invalid", true, `${path} must contain valid JSON.`)
  }

  return makeItem("state", path, "ready", true, "State file is ready.")
}

function inspectAgentsFile(root: string): ReadinessItem {
  const path = "AGENTS.md"
  const fullPath = join(root, path)
  if (!existsSync(fullPath)) return makeItem("agents", path, "optional", false, `${path} is optional.`)

  try {
    if (!statSync(fullPath).isFile()) return makeItem("agents", path, "conflict", false, `${path} should be reviewed.`)
    const content = readFileSync(fullPath, "utf8")
    if (content.includes("CoPaper")) return makeItem("agents", path, "exists-managed", false, `${path} is managed by CoPaper.`)
  } catch {
    return makeItem("agents", path, "conflict", false, `${path} cannot be inspected.`)
  }

  return makeItem("agents", path, "exists-user", false, `${path} contains user instructions.`)
}

function inspectRelatedWork(root: string): ReadinessItem {
  const path = "relatedwork/"
  const fullPath = join(root, path)
  if (!existsSync(fullPath)) return makeItem("relatedwork", path, "optional", false, `${path} is optional.`)

  try {
    if (statSync(fullPath).isDirectory()) return makeItem("relatedwork", path, "exists-managed", false, `${path} is present.`)
  } catch {
    return makeItem("relatedwork", path, "conflict", false, `${path} cannot be inspected.`)
  }

  return makeItem("relatedwork", path, "conflict", false, `${path} must be a directory.`)
}

function summarize(items: ReadinessItem[]): ReadinessSummary {
  const summary: ReadinessSummary = { ready: 0, missing: 0, conflict: 0, invalid: 0, optional: 0 }

  for (const item of items) {
    if (item.status === "ready" || item.status === "exists-managed" || item.status === "exists-user") summary.ready += 1
    else if (item.status === "missing") summary.missing += 1
    else if (item.status === "conflict") summary.conflict += 1
    else if (item.status === "invalid") summary.invalid += 1
    else summary.optional += 1
  }

  return summary
}

export function inspectReadiness(root: string): ReadinessResult {
  const items = [
    ...REQUIRED_FILES.map((spec) => inspectRequiredFile(root, spec)),
    inspectStateFile(root),
    inspectAgentsFile(root),
    inspectRelatedWork(root),
  ]
  const requiredItems = items.filter((item) => item.required)
  const hasBlockedItem = requiredItems.some((item) => item.status === "conflict" || item.status === "invalid")
  const hasMissingItem = requiredItems.some((item) => item.status === "missing")
  const status = hasBlockedItem ? "blocked" : hasMissingItem ? "needs-init" : "ready"

  return {
    ok: status === "ready",
    status,
    root,
    items,
    summary: summarize(items),
  }
}
