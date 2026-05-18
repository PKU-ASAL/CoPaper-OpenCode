import { resolveLocale, t } from "./i18n"
import { runBridge, type BridgeDeps } from "./python-bridge"
import { buildRelatedworkStatus } from "./relatedwork-status"
import { detectRoot } from "./root"
import { patchPhaseMetadata } from "./workflow"
import { SCHEMA_VERSION, type BridgeError, type BridgeResolution, type BridgeResult, type Locale, type PhasePatchResult, type RelatedworkBuildIndexOptions, type RelatedworkCleanOptions, type RelatedworkDownloadOptions, type RelatedworkImportOptions, type RelatedworkKeywordsOptions, type RelatedworkRegisterSummaryOptions, type RelatedworkSearchOptions, type RelatedworkStatusResult, type RelatedworkSummarizeOptions, type RelatedworkSyncBibOptions, type RelatedworkToolBaseOptions, type RelatedworkToolError, type RelatedworkToolErrorCode, type RelatedworkToolResult } from "./types"

const TIMEOUTS_MS: Record<string, number> = {
  keywords: 60_000,
  search: 120_000,
  import: 30_000,
  "sync-bib": 30_000,
  download: 300_000,
  summarize: 600_000,
  "register-summary": 30_000,
  "build-index": 60_000,
  clean: 30_000,
}

type WritePhase = "keywords" | "search" | "import" | "sync-bib" | "download" | "summarize" | "register-summary" | "build-index" | "clean"

const READ_ONLY_SUBCOMMANDS: ReadonlySet<WritePhase> = new Set(["keywords"])

const PHASE_ID = "literature"

export interface RelatedworkToolDeps extends BridgeDeps {
  buildStatus?: typeof buildRelatedworkStatus
  patchPhase?: typeof patchPhaseMetadata
}

interface PreparedInvocation {
  subcommand: WritePhase
  toolId: string
  args: string[]
  options: RelatedworkToolBaseOptions
  deps: RelatedworkToolDeps
}

export async function runRelatedworkKeywords(options: RelatedworkKeywordsOptions, deps: RelatedworkToolDeps = {}): Promise<RelatedworkToolResult> {
  const args: string[] = ["relatedwork", "keywords"]
  if (typeof options.source === "string" && options.source.trim() !== "") args.push("--from", options.source.trim())
  if (typeof options.count === "number" && Number.isFinite(options.count)) args.push("--count", String(Math.max(1, Math.min(30, Math.trunc(options.count)))))
  return invoke({ subcommand: "keywords", toolId: "vibepaper_relatedwork_keywords", args, options, deps })
}

export async function runRelatedworkSearch(options: RelatedworkSearchOptions, deps: RelatedworkToolDeps = {}): Promise<RelatedworkToolResult> {
  if (!Array.isArray(options.queries) || options.queries.length === 0) {
    return immediateError("vibepaper_relatedwork_search", "invalid-args", "queries must be a non-empty array of strings", options)
  }
  const args: string[] = ["relatedwork", "search"]
  for (const query of options.queries) {
    if (typeof query !== "string" || query.trim() === "") {
      return immediateError("vibepaper_relatedwork_search", "invalid-args", "Every query must be a non-empty string", options)
    }
    args.push("--query", query)
  }
  if (typeof options.queriesFile === "string" && options.queriesFile.trim() !== "") args.push("--queries-file", options.queriesFile.trim())
  if (typeof options.limit === "number" && Number.isFinite(options.limit)) args.push("--limit", String(Math.max(1, Math.trunc(options.limit))))
  return invoke({ subcommand: "search", toolId: "vibepaper_relatedwork_search", args, options, deps })
}

export async function runRelatedworkImport(options: RelatedworkImportOptions, deps: RelatedworkToolDeps = {}): Promise<RelatedworkToolResult> {
  const args: string[] = ["relatedwork", "import"]
  if (typeof options.input === "string" && options.input.trim() !== "") args.push("--input", options.input.trim())
  return invoke({ subcommand: "import", toolId: "vibepaper_relatedwork_import", args, options, deps })
}

