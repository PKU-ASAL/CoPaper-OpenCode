import { afterEach, describe, expect, test } from "bun:test"
import { mkdirSync, symlinkSync } from "node:fs"
import { buildRelatedworkStatus, renderRelatedworkStatusOutput } from "../src/relatedwork-status"
import { hashTree, makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const project = makeTempProject(); projects.push(project); return project }

describe("relatedwork status", () => {
  test("reports missing relatedwork as read-only empty status", async () => {
    const project = temp()
    const before = hashTree(project.root)

    const result = await buildRelatedworkStatus({ root: project.root, locale: "en-US" })
    const markdown = renderRelatedworkStatusOutput(result)

    expect(result.ok).toBe(true)
    expect(result.readonly).toBe(true)
    expect(result.counts.papersFound).toBe(0)
    expect(result.warnings).toContain("catalog-missing")
    expect(markdown).toContain("## Related Work Status")
    expect(markdown).toContain("papers=0")
    expect(hashTree(project.root)).toBe(before)
  })

  test("reads catalog bib pdf summaries and cross index without writing", async () => {
    const project = temp()
    project.write("relatedwork/literature.json", `${JSON.stringify({
      version: 1,
      papers: {
        smith2026runtime: {
          paper_id: "smith2026runtime",
          title: "Runtime Systems",
          authors: ["Smith"],
          year: 2026,
          venue: "OSDI",
          download_status: "downloaded",
          pdf_path: "relatedwork/pdfs/smith2026runtime.pdf",
          summary_path: "relatedwork/papers/smith2026runtime.md",
        },
        lee2025failed: {
          paper_id: "lee2025failed",
          title: "Failed Download",
          year: 2025,
          download_status: "failed",
        },
      },
    }, null, 2)}\n`)
    project.write("relatedwork/paper_list.bib", "@inproceedings{smith2026runtime,title={Runtime Systems}}\n")
    project.write("relatedwork/pdfs/smith2026runtime.pdf", "%PDF-1.4\n")
    project.write("relatedwork/papers/smith2026runtime.md", "# Runtime Systems\n")
    project.write("relatedwork/search_cache.json", "{\"papers\":[]}\n")
    project.write("relatedwork/queries.txt", "wasm runtime\n")
    project.write("relatedwork/summary.md", "# Summary\n")
    project.write(".agents/cross_index.json", "{}\n")
    const before = hashTree(project.root)

    const result = await buildRelatedworkStatus({ root: project.root, locale: "zh-CN" })
    const markdown = renderRelatedworkStatusOutput(result)

    expect(result.ok).toBe(true)
    expect(result.counts).toMatchObject({
      papersFound: 2,
      papersDownloaded: 1,
      downloadFailures: 1,
      summariesDone: 1,
      bibEntries: 1,
      pdfFiles: 1,
      summaryFiles: 1,
      crossIndexBuilt: true,
    })
    expect(result.papers.find((paper) => paper.paperId === "smith2026runtime")?.pdfExists).toBe(true)
    expect(result.papers.find((paper) => paper.paperId === "smith2026runtime")?.summaryExists).toBe(true)
    expect(markdown).toContain("## VibePaper 相关工作状态")
    expect(markdown).toContain("smith2026runtime")
    expect(hashTree(project.root)).toBe(before)
  })

  test("rejects unsafe catalog paths and ignores unsafe paper paths", async () => {
    const project = temp()
    const outside = temp()
    mkdirSync(project.path("relatedwork"), { recursive: true })
    outside.write("literature.json", "{}\n")
    symlinkSync(outside.path("literature.json"), project.path("relatedwork/literature.json"))
    const beforeSymlink = hashTree(project.root)

    const symlinkResult = await buildRelatedworkStatus({ root: project.root })
    expect(symlinkResult.ok).toBe(false)
    expect(symlinkResult.errors[0]?.code).toBe("invalid-catalog")
    expect(hashTree(project.root)).toBe(beforeSymlink)

    project.cleanup()
    projects.splice(projects.indexOf(project), 1)
    const second = temp()
    second.write("relatedwork/literature.json", `${JSON.stringify({
      papers: {
        unsafe: {
          paper_id: "unsafe",
          title: "Unsafe Paths",
          pdf_path: "../outside.pdf",
          summary_path: "/tmp/outside.md",
        },
      },
    }, null, 2)}\n`)

    const unsafePaperResult = await buildRelatedworkStatus({ root: second.root })
    expect(unsafePaperResult.ok).toBe(true)
    expect(unsafePaperResult.papers[0]?.pdfExists).toBe(false)
    expect(unsafePaperResult.papers[0]?.warnings).toContain("unsafe-path-ignored:../outside.pdf")
    expect(unsafePaperResult.papers[0]?.warnings).toContain("absolute-path-ignored:/tmp/outside.md")
  })
})
