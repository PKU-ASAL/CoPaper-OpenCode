import { describe, expect, test } from "bun:test"
import type { ToolContext } from "@opencode-ai/plugin"
import { existsSync } from "node:fs"
import { applyInitPlan, planInit } from "../src/installer"
import { VibePaperPlugin } from "../src/index"
import { makeTempProject } from "./fixtures"

async function buildHooks(root: string) {
  return VibePaperPlugin({
    project: {},
    directory: root,
    worktree: root,
    client: { app: { log: async () => undefined } },
    $: async () => undefined,
  } as never)
}

function toolContext(root: string): ToolContext {
  return {
    sessionID: "session-id",
    messageID: "message-id",
    agent: "test-agent",
    directory: root,
    worktree: root,
    abort: new AbortController().signal,
    metadata: () => undefined,
    ask: (() => { throw new Error("Unexpected permission request") }) as ToolContext["ask"],
  }
}

function workflowState() {
  return {
    project: {
      name: "Runtime Workflow Paper",
      created_at: "2026-05-01T10:00:00.000Z",
      domain: "runtime context",
    },
    phases: {
      custom_phase: {
        status: "not_started",
        completed_at: null,
        focus: "runtime-only phase",
      },
    },
    current_phase: "custom_phase",
    event_log_path: ".agents/events.jsonl",
  }
}

