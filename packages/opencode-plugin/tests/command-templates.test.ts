import { describe, expect, test } from "bun:test"
import { commandMarker, hasManagedMarker, renderCommandTemplate } from "../src/templates"

describe("command templates", () => {
  test("renders /vibe with marker and dashboard tool instruction", () => {
    const output = renderCommandTemplate("vibe")
    expect(output).toContain("<!-- VibePaper managed: @vibepaper/opencode; command=vibe; schemaVersion=1 -->")
    expect(output).toContain("description: Show VibePaper project dashboard")
    expect(output).toContain("vibepaper_dashboard")
    expect(output).toContain("/vibe-doctor")
    expect(output).toContain("bunx -p @vibepaper/opencode vibepaper-opencode doctor")
    expect(output).toContain("Do not invent VibePaper status")
    expect(output).not.toContain("!`")
    expect(output).not.toContain("paper.md")
    expect(output).not.toContain("storyline.md")
    expect(output).not.toContain("relatedwork")
  })

  test("renders /vibe-doctor with safe shell diagnostic", () => {
    const output = renderCommandTemplate("vibe-doctor")
    expect(output).toContain("<!-- VibePaper managed: @vibepaper/opencode; command=vibe-doctor; schemaVersion=1 -->")
    expect(output).toContain("description: Diagnose VibePaper OpenCode plugin installation")
    expect(output).toContain("bunx -p @vibepaper/opencode vibepaper-opencode doctor --format markdown 2>&1 || true")
    expect(output).toContain("display the output verbatim")
    expect(output).toContain("authoritative diagnostics")
    expect(output).not.toContain("bunx @vibepaper/opencode doctor")
    expect(output).not.toContain("$ARGUMENTS")
  })

  test("detects VibePaper-managed command markers", () => {
    const marker = commandMarker("vibe")
    expect(marker).toBe("<!-- VibePaper managed: @vibepaper/opencode; command=vibe; schemaVersion=1 -->")
    expect(hasManagedMarker(`${marker}\nbody`, "vibe")).toBe(true)
    expect(hasManagedMarker("# custom command", "vibe")).toBe(false)
    expect(hasManagedMarker(commandMarker("vibe-doctor"), "vibe")).toBe(false)
  })
})
