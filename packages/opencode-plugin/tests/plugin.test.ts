import { describe, expect, test } from "bun:test"
import type { ToolContext } from "@opencode-ai/plugin"
import { existsSync } from "node:fs"
import type { VibePaperAgentRuntimeState } from "../src/agent-config"
import { agentRuntimeToDoctorChecks, getLatestVibePaperAgentRuntimeState, setLatestVibePaperAgentRuntimeState } from "../src/agent-diagnostics"
import { applyInitPlan, planInit } from "../src/installer"
import { VibePaperPlugin } from "../src/index"
import { hashTree, makeTempProject } from "./fixtures"

type PluginConfigInput = {
  agent?: Record<string, unknown>
}

type PluginConfigHook = (input: PluginConfigInput) => void | PluginConfigInput | Promise<void | PluginConfigInput>

async function buildHooks(root: string) {
  return VibePaperPlugin({
    project: {},
    directory: root,
    worktree: root,
    client: { app: { log: async () => undefined } },
    $: async () => undefined,
  } as never)
}

function configHook(hooks: Awaited<ReturnType<typeof buildHooks>>): PluginConfigHook {
  const config = (hooks as { config?: PluginConfigHook }).config
  if (config === undefined) throw new Error("Expected plugin config hook to be registered")
  return config
}

