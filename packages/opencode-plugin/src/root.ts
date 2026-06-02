import { existsSync, realpathSync, readFileSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import type { RootDetection } from "./types"
import { hasManagedMarker } from "./templates"

export interface RootDetectionOptions {
  cwd: string
  explicitRoot?: string
  worktree?: string
}

export async function detectRoot(options: RootDetectionOptions): Promise<RootDetection> {
  if (options.explicitRoot) {
    return { root: realpathSync(resolve(options.explicitRoot)), reason: "explicit --root" }
  }

  const cwd = realpathSync(resolve(options.cwd))

  const opencodeRoot = findOpenCodeRoot(cwd)
  if (opencodeRoot) return opencodeRoot

  if (options.worktree && existsSync(options.worktree)) {
    return { root: realpathSync(resolve(options.worktree)), reason: "OpenCode worktree fallback" }
  }

  const gitRoot = findGitRoot(cwd)
  if (gitRoot) return { root: gitRoot, reason: "git worktree fallback" }

  return { root: cwd, reason: "directory fallback" }
}

function findOpenCodeRoot(start: string): RootDetection | null {
  let current = start
  while (true) {
    if (existsSync(join(current, "opencode.json"))) return { root: current, reason: "found opencode.json" }
    if (existsSync(join(current, "opencode.jsonc"))) return { root: current, reason: "found opencode.jsonc" }
    if (hasCoPaperCommandMarker(current)) return { root: current, reason: "found CoPaper command marker" }
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
}

function hasCoPaperCommandMarker(current: string): boolean {
  const copaperCommand = join(current, ".opencode", "commands", "copaper.md")
  try {
    if (!statSync(copaperCommand).isFile()) return false
    const content = readFileSync(copaperCommand, "utf8")
    return hasManagedMarker(content, "copaper")
  } catch {
    return false
  }
}

function findGitRoot(start: string): string | null {
  let current = start
  while (true) {
    if (existsSync(join(current, ".git"))) return current
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
}
