# OpenCode Relatedwork Release Fix Design
<!-- description: 最小发布修复，锁定 OpenCode relatedwork 工具与 Python CLI 的参数合同 -->

## Summary
<!-- description: 本次设计目标 -->

###### 修复发布阻塞路径
本阶段只修复 `@vibepaper/opencode` 调用 Python `vibe relatedwork ...` 的最小发布风险。目标是让 OpenCode relatedwork 工具生成的 argv 与 Python Click CLI 接受的参数保持一致，避免用户在插件中触发文献流程时遇到非零退出或交互式阻塞。

###### 锁定跨运行时合同
VibePaper 当前是 Python CLI 与 TypeScript OpenCode 插件的双运行时架构。相关文献能力由 Python 侧实现，插件侧只负责参数构造、bridge 调用、状态刷新和事件补丁。本设计用合同测试防止两侧再次漂移。

## Goals
<!-- description: 必须实现的能力 -->

###### 修正 download 参数
`vibepaper_relatedwork_download` 必须向 CLI 传递 `--paper-id <id>`，而不是 `--id <id>`。没有 `paperId` 时不传额外选择参数，因为 Python CLI 默认处理待下载论文。插件已有的 `all` 选项视为兼容字段，不应生成 Python 不支持的 `--all`。

###### 修正 register 参数
`vibepaper_relatedwork_register_summary` 必须向 CLI 传递 `--summary-path <path>`，而不是 `--path <path>`。`paperId` 和 summary path 仍需在插件侧先做非空校验，缺失时返回 `invalid-args`，不调用 bridge。

###### 避免 clean 阻塞
`vibepaper_relatedwork_clean` 是插件侧确认后的写操作。非 dry-run 调用必须传递 `--yes`，避免 Python CLI 的 `click.confirm("Proceed?")` 在 OpenCode bridge 中等待输入直到超时。dry-run 继续只传 `--dry-run`。

###### 补齐合同测试
`relatedwork-tools.test.ts` 应断言每个 relatedwork 工具最终传给 bridge 的 argv，至少覆盖 `download`、`register-summary`、`clean`、`summarize`、`search`、`keywords`、`import`、`sync-bib` 和 `build-index` 的关键参数。

## Non-Goals
<!-- description: 本阶段明确不做的内容 -->

###### 不新增工作流能力
本阶段不实现 artifact readiness CLI、checker issue lifecycle、cross-index query、Git/report plugin tools、自动 7-checker runner 或 artifact-driven workflow graph。

###### 不重写 relatedwork pipeline
Semantic Scholar 搜索、BibTeX 同步、PDF 下载、LLM 摘要、cross-index 构建仍由 Python CLI 负责。插件侧不复制 Python 逻辑，也不直接写 `relatedwork/literature.json`。

###### 不扩大权限模型
不改变 agent permission profiles，不新增危险工具权限，不引入后台自动执行。所有 relatedwork 写工具仍保持已有 OpenCode 工具确认边界。

###### 不处理发布自动化全套
本阶段不要求增加 dist freshness 检查、版本一致性检查、npm 发布脚本或完整 tarball release pipeline。这些属于后续发布验证包工作。

## Current Drift
<!-- description: 当前已确认的合同漂移 -->

###### Download flag mismatch
插件当前在 `packages/opencode-plugin/src/relatedwork-tools.ts` 使用 `--id` 和 `--all`。Python CLI 在 `vibepaper/cli.py` 的 `relatedwork download` 只接受 `--paper-id` 和 `--retry-failed`，因此 `--id` 或 `--all` 会导致 Click 参数错误。

###### Register flag mismatch
插件当前使用 `--path` 传 summary 文件。Python CLI 的 `relatedwork register-summary` 要求 `--summary-path`，因此插件调用会失败，即使 `paperId` 和路径都有效。

###### Clean confirmation mismatch
Python CLI 的 `relatedwork clean` 在没有 `--yes` 且非 `--dry-run` 时会提示确认。OpenCode bridge 是非交互调用，如果插件不传 `--yes`，实际用户体验会变成等待或超时，而不是一次明确的工具结果。

## Approach
<!-- description: 技术方案 -->

###### 保持 TypeScript 轻改
主要修改 `packages/opencode-plugin/src/relatedwork-tools.ts` 的 argv 构造。每个工具函数继续只负责把 typed options 转成 CLI 参数，然后交给统一 `invoke` 流程处理 bridge、status refresh、phase patch 和渲染。

###### 以 Python CLI 为真源
参数合同以 `vibepaper/cli.py` 的 Click option 为准。若插件 option 与 CLI 不完全一致，优先映射到 CLI 已支持语义；无法映射的字段不生成未知参数，并由测试记录该兼容行为。

