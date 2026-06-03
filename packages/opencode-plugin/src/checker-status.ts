import { existsSync, lstatSync, readFileSync, type Stats } from "node:fs"
import { join } from "node:path"
import { assertInsideRoot } from "./fs-utils"
import { resolveLocale, t } from "./i18n"
import { detectRoot } from "./root"
import { SCHEMA_VERSION, type CheckerStatusError, type CheckerStatusOptions, type CheckerStatusResult, type CheckerStatusRow, type CheckerStatusSummary, type CheckerRunStatus, type Locale } from "./types"

export const CHECKER_IDS = [
  "problem-checker",
  "novelty-checker",
  "technical-depth-checker",
  "logic-checker",
  "clarity-checker",
  "evaluation-protocol-checker",
  "data-checker",
] as const

type CheckerId = typeof CHECKER_IDS[number]

type FileReadResult = {
  ok: true
  content: string
  stat: Stats
} | {
  ok: false
  error: CheckerStatusError
}

type StateReadResult = {
  ok: true
  checkers: Record<string, unknown>
  warnings: string[]
} | {
  ok: false
  error: CheckerStatusError
}

interface ParsedPrecheck {
  present: boolean
  path: string
  updatedAt: string | null
  stale: boolean
  critical: number
  major: number
  minor: number
  warnings: string[]
}

export async function buildCheckerStatus(options: CheckerStatusOptions): Promise<CheckerStatusResult> {
  const resolved = resolveLocale(options.locale, options.env)
  let root: string
  try {
    root = (await detectRoot({ cwd: options.cwd ?? process.cwd(), explicitRoot: options.root, worktree: options.worktree })).root
  } catch (error) {
    return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root: null, errors: [{ code: "root-detection-failed", message: `Failed to detect project root: ${errorMessage(error)}` }] })
  }

  const state = readCheckerState(root)
  if (!state.ok) return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root, errors: [state.error] })

  const paper = statProjectFile(root, "paper.md")
  const paperUpdatedAt = paper.ok ? paper.stat.mtime.toISOString() : null
  const warnings = [...state.warnings]
  if (!paper.ok) warnings.push(paper.warning)

  const checkers = CHECKER_IDS.map((id) => buildCheckerRow(id, state.checkers[id], paper.ok ? paper.stat : null))
  const precheckReport = inspectPrecheckReport(root, paper.ok ? paper.stat : null)
  warnings.push(...precheckReport.warnings)

  return makeResult({
    locale: resolved.locale,
    localeFallback: resolved.fallback,
    ok: true,
    root,
    statePath: ".agents/state.json",
    paperUpdatedAt,
    checkers,
    summary: summarizeCheckers(checkers, precheckReport),
    precheckReport,
    warnings,
  })
}

export function renderCheckerStatusOutput(result: CheckerStatusResult): string {
  const locale = result.locale
  const none = t(locale, "checkerStatus.none")
  const rows = result.checkers.length > 0 ? result.checkers.map((checker) => renderCheckerRow(checker, none)).join("\n") : `| ${none} | ${none} | ${none} | ${none} | ${none} | ${none} | ${none} |`
  const warnings = result.warnings.length > 0 ? result.warnings.map((warning) => `- ${warning}`).join("\n") : none
  const precheck = result.precheckReport.present
    ? `${result.precheckReport.path}, stale=${result.precheckReport.stale}, critical=${result.precheckReport.critical}, major=${result.precheckReport.major}, minor=${result.precheckReport.minor}`
    : none

  return `## ${t(locale, "checkerStatus.title")}

${result.ok ? t(locale, "checkerStatus.ready") : t(locale, "checkerStatus.unavailable")}

- ${t(locale, "checkerStatus.statePath")}: ${result.statePath ?? ".agents/state.json"}
- ${t(locale, "checkerStatus.paperUpdatedAt")}: ${result.paperUpdatedAt ?? none}
- ${t(locale, "checkerStatus.precheckReport")}: ${precheck}
- ${t(locale, "checkerStatus.summary")}: run=${result.summary.run}, missing=${result.summary.missing}, stale=${result.summary.stale}, critical=${result.summary.critical}, major=${result.summary.major}, minor=${result.summary.minor}

### ${t(locale, "checkerStatus.checkers")}

| ${t(locale, "checkerStatus.checker")} | ${t(locale, "checkerStatus.status")} | ${t(locale, "checkerStatus.updatedAt")} | ${t(locale, "checkerStatus.critical")} | ${t(locale, "checkerStatus.major")} | ${t(locale, "checkerStatus.minor")} | ${t(locale, "checkerStatus.warnings")} |
|---|---|---|---:|---:|---:|---|
${rows}

### ${t(locale, "checkerStatus.warnings")}

${warnings}

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
`
}

