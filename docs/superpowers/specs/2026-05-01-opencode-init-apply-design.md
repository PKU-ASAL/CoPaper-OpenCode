# OpenCode Init Apply Design
<!-- description: OpenCode 内显式确认初始化写入设计 -->

## Summary
<!-- description: 本阶段目标 -->

###### 从预览到显式写入
本阶段将 `/copaper` 的初始化预览扩展为显式确认后的项目初始化写入。用户先看到 readiness 和 init preview，再通过对话确认并提供 `name`、`domain`，最后由 OpenCode 插件内置 apply 工具创建核心 CoPaper 文件。

###### 保持安全闭环
第一版只写 Dashboard preview 已列出的核心文件，不创建 `.agents/skills/` 或 `relatedwork/`。遇到任何用户文件冲突时整体中止，避免半初始化和误覆盖。

## Goals
<!-- description: 必须实现的能力 -->

###### 对话式确认初始化
用户在 `/copaper` 后说“确认初始化”才进入写入流程。若缺少项目 `name` 或 `domain`，OpenCode 先用中文追问，参数齐全后才调用 apply 工具。

###### 插件内置写入
`@copaper/opencode` 内置精简初始化模板和完整 `DEFAULT_STATE` 等价结构。第一版不依赖 Python CLI，也不要求目标机器已安装 Python 版 `copaper` 命令。

###### 非破坏性文件创建
apply 只创建缺失的核心文件。任何目标路径存在且不是安全缺失状态时，apply 整体中止，不覆盖、不备份、不部分继续。

###### 成功后 ready
初始化成功后，重新运行 `/copaper` 应显示项目 ready。Dashboard 后续只提示 workflow 入口，不在本阶段推进 phase 或调用子代理。

## Non-Goals
<!-- description: 本阶段明确不做的内容 -->

###### 不创建 skills
第一版不创建 `.agents/skills/`，也不复制 Python scaffold 中的完整 skill bundle。skills 同步留给后续独立阶段。

###### 不创建 relatedwork
第一版不创建 `relatedwork/`、`relatedwork/literature.json`、bib、PDF 或索引文件。`relatedwork/` 仍作为 optional readiness 和后续 workflow 提示。

###### 不推进工作流
本阶段只初始化项目骨架，不设置 phase 为 in-progress，不写 event log 事件，不触发 literature、discussion、experiments、writing 或 latex review 流程。

###### 不覆盖用户文件
本阶段不提供 `--force`、自动备份覆盖或跳过冲突继续的写入模式。用户文件冲突必须显式解决后重新 apply。

## Product Behavior
<!-- description: 用户可见行为 -->

###### `/copaper` 主入口延续
`/copaper` 继续先显示中文 Dashboard。若状态为 `needs-init`，模板提示用户可以说“确认初始化”，并说明需要项目名称和研究领域。

###### 参数收集
用户确认初始化但未提供 `name` 或 `domain` 时，agent 先追问缺失参数。工具参数齐全前不得调用 `copaper_init_apply`。

###### Apply 成功输出
apply 成功后返回中文摘要、写入文件列表、跳过文件列表、稳定 JSON block 和下一步建议。下一步建议为重新运行 `/copaper` 查看 ready 状态。

###### Apply 失败输出
apply 失败时返回中文错误摘要、冲突路径或文件系统错误、稳定 JSON block 和恢复建议。冲突失败不得写入任何目标文件。

## Architecture
<!-- description: 模块拆分 -->

###### `project-templates.ts`
新增模板模块，负责生成核心 Markdown 文件、`AGENTS.md`、空 `.agents/events.jsonl` 和完整 `.agents/state.json` 内容。模板函数接收 `name`、`domain`、`createdAt`。

###### `project-init.ts`
新增初始化模块，负责 apply 前 readiness 检查、冲突检测、目标文件计划、原子写入和 apply 结果模型。它不处理 OpenCode config 安装。

###### `init-preview.ts`
扩展为 preview 与 apply 共享的目标集合来源。preview 继续只读；apply 使用同一文件集合决定可创建目标，避免预览和实际写入不一致。

###### `index.ts`
新增 OpenCode 工具 `copaper_init_apply`。工具参数为 `name` 和 `domain`，使用 OpenCode 提供的 `directory`、`worktree` 做 root detection 后执行 apply。

###### `templates.ts`
更新 `/copaper` slash command 模板。模板必须说明确认门槛、参数追问、只在明确确认后调用 apply 工具，以及不要编造初始化结果。

## Data Model
<!-- description: 结构化返回模型 -->

###### Apply options
`ProjectInitApplyOptions` 包含 `root`、`cwd`、`worktree`、`name`、`domain`、`locale` 和 `now`。`name` 与 `domain` 是必需业务参数。

