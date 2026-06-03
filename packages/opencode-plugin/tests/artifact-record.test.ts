import { afterEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, symlinkSync } from "node:fs"
import { recordArtifactReadiness, renderArtifactRecordOutput } from "../src/artifact-record"
import { hashTree, makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const project = makeTempProject(); projects.push(project); return project }

function writeReadyState(project: ReturnType<typeof makeTempProject>) {
  project.write("paper.md", "# Paper\n###### Draft\n<!-- description: Draft -->\nThis draft contains enough text to compute a stable hash for readiness recording.\n")
  project.write("storyline.md", "# Storyline\n")
  project.write(".agents/state.json", `${JSON.stringify({
    project: { name: "Artifact Record Paper" },
    phases: { writing: { status: "not_started", completed_at: null, keep: true } },
    current_phase: "writing",
    event_log_path: ".agents/events.jsonl",
    workflow: { phase_order: ["writing"], custom: true },
    custom_top_level: { preserved: true },
  }, null, 2)}\n`)
  project.write(".agents/events.jsonl", "")
}

describe("artifact record", () => {
  test("records artifact readiness and appends audit event", async () => {
    const project = temp()
    writeReadyState(project)

    const result = await recordArtifactReadiness({
      root: project.root,
      artifact: "paper",
      status: "ready",
      confidence: "high",
      evidence: ["manual-review"],
      reason: "user confirmed the draft is usable",
      now: new Date("2026-05-02T13:00:00.000Z"),
    })
    const markdown = renderArtifactRecordOutput(result)
    const state = JSON.parse(project.read(".agents/state.json"))
    const events = project.read(".agents/events.jsonl").trim().split("\n").map((line) => JSON.parse(line))

    expect(result.ok).toBe(true)
    expect(result.eventAppended).toBe(true)
    expect(result.record?.status).toBe("ready")
    expect(result.record?.content_hash).toMatch(/^sha256:/)
    expect(state.artifacts.paper.status).toBe("ready")
    expect(state.artifacts.paper.provenance.reason).toBe("user confirmed the draft is usable")
    expect(state.custom_top_level.preserved).toBe(true)
    expect(state.phases.writing.keep).toBe(true)
    expect(state.workflow.custom).toBe(true)
    expect(events[0].action).toBe("record_artifact_readiness")
    expect(events[0].metadata.artifact).toBe("paper")
    expect(markdown).toContain("## CoPaper 工件就绪度记录")
    expect(markdown).toContain("paper")
    expect(markdown).toContain("record_artifact_readiness")
    expect(markdown).toContain("```json")
  })

  test("preserves unknown artifact records and replaces only target artifact", async () => {
    const project = temp()
    writeReadyState(project)
    const state = JSON.parse(project.read(".agents/state.json"))
    state.artifacts = {
      unknown_future: { status: "future", custom: true },
      paper: {
        status: "partial",
        confidence: "medium",
        evidence: ["old"],
        provenance: { source: "opencode", operator: "user", reason: "old reason" },
        updated_at: "2026-05-01T10:00:00.000Z",
        custom_field: "keep previous only in previousRecord",
      },
    }
    project.write(".agents/state.json", `${JSON.stringify(state, null, 2)}\n`)

    const result = await recordArtifactReadiness({ root: project.root, artifact: "paper", status: "ready", confidence: "high", evidence: ["new"], reason: "new reason", now: new Date("2026-05-02T13:00:00.000Z") })
    const nextState = JSON.parse(project.read(".agents/state.json"))

    expect(result.previousRecord?.status).toBe("partial")
    expect(nextState.artifacts.unknown_future.custom).toBe(true)
    expect(nextState.artifacts.paper.evidence).toEqual(["new"])
    expect(nextState.artifacts.paper.custom_field).toBeUndefined()
  })

  test("ignores malformed previous artifact record while replacing target", async () => {
    const project = temp()
    writeReadyState(project)
    const state = JSON.parse(project.read(".agents/state.json"))
    state.artifacts = {
      paper: { status: "future", custom: true },
    }
    project.write(".agents/state.json", `${JSON.stringify(state, null, 2)}\n`)

    const result = await recordArtifactReadiness({ root: project.root, artifact: "paper", status: "ready", confidence: "high", evidence: ["manual-review"], reason: "valid replacement", now: new Date("2026-05-02T13:00:00.000Z") })
    const nextState = JSON.parse(project.read(".agents/state.json"))

    expect(result.ok).toBe(true)
    expect(result.previousRecord).toBe(null)
    expect(nextState.artifacts.paper.status).toBe("ready")
  })

  test("rejects invalid args without writing files", async () => {
    const project = temp()
    writeReadyState(project)
    const before = hashTree(project.root)

    const result = await recordArtifactReadiness({ root: project.root, artifact: "skills", status: "ready", confidence: "high", evidence: ["manual-review"], reason: "skills are scan-only" })

    expect(result.ok).toBe(false)
    expect(result.errors[0]?.code).toBe("invalid-artifact")
    expect(result.eventAppended).toBe(false)
    expect(hashTree(project.root)).toBe(before)
  })

  test("rejects missing and invalid state without writing event log", async () => {
    const missing = temp()
    const missingResult = await recordArtifactReadiness({ root: missing.root, artifact: "paper", status: "ready", confidence: "high", evidence: ["manual-review"], reason: "state missing" })
    expect(missingResult.ok).toBe(false)
    expect(missingResult.errors[0]?.code).toBe("missing-state")

    const invalid = temp()
    invalid.write(".agents/state.json", "{ invalid json")
    invalid.write(".agents/events.jsonl", "")
    const before = hashTree(invalid.root)
    const invalidResult = await recordArtifactReadiness({ root: invalid.root, artifact: "paper", status: "ready", confidence: "high", evidence: ["manual-review"], reason: "state invalid" })
    expect(invalidResult.ok).toBe(false)
    expect(invalidResult.errors[0]?.code).toBe("invalid-state")
    expect(hashTree(invalid.root)).toBe(before)
  })

  test("reports event append failure after state write", async () => {
    const project = temp()
    writeReadyState(project)
    rmSync(project.path(".agents/events.jsonl"))
    mkdirSync(project.path(".agents/events.jsonl"))

    const result = await recordArtifactReadiness({ root: project.root, artifact: "paper", status: "ready", confidence: "high", evidence: ["manual-review"], reason: "event failure", now: new Date("2026-05-02T13:00:00.000Z") })
    expect(result.ok).toBe(false)
    expect(result.eventAppended).toBe(false)
    expect(result.warnings).toContain("state-written-event-failed")
    expect(JSON.parse(project.read(".agents/state.json")).artifacts.paper.status).toBe("ready")
  })

  test("rejects event log path targeting state without writing files", async () => {
    const project = temp()
    writeReadyState(project)
    const state = JSON.parse(project.read(".agents/state.json"))
    state.event_log_path = ".agents/state.json"
    project.write(".agents/state.json", `${JSON.stringify(state, null, 2)}\n`)
    const before = hashTree(project.root)

    const result = await recordArtifactReadiness({ root: project.root, artifact: "paper", status: "ready", confidence: "high", evidence: ["manual-review"], reason: "unsafe event log", now: new Date("2026-05-02T13:00:00.000Z") })

    expect(result.ok).toBe(false)
    expect(result.eventAppended).toBe(false)
    expect(result.errors[0]?.code).toBe("event-log-failed")
    expect(result.warnings).not.toContain("state-written-event-failed")
    expect(hashTree(project.root)).toBe(before)
  })

  test("rejects non-canonical event log path without writing files", async () => {
    const project = temp()
    writeReadyState(project)
    const state = JSON.parse(project.read(".agents/state.json"))
    state.event_log_path = "paper.md"
    project.write(".agents/state.json", `${JSON.stringify(state, null, 2)}\n`)
    const paperBefore = project.read("paper.md")
    const treeBefore = hashTree(project.root)

    const result = await recordArtifactReadiness({ root: project.root, artifact: "paper", status: "ready", confidence: "high", evidence: ["manual-review"], reason: "bad event path", now: new Date("2026-05-02T13:00:00.000Z") })

    expect(result.ok).toBe(false)
    expect(result.eventAppended).toBe(false)
    expect(result.errors[0]?.code).toBe("event-log-failed")
    expect(project.read("paper.md")).toBe(paperBefore)
    expect(hashTree(project.root)).toBe(treeBefore)
  })

  test("rejects symlink event log path without writing files", async () => {
    const project = temp()
    writeReadyState(project)
    const state = JSON.parse(project.read(".agents/state.json"))
    state.event_log_path = ".agents/events-link.jsonl"
    project.write(".agents/state.json", `${JSON.stringify(state, null, 2)}\n`)
    symlinkSync("events.jsonl", project.path(".agents/events-link.jsonl"))
    const before = hashTree(project.root)

    const result = await recordArtifactReadiness({ root: project.root, artifact: "paper", status: "ready", confidence: "high", evidence: ["manual-review"], reason: "symlink event log", now: new Date("2026-05-02T13:00:00.000Z") })

    expect(result.ok).toBe(false)
    expect(result.eventAppended).toBe(false)
    expect(result.errors[0]?.code).toBe("event-log-failed")
    expect(result.warnings).not.toContain("state-written-event-failed")
    expect(hashTree(project.root)).toBe(before)
  })

  test("records with warning when content hash is unavailable", async () => {
    const project = temp()
    writeReadyState(project)
    rmSync(project.path("paper.md"))
    symlinkSync("missing-paper.md", project.path("paper.md"))

    const result = await recordArtifactReadiness({ root: project.root, artifact: "paper", status: "ready", confidence: "high", evidence: ["manual-review"], reason: "symlink content", now: new Date("2026-05-02T13:00:00.000Z") })
    const state = JSON.parse(project.read(".agents/state.json"))

    expect(result.ok).toBe(true)
    expect(result.eventAppended).toBe(true)
    expect(result.warnings).toContain("content-hash-unavailable")
    expect(result.record?.content_hash).toBeUndefined()
    expect(state.artifacts.paper.content_hash).toBeUndefined()
  })
})