describe("OpenCode plugin", () => {
  test("registers dashboard init apply artifact and workflow tools", async () => {
    const hooks = await buildHooks(process.cwd())
    expect(hooks.tool.vibepaper_dashboard).toBeDefined()
    expect(hooks.tool.vibepaper_init_apply).toBeDefined()
    expect(hooks.tool.vibepaper_artifact_status).toBeDefined()
    expect(hooks.tool.vibepaper_artifact_record).toBeDefined()
    expect(hooks.tool.vibepaper_workflow_status).toBeDefined()
    expect(hooks.tool.vibepaper_workflow_log).toBeDefined()
    expect(hooks.tool.vibepaper_workflow_set_phase).toBeDefined()
  })

  test("init apply tool writes files when called with name and domain", async () => {
    const project = makeTempProject()
    try {
      const plan = await planInit({ root: project.root })
      if (!plan.ok) throw new Error(plan.error)
      await applyInitPlan(plan)
      const hooks = await buildHooks(project.root)
      const output = await (hooks.tool.vibepaper_init_apply as { execute(args: { name: string; domain: string }, context: ToolContext): Promise<string> }).execute({ name: "Demo Paper", domain: "software engineering" }, toolContext(project.root))

      expect(output).toContain("## VibePaper 初始化写入")
      expect(output).toContain("paper.md")
      expect(JSON.parse(project.read(".agents/state.json")).project.name).toBe("Demo Paper")
      expect(JSON.parse(project.read(".agents/state.json")).project.domain).toBe("software engineering")
    } finally {
      project.cleanup()
    }
  })

  test("init apply tool writes to runtime context root", async () => {
    const capturedProject = makeTempProject()
    const runtimeProject = makeTempProject()
    try {
      const hooks = await buildHooks(capturedProject.root)
      await (hooks.tool.vibepaper_init_apply as { execute(args: { name: string; domain: string }, context: ToolContext): Promise<string> }).execute(
        { name: "Demo Paper", domain: "software engineering" },
        toolContext(runtimeProject.root),
      )

      const runtimeState = JSON.parse(runtimeProject.read(".agents/state.json"))
      expect(runtimeState.project.name).toBe("Demo Paper")
      expect(runtimeState.project.domain).toBe("software engineering")
      expect(existsSync(capturedProject.path(".agents/state.json"))).toBe(false)
    } finally {
      capturedProject.cleanup()
      runtimeProject.cleanup()
    }
  })

  test("dashboard tool reads from runtime context root", async () => {
    const capturedProject = makeTempProject()
    const runtimeProject = makeTempProject()
    try {
      const hooks = await buildHooks(capturedProject.root)
      const output = await (hooks.tool.vibepaper_dashboard as { execute(args: Record<string, never>, context: ToolContext): Promise<string> }).execute({}, toolContext(runtimeProject.root))

      expect(output).toContain(runtimeProject.root)
      expect(output).not.toContain(capturedProject.root)
    } finally {
      capturedProject.cleanup()
      runtimeProject.cleanup()
    }
  })

  test("artifact status tool reads from runtime context root without writing captured state", async () => {
    const capturedProject = makeTempProject()
    const runtimeProject = makeTempProject()
    try {
      const hooks = await buildHooks(capturedProject.root)
      const output = await (hooks.tool.vibepaper_artifact_status as { execute(args: Record<string, never>, context: ToolContext): Promise<string> }).execute({}, toolContext(runtimeProject.root))

      expect(output).toContain(runtimeProject.root)
      expect(output).toContain("storyline")
      expect(output).not.toContain(capturedProject.root)
      expect(existsSync(capturedProject.path(".agents/state.json"))).toBe(false)
    } finally {
      capturedProject.cleanup()
      runtimeProject.cleanup()
    }
  })

  test("artifact record tool writes to runtime context root", async () => {
    const capturedProject = makeTempProject()
    const runtimeProject = makeTempProject()
    try {
      runtimeProject.write("paper.md", "# Paper\n###### Draft\n<!-- description: Draft -->\nRuntime root draft text is long enough to hash and record readiness.\n")
      runtimeProject.write(".agents/state.json", `${JSON.stringify(workflowState(), null, 2)}\n`)
      runtimeProject.write(".agents/events.jsonl", "")
      const hooks = await buildHooks(capturedProject.root)
      const output = await (hooks.tool.vibepaper_artifact_record as { execute(args: { artifact: string; status: string; confidence: string; evidence: string[]; reason: string }, context: ToolContext): Promise<string> }).execute(
        { artifact: "paper", status: "ready", confidence: "high", evidence: ["manual-review"], reason: "runtime root confirmed" },
        toolContext(runtimeProject.root),
      )

      expect(output).toContain(runtimeProject.root)
      expect(output).toContain("paper")
      expect(JSON.parse(runtimeProject.read(".agents/state.json")).artifacts.paper.status).toBe("ready")
      expect(existsSync(capturedProject.path(".agents/state.json"))).toBe(false)
    } finally {
      capturedProject.cleanup()
      runtimeProject.cleanup()
    }
  })

  test("workflow tools use runtime context root", async () => {
    const capturedProject = makeTempProject()
    const runtimeProject = makeTempProject()
    try {
      runtimeProject.write(".agents/state.json", `${JSON.stringify(workflowState(), null, 2)}\n`)
      runtimeProject.write(".agents/events.jsonl", `${JSON.stringify({ timestamp: "2026-05-01T11:00:00.000Z", phase: "custom_phase", operator: "user", action: "create", result: "ok" })}\n`)
      const hooks = await buildHooks(capturedProject.root)

      const statusOutput = await (hooks.tool.vibepaper_workflow_status as { execute(args: Record<string, never>, context: ToolContext): Promise<string> }).execute({}, toolContext(runtimeProject.root))
      const setPhaseOutput = await (hooks.tool.vibepaper_workflow_set_phase as { execute(args: { phase: string; status: string; reason?: string }, context: ToolContext): Promise<string> }).execute(
        { phase: "custom_phase", status: "in_progress" },
        toolContext(runtimeProject.root),
      )

      expect(statusOutput).toContain(runtimeProject.root)
      expect(statusOutput).toContain("custom_phase")
      expect(setPhaseOutput).toContain(runtimeProject.root)
      expect(setPhaseOutput).toContain("custom_phase")
      expect(JSON.parse(runtimeProject.read(".agents/state.json")).phases.custom_phase.status).toBe("in_progress")
      expect(existsSync(capturedProject.path(".agents/state.json"))).toBe(false)
    } finally {
      capturedProject.cleanup()
      runtimeProject.cleanup()
    }
  })
})