export async function runRelatedworkSyncBib(options: RelatedworkSyncBibOptions, deps: RelatedworkToolDeps = {}): Promise<RelatedworkToolResult> {
  const args: string[] = ["relatedwork", "sync-bib"]
  return invoke({ subcommand: "sync-bib", toolId: "vibepaper_relatedwork_sync_bib", args, options, deps })
}

export async function runRelatedworkDownload(options: RelatedworkDownloadOptions, deps: RelatedworkToolDeps = {}): Promise<RelatedworkToolResult> {
  const args: string[] = ["relatedwork", "download"]
  if (typeof options.paperId === "string" && options.paperId.trim() !== "") args.push("--id", options.paperId.trim())
  if (options.all === true) args.push("--all")
  return invoke({ subcommand: "download", toolId: "vibepaper_relatedwork_download", args, options, deps })
}

export async function runRelatedworkSummarize(options: RelatedworkSummarizeOptions, deps: RelatedworkToolDeps = {}): Promise<RelatedworkToolResult> {
  const args: string[] = ["relatedwork", "summarize"]
  if (typeof options.paperId === "string" && options.paperId.trim() !== "") args.push("--paper-id", options.paperId.trim())
  if (typeof options.storyline === "string" && options.storyline.trim() !== "") args.push("--storyline", options.storyline.trim())
  if (typeof options.template === "string" && options.template.trim() !== "") args.push("--template", options.template.trim())
  return invoke({ subcommand: "summarize", toolId: "vibepaper_relatedwork_summarize", args, options, deps })
}

export async function runRelatedworkRegisterSummary(options: RelatedworkRegisterSummaryOptions, deps: RelatedworkToolDeps = {}): Promise<RelatedworkToolResult> {
  if (typeof options.paperId !== "string" || options.paperId.trim() === "") {
    return immediateError("vibepaper_relatedwork_register_summary", "invalid-args", "paperId is required", options)
  }
  if (typeof options.path !== "string" || options.path.trim() === "") {
    return immediateError("vibepaper_relatedwork_register_summary", "invalid-args", "path is required", options)
  }
  const args: string[] = ["relatedwork", "register-summary", "--paper-id", options.paperId.trim(), "--path", options.path.trim()]
  return invoke({ subcommand: "register-summary", toolId: "vibepaper_relatedwork_register_summary", args, options, deps })
}

export async function runRelatedworkBuildIndex(options: RelatedworkBuildIndexOptions, deps: RelatedworkToolDeps = {}): Promise<RelatedworkToolResult> {
  const args: string[] = ["relatedwork", "build-index"]
  return invoke({ subcommand: "build-index", toolId: "vibepaper_relatedwork_build_index", args, options, deps })
}

export async function runRelatedworkClean(options: RelatedworkCleanOptions, deps: RelatedworkToolDeps = {}): Promise<RelatedworkToolResult> {
  const args: string[] = ["relatedwork", "clean"]
  if (options.dryRun === true) args.push("--dry-run")
  return invoke({ subcommand: "clean", toolId: "vibepaper_relatedwork_clean", args, options, deps })
}

async function invoke(input: PreparedInvocation): Promise<RelatedworkToolResult> {
  const { subcommand, toolId, args, options, deps } = input
  const resolved = resolveLocale(options.locale, options.env)
  let root: string
  try {
    const detection = await detectRoot({ cwd: options.cwd ?? process.cwd(), explicitRoot: options.root, worktree: options.worktree })
    root = detection.root
  } catch (error) {
    return makeResult({
      ok: false,
      toolId,
      locale: resolved.locale,
      localeFallback: resolved.fallback,
      root: null,
      errors: [{ code: "root-detection-failed", message: `Failed to detect project root: ${errorMessage(error)}` }],
    })
  }

  const timeoutMs = options.timeoutMs ?? TIMEOUTS_MS[subcommand] ?? 60_000
  const bridgeResult = await runBridge({ root, args, timeoutMs, env: options.env }, deps)

  const phaseEventActionResult = bridgeResult.ok ? "success" : "failure"
  const statusAfter = await refreshStatus(root, resolved.locale, deps)

  const phasePatch = await maybePatchPhase({
    root,
    subcommand,
    bridge: bridgeResult,
    statusAfter,
    actionResult: phaseEventActionResult,
    now: options.now,
    deps,
  })

  const errors: RelatedworkToolError[] = []
  if (!bridgeResult.ok) errors.push(bridgeErrorToToolError(bridgeResult.error))
  if (phasePatch && !phasePatch.ok) errors.push({ code: "phase-patch-failed", message: phasePatch.errors[0]?.message ?? "phase patch failed" })

  return makeResult({
    ok: bridgeResult.ok && (phasePatch === null || phasePatch.ok),
    toolId,
    locale: resolved.locale,
    localeFallback: resolved.fallback,
    root,
    command: bridgeResult.command,
    resolution: bridgeResult.resolution,
    exitCode: bridgeResult.exitCode,
    stdout: bridgeResult.stdout,
    stderr: bridgeResult.stderr,
    durationMs: bridgeResult.durationMs,
    statusAfter,
    phasePatch,
    errors,
  })
}

