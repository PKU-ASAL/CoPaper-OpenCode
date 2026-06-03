import { afterEach, describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { LOCAL_PLUGIN_MARKER, LOCAL_PLUGIN_RELATIVE_PATH } from "../src/installer"
import { makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const p = makeTempProject(); projects.push(p); return p }

const cli = join(import.meta.dir, "..", "src", "cli.ts")
function runCli(args: string[], locale = "") {
  return spawnSync("bun", [cli, ...args], { encoding: "utf8", env: locale ? cleanEnv({ VIBEPAPER_LANG: locale }) : cleanEnv() })
}

function cleanEnv(extra: NodeJS.ProcessEnv = {}) {
  const { VIBEPAPER_LANG: _lang, ...env } = process.env
  return { ...env, ...extra }
}

describe("CLI", () => {
  test("init installs project files", () => {
    const project = temp()
    const result = runCli(["init", "--root", project.root])
    expect(result.status).toBe(0)
    expect(JSON.parse(project.read("opencode.json"))).toEqual({ $schema: "https://opencode.ai/config.json" })
    expect(project.read(LOCAL_PLUGIN_RELATIVE_PATH)).toContain(LOCAL_PLUGIN_MARKER)
    expect(project.read(LOCAL_PLUGIN_RELATIVE_PATH)).not.toContain(project.root)
    expect(result.stdout).toContain("重启 OpenCode")
    expect(result.stdout.match(/重启 OpenCode/g)?.length ?? 0).toBe(1)
    expect(result.stdout).toContain("已安装 VibePaper OpenCode 集成。")
  })

  test("init honors VIBEPAPER_LANG for English output", () => {
    const project = temp()
    const result = runCli(["init", "--root", project.root], "en-US")
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("Restart OpenCode")
    expect(result.stdout).toContain("Installed VibePaper OpenCode integration.")
  })

  test("init --dry-run writes nothing", () => {
    const project = temp()
    const result = runCli(["init", "--root", project.root, "--dry-run"])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("演练模式")
    expect(result.stdout).not.toContain("已安装 VibePaper OpenCode 集成。")
    expect(result.stdout).not.toContain("重启 OpenCode")
    expect(result.stdout).toContain("没有修改任何文件。")
    expect(existsSync(project.path("opencode.json"))).toBe(false)
  })

  test("doctor --format json outputs parseable JSON", () => {
    const project = temp()
    runCli(["init", "--root", project.root])
    const result = runCli(["doctor", "--root", project.root, "--format", "json"])
    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout).ok).toBe(true)
  })

  test("doctor defaults to Chinese text output", () => {
    const project = temp()
    const result = spawnSync("bun", [cli, "doctor", "--root", project.root], { encoding: "utf8", env: cleanEnv() })
    expect(result.status).toBe(1)
    expect(result.stdout).toContain("VibePaper OpenCode 诊断")
    expect(result.stdout).toContain("下一步")
  })

  test("doctor supports English locale via flag", () => {
    const project = temp()
    const result = spawnSync("bun", [cli, "doctor", "--root", project.root, "--locale", "en-US"], { encoding: "utf8", env: cleanEnv() })
    expect(result.status).toBe(1)
    expect(result.stdout).toContain("VibePaper OpenCode Doctor")
    expect(result.stdout).toContain("Next:")
  })

  test("doctor supports English locale via VIBEPAPER_LANG", () => {
    const project = temp()
    const result = spawnSync("bun", [cli, "doctor", "--root", project.root], { encoding: "utf8", env: cleanEnv({ VIBEPAPER_LANG: "en-US" }) })
    expect(result.status).toBe(1)
    expect(result.stdout).toContain("VibePaper OpenCode Doctor")
  })

  test("doctor JSON keeps English field names and enum values with Chinese locale", () => {
    const project = temp()
    spawnSync("bun", [cli, "init", "--root", project.root], { encoding: "utf8", env: cleanEnv() })
    const result = spawnSync("bun", [cli, "doctor", "--root", project.root, "--format", "json", "--locale", "zh-CN"], { encoding: "utf8", env: cleanEnv() })
    const parsed = JSON.parse(result.stdout)
    expect(parsed.ok).toBe(true)
    expect(parsed.checks[0].status).toBe("pass")
    expect(parsed.checks[0]).toHaveProperty("remediation")
  })

  test("doctor falls back to Chinese for unsupported locale without blocking", () => {
    const project = temp()
    const result = spawnSync("bun", [cli, "doctor", "--root", project.root, "--locale", "fr-FR"], { encoding: "utf8", env: cleanEnv() })
    expect(result.status).toBe(1)
    expect(result.stdout).toContain("VibePaper OpenCode 诊断")
  })

  test("init supports English locale via flag", () => {
    const project = temp()
    const result = spawnSync("bun", [cli, "init", "--root", project.root, "--locale", "en-US", "--dry-run"], { encoding: "utf8", env: cleanEnv() })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("DRY RUN")
    expect(result.stdout).toContain("No files were changed.")
  })

  test("doctor rejects unsupported format", () => {
    const project = temp()
    const result = runCli(["doctor", "--root", project.root, "--format", "banana"])
    expect(result.status).toBe(2)
    expect(result.stderr).toContain("Unsupported format")
  })

  test("doctor rejects duplicate format", () => {
    const project = temp()
    const result = runCli(["doctor", "--root", project.root, "--format", "json", "--format", "banana"])
    expect(result.status).toBe(2)
    expect(result.stderr).toContain("Duplicate option: --format")
  })

  test("init rejects unknown flags", () => {
    const project = temp()
    const result = runCli(["init", "--root", project.root, "--banana"])
    expect(result.status).toBe(2)
    expect(result.stderr).toContain("Unknown option: --banana")
  })

  test("init rejects missing --root value", () => {
    const result = runCli(["init", "--root"])
    expect(result.status).toBe(2)
    expect(result.stderr).toContain("Missing value for --root")
  })

  test("init rejects flag-looking --root value", () => {
    const result = runCli(["init", "--root", "--dry-run"])
    expect(result.status).toBe(2)
    expect(result.stderr).toContain("Missing value for --root")
  })

  test("nonexistent root exits with concise error", () => {
    const project = temp()
    const result = runCli(["init", "--root", project.path("missing")])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("ENOENT")
    expect(result.stderr).not.toContain("\n    at ")
  })
})
