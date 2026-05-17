import { afterEach, describe, expect, test } from "bun:test"
import { symlinkSync, writeFileSync } from "node:fs"
import { buildPdfExtract, renderPdfExtractOutput } from "../src/pdf-extract"
import { buildPptExtract, renderPptExtractOutput } from "../src/ppt-extract"
import { hashTree, makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const project = makeTempProject(); projects.push(project); return project }

describe("import extraction tools", () => {
  test("extracts basic PDF text without writing", async () => {
    const project = temp()
    project.write("draft.pdf", "%PDF-1.4\n1 0 obj\n<< /Type /Page >>\nendobj\n2 0 obj\n<< /Length 33 >>\nstream\nBT (Hello PDF World) Tj ET\nendstream\nendobj\n%%EOF\n")
    const before = hashTree(project.root)

    const result = await buildPdfExtract({ root: project.root, locale: "en-US", path: "draft.pdf" })
    const markdown = renderPdfExtractOutput(result)

    expect(result.ok).toBe(true)
    expect(result.pageCount).toBe(1)
    expect(result.text).toContain("Hello PDF World")
    expect(result.sourceHash).toMatch(/^[a-f0-9]{64}$/)
    expect(markdown).toContain("## PDF Extract")
    expect(markdown).toContain("Hello PDF World")
    expect(hashTree(project.root)).toBe(before)
  })

  test("rejects missing unsafe and oversized PDF inputs", async () => {
    const project = temp()
    const missing = await buildPdfExtract({ root: project.root, locale: "en-US", path: "missing.pdf" })
    expect(missing.ok).toBe(false)
    expect(missing.errors[0]?.code).toBe("missing-file")

    project.write("target.pdf", "%PDF\n")
    symlinkSync("target.pdf", project.path("link.pdf"))
    const unsafe = await buildPdfExtract({ root: project.root, locale: "en-US", path: "link.pdf" })
    expect(unsafe.ok).toBe(false)
    expect(unsafe.errors[0]?.code).toBe("invalid-file")

    const large = await buildPdfExtract({ root: project.root, locale: "en-US", path: "target.pdf", maxBytes: 1 })
    expect(large.ok).toBe(false)
    expect(large.errors[0]?.code).toBe("file-too-large")
  })

  test("extracts PPTX slide text without writing", async () => {
    const project = temp()
    writeFileSync(project.path("slides.pptx"), makeZip({
      "ppt/slides/slide2.xml": `<p:sld xmlns:p="p" xmlns:a="a"><a:t>Second Slide</a:t><a:t>Later point</a:t></p:sld>`,
      "ppt/slides/slide1.xml": `<p:sld xmlns:p="p" xmlns:a="a"><a:t>First Slide</a:t><a:t>Opening point</a:t></p:sld>`,
    }))
    const before = hashTree(project.root)

    const result = await buildPptExtract({ root: project.root, locale: "en-US", path: "slides.pptx" })
    const markdown = renderPptExtractOutput(result)

    expect(result.ok).toBe(true)
    expect(result.slideCount).toBe(2)
    expect(result.slides.map((slide) => slide.title)).toEqual(["First Slide", "Second Slide"])
    expect(result.sourceHash).toMatch(/^[a-f0-9]{64}$/)
    expect(markdown).toContain("## PPTX Extract")
    expect(markdown).toContain("Opening point")
    expect(hashTree(project.root)).toBe(before)
  })

  test("rejects unsupported PPT format and missing explicit path", async () => {
    const project = temp()
    const missingPath = await buildPptExtract({ root: project.root, locale: "en-US", path: "" })
    expect(missingPath.ok).toBe(false)
    expect(missingPath.errors[0]?.code).toBe("missing-path")

    project.write("slides.ppt", "legacy")
    const unsupported = await buildPptExtract({ root: project.root, locale: "en-US", path: "slides.ppt" })
    expect(unsupported.ok).toBe(false)
    expect(unsupported.errors[0]?.code).toBe("unsupported-format")
  })
})

function makeZip(files: Record<string, string>): Buffer {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = Buffer.from(name, "utf8")
    const data = Buffer.from(content, "utf8")
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt32LE(0, 10)
    local.writeUInt32LE(0, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBytes.length, 26)
    local.writeUInt16LE(0, 28)
    localParts.push(local, nameBytes, data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt32LE(0, 12)
    central.writeUInt32LE(0, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBytes.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    centralParts.push(central, nameBytes)
    offset += local.length + nameBytes.length + data.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(Object.keys(files).length, 8)
  eocd.writeUInt16LE(Object.keys(files).length, 10)
  eocd.writeUInt32LE(centralDirectory.length, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20)
  return Buffer.concat([...localParts, centralDirectory, eocd])
}