function readCheckerState(root: string): StateReadResult {
  const file = readProjectFile(root, ".agents/state.json", "missing-state", "invalid-state")
  if (!file.ok) return file

  try {
    const parsed: unknown = JSON.parse(file.content)
    if (!isRecord(parsed)) {
      return { ok: false, error: { code: "invalid-state", path: ".agents/state.json", message: "State JSON must be an object." } }
    }
    const warnings: string[] = []
    const rawCheckers = parsed.checkers
    if (rawCheckers === undefined) {
      warnings.push("checkers-field-missing")
      return { ok: true, checkers: {}, warnings }
    }
    if (!isRecord(rawCheckers)) {
      warnings.push("checkers-field-not-object")
      return { ok: true, checkers: {}, warnings }
    }
    return { ok: true, checkers: rawCheckers, warnings }
  } catch (error) {
    return { ok: false, error: { code: "invalid-state", path: ".agents/state.json", message: `Failed to parse state JSON: ${errorMessage(error)}` } }
  }
}

function buildCheckerRow(id: CheckerId, raw: unknown, paperStat: Stats | null): CheckerStatusRow {
  if (!isRecord(raw)) {
    return { id, status: "not_run", updatedAt: null, stale: false, critical: 0, major: 0, minor: 0, total: 0, source: null, summary: null, warnings: [] }
  }

  const updatedAt = firstString(raw.updated_at, raw.updatedAt, raw.completed_at, raw.completedAt, raw.ran_at, raw.ranAt)
  const updatedDate = parseDate(updatedAt)
  const stale = updatedDate !== null && paperStat !== null && updatedDate.getTime() < paperStat.mtimeMs
  const counts = extractSeverityCounts(raw)
  const total = firstNumber(raw.total, raw.total_issues, raw.issue_count, raw.issues_count) ?? counts.total
  const status = stale ? "stale" : total > 0 ? "issues_found" : hasKnownCleanSignal(raw) || counts.known ? "clean" : "unknown"
  const warnings: string[] = []
  if (updatedAt !== null && updatedDate === null) warnings.push("invalid-updated-at")
  if (stale) warnings.push("checker-result-older-than-paper")

  return {
    id,
    status,
    updatedAt: updatedDate?.toISOString() ?? null,
    stale,
    critical: counts.critical,
    major: counts.major,
    minor: counts.minor,
    total,
    source: firstString(raw.source, raw.provenance_source, raw.recorded_by),
    summary: firstString(raw.summary, raw.message, raw.result),
    warnings,
  }
}

function inspectPrecheckReport(root: string, paperStat: Stats | null): ParsedPrecheck {
  const file = readProjectFile(root, ".agents/precheck_report.md", "missing-precheck-report", "invalid-precheck-report")
  if (!file.ok) {
    if (file.error.code === "missing-precheck-report") {
      return { present: false, path: ".agents/precheck_report.md", updatedAt: null, stale: false, critical: 0, major: 0, minor: 0, warnings: [] }
    }
    return { present: false, path: ".agents/precheck_report.md", updatedAt: null, stale: false, critical: 0, major: 0, minor: 0, warnings: [file.error.code] }
  }

  const stale = paperStat !== null && file.stat.mtimeMs < paperStat.mtimeMs
  return {
    present: true,
    path: ".agents/precheck_report.md",
    updatedAt: file.stat.mtime.toISOString(),
    stale,
    critical: countWord(file.content, "critical"),
    major: countWord(file.content, "major"),
    minor: countWord(file.content, "minor"),
    warnings: stale ? ["precheck-report-older-than-paper"] : [],
  }
}

function readProjectFile(root: string, relativePath: string, missingCode: CheckerStatusError["code"], invalidCode: CheckerStatusError["code"]): FileReadResult {
  const path = join(root, relativePath)
  try {
    assertInsideRoot(root, path)
  } catch (error) {
    return { ok: false, error: { code: "unsafe-path", path: relativePath, message: `Unsafe path: ${errorMessage(error)}` } }
  }
  if (!existsSync(path)) return { ok: false, error: { code: missingCode, path: relativePath, message: `Missing ${relativePath}.` } }

  let stat: Stats
  try {
    stat = lstatSync(path)
  } catch (error) {
    return { ok: false, error: { code: "read-failed", path: relativePath, message: `Failed to inspect ${relativePath}: ${errorMessage(error)}` } }
  }
  if (stat.isSymbolicLink() || !stat.isFile()) return { ok: false, error: { code: invalidCode, path: relativePath, message: `${relativePath} must be a regular file.` } }

  try {
    return { ok: true, content: readFileSync(path, "utf8"), stat }
  } catch (error) {
    return { ok: false, error: { code: "read-failed", path: relativePath, message: `Failed to read ${relativePath}: ${errorMessage(error)}` } }
  }
}

function statProjectFile(root: string, relativePath: string): { ok: true; stat: Stats } | { ok: false; warning: string } {
  const path = join(root, relativePath)
  try {
    assertInsideRoot(root, path)
    if (!existsSync(path)) return { ok: false, warning: `${relativePath}-missing` }
    const stat = lstatSync(path)
    if (stat.isSymbolicLink() || !stat.isFile()) return { ok: false, warning: `${relativePath}-not-regular-file` }
    return { ok: true, stat }
  } catch {
    return { ok: false, warning: `${relativePath}-unavailable` }
  }
}

