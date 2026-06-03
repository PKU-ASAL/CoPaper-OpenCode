import { createHash } from "node:crypto"
import { existsSync, lstatSync, readFileSync, type Stats } from "node:fs"
import { isAbsolute, resolve } from "node:path"
import { inflateRawSync } from "node:zlib"
import { assertInsideRoot } from "./fs-utils"
import { resolveLocale, t } from "./i18n"
import { detectRoot } from "./root"
import { SCHEMA_VERSION, type ImportExtractError, type ImportExtractOptions, type PptExtractResult, type PptExtractSlide } from "./types"

type PptReadResult = { ok: true; path: string; relativePath: string; bytes: Buffer; stat: Stats } | { ok: false; error: ImportExtractError }

interface ZipEntry {
  name: string
  method: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024
const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
const LOCAL_FILE_SIGNATURE = 0x04034b50

export async function buildPptExtract(options: ImportExtractOptions): Promise<PptExtractResult> {
  const resolvedLocale = resolveLocale(options.locale, options.env)
  let root: string
  try {
    root = (await detectRoot({ cwd: options.cwd ?? process.cwd(), explicitRoot: options.root, worktree: options.worktree })).root
  } catch (error) {
    return makePptResult({ locale: resolvedLocale.locale, localeFallback: resolvedLocale.fallback, ok: false, root: null, errors: [{ code: "root-detection-failed", message: `Failed to detect project root: ${errorMessage(error)}` }] })
  }

  const inputPath = typeof options.path === "string" ? options.path.trim() : ""
  if (inputPath === "") return makePptResult({ locale: resolvedLocale.locale, localeFallback: resolvedLocale.fallback, ok: false, root, errors: [{ code: "missing-path", message: "A PPTX path is required." }] })

  const file = readInputFile(root, inputPath, options.maxBytes ?? DEFAULT_MAX_BYTES)
  if (!file.ok) return makePptResult({ locale: resolvedLocale.locale, localeFallback: resolvedLocale.fallback, ok: false, root, path: inputPath, errors: [file.error] })

  const extracted = extractPptx(file.bytes, Boolean(options.includeNotes))
  return makePptResult({
    locale: resolvedLocale.locale,
    localeFallback: resolvedLocale.fallback,
    ok: true,
    root,
    path: file.relativePath,
    bytes: file.bytes.length,
    sourceHash: sha256(file.bytes),
    slideCount: extracted.slides.length,
    slides: extracted.slides,
    characters: extracted.slides.reduce((total, slide) => total + Array.from(slide.text).length + Array.from(slide.notes ?? "").length, 0),
    warnings: extracted.warnings,
    updatedAt: file.stat.mtime.toISOString(),
  })
}

export function renderPptExtractOutput(result: PptExtractResult): string {
  const locale = result.locale
  const rows = result.slides.length > 0 ? result.slides.map(renderSlideRow).join("\n") : `| ${t(locale, "importExtract.none")} | ${t(locale, "importExtract.none")} | ${t(locale, "importExtract.none")} |`

  return `## ${t(locale, "pptExtract.title")}

${result.ok ? t(locale, "pptExtract.ready") : t(locale, "pptExtract.unavailable")}

- ${t(locale, "importExtract.path")}: ${result.path ?? ""}
- ${t(locale, "importExtract.bytes")}: ${result.bytes}
- ${t(locale, "pptExtract.slides")}: ${result.slideCount}
- ${t(locale, "importExtract.characters")}: ${result.characters}
- ${t(locale, "importExtract.warnings")}: ${result.warnings.length > 0 ? result.warnings.join(", ") : t(locale, "importExtract.none")}

### ${t(locale, "pptExtract.slideText")}

| ${t(locale, "pptExtract.slide")} | ${t(locale, "pptExtract.titleColumn")} | ${t(locale, "importExtract.textPreview")} |
|---:|---|---|
${rows}

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
`
}

function readInputFile(root: string, inputPath: string, maxBytes: number): PptReadResult {
  const absolute = isAbsolute(inputPath) ? resolve(inputPath) : resolve(root, inputPath)
  try {
    assertInsideRoot(root, absolute)
  } catch (error) {
    return { ok: false, error: { code: "unsafe-path", path: inputPath, message: `Input path must stay inside project root: ${errorMessage(error)}` } }
  }

  if (!absolute.toLowerCase().endsWith(".pptx")) return { ok: false, error: { code: "unsupported-format", path: inputPath, message: "Unsupported file extension. Expected: .pptx" } }
  if (!existsSync(absolute)) return { ok: false, error: { code: "missing-file", path: inputPath, message: `File not found: ${inputPath}` } }

  let stat: Stats
  try {
    stat = lstatSync(absolute)
  } catch (error) {
    return { ok: false, error: { code: "read-failed", path: inputPath, message: `Failed to inspect file: ${errorMessage(error)}` } }
  }
  if (stat.isSymbolicLink() || !stat.isFile()) return { ok: false, error: { code: "invalid-file", path: inputPath, message: "Input must be a regular file." } }
  if (stat.size > maxBytes) return { ok: false, error: { code: "file-too-large", path: inputPath, message: `Input exceeds maxBytes (${stat.size} > ${maxBytes}).` } }

  try {
    return { ok: true, path: absolute, relativePath: absolute.startsWith(`${root}/`) ? absolute.slice(root.length + 1) : inputPath, bytes: readFileSync(absolute), stat }
  } catch (error) {
    return { ok: false, error: { code: "read-failed", path: inputPath, message: `Failed to read file: ${errorMessage(error)}` } }
  }
}

function extractPptx(bytes: Buffer, includeNotes: boolean): { slides: PptExtractSlide[]; warnings: string[] } {
  const entries = readZipEntries(bytes)
  const warnings: string[] = []
  const slideEntries = entries
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry.name))
    .sort((left, right) => slideNumber(left.name) - slideNumber(right.name))

  if (slideEntries.length === 0) warnings.push("no-slide-xml-found")

  const slides: PptExtractSlide[] = []
  for (const entry of slideEntries) {
    const number = slideNumber(entry.name)
    let xml = ""
    try {
      xml = readZipEntry(bytes, entry).toString("utf8")
    } catch {
      warnings.push(`slide-${number}-read-failed`)
      continue
    }
    const textRuns = extractXmlText(xml)
    const title = textRuns[0] ?? ""
    const text = textRuns.join("\n")
    const slide: PptExtractSlide = { slide: number, title, text }

    if (includeNotes) {
      const notesEntry = entries.find((candidate) => candidate.name === `ppt/notesSlides/notesSlide${number}.xml`)
      if (notesEntry) {
        try {
          slide.notes = extractXmlText(readZipEntry(bytes, notesEntry).toString("utf8")).join("\n")
        } catch {
          warnings.push(`notes-${number}-read-failed`)
        }
      }
    }
    slides.push(slide)
  }

  return { slides, warnings }
}

