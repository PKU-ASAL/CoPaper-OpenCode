import { afterEach, describe, expect, test } from "bun:test"
import { symlinkSync } from "node:fs"
import { buildWorkflowStatus, queryWorkflowLog, renderWorkflowLogOutput, renderWorkflowSetPhaseOutput, renderWorkflowStatusOutput, setWorkflowPhase } from "../src/workflow"
import { hashTree, makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const project = makeTempProject(); projects.push(project); return project }

function dynamicState() {
  return {
    project: {
      name: "Dynamic Workflow Paper",
      created_at: "2026-05-01T10:00:00.000Z",
      domain: "workflow systems",
    },
    phases: {
      intro: {
        status: "complete",
        completed_at: "2026-05-01T11:00:00.000Z",
        target_words: 900,
        notes: ["lead with contribution"],
      },
      discussion_problem_framing: {
        status: "in_progress",
        completed_at: null,
        dimension: "problem framing",
        custom_prompt: "Frame the core problem before evidence mapping.",
        rubric: { novelty: true },
      },
      discussion_evidence_mapping: {
        status: "not_started",
        completed_at: null,
        evidence_slots: 3,
      },
    },
    current_phase: "discussion_problem_framing",
    event_log_path: ".agents/events.jsonl",
    workflow: {
      phase_order: ["discussion_problem_framing", "intro"],
      dependencies: {
        discussion_problem_framing: ["discussion_evidence_mapping"],
        discussion_evidence_mapping: ["discussion_problem_framing"],
      },
      routing_mode: "dynamic",
    },
    retained_top_level: { source: "future-schema" },
  }
}

