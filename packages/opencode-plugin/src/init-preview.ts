import type { InitPreviewAction, InitPreviewItem, InitPreviewReason, InitPreviewResult, ReadinessItem, ReadinessResult } from "./types"

const PREVIEW_PATHS = ["paper.md", "storyline.md", "writingrules.md", ".agents/state.json", ".agents/events.jsonl", "AGENTS.md", "relatedwork/"] as const

export function buildInitPreview(readiness: ReadinessResult): InitPreviewResult {
  const items = PREVIEW_PATHS.map((path) => itemFromReadiness(path, readiness.items.find((item) => item.path === path)))
  return { readonly: true, blocked: items.some((item) => !item.safe), items }
}

function itemFromReadiness(path: string, item: ReadinessItem | undefined): InitPreviewItem {
  if (!item) return previewItem(path, "conflict", "unsafe-target", false)
  if (item.path === "relatedwork/" && (item.status === "missing" || item.status === "optional")) return previewItem(path, "optional", "future-optional", true)
  if (item.path === "AGENTS.md" && item.status === "optional") return previewItem(path, "create", "missing-guidance", true)
  if (item.status === "missing") return previewItem(path, "create", item.required ? "missing-required" : "missing-guidance", true)
  if (item.status === "ready" || item.status === "exists-managed") return previewItem(path, "exists-managed", "already-managed", true)
  if (item.status === "exists-user") return previewItem(path, "exists-user", "user-owned", true)
  if (item.status === "optional") return previewItem(path, "optional", "future-optional", true)
  return previewItem(path, "conflict", "unsafe-target", false)
}

function previewItem(path: string, action: InitPreviewAction, reason: InitPreviewReason, safe: boolean): InitPreviewItem {
  return { path, action, reason, safe }
}