async function refreshStatus(root: string, locale: Locale, deps: RelatedworkToolDeps): Promise<RelatedworkStatusResult | null> {
  try {
    return await (deps.buildStatus ?? buildRelatedworkStatus)({ root, locale })
  } catch {
    return null
  }
}

interface PatchPhaseInput {
  root: string
  subcommand: WritePhase
  bridge: BridgeResult
  statusAfter: RelatedworkStatusResult | null
  actionResult: "success" | "failure"
  now?: Date
  deps: RelatedworkToolDeps
}

async function maybePatchPhase(input: PatchPhaseInput): Promise<PhasePatchResult | null> {
  if (READ_ONLY_SUBCOMMANDS.has(input.subcommand)) return null
  if (input.statusAfter === null) return null
  const counts = input.statusAfter.counts
  const patch: Record<string, unknown> = {
    papers_found: counts.papersFound,
    papers_downloaded: counts.papersDownloaded,
    download_failures: counts.downloadFailures,
    summaries_done: counts.summariesDone,
    cross_index_built: counts.crossIndexBuilt,
    catalog_path: "relatedwork/literature.json",
  }
  const eventMetadata: Record<string, unknown> = {
    subcommand: input.subcommand,
    exit_code: input.bridge.exitCode,
    duration_ms: input.bridge.durationMs,
    resolution: input.bridge.resolution?.kind ?? null,
    counts,
  }
  if (input.bridge.command) eventMetadata.command = input.bridge.command
  if (!input.bridge.ok) eventMetadata.error = input.bridge.error
  return (input.deps.patchPhase ?? patchPhaseMetadata)({
    root: input.root,
    phase: PHASE_ID,
    patch,
    event: {
      action: `relatedwork.${input.subcommand}`,
      operator: "ai",
      result: input.actionResult,
      metadata: eventMetadata,
    },
    now: input.now,
  })
}

function bridgeErrorToToolError(error: BridgeError): RelatedworkToolError {
  return { code: error.code as RelatedworkToolErrorCode, message: error.message }
}

function immediateError(toolId: string, code: RelatedworkToolErrorCode, message: string, options: RelatedworkToolBaseOptions): RelatedworkToolResult {
  const resolved = resolveLocale(options.locale, options.env)
  return makeResult({
    ok: false,
    toolId,
    locale: resolved.locale,
    localeFallback: resolved.fallback,
    root: null,
    errors: [{ code, message }],
  })
}

function makeResult(input: {
  ok: boolean
  toolId: string
  locale: Locale
  localeFallback: boolean
  root: string | null
  command?: string | null
  resolution?: BridgeResolution | null
  exitCode?: number | null
  stdout?: string
  stderr?: string
  durationMs?: number
  statusAfter?: RelatedworkStatusResult | null
  phasePatch?: PhasePatchResult | null
  warnings?: string[]
  errors?: RelatedworkToolError[]
}): RelatedworkToolResult {
  return {
    schemaVersion: SCHEMA_VERSION,
    ok: input.ok,
    toolId: input.toolId,
    root: input.root,
    locale: input.locale,
    localeFallback: input.localeFallback,
    command: input.command ?? null,
    resolution: input.resolution ?? null,
    exitCode: input.exitCode ?? null,
    stdout: input.stdout ?? "",
    stderr: input.stderr ?? "",
    durationMs: input.durationMs ?? 0,
    statusAfter: input.statusAfter ?? null,
    phasePatch: input.phasePatch ?? null,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
  }
}

