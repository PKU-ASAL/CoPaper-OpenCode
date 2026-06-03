import { existsSync, lstatSync, readFileSync, type Stats } from "node:fs"
import { join } from "node:path"
import { assertInsideRoot } from "./fs-utils"
import { resolveLocale, t } from "./i18n"
import { detectRoot } from "./root"
import { SCHEMA_VERSION, type Locale, type PaperStructureError, type PaperStructureHeading, type PaperStructureOptions, type PaperStructureResult, type PaperStructureStatus, type PaperStructureSummary, type PaperStructureViolation } from "./types"

interface MarkdownHeading {
  level: number
  title: string
  line: number
  endLine: number
  parentIndex: number | null
  children: number[]
  level6Children: number[]
  bodyLines: string[]
}

type FileReadResult = {
  ok: true
  content: string
  stat: Stats
} | {
  ok: false
  error: PaperStructureError
}

export async function buildPaperStructureStatus(options: PaperStructureOptions): Promise<PaperStructureResult> {
  const resolved = resolveLocale(options.locale, options.env)
  let root: string
  try {
    root = (await detectRoot({ cwd: options.cwd ?? process.cwd(), explicitRoot: options.root, worktree: options.worktree })).root
  } catch (error) {
    return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root: null, errors: [{ code: "root-detection-failed", message: `Failed to detect project root: ${errorMessage(error)}` }] })
  }

  const file = readPaper(root)
  if (!file.ok) return makeResult({ locale: resolved.locale, localeFallback: resolved.fallback, ok: false, root, errors: [file.error] })

  const parsed = parseMarkdownHeadings(file.content)
  const structuralHeadings = buildStructuralHeadings(parsed.headings)
  const level5Targets = structuralHeadings.filter((heading) => heading.level === 5)
  const violations = buildViolations(parsed.headings, parsed.headingLevelSkips)
  const nextTarget = level5Targets.find((heading) => heading.status !== "complete") ?? null

  return makeResult({
    locale: resolved.locale,
    localeFallback: resolved.fallback,
    ok: true,
    root,
    path: "paper.md",
    headings: structuralHeadings,
    level5Targets,
    nextTarget,
    summary: summarize(structuralHeadings, level5Targets, violations),
    violations,
    updatedAt: file.stat.mtime.toISOString(),
  })
}

export function renderPaperStructureStatusOutput(result: PaperStructureResult): string {
  const locale = result.locale
  const none = t(locale, "paperStructure.none")
  const headingRows = result.headings.length > 0 ? result.headings.map(renderHeadingRow).join("\n") : `| ${none} | ${none} | ${none} | ${none} | ${none} |`
  const targetRows = result.level5Targets.length > 0 ? result.level5Targets.map(renderHeadingRow).join("\n") : `| ${none} | ${none} | ${none} | ${none} | ${none} |`
  const violationRows = result.violations.length > 0 ? result.violations.map(renderViolationRow).join("\n") : `| ${none} | ${none} | ${none} | ${none} |`
  const next = result.nextTarget === null ? none : `${result.nextTarget.title} (line ${result.nextTarget.line})`

  return `## ${t(locale, "paperStructure.title")}

${result.ok ? t(locale, "paperStructure.ready") : t(locale, "paperStructure.unavailable")}

- ${t(locale, "paperStructure.path")}: ${result.path ?? "paper.md"}
- ${t(locale, "paperStructure.nextTarget")}: ${next}
- ${t(locale, "paperStructure.summary")}: total=${result.summary.total}, complete=${result.summary.complete}, partial=${result.summary.partial}, incomplete=${result.summary.incomplete}, violations=${result.summary.violationCount}

### ${t(locale, "paperStructure.level5Targets")}

| ${t(locale, "paperStructure.line")} | ${t(locale, "paperStructure.level")} | ${t(locale, "paperStructure.heading")} | ${t(locale, "paperStructure.status")} | ${t(locale, "paperStructure.level6Children")} |
|---|---:|---|---|---:|
${targetRows}

### ${t(locale, "paperStructure.headings")}

| ${t(locale, "paperStructure.line")} | ${t(locale, "paperStructure.level")} | ${t(locale, "paperStructure.heading")} | ${t(locale, "paperStructure.status")} | ${t(locale, "paperStructure.level6Children")} |
|---|---:|---|---|---:|
${headingRows}

### ${t(locale, "paperStructure.violations")}

| ${t(locale, "paperStructure.line")} | ${t(locale, "paperStructure.type")} | ${t(locale, "paperStructure.severity")} | ${t(locale, "paperStructure.message")} |
|---|---|---|---|
${violationRows}

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
`
}

