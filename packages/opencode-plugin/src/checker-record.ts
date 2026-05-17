import { appendFileSync, lstatSync, mkdirSync, readFileSync, type Stats } from "node:fs"
import { dirname, isAbsolute, join, posix, resolve } from "node:path"
import { assertInsideRoot, writeFileAtomic } from "./fs-utils"
import { resolveLocale, t } from "./i18n"
import { detectRoot } from "./root"
import { CHECKER_ISSUE_SEVERITIES, CHECKER_RECORD_IDS, CHECKER_RECORD_STATUSES, SCHEMA_VERSION, type CheckerIssueSeverity, type CheckerRecordData, type CheckerRecordError, type CheckerRecordId, type CheckerRecordIssue, type CheckerRecordOptions, type CheckerRecordResult, type CheckerRecordStatus, type Locale } from "./types"

interface ValidCheckerRecordInput {
  checker: CheckerRecordId
  status: CheckerRecordStatus
  critical: number
  major: number
  minor: number
  summary: string
  evidence: string[]
  reason: string
  issues: CheckerRecordIssue[]
}

const CANONICAL_EVENT_LOG_PATH = ".agents/events.jsonl"

export async function recordCheckerResult(options: CheckerRecordOptions): Promise<CheckerRecordResult> {
  const resolved = resolveLocale(options.locale, options.env)
  let root: string
  try {
    root = (await detectRoot({ cwd: options.cwd ?? process.cwd(), explicitRoot: options.root, worktree: options.worktree })).root
  } catch (error) {
    return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root: null, checker: options.checker, errors: [{ code: "root-detection-failed", message: `Failed to detect project root: ${errorMessage(error)}` }] })
  }

  if (options.agent !== undefined && options.agent !== "vibepaper-recorder") {
    return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root, checker: options.checker, errors: [{ code: "agent-not-authorized", message: `Agent "${options.agent}" is not authorized to record checker results.` }] })
  }

  const validation = validateOptions(options)
  if (!validation.ok) return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root, checker: options.checker, errors: validation.errors })

  const stateResult = readState(root)
  if (!stateResult.ok) return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root, checker: validation.input.checker, errors: [stateResult.error] })

  const logPathPreflight = preflightEventLogPath(root, eventLogPathFromState(stateResult.state))
  if (!logPathPreflight.ok) return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root, checker: validation.input.checker, errors: [logPathPreflight.error] })

  const timestamp = (options.now ?? new Date()).toISOString()
  const record = buildRecord(validation.input, timestamp)
  const checkers = isRecord(stateResult.state.checkers) ? stateResult.state.checkers : {}
  const rawPreviousRecord = checkers[validation.input.checker]
  const previousRecord: Record<string, unknown> | null = isRecord(rawPreviousRecord) ? rawPreviousRecord : null
  const nextState = {
    ...stateResult.state,
    checkers: {
      ...checkers,
      [validation.input.checker]: record,
    },
  }
  const warnings = buildWarnings(validation.input)

  try {
    writeState(root, nextState)
  } catch (error) {
    return makeResult({
      locale: resolved.locale,
      localeFallback: resolved.fallback,
      ok: false,
      root,
      checker: validation.input.checker,
      previousRecord,
      record,
      warnings,
      errors: [{ code: "write-failed", path: ".agents/state.json", message: `Failed to write checker result: ${errorMessage(error)}` }],
    })
  }

  try {
    appendCheckerEvent(root, logPathPreflight.projectPath, buildRecordEvent(validation.input, timestamp))
  } catch (error) {
    return makeResult({
      locale: resolved.locale,
      localeFallback: resolved.fallback,
      ok: false,
      root,
      checker: validation.input.checker,
      previousRecord,
      record,
      eventAppended: false,
      warnings: [...warnings, "state-written-event-failed"],
      errors: [{ code: "event-log-failed", path: logPathPreflight.projectPath, message: `Failed to append checker record event: ${errorMessage(error)}` }],
    })
  }

  return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: true, root, checker: validation.input.checker, previousRecord, record, eventAppended: true, warnings })
}

