import { afterEach, describe, expect, test } from "bun:test"
import { mkdirSync } from "node:fs"
import { buildInitPreview } from "../src/init-preview"
import { inspectReadiness } from "../src/readiness"
import type { ReadinessResult } from "../src/types"
import { hashTree, makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const project = makeTempProject(); projects.push(project); return project }

describe("init preview", () => {
  test("plans create actions for missing required project files without writing", () => {
    const project = temp()
    const before = hashTree(project.root)
    const preview = buildInitPreview(inspectReadiness(project.root))
    expect(preview.readonly).toBe(true)
    expect(preview.items.find((item) => item.path === "paper.md")?.action).toBe("create")
    expect(preview.items.find((item) => item.path === ".agents/state.json")?.reason).toBe("missing-required")
    expect(preview.items.find((item) => item.path === "relatedwork/")?.action).toBe("optional")
    expect(hashTree(project.root)).toBe(before)
  })

  test("plans create action for missing guidance without writing", () => {
    const project = temp()
    const preview = buildInitPreview(inspectReadiness(project.root))
    const guide = preview.items.find((item) => item.path === "AGENTS.md")
    expect(guide?.action).toBe("create")
    expect(guide?.reason).toBe("missing-guidance")
    expect(guide?.safe).toBe(true)
  })

  test("keeps missing related work optional in direct readiness models", () => {
    const readiness: ReadinessResult = {
      ok: false,
      status: "needs-init",
      root: "/synthetic-project",
      items: [{ id: "relatedwork", path: "relatedwork/", status: "missing", required: false, message: "relatedwork/ is missing." }],
      summary: { ready: 0, missing: 1, conflict: 0, invalid: 0, optional: 0 },
    }
    const relatedWork = buildInitPreview(readiness).items.find((item) => item.path === "relatedwork/")
    expect(relatedWork?.action).toBe("optional")
    expect(relatedWork?.reason).toBe("future-optional")
    expect(relatedWork?.safe).toBe(true)
  })

  test("keeps user-owned AGENTS.md instead of planning overwrite", () => {
    const project = temp()
    project.write("AGENTS.md", "# Existing local guide\n")
    const preview = buildInitPreview(inspectReadiness(project.root))
    const guide = preview.items.find((item) => item.path === "AGENTS.md")
    expect(guide?.action).toBe("exists-user")
    expect(guide?.safe).toBe(true)
  })

  test("marks unsafe targets as blocked conflicts", () => {
    const project = temp()
    mkdirSync(project.path("paper.md"))
    const preview = buildInitPreview(inspectReadiness(project.root))
    expect(preview.blocked).toBe(true)
    expect(preview.items.find((item) => item.path === "paper.md")?.action).toBe("conflict")
    expect(preview.items.find((item) => item.path === "paper.md")?.safe).toBe(false)
  })
})
