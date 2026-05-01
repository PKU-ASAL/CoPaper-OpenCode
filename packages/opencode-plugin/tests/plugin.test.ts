import { describe, expect, test } from "bun:test"
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

function buildToolContext(root: string) {
  return {
    sessionID: "session-id",
    messageID: "message-id",
    agent: "test-agent",
    directory: root,
    worktree: root,
    abort: new AbortController().signal,
    metadata: {},
    ask: async () => undefined,
  } as never
}

describe("OpenCode plugin", () => {
  test("registers dashboard and init apply tools", async () => {
    const hooks = await buildHooks(process.cwd())
    expect(hooks.tool.vibepaper_dashboard).toBeDefined()
    expect(hooks.tool.vibepaper_init_apply).toBeDefined()
  })

  test("init apply tool writes files when called with name and domain", async () => {
    const project = makeTempProject()
    try {
      const plan = await planInit({ root: project.root })
      if (!plan.ok) throw new Error(plan.error)
      await applyInitPlan(plan)
      const hooks = await buildHooks(project.root)
      const output = await (hooks.tool.vibepaper_init_apply as { execute(args: { name: string; domain: string }, context: unknown): Promise<string> }).execute({ name: "Demo Paper", domain: "software engineering" }, buildToolContext(project.root))

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
      await (hooks.tool.vibepaper_init_apply as { execute(args: { name: string; domain: string }, context: unknown): Promise<string> }).execute(
        { name: "Demo Paper", domain: "software engineering" },
        buildToolContext(runtimeProject.root),
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
})
