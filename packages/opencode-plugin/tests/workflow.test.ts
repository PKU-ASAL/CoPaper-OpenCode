import { afterEach, describe, expect, test } from "bun:test"
import { buildWorkflowStatus, queryWorkflowLog, renderWorkflowLogOutput, renderWorkflowStatusOutput } from "../src/workflow"
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
    },
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
    expect(markdown).toContain("## VibePaper 工作流状态")
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
    expect(markdown).toContain("## VibePaper 工作流日志")
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
})
