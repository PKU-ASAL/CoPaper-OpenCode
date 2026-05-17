import { afterEach, describe, expect, test } from "bun:test"
import { symlinkSync } from "node:fs"
import { buildStorylineStructureStatus, renderStorylineStructureStatusOutput } from "../src/storyline-structure"
import { hashTree, makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const project = makeTempProject(); projects.push(project); return project }

describe("storyline structure status", () => {
  test("classifies filled partial and empty sections without writing", async () => {
    const project = temp()
    project.write("storyline.md", [
      "# Storyline",
      "##### 问题描述",
      "**Guidance:** define the problem",
      "The runtime cannot resolve dynamic libraries automatically.",
      "##### Insights",
      "TODO: fill insight",
      "##### 设计方案：Overview",
      "A resolver walks Needed sections.",
      "TODO: add edge case",
      "",
    ].join("\n"))
    const before = hashTree(project.root)

    const result = await buildStorylineStructureStatus({ root: project.root, locale: "en-US" })
    const markdown = renderStorylineStructureStatusOutput(result)

    expect(result.ok).toBe(true)
    expect(result.summary).toEqual({ total: 3, filled: 1, partial: 1, empty: 1 })
    expect(result.nextSection?.title).toBe("Insights")
    expect(result.sections.map((section) => [section.title, section.status])).toEqual([
      ["问题描述", "filled"],
      ["Insights", "empty"],
      ["设计方案：Overview", "partial"],
    ])
    expect(markdown).toContain("## Storyline Structure Status")
    expect(markdown).toContain("Insights")
    expect(markdown).toContain("```json")
    expect(hashTree(project.root)).toBe(before)
  })

  test("returns errors for missing and unsafe storyline", async () => {
    const missingProject = temp()
    const missing = await buildStorylineStructureStatus({ root: missingProject.root, locale: "en-US" })
    expect(missing.ok).toBe(false)
    expect(missing.errors[0]?.code).toBe("missing-storyline")

    const unsafeProject = temp()
    unsafeProject.write("target.md", "# Target\n")
    symlinkSync("target.md", unsafeProject.path("storyline.md"))
    const unsafe = await buildStorylineStructureStatus({ root: unsafeProject.root, locale: "en-US" })
    expect(unsafe.ok).toBe(false)
    expect(unsafe.errors[0]?.code).toBe("invalid-storyline")
  })
})