function toolContext(root: string, agent = "test-agent"): ToolContext {
  return {
    sessionID: "session-id",
    messageID: "message-id",
    agent,
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
  test("config hook injects VibePaper subagents into empty agent config", async () => {
    const project = makeTempProject("plugin-config-empty-")
    try {
      const hooks = await buildHooks(project.root)
      const input: PluginConfigInput = {}

      await configHook(hooks)(input)

      expect(Object.keys(input.agent ?? {})).toEqual([
        "vibepaper-coordinator",
        "vibepaper-storyline",
        "vibepaper-writer",
        "vibepaper-recorder",
      ])
    } finally {
      project.cleanup()
    }
  })

  test("config hook does not overwrite user-defined same-name agent", async () => {
    const project = makeTempProject("plugin-config-conflict-")
    try {
      const userAgent = {
        description: "User-owned writer",
        mode: "subagent",
        prompt: "Do not replace me.",
        permission: { read: "allow" },
      }
      const input: PluginConfigInput = { agent: { "vibepaper-writer": userAgent } }
      const hooks = await buildHooks(project.root)

      await configHook(hooks)(input)

      expect(input.agent?.["vibepaper-writer"]).toBe(userAgent)
      expect(input.agent?.["vibepaper-coordinator"]).toBeDefined()
      expect(Object.keys(input.agent ?? {})).not.toContain("vibepaper-writer-copy")
    } finally {
      project.cleanup()
    }
  })

  test("config hook remains idempotent across repeated runs", async () => {
    const project = makeTempProject("plugin-config-idempotent-")
    try {
      const input: PluginConfigInput = {}
      const hooks = await buildHooks(project.root)
      const configure = configHook(hooks)

      await configure(input)
      await configure(input)

      expect(Object.keys(input.agent ?? {})).toEqual([
        "vibepaper-coordinator",
        "vibepaper-storyline",
        "vibepaper-writer",
        "vibepaper-recorder",
      ])
      expect(getLatestVibePaperAgentRuntimeState(project.root).agents.every((agent) => agent.status !== "conflicted")).toBe(true)
    } finally {
      project.cleanup()
    }
  })

  test("config hook preserves user replacement of a previously injected agent", async () => {
    const project = makeTempProject("plugin-config-user-replacement-")
    try {
      const input: PluginConfigInput = {}
      const hooks = await buildHooks(project.root)
      const configure = configHook(hooks)

      await configure(input)
      const userWriter = { prompt: "user writer" }
      input.agent = { ...input.agent, "vibepaper-writer": userWriter }
      await configure(input)

      expect(input.agent?.["vibepaper-writer"]).toBe(userWriter)
      expect(getLatestVibePaperAgentRuntimeState(project.root).agents.find((agent) => agent.name === "vibepaper-writer")?.status).toBe("conflicted")
    } finally {
      project.cleanup()
    }
  })

  test("runtime state helpers isolate roots with latest fallback", () => {
    const firstProject = makeTempProject("runtime-state-first-")
    const secondProject = makeTempProject("runtime-state-second-")
    const missingProject = makeTempProject("runtime-state-missing-")
    const firstRuntime: VibePaperAgentRuntimeState = {
      agents: [{ name: "vibepaper-coordinator", status: "injected", description: "First root", permissionProfile: "readOnly", temperature: 0.2 }],
      diagnostics: [],
    }
    const secondRuntime: VibePaperAgentRuntimeState = {
      agents: [{ name: "vibepaper-writer", status: "disabled", description: "Second root", permissionProfile: "paperWrite", temperature: 0.4 }],
      diagnostics: [],
    }

    try {
      setLatestVibePaperAgentRuntimeState(firstRuntime, firstProject.root)
      expect(getLatestVibePaperAgentRuntimeState(missingProject.root)).toEqual({ agents: [], diagnostics: [] })

      setLatestVibePaperAgentRuntimeState(secondRuntime, secondProject.root)

      expect(getLatestVibePaperAgentRuntimeState(firstProject.root)).toBe(firstRuntime)
      expect(getLatestVibePaperAgentRuntimeState(secondProject.root)).toBe(secondRuntime)
      expect(getLatestVibePaperAgentRuntimeState()).toBe(secondRuntime)
    } finally {
      firstProject.cleanup()
      secondProject.cleanup()
      missingProject.cleanup()
    }
  })

  test("agent runtime maps to doctor checks and skips config missing", () => {
    const checks = agentRuntimeToDoctorChecks({
      agents: [
        { name: "vibepaper-coordinator", status: "injected", description: "Coordinator", permissionProfile: "readOnly", temperature: 0.2 },
        { name: "vibepaper-storyline", status: "disabled", description: "Storyline", permissionProfile: "readOnly", temperature: 0.4 },
        { name: "vibepaper-writer", status: "conflicted", description: "Writer", permissionProfile: "paperWrite", temperature: 0.4 },
      ],
      diagnostics: [
        { severity: "info", code: "config-missing", message: "Project config is missing; defaults are used." },
        { severity: "warning", code: "unsupported-field", message: "Unsupported field is ignored.", field: "defaults.extra" },
        { severity: "error", code: "config-read-failed", message: "Project config could not be read." },
      ],
    })

    expect(checks).toEqual([
      {
        id: "agents.vibepaper-coordinator",
        status: "pass",
        severity: "info",
        message: "VibePaper agent \"vibepaper-coordinator\" is injected",
        remediation: null,
      },
      {
        id: "agents.vibepaper-storyline",
        status: "warn",
        severity: "warning",
        message: "VibePaper agent \"vibepaper-storyline\" is disabled",
        remediation: "Set agents.vibepaper-storyline.enabled to true in .opencode/vibepaper.json",
      },
      {
        id: "agents.vibepaper-writer",
        status: "fail",
        severity: "warning",
        message: "VibePaper agent \"vibepaper-writer\" conflicts with an existing OpenCode agent",
        remediation: "Rename the existing agent or disable agents.vibepaper-writer in .opencode/vibepaper.json",
      },
      {
        id: "agent-config.unsupported-field.defaults.extra",
        status: "warn",
        severity: "warning",
        message: "Unsupported field is ignored.",
        remediation: "Fix .opencode/vibepaper.json, then restart OpenCode",
      },
      {
        id: "agent-config.config-read-failed",
        status: "fail",
        severity: "error",
        message: "Project config could not be read.",
        remediation: "Fix .opencode/vibepaper.json, then restart OpenCode",
      },
    ])
  })

  test("config hook has no startup file write side effects", async () => {
    const project = makeTempProject("plugin-config-readonly-")
    try {
      const before = hashTree(project.root)
      const hooks = await buildHooks(project.root)
      const input: PluginConfigInput = {}

      await configHook(hooks)(input)

      expect(hashTree(project.root)).toBe(before)
    } finally {
      project.cleanup()
    }
  })

  test("registers dashboard init apply artifact and workflow tools", async () => {
    const hooks = await buildHooks(process.cwd())
    expect(hooks.tool.vibepaper_dashboard).toBeDefined()
    expect(hooks.tool.vibepaper_init_apply).toBeDefined()
    expect(hooks.tool.vibepaper_artifact_status).toBeDefined()
    expect(hooks.tool.vibepaper_paper_structure_status).toBeDefined()
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

  test("paper structure tool reads from runtime context root", async () => {
    const capturedProject = makeTempProject()
    const runtimeProject = makeTempProject()
    try {
      runtimeProject.write("paper.md", "# Runtime Paper\n## Intro\n##### Problem\n###### Runtime context\nA short paragraph.\n")
      const hooks = await buildHooks(capturedProject.root)
      const output = await (hooks.tool.vibepaper_paper_structure_status as { execute(args: Record<string, never>, context: ToolContext): Promise<string> }).execute({}, toolContext(runtimeProject.root))

      expect(output).toContain(runtimeProject.root)
      expect(output).toContain("Problem")
      expect(output).not.toContain(capturedProject.root)
      expect(existsSync(capturedProject.path("paper.md"))).toBe(false)
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
        toolContext(runtimeProject.root, "vibepaper-recorder"),
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

  test("artifact record tool denies non-recorder agents without writing state", async () => {
    const project = makeTempProject()
    try {
      project.write("paper.md", "# Paper\n###### Draft\n<!-- description: Draft -->\nRuntime root draft text is long enough to hash and record readiness.\n")
      project.write(".agents/state.json", `${JSON.stringify(workflowState(), null, 2)}\n`)
      project.write(".agents/events.jsonl", "")
      const beforeState = project.read(".agents/state.json")
      const hooks = await buildHooks(project.root)

      const output = await (hooks.tool.vibepaper_artifact_record as { execute(args: { artifact: string; status: string; confidence: string; evidence: string[]; reason: string }, context: ToolContext): Promise<string> }).execute(
        { artifact: "paper", status: "ready", confidence: "high", evidence: ["manual-review"], reason: "runtime root confirmed" },
        toolContext(project.root, "vibepaper-writer"),
      )

      expect(output).toContain("agent-not-authorized")
      expect(project.read(".agents/state.json")).toBe(beforeState)
      expect(project.read(".agents/events.jsonl")).toBe("")
    } finally {
      project.cleanup()
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