describe("workflow", () => {
  test("reads dynamic phases and future workflow metadata without assuming fixed phases", async () => {
    const project = temp()
    project.write(".agents/state.json", `${JSON.stringify(dynamicState(), null, 2)}\n`)
    project.write(".agents/events.jsonl", "")
    const before = hashTree(project.root)

    const result = await buildWorkflowStatus({ root: project.root, locale: "zh-CN" })
    const markdown = renderWorkflowStatusOutput(result)

    expect(result.ok).toBe(true)
    expect(result.currentPhase).toBe("discussion_problem_framing")
    expect(result.phases.map((phase) => phase.id)).toEqual(["discussion_problem_framing", "intro", "discussion_evidence_mapping"])
    expect(result.phases.find((phase) => phase.id === "discussion_problem_framing")?.fields).toEqual({
      dimension: "problem framing",
      custom_prompt: "Frame the core problem before evidence mapping.",
      rubric: { novelty: true },
    })
    expect(result.metadata.available).toBe(true)
    expect(result.metadata.phaseOrder).toEqual(["discussion_problem_framing", "intro"])
    expect(result.metadata.dependencies).toEqual({
      discussion_problem_framing: ["discussion_evidence_mapping"],
      discussion_evidence_mapping: ["discussion_problem_framing"],
    })
    expect(result.warnings).toEqual([])
    expect(markdown).toContain("## CoPaper 工作流状态")
    expect(markdown).toContain("discussion_problem_framing")
    expect(markdown).toContain("```json")
    expect(hashTree(project.root)).toBe(before)
  })

  test("returns blocked workflow status for missing or invalid state", async () => {
    const missingProject = temp()
    const missing = await buildWorkflowStatus({ root: missingProject.root, locale: "zh-CN" })
    expect(missing.ok).toBe(false)
    expect(missing.errors[0]?.code).toBe("missing-state")

    const invalidProject = temp()
    invalidProject.write(".agents/state.json", "{invalid json")
    const invalid = await buildWorkflowStatus({ root: invalidProject.root, locale: "zh-CN" })
    expect(invalid.ok).toBe(false)
    expect(invalid.errors[0]?.code).toBe("invalid-state")
  })

  test("queries event log with lastN phase and operator filters", async () => {
    const project = temp()
    project.write(".agents/state.json", `${JSON.stringify(dynamicState(), null, 2)}\n`)
    project.write(".agents/events.jsonl", [
      JSON.stringify({ timestamp: "2026-05-01T11:00:00.000Z", phase: "intro", operator: "user", action: "complete", result: "ok" }),
      "not-json",
      JSON.stringify({ timestamp: "2026-05-01T12:00:00.000Z", phase: "discussion_problem_framing", operator: "ai", action: "draft", result: "ok" }),
      JSON.stringify({ timestamp: "2026-05-01T13:00:00.000Z", phase: "discussion_problem_framing", operator: "user", action: "revise", result: "accepted" }),
    ].join("\n"))

    const result = await queryWorkflowLog({ root: project.root, locale: "zh-CN", phase: "discussion_problem_framing", operator: "user", lastN: 5 })
    const markdown = renderWorkflowLogOutput(result)

    expect(result.ok).toBe(true)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.phase).toBe("discussion_problem_framing")
    expect(result.events[0]?.operator).toBe("user")
    expect(result.skippedMalformed).toBe(1)
    expect(result.warnings).toContain("malformed-events-skipped")
    expect(markdown).toContain("## CoPaper 工作流日志")
    expect(markdown).toContain("discussion_problem_framing")
    expect(markdown).toContain("```json")
  })

  test("returns empty log result when event log is missing", async () => {
    const project = temp()
    project.write(".agents/state.json", `${JSON.stringify(dynamicState(), null, 2)}\n`)

    const result = await queryWorkflowLog({ root: project.root, locale: "zh-CN" })

    expect(result.ok).toBe(true)
    expect(result.events).toEqual([])
    expect(result.warnings).toContain("event-log-missing")
  })

  test("sets a dynamic phase complete, recomputes current phase, preserves unknown fields, and appends event", async () => {
    const project = temp()
    const now = new Date("2026-05-01T14:00:00.000Z")
    project.write(".agents/state.json", `${JSON.stringify(dynamicState(), null, 2)}\n`)
    project.write(".agents/events.jsonl", "")

    const result = await setWorkflowPhase({ root: project.root, locale: "zh-CN", phase: "discussion_problem_framing", status: "complete", now })
    const state = JSON.parse(project.read(".agents/state.json"))
    const events = project.read(".agents/events.jsonl").trim().split("\n").map((line) => JSON.parse(line))

    expect(result.ok).toBe(true)
    expect(result.previousStatus).toBe("in_progress")
    expect(result.nextStatus).toBe("complete")
    expect(result.previousCurrentPhase).toBe("discussion_problem_framing")
    expect(result.currentPhase).toBe("discussion_evidence_mapping")
    expect(result.eventAppended).toBe(true)
    expect(state.current_phase).toBe("discussion_evidence_mapping")
    expect(state.phases.discussion_problem_framing.status).toBe("complete")
    expect(state.phases.discussion_problem_framing.completed_at).toBe(now.toISOString())
    expect(state.phases.discussion_problem_framing.dimension).toBe("problem framing")
    expect(state.workflow.dependencies).toEqual(dynamicState().workflow.dependencies)
    expect(state.workflow.routing_mode).toBe("dynamic")
    expect(state.retained_top_level).toEqual({ source: "future-schema" })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      timestamp: now.toISOString(),
      operator: "user",
      phase: "discussion_problem_framing",
      action: "set_phase_status",
      result: "success",
      metadata: {
        status: "complete",
        previous_status: "in_progress",
        previous_current_phase: "discussion_problem_framing",
      },
    })
  })

  test("supports skipped with required reason and rejects skipped without reason", async () => {
    const project = temp()
    project.write(".agents/state.json", `${JSON.stringify(dynamicState(), null, 2)}\n`)
    project.write(".agents/events.jsonl", "")
    const beforeMissingReason = hashTree(project.root)

    const missingReason = await setWorkflowPhase({ root: project.root, locale: "zh-CN", phase: "discussion_problem_framing", status: "skipped" })
    expect(missingReason.ok).toBe(false)
    expect(missingReason.errors[0]?.code).toBe("missing-reason")
    expect(hashTree(project.root)).toBe(beforeMissingReason)

    const skipped = await setWorkflowPhase({ root: project.root, locale: "zh-CN", phase: "discussion_problem_framing", status: "skipped", reason: "  out of scope  ", now: new Date("2026-05-01T15:00:00.000Z") })
    const state = JSON.parse(project.read(".agents/state.json"))

    expect(skipped.ok).toBe(true)
    expect(state.phases.discussion_problem_framing.status).toBe("skipped")
    expect(state.phases.discussion_problem_framing.completed_at).toBeNull()
    expect(state.phases.discussion_problem_framing.skip_reason).toBe("out of scope")
  })

  test("does not create workflow metadata when it is absent", async () => {
    const project = temp()
    const state = dynamicState()
    delete (state as { workflow?: unknown }).workflow
    project.write(".agents/state.json", `${JSON.stringify(state, null, 2)}\n`)
    project.write(".agents/events.jsonl", "")

    const result = await setWorkflowPhase({ root: project.root, locale: "zh-CN", phase: "discussion_problem_framing", status: "complete", now: new Date("2026-05-01T16:00:00.000Z") })
    const updated = JSON.parse(project.read(".agents/state.json"))

    expect(result.ok).toBe(true)
    expect("workflow" in updated).toBe(false)
  })

  test("rejects invalid phase and invalid status without writing files", async () => {
    const project = temp()
    project.write(".agents/state.json", `${JSON.stringify(dynamicState(), null, 2)}\n`)
    project.write(".agents/events.jsonl", "")
    const before = hashTree(project.root)

    const invalidPhase = await setWorkflowPhase({ root: project.root, locale: "zh-CN", phase: "missing_phase", status: "complete", now: new Date("2026-05-01T17:00:00.000Z") })
    const invalidStatus = await setWorkflowPhase({ root: project.root, locale: "zh-CN", phase: "discussion_problem_framing", status: "done" as never, now: new Date("2026-05-01T17:00:00.000Z") })

    expect(invalidPhase.ok).toBe(false)
    expect(invalidPhase.errors[0]?.code).toBe("invalid-phase")
    expect(invalidStatus.ok).toBe(false)
    expect(invalidStatus.errors[0]?.code).toBe("invalid-status")
    expect(hashTree(project.root)).toBe(before)
  })

  test("rejects inherited phase ids without writing files", async () => {
    const project = temp()
    project.write(".agents/state.json", `${JSON.stringify(dynamicState(), null, 2)}\n`)
    project.write(".agents/events.jsonl", "")
    const before = hashTree(project.root)

    const result = await setWorkflowPhase({ root: project.root, locale: "zh-CN", phase: "toString", status: "complete", now: new Date("2026-05-01T17:30:00.000Z") })

    expect(result.ok).toBe(false)
    expect(result.errors[0]?.code).toBe("invalid-phase")
    expect(result.eventAppended).toBe(false)
    expect(hashTree(project.root)).toBe(before)
  })

  test("rejects blocked custom event log path before writing state", async () => {
    const project = temp()
    const state = dynamicState()
    state.event_log_path = "blocked/events.jsonl"
    project.write(".agents/state.json", `${JSON.stringify(state, null, 2)}\n`)
    project.write("blocked", "not a directory")
    const before = hashTree(project.root)

    const result = await setWorkflowPhase({ root: project.root, locale: "zh-CN", phase: "discussion_problem_framing", status: "complete", now: new Date("2026-05-01T18:00:00.000Z") })

    expect(result.ok).toBe(false)
    expect(result.errors[0]?.code).toBe("event-log-failed")
    expect(result.eventAppended).toBe(false)
    expect(hashTree(project.root)).toBe(before)
  })

  test("rejects dangling symlink event log path before writing state", async () => {
    const project = temp()
    const state = dynamicState()
    state.event_log_path = ".agents/dangling-events.jsonl"
    project.write(".agents/state.json", `${JSON.stringify(state, null, 2)}\n`)
    symlinkSync("missing-events.jsonl", project.path(".agents", "dangling-events.jsonl"))
    const before = hashTree(project.root)

    const result = await setWorkflowPhase({ root: project.root, locale: "zh-CN", phase: "discussion_problem_framing", status: "complete", now: new Date("2026-05-01T18:30:00.000Z") })

    expect(result.ok).toBe(false)
    expect(result.errors[0]?.code).toBe("event-log-failed")
    expect(result.eventAppended).toBe(false)
    expect(hashTree(project.root)).toBe(before)
  })

  test("rejects event log path that targets state file before writing state", async () => {
    const project = temp()
    const state = dynamicState()
    state.event_log_path = ".agents/state.json"
    project.write(".agents/state.json", `${JSON.stringify(state, null, 2)}\n`)
    const before = hashTree(project.root)

    const result = await setWorkflowPhase({ root: project.root, locale: "zh-CN", phase: "discussion_problem_framing", status: "complete", now: new Date("2026-05-01T18:45:00.000Z") })

    expect(result.ok).toBe(false)
    expect(result.errors[0]?.code).toBe("event-log-failed")
    expect(result.eventAppended).toBe(false)
    expect(hashTree(project.root)).toBe(before)
  })

  test("renders localized set-phase output with stable json", async () => {
    const project = temp()
    project.write(".agents/state.json", `${JSON.stringify(dynamicState(), null, 2)}\n`)
    project.write(".agents/events.jsonl", "")

    const result = await setWorkflowPhase({ root: project.root, locale: "zh-CN", phase: "discussion_problem_framing", status: "complete", now: new Date("2026-05-01T19:00:00.000Z") })
    const markdown = renderWorkflowSetPhaseOutput(result)

    expect(markdown).toContain("## CoPaper 阶段状态更新")
    expect(markdown).toContain("discussion_problem_framing")
    expect(markdown).toContain("complete")
    expect(markdown).toContain('"eventAppended": true')
    expect(markdown).toContain("```json")
    expect(markdown).toContain(`\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``)
  })
})
