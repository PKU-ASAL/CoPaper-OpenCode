import { existsSync, lstatSync, readFileSync, readdirSync, type Stats } from "node:fs"
import { extname, isAbsolute, join } from "node:path"
import { assertInsideRoot } from "./fs-utils"
import { resolveLocale, t } from "./i18n"
import { detectRoot } from "./root"
import { SCHEMA_VERSION, type Locale, type RelatedworkStatusCounts, type RelatedworkStatusError, type RelatedworkStatusFile, type RelatedworkStatusOptions, type RelatedworkStatusPaper, type RelatedworkStatusResult } from "./types"

const FILE_PATHS = {
  relatedworkDir: "relatedwork",
  catalog: "relatedwork/literature.json",
  bib: "relatedwork/paper_list.bib",
  pdfDir: "relatedwork/pdfs",
  papersDir: "relatedwork/papers",
  searchCache: "relatedwork/search_cache.json",
  queries: "relatedwork/queries.txt",
  summary: "relatedwork/summary.md",
  crossIndex: ".agents/cross_index.json",
} as const

type FileKey = keyof typeof FILE_PATHS

interface CatalogReadResult {
  ok: boolean
  papers: RelatedworkStatusPaper[]
  warnings: string[]
  errors: RelatedworkStatusError[]
}

export async function buildRelatedworkStatus(options: RelatedworkStatusOptions): Promise<RelatedworkStatusResult> {
  const resolved = resolveLocale(options.locale, options.env)
  let root: string
  try {
    root = (await detectRoot({ cwd: options.cwd ?? process.cwd(), explicitRoot: options.root, worktree: options.worktree })).root
  } catch (error) {
    return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root: null, errors: [{ code: "root-detection-failed", message: `Failed to detect project root: ${errorMessage(error)}` }] })
  }

  const files = inspectFiles(root)
  const warnings = Object.values(files).flatMap((file) => file.warnings.map((warning) => `${file.path}: ${warning}`))
  const catalog = readCatalog(root, files.catalog)
  warnings.push(...catalog.warnings)

  const counts = buildCounts(root, catalog.papers, files)
  const errors = catalog.errors

  return makeResult({
    locale: resolved.locale,
    localeFallback: resolved.fallback,
    ok: errors.length === 0,
    root,
    files,
    counts,
    papers: catalog.papers,
    warnings,
    errors,
  })
}

export function renderRelatedworkStatusOutput(result: RelatedworkStatusResult): string {
  const locale = result.locale
  const none = t(locale, "relatedworkStatus.none")
  const fileRows = (Object.values(result.files) as RelatedworkStatusFile[]).map((file) => {
    const warnings = file.warnings.length > 0 ? file.warnings.join(", ") : none
    return `| ${file.path} | ${file.present ? "yes" : "no"} | ${file.updatedAt ?? none} | ${file.bytes ?? none} | ${warnings} |`
  }).join("\n")
  const paperRows = result.papers.length > 0 ? result.papers.map((paper) => {
    const warnings = paper.warnings.length > 0 ? paper.warnings.join(", ") : none
    return `| ${paper.paperId} | ${paper.title ?? none} | ${paper.downloadStatus}${paper.pdfExists ? " (exists)" : ""} | ${paper.summaryExists ? "yes" : "no"} | ${warnings} |`
  }).join("\n") : `| ${none} | ${none} | ${none} | ${none} | ${none} |`
  const warnings = result.warnings.length > 0 ? result.warnings.map((warning) => `- ${warning}`).join("\n") : `- ${none}`
  const errors = result.errors.length > 0 ? result.errors.map((error) => `- ${error.code}${error.path ? ` (${error.path})` : ""}: ${error.message}`).join("\n") : `- ${none}`

  return `## ${t(locale, "relatedworkStatus.title")}

${result.ok ? t(locale, "relatedworkStatus.ready") : t(locale, "relatedworkStatus.unavailable")}

- root: ${result.root ?? none}
- ${t(locale, "relatedworkStatus.summary")}: papers=${result.counts.papersFound}, downloaded=${result.counts.papersDownloaded}, failed=${result.counts.downloadFailures}, summarized=${result.counts.summariesDone}, bib=${result.counts.bibEntries}, pdf_files=${result.counts.pdfFiles}, summary_files=${result.counts.summaryFiles}, cross_index=${result.counts.crossIndexBuilt}

### ${t(locale, "relatedworkStatus.files")}

| ${t(locale, "relatedworkStatus.path")} | ${t(locale, "relatedworkStatus.present")} | ${t(locale, "relatedworkStatus.updatedAt")} | ${t(locale, "relatedworkStatus.bytes")} | ${t(locale, "relatedworkStatus.warnings")} |
|---|---|---|---:|---|
${fileRows}

### ${t(locale, "relatedworkStatus.papers")}

| ${t(locale, "relatedworkStatus.paperId")} | ${t(locale, "relatedworkStatus.titleColumn")} | ${t(locale, "relatedworkStatus.download")} | ${t(locale, "relatedworkStatus.paperSummary")} | ${t(locale, "relatedworkStatus.warnings")} |
|---|---|---|---|---|
${paperRows}

### ${t(locale, "relatedworkStatus.warnings")}

${warnings}

### errors

${errors}

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
`
}

