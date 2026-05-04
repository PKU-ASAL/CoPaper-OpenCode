import { createHash } from "node:crypto"
import { appendFileSync, lstatSync, mkdirSync, readFileSync, readdirSync, type Stats } from "node:fs"
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path"
import { assertInsideRoot, writeFileAtomic } from "./fs-utils"
import { resolveLocale, t } from "./i18n"
import { detectRoot } from "./root"
import { ARTIFACT_CONFIDENCE, ARTIFACT_RECORD_IDS, ARTIFACT_STATUSES, SCHEMA_VERSION, type ArtifactConfidence, type ArtifactReadinessRecord, type ArtifactRecordError, type ArtifactRecordId, type ArtifactRecordOptions, type ArtifactRecordResult, type ArtifactStatus, type Locale } from "./types"

interface ValidArtifactRecordInput {
  artifact: ArtifactRecordId
  status: ArtifactStatus
  confidence: ArtifactConfidence
  evidence: string[]
  reason: string
}

const CANONICAL_EVENT_LOG_PATH = ".agents/events.jsonl"

export async function recordArtifactReadiness(options: ArtifactRecordOptions): Promise<ArtifactRecordResult> {
  const resolved = resolveLocale(options.locale, options.env)
  let root: string
  try {
    root = (await detectRoot({ cwd: options.cwd ?? process.cwd(), explicitRoot: options.root, worktree: options.worktree })).root
  } catch (error) {
    return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root: null, artifact: options.artifact, errors: [{ code: "root-detection-failed", message: `Failed to detect project root: ${errorMessage(error)}` }] })
  }

  if (options.agent !== undefined && options.agent !== "vibepaper-recorder") {
    return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root, artifact: options.artifact, errors: [{ code: "agent-not-authorized", message: `Agent "${options.agent}" is not authorized to record artifact readiness.` }] })
  }

  const validation = validateOptions(options)
  if (!validation.ok) {
    return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root, artifact: options.artifact, errors: validation.errors })
  }

  const stateResult = readState(root)
  if (!stateResult.ok) {
    return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root, artifact: validation.input.artifact, errors: [stateResult.error] })
  }

  const stateLogPath = eventLogPathFromState(stateResult.state)
  const logPathPreflight = preflightArtifactEventLogPath(root, stateLogPath)
  if (!logPathPreflight.ok) {
    return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root, artifact: validation.input.artifact, errors: [logPathPreflight.error] })
  }
  const relativeLogPath = logPathPreflight.projectPath

  const timestamp = (options.now ?? new Date()).toISOString()
  const currentContentHash = resolveContentHash(root, validation.input.artifact, options.contentHash)
  const warnings = currentContentHash === null && options.contentHash === undefined ? ["content-hash-unavailable"] : []
  const record = buildRecord(validation.input, timestamp, currentContentHash)
  const artifacts = isRecord(stateResult.state.artifacts) ? stateResult.state.artifacts : {}
  const previousRecordCandidate = artifacts[validation.input.artifact]
  const previousRecord = isArtifactReadinessRecord(previousRecordCandidate) ? previousRecordCandidate : null
  const nextState = {
    ...stateResult.state,
    artifacts: {
      ...artifacts,
      [validation.input.artifact]: record,
    },
  }

  try {
    writeState(root, nextState)
  } catch (error) {
    return makeResult({
      locale: resolved.locale,
      localeFallback: resolved.fallback,
      ok: false,
      root,
      artifact: validation.input.artifact,
      previousRecord,
      record,
      currentContentHash,
      warnings,
      errors: [{ code: "write-failed", path: ".agents/state.json", message: `Failed to write artifact readiness: ${errorMessage(error)}` }],
    })
  }

  try {
    appendArtifactEvent(root, relativeLogPath, buildRecordEvent(validation.input, timestamp, currentContentHash))
  } catch (error) {
    return makeResult({
      locale: resolved.locale,
      localeFallback: resolved.fallback,
      ok: false,
      root,
      artifact: validation.input.artifact,
      previousRecord,
      record,
      currentContentHash,
      eventAppended: false,
      warnings: [...warnings, "state-written-event-failed"],
      errors: [{ code: "event-log-failed", path: relativeLogPath, message: `Failed to append artifact readiness event: ${errorMessage(error)}` }],
    })
  }

  return makeResult({
    locale: resolved.locale,
    localeFallback: resolved.fallback,
    ok: true,
    root,
    artifact: validation.input.artifact,
    previousRecord,
    record,
    currentContentHash,
    eventAppended: true,
    warnings,
  })
}

