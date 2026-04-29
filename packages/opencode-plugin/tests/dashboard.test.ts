import { afterEach, describe, expect, test } from "bun:test"
import { applyInitPlan, planInit } from "../src/installer"
import { buildDashboardResult, renderDashboardOutput } from "../src/dashboard"
import { makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const p = makeTempProject(); projects.push(p); return p }

describe("dashboard", () => {
  test("renders healthy installation dashboard with fenced json", async () => {
    const project = temp()
    const plan = await planInit({ root: project.root })
    if (!plan.ok) throw new Error(plan.error)
    await applyInitPlan(plan)
    const result = await buildDashboardResult({ root: project.root, packageVersion: "0.1.0" })
    expect(result.ok).toBe(true)
    const markdown = renderDashboardOutput(result)
    expect(markdown).toContain("## VibePaper Dashboard")
    expect(markdown).toContain("```json")
    expect(markdown).toContain("pluginConfigured")
    expect(markdown).not.toContain("paper.md")
    expect(markdown).not.toContain("storyline.md")
    expect(markdown).not.toContain("relatedwork")
  })

  test("renders unhealthy dashboard without throwing", async () => {
    const project = temp()
    const result = await buildDashboardResult({ root: project.root, packageVersion: "0.1.0" })
    expect(result.ok).toBe(false)
    expect(renderDashboardOutput(result)).toContain("incomplete installation")
  })
})
