import { describe, expect, test } from "bun:test"
import { INIT_APPLY_PATHS } from "../src/init-preview"
import { buildProjectFiles, buildProjectState } from "../src/project-templates"

describe("project templates", () => {
  test("builds the first-version init file set", () => {
    const files = buildProjectFiles({ name: "Demo Paper", domain: "software engineering", createdAt: "2026-05-01T10:00:00.000Z" })
    expect(files.map((file) => file.path)).toEqual([
      "paper.md",
      "storyline.md",
      "writingrules.md",
      "AGENTS.md",
      ".agents/state.json",
      ".agents/events.jsonl",
    ])
    expect(files.find((file) => file.path === "AGENTS.md")?.content).toContain("VibePaper")
    expect(files.find((file) => file.path === ".agents/events.jsonl")?.content).toBe("")
    expect(files.some((file) => file.path.startsWith(".agents/skills/"))).toBe(false)
    expect(files.some((file) => file.path.startsWith("relatedwork/"))).toBe(false)
  })

  test("matches shared init apply target order", () => {
    const files = buildProjectFiles({ name: "Demo Paper", domain: "software engineering", createdAt: "2026-05-01T10:00:00.000Z" })
    expect(files.map((file) => file.path)).toEqual([...INIT_APPLY_PATHS])
  })

  test("builds Python-compatible initial state", () => {
    const state = buildProjectState({ name: "Demo Paper", domain: "software engineering", createdAt: "2026-05-01T10:00:00.000Z" })
    expect(state.project).toEqual({ name: "Demo Paper", domain: "software engineering", created_at: "2026-05-01T10:00:00.000Z" })
    expect(state.current_phase).toBe("storyline")
    expect(state.event_log_path).toBe(".agents/events.jsonl")
    expect(Object.keys(state.phases)).toEqual(["storyline", "literature", "discussion", "experiments", "writing", "latex_review"])
    expect(state.phases.storyline).toEqual({ status: "not_started", completed_at: null, metadata: {} })
    expect(state.phases.literature.catalog_path).toBe("relatedwork/literature.json")
    expect(state.git.identity.git_email).toBe("bot@vibepaper.dev")
    expect(state.checkers).toEqual({})
  })
})
