import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const packageRoot = join(import.meta.dir, "..")
const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"))

describe("package metadata", () => {
  test("uses the expected npm package name and binary", () => {
    expect(pkg.name).toBe("@vibepaper/opencode")
    expect(pkg.bin).toEqual({ "vibepaper-opencode": "./dist/cli.js" })
  })

  test("exports the OpenCode plugin entry separately from the CLI", () => {
    expect(pkg.exports).toEqual({ ".": "./dist/index.js", "./package.json": "./package.json" })
    expect(pkg.type).toBe("module")
  })

  test("does not define postinstall scripts", () => {
    expect(pkg.scripts?.postinstall).toBeUndefined()
  })
})