export function renderArtifactRecordOutput(result: ArtifactRecordResult): string {
  const locale = result.locale
  return `## ${t(locale, "artifact.recordTitle")}

${result.ok ? t(locale, "artifact.recordSuccess") : t(locale, "artifact.recordFailed")}

**${t(locale, "artifact.artifact")}:** ${result.artifact ?? t(locale, "artifact.none")}
**${t(locale, "workflow.action")}:** record_artifact_readiness
**${t(locale, "artifact.artifactStatus")}:** ${result.record?.status ?? t(locale, "artifact.none")}
**${t(locale, "artifact.confidence")}:** ${result.record?.confidence ?? t(locale, "artifact.none")}

### ${t(locale, "artifact.warnings")}

${renderStringList(locale, result.warnings)}

### ${t(locale, "workflow.errors")}

${renderStringList(locale, result.errors.map((error) => `${error.code}${error.path ? ` (${error.path})` : ""}: ${error.message}`))}

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
`
}

function validateOptions(options: ArtifactRecordOptions): { ok: true; input: ValidArtifactRecordInput } | { ok: false; errors: ArtifactRecordError[] } {
  const errors: ArtifactRecordError[] = []
  if (!isArtifactRecordId(options.artifact)) errors.push({ code: "invalid-artifact", message: `Unsupported artifact for readiness recording: ${options.artifact}` })
  if (!isArtifactStatus(options.status)) errors.push({ code: "invalid-status", message: `Unsupported artifact status: ${options.status}` })
  if (!isArtifactConfidence(options.confidence)) errors.push({ code: "invalid-confidence", message: `Unsupported artifact confidence: ${options.confidence}` })

  const rawEvidence = Array.isArray(options.evidence) ? options.evidence : []
  const evidence = rawEvidence.map((item) => typeof item === "string" ? item.trim() : "").filter((item) => item !== "")
  if (evidence.length === 0 || evidence.length !== rawEvidence.length) errors.push({ code: "missing-evidence", message: "Artifact readiness recording requires non-empty evidence." })

  const reason = typeof options.reason === "string" ? options.reason.trim() : ""
  if (reason === "") errors.push({ code: "missing-reason", message: "Artifact readiness recording requires a non-empty reason." })

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, input: { artifact: options.artifact as ArtifactRecordId, status: options.status as ArtifactStatus, confidence: options.confidence as ArtifactConfidence, evidence, reason } }
}

function readState(root: string): { ok: true; state: Record<string, unknown> } | { ok: false; error: ArtifactRecordError } {
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
  if (parsed.artifacts !== undefined && !isRecord(parsed.artifacts)) return { ok: false, error: { code: "invalid-state", path: ".agents/state.json", message: "state.artifacts must be an object when present." } }
  return { ok: true, state: parsed }
}

function writeState(root: string, state: Record<string, unknown>): void {
  const statePath = join(root, ".agents", "state.json")
  assertInsideRoot(root, statePath)
  writeFileAtomic(statePath, `${JSON.stringify(state, null, 2)}\n`)
}

function buildRecord(input: ValidArtifactRecordInput, timestamp: string, currentContentHash: string | null): ArtifactReadinessRecord {
  const record: ArtifactReadinessRecord = {
    status: input.status,
    confidence: input.confidence,
    evidence: input.evidence,
    provenance: { source: "opencode", operator: "user", reason: input.reason },
    updated_at: timestamp,
  }
  if (currentContentHash !== null) record.content_hash = currentContentHash
  return record
}

function buildRecordEvent(input: ValidArtifactRecordInput, timestamp: string, currentContentHash: string | null): Record<string, unknown> {
  return {
    timestamp,
    operator: "user",
    action: "record_artifact_readiness",
    result: "success",
    metadata: {
      artifact: input.artifact,
      status: input.status,
      confidence: input.confidence,
      evidence: input.evidence,
      reason: input.reason,
      content_hash: currentContentHash,
    },
  }
}

function eventLogPathFromState(state: Record<string, unknown>): string {
  return typeof state.event_log_path === "string" && state.event_log_path.trim() !== "" ? state.event_log_path : ".agents/events.jsonl"
}

