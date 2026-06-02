import { afterEach, describe, expect, test } from "bun:test"
import { recordCheckerResult, renderCheckerRecordOutput } from "../src/checker-record"
import { buildCheckerStatus } from "../src/checker-status"
import { hashTree, makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const project = makeTempProject(); projects.push(project); return project }

function writeState(project: ReturnType<typeof makeTempProject>, extra: Record<string, unknown> = {}) {
  project.write(".agents/state.json", `${JSON.stringify({
    project: { name: "Checker Record Paper" },
    phases: {},
    event_log_path: ".agents/events.jsonl",
    checkers: {},
    ...extra,
  }, null, 2)}\n`)
  project.write(".agents/events.jsonl", "")
}

describe("checker record", () => {
  test("records checker result and appends event", async () => {
    const project = temp()
    writeState(project)

    const result = await recordCheckerResult({
      root: project.root,
      locale: "en-US",
      agent: "copaper-recorder",
      checker: "problem-checker",
      status: "issues_found",
      critical: 1,
      major: 2,
      minor: 0,
      summary: "Problem statement needs sharper scope.",
      evidence: ["markdown-review-output"],
      reason: "User confirmed checker summary.",
      issues: [
        { severity: "Critical", message: "Problem is underspecified.", location: "Problem", id: "P1" },
        { severity: "Major", message: "Importance evidence is thin." },
        { severity: "Major", message: "Scenario is vague.", suggestion: "Add concrete deployment context." },
      ],
      now: new Date("2026-05-01T10:00:00.000Z"),
    })
    const markdown = renderCheckerRecordOutput(result)
    const state = JSON.parse(project.read(".agents/state.json"))
    const events = project.read(".agents/events.jsonl").trim().split("\n").map((line) => JSON.parse(line))

    expect(result.ok).toBe(true)
    expect(result.eventAppended).toBe(true)
    expect(result.record?.total).toBe(3)
    expect(state.checkers["problem-checker"]).toMatchObject({ status: "issues_found", critical: 1, major: 2, minor: 0, total: 3 })
    expect(state.checkers["problem-checker"].issues).toHaveLength(3)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ action: "record_checker_result", result: "success", metadata: { checker: "problem-checker", total: 3 } })
    expect(markdown).toContain("## Checker Result Record")
  })

  test("updates checker status readable by checker status tool", async () => {
    const project = temp()
    writeState(project)
    project.write("paper.md", "# Paper\n###### Draft\nCurrent text.\n")

    const record = await recordCheckerResult({
      root: project.root,
      locale: "zh-CN",
      agent: "copaper-recorder",
      checker: "logic-checker",
      status: "clean",
      critical: 0,
      major: 0,
      minor: 0,
      summary: "No logic issues found.",
      evidence: ["logic-checker-output"],
      reason: "Confirmed clean logic checker run.",
      now: new Date("2099-05-01T10:00:00.000Z"),
    })
    const status = await buildCheckerStatus({ root: project.root, locale: "zh-CN" })
    const logic = status.checkers.find((checker) => checker.id === "logic-checker")

    expect(record.ok).toBe(true)
    expect(logic?.status).toBe("clean")
    expect(logic?.summary).toBe("No logic issues found.")
  })

  test("rejects unauthorized agent and invalid input without writing", async () => {
    const project = temp()
    writeState(project)
    const beforeUnauthorized = hashTree(project.root)

    const unauthorized = await recordCheckerResult({
      root: project.root,
      locale: "zh-CN",
      agent: "copaper-writer",
      checker: "problem-checker",
      status: "clean",
      critical: 0,
      major: 0,
      minor: 0,
      summary: "Clean.",
      evidence: ["review"],
      reason: "confirmed",
    })
    expect(unauthorized.ok).toBe(false)
    expect(unauthorized.errors[0]?.code).toBe("agent-not-authorized")
    expect(hashTree(project.root)).toBe(beforeUnauthorized)

    const invalid = await recordCheckerResult({
      root: project.root,
      locale: "zh-CN",
      agent: "copaper-recorder",
      checker: "missing-checker",
      status: "done",
      critical: -1,
      major: 0,
      minor: 0,
      summary: "",
      evidence: [],
      reason: "",
    })
    expect(invalid.ok).toBe(false)
    expect(invalid.errors.map((error) => error.code)).toContain("invalid-checker")
    expect(invalid.errors.map((error) => error.code)).toContain("invalid-status")
    expect(invalid.errors.map((error) => error.code)).toContain("invalid-counts")
    expect(invalid.errors.map((error) => error.code)).toContain("missing-summary")
    expect(hashTree(project.root)).toBe(beforeUnauthorized)
  })

  test("rejects unsafe event log path before writing state", async () => {
    const project = temp()
    writeState(project, { event_log_path: "custom/events.jsonl" })
    const before = hashTree(project.root)

    const result = await recordCheckerResult({
      root: project.root,
      locale: "zh-CN",
      agent: "copaper-recorder",
      checker: "data-checker",
      status: "issues_found",
      critical: 1,
      major: 0,
      minor: 0,
      summary: "Bogus data marker remains.",
      evidence: ["data-checker-output"],
      reason: "User confirmed result.",
    })

    expect(result.ok).toBe(false)
    expect(result.errors[0]?.code).toBe("event-log-failed")
    expect(hashTree(project.root)).toBe(before)
  })

  test("rejects invalid checker state before writing", async () => {
    const project = temp()
    writeState(project, { checkers: [] })
    const before = hashTree(project.root)

    const result = await recordCheckerResult({
      root: project.root,
      locale: "zh-CN",
      agent: "copaper-recorder",
      checker: "clarity-checker",
      status: "unknown",
      critical: 0,
      major: 0,
      minor: 0,
      summary: "Checker output was inconclusive.",
      evidence: ["partial-output"],
      reason: "User wanted to keep the inconclusive run.",
    })

    expect(result.ok).toBe(false)
    expect(result.errors[0]?.code).toBe("invalid-state")
    expect(hashTree(project.root)).toBe(before)
  })
})
