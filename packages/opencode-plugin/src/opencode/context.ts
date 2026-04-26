import { resolveRoot } from "../core/paths.js"

export type PluginOptions = {
  mode?: "balanced" | "strict"
  root?: string
}

export type PluginContextLike = {
  directory: string
  worktree?: string
  client?: unknown
}

export type ToolContextLike = {
  directory?: string
  worktree?: string
  sessionID?: string
}

export function resolveToolRoot(ctx: PluginContextLike, options?: PluginOptions, toolContext?: ToolContextLike, requestedRoot?: string): string {
  const base = toolContext?.worktree || ctx.worktree || toolContext?.directory || ctx.directory
  return resolveRoot(base, options?.root, requestedRoot)
}

export function unwrap<T>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response) return (response as { data: T }).data
  return response as T
}
