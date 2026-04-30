import { afterEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync } from "node:fs"
import { basename } from "node:path"
import { applyInitPlan, planInit } from "../src/installer"
import { renderDoctorJson, renderDoctorMarkdown, renderDoctorText, runDoctor } from "../src/doctor"
import { hashTree, makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const p = makeTempProject(); projects.push(p); return p }

describe("doctor", () => {
  test("reports healthy installation", async () => {
    const project = temp()
    const plan = await planInit({ root: project.root })
    if (!plan.ok) throw new Error(plan.error)
    await applyInitPlan(plan)

    const result = await runDoctor({ root: project.root, packageVersion: "0.1.0" })
    expect(result.ok).toBe(true)
    expect(result.checks.map((check) => check.id)).toContain("plugin.configured")
    expect(result.checks.find((check) => check.id === "plugin.configured")?.status).toBe("pass")
    expect(renderDoctorMarkdown(result)).toContain("| Check | Status | Message |")
    expect(JSON.parse(renderDoctorJson(result)).ok).toBe(true)
  })

  test("reports missing config without mutating files", async () => {
    const project = temp()
    const before = hashTree(project.root)
    const result = await runDoctor({ root: project.root, packageVersion: "0.1.0" })
    expect(result.ok).toBe(false)
    expect(result.checks.find((check) => check.id === "config.present")?.status).toBe("fail")
    expect(hashTree(project.root)).toBe(before)
  })

  test("reports explicit missing config without throwing", async () => {
    const project = temp()
    const result = await runDoctor({ root: project.root, config: "missing-opencode.json", packageVersion: "0.1.0" })
    expect(result.ok).toBe(false)
    expect(result.checks.find((check) => check.id === "config.present")?.status).toBe("fail")
    expect(result.checks.find((check) => check.id === "config.parse")?.status).toBe("fail")
    expect(result.checks.find((check) => check.id === "plugin.configured")?.status).toBe("fail")
  })

  test("reports ambiguous config files without throwing", async () => {
    const project = temp()
    mkdirSync(project.path("opencode.json"))
    project.write("opencode.jsonc", `{"plugin":["@vibepaper/opencode"]}\n`)

    const result = await runDoctor({ root: project.root, packageVersion: "0.1.0" })
    expect(result.ok).toBe(false)
    const configChecks = result.checks.filter((check) => check.id === "config.present" || check.id === "config.parse")
    expect(configChecks.some((check) => check.status === "fail" && check.message.includes("ambiguous"))).toBe(true)
    expect(configChecks.some((check) => check.remediation?.includes("--config") || check.remediation?.includes("remove one"))).toBe(true)
    expect(result.checks.find((check) => check.id === "plugin.configured")?.status).toBe("fail")
  })

  test("explicit config resolves ambiguous config files", async () => {
    const project = temp()
    const plan = await planInit({ root: project.root })
    if (!plan.ok) throw new Error(plan.error)
    await applyInitPlan(plan)
    project.write("opencode.jsonc", `{"plugin":["@vibepaper/opencode"]}\n`)

    const result = await runDoctor({ root: project.root, config: "opencode.jsonc", packageVersion: "0.1.0" })
    expect(result.ok).toBe(true)
    expect(result.checks.find((check) => check.id === "config.present")?.message).toContain("opencode.jsonc")
    expect(result.checks.find((check) => check.id === "config.parse")?.status).toBe("pass")
    expect(result.checks.find((check) => check.id === "plugin.configured")?.status).toBe("pass")
  })

  test("accepts a local file URL plugin specifier", async () => {
    const project = temp()
    project.write("opencode.json", JSON.stringify({ plugin: [`file://${project.path("node_modules", "@vibepaper", "opencode", "dist", "index.js")}`] }))
    project.write(".opencode/commands/vibe.md", "<!-- VibePaper managed: @vibepaper/opencode; command=vibe; schemaVersion=1 -->\n")
    project.write(".opencode/commands/vibe-doctor.md", "<!-- VibePaper managed: @vibepaper/opencode; command=vibe-doctor; schemaVersion=1 -->\n")

    const result = await runDoctor({ root: project.root, packageVersion: "0.1.0" })
    expect(result.checks.find((check) => check.id === "plugin.configured")?.status).toBe("pass")
  })

  test("rejects explicit config paths outside root without throwing", async () => {
    const project = temp()
    const outside = temp()
    outside.write("opencode.json", `{"plugin":["@vibepaper/opencode"]}\n`)

    const result = await runDoctor({ root: project.root, config: `../${basename(outside.root)}/opencode.json`, packageVersion: "0.1.0" })
    expect(result.ok).toBe(false)
    const present = result.checks.find((check) => check.id === "config.present")
    const parse = result.checks.find((check) => check.id === "config.parse")
    expect(present?.status).toBe("fail")
    expect(parse?.status).toBe("fail")
    expect(present?.remediation ?? parse?.remediation).toBe("Run: bunx -p @vibepaper/opencode vibepaper-opencode init")
  })

  test("reports directory config as parse failure without throwing", async () => {
    const project = temp()
    mkdirSync(project.path("opencode.json"))

    const result = await runDoctor({ root: project.root, packageVersion: "0.1.0" })
    expect(result.ok).toBe(false)
    expect(result.checks.find((check) => check.id === "config.parse")?.status).toBe("fail")
  })

  test("reports directory command as diagnostic failure without throwing", async () => {
    const project = temp()
    const plan = await planInit({ root: project.root })
    if (!plan.ok) throw new Error(plan.error)
    await applyInitPlan(plan)
    rmSync(project.path(".opencode", "commands", "vibe.md"))
    mkdirSync(project.path(".opencode", "commands", "vibe.md"))

    const result = await runDoctor({ root: project.root, packageVersion: "0.1.0" })
    expect(result.ok).toBe(false)
    expect(result.checks.find((check) => check.id === "commands.vibe.present")?.status).toBe("fail")
    expect(result.checks.find((check) => check.id === "commands.vibe.managed")?.status).toBe("warn")
  })

  test("reports top-level array config as parse failure", async () => {
    const project = temp()
    project.write("opencode.json", `[]\n`)

    const result = await runDoctor({ root: project.root, packageVersion: "0.1.0" })
    expect(result.ok).toBe(false)
    expect(result.checks.find((check) => check.id === "config.parse")?.status).toBe("fail")
  })

  test("does not include paper artifact checks", async () => {
    const project = temp()
    const result = await runDoctor({ root: project.root, packageVersion: "0.1.0" })
    const ids = result.checks.map((check) => check.id).join("\n")
    expect(ids).not.toContain("paper")
    expect(ids).not.toContain("storyline")
    expect(ids).not.toContain("relatedwork")
  })

  test("renders text with check ids and remediation", async () => {
    const project = temp()
    const result = await runDoctor({ root: project.root, packageVersion: "0.1.0" })
    const text = renderDoctorText(result)
    expect(text).toContain("VibePaper OpenCode Doctor v0.1.0")
    expect(text).toContain("config.present")
    expect(text).toContain("bunx -p @vibepaper/opencode vibepaper-opencode init")
  })
})
