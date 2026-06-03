import { createHash } from "node:crypto"
import { existsSync, lstatSync, readFileSync, type Stats } from "node:fs"
import { isAbsolute, join, resolve } from "node:path"
import { inflateSync } from "node:zlib"
import { assertInsideRoot } from "./fs-utils"
import { resolveLocale, t } from "./i18n"
import { detectRoot } from "./root"
import { SCHEMA_VERSION, type ImportExtractError, type ImportExtractOptions, type PdfExtractResult } from "./types"

type PdfReadResult = { ok: true; path: string; relativePath: string; bytes: Buffer; stat: Stats } | { ok: false; error: ImportExtractError }

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024

export async function buildPdfExtract(options: ImportExtractOptions): Promise<PdfExtractResult> {
  const resolvedLocale = resolveLocale(options.locale, options.env)
  let root: string
  try {
    root = (await detectRoot({ cwd: options.cwd ?? process.cwd(), explicitRoot: options.root, worktree: options.worktree })).root
  } catch (error) {
    return makePdfResult({ locale: resolvedLocale.locale, localeFallback: resolvedLocale.fallback, ok: false, root: null, errors: [{ code: "root-detection-failed", message: `Failed to detect project root: ${errorMessage(error)}` }] })
  }

  const inputPath = typeof options.path === "string" ? options.path.trim() : ""
  if (inputPath === "") return makePdfResult({ locale: resolvedLocale.locale, localeFallback: resolvedLocale.fallback, ok: false, root, errors: [{ code: "missing-path", message: "A PDF path is required." }] })

  const file = readInputFile(root, inputPath, [".pdf"], options.maxBytes ?? DEFAULT_MAX_BYTES)
  if (!file.ok) return makePdfResult({ locale: resolvedLocale.locale, localeFallback: resolvedLocale.fallback, ok: false, root, path: inputPath, errors: [file.error] })

  const extracted = extractPdfText(file.bytes)
  return makePdfResult({
    locale: resolvedLocale.locale,
    localeFallback: resolvedLocale.fallback,
    ok: true,
    root,
    path: file.relativePath,
    bytes: file.bytes.length,
    sourceHash: sha256(file.bytes),
    pageCount: extracted.pageCount,
    text: extracted.text,
    characters: Array.from(extracted.text).length,
    confidence: extracted.confidence,
    warnings: extracted.warnings,
    updatedAt: file.stat.mtime.toISOString(),
  })
}

export function renderPdfExtractOutput(result: PdfExtractResult): string {
  const locale = result.locale
  return `## ${t(locale, "pdfExtract.title")}

${result.ok ? t(locale, "pdfExtract.ready") : t(locale, "pdfExtract.unavailable")}

- ${t(locale, "importExtract.path")}: ${result.path ?? ""}
- ${t(locale, "importExtract.bytes")}: ${result.bytes}
- ${t(locale, "pdfExtract.pages")}: ${result.pageCount}
- ${t(locale, "importExtract.characters")}: ${result.characters}
- ${t(locale, "importExtract.confidence")}: ${result.confidence}
- ${t(locale, "importExtract.warnings")}: ${result.warnings.length > 0 ? result.warnings.join(", ") : t(locale, "importExtract.none")}

### ${t(locale, "importExtract.textPreview")}

${result.text.slice(0, 4000) || t(locale, "importExtract.none")}

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
`
}

function readInputFile(root: string, inputPath: string, extensions: string[], maxBytes: number): PdfReadResult {
  const absolute = isAbsolute(inputPath) ? resolve(inputPath) : resolve(root, inputPath)
  try {
    assertInsideRoot(root, absolute)
  } catch (error) {
    return { ok: false, error: { code: "unsafe-path", path: inputPath, message: `Input path must stay inside project root: ${errorMessage(error)}` } }
  }

  const lower = absolute.toLowerCase()
  if (!extensions.some((extension) => lower.endsWith(extension))) return { ok: false, error: { code: "unsupported-format", path: inputPath, message: `Unsupported file extension. Expected: ${extensions.join(", ")}` } }
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

function extractPdfText(bytes: Buffer): { text: string; pageCount: number; confidence: "low" | "medium" | "high"; warnings: string[] } {
  const binary = bytes.toString("latin1")
  const pageCount = (binary.match(/\/Type\s*\/Page\b/g) ?? []).length
  const streamTexts: string[] = []
  let compressedStreams = 0
  let decodedStreams = 0

  const streamRegex = /(<<[\s\S]*?>>)\s*stream\r?\n([\s\S]*?)\r?\nendstream/g
  for (const match of binary.matchAll(streamRegex)) {
    const dictionary = match[1] ?? ""
    const raw = Buffer.from(match[2] ?? "", "latin1")
    let content = raw.toString("latin1")
    if (/\/FlateDecode\b/.test(dictionary)) {
      compressedStreams += 1
      try {
        content = inflateSync(raw).toString("latin1")
        decodedStreams += 1
      } catch {
        continue
      }
    }
    const text = extractPdfOperators(content)
    if (text.trim() !== "") streamTexts.push(text)
  }

  let text = normalizeText(streamTexts.join("\n"))
  if (text === "") text = normalizeText(extractPdfOperators(binary))
  const warnings: string[] = []
  if (text === "") warnings.push("no-text-operators-found")
  if (compressedStreams > decodedStreams) warnings.push("some-compressed-streams-not-decoded")
  const confidence = text === "" ? "low" : compressedStreams > decodedStreams ? "medium" : "high"
  return { text, pageCount, confidence, warnings }
}

function extractPdfOperators(input: string): string {
  const chunks: string[] = []
  for (const match of input.matchAll(/\((?:\\.|[^\\()])*\)\s*Tj/g)) chunks.push(decodePdfString(match[0]!.replace(/\s*Tj$/, "")))
  for (const match of input.matchAll(/\[((?:\s*\((?:\\.|[^\\()])*\)\s*)+)\]\s*TJ/g)) {
    const arrayText = match[1] ?? ""
    const parts = [...arrayText.matchAll(/\((?:\\.|[^\\()])*\)/g)].map((part) => decodePdfString(part[0]!))
    chunks.push(parts.join(""))
  }
  return chunks.join("\n")
}

function decodePdfString(value: string): string {
  const inner = value.startsWith("(") && value.endsWith(")") ? value.slice(1, -1) : value
  return inner
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\([()\\])/g, "$1")
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)))
}

function normalizeText(value: string): string {
  return value.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
}

function makePdfResult(input: Partial<PdfExtractResult> & { locale: PdfExtractResult["locale"]; localeFallback: boolean; ok: boolean; root: string | null }): PdfExtractResult {
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
    pageCount: input.pageCount ?? 0,
    characters: input.characters ?? 0,
    confidence: input.confidence ?? "low",
    text: input.text ?? "",
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
