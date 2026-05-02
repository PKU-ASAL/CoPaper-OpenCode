import { createHash } from "node:crypto"
import { existsSync, lstatSync, readFileSync, readdirSync, type Dirent, type Stats } from "node:fs"
import { isAbsolute, join } from "node:path"
import { assertInsideRoot } from "./fs-utils"
import { resolveLocale, t } from "./i18n"
import { detectRoot } from "./root"
import { ARTIFACT_RECORD_IDS, ARTIFACT_STATUSES, SCHEMA_VERSION, type ArtifactConfidence, type ArtifactError, type ArtifactId, type ArtifactReadinessRecord, type ArtifactRecordId, type ArtifactRecommendation, type ArtifactRow, type ArtifactStatus, type ArtifactStatusResult, type ArtifactSummary, type Locale, type RecordedArtifactReadiness } from "./types"

export interface ArtifactStatusOptions {
  root?: string
  cwd?: string
  worktree?: string
  locale?: string
  env?: Record<string, string | undefined>
}

type LabelKey = ArtifactRow["labelKey"]

interface StateInspection {
  status: "valid" | "missing" | "invalid"
  warnings: string[]
  records: Map<ArtifactRecordId, ArtifactReadinessRecord>
  extraRecords: Record<string, unknown>
}

type FileReadResult = {
  ok: true
  content: string
  stat: Stats
} | {
  ok: false
  status: ArtifactStatus
  confidence: ArtifactConfidence
  warnings: string[]
  evidence: string[]
  updatedAt: string | null
}

type PathInspection = {
  ok: true
  path: string
  stat: Stats
} | {
  ok: false
  status: ArtifactStatus
  confidence: ArtifactConfidence
  warning: string | null
  updatedAt: string | null
}

const LABEL_KEYS: Record<ArtifactId, LabelKey> = {
  storyline: "artifact.label.storyline",
  paper: "artifact.label.paper",
  relatedwork: "artifact.label.relatedwork",
  cross_index: "artifact.label.cross_index",
  skills: "artifact.label.skills",
  checker_results: "artifact.label.checker_results",
}

export async function buildArtifactStatus(options: ArtifactStatusOptions): Promise<ArtifactStatusResult> {
  const resolved = resolveLocale(options.locale, options.env)
  let root: string
  try {
    root = (await detectRoot({ cwd: options.cwd ?? process.cwd(), explicitRoot: options.root, worktree: options.worktree })).root
  } catch (error) {
    return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root: null, errors: [{ code: "root-detection-failed", message: `Failed to detect project root: ${errorMessage(error)}` }] })
  }

  const state = inspectState(root)
  const scanned = [
    inspectStoryline(root),
    inspectPaper(root),
    inspectRelatedwork(root),
    inspectCrossIndex(root),
    inspectSkills(root),
    inspectCheckerResults(root, state),
  ]
  const recordedArtifacts = buildRecordedReadiness(root, state.records)
  const artifacts = scanned.map((artifact) => attachRecordedReadiness(artifact, recordedArtifacts))
  const recommendation = chooseRecommendation(artifacts)

  return makeResult({
    locale: resolved.locale,
    localeFallback: resolved.fallback,
    ok: true,
    root,
    artifacts,
    recordedArtifacts,
    summary: summarizeArtifacts(artifacts, recommendation),
    recommendation,
    warnings: state.warnings,
  })
}

