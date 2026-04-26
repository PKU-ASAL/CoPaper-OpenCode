import path from "node:path"

export const VIBEPAPER_DIR = ".vibepaper"
export const STATE_FILE = `${VIBEPAPER_DIR}/state.json`
export const EVENTS_FILE = `${VIBEPAPER_DIR}/events.jsonl`
export const CONFIG_FILE = `${VIBEPAPER_DIR}/config.json`
export const MEMORY_FILE = `${VIBEPAPER_DIR}/memory.json`
export const TASKS_FILE = `${VIBEPAPER_DIR}/tasks.json`
export const ARTIFACTS_FILE = `${VIBEPAPER_DIR}/artifacts.json`

export function resolveRoot(base: string, configuredRoot?: string, requestedRoot?: string): string {
  const root = requestedRoot || configuredRoot || base
  return path.resolve(base, root)
}

export function projectFile(root: string, projectPath: string): string {
  return path.join(root, projectPath)
}

export function stateFile(root: string): string {
  return projectFile(root, STATE_FILE)
}

export function eventsFile(root: string): string {
  return projectFile(root, EVENTS_FILE)
}

export function normalizeProjectPath(root: string, filePath: string): string {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(root, filePath)
  return path.relative(root, absolute).replaceAll(path.sep, "/") || "."
}

export function isProjectRelativeEscape(projectPath: string): boolean {
  return projectPath === ".." || projectPath.startsWith("../") || path.isAbsolute(projectPath)
}