function summarizeCheckers(checkers: CheckerStatusRow[], precheckReport: ParsedPrecheck): CheckerStatusSummary {
  const byStatus: Record<CheckerRunStatus, number> = { not_run: 0, clean: 0, issues_found: 0, stale: 0, unknown: 0 }
  for (const checker of checkers) byStatus[checker.status] += 1
  return {
    total: checkers.length,
    run: checkers.filter((checker) => checker.status !== "not_run").length,
    missing: byStatus.not_run,
    stale: byStatus.stale + (precheckReport.stale ? 1 : 0),
    clean: byStatus.clean,
    issuesFound: byStatus.issues_found,
    unknown: byStatus.unknown,
    critical: checkers.reduce((sum, checker) => sum + checker.critical, 0),
    major: checkers.reduce((sum, checker) => sum + checker.major, 0),
    minor: checkers.reduce((sum, checker) => sum + checker.minor, 0),
    precheckPresent: precheckReport.present,
  }
}

function extractSeverityCounts(raw: Record<string, unknown>): { critical: number; major: number; minor: number; total: number; known: boolean } {
  const counts = isRecord(raw.counts) ? raw.counts : raw
  const critical = firstNumber(counts.critical, counts.Critical, counts.criticals) ?? 0
  const major = firstNumber(counts.major, counts.Major, counts.majors) ?? 0
  const minor = firstNumber(counts.minor, counts.Minor, counts.minors) ?? 0
  let total = critical + major + minor
  let known = critical > 0 || major > 0 || minor > 0 || hasAnySeverityField(counts)

  const issueArray = firstArray(raw.issues, raw.findings, raw.comments, raw.results)
  if (issueArray !== null) {
    known = true
    total = issueArray.length
    let fromIssues = { critical: 0, major: 0, minor: 0 }
    for (const issue of issueArray) {
      const severity = isRecord(issue) ? firstString(issue.severity, issue.SEVERITY, issue.level) : typeof issue === "string" ? issue : null
      if (severity === null) continue
      if (/critical/i.test(severity)) fromIssues.critical += 1
      else if (/major/i.test(severity)) fromIssues.major += 1
      else if (/minor/i.test(severity)) fromIssues.minor += 1
    }
    return { critical: critical || fromIssues.critical, major: major || fromIssues.major, minor: minor || fromIssues.minor, total, known }
  }

  return { critical, major, minor, total, known }
}

function hasKnownCleanSignal(raw: Record<string, unknown>): boolean {
  const status = firstString(raw.status, raw.result, raw.outcome)
  return status !== null && /^(pass|passed|clean|ok|success|no_issues|no issues)$/i.test(status)
}

function hasAnySeverityField(record: Record<string, unknown>): boolean {
  return ["critical", "Critical", "major", "Major", "minor", "Minor"].some((key) => typeof record[key] === "number")
}

function renderCheckerRow(checker: CheckerStatusRow, none: string): string {
  const warnings = checker.warnings.length > 0 ? checker.warnings.join(", ") : none
  return `| ${checker.id} | ${checker.status} | ${checker.updatedAt ?? none} | ${checker.critical} | ${checker.major} | ${checker.minor} | ${warnings} |`
}

function makeResult(partial: Partial<CheckerStatusResult> & { locale: Locale; localeFallback: boolean; ok: boolean; root: string | null }): CheckerStatusResult {
  return {
    schemaVersion: SCHEMA_VERSION,
    readonly: true,
    ok: partial.ok,
    root: partial.root,
    locale: partial.locale,
    localeFallback: partial.localeFallback,
    statePath: partial.statePath ?? null,
    paperUpdatedAt: partial.paperUpdatedAt ?? null,
    checkers: partial.checkers ?? [],
    summary: partial.summary ?? { total: 0, run: 0, missing: 0, stale: 0, clean: 0, issuesFound: 0, unknown: 0, critical: 0, major: 0, minor: 0, precheckPresent: false },
    precheckReport: partial.precheckReport ?? { present: false, path: ".agents/precheck_report.md", updatedAt: null, stale: false, critical: 0, major: 0, minor: 0, warnings: [] },
    warnings: partial.warnings ?? [],
    errors: partial.errors ?? [],
  }
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") return value.trim()
  }
  return null
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.trunc(value)
  }
  return null
}

function firstArray(...values: unknown[]): unknown[] | null {
  for (const value of values) {
    if (Array.isArray(value)) return value
  }
  return null
}

function parseDate(value: string | null): Date | null {
  if (value === null) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function countWord(content: string, word: string): number {
  const matches = content.match(new RegExp(`\\b${word}\\b`, "gi"))
  return matches?.length ?? 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