function readZipEntries(bytes: Buffer): ZipEntry[] {
  const eocdOffset = findEndOfCentralDirectory(bytes)
  if (eocdOffset < 0) throw new Error("Invalid ZIP: missing end of central directory.")
  const totalEntries = bytes.readUInt16LE(eocdOffset + 10)
  const centralDirectoryOffset = bytes.readUInt32LE(eocdOffset + 16)
  const entries: ZipEntry[] = []
  let cursor = centralDirectoryOffset

  for (let index = 0; index < totalEntries; index += 1) {
    if (bytes.readUInt32LE(cursor) !== CENTRAL_DIRECTORY_SIGNATURE) throw new Error("Invalid ZIP: bad central directory entry.")
    const method = bytes.readUInt16LE(cursor + 10)
    const compressedSize = bytes.readUInt32LE(cursor + 20)
    const uncompressedSize = bytes.readUInt32LE(cursor + 24)
    const nameLength = bytes.readUInt16LE(cursor + 28)
    const extraLength = bytes.readUInt16LE(cursor + 30)
    const commentLength = bytes.readUInt16LE(cursor + 32)
    const localHeaderOffset = bytes.readUInt32LE(cursor + 42)
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8")
    entries.push({ name, method, compressedSize, uncompressedSize, localHeaderOffset })
    cursor += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

function readZipEntry(bytes: Buffer, entry: ZipEntry): Buffer {
  const cursor = entry.localHeaderOffset
  if (bytes.readUInt32LE(cursor) !== LOCAL_FILE_SIGNATURE) throw new Error(`Invalid ZIP local header: ${entry.name}`)
  const nameLength = bytes.readUInt16LE(cursor + 26)
  const extraLength = bytes.readUInt16LE(cursor + 28)
  const dataStart = cursor + 30 + nameLength + extraLength
  const compressed = bytes.subarray(dataStart, dataStart + entry.compressedSize)
  if (entry.method === 0) return compressed
  if (entry.method === 8) return inflateRawSync(compressed)
  throw new Error(`Unsupported ZIP compression method ${entry.method}: ${entry.name}`)
}

function findEndOfCentralDirectory(bytes: Buffer): number {
  const minimum = Math.max(0, bytes.length - 65557)
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (bytes.readUInt32LE(offset) === EOCD_SIGNATURE) return offset
  }
  return -1
}

function extractXmlText(xml: string): string[] {
  return [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
    .map((match) => decodeXml(match[1] ?? "").trim())
    .filter((text) => text !== "")
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function slideNumber(path: string): number {
  const match = /slide(\d+)\.xml$/.exec(path)
  return match ? Number.parseInt(match[1]!, 10) : 0
}

function renderSlideRow(slide: PptExtractSlide): string {
  return `| ${slide.slide} | ${escapeCell(slide.title)} | ${escapeCell(slide.text.slice(0, 300))} |`
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, "<br>")
}

function makePptResult(input: Partial<PptExtractResult> & { locale: PptExtractResult["locale"]; localeFallback: boolean; ok: boolean; root: string | null }): PptExtractResult {
  return {
    schemaVersion: SCHEMA_VERSION,
    readonly: true,
    ok: input.ok,
    root: input.root,
    locale: input.locale,
    localeFallback: input.localeFallback,
    path: input.path ?? null,
    bytes: input.bytes ?? 0,
    sourceHash: input.sourceHash ?? null,
    slideCount: input.slideCount ?? 0,
    characters: input.characters ?? 0,
    slides: input.slides ?? [],
    updatedAt: input.updatedAt ?? null,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
  }
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex")
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