function readPaper(root: string): FileReadResult {
  const path = join(root, "paper.md")
  try {
    assertInsideRoot(root, path)
  } catch (error) {
    return { ok: false, error: { code: "unsafe-path", path: "paper.md", message: `Unsafe paper.md path: ${errorMessage(error)}` } }
  }

  if (!existsSync(path)) return { ok: false, error: { code: "missing-paper", path: "paper.md", message: "Missing paper.md." } }

  let stat: Stats
  try {
    stat = lstatSync(path)
  } catch (error) {
    return { ok: false, error: { code: "read-failed", path: "paper.md", message: `Failed to inspect paper.md: ${errorMessage(error)}` } }
  }

  if (stat.isSymbolicLink() || !stat.isFile()) return { ok: false, error: { code: "invalid-paper", path: "paper.md", message: "paper.md must be a regular file." } }

  try {
    return { ok: true, content: readFileSync(path, "utf8"), stat }
  } catch (error) {
    return { ok: false, error: { code: "read-failed", path: "paper.md", message: `Failed to read paper.md: ${errorMessage(error)}` } }
  }
}

function parseMarkdownHeadings(content: string): { headings: MarkdownHeading[]; headingLevelSkips: PaperStructureViolation[] } {
  const lines = content.split(/\r?\n/)
  const headings: MarkdownHeading[] = []
  const stack: number[] = []
  const headingLevelSkips: PaperStructureViolation[] = []
  let currentHeadingIndex: number | null = null

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1
    const line = lines[index] ?? ""
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line)
    if (match) {
      const level = match[1]!.length
      const title = match[2]!.trim()
      const previousHeading = currentHeadingIndex === null ? null : headings[currentHeadingIndex]
      if (previousHeading && level > previousHeading.level + 1) {
        headingLevelSkips.push({
          type: "heading-level-skip",
          severity: "warning",
          line: lineNumber,
          message: `Heading jumps from level ${previousHeading.level} to level ${level}.`,
          heading: title,
        })
      }

      while (stack.length > 0 && headings[stack[stack.length - 1]!].level >= level) stack.pop()
      const parentIndex = stack.length > 0 ? stack[stack.length - 1]! : null
      const heading: MarkdownHeading = { level, title, line: lineNumber, endLine: lines.length, parentIndex, children: [], level6Children: [], bodyLines: [] }
      headings.push(heading)
      const headingIndex = headings.length - 1
      if (parentIndex !== null) headings[parentIndex]!.children.push(headingIndex)
      if (level === 6) {
        const parentStructural = findNearestStructuralParent(headings, parentIndex)
        if (parentStructural !== null) headings[parentStructural]!.level6Children.push(headingIndex)
      }
      stack.push(headingIndex)
      currentHeadingIndex = headingIndex
      continue
    }

    if (currentHeadingIndex !== null) headings[currentHeadingIndex]!.bodyLines.push(line)
  }

  for (let index = 0; index < headings.length; index += 1) {
    const nextSameOrHigher = headings.find((candidate, candidateIndex) => candidateIndex > index && candidate.level <= headings[index]!.level)
    headings[index]!.endLine = nextSameOrHigher === undefined ? lines.length : nextSameOrHigher.line - 1
  }

  return { headings, headingLevelSkips }
}

function buildStructuralHeadings(headings: MarkdownHeading[]): PaperStructureHeading[] {
  return headings
    .filter((heading) => heading.level >= 2 && heading.level <= 5)
    .map((heading) => {
      const descendantLevel5 = collectDescendants(headings, heading)
        .filter((candidate) => candidate.level === 5)
      const directLevel6Count = heading.level6Children.length
      let status: PaperStructureStatus
      if (heading.level === 5) {
        status = directLevel6Count > 0 ? "complete" : "incomplete"
      } else if (descendantLevel5.length > 0) {
        const completeCount = descendantLevel5.filter((candidate) => candidate.level6Children.length > 0).length
        status = completeCount === 0 ? "incomplete" : completeCount === descendantLevel5.length ? "complete" : "partial"
      } else {
        status = collectDescendants(headings, heading).some((candidate) => candidate.level === 6) ? "complete" : "incomplete"
      }

      return {
        line: heading.line,
        level: heading.level,
        title: heading.title,
        status,
        level6Children: directLevel6Count,
        descendantLevel5: descendantLevel5.length,
      }
    })
}