export function renderCheckerRecordOutput(result: CheckerRecordResult): string {
  const locale = result.locale
  return `## ${t(locale, "checkerRecord.title")}

${result.ok ? t(locale, "checkerRecord.success") : t(locale, "checkerRecord.failed")}

**${t(locale, "checkerRecord.checker")}:** ${result.checker ?? t(locale, "checkerRecord.none")}
**${t(locale, "workflow.action")}:** record_checker_result
**${t(locale, "checkerRecord.status")}:** ${result.record?.status ?? t(locale, "checkerRecord.none")}
**${t(locale, "checkerRecord.counts")}:** Critical=${result.record?.critical ?? 0}, Major=${result.record?.major ?? 0}, Minor=${result.record?.minor ?? 0}

### ${t(locale, "checkerRecord.warnings")}

${renderStringList(locale, result.warnings)}

### ${t(locale, "workflow.errors")}

${renderStringList(locale, result.errors.map((error) => `${error.code}${error.path ? ` (${error.path})` : ""}: ${error.message}`))}

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
`
}

function validateOptions(options: CheckerRecordOptions): { ok: true; input: ValidCheckerRecordInput } | { ok: false; errors: CheckerRecordError[] } {
  const errors: CheckerRecordError[] = []
  if (!isCheckerRecordId(options.checker)) errors.push({ code: "invalid-checker", message: `Unsupported checker id: ${options.checker}` })
  if (!isCheckerRecordStatus(options.status)) errors.push({ code: "invalid-status", message: `Unsupported checker status: ${options.status}` })

  const critical = normalizeCount(options.critical)
  const major = normalizeCount(options.major)
  const minor = normalizeCount(options.minor)
  if (critical === null || major === null || minor === null) errors.push({ code: "invalid-counts", message: "Checker counts must be non-negative integers." })

  const summary = typeof options.summary === "string" ? options.summary.trim() : ""
  if (summary === "") errors.push({ code: "missing-summary", message: "Checker result recording requires a non-empty summary." })

  const rawEvidence = Array.isArray(options.evidence) ? options.evidence : []
  const evidence = rawEvidence.map((item) => typeof item === "string" ? item.trim() : "").filter((item) => item !== "")
  if (evidence.length === 0 || evidence.length !== rawEvidence.length) errors.push({ code: "missing-evidence", message: "Checker result recording requires non-empty evidence." })

  const reason = typeof options.reason === "string" ? options.reason.trim() : ""
  if (reason === "") errors.push({ code: "missing-reason", message: "Checker result recording requires a non-empty reason." })

  const issues = normalizeIssues(options.issues)
  if (!issues.ok) errors.push({ code: "invalid-issues", message: issues.message })

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, input: { checker: options.checker as CheckerRecordId, status: options.status as CheckerRecordStatus, critical: critical!, major: major!, minor: minor!, summary, evidence, reason, issues: issues.issues } }
}

function normalizeIssues(rawIssues: unknown): { ok: true; issues: CheckerRecordIssue[] } | { ok: false; message: string; issues: [] } {
  if (rawIssues === undefined) return { ok: true, issues: [] }
  if (!Array.isArray(rawIssues)) return { ok: false, message: "issues must be an array when provided.", issues: [] }
  const issues: CheckerRecordIssue[] = []
  for (const raw of rawIssues) {
    if (!isRecord(raw) || !isCheckerIssueSeverity(raw.severity) || typeof raw.message !== "string" || raw.message.trim() === "") {
      return { ok: false, message: "Each issue requires severity and non-empty message.", issues: [] }
    }
    const issue: CheckerRecordIssue = { severity: raw.severity, message: raw.message.trim() }
    if (typeof raw.location === "string" && raw.location.trim() !== "") issue.location = raw.location.trim()
    if (typeof raw.suggestion === "string" && raw.suggestion.trim() !== "") issue.suggestion = raw.suggestion.trim()
    if (typeof raw.id === "string" && raw.id.trim() !== "") issue.id = raw.id.trim()
    issues.push(issue)
  }
  return { ok: true, issues }
}

