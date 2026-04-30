import { afterEach, describe, expect, test } from "bun:test"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { detectRoot } from "../src/root"
import { commandMarker } from "../src/templates"
import { makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })

function temp() {
  const project = makeTempProject()
  projects.push(project)
  return project
}

describe("detectRoot", () => {
  test("explicit root wins", async () => {
    const project = temp()
    const result = await detectRoot({ cwd: join(project.root, "nested"), explicitRoot: project.root })
    expect(result.root).toBe(project.root)
    expect(result.reason).toBe("explicit --root")
  })

  test("nearest opencode config beats git root", async () => {
    const project = temp()
    mkdirSync(project.path("repo", ".git"), { recursive: true })
    mkdirSync(project.path("repo", "packages", "paper", "src", "nested"), { recursive: true })
    writeFileSync(project.path("repo", "packages", "paper", "opencode.json"), "{}")
    const result = await detectRoot({ cwd: project.path("repo", "packages", "paper", "src", "nested") })
    expect(result.root).toBe(project.path("repo", "packages", "paper"))
    expect(result.reason).toBe("found opencode.json")
  })

  test("detects opencode jsonc root", async () => {
    const project = temp()
    mkdirSync(project.path("repo", "src", "nested"), { recursive: true })
    writeFileSync(project.path("repo", "opencode.jsonc"), "{}")
    const result = await detectRoot({ cwd: project.path("repo", "src", "nested") })
    expect(result.root).toBe(project.path("repo"))
    expect(result.reason).toBe("found opencode.jsonc")
  })

  test("nearer opencode jsonc beats ancestor opencode json", async () => {
    const project = temp()
    mkdirSync(project.path("repo", "sub", "deep"), { recursive: true })
    writeFileSync(project.path("repo", "opencode.json"), "{}")
    writeFileSync(project.path("repo", "sub", "opencode.jsonc"), "{}")
    const result = await detectRoot({ cwd: project.path("repo", "sub", "deep") })
    expect(result.root).toBe(project.path("repo", "sub"))
    expect(result.reason).toBe("found opencode.jsonc")
  })

  test("nearer marker beats ancestor opencode json", async () => {
    const project = temp()
    mkdirSync(project.path("repo", "sub", "deep"), { recursive: true })
    mkdirSync(project.path("repo", "sub", ".opencode", "commands"), { recursive: true })
    writeFileSync(project.path("repo", "opencode.json"), "{}")
    writeFileSync(project.path("repo", "sub", ".opencode", "commands", "vibe.md"), `${commandMarker("vibe")}\n`)
    const result = await detectRoot({ cwd: project.path("repo", "sub", "deep") })
    expect(result.root).toBe(project.path("repo", "sub"))
    expect(result.reason).toBe("found VibePaper command marker")
  })

  test("malformed marker does not block ancestor opencode json", async () => {
    const project = temp()
    mkdirSync(project.path("repo", "sub", "deep"), { recursive: true })
    mkdirSync(project.path("repo", "sub", ".opencode", "commands", "vibe.md"), { recursive: true })
    writeFileSync(project.path("repo", "opencode.json"), "{}")
    const result = await detectRoot({ cwd: project.path("repo", "sub", "deep") })
    expect(result.root).toBe(project.path("repo"))
    expect(result.reason).toBe("found opencode.json")
  })

  test("same-directory opencode json beats opencode jsonc", async () => {
    const project = temp()
    mkdirSync(project.path("repo", "src"), { recursive: true })
    writeFileSync(project.path("repo", "opencode.json"), "{}")
    writeFileSync(project.path("repo", "opencode.jsonc"), "{}")
    const result = await detectRoot({ cwd: project.path("repo", "src") })
    expect(result.root).toBe(project.path("repo"))
    expect(result.reason).toBe("found opencode.json")
  })

  test("managed vibe command marker can identify root", async () => {
    const project = temp()
    mkdirSync(project.path("paper", ".opencode", "commands", "nested"), { recursive: true })
    writeFileSync(project.path("paper", ".opencode", "commands", "vibe.md"), `${commandMarker("vibe")}\n`)
    const result = await detectRoot({ cwd: project.path("paper", ".opencode", "commands", "nested") })
    expect(result.root).toBe(project.path("paper"))
    expect(result.reason).toBe("found VibePaper command marker")
  })

  test("falls back to worktree when no config marker exists", async () => {
    const project = temp()
    mkdirSync(project.path("repo", "src"), { recursive: true })
    const result = await detectRoot({ cwd: project.path("repo", "src"), worktree: project.path("repo") })
    expect(result.root).toBe(project.path("repo"))
    expect(result.reason).toBe("OpenCode worktree fallback")
  })

  test("falls back to nearest .git directory", async () => {
    const project = temp()
    mkdirSync(project.path("repo", ".git"), { recursive: true })
    mkdirSync(project.path("repo", "src"), { recursive: true })
    const result = await detectRoot({ cwd: project.path("repo", "src") })
    expect(result.root).toBe(project.path("repo"))
    expect(result.reason).toBe("git worktree fallback")
  })

  test("falls back to cwd", async () => {
    const project = temp()
    const result = await detectRoot({ cwd: project.root })
    expect(result.root).toBe(project.root)
    expect(result.reason).toBe("directory fallback")
  })
})