function inspectFiles(root: string): RelatedworkStatusResult["files"] {
  return Object.fromEntries(
    Object.entries(FILE_PATHS).map(([key, path]) => [
      key,
      inspectProjectPath(root, path, key === "relatedworkDir" || key === "pdfDir" || key === "papersDir" ? "directory" : "file"),
    ]),
  ) as RelatedworkStatusResult["files"]
}

function inspectProjectPath(root: string, projectPath: string, kind: "file" | "directory"): RelatedworkStatusFile {
  const base = { path: projectPath, present: false, kind, updatedAt: null, bytes: null, warnings: [] as string[] }
  const fullPath = join(root, projectPath)
  try {
    assertInsideRoot(root, fullPath)
  } catch (error) {
    return { ...base, warnings: [`unsafe-path: ${errorMessage(error)}`] }
  }
  if (!existsSync(fullPath)) return base
  let stat: Stats
  try {
    stat = lstatSync(fullPath)
  } catch (error) {
    return { ...base, warnings: [`read-failed: ${errorMessage(error)}`] }
  }
  if (stat.isSymbolicLink()) return { ...base, present: true, updatedAt: stat.mtime.toISOString(), bytes: stat.size, warnings: ["path-is-symlink"] }
  if (kind === "file" && !stat.isFile()) return { ...base, present: true, updatedAt: stat.mtime.toISOString(), bytes: stat.size, warnings: ["not-a-regular-file"] }
  if (kind === "directory" && !stat.isDirectory()) return { ...base, present: true, updatedAt: stat.mtime.toISOString(), bytes: stat.size, warnings: ["not-a-directory"] }
  return { ...base, present: true, updatedAt: stat.mtime.toISOString(), bytes: stat.size }
}

function readCatalog(root: string, catalogFile: RelatedworkStatusFile): CatalogReadResult {
  if (catalogFile.warnings.length > 0) {
    return { ok: false, papers: [], warnings: [], errors: [{ code: "invalid-catalog", path: catalogFile.path, message: "Catalog path is not a safe regular file." }] }
  }
  if (!catalogFile.present) return { ok: true, papers: [], warnings: ["catalog-missing"], errors: [] }

  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(join(root, catalogFile.path), "utf8"))
  } catch (error) {
    return { ok: false, papers: [], warnings: [], errors: [{ code: "invalid-catalog", path: catalogFile.path, message: `Failed to parse literature catalog: ${errorMessage(error)}` }] }
  }

  const rawPapers = extractRawPapers(parsed)
  if (rawPapers === null) {
    return { ok: false, papers: [], warnings: [], errors: [{ code: "invalid-catalog", path: catalogFile.path, message: "Catalog must be an object with papers or an array of paper records." }] }
  }

  const papers: RelatedworkStatusPaper[] = []
  const warnings: string[] = []
  for (const [fallbackId, raw] of rawPapers) {
    if (!isRecord(raw)) {
      warnings.push(`paper-skipped-not-object:${fallbackId}`)
      continue
    }
    papers.push(normalizePaper(root, fallbackId, raw))
  }
  papers.sort((left, right) => left.paperId.localeCompare(right.paperId))
  return { ok: true, papers, warnings, errors: [] }
}

function extractRawPapers(parsed: unknown): Array<[string, unknown]> | null {
  if (Array.isArray(parsed)) return parsed.map((paper, index) => [String(index), paper])
  if (!isRecord(parsed)) return null
  const raw = parsed.papers ?? parsed.entries ?? parsed.items ?? parsed.literature
  if (Array.isArray(raw)) return raw.map((paper, index) => [String(index), paper])
  if (isRecord(raw)) return Object.entries(raw)
  return raw === undefined ? [] : null
}

