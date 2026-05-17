import { afterEach, describe, expect, test } from "bun:test"
import { symlinkSync, utimesSync } from "node:fs"
import { buildCheckerStatus, renderCheckerStatusOutput } from "../src/checker-status"
import { hashTree, makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const project = makeTempProject(); projects.push(project); return project }

function writeState(project: ReturnType<typeof makeTempProject>, checkers: Record<string, unknown>) {
  project.write(".agents/state.json", `${JSON.stringify({
    project: { name: "Checker Paper" },
    phases: {},
    event_log_path: ".agents/events.jsonl",
    checkers,
  }, null, 2)}\n`)
}

describe("checker status", () => {
  test("reads checker records and precheck report without writing", async () => {
    const project = temp()
    project.write("paper.md", "# Paper\n###### Claim\nThe paper has content.\n")
    writeState(project, {
      "problem-checker": {
        updated_at: "2026-05-01T10:00:00.000Z",
        counts: { critical: 1, major: 2, minor: 3 },
        source: "markdown-review",
        summary: "Problem framing needs work.",
      },
      "logic-checker": {
        updated_at: "2026-05-01T10:10:00.000Z",
        status: "pass",
      },
      "clarity-checker": {
        updated_at: "2026-05-01T10:20:00.000Z",
        issues: [{ severity: "Major" }, { severity: "Minor" }],
      },
    })
    project.write(".agents/precheck_report.md", "# Precheck\nCritical issue\nMajor issue\nMinor issue\n")
    const before = hashTree(project.root)

    const result = await buildCheckerStatus({ root: project.root, locale: "en-US" })
    const markdown = renderCheckerStatusOutput(result)

    expect(result.readonly).toBe(true)
    expect(result.ok).toBe(true)
    expect(result.checkers).toHaveLength(7)
    expect(result.summary.run).toBe(3)
    expect(result.summary.missing).toBe(4)
    expect(result.summary.critical).toBe(1)
    expect(result.summary.major).toBe(3)
    expect(result.summary.minor).toBe(4)
    expect(result.precheckReport.present).toBe(true)
    expect(markdown).toContain("## Checker Status")
    expect(markdown).toContain("problem-checker")
    expect(markdown).toContain("```json")
    expect(hashTree(project.root)).toBe(before)
  })

  test("marks stale checker and precheck results when paper is newer", async () => {
    const project = temp()
    project.write("paper.md", "# Paper\n###### Newer\nUpdated content.\n")
    writeState(project, {
      "novelty-checker": {
        updated_at: "2026-05-01T10:00:00.000Z",
        counts: { critical: 0, major: 0, minor: 0 },
      },
    })
    project.write(".agents/precheck_report.md", "# Precheck\nNo issues.\n")
    const paperTime = new Date("2026-05-02T10:00:00.000Z")
    const reportTime = new Date("2026-05-01T10:00:00.000Z")
    utimesSync(project.path("paper.md"), paperTime, paperTime)
    utimesSync(project.path(".agents/precheck_report.md"), reportTime, reportTime)

    const result = await buildCheckerStatus({ root: project.root, locale: "zh-CN" })
    const novelty = result.checkers.find((checker) => checker.id === "novelty-checker")

    expect(novelty?.status).toBe("stale")
    expect(novelty?.warnings).toContain("checker-result-older-than-paper")
    expect(result.precheckReport.stale).toBe(true)
    expect(result.summary.stale).toBe(2)
    expect(result.warnings).toContain("precheck-report-older-than-paper")
  })

  test("reports missing invalid and unsafe state without writing", async () => {
    const missingProject = temp()
    const missingBefore = hashTree(missingProject.root)
    const missing = await buildCheckerStatus({ root: missingProject.root, locale: "zh-CN" })
    expect(missing.ok).toBe(false)
    expect(missing.errors[0]?.code).toBe("missing-state")
    expect(hashTree(missingProject.root)).toBe(missingBefore)

    const invalidProject = temp()
    invalidProject.write(".agents/state.json", "{invalid json")
    const invalid = await buildCheckerStatus({ root: invalidProject.root, locale: "zh-CN" })
    expect(invalid.ok).toBe(false)
    expect(invalid.errors[0]?.code).toBe("invalid-state")

    const symlinkProject = temp()
    const outside = temp()
    outside.write("state.json", "{}\n")
    symlinkProject.write(".agents/placeholder", "x")
    symlinkSync(outside.path("state.json"), symlinkProject.path(".agents/state.json"))
    const unsafe = await buildCheckerStatus({ root: symlinkProject.root, locale: "zh-CN" })
    expect(unsafe.ok).toBe(false)
    expect(unsafe.errors[0]?.code).toBe("unsafe-path")
  })
})