###### 合同测试优先
测试不只检查 `result.ok`，还要检查记录到的 `calls[0].command`。这样即使 mock bridge 返回成功，也能发现插件生成了 Python CLI 不支持的参数。

## Data Flow
<!-- description: 调用路径 -->

###### OpenCode 工具入口
OpenCode 调用 `vibepaper_relatedwork_*` 工具，`index.ts` 把参数传给 `relatedwork-tools.ts` 中对应的 `runRelatedwork*` 函数。

###### 参数构造
`runRelatedwork*` 根据 options 构造 `args: ["relatedwork", "<subcommand>", ...flags]`。本阶段只调整 flag 名称和非交互确认参数，不改变 root、locale、timeout 或 env 的处理。

###### Bridge 调用
`invoke` 调用 `python-bridge.ts`，解析 `.venv/bin/vibe` 或 `uv run --project <root> vibe`，再执行 `vibe --root <root> relatedwork ...`。命令结果和 stderr/stdout 仍按现有 `RelatedworkToolResult` 返回。

###### 状态刷新
写工具完成后继续刷新 relatedwork status，并对 literature phase counters 做 idempotent patch。失败时仍尽量返回 bridge 错误、stderr 和 statusAfter，方便用户诊断。

## Error Handling
<!-- description: 错误与兼容策略 -->

###### Unknown option 防回归
合同测试应保证插件不会生成 Python CLI 未声明的 `--id`、`--all` 或 `--path`。如果未来 Python CLI 改名，测试应失败并提示同步插件参数。

###### Clean 非交互
非 dry-run clean 传 `--yes`。如果用户想预览，调用方必须传 `dryRun: true`，插件只传 `--dry-run`，不会删除文件，也不会额外传 `--yes`。

###### 冗余 all 字段
`RelatedworkDownloadOptions.all` 作为旧插件 API 兼容字段保留。因为 Python CLI 默认下载所有 pending papers，`all: true` 不生成任何 flag；`paperId` 优先生成 `--paper-id`。

## Testing
<!-- description: 验证策略 -->

###### Focused Bun tests
更新 `packages/opencode-plugin/tests/relatedwork-tools.test.ts`。新增或强化 argv assertions，确保 download、register-summary 和 clean 的关键参数与 Python CLI 一致。

###### Existing behavior coverage
保留现有 phase patch、event append、read-only no-event、nonzero bridge error、vibe unavailable、render output 等测试。参数修复不得破坏这些行为。

###### Optional Python sanity
如果实现中需要确认 CLI 参数，可运行相关 pytest 或 Click runner 测试。但本阶段主要风险在 TypeScript argv 生成，因此最小验证以 Bun relatedwork tool 测试为主。

## Documentation
<!-- description: 文档更新范围 -->

###### Plugin usage notes
若 README 或中文测试说明列出了 relatedwork 工具行为，应更新为 Python CLI 真实参数语义：download 可按 `paperId` 限定，否则处理待下载论文；register-summary 使用 summary path；clean 的真实删除由确认后的工具调用执行。

###### Manual smoke path
文档应建议最小发布验证：运行 plugin relatedwork tests、typecheck，并在需要时用本地 OpenCode 项目执行 `/vibe-relatedwork` 的 dry-run 或状态检查。不要在本阶段承诺完整 npm 发布流程。

## Acceptance Criteria
<!-- description: 完成判定 -->

###### 参数合同正确
测试证明插件不再生成 `relatedwork download --id`、`relatedwork download --all`、`relatedwork register-summary --path`，并且 clean 非 dry-run 会生成 `--yes`。

###### 现有工具行为不变
relatedwork 写工具仍会在 bridge 后刷新状态、更新 literature phase counters、追加 `.agents/events.jsonl`；read-only keywords 仍不追加事件。

###### 文档没有过度承诺
更新文档只描述最小发布修复和可执行验证命令，不引入未实现的 artifact、checker、Git 或 release automation 能力。

## Risks
<!-- description: 主要风险 -->

###### API 兼容含义不清
`all` 字段不是 Python CLI 参数。保留字段但不生成 flag 是最小破坏方案；后续可在类型层标注 deprecated，但本阶段不做大规模 API 清理。

###### Clean 删除风险
自动传 `--yes` 会跳过 Python CLI 的二次确认，因此必须依赖 OpenCode 工具本身的确认边界。文档和测试需强调 dry-run 用于预览，非 dry-run 是确认后的写操作。

###### 合同仍可能漂移
如果 Python CLI 新增或重命名 options，插件仍可能落后。合同测试能覆盖当前关键路径，但长期可考虑从 CLI help 或共享 schema 生成参数合同。
