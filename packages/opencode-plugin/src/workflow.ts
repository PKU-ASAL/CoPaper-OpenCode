import { existsSync, readFileSync } from "node:fs"
import { isAbsolute, join } from "node:path"
import { assertInsideRoot } from "./fs-utils"
import { resolveLocale, t } from "./i18n"
import { detectRoot } from "./root"
import { SCHEMA_VERSION, WORKFLOW_PHASE_STATUSES, type Locale, type WorkflowError, type WorkflowEvent, type WorkflowLogQueryOptions, type WorkflowLogResult, type WorkflowMetadataSummary, type WorkflowPhaseRow, type WorkflowPhaseStatus, type WorkflowRecommendation, type WorkflowStateDocument, type WorkflowStatusResult, type WorkflowSummary } from "./types"

export interface WorkflowReadOptions {
  root?: string
  cwd?: string
  worktree?: string
  locale?: string
  env?: Record<string, string | undefined>
}

interface ResolvedWorkflowRoot {
  ok: true
  root: string
}

interface FailedWorkflowRoot {
  ok: false
  error: WorkflowError
}

interface ParsedWorkflowMetadata extends WorkflowMetadataSummary {
  warnings: string[]
}

export async function buildWorkflowStatus(options: WorkflowReadOptions): Promise<WorkflowStatusResult> {
  const resolved = resolveLocale(options.locale, options.env)
  const rootResult = await resolveWorkflowRoot(options)
  if (!rootResult.ok) {
    return makeStatusResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root: null, errors: [rootResult.error] })
  }

  const stateResult = readWorkflowState(rootResult.root)
  if (!stateResult.ok) {
    return makeStatusResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root: rootResult.root, errors: [stateResult.error] })
  }

  const state = stateResult.state
  const phaseIds = Object.keys(state.phases)
  const metadata = parseWorkflowMetadata(state.workflow)
  const orderedPhaseIds = orderPhaseIds(phaseIds, metadata.phaseOrder)
  const phases = orderedPhaseIds.map((id) => buildPhaseRow(id, state.phases[id] ?? {}))
  const currentPhase = typeof state.current_phase === "string" ? state.current_phase : null
  const warnings = [...metadata.warnings]
  const currentPhaseExists = currentPhase !== null && phaseIds.includes(currentPhase)
  if (!currentPhaseExists) warnings.push("current-phase-missing")

  return makeStatusResult({
    locale: resolved.locale,
    localeFallback: resolved.fallback,
    ok: true,
    root: rootResult.root,
    project: isRecord(state.project) ? state.project : null,
    currentPhase,
    phases,
    summary: summarizePhases(phases),
    metadata: withoutMetadataWarnings(metadata),
    recommendation: currentPhaseExists ? continueRecommendation(currentPhase) : unavailableRecommendation(),
    warnings,
  })
}

export async function queryWorkflowLog(options: WorkflowLogQueryOptions): Promise<WorkflowLogResult> {
  const resolved = resolveLocale(options.locale, options.env)
  const lastN = clampLastN(options.lastN)
  const rootResult = await resolveWorkflowRoot(options)
  if (!rootResult.ok) {
    return makeLogResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root: null, lastN, errors: [rootResult.error], phase: options.phase, operator: options.operator })
  }

  const stateResult = readWorkflowState(rootResult.root)
  if (!stateResult.ok) {
    return makeLogResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root: rootResult.root, lastN, errors: [stateResult.error], phase: options.phase, operator: options.operator })
  }

  const relativeLogPath = eventLogPathFromState(stateResult.state)
  let logPath: string
  try {
    logPath = safeProjectPath(rootResult.root, relativeLogPath)
  } catch (error) {
    return makeLogResult({
      locale: resolved.locale,
      localeFallback: resolved.fallback,
      ok: false,
      root: rootResult.root,
      logPath: relativeLogPath,
      lastN,
      phase: options.phase,
      operator: options.operator,
      errors: [{ code: "event-log-failed", path: relativeLogPath, message: `Failed to resolve event log path: ${errorMessage(error)}` }],
    })
  }

  if (!existsSync(logPath)) {
    return makeLogResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: true, root: rootResult.root, logPath: relativeLogPath, lastN, phase: options.phase, operator: options.operator, warnings: ["event-log-missing"] })
  }

  let content: string
  try {
    content = readFileSync(logPath, "utf8")
  } catch (error) {
    return makeLogResult({
      locale: resolved.locale,
      localeFallback: resolved.fallback,
      ok: false,
      root: rootResult.root,
      logPath: relativeLogPath,
      lastN,
      phase: options.phase,
      operator: options.operator,
      errors: [{ code: "event-log-failed", path: relativeLogPath, message: `Failed to read event log: ${errorMessage(error)}` }],
    })
  }

  const parsed = parseEventLog(content)
  const events = parsed.events
    .filter((event) => options.phase === undefined || event.phase === options.phase)
    .filter((event) => options.operator === undefined || event.operator === options.operator)
    .slice(-lastN)

  return makeLogResult({
    locale: resolved.locale,
    localeFallback: resolved.fallback,
    ok: true,
    root: rootResult.root,
    logPath: relativeLogPath,
    lastN,
    phase: options.phase,
    operator: options.operator,
    events,
    skippedMalformed: parsed.skippedMalformed,
    warnings: parsed.skippedMalformed > 0 ? ["malformed-events-skipped"] : [],
  })
}