export function renderArtifactStatusOutput(result: ArtifactStatusResult): string {
  const locale = result.locale
  const none = t(locale, "artifact.none")
  const rows = result.artifacts.length > 0 ? result.artifacts.map((artifact) => renderArtifactRow(locale, artifact)).join("\n") : `| ${none} | ${none} | ${none} | ${none} | ${none} |`
  const warnings = renderStringList(locale, result.warnings)

  return `## ${t(locale, "artifact.statusTitle")}

${result.ok ? t(locale, "artifact.statusReady") : t(locale, "artifact.statusUnavailable")}

| ${t(locale, "artifact.artifact")} | ${t(locale, "artifact.artifactStatus")} | ${t(locale, "artifact.confidence")} | ${t(locale, "artifact.evidence")} | ${t(locale, "artifact.recommendation")} |
|---|---|---|---|---|
${rows}

### ${t(locale, "artifact.warnings")}

${warnings}

### ${t(locale, "artifact.recommendation")}

${t(locale, result.recommendation.messageKey)}${result.recommendation.command ? `\n\n\`${result.recommendation.command}\`` : ""}

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
`
}

export function inspectStoryline(root: string): ArtifactRow {
  return inspectMarkdownArtifact(root, "storyline", "storyline.md", {
    templateMarkers: ["Capture the problem, central claim, evidence plan, and reader journey", "###### Research Thread"],
    readySections: 2,
  })
}

export function inspectPaper(root: string): ArtifactRow {
  return inspectMarkdownArtifact(root, "paper", "paper.md", {
    templateMarkers: ["Draft the manuscript here as the storyline, evidence, and review phases mature", "###### Manuscript Workspace"],
    readySections: 3,
  })
}

export function inspectRelatedwork(root: string): ArtifactRow {
  const path = "relatedwork"
  const directory = inspectProjectPath(root, path, "directory")
  if (!directory.ok) return row("relatedwork", `${path}/`, directory.status, directory.confidence, { warnings: warningList(directory.warning), updatedAt: directory.updatedAt })

  const evidence: string[] = ["directory-present"]
  const warnings: string[] = []
  const literature = inspectLiteratureJson(root)
  if (literature.present) {
    evidence.push(`literature-entries=${literature.entries}`)
    warnings.push(...literature.warnings)
  }

  const bib = inspectRegularFile(root, "relatedwork/paper_list.bib")
  if (bib.present) evidence.push("bib-present")
  else if (bib.warning) warnings.push(bib.warning)

  const summaryCount = countSummaryFiles(root)
  if (summaryCount > 0) evidence.push(`paper-summaries=${summaryCount}`)

  const crossIndex = inspectRegularFile(root, ".agents/cross_index.json")
  if (crossIndex.present) evidence.push("cross-index-present")

  const status: ArtifactStatus = literature.entries > 0 && bib.present && summaryCount >= literature.entries && crossIndex.present ? "ready" : evidence.length > 0 ? "partial" : "missing"
  const confidence: ArtifactConfidence = status === "ready" ? "high" : status === "partial" ? "medium" : "high"
  return row("relatedwork", `${path}/`, status, confidence, { evidence, warnings, updatedAt: directory.stat.mtime.toISOString() })
}

export function inspectCrossIndex(root: string): ArtifactRow {
  const result = readRegularFile(root, ".agents/cross_index.json")
  if (!result.ok) return row("cross_index", ".agents/cross_index.json", result.status, result.confidence, result)

  try {
    const parsed = JSON.parse(result.content)
    const evidence = ["cross-index-present", `bytes=${Buffer.byteLength(result.content, "utf8")}`]
    if (!isRecord(parsed) && !Array.isArray(parsed)) {
      return row("cross_index", ".agents/cross_index.json", "unknown", "low", { evidence, warnings: ["cross-index-json-invalid"], updatedAt: result.stat.mtime.toISOString() })
    }
    return row("cross_index", ".agents/cross_index.json", "ready", "high", { evidence, updatedAt: result.stat.mtime.toISOString() })
  } catch {
    return row("cross_index", ".agents/cross_index.json", "unknown", "low", { evidence: ["cross-index-present"], warnings: ["cross-index-json-invalid"], updatedAt: result.stat.mtime.toISOString() })
  }
}

export function inspectSkills(root: string): ArtifactRow {
  const path = ".agents/skills"
  const directory = inspectProjectPath(root, path, "directory")
  if (!directory.ok) return row("skills", `${path}/`, directory.status, directory.confidence, { warnings: warningList(directory.warning), updatedAt: directory.updatedAt })

  let skillCount = 0
  for (const entry of readdirSync(directory.path, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const skillPath = join(directory.path, entry.name, "SKILL.md")
    try {
      if (lstatSync(skillPath).isFile()) skillCount += 1
    } catch {
      continue
    }
  }

  const evidence = [`skill-count=${skillCount}`]
  const status: ArtifactStatus = skillCount >= 5 ? "ready" : skillCount > 0 ? "partial" : "missing"
  const confidence: ArtifactConfidence = status === "ready" ? "high" : status === "partial" ? "medium" : "high"
  return row("skills", `${path}/`, status, confidence, { evidence, updatedAt: directory.stat.mtime.toISOString() })
}

export function inspectCheckerResults(root: string, state = inspectState(root)): ArtifactRow {
  if (state.status !== "valid") {
    return row("checker_results", ".agents/precheck_report.md", "unknown", "low", { warnings: state.warnings })
  }

  const precheck = readRegularFile(root, ".agents/precheck_report.md")
  if (!precheck.ok) return row("checker_results", ".agents/precheck_report.md", precheck.status, precheck.confidence, precheck)

  const evidence = ["precheck-report-present"]
  const warnings: string[] = []
  const paper = statRegularFile(root, "paper.md")
  let status: ArtifactStatus = "ready"
  let confidence: ArtifactConfidence = "high"
  if (paper.ok && precheck.stat.mtimeMs < paper.stat.mtimeMs) {
    status = "stale"
    confidence = "medium"
    warnings.push("checker-results-older-than-paper")
  }

  return row("checker_results", ".agents/precheck_report.md", status, confidence, { evidence, warnings, updatedAt: precheck.stat.mtime.toISOString() })
}

function inspectMarkdownArtifact(root: string, id: "storyline" | "paper", path: string, options: { templateMarkers: string[]; readySections: number }): ArtifactRow {
  const result = readRegularFile(root, path)
  if (!result.ok) return row(id, path, result.status, result.confidence, result)

  const content = result.content
  const sections = countSubstantiveSections(content)
  const evidence = [`substantive-sections=${sections}`, `bytes=${Buffer.byteLength(content, "utf8")}`]
  if (isTemplateContent(content, options.templateMarkers)) {
    return row(id, path, "template", "high", { evidence, updatedAt: result.stat.mtime.toISOString() })
  }

  const status: ArtifactStatus = sections >= options.readySections ? "ready" : content.trim() === "" ? "missing" : "partial"
  const confidence: ArtifactConfidence = status === "ready" ? "high" : status === "partial" ? "medium" : "high"
  return row(id, path, status, confidence, { evidence, updatedAt: result.stat.mtime.toISOString() })
}

function readRegularFile(root: string, path: string): FileReadResult {
  const file = inspectProjectPath(root, path, "file")
  if (!file.ok) return { ok: false, status: file.status, confidence: file.confidence, warnings: warningList(file.warning), evidence: [], updatedAt: file.updatedAt }

  try {
    return { ok: true, content: readFileSync(file.path, "utf8"), stat: file.stat }
  } catch {
    return { ok: false, status: "unknown", confidence: "low", warnings: ["read-failed"], evidence: [], updatedAt: file.stat.mtime.toISOString() }
  }
}

function statRegularFile(root: string, path: string): { ok: true; stat: Stats } | { ok: false } {
  const file = inspectProjectPath(root, path, "file")
  if (!file.ok) return { ok: false }
  return { ok: true, stat: file.stat }
}

function inspectRegularFile(root: string, path: string): { present: boolean; warning: string | null } {
  const file = inspectProjectPath(root, path, "file")
  if (!file.ok) return { present: false, warning: file.warning }
  return { present: true, warning: null }
}

function inspectLiteratureJson(root: string): { present: boolean; entries: number; warnings: string[] } {
  const result = readRegularFile(root, "relatedwork/literature.json")
  if (!result.ok) return { present: result.status !== "missing", entries: 0, warnings: result.warnings }

  try {
    const parsed = JSON.parse(result.content)
    return { present: true, entries: countLiteratureEntries(parsed), warnings: [] }
  } catch {
    return { present: true, entries: 0, warnings: ["literature-json-invalid"] }
  }
}

function countLiteratureEntries(value: unknown): number {
  if (Array.isArray(value)) return value.length
  if (isRecord(value)) {
    for (const key of ["papers", "entries", "items", "literature"]) {
      const candidate = value[key]
      if (Array.isArray(candidate)) return candidate.length
      if (isRecord(candidate)) return Object.keys(candidate).length
    }
    const metadataKeys = new Set(["version", "updated_at", "updatedAt", "schema_version"])
    return Object.keys(value).filter((key) => !metadataKeys.has(key)).length
  }
  return 0
}

function countSummaryFiles(root: string): number {
  return countMarkdownFilesUnder(root, "relatedwork/papers") + countMarkdownFilesUnder(root, "relatedwork/summaries")
}

function countMarkdownFilesUnder(root: string, path: string): number {
  const directory = inspectProjectPath(root, path, "directory")
  if (!directory.ok) return 0
  return countMarkdownFiles(directory.path)
}

function countMarkdownFiles(directory: string): number {
  let count = 0
  let entries: Dirent[]
  try {
    entries = readdirSync(directory, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const entry of entries) {
    const child = join(directory, entry.name)
    if (entry.isDirectory()) count += countMarkdownFiles(child)
    else if (entry.isFile() && entry.name.endsWith(".md")) count += 1
  }
  return count
}

function inspectState(root: string): StateInspection {
  const empty = { records: new Map<ArtifactRecordId, ArtifactReadinessRecord>(), extraRecords: {} }
  const state = readRegularFile(root, ".agents/state.json")
  if (!state.ok) {
    if (state.status === "missing") return { status: "missing", warnings: ["state-json-missing"], ...empty }
    return { status: "invalid", warnings: ["state-json-invalid", ...state.warnings], ...empty }
  }
  try {
    const parsed = JSON.parse(state.content)
    if (!isRecord(parsed)) return { status: "invalid", warnings: ["state-json-invalid"], ...empty }
    const records = new Map<ArtifactRecordId, ArtifactReadinessRecord>()
    const extraRecords: Record<string, unknown> = {}
    if (isRecord(parsed.artifacts)) {
      for (const [artifact, value] of Object.entries(parsed.artifacts)) {
        if (isArtifactRecordId(artifact) && isArtifactReadinessRecord(value)) records.set(artifact, value)
        else extraRecords[artifact] = value
      }
    }
    return { status: "valid", warnings: [], records, extraRecords }
  } catch {
    return { status: "invalid", warnings: ["state-json-invalid"], ...empty }
  }
}

function buildRecordedReadiness(root: string, records: Map<ArtifactRecordId, ArtifactReadinessRecord>): RecordedArtifactReadiness[] {
  return ARTIFACT_RECORD_IDS.map((artifact) => {
    const record = records.get(artifact) ?? null
    const currentContentHash = hashArtifactContent(root, artifact)
    const warnings: string[] = []
    let stale = false
    if (record?.content_hash && currentContentHash !== null && record.content_hash !== currentContentHash) {
      stale = true
      warnings.push("recorded-content-hash-mismatch")
    }
    return { artifact, record, stale, currentContentHash, warnings }
  })
}

function attachRecordedReadiness(artifact: ArtifactRow, recordedArtifacts: RecordedArtifactReadiness[]): ArtifactRow {
  const recorded = isArtifactRecordId(artifact.id) ? recordedArtifacts.find((item) => item.artifact === artifact.id) ?? null : null
  if (recorded === null || (recorded.record === null && recorded.warnings.length === 0)) return { ...artifact, recorded: null }
  return {
    ...artifact,
    recorded,
    warnings: [...artifact.warnings, ...recorded.warnings],
    metadata: { ...artifact.metadata, recorded },
  }
}

function hashArtifactContent(root: string, artifact: ArtifactRecordId): string | null {
  try {
    if (artifact === "storyline") return hashProjectFile(root, "storyline.md")
    if (artifact === "paper") return hashProjectFile(root, "paper.md")
    if (artifact === "cross_index") return hashProjectFile(root, ".agents/cross_index.json")
    if (artifact === "checker_results") return hashProjectFile(root, ".agents/precheck_report.md")
    return hashProjectTree(root, "relatedwork")
  } catch {
    return null
  }
}

function hashProjectFile(root: string, projectPath: string): string | null {
  try {
    const file = inspectProjectPath(root, projectPath, "file")
    if (!file.ok || !existsSync(file.path)) return null
    const hash = createHash("sha256")
    hash.update(projectPath)
    hash.update(readFileSync(file.path))
    return `sha256:${hash.digest("hex")}`
  } catch {
    return null
  }
}

function hashProjectTree(root: string, projectPath: string): string | null {
  try {
    const directory = inspectProjectPath(root, projectPath, "directory")
    if (!directory.ok || !existsSync(directory.path)) return null
    const hash = createHash("sha256")
    hashDirectory(hash, root, directory.path)
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
    const relativePath = child.slice(root.length + 1)
    hash.update(relativePath)
    if (stat.isDirectory()) hashDirectory(hash, root, child)
    else if (stat.isFile()) hash.update(readFileSync(child))
  }
}

function isArtifactRecordId(value: string): value is ArtifactRecordId {
  return (ARTIFACT_RECORD_IDS as readonly string[]).includes(value)
}

function isArtifactReadinessRecord(value: unknown): value is ArtifactReadinessRecord {
  if (!isRecord(value)) return false
  if (typeof value.status !== "string" || !(ARTIFACT_STATUSES as readonly string[]).includes(value.status)) return false
  if (typeof value.confidence !== "string" || !["low", "medium", "high"].includes(value.confidence)) return false
  if (!Array.isArray(value.evidence) || !value.evidence.every((item) => typeof item === "string")) return false
  if (!isRecord(value.provenance) || typeof value.provenance.reason !== "string") return false
  return typeof value.updated_at === "string"
}

function countSubstantiveSections(content: string): number {
  const lines = content.split(/\r?\n/)
  let count = 0
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index]?.startsWith("###### ")) continue
    const bodyLines: string[] = []
    for (let bodyIndex = index + 1; bodyIndex < lines.length; bodyIndex += 1) {
      const line = lines[bodyIndex] ?? ""
      if (line.startsWith("#")) break
      if (line.trim().startsWith("<!--")) continue
      if (line.trim() !== "") bodyLines.push(line.trim())
    }
    if (bodyLines.join(" ").length >= 40) count += 1
  }
  return count
}

function isTemplateContent(content: string, markers: string[]): boolean {
  return markers.some((marker) => content.includes(marker))
}

function inspectProjectPath(root: string, projectPath: string, expected: "file" | "directory"): PathInspection {
  const target = resolveProjectPath(root, projectPath)
  try {
    assertInsideRoot(root, target)
  } catch {
    return { ok: false, status: "unknown", confidence: "low", warning: "path-outside-root", updatedAt: null }
  }

  let stat: Stats
  try {
    stat = lstatSync(target)
  } catch (error) {
    if (isMissingPathError(error)) return { ok: false, status: "missing", confidence: "high", warning: null, updatedAt: null }
    return { ok: false, status: "unknown", confidence: "low", warning: "read-failed", updatedAt: null }
  }

  if (stat.isSymbolicLink()) return { ok: false, status: "unknown", confidence: "low", warning: "path-is-symlink", updatedAt: stat.mtime.toISOString() }
  if (expected === "file" && !stat.isFile()) return { ok: false, status: "unknown", confidence: "low", warning: "path-not-file", updatedAt: stat.mtime.toISOString() }
  if (expected === "directory" && !stat.isDirectory()) return { ok: false, status: "unknown", confidence: "low", warning: "path-not-directory", updatedAt: stat.mtime.toISOString() }
  return { ok: true, path: target, stat }
}

function resolveProjectPath(root: string, projectPath: string): string {
  const target = isAbsolute(projectPath) ? projectPath : join(root, projectPath)
  return target
}

function warningList(warning: string | null): string[] {
  return warning ? [warning] : []
}

function row(id: ArtifactId, path: string, status: ArtifactStatus, confidence: ArtifactConfidence, input: { evidence?: string[]; warnings?: string[]; updatedAt?: string | null; metadata?: Record<string, unknown> } = {}): ArtifactRow {
  const updatedAt = input.updatedAt ?? null
  return {
    id,
    labelKey: LABEL_KEYS[id],
    path,
    status,
    confidence,
    evidence: input.evidence ?? [],
    warnings: input.warnings ?? [],
    recommendation: recommendationForArtifact(id, status),
    metadata: { path, updatedAt, ...(input.metadata ?? {}) },
    updatedAt,
    recorded: null,
  }
}

function summarizeArtifacts(artifacts: ArtifactRow[], recommendation = chooseRecommendation(artifacts)): ArtifactSummary {
  const byStatus = emptyArtifactStatusCounts()
  for (const artifact of artifacts) byStatus[artifact.status] += 1
  const recordedStaleCount = artifacts.filter((artifact) => artifact.recorded?.stale).length
  return {
    total: artifacts.length,
    byStatus,
    readyOrPartial: artifacts.filter((artifact) => artifact.status === "ready" || artifact.status === "partial").length,
    readyCount: byStatus.ready,
    blockedCount: byStatus.missing + byStatus.template + byStatus.unknown,
    staleCount: byStatus.stale + recordedStaleCount,
    recommendedFocus: recommendation.artifactId,
  }
}

function emptyArtifactStatusCounts(): Record<ArtifactStatus, number> {
  return Object.fromEntries(ARTIFACT_STATUSES.map((status) => [status, 0])) as Record<ArtifactStatus, number>
}

function chooseRecommendation(artifacts: ArtifactRow[]): ArtifactRecommendation {
  const byId = new Map(artifacts.map((artifact) => [artifact.id, artifact]))
  const staleRecorded = artifacts.find((artifact) => artifact.recorded?.stale)
  if (staleRecorded) return { id: "refresh-readiness", messageKey: "artifact.recommendationRefreshReadiness", artifactId: staleRecorded.id, command: null }
  const unknown = artifacts.find((artifact) => artifact.status === "unknown")
  if (unknown) return { id: "unavailable", messageKey: "artifact.recommendationUnavailable", artifactId: unknown.id, command: null }
  if (needsWork(byId.get("storyline"))) return recommendationForArtifact("storyline", byId.get("storyline")?.status ?? "missing")
  if (needsWork(byId.get("paper"))) return recommendationForArtifact("paper", byId.get("paper")?.status ?? "missing")
  if (needsWork(byId.get("relatedwork"))) return recommendationForArtifact("relatedwork", byId.get("relatedwork")?.status ?? "missing")
  if (needsWork(byId.get("cross_index"))) return recommendationForArtifact("cross_index", byId.get("cross_index")?.status ?? "missing")
  if (needsWork(byId.get("skills"))) return recommendationForArtifact("skills", byId.get("skills")?.status ?? "missing")
  const checker = byId.get("checker_results")
  if (!checker || checker.status !== "ready") return recommendationForArtifact("checker_results", checker?.status ?? "missing")
  return { id: "continue-workflow", messageKey: "artifact.recommendationContinue", artifactId: null, command: null }
}

function recommendationForArtifact(id: ArtifactId, status: ArtifactStatus): ArtifactRecommendation {
  if (status === "unknown") return { id: "unavailable", messageKey: "artifact.recommendationUnavailable", artifactId: id, command: null }
  if (id === "checker_results") {
    if (status === "ready") return { id: "continue-workflow", messageKey: "artifact.recommendationContinue", artifactId: id, command: null }
    return { id: "run-checkers", messageKey: "artifact.recommendationCheckers", artifactId: id, command: null }
  }
  if (status === "ready") return { id: "continue-workflow", messageKey: "artifact.recommendationContinue", artifactId: id, command: null }
  if (id === "storyline") return { id: "continue-storyline", messageKey: "artifact.recommendationStoryline", artifactId: id, command: null }
  if (id === "paper") return { id: "continue-paper", messageKey: "artifact.recommendationPaper", artifactId: id, command: null }
  if (id === "relatedwork") return { id: "continue-relatedwork", messageKey: "artifact.recommendationRelatedwork", artifactId: id, command: null }
  if (id === "cross_index") return { id: "continue-cross-index", messageKey: "artifact.recommendationCrossIndex", artifactId: id, command: null }
  return { id: "continue-skills", messageKey: "artifact.recommendationSkills", artifactId: id, command: null }
}

function needsWork(artifact: ArtifactRow | undefined): boolean {
  return !artifact || artifact.status === "missing" || artifact.status === "template" || artifact.status === "partial" || artifact.status === "stale"
}

function makeResult(input: {
  locale: Locale
  localeFallback: boolean
  ok: boolean
  root: string | null
  artifacts?: ArtifactRow[]
  summary?: ArtifactSummary
  recommendation?: ArtifactRecommendation
  recordedArtifacts?: RecordedArtifactReadiness[]
  warnings?: string[]
  errors?: ArtifactError[]
}): ArtifactStatusResult {
  const artifacts = input.artifacts ?? []
  const recommendation = input.recommendation ?? chooseRecommendation(artifacts)
  return {
    schemaVersion: SCHEMA_VERSION,
    readonly: true,
    ok: input.ok,
    root: input.root,
    locale: input.locale,
    localeFallback: input.localeFallback,
    artifacts,
    recordedArtifacts: input.recordedArtifacts ?? [],
    summary: input.summary ?? summarizeArtifacts(artifacts, recommendation),
    recommendation,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
  }
}

function renderArtifactRow(locale: Locale, artifact: ArtifactRow): string {
  const none = t(locale, "artifact.none")
  return `| ${escapePipes(artifact.id)} | ${artifact.status} | ${artifact.confidence} | ${escapePipes(artifact.evidence.join(", ") || none)} | ${escapePipes(t(locale, artifact.recommendation.messageKey))} |`
}

function renderStringList(locale: Locale, items: string[]): string {
  if (items.length === 0) return `- ${t(locale, "artifact.none")}`
  return items.map((item) => `- ${item}`).join("\n")
}

function escapePipes(input: string): string {
  return input.replace(/\|/g, "\\|")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isMissingPathError(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT"
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
