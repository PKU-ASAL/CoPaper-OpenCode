import { describe, expect, test } from "bun:test"
import { commandMarker, hasManagedMarker, renderCommandTemplate } from "../src/templates"

describe("command templates", () => {
  test("renders /vibe in Chinese by default", () => {
    const output = renderCommandTemplate("vibe")
    expect(output).toContain("<!-- VibePaper managed: @vibepaper/opencode; command=vibe; schemaVersion=1 -->")
    expect(output).toContain("description: 显示 VibePaper 项目仪表盘")
    expect(output).toContain("vibepaper_dashboard")
    expect(output).toContain("/vibe-doctor")
    expect(output).toContain("bunx -p @vibepaper/opencode vibepaper-opencode doctor")
    expect(output).toContain("确认初始化")
    expect(output).toContain("项目名称")
    expect(output).toContain("研究领域")
    expect(output).toContain("vibepaper_init_apply")
    expect(output).toContain("不要编造 VibePaper 状态")
    expect(output).not.toContain("!`")
  })

  test("renders /vibe in English when requested", () => {
    const output = renderCommandTemplate("vibe", "en-US")
    expect(output).toContain("description: Show VibePaper project dashboard")
    expect(output).toContain("confirm initialization")
    expect(output).toContain("project name")
    expect(output).toContain("research domain")
    expect(output).toContain("vibepaper_init_apply")
    expect(output).toContain("Do not invent VibePaper status")
  })

  test("renders /vibe-doctor in Chinese by default", () => {
    const output = renderCommandTemplate("vibe-doctor")
    expect(output).toContain("<!-- VibePaper managed: @vibepaper/opencode; command=vibe-doctor; schemaVersion=1 -->")
    expect(output).toContain("description: 诊断 VibePaper OpenCode 插件安装")
    expect(output).toContain("bunx -p @vibepaper/opencode vibepaper-opencode doctor --format markdown 2>&1 || true")
    expect(output).toContain("原样显示输出")
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
