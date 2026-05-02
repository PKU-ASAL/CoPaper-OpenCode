# OpenCode Artifact Cockpit Design
<!-- description: OpenCode 内工件就绪度与来源证据设计 -->

## Summary
<!-- description: 本阶段目标 -->

###### 从 phase cockpit 到 artifact cockpit
本阶段将 `/vibe` 从 phase 状态视图扩展为 artifact cockpit。项目 ready 后，用户可以看到 `storyline.md`、`paper.md`、`relatedwork/`、`.agents/skills/` 和 checker 结果是否真正可用。

###### 判断材料而不是自动推进
Artifact cockpit 只暴露证据、风险和建议，不自动推进 phase，不运行 relatedwork，不安装 skills，也不运行 checker。它为后续纵向能力提供判断基础。

## Goals
<!-- description: 必须实现的能力 -->

###### 统一 artifact 状态
`vibepaper_artifact_status` 读取项目中的关键工件，并为每个工件返回 `missing`、`template`、`partial`、`ready`、`stale` 或 `unknown`。

###### 证据驱动判断
每个 artifact 状态必须附带 evidence 和 confidence。Dashboard 不应只因为文件存在就宣称材料 ready，尤其不能把初始化模板误判为实质内容。

###### Dashboard ready 后增强
项目 ready 后，`/vibe` 显示 Artifacts 区块，让用户先理解哪些材料可用，再理解 workflow phase 如何推进。

###### 为后续能力铺路
Artifact status 结果要能被后续 relatedwork、skills 安装、checker/report 联动复用，但本阶段不实现这些纵向流程。

## Non-Goals
<!-- description: 本阶段明确不做的内容 -->

###### 不写入 readiness state
第一版不新增写入型 `vibepaper_artifact_set_readiness`，也不主动写入 `state.artifacts`。若未来 state 中已有 artifact 记录，工具可以读取为辅助证据。

###### 不运行外部流程
本阶段不下载论文、不同步 BibTeX、不构建 cross-index、不安装 `.agents/skills/`、不运行 checker、不生成 report，也不执行 Git 操作。

###### 不自动映射 phase
Artifact 状态不自动改变 workflow phase。`paper=ready` 不代表自动把 `writing` 设为 `complete`，`relatedwork=missing` 也不阻止用户继续写作。

###### 不做内容质量评审
第一版只判断材料是否像可用输入，不评价学术贡献、论证质量或实验真实性。这些质量检查留给 checker 和 review 流程。

## Product Behavior
<!-- description: 用户可见行为 -->

###### Ready Dashboard 层级
当 readiness 为 `ready` 时，Dashboard 展示顺序为 `Readiness`、`Artifacts`、`Workflow`、`Recommendation`。Artifact evidence 用来校准 phase 建议。

###### Artifact 状态查看
用户询问“哪些材料准备好了”“storyline 是否可用”“paper 还是模板吗”时，agent 调用 `vibepaper_artifact_status`。

###### 保守推荐下一步
推荐逻辑以 artifact evidence 为主。若 `storyline` 是模板，建议完善研究主线；若 `relatedwork` 缺失，建议后续进入 relatedwork 流程；若 `skills` 缺失，建议显式安装完整 skills。

###### Markdown 与 JSON 双输出
工具输出默认中文 Markdown 摘要，并保留稳定英文 JSON block。字段名、状态值、confidence 值和 artifact ID 均保持 English。

## Tool Design
<!-- description: OpenCode 工具边界 -->

###### `vibepaper_artifact_status`
该工具只读项目文件。参数为空或仅包含未来兼容的可选显示参数。它使用 OpenCode runtime `ToolContext.directory` 和 `ToolContext.worktree` 做 root detection。

###### 结构化返回
返回字段包括 `schemaVersion`、`ok`、`root`、`artifacts`、`summary`、`recommendation`、`warnings` 和 `locale`。失败时仍尽量返回已能读取的 artifact 诊断。

###### Dashboard 集成
`vibepaper_dashboard` 在项目 ready 时调用 artifact status 逻辑，并在 JSON block 中加入 `artifactStatus`。artifact status 失败时，Dashboard 隐藏 Markdown 区块但保留 JSON 诊断。

###### 命令模板
`/vibe` slash command 应说明 artifact status 是只读工具。agent 可用它回答材料状态问题，但不得基于 artifact 结果直接写 state 或推进 phase。

## Data Model
<!-- description: 稳定结果模型 -->

###### Artifact row
`ArtifactRow` 包含 `id`、`label`、`status`、`confidence`、`evidence`、`warnings`、`recommendation` 和可选 `metadata`。

###### Artifact status
`status` 支持 `missing`、`template`、`partial`、`ready`、`stale` 和 `unknown`。未知或异常情况优先返回 `unknown`，而不是猜测为 ready。

###### Confidence
`confidence` 支持 `low`、`medium` 和 `high`。文件缺失通常是 high confidence；内容启发式判断通常是 medium；读取异常或 schema 不明时是 low。

###### Evidence
`evidence` 是短字符串数组，记录判定依据，例如文件存在、正文长度、模板 marker、空章节数量、mtime、相关子文件数量、state 中的记录等。

###### Summary
`summary` 统计各状态数量，并给出 `readyCount`、`blockedCount`、`staleCount` 和 `recommendedFocus`。它不包含固定 phase 名称。

