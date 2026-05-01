# OpenCode Dashboard Guided Init Design
<!-- description: 中文优先 Dashboard 与初始化预览设计 -->

## Summary
<!-- description: 本阶段目标 -->

###### 中文优先的项目入口
下一阶段将 `/vibe` 从安装状态面板升级为中文优先的项目入口。它回答三个问题：当前工作区是否 VibePaper-ready、缺少什么、下一步可以安全做什么。

###### 只读优先的初始化预览
本阶段只展示初始化计划，不实际创建 `paper.md`、`storyline.md`、`.agents/state.json` 等文件。所有写入动作留给后续独立确认流程。

## Goals
<!-- description: 必须实现的能力 -->

###### 默认中文输出
`/vibe`、`/vibe-doctor`、CLI 文本输出、doctor 文本和 README 默认使用 `zh-CN`。命令名、工具名、JSON 字段名保持英文，避免破坏 OpenCode 调用和自动化解析。

###### 多语言接口
CLI 支持 `--locale zh-CN|en-US`，并读取 `VIBEPAPER_LANG=zh-CN|en-US`。默认语言为 `zh-CN`。未来可从 OpenCode config 中读取 locale。

###### 项目就绪度模型
Dashboard 展示 OpenCode 集成状态、核心文件状态、状态文件状态、命令文件状态和可选 `relatedwork/` 状态。状态枚举保持稳定英文值。

###### 初始化预览
Dashboard 在项目未初始化时展示 init preview。预览列出路径、动作、原因和安全说明。预览本身不修改文件。

## Non-Goals
<!-- description: 本阶段明确不做的内容 -->

###### 不执行项目初始化
本阶段不实际创建或修改 `paper.md`、`storyline.md`、`writingrules.md`、`.agents/state.json`、`.agents/events.jsonl`、`AGENTS.md` 或 `relatedwork/`。

###### 不做阶段编排
本阶段不推进 VibePaper 阶段，不写工作流状态，不调用子代理，不执行文献下载或索引构建。

###### 不做复杂 UI
OpenCode 插件仍返回结构化 Markdown。浏览器 mockup 只用于讨论信息层级，不进入产品实现。

## Product Behavior
<!-- description: 用户可见行为 -->

###### `/vibe` 主入口
`/vibe` 调用 `vibepaper_dashboard` 工具并显示中文 Dashboard。它优先展示一个推荐动作，而不是给出多个同级选择。

###### `/vibe-doctor` 诊断入口
`/vibe-doctor` 保持安装诊断职责，但默认输出中文。它仍用于确认 OpenCode config、插件入口和 slash command 是否正常。

###### Dashboard 五段结构
Dashboard 输出固定为 Header、Readiness Summary、Checklist、Recommended Next Step、Init Preview。末尾保留 JSON block，供 agent 稳定解析。

###### 已初始化项目
如果核心文件和状态文件都存在且可解析，Dashboard 状态为 ready，并显示后续阶段入口提示。本阶段只提示，不推进阶段。

## Architecture
<!-- description: 模块拆分 -->

###### `doctor.ts`
继续只负责 OpenCode 集成健康检查，包括 config、插件入口、命令文件和受管标记。它不读取 VibePaper 项目文件。

###### `readiness.ts`
新增只读模块，检查 VibePaper 项目文件状态。它返回核心文件、状态文件、可选目录和冲突信息，不写入磁盘。

###### `init-preview.ts`
新增只读模块，生成初始化计划。计划动作包括 `create`、`exists-managed`、`exists-user`、`conflict`、`optional`。

###### `i18n.ts`
新增本地化模块，提供 `resolveLocale()` 与 `t(locale, key, params)`。业务模型使用英文枚举，渲染层负责翻译。

###### `dashboard.ts`
聚合 doctor、readiness 和 init preview，生成 Dashboard model，再渲染 Markdown 和 JSON block。

## Data Flow
<!-- description: Dashboard 构建流程 -->

###### 工具调用路径
`vibepaper_dashboard` 接收 OpenCode 的 `directory` 和 `worktree`，调用 root detection，然后执行 doctor、readiness、init preview，最后渲染 Dashboard。

###### 模型分层
Dashboard model 包含 `integration`、`readiness`、`initPreview`、`recommendation`、`locale`、`schemaVersion`。各层可独立测试。

