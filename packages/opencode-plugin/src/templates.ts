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

Call the \`vibepaper_dashboard\` tool. After each VibePaper tool call, show the human-readable markdown body and tables in the final user-facing reply; omit fenced JSON blocks by default; do not summarize tool results instead or replace the markdown with a summary; only show JSON when the user explicitly asks for JSON, debug, raw output, or full tool output.

If the Dashboard says the project needs initialization, use the question tool to ask whether to initialize, collect the project name and research domain, and confirm initialization details. If either project name or research domain is missing, use the question tool to ask for the missing field(s). Only after explicit confirmation and both values are known may you call the \`vibepaper_init_apply\` tool. Do not call the init tool without confirmation.

If the Dashboard says the project is ready, call \`vibepaper_artifact_status\` first to show read-only artifact status, readiness evidence, and recommendations. Then call \`vibepaper_workflow_status\` to show progress, phases, and next steps, and call \`vibepaper_workflow_log\` for recent workflow records.

Use dedicated VibePaper subagents when routing work: \`@vibepaper-coordinator\`, \`@vibepaper-storyline\`, \`@vibepaper-writer\`, \`@vibepaper-reviewer\`, and \`@vibepaper-recorder\`. If an agent profile warning or diagnostic appears, do not ignore it; run \`/vibe-doctor\` when needed before delegating.

\`vibepaper_artifact_status\` is read-only. It must not directly write state, install skills, run relatedwork/checker/report/git commands, or change phases without a separate explicit user request and confirmation.

If the user explicitly asks to record artifact readiness, restate the artifact, status, confidence, and reason, then wait for confirmation. Only after explicit confirmation may you call \`vibepaper_artifact_record\`. This tool writes artifact readiness state and appends an event, but it does not automatically advance phases or run checker/relatedwork/report/git/skills actions.

Before you change a phase status, restate the phase, status, and reason when status is \`skipped\`, then wait for confirmation. Only after explicit confirmation may you call \`vibepaper_workflow_set_phase\`; never make unconfirmed phase status changes.

If the tool is unavailable, tell the user:
- Run \`/vibe-doctor\` to diagnose
- Or run in terminal: \`${BUNX_CLI_COMMAND} doctor\`

Do not invent VibePaper status. Only use information returned by tools, while still omitting fenced JSON blocks by default as instructed above.
`
  }

  return `${commandMarker(VIBE_COMMAND)}
---
description: 显示 VibePaper 项目仪表盘
---

调用 \`vibepaper_dashboard\` 工具。每次调用 VibePaper 工具后，必须在最终给用户的回复中展示工具返回的人类可读 markdown 正文和表格，默认不要展示 fenced JSON block。不要只总结工具结果或用摘要替代工具输出。用户明确要求 JSON、debug 或原始输出时才展示 JSON；用户要求完整工具输出时也可包含 JSON。

如果 Dashboard 显示项目需要初始化，必须使用 question tool 询问是否初始化，并收集项目名称和研究领域、确认初始化细节。如果缺少项目名称或研究领域，继续使用 question tool 询问缺失字段。只有用户明确确认且项目名称和研究领域都已知后，才可调用 \`vibepaper_init_apply\` 工具。不要在用户未确认时调用初始化工具。

如果 Dashboard 显示项目已就绪，先调用 \`vibepaper_artifact_status\` 展示只读工件状态、就绪证据和建议；再调用 \`vibepaper_workflow_status\` 展示进度、阶段和下一步，并调用 \`vibepaper_workflow_log\` 查看最近工作流记录。

分派工作时使用专用 VibePaper subagents：\`@vibepaper-coordinator\`、\`@vibepaper-storyline\`、\`@vibepaper-writer\`、\`@vibepaper-reviewer\` 和 \`@vibepaper-recorder\`。如果出现 agent profile warning 或 diagnostic，不要忽略；需要时先运行 \`/vibe-doctor\` 再委派。

\`vibepaper_artifact_status\` 是只读工具。不得直接写入状态、安装技能、运行 relatedwork/checker/report/git 命令，或在没有单独明确用户请求和确认时改变阶段。

如果用户明确要求记录工件就绪度，必须先复述 artifact、status、confidence 和 reason，然后等待用户确认。只有用户明确确认后，才可调用 \`vibepaper_artifact_record\`。该工具会写入 artifact readiness state 并追加事件，但不会自动推进 phase，也不会运行 checker/relatedwork/report/git/skills 动作。

在修改阶段状态前，必须复述阶段、状态，以及 status 为 \`skipped\` 时的原因，然后等待用户确认。只有用户明确确认后，才可调用 \`vibepaper_workflow_set_phase\`；不得进行未经确认的阶段状态修改。

如果工具不可用，请告诉用户：
- 运行 \`/vibe-doctor\` 进行诊断
- 或在终端运行：\`${BUNX_CLI_COMMAND} doctor\`

不要编造 VibePaper 状态。只能使用工具返回的信息，同时按上文要求默认省略 fenced JSON block。
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

The output includes agent profile diagnostics for VibePaper subagent injection, conflicts, and permission profile warnings.

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

输出包含 agent profile diagnostics，用于检查 VibePaper subagent 注入、同名冲突和 permission profile 警告。

不要解读或修改诊断输出。
`
}
