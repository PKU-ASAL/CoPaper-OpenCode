import { existsSync, realpathSync, readFileSync } from "node:fs"
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

  const jsonRoot = findUpward(cwd, (current) => existsSync(join(current, "opencode.json")))
  if (jsonRoot) return { root: jsonRoot, reason: "found opencode.json" }

  const jsoncRoot = findUpward(cwd, (current) => existsSync(join(current, "opencode.jsonc")))
  if (jsoncRoot) return { root: jsoncRoot, reason: "found opencode.jsonc" }

  const markerRoot = findUpward(cwd, hasVibeCommandMarker)
  if (markerRoot) return { root: markerRoot, reason: "found VibePaper command marker" }

  if (options.worktree && existsSync(options.worktree)) {
    return { root: realpathSync(resolve(options.worktree)), reason: "OpenCode worktree fallback" }
  }

  const gitRoot = findGitRoot(cwd)
  if (gitRoot) return { root: gitRoot, reason: "git worktree fallback" }

  return { root: cwd, reason: "directory fallback" }
}

function findUpward(start: string, matches: (current: string) => boolean): string | null {
  let current = start
  while (true) {
    if (matches(current)) return current
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
}

function hasVibeCommandMarker(current: string): boolean {
  const vibeCommand = join(current, ".opencode", "commands", "vibe.md")
  if (!existsSync(vibeCommand)) return false
  const content = readFileSync(vibeCommand, "utf8")
  return hasManagedMarker(content, "vibe")
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
