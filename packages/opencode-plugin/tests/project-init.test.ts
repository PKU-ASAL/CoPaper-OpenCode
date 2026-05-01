import { afterEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync } from "node:fs"
import { applyProjectInit, renderProjectInitApplyOutput } from "../src/project-init"
import { inspectReadiness } from "../src/readiness"
import { hashTree, makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const project = makeTempProject(); projects.push(project); return project }

describe("project init apply", () => {
  test("writes core files and makes readiness ready", async () => {
    const project = temp()
    const result = await applyProjectInit({ root: project.root, name: "Demo Paper", domain: "software engineering", now: new Date("2026-05-01T10:00:00.000Z") })

    expect(result.ok).toBe(true)
    expect(result.mode).toBe("apply")
    expect(result.changedFiles).toEqual(["paper.md", "storyline.md", "writingrules.md", "AGENTS.md", ".agents/state.json", ".agents/events.jsonl"])
    expect(result.skippedFiles).toEqual([])
    expect(result.errors).toEqual([])
    expect(result.readinessBefore?.status).toBe("needs-init")
    expect(result.readinessAfter?.status).toBe("ready")
    expect(JSON.parse(project.read(".agents/state.json")).project).toEqual({ name: "Demo Paper", created_at: "2026-05-01T10:00:00.000Z", domain: "software engineering" })
    expect(project.read(".agents/events.jsonl")).toBe("")
    expect(existsSync(project.path("relatedwork"))).toBe(false)
    expect(existsSync(project.path(".agents", "skills"))).toBe(false)
    expect(inspectReadiness(project.root).status).toBe("ready")
  })

  test("returns structured error when name or domain is missing", async () => {
    const project = temp()
    const before = hashTree(project.root)
    const result = await applyProjectInit({ root: project.root, name: " ", domain: "", now: new Date("2026-05-01T10:00:00.000Z") })

    expect(result.ok).toBe(false)
    expect(result.changedFiles).toEqual([])
    expect(result.errors.map((error) => error.code)).toEqual(["missing-name", "missing-domain"])
    expect(hashTree(project.root)).toBe(before)
  })

  test("aborts all writes when any target conflicts", async () => {
    const project = temp()
    project.write("paper.md", "# User paper\n")
    const before = hashTree(project.root)

    const result = await applyProjectInit({ root: project.root, name: "Demo Paper", domain: "software engineering", now: new Date("2026-05-01T10:00:00.000Z") })

    expect(result.ok).toBe(false)
    expect(result.changedFiles).toEqual([])
    expect(result.conflicts.map((conflict) => conflict.path)).toContain("paper.md")
    expect(existsSync(project.path("storyline.md"))).toBe(false)
    expect(hashTree(project.root)).toBe(before)
  })

  test("aborts when a target path is a directory", async () => {
    const project = temp()
    mkdirSync(project.path("AGENTS.md"))
    const before = hashTree(project.root)

    const result = await applyProjectInit({ root: project.root, name: "Demo Paper", domain: "software engineering", now: new Date("2026-05-01T10:00:00.000Z") })

    expect(result.ok).toBe(false)
    expect(result.changedFiles).toEqual([])
    expect(result.conflicts.find((conflict) => conflict.path === "AGENTS.md")?.status).toBe("conflict")
    expect(hashTree(project.root)).toBe(before)
  })

  test("renders localized markdown and stable json", async () => {
    const project = temp()
    const result = await applyProjectInit({ root: project.root, name: "Demo Paper", domain: "software engineering", now: new Date("2026-05-01T10:00:00.000Z"), locale: "zh-CN" })
    const markdown = renderProjectInitApplyOutput(result)

    expect(markdown).toContain("## VibePaper 初始化写入")
    expect(markdown).toContain("已写入")
    expect(markdown).toContain("重新运行 `/vibe`")
    expect(markdown).toContain("```json")
    expect(markdown).toContain('"mode": "apply"')
    expect(markdown).toContain('"changedFiles"')
    expect(markdown).not.toContain('"将创建"')
  })
})
