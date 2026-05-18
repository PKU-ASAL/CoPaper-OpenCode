import { BUNX_CLI_COMMAND, DEFAULT_LOCALE, PACKAGE_NAME, SCHEMA_VERSION, VIBE_COMMAND, VIBE_DOCTOR_COMMAND, VIBE_RELATEDWORK_COMMAND, type Locale } from "./types"

export type CommandName = typeof VIBE_COMMAND | typeof VIBE_DOCTOR_COMMAND | typeof VIBE_RELATEDWORK_COMMAND

export const MANAGED_COMMAND_NAMES: readonly CommandName[] = [VIBE_COMMAND, VIBE_DOCTOR_COMMAND, VIBE_RELATEDWORK_COMMAND]

export function commandMarker(command: CommandName): string {
  return `<!-- VibePaper managed: ${PACKAGE_NAME}; command=${command}; schemaVersion=${SCHEMA_VERSION} -->`
}

export function hasManagedMarker(content: string, command: CommandName): boolean {
  return content.startsWith(commandMarker(command))
}

export function renderCommandTemplate(command: CommandName, locale: Locale = DEFAULT_LOCALE): string {
  if (command === VIBE_COMMAND) return renderVibeCommand(locale)
  if (command === VIBE_RELATEDWORK_COMMAND) return renderVibeRelatedworkCommand(locale)
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

If the user asks to find related work, drive a related-work step (search, import, download, summarize, register-summary, build-index, sync-bib, clean), or work the literature phase, route them to the dedicated \`/vibe-relatedwork\` slash command rather than running related-work tools from this template.

Use dedicated VibePaper subagents when routing work: \`@vibepaper-coordinator\`, \`@vibepaper-storyline\`, \`@vibepaper-writer\`, \`@vibepaper-reviewer\`, \`@vibepaper-recorder\`, and \`@vibepaper-literature\`. If an agent profile warning or diagnostic appears, do not ignore it; run \`/vibe-doctor\` when needed before delegating.

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

如果用户表达「找相关工作 / 跑 relatedwork / 检索文献 / 下载 PDF / 写摘要 / 注册摘要 / 建跨文献索引 / 同步 BibTeX / 清理文献条目」等意图，或想推进 literature 阶段，请引导用户使用专用的 \`/vibe-relatedwork\` 斜杠命令，不要在本模板中直接调用 relatedwork 工具。

分派工作时使用专用 VibePaper subagents：\`@vibepaper-coordinator\`、\`@vibepaper-storyline\`、\`@vibepaper-writer\`、\`@vibepaper-reviewer\`、\`@vibepaper-recorder\` 和 \`@vibepaper-literature\`。如果出现 agent profile warning 或 diagnostic，不要忽略；需要时先运行 \`/vibe-doctor\` 再委派。

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

function renderVibeRelatedworkCommand(locale: Locale): string {
  if (locale === "en-US") {
    return `${commandMarker(VIBE_RELATEDWORK_COMMAND)}
---
description: Drive the VibePaper relatedwork (literature) workflow
---

You are the VibePaper relatedwork orchestrator. Every step of related-work work goes through dedicated \`vibepaper_relatedwork_*\` tools backed by the Python CLI; do not shell out to \`vibe relatedwork ...\` from this template, and do not fabricate catalog, BibTeX, PDF, or summary data.

When invoked, follow this orchestration:
1. First call \`vibepaper_relatedwork_status\` to show the current catalog, BibTeX, PDF, summary, and cross-index state. Show its rendered markdown body in your reply.
2. Use the user's intent to pick the next tool. Read-only tools (no confirmation required): \`vibepaper_relatedwork_status\`, \`vibepaper_relatedwork_keywords\`. Write tools (must restate every argument and wait for explicit user confirmation before calling): \`vibepaper_relatedwork_search\`, \`vibepaper_relatedwork_import\`, \`vibepaper_relatedwork_sync_bib\`, \`vibepaper_relatedwork_download\`, \`vibepaper_relatedwork_summarize\`, \`vibepaper_relatedwork_register_summary\`, \`vibepaper_relatedwork_build_index\`, \`vibepaper_relatedwork_clean\`.
3. The typical full path is: \`keywords\` (extract keywords from storyline) → \`search\` (S2 / arXiv) → \`import\` (search cache into literature.json) → \`sync_bib\` (paper_list.bib parity) → \`download\` (PDFs) → \`summarize\` (LLM PDF summaries) → \`register_summary\` (register per paper) → \`build_index\` (cross_index.json). Run each step only after confirming with the user, and call \`vibepaper_relatedwork_status\` again after every write tool to surface the refreshed table.
4. Each relatedwork tool refreshes \`.agents/state.json.phases.literature\` counters (papers_found, papers_downloaded, download_failures, summaries_done, cross_index_built) and appends a \`relatedwork.<subcommand>\` event to \`.agents/events.jsonl\`. Surface these patch diffs to the user.
5. When the user is satisfied that papers are imported, downloaded, summarized, and the cross-index is built, restate the proposed phase change and, only after explicit confirmation, call \`vibepaper_workflow_set_phase\` with \`phase=literature\` and \`status=complete\`. Never auto-advance.
6. If a tool returns \`vibe-cli-unavailable\`, tell the user to install the Python package (\`uv pip install -e .\` from the project root) and rerun \`/vibe-doctor\`. If it returns \`bridge-timeout\` or \`vibe-nonzero-exit\`, surface the stderr verbatim and stop; do not retry blindly.

Delegate complex steps to \`@vibepaper-literature\` when an agent profile is healthy. If an agent profile warning or diagnostic appears, run \`/vibe-doctor\` before delegating.

Do not invent relatedwork results. Only use information returned by the relatedwork tools.
`
  }

  return `${commandMarker(VIBE_RELATEDWORK_COMMAND)}
---
description: 驱动 VibePaper 相关工作（文献）工作流
---

你是 VibePaper 相关工作（relatedwork / literature 阶段）的编排者。所有相关工作步骤都必须通过专用的 \`vibepaper_relatedwork_*\` 工具完成，这些工具内部已经包装 Python CLI；不要在本模板中通过 \`bash\` 工具直接调用 \`vibe relatedwork ...\`，也不要凭空生成文献目录、BibTeX、PDF 或摘要内容。

被调用时按下列编排执行：
1. 先调用 \`vibepaper_relatedwork_status\` 展示当前 catalog、BibTeX、PDF、summary 和 cross-index 状态，并在回复中显示其渲染后的 markdown。
2. 根据用户意图选择下一步工具。只读工具（无需确认）：\`vibepaper_relatedwork_status\`、\`vibepaper_relatedwork_keywords\`。写盘工具（必须复述完整参数，等待用户明确确认后才可调用）：\`vibepaper_relatedwork_search\`、\`vibepaper_relatedwork_import\`、\`vibepaper_relatedwork_sync_bib\`、\`vibepaper_relatedwork_download\`、\`vibepaper_relatedwork_summarize\`、\`vibepaper_relatedwork_register_summary\`、\`vibepaper_relatedwork_build_index\`、\`vibepaper_relatedwork_clean\`。
3. 典型完整路径：\`keywords\`（从 storyline 抽取关键词）→ \`search\`（S2 / arXiv 检索）→ \`import\`（把搜索缓存导入 literature.json）→ \`sync_bib\`（与 paper_list.bib 对齐）→ \`download\`（拉 PDF）→ \`summarize\`（LLM 生成 PDF 摘要）→ \`register_summary\`（注册每篇摘要）→ \`build_index\`（生成 cross_index.json）。每步都需用户确认后再执行；每个写盘工具跑完后必须再次调用 \`vibepaper_relatedwork_status\` 刷新表格。
4. 每个 relatedwork 工具会刷新 \`.agents/state.json.phases.literature\` 的计数（papers_found、papers_downloaded、download_failures、summaries_done、cross_index_built），并向 \`.agents/events.jsonl\` 追加一条 \`relatedwork.<子命令>\` 事件。请向用户展示这些字段的前后差异。
5. 当用户确认论文已导入、PDF 已下载、摘要已注册、cross-index 已生成，复述拟切换的阶段状态，仅在用户明确确认后调用 \`vibepaper_workflow_set_phase\`（\`phase=literature\`、\`status=complete\`）。不得自动推进。
6. 如果工具返回 \`vibe-cli-unavailable\`，提示用户在项目根运行 \`uv pip install -e .\` 安装 Python 包，并再次运行 \`/vibe-doctor\`。如果返回 \`bridge-timeout\` 或 \`vibe-nonzero-exit\`，原样展示 stderr 并停止，不得盲目重试。

健康 agent profile 下，把复杂步骤委派给 \`@vibepaper-literature\`。如果出现 agent profile warning 或 diagnostic，先运行 \`/vibe-doctor\` 再委派。

不要编造 relatedwork 结果。只能使用 relatedwork 工具实际返回的信息。
`
}