export function renderWorkflowStatusOutput(result: WorkflowStatusResult): string {
  const locale = result.locale
  const phaseRows = result.phases.length > 0 ? result.phases.map((phase) => renderPhaseRow(locale, phase)).join("\n") : `| ${t(locale, "workflow.none")} | ${t(locale, "workflow.none")} | ${t(locale, "workflow.none")} | ${t(locale, "workflow.none")} |`
  const warningRows = renderStringList(locale, result.warnings)
  return `## ${t(locale, "workflow.statusTitle")}

${result.ok ? t(locale, "workflow.statusReady") : t(locale, "workflow.statusUnavailable")}

**${t(locale, "workflow.currentPhase")}:** ${result.currentPhase ?? t(locale, "workflow.none")}

### ${t(locale, "workflow.phases")}

| ${t(locale, "workflow.phase")} | ${t(locale, "workflow.phaseStatus")} | ${t(locale, "workflow.completedAt")} | ${t(locale, "workflow.knownStatus")} |
|---|---|---|---|
${phaseRows}

### ${t(locale, "workflow.warnings")}

${warningRows}

${t(locale, result.recommendation.messageKey)}

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
`
}

export function renderWorkflowLogOutput(result: WorkflowLogResult): string {
  const locale = result.locale
  const eventRows = result.events.length > 0 ? result.events.map((event) => renderEventRow(locale, event)).join("\n") : `| ${t(locale, "workflow.none")} | ${t(locale, "workflow.none")} | ${t(locale, "workflow.none")} | ${t(locale, "workflow.none")} | ${t(locale, "workflow.none")} |`
  const warningRows = renderStringList(locale, result.warnings)
  return `## ${t(locale, "workflow.logTitle")}

| ${t(locale, "workflow.timestamp")} | ${t(locale, "workflow.phase")} | ${t(locale, "workflow.operator")} | ${t(locale, "workflow.action")} | ${t(locale, "workflow.result")} |
|---|---|---|---|---|
${eventRows}

### ${t(locale, "workflow.warnings")}

${warningRows}

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
`
}

async function resolveWorkflowRoot(options: WorkflowReadOptions): Promise<ResolvedWorkflowRoot | FailedWorkflowRoot> {
  try {
    const detection = await detectRoot({ cwd: options.cwd ?? process.cwd(), explicitRoot: options.root, worktree: options.worktree })
    return { ok: true, root: detection.root }
  } catch (error) {
    return { ok: false, error: { code: "root-detection-failed", message: `Failed to detect project root: ${errorMessage(error)}` } }
  }
}

function readWorkflowState(root: string): { ok: true; state: WorkflowStateDocument } | { ok: false; error: WorkflowError } {
  const statePath = join(root, ".agents", "state.json")
  try {
    assertInsideRoot(root, statePath)
  } catch (error) {
    return { ok: false, error: { code: "invalid-state", path: ".agents/state.json", message: `Unsafe state path: ${errorMessage(error)}` } }
  }

  if (!existsSync(statePath)) {
    return { ok: false, error: { code: "missing-state", path: ".agents/state.json", message: "Missing .agents/state.json." } }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(statePath, "utf8"))
  } catch (error) {
    return { ok: false, error: { code: "invalid-state", path: ".agents/state.json", message: `Invalid .agents/state.json: ${errorMessage(error)}` } }
  }

  if (!isRecord(parsed) || !isRecord(parsed.phases)) {
    return { ok: false, error: { code: "invalid-state", path: ".agents/state.json", message: "State must contain a phases object." } }
  }

  const phases: Record<string, Record<string, unknown>> = {}
  for (const [phase, value] of Object.entries(parsed.phases)) {
    if (!isRecord(value)) {
      return { ok: false, error: { code: "invalid-state", path: ".agents/state.json", message: `Phase ${phase} must be an object.` } }
    }
    phases[phase] = value
  }

  return { ok: true, state: { ...parsed, phases } as WorkflowStateDocument }
}

