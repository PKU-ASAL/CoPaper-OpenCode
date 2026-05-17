import { existsSync, lstatSync, readFileSync, type Stats } from "node:fs"
import { join } from "node:path"
import { assertInsideRoot } from "./fs-utils"
import { resolveLocale, t } from "./i18n"
import { detectRoot } from "./root"
import { SCHEMA_VERSION, type Locale, type StorylineStructureError, type StorylineStructureOptions, type StorylineStructureResult, type StorylineStructureSection, type StorylineStructureStatus, type StorylineStructureSummary } from "./types"

type FileReadResult = { ok: true; content: string; stat: Stats } | { ok: false; error: StorylineStructureError }

interface ParsedSection {
  line: number
  title: string
  contentLines: string[]
}

export async function buildStorylineStructureStatus(options: StorylineStructureOptions): Promise<StorylineStructureResult> {
  const resolved = resolveLocale(options.locale, options.env)
  let root: string
  try {
    root = (await detectRoot({ cwd: options.cwd ?? process.cwd(), explicitRoot: options.root, worktree: options.worktree })).root
  } catch (error) {
    return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root: null, errors: [{ code: "root-detection-failed", message: `Failed to detect project root: ${errorMessage(error)}` }] })
  }

  const file = readStoryline(root)
  if (!file.ok) return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root, errors: [file.error] })

  const sections = parseSections(file.content).map(toSection)
  const nextSection = sections.find((section) => section.status !== "filled") ?? null

  return makeResult({
    locale: resolved.locale,
    localeFallback: resolved.fallback,
    ok: true,
    root,
    path: "storyline.md",
    sections,
    nextSection,
    summary: summarize(sections),
    updatedAt: file.stat.mtime.toISOString(),
  })
}

export function renderStorylineStructureStatusOutput(result: StorylineStructureResult): string {
  const locale = result.locale
  const none = t(locale, "storylineStructure.none")
  const rows = result.sections.length > 0 ? result.sections.map(renderSectionRow).join("\n") : `| ${none} | ${none} | ${none} | ${none} | ${none} |`
  const next = result.nextSection === null ? none : `${result.nextSection.title} (line ${result.nextSection.line})`

  return `## ${t(locale, "storylineStructure.title")}

${result.ok ? t(locale, "storylineStructure.ready") : t(locale, "storylineStructure.unavailable")}

- ${t(locale, "storylineStructure.path")}: ${result.path ?? "storyline.md"}
- ${t(locale, "storylineStructure.nextSection")}: ${next}
- ${t(locale, "storylineStructure.summary")}: total=${result.summary.total}, filled=${result.summary.filled}, partial=${result.summary.partial}, empty=${result.summary.empty}

### ${t(locale, "storylineStructure.sections")}

| ${t(locale, "storylineStructure.line")} | ${t(locale, "storylineStructure.section")} | ${t(locale, "storylineStructure.status")} | ${t(locale, "storylineStructure.substantiveLines")} | ${t(locale, "storylineStructure.todoLines")} |
|---|---|---|---:|---:|
${rows}

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
`
}

function readStoryline(root: string): FileReadResult {
  const path = join(root, "storyline.md")
  try {
    assertInsideRoot(root, path)
  } catch (error) {
    return { ok: false, error: { code: "unsafe-path", path: "storyline.md", message: `Unsafe storyline.md path: ${errorMessage(error)}` } }
  }

  if (!existsSync(path)) return { ok: false, error: { code: "missing-storyline", path: "storyline.md", message: "Missing storyline.md." } }

  let stat: Stats
  try {
    stat = lstatSync(path)
  } catch (error) {
    return { ok: false, error: { code: "read-failed", path: "storyline.md", message: `Failed to inspect storyline.md: ${errorMessage(error)}` } }
  }

  if (stat.isSymbolicLink() || !stat.isFile()) return { ok: false, error: { code: "invalid-storyline", path: "storyline.md", message: "storyline.md must be a regular file." } }

  try {
    return { ok: true, content: readFileSync(path, "utf8"), stat }
  } catch (error) {
    return { ok: false, error: { code: "read-failed", path: "storyline.md", message: `Failed to read storyline.md: ${errorMessage(error)}` } }
  }
}

function parseSections(content: string): ParsedSection[] {
  const lines = content.split(/\r?\n/)
  const sections: ParsedSection[] = []
  let current: ParsedSection | null = null

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ""
    const match = /^#####\s+(.+?)\s*$/.exec(line)
    if (match) {
      current = { line: index + 1, title: match[1]!.trim(), contentLines: [] }
      sections.push(current)
      continue
    }
    if (current !== null) current.contentLines.push(line)
  }

  return sections
}

function toSection(section: ParsedSection): StorylineStructureSection {
  const meaningful = section.contentLines.filter(isMeaningfulLine)
  const todoLines = section.contentLines.filter((line) => /TODO|待补充|待填写/i.test(line)).length
  let status: StorylineStructureStatus = "empty"
  if (meaningful.length > 0 && todoLines > 0) status = "partial"
  else if (meaningful.length > 0) status = "filled"

  return {
    line: section.line,
    title: section.title,
    status,
    substantiveLines: meaningful.length,
    todoLines,
  }
}

function isMeaningfulLine(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed === "") return false
  if (trimmed.startsWith("<!--") && trimmed.endsWith("-->")) return false
  if (/^\*\*.*\*\*:?$/.test(trimmed)) return false
  if (/TODO|待补充|待填写/i.test(trimmed)) return false
  if (/^[-*+]\s*TODO/i.test(trimmed)) return false
  return true
}

function summarize(sections: StorylineStructureSection[]): StorylineStructureSummary {
  return {
    total: sections.length,
    filled: sections.filter((section) => section.status === "filled").length,
    partial: sections.filter((section) => section.status === "partial").length,
    empty: sections.filter((section) => section.status === "empty").length,
  }
}

function renderSectionRow(section: StorylineStructureSection): string {
  return `| ${section.line} | ${escapeCell(section.title)} | ${section.status} | ${section.substantiveLines} | ${section.todoLines} |`
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ")
}

function makeResult(input: Partial<StorylineStructureResult> & { locale: Locale; localeFallback: boolean; ok: boolean; root: string | null }): StorylineStructureResult {
  return {
    schemaVersion: SCHEMA_VERSION,
    readonly: true,
    ok: input.ok,
    root: input.root,
    locale: input.locale,
    localeFallback: input.localeFallback,
    path: input.path ?? null,
    sections: input.sections ?? [],
    nextSection: input.nextSection ?? null,
    summary: input.summary ?? { total: 0, filled: 0, partial: 0, empty: 0 },
    updatedAt: input.updatedAt ?? null,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