export function renderRelatedworkToolOutput(result: RelatedworkToolResult): string {
  const locale = result.locale
  const none = t(locale, "relatedworkTool.none")
  const stdout = result.stdout.length > 0 ? `\`\`\`\n${result.stdout.trim()}\n\`\`\`` : none
  const stderr = result.stderr.length > 0 ? `\`\`\`\n${result.stderr.trim()}\n\`\`\`` : none
  const phasePatchSection = renderPhasePatch(locale, result.phasePatch)
  const statusSection = result.statusAfter ? renderStatusSummary(locale, result.statusAfter) : t(locale, "relatedworkTool.statusUnavailable")
  const errorsSection = result.errors.length > 0
    ? result.errors.map((error) => `- ${error.code}: ${error.message}`).join("\n")
    : `- ${none}`

  return `## ${t(locale, "relatedworkTool.title", { tool: result.toolId })}

${result.ok ? t(locale, "relatedworkTool.success") : t(locale, "relatedworkTool.failure")}

- ${t(locale, "relatedworkTool.command")}: ${result.command ?? none}
- ${t(locale, "relatedworkTool.resolution")}: ${result.resolution ? `${result.resolution.kind} (${result.resolution.path})` : none}
- ${t(locale, "relatedworkTool.exitCode")}: ${result.exitCode ?? none}
- ${t(locale, "relatedworkTool.duration")}: ${result.durationMs}ms

### ${t(locale, "relatedworkTool.stdout")}

${stdout}

### ${t(locale, "relatedworkTool.stderr")}

${stderr}

### ${t(locale, "relatedworkTool.phasePatch")}

${phasePatchSection}

### ${t(locale, "relatedworkTool.statusAfter")}

${statusSection}

### ${t(locale, "relatedworkTool.errors")}

${errorsSection}

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
`
}

function renderPhasePatch(locale: Locale, patch: PhasePatchResult | null): string {
  if (patch === null) return `- ${t(locale, "relatedworkTool.phasePatchNotApplied")}`
  if (!patch.ok) return `- ${t(locale, "relatedworkTool.phasePatchFailed")}: ${patch.errors.map((error) => error.message).join("; ") || t(locale, "relatedworkTool.none")}`
  if (patch.before === null || patch.after === null) return `- ${t(locale, "relatedworkTool.phasePatchUnchanged")}`
  const keys = new Set<string>([...Object.keys(patch.before), ...Object.keys(patch.after)])
  const rows: string[] = []
  for (const key of [...keys].sort()) {
    const before = (patch.before as Record<string, unknown>)[key]
    const after = (patch.after as Record<string, unknown>)[key]
    if (jsonStringify(before) === jsonStringify(after)) continue
    rows.push(`| ${key} | ${jsonStringify(before)} | ${jsonStringify(after)} |`)
  }
  if (rows.length === 0) return `- ${t(locale, "relatedworkTool.phasePatchUnchanged")}`
  return [`| ${t(locale, "relatedworkTool.field")} | ${t(locale, "relatedworkTool.before")} | ${t(locale, "relatedworkTool.after")} |`, "|---|---|---|", ...rows].join("\n")
}

function renderStatusSummary(locale: Locale, status: RelatedworkStatusResult): string {
  const counts = status.counts
  return `- ${t(locale, "relatedworkTool.statusCounts")}: papers=${counts.papersFound}, downloaded=${counts.papersDownloaded}, failed=${counts.downloadFailures}, summarized=${counts.summariesDone}, bib=${counts.bibEntries}, pdf=${counts.pdfFiles}, summaries=${counts.summaryFiles}, cross_index=${counts.crossIndexBuilt}`
}

function jsonStringify(value: unknown): string {
  if (value === undefined) return "undefined"
  return JSON.stringify(value)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
