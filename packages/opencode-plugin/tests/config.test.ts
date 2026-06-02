import { describe, expect, test } from "bun:test"
import { parse } from "jsonc-parser"
import { mergePluginConfig } from "../src/config"

describe("mergePluginConfig", () => {
  test("creates plugin array when missing", () => {
    const result = mergePluginConfig('{"model":"x"}')
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(true)
    const parsed = parse(result.output!)
    expect(parsed.model).toBe("x")
    expect(parsed.plugin).toEqual(["@copaper/opencode"])
  })

  test("appends plugin and deduplicates existing values", () => {
    const result = mergePluginConfig('{"plugin":["other"]}')
    expect(result.ok).toBe(true)
    expect(parse(result.output!).plugin).toEqual(["other", "@copaper/opencode"])
  })

  test("uses an explicit plugin specifier for local package installs", () => {
    const localSpecifier = "file:///tmp/project/node_modules/@copaper/opencode/dist/index.js"
    const result = mergePluginConfig('{"model":"x"}', localSpecifier)
    expect(result.ok).toBe(true)
    expect(parse(result.output!).plugin).toEqual([localSpecifier])
  })

  test("replaces package specifier with explicit local plugin specifier", () => {
    const localSpecifier = "file:///tmp/project/node_modules/@copaper/opencode/dist/index.js"
    const result = mergePluginConfig('{"plugin":["@copaper/opencode"]}', localSpecifier)
    expect(result.ok).toBe(true)
    expect(parse(result.output!).plugin).toEqual([localSpecifier])
  })

  test("does not rewrite when plugin already exists", () => {
    const input = '{"plugin":["@copaper/opencode"]}'
    const result = mergePluginConfig(input)
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(false)
    expect(result.output).toBe(input)
  })

  test("supports JSONC comments and trailing commas", () => {
    const input = `{
      // user model
      "model": "x",
      "plugin": [
        "other",
      ],
    }`
    const result = mergePluginConfig(input)
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(true)
    expect(parse(result.output!).plugin).toEqual(["other", "@copaper/opencode"])
    expect(result.output!).toContain("// user model")
  })

  test("preserves comments inside plugin array when appending", () => {
    const input = `{
      "plugin": [
        // keep this plugin comment
        "other",
      ],
    }`
    const result = mergePluginConfig(input)
    expect(result.ok).toBe(true)
    expect(result.changed).toBe(true)
    expect(parse(result.output!).plugin).toEqual(["other", "@copaper/opencode"])
    expect(result.output!).toContain("// keep this plugin comment")
  })

  test("fails closed when plugin is not an array", () => {
    const result = mergePluginConfig('{"plugin":"@copaper/opencode"}')
    expect(result.ok).toBe(false)
    expect(result.error).toContain("plugin must be an array")
  })

  test("fails closed on invalid JSONC", () => {
    const result = mergePluginConfig('{"plugin": [}')
    expect(result.ok).toBe(false)
    expect(result.error).toContain("Failed to parse")
  })
})