function buildViolations(headings: MarkdownHeading[], headingLevelSkips: PaperStructureViolation[]): PaperStructureViolation[] {
  const violations = [...headingLevelSkips]
  for (const heading of headings) {
    if (heading.level >= 1 && heading.level <= 5) {
      const bodyTextLines = heading.bodyLines.filter(isBodyTextLine)
      if (bodyTextLines.length > 0) {
        violations.push({
          type: "body-under-structural-heading",
          severity: heading.level === 1 ? "warning" : "error",
          line: heading.line,
          message: `Structural heading level ${heading.level} has body text before a Level 6 paragraph.`,
          heading: heading.title,
        })
      }
    }

    if (heading.level === 6) {
      if (countChars(heading.title) > 50) {
        violations.push({
          type: "level6-title-too-long",
          severity: "warning",
          line: heading.line,
          message: `Level 6 title has ${countChars(heading.title)} characters; expected <= 50.`,
          heading: heading.title,
        })
      }
      const body = heading.bodyLines.filter((line) => !isHtmlCommentLine(line)).join("\n").trim()
      if (countChars(body) > 500) {
        violations.push({
          type: "level6-body-too-long",
          severity: "warning",
          line: heading.line,
          message: `Level 6 body has ${countChars(body)} characters; expected <= 500.`,
          heading: heading.title,
        })
      }
    }
  }
  return violations
}

function summarize(headings: PaperStructureHeading[], level5Targets: PaperStructureHeading[], violations: PaperStructureViolation[]): PaperStructureSummary {
  return {
    total: headings.length,
    level5Total: level5Targets.length,
    complete: headings.filter((heading) => heading.status === "complete").length,
    partial: headings.filter((heading) => heading.status === "partial").length,
    incomplete: headings.filter((heading) => heading.status === "incomplete").length,
    level5Complete: level5Targets.filter((heading) => heading.status === "complete").length,
    level5Incomplete: level5Targets.filter((heading) => heading.status !== "complete").length,
    violationCount: violations.length,
  }
}

function collectDescendants(headings: MarkdownHeading[], heading: MarkdownHeading): MarkdownHeading[] {
  const descendants: MarkdownHeading[] = []
  const queue = [...heading.children]
  while (queue.length > 0) {
    const index = queue.shift()!
    const child = headings[index]!
    descendants.push(child)
    queue.push(...child.children)
  }
  return descendants
}

function findNearestStructuralParent(headings: MarkdownHeading[], parentIndex: number | null): number | null {
  let cursor = parentIndex
  while (cursor !== null) {
    const heading = headings[cursor]!
    if (heading.level >= 2 && heading.level <= 5) return cursor
    cursor = heading.parentIndex
  }
  return null
}

function isBodyTextLine(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed === "") return false
  if (isHtmlCommentLine(trimmed)) return false
  if (/^[-*+]\s+/.test(trimmed)) return false
  if (/^\d+\.\s+/.test(trimmed)) return false
  if (/^\|.*\|$/.test(trimmed)) return false
  if (/^```/.test(trimmed)) return false
  return true
}

function isHtmlCommentLine(line: string): boolean {
  return line.trim().startsWith("<!--") && line.trim().endsWith("-->")
}

function countChars(value: string): number {
  return Array.from(value).length
}

function renderHeadingRow(heading: PaperStructureHeading): string {
  return `| ${heading.line} | ${heading.level} | ${escapeCell(heading.title)} | ${heading.status} | ${heading.level6Children} |`
}

function renderViolationRow(violation: PaperStructureViolation): string {
  return `| ${violation.line} | ${violation.type} | ${violation.severity} | ${escapeCell(violation.message)} |`
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ")
}

function makeResult(input: Partial<PaperStructureResult> & { locale: Locale; localeFallback: boolean; ok: boolean; root: string | null }): PaperStructureResult {
  return {
    schemaVersion: SCHEMA_VERSION,
    readonly: true,
    ok: input.ok,
    root: input.root,
    locale: input.locale,
    localeFallback: input.localeFallback,
    path: input.path ?? null,
    headings: input.headings ?? [],
    level5Targets: input.level5Targets ?? [],
    nextTarget: input.nextTarget ?? null,
    summary: input.summary ?? { total: 0, level5Total: 0, complete: 0, partial: 0, incomplete: 0, level5Complete: 0, level5Incomplete: 0, violationCount: 0 },
    violations: input.violations ?? [],
    updatedAt: input.updatedAt ?? null,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