function buildRecord(input: ValidCheckerRecordInput, timestamp: string): CheckerRecordData {
  return {
    status: input.status,
    updated_at: timestamp,
    critical: input.critical,
    major: input.major,
    minor: input.minor,
    total: input.critical + input.major + input.minor,
    summary: input.summary,
    evidence: input.evidence,
    issues: input.issues,
    provenance: { source: "opencode", operator: "user", reason: input.reason },
  }
}

function buildWarnings(input: ValidCheckerRecordInput): string[] {
  const issueCount = input.issues.length
  const total = input.critical + input.major + input.minor
  if (issueCount > 0 && issueCount !== total) return ["issue-count-does-not-match-severity-total"]
  if (input.status === "clean" && total > 0) return ["clean-status-with-nonzero-counts"]
  if (input.status === "issues_found" && total === 0) return ["issues-found-status-with-zero-counts"]
  return []
}

function buildRecordEvent(input: ValidCheckerRecordInput, timestamp: string): Record<string, unknown> {
  return {
    timestamp,
    operator: "user",
    action: "record_checker_result",
    result: "success",
    metadata: {
      checker: input.checker,
      status: input.status,
      critical: input.critical,
      major: input.major,
      minor: input.minor,
      total: input.critical + input.major + input.minor,
      evidence: input.evidence,
      reason: input.reason,
    },
  }
}

function readState(root: string): { ok: true; state: Record<string, unknown> } | { ok: false; error: CheckerRecordError } {
  const statePath = join(root, ".agents", "state.json")
  try {
    assertInsideRoot(root, statePath)
  } catch (error) {
    return { ok: false, error: { code: "invalid-state", path: ".agents/state.json", message: `Unsafe state path: ${errorMessage(error)}` } }
  }

  let stateStat: Stats | null
  try {
    stateStat = lstatIfExists(statePath)
  } catch (error) {
    return { ok: false, error: { code: "invalid-state", path: ".agents/state.json", message: `Failed to inspect .agents/state.json: ${errorMessage(error)}` } }
  }
  if (stateStat === null) return { ok: false, error: { code: "missing-state", path: ".agents/state.json", message: "Missing .agents/state.json." } }
  if (stateStat.isSymbolicLink() || !stateStat.isFile()) return { ok: false, error: { code: "invalid-state", path: ".agents/state.json", message: ".agents/state.json must be a regular file." } }

  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(statePath, "utf8"))
  } catch (error) {
    return { ok: false, error: { code: "invalid-state", path: ".agents/state.json", message: `Invalid .agents/state.json: ${errorMessage(error)}` } }
  }
  if (!isRecord(parsed)) return { ok: false, error: { code: "invalid-state", path: ".agents/state.json", message: ".agents/state.json must contain an object." } }
  if (parsed.checkers !== undefined && !isRecord(parsed.checkers)) return { ok: false, error: { code: "invalid-state", path: ".agents/state.json", message: "state.checkers must be an object when present." } }
  return { ok: true, state: parsed }
}

function writeState(root: string, state: Record<string, unknown>): void {
  const statePath = join(root, ".agents", "state.json")
  assertInsideRoot(root, statePath)
  writeFileAtomic(statePath, `${JSON.stringify(state, null, 2)}\n`)
}

function eventLogPathFromState(state: Record<string, unknown>): string {
  return typeof state.event_log_path === "string" && state.event_log_path.trim() !== "" ? state.event_log_path : ".agents/events.jsonl"
}

function preflightEventLogPath(root: string, projectPath: string): { ok: true; projectPath: string } | { ok: false; error: CheckerRecordError } {
  const normalizedPath = normalizeEventLogProjectPath(projectPath)
  if (normalizedPath !== CANONICAL_EVENT_LOG_PATH) {
    return { ok: false, error: { code: "event-log-failed", path: projectPath, message: `Event log path must be ${CANONICAL_EVENT_LOG_PATH}.` } }
  }
  try {
    const logPath = safeEventLogPath(root, normalizedPath)
    const statePath = join(root, ".agents", "state.json")
    if (resolve(logPath) === resolve(statePath)) return { ok: false, error: { code: "event-log-failed", path: projectPath, message: "Event log path must not target .agents/state.json." } }
  } catch (error) {
    return { ok: false, error: { code: "event-log-failed", path: projectPath, message: `Failed to resolve event log path: ${errorMessage(error)}` } }
  }
  return { ok: true, projectPath: normalizedPath }
}