function parseWorkflowMetadata(value: unknown): ParsedWorkflowMetadata {
  if (value === undefined) return { available: false, phaseOrder: [], dependencies: {}, warnings: [] }
  if (!isRecord(value)) return { available: false, phaseOrder: [], dependencies: {}, warnings: ["workflow-metadata-invalid"] }

  const warnings: string[] = []
  let phaseOrder: string[] = []
  let dependencies: Record<string, string[]> = {}

  if (value.phase_order !== undefined) {
    if (Array.isArray(value.phase_order) && value.phase_order.every((item) => typeof item === "string")) phaseOrder = value.phase_order
    else warnings.push("workflow-metadata-invalid")
  }

  if (value.dependencies !== undefined) {
    if (isRecord(value.dependencies)) {
      const parsedDependencies: Record<string, string[]> = {}
      let valid = true
      for (const [phase, dependencyList] of Object.entries(value.dependencies)) {
        if (!Array.isArray(dependencyList) || !dependencyList.every((item) => typeof item === "string")) {
          valid = false
          break
        }
        parsedDependencies[phase] = dependencyList
      }
      if (valid) dependencies = parsedDependencies
      else warnings.push("workflow-metadata-invalid")
    } else {
      warnings.push("workflow-metadata-invalid")
    }
  }

  return { available: true, phaseOrder, dependencies, warnings: [...new Set(warnings)] }
}

function withoutMetadataWarnings(metadata: ParsedWorkflowMetadata): WorkflowMetadataSummary {
  return { available: metadata.available, phaseOrder: metadata.phaseOrder, dependencies: metadata.dependencies }
}

function orderPhaseIds(phaseIds: string[], preferredOrder: string[]): string[] {
  const actual = new Set(phaseIds)
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const phase of preferredOrder) {
    if (actual.has(phase) && !seen.has(phase)) {
      ordered.push(phase)
      seen.add(phase)
    }
  }
  for (const phase of phaseIds) {
    if (!seen.has(phase)) ordered.push(phase)
  }
  return ordered
}

function buildPhaseRow(id: string, phase: Record<string, unknown>): WorkflowPhaseRow {
  const status = typeof phase.status === "string" ? phase.status : "unknown"
  const completedAt = typeof phase.completed_at === "string" ? phase.completed_at : null
  const fields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(phase)) {
    if (key !== "status" && key !== "completed_at") fields[key] = value
  }
  return { id, status, knownStatus: isWorkflowPhaseStatus(status), completedAt, fields }
}

function summarizePhases(phases: WorkflowPhaseRow[]): WorkflowSummary {
  const byStatus = emptyStatusCounts()
  for (const phase of phases) {
    if (isWorkflowPhaseStatus(phase.status)) byStatus[phase.status] += 1
    else byStatus.unknown += 1
  }
  return { total: phases.length, byStatus }
}

function eventLogPathFromState(state: WorkflowStateDocument): string {
  return typeof state.event_log_path === "string" && state.event_log_path.trim() !== "" ? state.event_log_path : ".agents/events.jsonl"
}

function safeProjectPath(root: string, projectPath: string): string {
  const target = isAbsolute(projectPath) ? projectPath : join(root, projectPath)
  assertInsideRoot(root, target)
  return target
}

function parseEventLog(content: string): { events: WorkflowEvent[]; skippedMalformed: number } {
  const events: WorkflowEvent[] = []
  let skippedMalformed = 0

  for (const line of content.split(/\r?\n/)) {
    if (line.trim() === "") continue
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      skippedMalformed += 1
      continue
    }
    if (!isRecord(parsed)) {
      skippedMalformed += 1
      continue
    }
    events.push(buildWorkflowEvent(parsed))
  }

  return { events, skippedMalformed }
}

