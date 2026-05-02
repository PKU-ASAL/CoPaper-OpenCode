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

If the Dashboard says the project needs initialization, show the preview and wait for the user to explicitly say they confirm initialization.

Before applying initialization, collect:
- project name
- research domain

If either value is missing, ask for it first. Once both values are present and the user explicitly confirms, call the \`vibepaper_init_apply\` tool. Do not call the init tool without confirmation.

If the Dashboard says the project is ready, call \`vibepaper_workflow_status\` to show progress, phases, and next steps, then call \`vibepaper_workflow_log\` for recent workflow records.

Before you change a phase status, restate the phase, status, and reason when status is \`skipped\`, then wait for confirmation. Only after explicit confirmation may you call \`vibepaper_workflow_set_phase\`; never make unconfirmed phase status changes.

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

如果 Dashboard 显示项目需要初始化，先展示预览并等待用户明确说“确认初始化”。

确认初始化前必须获得：
- 项目名称
- 研究领域

如果缺少项目名称或研究领域，先用中文追问。参数齐全且用户明确确认后，调用 \`vibepaper_init_apply\` 工具。不要在用户未确认时调用初始化工具。

如果 Dashboard 显示项目已就绪，调用 \`vibepaper_workflow_status\` 展示进度、阶段和下一步，再调用 \`vibepaper_workflow_log\` 查看最近工作流记录。

在修改阶段状态前，必须复述阶段、状态，以及 status 为 \`skipped\` 时的原因，然后等待用户确认。只有用户明确确认后，才可调用 \`vibepaper_workflow_set_phase\`；不得进行未经确认的阶段状态修改。

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
