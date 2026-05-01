import { BUNX_CLI_COMMAND, DEFAULT_LOCALE, PACKAGE_NAME, SCHEMA_VERSION, VIBE_COMMAND, VIBE_DOCTOR_COMMAND, type Locale } from "./types"

export type CommandName = typeof VIBE_COMMAND | typeof VIBE_DOCTOR_COMMAND

export function commandMarker(command: CommandName): string {
  return `<!-- VibePaper managed: ${PACKAGE_NAME}; command=${command}; schemaVersion=${SCHEMA_VERSION} -->`
}

export function hasManagedMarker(content: string, command: CommandName): boolean {
  return content.startsWith(commandMarker(command))
}

export function renderCommandTemplate(command: CommandName, locale: Locale = DEFAULT_LOCALE): string {
  if (command === VIBE_COMMAND) return renderVibeCommand(locale)
  return renderVibeDoctorCommand(locale)
}

function renderVibeCommand(locale: Locale): string {
  if (locale === "en-US") {
    return `${commandMarker(VIBE_COMMAND)}
---
description: Show VibePaper project dashboard
---

Call the \`vibepaper_dashboard\` tool and display the returned content to the user.

If the tool is unavailable, tell the user:
- Run \`/vibe-doctor\` to diagnose
- Or run in terminal: \`${BUNX_CLI_COMMAND} doctor\`

Do not invent VibePaper status. Only display what the tool returns.
`
  }

  return `${commandMarker(VIBE_COMMAND)}
---
description: 显示 VibePaper 项目仪表盘
---

调用 \`vibepaper_dashboard\` 工具，并将返回内容展示给用户。

如果工具不可用，请告诉用户：
- 运行 \`/vibe-doctor\` 进行诊断
- 或在终端运行：\`${BUNX_CLI_COMMAND} doctor\`

不要编造 VibePaper 状态。只展示工具返回的内容。
`
}

function renderVibeDoctorCommand(locale: Locale): string {
  if (locale === "en-US") {
    return `${commandMarker(VIBE_DOCTOR_COMMAND)}
---
description: Diagnose VibePaper OpenCode plugin installation
---

Run this diagnostic and display the output verbatim:

!\`${BUNX_CLI_COMMAND} doctor --format markdown 2>&1 || true\`

This is a convenience wrapper. For authoritative diagnostics, run in terminal:
\`${BUNX_CLI_COMMAND} doctor\`

Do not interpret or modify the diagnostic output.
`
  }

  return `${commandMarker(VIBE_DOCTOR_COMMAND)}
---
description: 诊断 VibePaper OpenCode 插件安装
---

运行此诊断，并原样显示输出：

!\`${BUNX_CLI_COMMAND} doctor --format markdown 2>&1 || true\`

这是一个便捷包装命令。权威诊断请在终端运行：
\`${BUNX_CLI_COMMAND} doctor\`

不要解读或修改诊断输出。
`
}