function normalizePaper(root: string, fallbackId: string, raw: Record<string, unknown>): RelatedworkStatusPaper {
  const paperId = firstString(raw.paper_id, raw.paperId, raw.id) ?? fallbackId
  const pdfPath = firstString(raw.pdf_path, raw.pdfPath)
  const summaryPath = firstString(raw.summary_path, raw.summaryPath)
  const pdf = pathExistsInsideRoot(root, pdfPath)
  const summary = pathExistsInsideRoot(root, summaryPath)
  const warnings = [...pdf.warnings, ...summary.warnings]
  const downloadStatus = firstString(raw.download_status, raw.downloadStatus) ?? (pdf.exists ? "downloaded" : "pending")
  return {
    paperId,
    title: firstString(raw.title),
    year: firstNumber(raw.year),
    venue: firstString(raw.venue, raw.journal, raw.conference),
    downloadStatus,
    pdfPath,
    pdfExists: pdf.exists,
    summaryPath,
    summaryExists: summary.exists || raw.summary_exists === true,
    warnings,
  }
}

function pathExistsInsideRoot(root: string, projectPath: string | null): { exists: boolean; warnings: string[] } {
  if (projectPath === null) return { exists: false, warnings: [] }
  if (isAbsolute(projectPath)) return { exists: false, warnings: [`absolute-path-ignored:${projectPath}`] }
  const fullPath = join(root, projectPath)
  try {
    assertInsideRoot(root, fullPath)
  } catch {
    return { exists: false, warnings: [`unsafe-path-ignored:${projectPath}`] }
  }
  if (!existsSync(fullPath)) return { exists: false, warnings: [] }
  const stat = lstatSync(fullPath)
  if (stat.isSymbolicLink()) return { exists: false, warnings: [`symlink-path-ignored:${projectPath}`] }
  return { exists: stat.isFile(), warnings: stat.isFile() ? [] : [`non-file-path-ignored:${projectPath}`] }
}

function buildCounts(root: string, papers: RelatedworkStatusPaper[], files: RelatedworkStatusResult["files"]): RelatedworkStatusCounts {
  return {
    papersFound: papers.length,
    papersDownloaded: papers.filter((paper) => paper.pdfExists).length,
    downloadFailures: papers.filter((paper) => paper.downloadStatus === "failed").length,
    summariesDone: papers.filter((paper) => paper.summaryExists).length,
    bibEntries: files.bib.present && files.bib.warnings.length === 0 ? countBibEntries(root, files.bib.path) : 0,
    pdfFiles: countFiles(root, files.pdfDir, ".pdf"),
    summaryFiles: countFiles(root, files.papersDir, ".md"),
    crossIndexBuilt: files.crossIndex.present && files.crossIndex.warnings.length === 0,
  }
}

function countBibEntries(root: string, projectPath: string): number {
  try {
    const text = readFileSync(join(root, projectPath), "utf8")
    return (text.match(/@\w+\s*\{/g) ?? []).length
  } catch {
    return 0
  }
}

function countFiles(root: string, directory: RelatedworkStatusFile, extension: string): number {
  if (!directory.present || directory.warnings.length > 0) return 0
  try {
    return readdirSync(join(root, directory.path), { withFileTypes: true })
      .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === extension)
      .length
  } catch {
    return 0
  }
}

function makeResult(input: {
  locale: Locale
  localeFallback: boolean
  ok: boolean
  root: string | null
  files?: RelatedworkStatusResult["files"]
  counts?: RelatedworkStatusCounts
  papers?: RelatedworkStatusPaper[]
  warnings?: string[]
  errors?: RelatedworkStatusError[]
}): RelatedworkStatusResult {
  return {
    schemaVersion: SCHEMA_VERSION,
    readonly: true,
    ok: input.ok,
    root: input.root,
    locale: input.locale,
    localeFallback: input.localeFallback,
    files: input.files ?? emptyFiles(),
    counts: input.counts ?? { papersFound: 0, papersDownloaded: 0, downloadFailures: 0, summariesDone: 0, bibEntries: 0, pdfFiles: 0, summaryFiles: 0, crossIndexBuilt: false },
    papers: input.papers ?? [],
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
  }
}

function emptyFiles(): RelatedworkStatusResult["files"] {
  return Object.fromEntries(
    Object.entries(FILE_PATHS).map(([key, path]) => [key, { path, present: false, kind: key === "relatedworkDir" || key === "pdfDir" || key === "papersDir" ? "directory" : "file", updatedAt: null, bytes: null, warnings: [] }]),
  ) as unknown as RelatedworkStatusResult["files"]
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") return value.trim()
  }
  return null
}

function firstNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim())
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
