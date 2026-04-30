import { afterEach, describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const p = makeTempProject(); projects.push(p); return p }

const cli = join(import.meta.dir, "..", "src", "cli.ts")

describe("CLI", () => {
  test("init installs project files", () => {
    const project = temp()
    const result = spawnSync("bun", [cli, "init", "--root", project.root], { encoding: "utf8" })
    expect(result.status).toBe(0)
    expect(project.read("opencode.json")).toContain("@vibepaper/opencode")
    expect(result.stdout).toContain("Restart OpenCode")
    expect(result.stdout.match(/Restart OpenCode/g)?.length ?? 0).toBe(1)
  })

  test("init --dry-run writes nothing", () => {
    const project = temp()
    const result = spawnSync("bun", [cli, "init", "--root", project.root, "--dry-run"], { encoding: "utf8" })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("DRY RUN")
    expect(result.stdout).not.toContain("Installed VibePaper OpenCode integration")
    expect(result.stdout).not.toContain("Restart OpenCode")
    expect(result.stdout).toContain("No files were changed.")
    expect(existsSync(project.path("opencode.json"))).toBe(false)
  })

  test("doctor --format json outputs parseable JSON", () => {
    const project = temp()
    spawnSync("bun", [cli, "init", "--root", project.root], { encoding: "utf8" })
    const result = spawnSync("bun", [cli, "doctor", "--root", project.root, "--format", "json"], { encoding: "utf8" })
    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout).ok).toBe(true)
  })

  test("doctor rejects unsupported format", () => {
    const project = temp()
    const result = spawnSync("bun", [cli, "doctor", "--root", project.root, "--format", "banana"], { encoding: "utf8" })
    expect(result.status).toBe(2)
    expect(result.stderr).toContain("Unsupported format")
  })

  test("doctor rejects duplicate format", () => {
    const project = temp()
    const result = spawnSync("bun", [cli, "doctor", "--root", project.root, "--format", "json", "--format", "banana"], { encoding: "utf8" })
    expect(result.status).toBe(2)
    expect(result.stderr).toContain("Duplicate option: --format")
  })

  test("init rejects unknown flags", () => {
    const project = temp()
    const result = spawnSync("bun", [cli, "init", "--root", project.root, "--banana"], { encoding: "utf8" })
    expect(result.status).toBe(2)
    expect(result.stderr).toContain("Unknown option: --banana")
  })

  test("init rejects missing --root value", () => {
    const result = spawnSync("bun", [cli, "init", "--root"], { encoding: "utf8" })
    expect(result.status).toBe(2)
    expect(result.stderr).toContain("Missing value for --root")
  })

  test("init rejects flag-looking --root value", () => {
    const result = spawnSync("bun", [cli, "init", "--root", "--dry-run"], { encoding: "utf8" })
    expect(result.status).toBe(2)
    expect(result.stderr).toContain("Missing value for --root")
  })

  test("nonexistent root exits with concise error", () => {
    const project = temp()
    const result = spawnSync("bun", [cli, "init", "--root", project.path("missing")], { encoding: "utf8" })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("ENOENT")
    expect(result.stderr).not.toContain("\n    at ")
  })
})
