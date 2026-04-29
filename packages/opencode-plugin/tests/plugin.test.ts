import { describe, expect, test } from "bun:test"
import { VibePaperPlugin } from "../src/index"

describe("OpenCode plugin", () => {
  test("registers vibepaper_dashboard tool", async () => {
    const hooks = await VibePaperPlugin({
      project: {},
      directory: process.cwd(),
      worktree: process.cwd(),
      client: { app: { log: async () => undefined } },
      $: async () => undefined,
    } as never)
    expect(hooks.tool.vibepaper_dashboard).toBeDefined()
  })
})
