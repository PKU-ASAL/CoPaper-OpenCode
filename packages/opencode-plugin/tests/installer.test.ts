import { afterEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs"
import { join, sep } from "node:path"
import { assertInsideRoot, backupPathFor, writeFileAtomic } from "../src/fs-utils"
import { applyInitPlan, planInit, type InitPlan } from "../src/installer"
import { renderCommandTemplate } from "../src/templates"
import { hashTree, makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const p = makeTempProject(); projects.push(p); return p }

describe("filesystem safety helpers", () => {
  test("generates deterministic backup paths inside root", () => {
    const project = temp()
    const path = backupPathFor(project.root, "opencode.json", new Date("2026-04-29T12:00:00Z"))
    expect(path).toBe(join(project.root, ".opencode", "vibepaper", "backups", "2026-04-29T12-00-00-000Z", "opencode.json"))
  })

  test("allows in-root names that start with dot dot text", () => {
    const project = temp()
    expect(() => assertInsideRoot(project.root, project.path("..data", "file.txt"))).not.toThrow()
  })

  test("rejects backup relative paths that escape the backup directory", () => {
    const project = temp()
    expect(() => backupPathFor(project.root, "../../escape.txt", new Date("2026-04-29T12:00:00Z"))).toThrow()
  })

  test("rejects absolute backup relative paths", () => {
    const project = temp()
    expect(() => backupPathFor(project.root, join(project.root, "escape.txt"), new Date("2026-04-29T12:00:00Z"))).toThrow()
  })

  test("rejects paths outside root", () => {
    const project = temp()
    expect(() => assertInsideRoot(project.root, join(project.root, "ok.txt"))).not.toThrow()
    expect(() => assertInsideRoot(project.root, join(project.root, "..", "escape.txt"))).toThrow("outside root")
  })

  test("writes files atomically", () => {
    const project = temp()
    writeFileAtomic(project.path("nested", "file.txt"), "hello")
    expect(readFileSync(project.path("nested", "file.txt"), "utf8")).toBe("hello")
  })

  test("rejects symlink escapes", () => {
    const project = temp()
    const outside = makeTempProject("outside-")
    projects.push(outside)
    mkdirSync(project.path(".opencode"), { recursive: true })
    symlinkSync(outside.root, project.path(".opencode", "commands"), "dir")
    expect(() => assertInsideRoot(project.root, project.path(".opencode", "commands", "vibe.md"))).toThrow("outside root")
    expect(existsSync(project.path(".opencode", "commands"))).toBe(true)
  })

  test("rejects parent segments before symlink resolution", () => {
    const project = temp()
    const outside = makeTempProject("outside-")
    projects.push(outside)
    symlinkSync(outside.root, project.path("link"), "dir")
    expect(() => assertInsideRoot(project.root, `${project.path("link")}${sep}..${sep}escape.txt`)).toThrow("outside root")
  })
})

describe("installer", () => {
  test("installs into an empty project", async () => {
    const project = temp()
    const plan = await planInit({ root: project.root })
    expect(plan.ok).toBe(true)
    const result = await applyInitPlan(plan)
    expect(result.ok).toBe(true)
    expect(JSON.parse(project.read("opencode.json")).plugin).toEqual(["@vibepaper/opencode"])
    expect(project.read(".opencode/commands/vibe.md")).toContain("command=vibe")
    expect(project.read(".opencode/commands/vibe-doctor.md")).toContain("command=vibe-doctor")
  })

  test("merges existing JSON config and backs it up", async () => {
    const project = temp()
    project.write("opencode.json", JSON.stringify({ model: "x", plugin: ["other"] }, null, 2))
    const original = project.read("opencode.json")
    const plan = await planInit({ root: project.root, now: new Date("2026-04-29T12:00:00Z") })
    expect(plan.ok).toBe(true)
    await applyInitPlan(plan)
    const parsed = JSON.parse(project.read("opencode.json"))
    expect(parsed.model).toBe("x")
    expect(parsed.plugin).toEqual(["other", "@vibepaper/opencode"])
    expect(project.read(".opencode/vibepaper/backups/2026-04-29T12-00-00-000Z/opencode.json")).toBe(original)
  })

  test("dry-run is read-only", async () => {
    const project = temp()
    const before = hashTree(project.root)
    const plan = await planInit({ root: project.root, dryRun: true })
    expect(plan.ok).toBe(true)
    const result = await applyInitPlan(plan)
    expect(result.ok).toBe(true)
    expect(hashTree(project.root)).toBe(before)
  })

  test("fails closed when both config files exist", async () => {
    const project = temp()
    project.write("opencode.json", "{}")
    project.write("opencode.jsonc", "{}")
    const plan = await planInit({ root: project.root })
    expect(plan.ok).toBe(false)
    expect(plan.error).toContain("Both opencode.json and opencode.jsonc exist")
  })

  test("fails on unmanaged command unless force is used", async () => {
    const project = temp()
    project.write(".opencode/commands/vibe.md", "# user command")
    const plan = await planInit({ root: project.root })
    expect(plan.ok).toBe(false)
    expect(plan.error).toContain("unmanaged command")

    const forced = await planInit({ root: project.root, force: true, now: new Date("2026-04-29T12:00:00Z") })
    expect(forced.ok).toBe(true)
    await applyInitPlan(forced)
    expect(project.read(".opencode/commands/vibe.md")).toContain("command=vibe")
    expect(project.read(".opencode/vibepaper/backups/2026-04-29T12-00-00-000Z/.opencode/commands/vibe.md")).toBe("# user command")
  })

  test("rejects explicit config paths outside root during planning", async () => {
    const project = temp()
    const plan = await planInit({ root: project.root, config: "../outside.json" })

    expect(plan.ok).toBe(false)
    expect(plan.error).toMatch(/outside root|refusing/i)
  })

  test("rejects explicit config paths outside root during dry-run planning", async () => {
    const project = temp()
    const outside = temp()
    outside.write("opencode.json", "{}")
    const plan = await planInit({ root: project.root, config: outside.path("opencode.json"), dryRun: true })

    expect(plan.ok).toBe(false)
    expect(plan.error).toMatch(/outside root|refusing/i)
  })

  test("rejects symlinked command paths outside root during dry-run planning", async () => {
    const project = temp()
    const outside = temp()
    outside.write("vibe.md", renderCommandTemplate("vibe"))
    mkdirSync(project.path(".opencode"), { recursive: true })
    symlinkSync(outside.root, project.path(".opencode", "commands"), "dir")

    const plan = await planInit({ root: project.root, dryRun: true })

    expect(plan.ok).toBe(false)
    expect(plan.error).toMatch(/outside root|refusing/i)
  })

  test("rejects backup sources outside root during apply", async () => {
    const project = temp()
    const outside = temp()
    outside.write("secret.txt", "secret")
    const backupTo = project.path(".opencode", "vibepaper", "backups", "manual", "secret.txt")
    const plan: InitPlan = {
      ok: true,
      root: project.root,
      dryRun: false,
      actions: [{ kind: "write", path: project.path("opencode.json"), content: "{}\n", backupFrom: outside.path("secret.txt"), backupTo }],
      messages: [],
    }

    const result = await applyInitPlan(plan)

    expect(result.ok).toBe(false)
    expect(existsSync(backupTo)).toBe(false)
  })
})