function buildWorkflowEvent(event: Record<string, unknown>): WorkflowEvent {
  const fields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(event)) {
    if (key !== "timestamp" && key !== "phase" && key !== "operator" && key !== "action" && key !== "result") fields[key] = value
  }
  return {
    timestamp: typeof event.timestamp === "string" ? event.timestamp : null,
    phase: typeof event.phase === "string" ? event.phase : null,
    operator: typeof event.operator === "string" ? event.operator : null,
    action: typeof event.action === "string" ? event.action : null,
    result: event.result ?? null,
    fields,
  }
}

function clampLastN(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 5
  return Math.min(50, Math.max(1, Math.trunc(value)))
}

function makeStatusResult(input: {
  locale: Locale
  localeFallback: boolean
  ok: boolean
  root: string | null
  project?: Record<string, unknown> | null
  currentPhase?: string | null
  phases?: WorkflowPhaseRow[]
  summary?: WorkflowSummary
  metadata?: WorkflowMetadataSummary
  recommendation?: WorkflowRecommendation
  warnings?: string[]
  errors?: WorkflowError[]
}): WorkflowStatusResult {
  return {
    schemaVersion: SCHEMA_VERSION,
    readonly: true,
    ok: input.ok,
    root: input.root,
    locale: input.locale,
    localeFallback: input.localeFallback,
    project: input.project ?? null,
    currentPhase: input.currentPhase ?? null,
    phases: input.phases ?? [],
    summary: input.summary ?? { total: 0, byStatus: emptyStatusCounts() },
    metadata: input.metadata ?? { available: false, phaseOrder: [], dependencies: {} },
    recommendation: input.recommendation ?? unavailableRecommendation(),
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
  }
}

function makeLogResult(input: {
  locale: Locale
  localeFallback: boolean
  ok: boolean
  root: string | null
  logPath?: string | null
  phase?: string
  operator?: string
  lastN: number
  events?: WorkflowEvent[]
  skippedMalformed?: number
  warnings?: string[]
  errors?: WorkflowError[]
}): WorkflowLogResult {
  return {
    schemaVersion: SCHEMA_VERSION,
    readonly: true,
    ok: input.ok,
    root: input.root,
    locale: input.locale,
    localeFallback: input.localeFallback,
    logPath: input.logPath ?? null,
    filters: { phase: input.phase ?? null, operator: input.operator ?? null, lastN: input.lastN },
    events: input.events ?? [],
    skippedMalformed: input.skippedMalformed ?? 0,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
  }
}

function emptyStatusCounts(): Record<WorkflowPhaseStatus, number> & { unknown: number } {
  return { ...Object.fromEntries(WORKFLOW_PHASE_STATUSES.map((status) => [status, 0])), unknown: 0 } as Record<WorkflowPhaseStatus, number> & { unknown: number }
}

function continueRecommendation(phase: string): WorkflowRecommendation {
  return { id: "continue-current-phase", messageKey: "workflow.recommendationContinue", phase }
}

function unavailableRecommendation(): WorkflowRecommendation {
  return { id: "unavailable", messageKey: "workflow.recommendationUnavailable", phase: null }
}

function isWorkflowPhaseStatus(value: string): value is WorkflowPhaseStatus {
  return (WORKFLOW_PHASE_STATUSES as readonly string[]).includes(value)
}

function renderPhaseRow(locale: Locale, phase: WorkflowPhaseRow): string {
  return `| ${escapePipes(phase.id)} | ${escapePipes(phase.status)} | ${escapePipes(phase.completedAt ?? t(locale, "workflow.none"))} | ${phase.knownStatus ? "true" : "false"} |`
}

function renderEventRow(locale: Locale, event: WorkflowEvent): string {
  return `| ${escapePipes(event.timestamp ?? t(locale, "workflow.none"))} | ${escapePipes(event.phase ?? t(locale, "workflow.none"))} | ${escapePipes(event.operator ?? t(locale, "workflow.none"))} | ${escapePipes(event.action ?? t(locale, "workflow.none"))} | ${escapePipes(formatEventResult(event.result, locale))} |`
}

function renderStringList(locale: Locale, items: string[]): string {
  if (items.length === 0) return `- ${t(locale, "workflow.none")}`
  return items.map((item) => `- ${item}`).join("\n")
}

function formatEventResult(value: unknown, locale: Locale): string {
  if (value === null || value === undefined) return t(locale, "workflow.none")
  if (typeof value === "string") return value
  return JSON.stringify(value)
}

function escapePipes(input: string): string {
  return input.replace(/\|/g, "\\|")
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