function appendArtifactEvent(root: string, projectPath: string, event: Record<string, unknown>): void {
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

function preflightArtifactEventLogPath(root: string, projectPath: string): { ok: true; projectPath: string } | { ok: false; error: ArtifactRecordError } {
  const normalizedPath = normalizeEventLogProjectPath(projectPath)
  if (normalizedPath !== CANONICAL_EVENT_LOG_PATH) {
    return { ok: false, error: { code: "event-log-failed", path: projectPath, message: `Event log path must be ${CANONICAL_EVENT_LOG_PATH}.` } }
  }

  try {
    const logPath = safeEventLogPath(root, normalizedPath)
    const statePath = join(root, ".agents", "state.json")
    if (resolve(logPath) === resolve(statePath)) {
      return { ok: false, error: { code: "event-log-failed", path: projectPath, message: "Event log path must not target .agents/state.json." } }
    }
  } catch (error) {
    return { ok: false, error: { code: "event-log-failed", path: projectPath, message: `Failed to resolve event log path: ${errorMessage(error)}` } }
  }
  return { ok: true, projectPath: normalizedPath }
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

function resolveContentHash(root: string, artifact: ArtifactRecordId, override: string | undefined): string | null {
  if (typeof override === "string") return override
  return hashArtifactContent(root, artifact)
}

function hashArtifactContent(root: string, artifact: ArtifactRecordId): string | null {
  if (artifact === "storyline") return hashProjectFile(root, "storyline.md")
  if (artifact === "paper") return hashProjectFile(root, "paper.md")
  if (artifact === "cross_index") return hashProjectFile(root, ".agents/cross_index.json")
  if (artifact === "checker_results") return hashProjectFile(root, ".agents/precheck_report.md")
  return hashProjectTree(root, "relatedwork")
}

function hashProjectFile(root: string, projectPath: string): string | null {
  const target = join(root, projectPath)
  try {
    const stat = lstatSync(target)
    if (stat.isSymbolicLink()) return null
    assertInsideRoot(root, target)
    if (!stat.isFile()) return null
    const hash = createHash("sha256")
    hash.update(projectPath)
    hash.update(readFileSync(target))
    return `sha256:${hash.digest("hex")}`
  } catch {
    return null
  }
}

function hashProjectTree(root: string, projectPath: string): string | null {
  const target = join(root, projectPath)
  try {
    const stat = lstatSync(target)
    if (stat.isSymbolicLink()) return null
    assertInsideRoot(root, target)
    if (!stat.isDirectory()) return null
    const hash = createHash("sha256")
    hashDirectory(hash, root, target)
    return `sha256:${hash.digest("hex")}`
  } catch {
    return null
  }
}

function hashDirectory(hash: ReturnType<typeof createHash>, root: string, directory: string): void {
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))
  for (const entry of entries) {
    const child = join(directory, entry.name)
    const stat = lstatSync(child)
    if (stat.isSymbolicLink()) continue
    assertInsideRoot(root, child)
    const relativePath = relative(root, child).split(sep).join("/")
    hash.update(relativePath)
    if (stat.isDirectory()) hashDirectory(hash, root, child)
    else if (stat.isFile()) hash.update(readFileSync(child))
  }
}

function makeResult(input: {
  locale: Locale
  localeFallback: boolean
  ok: boolean
  root: string | null
  artifact?: ArtifactRecordId | string | null
  previousRecord?: ArtifactReadinessRecord | null
  record?: ArtifactReadinessRecord | null
  currentContentHash?: string | null
  eventAppended?: boolean
  stale?: boolean
  warnings?: string[]
  errors?: ArtifactRecordError[]
}): ArtifactRecordResult {
  return {
    schemaVersion: SCHEMA_VERSION,
    ok: input.ok,
    root: input.root,
    locale: input.locale,
    localeFallback: input.localeFallback,
    artifact: input.artifact ?? null,
    previousRecord: input.previousRecord ?? null,
    record: input.record ?? null,
    stale: input.stale ?? false,
    currentContentHash: input.currentContentHash ?? null,
    eventAppended: input.eventAppended ?? false,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
  }
}

function renderStringList(locale: Locale, items: string[]): string {
  if (items.length === 0) return `- ${t(locale, "artifact.none")}`
  return items.map((item) => `- ${item}`).join("\n")
}

function isArtifactRecordId(value: string): value is ArtifactRecordId {
  return (ARTIFACT_RECORD_IDS as readonly string[]).includes(value)
}

function isArtifactStatus(value: string): value is ArtifactStatus {
  return (ARTIFACT_STATUSES as readonly string[]).includes(value)
}

function isArtifactConfidence(value: string): value is ArtifactConfidence {
  return (ARTIFACT_CONFIDENCE as readonly string[]).includes(value)
}

function isArtifactReadinessRecord(value: unknown): value is ArtifactReadinessRecord {
  if (!isRecord(value)) return false
  if (typeof value.status !== "string" || !isArtifactStatus(value.status)) return false
  if (typeof value.confidence !== "string" || !isArtifactConfidence(value.confidence)) return false
  if (!Array.isArray(value.evidence) || !value.evidence.every((item) => typeof item === "string")) return false
  if (!isRecord(value.provenance) || typeof value.provenance.reason !== "string") return false
  return typeof value.updated_at === "string"
}

function lstatIfExists(path: string): Stats | null {
  try {
    return lstatSync(path) ?? null
  } catch (error) {
    if (isMissingPathError(error)) return null
    throw error
  }
}

function isMissingPathError(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