function appendCheckerEvent(root: string, projectPath: string, event: Record<string, unknown>): void {
  const logPath = safeEventLogPath(root, projectPath)
  const statePath = join(root, ".agents", "state.json")
  if (resolve(logPath) === resolve(statePath)) throw new Error("Event log path must not target .agents/state.json.")
  const parent = dirname(logPath)
  assertInsideRoot(root, parent)
  const blockedParent = blockedEventLogAncestor(parent)
  if (blockedParent !== null) throw new Error(`Event log parent is not a directory: ${blockedParent}`)
  mkdirSync(parent, { recursive: true })
  const stat = lstatIfExists(logPath)
  if (stat !== null && stat.isSymbolicLink()) throw new Error(`Refusing to append to symlink: ${logPath}`)
  if (stat !== null && !stat.isFile()) throw new Error(`Refusing to append to non-file: ${logPath}`)
  const separator = existingFileNeedsNewline(logPath) ? "\n" : ""
  appendFileSync(logPath, `${separator}${JSON.stringify(event)}\n`, "utf8")
}

function normalizeEventLogProjectPath(projectPath: string): string {
  const normalizedSeparators = projectPath.trim().replace(/\\/g, "/")
  if (isAbsolute(projectPath) || normalizedSeparators.startsWith("/") || /^[A-Za-z]:\//.test(normalizedSeparators)) return normalizedSeparators
  return posix.normalize(normalizedSeparators)
}

function safeEventLogPath(root: string, projectPath: string): string {
  const target = isAbsolute(projectPath) ? projectPath : join(root, projectPath)
  const stat = lstatIfExists(target)
  if (stat !== null && stat.isSymbolicLink()) throw new Error(`Event log path must not be a symlink: ${target}`)
  assertInsideRoot(root, target)
  return target
}

function blockedEventLogAncestor(parent: string): string | null {
  let current = parent
  let stat = lstatIfExists(current)
  while (stat === null) {
    const next = dirname(current)
    if (next === current) return null
    current = next
    stat = lstatIfExists(current)
  }
  if (stat.isSymbolicLink()) return current
  return stat.isDirectory() ? null : current
}

function existingFileNeedsNewline(logPath: string): boolean {
  const stat = lstatIfExists(logPath)
  if (stat === null) return false
  if (!stat.isFile() || stat.size === 0) return false
  return !readFileSync(logPath, "utf8").endsWith("\n")
}

function lstatIfExists(path: string): Stats | null {
  try {
    return lstatSync(path) ?? null
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return null
    throw error
  }
}

function makeResult(input: {
  locale: Locale
  localeFallback: boolean
  ok: boolean
  root: string | null
  checker?: CheckerRecordId | string | null
  previousRecord?: Record<string, unknown> | null
  record?: CheckerRecordData | null
  eventAppended?: boolean
  warnings?: string[]
  errors?: CheckerRecordError[]
}): CheckerRecordResult {
  return {
    schemaVersion: SCHEMA_VERSION,
    ok: input.ok,
    root: input.root,
    locale: input.locale,
    localeFallback: input.localeFallback,
    checker: input.checker ?? null,
    previousRecord: input.previousRecord ?? null,
    record: input.record ?? null,
    eventAppended: input.eventAppended ?? false,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
  }
}

function renderStringList(locale: Locale, items: string[]): string {
  if (items.length === 0) return `- ${t(locale, "checkerRecord.none")}`
  return items.map((item) => `- ${item}`).join("\n")
}

function normalizeCount(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null
}

function isCheckerRecordId(value: string): value is CheckerRecordId {
  return (CHECKER_RECORD_IDS as readonly string[]).includes(value)
}

function isCheckerRecordStatus(value: string): value is CheckerRecordStatus {
  return (CHECKER_RECORD_STATUSES as readonly string[]).includes(value)
}

function isCheckerIssueSeverity(value: unknown): value is CheckerIssueSeverity {
  return typeof value === "string" && (CHECKER_ISSUE_SEVERITIES as readonly string[]).includes(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
