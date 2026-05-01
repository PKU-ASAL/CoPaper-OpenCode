import { afterEach, describe, expect, test } from "bun:test"
import { applyInitPlan, planInit } from "../src/installer"
import { buildDashboardResult, renderDashboardOutput } from "../src/dashboard"
import { hashTree, makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const project = makeTempProject(); projects.push(project); return project }

describe("dashboard", () => {
  test("renders Chinese readiness and init preview for healthy OpenCode integration", async () => {
    const project = temp()
    const plan = await planInit({ root: project.root })
    if (!plan.ok) throw new Error(plan.error)
    await applyInitPlan(plan)
    const before = hashTree(project.root)

    const result = await buildDashboardResult({ root: project.root, packageVersion: "0.1.0", locale: "zh-CN" })
    const markdown = renderDashboardOutput(result)

    expect(result.ok).toBe(false)
    expect(result.locale).toBe("zh-CN")
    expect(result.readiness?.status).toBe("needs-init")
    expect(result.initPreview.items.find((item) => item.path === "paper.md")?.action).toBe("create")
    expect(markdown).toContain("## VibePaper 项目仪表盘")
    expect(markdown).toContain("**状态：")
    expect(markdown).toContain("项目就绪度")
    expect(markdown).toContain("就绪=")
    expect(markdown).toContain("缺失=")
    expect(markdown).toContain("初始化预览")
    expect(markdown).toContain("paper.md")
    expect(markdown).toContain("```json")
    expect(markdown).toContain("\"action\": \"create\"")
    expect(hashTree(project.root)).toBe(before)
  })

  test("renders English Dashboard when requested", async () => {
    const project = temp()
    const plan = await planInit({ root: project.root, locale: "en-US" })
    if (!plan.ok) throw new Error(plan.error)
    await applyInitPlan(plan)

    const result = await buildDashboardResult({ root: project.root, packageVersion: "0.1.0", locale: "en-US" })
    const markdown = renderDashboardOutput(result)
    expect(result.locale).toBe("en-US")
    expect(markdown).toContain("## VibePaper Project Dashboard")
    expect(markdown).toContain("**Status:**")
    expect(markdown).toContain("ready=")
    expect(markdown).toContain("Init Preview")
  })

  test("prioritizes broken OpenCode integration over init preview", async () => {
    const project = temp()
    const result = await buildDashboardResult({ root: project.root, packageVersion: "0.1.0", locale: "zh-CN" })
    const markdown = renderDashboardOutput(result)
    expect(result.integration.pluginConfigured).toBe(false)
    expect(result.readiness).toBe(null)
    expect(result.initPreview.items).toEqual([])
    expect(result.recommendation.id).toBe("repair-installation")
    expect(markdown).toContain("先修复 OpenCode 插件安装")
  })

  test("reports ready project without advancing workflow", async () => {
    const project = temp()
    const plan = await planInit({ root: project.root })
    if (!plan.ok) throw new Error(plan.error)
    await applyInitPlan(plan)
    project.write("paper.md", "# Paper\n")
    project.write("storyline.md", "# Storyline\n")
    project.write("writingrules.md", "# Rules\n")
    project.write(".agents/state.json", "{}\n")
    project.write(".agents/events.jsonl", "")
    project.write("AGENTS.md", "# VibePaper project guide\n")

    const result = await buildDashboardResult({ root: project.root, packageVersion: "0.1.0", locale: "zh-CN" })
    expect(result.ok).toBe(true)
    expect(result.readiness?.status).toBe("ready")
    expect(result.recommendation.id).toBe("continue-workflow")
    expect(renderDashboardOutput(result)).toContain("项目已具备核心 VibePaper 文件")
  })
})