## Artifact Rules
<!-- description: 第一版工件判定规则 -->

###### Storyline
`storyline` 检查 `storyline.md`。缺失为 `missing`；明显保留默认模板或占位符为 `template`；有少量用户内容为 `partial`；关键结构有实质内容时为 `ready`。

###### Paper
`paper` 检查 `paper.md`。缺失为 `missing`；仅初始化框架或空章节为 `template`；部分 section 有正文为 `partial`；多个核心 section 有实质内容时为 `ready`。

###### Relatedwork
`relatedwork` 聚合检查 `relatedwork/`、`relatedwork/literature.json`、`relatedwork/paper_list.bib`、`relatedwork/papers/*.md`、`relatedwork/summary.md` 和 `.agents/cross_index.json`。目录存在但数据少时为 `partial`。

###### Skills
`skills` 检查 `.agents/skills/` 是否存在、是否为目录和 skill 数量。它只报告安装状态，不验证每个 skill 的语义正确性。

###### Checker results
`checker_results` 检查 `.agents/state.json` 中现有 checker 状态、`.agents/precheck_report.md` 和已知 report 文件。结果早于 `paper.md` 修改时间时可标为 `stale`。

###### Unknown artifacts
如果未来 state 中出现额外 artifact metadata，第一版可以在 `metadata.extraArtifacts` 中保留摘要，但不需要渲染为第一等 Dashboard 行。

## Provenance Rules
<!-- description: 来源和新鲜度判断 -->

###### Optional state artifacts
若 `.agents/state.json` 中存在 `artifacts` 对象，status 工具可读取其中的 `status`、`updated_at`、`source` 和 `notes` 作为辅助 evidence，但不得要求该字段存在。

###### 文件新鲜度
当 checker、precheck、summary 或 cross-index 的 mtime 早于其主要输入时，可以返回 `stale`。mtime 只作为 evidence，不作为唯一判断依据。

###### 来源表达
`metadata.provenance` 可记录 `file`、`state`、`event_log` 或 `heuristic`。第一版只展示简短来源，不建立完整 lineage graph。

## Dashboard Integration
<!-- description: `/vibe` 展示变化 -->

###### Artifacts 区块
Ready Dashboard 增加 `Artifacts` 区块。每行展示 artifact ID、status、confidence、关键 evidence 和下一步建议。

###### Recommendation 顺序
推荐优先级为：缺失核心文件、模板核心工件、partial 核心工件、missing relatedwork、missing skills、stale checker results。推荐只给下一步，不启动写操作。

###### Workflow 协同
Workflow 区块继续显示 phase 状态。若 artifact evidence 与 phase 直觉冲突，例如 `writing=complete` 但 `paper=template`，Dashboard 应提示需要人工复核，而不是自动修正 phase。

## Error Handling
<!-- description: 失败和异常规则 -->

###### 读取失败
单个文件读取失败只影响对应 artifact，并进入 `warnings`。其他 artifact 继续计算，Dashboard 不应整体崩溃。

###### Invalid state
`.agents/state.json` 无效时，artifact status 仍可基于文件系统返回部分结果，并把 state 解析错误放入 warnings。

###### 路径安全
工具只读取 root 内路径。遇到目录穿越、异常 symlink 或不可读路径时返回 warning，并把相关 artifact 设为 `unknown`。

###### 保守降级
任何无法解释的情况都降级为 `unknown` 或 `partial`。第一版宁可少宣称 ready，也不产生错误确定性。

## Testing
<!-- description: 验证策略 -->

###### Artifact fixture tests
构造缺失文件、默认初始化模板、少量正文、实质正文、无效 JSON、损坏目录和 stale mtime 等 fixture，验证各 artifact 判定。

###### Dashboard tests
验证 ready 项目显示 Artifacts 区块，未 ready 项目仍优先显示初始化预览。验证 artifact status 异常时隐藏 Markdown 区块但保留 JSON 诊断。

###### Tool registration tests
验证插件注册 `vibepaper_artifact_status`，并验证它使用 runtime `ToolContext` root，而不是插件初始化时捕获的 root。

###### Localization tests
验证中文默认输出、英文输出和稳定英文 JSON 字段。状态值、confidence 值和 artifact ID 不随 locale 变化。

###### Documentation tests
更新 README 和测试手册，明确 artifact status 是只读判断，不会写 state、不推进 phase、不运行 relatedwork 或 checker。

## Acceptance Criteria
<!-- description: 完成判定 -->

###### 用户可理解材料状态
用户运行 `/vibe` 后，可以清楚看到哪些材料缺失、哪些只是模板、哪些已有实质内容、哪些结果可能过期。

###### Dashboard 不误导
默认初始化后的 `storyline.md` 和 `paper.md` 不应被误判为 ready。Dashboard 推荐必须基于 evidence，而不是只看文件存在。

###### Schema 不锁死
实现不依赖固定六阶段，也不要求 `state.artifacts` 存在。未来 artifact metadata 出现时，工具能读取为辅助证据并保留未知字段。

###### 范围保持克制
本阶段只实现只读 artifact status 和 Dashboard 展示。不写 readiness state，不安装 skills，不实现 relatedwork 操作，不运行 checker/report/git。