###### JSON 稳定性
JSON 字段名和枚举值保持英文，例如 `ready`、`missing`、`conflict`、`create`。本地化只影响人类可读文案。

## Readiness Checks
<!-- description: 项目文件检查规则 -->

###### 核心文档
检查 `paper.md`、`storyline.md`、`writingrules.md` 是否存在且为普通文件。缺失标记为 `missing`，目录或不可读文件标记为 `conflict`。

###### 状态文件
检查 `.agents/state.json` 是否存在且可解析为 JSON object。检查 `.agents/events.jsonl` 是否存在且为普通文件。缺失标记为 `missing`。

###### 指导文件
检查 `AGENTS.md` 是否存在。若存在但没有明显 VibePaper 指引，标记为 `exists-user` 或 `needs-review`，不自动覆盖。

###### 文献目录
`relatedwork/` 第一版作为 optional readiness。缺失不阻塞 ready 的核心判断，但 Dashboard 可以提示后续可初始化。

## Init Preview
<!-- description: 初始化计划规则 -->

###### 预览文件集合
第一版预览 `paper.md`、`storyline.md`、`writingrules.md`、`.agents/state.json`、`.agents/events.jsonl` 和 `AGENTS.md`。`relatedwork/` 只作为 optional。

###### 冲突策略
如果目标路径存在且不是 VibePaper 管理的安全目标，预览标记为 `exists-user` 或 `conflict`。本阶段不覆盖用户文件。

###### 输出表格
预览表格包含 `Path`、`Action`、`Reason`。中文渲染中列名和 reason 本地化，JSON 中保留英文枚举。

## Localization
<!-- description: 多语言策略 -->

###### 默认语言
默认 locale 为 `zh-CN`。缺省 CLI、doctor、Dashboard、slash command 模板、README 都使用中文。

###### 英文兼容
`--locale en-US` 和 `VIBEPAPER_LANG=en-US` 输出英文文本。测试应覆盖至少一个英文 doctor 或 Dashboard 快照。

###### Slash command 更新
受管 `.opencode/commands/vibe.md` 与 `vibe-doctor.md` 默认生成中文提示。切换 locale 后需要重新运行 `init` 刷新受管命令。

## Error Handling
<!-- description: 失败和异常规则 -->

###### 只读失败不崩溃
readiness 或 preview 遇到不可读路径、目录占位、JSON 解析错误时，返回结构化 `conflict` 或 `invalid` 状态，不抛出到 OpenCode UI。

###### 集成失败优先
如果 doctor 发现 OpenCode 集成损坏，Dashboard 优先推荐修复安装，而不是展示项目初始化预览。

###### Locale 失败回退
未知 locale 回退到 `zh-CN`，并可在 JSON metadata 中记录 fallback。不要因为语言配置错误阻断 Dashboard。

## Testing
<!-- description: 验证策略 -->

###### 单元测试
为 `readiness.ts`、`init-preview.ts`、`i18n.ts` 添加 Bun 单元测试。测试覆盖 missing、existing、conflict、optional 和 locale fallback。

###### Dashboard 快照
新增 Dashboard 渲染测试，覆盖未初始化项目、已初始化项目、OpenCode 集成损坏项目，以及 `zh-CN` 与 `en-US` 输出。

###### CLI 回归
现有 CLI 测试扩展 `--locale` 和 `VIBEPAPER_LANG`。JSON 输出测试确认字段名和枚举不随语言改变。

###### Smoke 文档
更新中文使用测试文档，说明 `/vibe` 的 readiness 和 init preview 预期行为。

## Acceptance Criteria
<!-- description: 完成判定 -->

###### 中文用户可理解
新用户运行 `/vibe` 后，可以用中文看懂当前项目是否 ready、缺少哪些文件、下一步应预览初始化。

###### Dashboard 保持只读
运行 `/vibe` 不创建、不修改、不删除任何文件。测试通过目录 hash 或文件快照证明只读。

###### Preview 可复用
init preview 生成的计划模型可被未来 apply 命令复用，不把渲染文案和写入计划耦合在一起。

###### 英文接口保留
`--locale en-US` 能输出英文文本；JSON 字段名和状态枚举保持英文稳定。
