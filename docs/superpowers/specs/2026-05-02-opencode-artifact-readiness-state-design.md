# OpenCode Artifact Readiness State Design
<!-- description: OpenCode 内工件就绪度写入与来源记录设计 -->

## Summary
<!-- description: 本阶段目标 -->

###### 从只读观察到显式记录
本阶段将 Artifact Cockpit 从只读观察扩展为可审计的 readiness state。OpenCode 可以在用户明确确认后记录某个 artifact 的状态、证据、置信度和来源。

###### 保持控制面克制
新能力只写 `.agents/state.json` 的 `artifacts` 区域，并追加 `.agents/events.jsonl`。它不推进 phase，不运行 checker，不触发 relatedwork，不安装 skills，也不执行 Git 操作。

###### 不再规划 Python CLI parity
后续新控制能力以 `@vibepaper/opencode` 为主入口。Python CLI 不新增对应 artifact record 命令，仅作为旧项目状态格式的兼容背景。

## Goals
<!-- description: 必须实现的能力 -->

###### 记录 artifact readiness
新增 `vibepaper_artifact_record` 工具，用于记录 `storyline`、`paper`、`relatedwork`、`cross_index` 和 `checker_results` 的显式 readiness 状态。

###### 保留扫描事实
现有 `vibepaper_artifact_status` 继续读取文件系统并报告观察结果。持久 readiness 是额外证据，不取代扫描事实，也不允许掩盖文件缺失或过期。

###### 审计每次写入
每次成功写入必须追加 event log，记录 artifact、status、confidence、reason、previous status 和 stale 信息。失败时返回结构化错误。

###### 兼容未来 schema
实现必须保留 `.agents/state.json` 中未知顶层字段、未知 artifact key 和未知 artifact 字段。未来扩展不能被本阶段 schema 锁死。

## Non-Goals
<!-- description: 本阶段明确不做的内容 -->

###### 不做 Python CLI 命令
本阶段不新增 `vibe artifact record` 或其他 Python CLI 入口。新写入能力只存在于 OpenCode plugin 工具层。

###### 不做 workflow 调度器
本阶段不实现 `resume`、`progress` 或下一步自动调度。artifact readiness 不自动改变 `current_phase`，也不自动设置任何 phase status。

###### 不运行外部流程
工具不运行 checker、relatedwork、report、Git、skills 安装或任何网络下载。它只记录用户或 agent 已确认的状态。

###### 不做语义质量评审
工具不判断论文贡献、实验真实性或文字质量。`ready` 表示某项材料被显式确认可用，不代表学术质量通过评审。

## Product Behavior
<!-- description: 用户可见行为 -->

###### 确认后写入
agent 调用 `vibepaper_artifact_record` 前，必须复述 artifact、status、confidence 和 reason，并等待用户确认。未确认不得调用写入工具。

###### Dashboard 合并展示
项目 ready 后，Dashboard 展示扫描状态和 recorded readiness。若二者冲突，Dashboard 显示冲突或 stale 提示，而不是静默相信其中一方。

###### 状态不触发动作
用户把 `paper` 记录为 `ready` 后，系统只更新 artifact state 和 event log。它不会把 `writing` phase 设为 `complete`，也不会运行 checker。

###### 中文说明和英文 schema
Markdown 说明默认中文。工具名、artifact ID、JSON 字段、status、confidence、operator 和 action 值保持 English，便于自动化解析。

## Data Model
<!-- description: `.agents/state.json` 新增结构 -->

###### 顶层 artifacts
`.agents/state.json` 增加可选顶层 `artifacts` 对象。该对象独立于 `phases` 和 `workflow`，避免把材料就绪度与阶段状态混在一起。

###### 稳定 artifact ID
第一版支持 `storyline`、`paper`、`relatedwork`、`cross_index` 和 `checker_results`。ID 是稳定逻辑名，不是任意路径。

###### Artifact record
每个 record 包含 `status`、`confidence`、`evidence`、`provenance`、`updated_at` 和可选 `content_hash`。未知字段按原样保留。

###### Status 值
`status` 复用 artifact status：`missing`、`template`、`partial`、`ready`、`stale` 和 `unknown`。写入工具只接受这些值。

###### Provenance
`provenance` 至少包含 `source: "opencode"`、`operator: "user"` 和 `reason`。未来可增加 reviewer、tool version 或 session metadata。

## Tool Design
<!-- description: OpenCode 写入工具 -->

###### `vibepaper_artifact_record`
该工具使用 OpenCode runtime `ToolContext.directory` 和 `ToolContext.worktree` 做 root detection。不得使用插件初始化时捕获的 root。

###### 参数
必需参数为 `artifact`、`status`、`confidence`、`evidence` 和 `reason`。`evidence` 必须是非空字符串数组，`reason` 必须是非空字符串。

###### Hash 处理
工具可选接收 `content_hash`。未传入时，工具可对 artifact 关联文件安全计算 hash；无法计算时不失败，但必须返回 warning。

###### 成功返回
成功结果包含更新后的 record、previous record 摘要、是否 stale、event 是否追加、warnings 和稳定 JSON block。Markdown 摘要用中文解释影响范围。

