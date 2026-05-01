import { join } from "node:path"
import { assertInsideRoot, writeFileAtomic } from "./fs-utils"
import { buildInitPreview, INIT_APPLY_PATHS } from "./init-preview"
import { t } from "./i18n"
import { buildProjectFiles } from "./project-templates"
import { inspectReadiness } from "./readiness"
import { detectRoot } from "./root"
import { DEFAULT_LOCALE, SCHEMA_VERSION, type InitPreviewItem, type ProjectFileTemplate, type ProjectInitApplyOptions, type ProjectInitApplyResult, type ProjectInitConflict, type ProjectInitError, type ReadinessResult } from "./types"

export async function applyProjectInit(options: ProjectInitApplyOptions): Promise<ProjectInitApplyResult> {
  const locale = options.locale ?? DEFAULT_LOCALE
  const name = options.name.trim()
  const domain = options.domain.trim()
  const validationErrors = validateProjectInput(name, domain)
  if (validationErrors.length > 0) {
    return makeResult({ locale, ok: false, root: null, errors: validationErrors })
  }

  let root: string
  try {
    root = (await detectRoot({ cwd: options.cwd ?? process.cwd(), explicitRoot: options.root, worktree: options.worktree })).root
  } catch (error) {
    return makeResult({
      locale,
      ok: false,
      root: null,
      errors: [{ code: "root-detection-failed", message: `Failed to detect project root: ${errorMessage(error)}` }],
    })
  }

  const readinessBefore = inspectReadiness(root)
  const conflicts = detectApplyConflicts(readinessBefore)
  if (conflicts.length > 0) {
    return makeResult({
      locale,
      ok: false,
      root,
      conflicts,
      errors: conflicts.map((conflict) => ({
        code: "conflict",
        path: conflict.path,
        message: `Refusing to overwrite ${conflict.path}: ${conflict.reason}`,
      })),
      readinessBefore,
    })
  }

  const files = buildProjectFiles({ name, domain, createdAt: (options.now ?? new Date()).toISOString() })
  const changedFiles: string[] = []
  try {
    for (const file of files) {
      writeProjectFile(root, file)
      changedFiles.push(file.path)
    }
  } catch (error) {
    return makeResult({
      locale,
      ok: false,
      root,
      changedFiles,
      errors: [{ code: "write-failed", message: `Failed to write project init files: ${errorMessage(error)}` }],
      readinessBefore,
      readinessAfter: safeInspectReadiness(root),
    })
  }

  return makeResult({
    locale,
    ok: true,
    root,
    changedFiles,
    readinessBefore,
    readinessAfter: inspectReadiness(root),
  })
}

export function renderProjectInitApplyOutput(result: ProjectInitApplyResult): string {
  const locale = result.locale
  const nextLine = result.ok ? t(locale, "apply.next") : result.conflicts.length > 0 ? t(locale, "apply.fixConflicts") : ""
  const lines = [
    `## ${t(locale, "apply.title")}`,
    "",
    result.ok ? t(locale, "apply.success") : t(locale, "apply.failed"),
    "",
    `### ${t(locale, "apply.changedFiles")}`,
    ...renderStringList(result.changedFiles),
    "",
    `### ${t(locale, "apply.skippedFiles")}`,
    ...renderStringList(result.skippedFiles),
    "",
    `### ${t(locale, "apply.conflicts")}`,
    ...renderConflictList(result.conflicts),
    "",
    `### ${t(locale, "apply.errors")}`,
    ...renderErrorList(result.errors),
    "",
  ]

  if (nextLine) lines.push(nextLine, "")
  lines.push("```json", JSON.stringify(result, null, 2), "```", "")
  return lines.join("\n")
}

function validateProjectInput(name: string, domain: string): ProjectInitError[] {
  const errors: ProjectInitError[] = []
  if (!name) errors.push({ code: "missing-name", message: "Project name is required." })
  if (!domain) errors.push({ code: "missing-domain", message: "Project domain is required." })
  return errors
}

function detectApplyConflicts(readiness: ReadinessResult): ProjectInitConflict[] {
  const applyPaths = new Set<string>(INIT_APPLY_PATHS)
  const preview = buildInitPreview(readiness)
  return preview.items
    .filter((item) => applyPaths.has(item.path) && item.action !== "create")
    .map((item) => conflictFromPreview(item, readiness))
}

function conflictFromPreview(item: InitPreviewItem, readiness: ReadinessResult): ProjectInitConflict {
  const readinessItem = readiness.items.find((candidate) => candidate.path === item.path)
  return { path: item.path, status: readinessItem?.status ?? "conflict", reason: item.reason }
}

function writeProjectFile(root: string, file: ProjectFileTemplate): void {
  const path = join(root, file.path)
  assertInsideRoot(root, path)
  writeFileAtomic(path, file.content)
}

function makeResult(input: {
  locale: ProjectInitApplyResult["locale"]
  ok: boolean
  root: string | null
  changedFiles?: string[]
  skippedFiles?: string[]
  conflicts?: ProjectInitConflict[]
  errors?: ProjectInitError[]
  readinessBefore?: ReadinessResult | null
  readinessAfter?: ReadinessResult | null
}): ProjectInitApplyResult {
  return {
    schemaVersion: SCHEMA_VERSION,
    ok: input.ok,
    root: input.root,
    mode: "apply",
    locale: input.locale,
    changedFiles: input.changedFiles ?? [],
    skippedFiles: input.skippedFiles ?? [],
    conflicts: input.conflicts ?? [],
    errors: input.errors ?? [],
    readinessBefore: input.readinessBefore ?? null,
    readinessAfter: input.readinessAfter ?? null,
  }
}

function safeInspectReadiness(root: string): ReadinessResult | null {
  try {
    return inspectReadiness(root)
  } catch {
    return null
  }
}

function renderStringList(items: string[]): string[] {
  if (items.length === 0) return ["- none"]
  return items.map((item) => `- ${item}`)
}

function renderConflictList(conflicts: ProjectInitConflict[]): string[] {
  if (conflicts.length === 0) return ["- none"]
  return conflicts.map((conflict) => `- ${conflict.path}: ${conflict.status} (${conflict.reason})`)
}

function renderErrorList(errors: ProjectInitError[]): string[] {
  if (errors.length === 0) return ["- none"]
  return errors.map((error) => `- ${error.code}${error.path ? ` ${error.path}` : ""}: ${error.message}`)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
