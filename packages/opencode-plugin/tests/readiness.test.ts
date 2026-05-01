import { afterEach, describe, expect, test } from "bun:test"
import { mkdirSync } from "node:fs"
import { inspectReadiness } from "../src/readiness"
import { hashTree, makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const project = makeTempProject(); projects.push(project); return project }

describe("readiness", () => {
  test("reports missing project files without mutating the tree", () => {
    const project = temp()
    const before = hashTree(project.root)
    const result = inspectReadiness(project.root)
    expect(result.status).toBe("needs-init")
    expect(result.ok).toBe(false)
    expect(result.items.find((item) => item.path === "paper.md")?.status).toBe("missing")
    expect(result.items.find((item) => item.path === "relatedwork/")?.status).toBe("optional")
    expect(hashTree(project.root)).toBe(before)
  })

  test("reports ready when core files and state files are valid", () => {
    const project = temp()
    project.write("paper.md", "# Paper\n")
    project.write("storyline.md", "# Storyline\n")
    project.write("writingrules.md", "# Rules\n")
    project.write(".agents/state.json", "{}\n")
    project.write(".agents/events.jsonl", "")
    project.write("AGENTS.md", "# VibePaper project guide\n")

    const result = inspectReadiness(project.root)
    expect(result.ok).toBe(true)
    expect(result.status).toBe("ready")
    expect(result.items.find((item) => item.path === ".agents/state.json")?.status).toBe("ready")
    expect(result.items.find((item) => item.path === "AGENTS.md")?.status).toBe("exists-managed")
  })

  test("reports conflicts and invalid state as blocked", () => {
    const project = temp()
    mkdirSync(project.path("paper.md"))
    project.write("storyline.md", "# Storyline\n")
    project.write("writingrules.md", "# Rules\n")
    project.write(".agents/state.json", "not json\n")
    project.write(".agents/events.jsonl", "")

    const result = inspectReadiness(project.root)
    expect(result.status).toBe("blocked")
    expect(result.ok).toBe(false)
    expect(result.items.find((item) => item.path === "paper.md")?.status).toBe("conflict")
    expect(result.items.find((item) => item.path === ".agents/state.json")?.status).toBe("invalid")
  })

  test("marks user-owned AGENTS.md as non-blocking review item", () => {
    const project = temp()
    project.write("AGENTS.md", "# Local instructions\n")
    const result = inspectReadiness(project.root)
    const item = result.items.find((candidate) => candidate.path === "AGENTS.md")
    expect(item?.status).toBe("exists-user")
    expect(item?.required).toBe(false)
  })
})