###### Apply result
`ProjectInitApplyResult` 包含 `schemaVersion`、`ok`、`root`、`mode: "apply"`、`changedFiles`、`skippedFiles`、`conflicts`、`errors`、`readinessBefore`、`readinessAfter` 和 `locale`。

###### Conflict model
`ProjectInitConflict` 包含 `path`、`status` 和 `reason`。`status` 使用 readiness 的稳定英文枚举，`reason` 使用稳定英文短语，中文只在渲染层生成。

###### JSON 稳定性
apply 工具的 JSON 字段名和枚举值保持英文。中文摘要只出现在 Markdown 渲染层，不进入机器解析用的状态枚举。

## Files Written
<!-- description: 第一版写入文件集合 -->

###### 核心文档
第一版创建 `paper.md`、`storyline.md` 和 `writingrules.md`。内容为插件内置精简模板，满足后续 CoPaper workflow 识别和人工继续编辑。

###### 指导文件
第一版创建 `AGENTS.md`，内容说明当前项目是 CoPaper 项目、建议使用 `/copaper` 查看状态、使用 CoPaper CLI 或后续 OpenCode 入口推进流程。

###### 状态文件
第一版创建 `.agents/state.json`，结构与 Python `DEFAULT_STATE` 等价。它填入 `project.name`、`project.domain`、`project.created_at`，并保留 `current_phase: "storyline"`。

###### 事件日志
第一版创建空 `.agents/events.jsonl`。本阶段不写初始化事件，避免与 Python event log 行格式产生不一致。

## Safety Rules
<!-- description: 写入安全约束 -->

###### 重新检查磁盘
apply 前必须重新运行 readiness，不信任旧 Dashboard preview。用户可能在预览后手动创建或修改文件。

###### 整体中止
如果任一写入目标存在、不可读、是目录、是用户文件或状态无效，apply 返回 `ok: false`，列出冲突，并且不写任何目标文件。

###### 原子写入
所有文件写入使用现有安全文件工具或同等原子写入逻辑。写入前先创建父目录，路径必须限制在项目 root 内。

###### 中途错误报告
若文件系统错误发生在写入过程中，结果必须报告已写入的 `changedFiles` 和错误信息。第一版不自动回滚已成功写入的文件。

## Error Handling
<!-- description: 失败和异常规则 -->

###### 参数缺失
工具收到缺失或空白 `name`、`domain` 时返回结构化错误，不写文件。slash command 模板要求 agent 在调用工具前追问缺失参数。

###### 集成损坏
OpenCode 集成损坏不阻止项目初始化写入。apply 结果可以提示用户运行 `/copaper-doctor` 修复插件安装，但项目文件写入只依赖 root 和磁盘安全检查。

###### 模板错误
模板生成失败应作为内部错误返回。错误摘要不得建议用户手动编辑 `.agents/state.json`，只建议重新运行或提交 issue。

###### Locale 回退
未知 locale 继续回退到 `zh-CN`。语言配置错误不得阻断初始化 apply。

## Testing
<!-- description: 验证策略 -->

###### 单元测试
为 `project-templates.ts` 和 `project-init.ts` 添加 Bun 单元测试。测试缺参数、成功写入、冲突整体中止、路径安全、locale fallback 和 apply JSON 稳定性。

###### 兼容测试
测试 `.agents/state.json` 关键字段与 Python `DEFAULT_STATE` 对齐，包括 `phases`、`current_phase`、`event_log_path`、`git.identity` 和 `checkers`。

###### Dashboard 回归
测试 apply 成功后 readiness 从 `needs-init` 变为 `ready`。测试 `relatedwork/` 仍为 optional，`.agents/skills/` 不参与 ready 判定。

###### 工具测试
测试 `copaper_init_apply` 的参数 schema、成功 Markdown、冲突 Markdown、稳定 JSON block 和不会在未确认路径中被 `/copaper` 自动调用。

###### 文档测试
更新中文使用测试文档，新增确认初始化、参数追问、冲突中止和成功后 `/copaper` ready 的手动 smoke 步骤。

## Acceptance Criteria
<!-- description: 完成判定 -->

###### OpenCode 内闭环
用户能从 `/copaper` 看到初始化预览，通过对话确认并提供 `name`、`domain`，再由插件内 apply 创建核心 CoPaper 项目文件。

###### 非破坏性保证
已有用户文件冲突时 apply 整体中止，并且目录 hash 或文件快照证明没有写入任何目标文件。

###### Ready 状态达成
成功 apply 后，重新运行 `/copaper` 显示 `ready` 语义，核心文件和状态文件检查通过，JSON block 保持英文稳定字段。

###### 范围保持克制
成功 apply 不创建 `.agents/skills/` 或 `relatedwork/`，不推进 phase，不写 event log 事件，不调用子代理。
