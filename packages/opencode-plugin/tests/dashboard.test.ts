import { afterEach, describe, expect, test } from "bun:test"
import { applyInitPlan, planInit } from "../src/installer"
import { applyProjectInit } from "../src/project-init"
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
    expect(markdown).not.toContain("### 工作流")
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

  test("keeps recommendation model stable across locales", async () => {
    const project = temp()
    const plan = await planInit({ root: project.root })
    if (!plan.ok) throw new Error(plan.error)
    await applyInitPlan(plan)

    const zhResult = await buildDashboardResult({ root: project.root, packageVersion: "0.1.0", locale: "zh-CN" })
    const enResult = await buildDashboardResult({ root: project.root, packageVersion: "0.1.0", locale: "en-US" })
    const zhRecommendation = zhResult.recommendation as unknown as Record<string, unknown>
    const enRecommendation = enResult.recommendation as unknown as Record<string, unknown>
    const zhMarkdown = renderDashboardOutput(zhResult)
    const enMarkdown = renderDashboardOutput(enResult)

    expect(zhResult.recommendation.id).toBe(enResult.recommendation.id)
    expect(zhResult.recommendation.command).toBe(enResult.recommendation.command)
    expect(zhRecommendation.messageKey).toBe("recommendation.previewInit")
    expect(enRecommendation.messageKey).toBe("recommendation.previewInit")
    expect("message" in zhRecommendation).toBe(false)
    expect("message" in enRecommendation).toBe(false)
    expect(zhMarkdown).toContain("检查初始化预览；本阶段不会写入文件。")
    expect(enMarkdown).toContain("Review the init preview; this phase does not write files.")
    expect(zhMarkdown).toContain("\"messageKey\": \"recommendation.previewInit\"")
    expect(zhMarkdown).not.toContain("\"message\": \"检查初始化预览")
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

  test("does not expose workflow section for ready files with invalid workflow state", async () => {
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
    const markdown = renderDashboardOutput(result)

    expect(result.ok).toBe(true)
    expect(result.readiness?.status).toBe("ready")
    expect(result.workflowStatus?.ok).toBe(false)
    expect(result.workflowStatus?.errors[0]?.code).toBe("invalid-state")
    expect(markdown).not.toContain("### 工作流")
  })

  test("dashboard becomes ready after init apply", async () => {
    const project = temp()
    const plan = await planInit({ root: project.root })
    if (!plan.ok) throw new Error(plan.error)
    await applyInitPlan(plan)
    await applyProjectInit({ root: project.root, name: "Demo Paper", domain: "software engineering", now: new Date("2026-05-01T10:00:00.000Z") })

    const result = await buildDashboardResult({ root: project.root, packageVersion: "0.1.0", locale: "zh-CN" })
    const markdown = renderDashboardOutput(result)

    expect(result.ok).toBe(true)
    expect(result.readiness?.status).toBe("ready")
    expect(markdown).toContain("项目已具备核心 VibePaper 文件")
    expect(markdown).toContain("relatedwork/")
    expect(markdown).not.toContain(".agents/skills")
  })

  test("renders workflow section for ready project with dynamic phases", async () => {
    const project = temp()
    const plan = await planInit({ root: project.root })
    if (!plan.ok) throw new Error(plan.error)
    await applyInitPlan(plan)
    await applyProjectInit({ root: project.root, name: "Dynamic Dashboard Paper", domain: "workflow dashboards", now: new Date("2026-05-01T10:00:00.000Z") })
    project.write(".agents/state.json", `${JSON.stringify({
      project: {
        name: "Dynamic Dashboard Paper",
        created_at: "2026-05-01T10:00:00.000Z",
        domain: "workflow dashboards",
      },
      phases: {
        intro: {
          status: "complete",
          completed_at: "2026-05-01T11:00:00.000Z",
        },
        discussion_problem_framing: {
          status: "in_progress",
          completed_at: null,
          dimension: "problem framing",
        },
        discussion_evidence_mapping: {
          status: "not_started",
          completed_at: null,
          dimension: "evidence mapping",
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
    }, null, 2)}\n`)
    project.write(".agents/events.jsonl", `${JSON.stringify({
      timestamp: "2026-05-01T12:00:00.000Z",
      phase: "discussion_problem_framing",
      operator: "user",
      action: "set_phase_status",
      result: "success",
    })}\n`)

    const result = await buildDashboardResult({ root: project.root, packageVersion: "0.1.0", locale: "zh-CN" })
    const markdown = renderDashboardOutput(result)

    expect(result.ok).toBe(true)
    expect(result.workflowStatus?.currentPhase).toBe("discussion_problem_framing")
    expect(markdown).toContain("### 工作流")
    expect(markdown).toContain("intro")
    expect(markdown).toContain("discussion_problem_framing")
    expect(markdown).toContain("discussion_evidence_mapping")
    expect(markdown).toContain("set_phase_status")
    expect(markdown).not.toContain("确认后可将 storyline")
  })
})
