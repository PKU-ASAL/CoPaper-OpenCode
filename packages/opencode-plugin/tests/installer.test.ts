import { afterEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs"
import { join, sep } from "node:path"
import { assertInsideRoot, backupPathFor, writeFileAtomic } from "../src/fs-utils"
import { makeTempProject } from "./fixtures"

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
