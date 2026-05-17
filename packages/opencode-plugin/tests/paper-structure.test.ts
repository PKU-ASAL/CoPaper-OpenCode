import { afterEach, describe, expect, test } from "bun:test"
import { symlinkSync } from "node:fs"
import { buildPaperStructureStatus, renderPaperStructureStatusOutput } from "../src/paper-structure"
import { hashTree, makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const project = makeTempProject(); projects.push(project); return project }

describe("paper structure status", () => {
  test("scans paper.md structural headings and next Level 5 target without writing", async () => {
    const project = temp()
    project.write("paper.md", [
      "# Demo Paper",
      "## Introduction",
      "<!-- description: Intro -->",
      "### Motivation",
      "<!-- description: Motivation -->",
      "#### Problem",
      "<!-- description: Problem -->",
      "##### Problem Statement",
      "<!-- description: Problem statement -->",
      "###### Existing systems miss runtime context",
      "The current draft explains the core problem in one compact paragraph.",
      "##### Importance",
      "<!-- description: Importance -->",
      "## Method",
      "This direct body text is not allowed under structural headings.",
      "##### Design Overview",
      "<!-- description: Design overview -->",
      "###### This Level Six Heading Is Intentionally Longer Than Fifty Characters For Testing",
      "Short body.",
      "",
    ].join("\n"))
    const before = hashTree(project.root)

    const result = await buildPaperStructureStatus({ root: project.root, locale: "en-US" })
    const output = renderPaperStructureStatusOutput(result)

    expect(result.ok).toBe(true)
    expect(result.summary.level5Total).toBe(3)
    expect(result.summary.level5Complete).toBe(2)
    expect(result.summary.level5Incomplete).toBe(1)
    expect(result.nextTarget?.title).toBe("Importance")
    expect(result.level5Targets.map((target) => [target.title, target.status])).toEqual([
      ["Problem Statement", "complete"],
      ["Importance", "incomplete"],
      ["Design Overview", "complete"],
    ])
    expect(result.violations.map((violation) => violation.type)).toContain("body-under-structural-heading")
    expect(result.violations.map((violation) => violation.type)).toContain("level6-title-too-long")
    expect(output).toContain("## Paper Structure Status")
    expect(output).toContain("Importance")
    expect(output).toContain("```json")
    expect(hashTree(project.root)).toBe(before)
  })

  test("returns an error when paper.md is missing or unsafe", async () => {
    const missingProject = temp()
    const missing = await buildPaperStructureStatus({ root: missingProject.root, locale: "en-US" })
    expect(missing.ok).toBe(false)
    expect(missing.errors[0]?.code).toBe("missing-paper")

    const unsafeProject = temp()
    unsafeProject.write("target.md", "# Target\n")
    symlinkSync("target.md", unsafeProject.path("paper.md"))
    const unsafe = await buildPaperStructureStatus({ root: unsafeProject.root, locale: "en-US" })
    expect(unsafe.ok).toBe(false)
    expect(unsafe.errors[0]?.code).toBe("invalid-paper")
  })
})