###### 失败返回
失败结果包含 `ok: false`、错误 code、用户可读说明和已识别 root。参数非法、state 无效或路径不安全时写入 0 文件。

## Merge Semantics
<!-- description: 扫描结果与记录状态合并 -->

###### 扫描事实优先
`vibepaper_artifact_status` 继续以文件系统扫描判断事实状态。recorded readiness 只能作为辅助 evidence 和人工确认信号。

###### Hash stale
若 recorded `content_hash` 与当前 artifact hash 不一致，Dashboard 标记 recorded readiness stale。工具不得继续把旧记录当成当前 ready 事实。

###### 冲突提示
若扫描显示 `paper=template` 但记录显示 `paper=ready`，Dashboard 应提示冲突并建议重新确认，而不是自动覆盖 state 或扫描结果。

###### 未知字段保留
合并读取时保留未知 artifact records 的摘要，但第一版 Dashboard 只渲染一等 artifact 行。未知字段不应导致工具失败。

## Event Log Semantics
<!-- description: 审计事件格式 -->

###### Append 格式
成功写入后追加 compact JSONL 事件，字段包括 `timestamp`、`operator: "user"`、`action: "record_artifact_readiness"`、`result: "success"` 和 `metadata`。

###### Metadata
`metadata` 至少包含 `artifact`、`status`、`confidence`、`reason`、`previous_status` 和 `stale`。可包含 `content_hash` 和 `previous_content_hash`。

###### 写入顺序
工具先完成参数和路径校验，再原子写 state，最后 append event。若 event 追加失败，结果必须明确说明 state 是否已写入。

###### 日志兼容
日志行使用 UTF-8 compact JSON。现有 workflow log 读取 malformed line 时应继续跳过，不能因为 artifact event 破坏日志展示。

## Dashboard Integration
<!-- description: `/vibe` 展示变化 -->

###### Recorded readiness 列
Artifacts 区块增加 recorded readiness 信息，展示 recorded status、confidence、updated time 和 stale 标记。扫描 evidence 仍保留。

###### Recommendation
推荐逻辑优先处理冲突和 stale。若 recorded readiness 过期，建议重新检查并确认；若缺少记录但扫描 ready，可建议用户确认并记录。

###### JSON 输出
Dashboard JSON 中的 `artifactStatus` 包含每个 artifact 的 scan row 和 recorded record 摘要。字段名保持 English。

###### Slash command 指引
`/vibe` 模板必须说明 `vibepaper_artifact_record` 是写操作，调用前需要用户明确确认，且不会自动推进 phase 或运行重型流程。

## Error Handling
<!-- description: 失败和异常规则 -->

###### Missing state
`.agents/state.json` 缺失时，record 工具拒绝写入并建议先完成 OpenCode 初始化。它不自动创建项目 state。

###### Invalid state
state 不是 JSON object 或无法解析时，record 工具拒绝写入。artifact status 仍可只读扫描并返回 warning。

###### Invalid args
非法 artifact、status、confidence、空 evidence 或空 reason 都返回结构化错误。错误时不得写 state，也不得追加 event。

###### Path safety
所有读写路径必须位于项目 root 内。遇到异常 symlink、目录穿越或不可写目标时拒绝写入。

###### Event failure
如果 state 已写入但 event append 失败，工具返回 warning 或错误并明确 `eventAppended: false`。第一版不自动回滚 state。

## Testing
<!-- description: 验证策略 -->

###### Record success tests
构造 ready 项目，记录各一等 artifact 的 readiness。验证 state 中出现 `artifacts`，event log 追加正确 action，返回 JSON 稳定。

###### Preservation tests
验证写入保留 state 顶层未知字段、未知 artifact key、未知 artifact record 字段、已有 phases 和 workflow metadata。

###### Validation tests
覆盖非法 artifact、非法 status、非法 confidence、空 evidence、空 reason、missing state、invalid state 和不安全路径，确认写入 0 文件。

###### Stale tests
记录 content hash 后修改对应文件，验证 artifact status 和 Dashboard 将 recorded readiness 标记为 stale 或冲突。

###### Integration tests
验证 `vibepaper_artifact_status` 仍然只读，但能读取 recorded readiness；验证 Dashboard 合并展示扫描事实和 recorded record。

###### Template tests
验证 `/vibe` 文案包含写入确认门槛、无自动 phase 推进、无 checker、无 relatedwork、无 skills 安装和无 Git 操作。

## Acceptance Criteria
<!-- description: 完成判定 -->

###### 可审计记录
用户确认后，OpenCode 可以记录 artifact readiness，并能在 state 和 event log 中看到完整证据、来源和原因。

###### 不误导 Dashboard
Dashboard 同时展示扫描事实和 recorded readiness。旧 hash、冲突或 stale 记录不能被展示成无条件 ready。

###### 写入安全
非法参数、无效 state 和路径异常必须写入 0 文件。成功写入保留未知字段，并明确 event append 结果。

###### 范围保持克制
本阶段只实现 OpenCode artifact readiness state。它不新增 Python CLI，不推进 phase，不运行 checker、relatedwork、report、skills 或 Git。

###### 后续可扩展
该 schema 可作为 storyline validator、relatedwork workflow 和未来 resume 建议的状态落点，但本阶段不实现这些上层能力。
