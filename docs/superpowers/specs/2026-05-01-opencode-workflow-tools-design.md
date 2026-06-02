# OpenCode Workflow Tools Design
<!-- description: OpenCode 内工作流状态、日志和阶段控制设计 -->

## Summary
<!-- description: 本阶段目标 -->

###### 从初始化到工作流 cockpit
本阶段将 `/copaper` 从初始化入口扩展为 post-init 工作流 cockpit。项目 ready 后，用户可以查看当前 workflow 状态、最近事件，并在明确确认后修改 phase status。

###### 保持 workflow schema 可演进
当前 `.agents/state.json` 仍使用现有 6-phase preset，但 OpenCode workflow tools 不写死 phase 数量、名称、顺序或依赖关系。工具从 state 动态读取 phase，并为未来可变 phase graph 预留读取能力。

## Goals
<!-- description: 必须实现的能力 -->

###### 动态 workflow 状态
`copaper_workflow_status` 读取 `.agents/state.json`，展示 `current_phase`、所有 `state.phases` 条目、状态摘要、可选 workflow metadata 和下一步建议。phase 列表来自实际 state，而不是 TypeScript 固定枚举。

###### 事件日志查询
`copaper_workflow_log` 读取 `.agents/events.jsonl`，支持最近事件、phase 过滤和 operator 过滤。日志查询不要求 phase 属于固定集合，只按事件中的 `phase` 字段匹配。

###### 显式确认阶段控制
`copaper_workflow_set_phase` 在用户明确确认后修改指定 phase 的 status，重新计算 `current_phase`，并追加一条 Python `EventLogger` 兼容 JSONL 事件。

###### Dashboard ready 后增强
项目 ready 后，`/copaper` 显示 workflow status、phase table、最近事件和推荐下一步。项目未 ready 时，Dashboard 继续优先展示初始化预览，不暴露复杂 workflow 操作。

## Non-Goals
<!-- description: 本阶段明确不做的内容 -->

###### 不定义最终 workflow graph
本阶段不确定最终 phase 数量、名称、任务内容或依赖图。尤其不把 `discussion` 固定为单一阶段，也不假设未来依赖关系是 DAG。

###### 不写入 workflow metadata
第一版不主动写入 `state.workflow`、`.agents/workflow.json` 或其他 workflow definition 文件。若未来 state 中出现 workflow metadata，工具可以读取和展示，但本阶段不生成它。

###### 不移植 Python 大模块
本阶段不移植 `relatedwork`、discussion dimensions、checker、git commit/rollback/report 或 skills scaffold。只处理 state、event log 和 Dashboard 展示。

###### 不强制依赖检查
本阶段不使用 Python 当前 `PHASE_DEPENDENCIES` 作为写入门槛，也不阻止用户设置存在 unmet dependencies 的 phase。未来 graph 明确后可加入 advisory 展示。

## Product Behavior
<!-- description: 用户可见行为 -->

###### Ready Dashboard
当 readiness 为 `ready` 时，`/copaper` 增加 workflow 区块：当前 phase、phase 状态表、最近事件和建议动作。建议动作使用实际 `current_phase`，不写死 `storyline`、`literature` 等 phase 名。

###### 状态查看
用户询问“当前进度”“现在是什么阶段”时，agent 调用 `copaper_workflow_status`。输出默认中文摘要，并附稳定 JSON block 供自动化解析。

###### 日志查看
用户询问“最近发生了什么”或“某个 phase 的记录”时，agent 调用 `copaper_workflow_log`。默认返回最近 5 条事件，用户可要求更多或指定 phase/operator。

###### 阶段修改
用户明确要求修改 phase 后，agent 必须确认目标 `phase` 和 `status`。若 status 为 `skipped`，还必须获得 `reason`。参数齐全且用户确认后，才调用 `copaper_workflow_set_phase`。

## Workflow State Compatibility
<!-- description: 当前 preset 与未来 schema 的关系 -->

###### 当前 preset 保留
`copaper_init_apply` 继续创建当前 Python `DEFAULT_STATE` 等价结构，包括 `storyline`、`literature`、`discussion`、`experiments`、`writing` 和 `latex_review`。这是默认数据，不是 OpenCode workflow tools 的逻辑边界。

###### Phase 动态读取
Workflow tools 使用 `Object.keys(state.phases)` 作为 phase ID 集合。每个 phase 的对象只要求可读取 `status` 和 `completed_at`；其他字段按原样保留并在写入时不删除。

###### 顺序来源
显示顺序优先使用可选 `state.workflow.phase_order` 中仍存在于 `state.phases` 的 phase ID。若该字段不存在或不完整，则追加未列出的 phase，并保持 `state.phases` 的 JSON 对象顺序。

###### 依赖来源
若未来存在 `state.workflow.dependencies`，工具可以把它作为 graph metadata 读取。依赖值为 `Record<string, string[]>` 时表示 phase 与其他 phase 的关系；循环关系有效，不是错误。

###### 不要求 workflow 字段
旧 state 或当前 init apply 生成的 state 不包含 `workflow` 时，结果中返回 `workflowMetadata.available: false`。这不是错误，也不降低 workflow tools v1 的可用性。

## Tool Design
<!-- description: OpenCode 工具边界 -->

###### `copaper_workflow_status`
该工具只读 state。参数为空。返回 `schemaVersion`、`ok`、`root`、`currentPhase`、`phases`、`summary`、`workflowMetadata`、`warnings`、`recommendation` 和 `locale`。

###### `copaper_workflow_log`
该工具只读 event log。参数为 `lastN`、`phase` 和 `operator`，均可选。`lastN` 默认 5，最大 50。operator 只接受 `user`、`ai` 或 `system`；phase 作为普通字符串过滤。

###### `copaper_workflow_set_phase`
该工具写 state 和 event log。参数为必需 `phase`、必需 `status`、可选 `reason`。status 支持 `not_started`、`in_progress`、`complete` 和 `skipped`。

###### ToolContext root
三个工具都使用 OpenCode runtime `ToolContext.directory` 和 `ToolContext.worktree` 做 root detection。不得回退到插件初始化时捕获的 directory/worktree，避免 Dashboard 与写入目标不一致。

## Set Phase Semantics
<!-- description: 写入规则 -->

###### Phase 校验
写工具只允许修改当前 `state.phases` 中存在的 phase ID。不存在的 phase 返回结构化错误，不写 state，也不追加 event。

###### Status 校验
写工具只允许写入 `not_started`、`in_progress`、`complete` 或 `skipped`。如果现有 state 中出现未知 status，status 工具仍展示它；set phase 不写未知 status。

###### Timestamp 规则
写入 `complete` 时设置 `completed_at` 为当前 UTC ISO timestamp。写入 `not_started`、`in_progress` 或 `skipped` 时设置 `completed_at` 为 `null`。

###### Skip reason
写入 `skipped` 必须提供非空 `reason`，并写入该 phase 对象的 `skip_reason` 字段。其他 status 不要求 reason；若提供 reason，可记录到 event metadata，但不强制写入 phase 对象。

###### Current phase 重算
重算 `current_phase` 时使用动态 phase 顺序。优先选择第一个 `in_progress` phase；否则选择第一个 status 不是 `complete` 且不是 `skipped` 的 phase；若全部 complete/skipped，则选择顺序中的最后一个 phase。该算法不依赖固定 phase 名。

###### 未知字段保留
写入 phase 时只更新 `status`、`completed_at` 和必要的 `skip_reason`。phase 对象中的其他字段必须保留，包括未来 dimension-specific metadata。

## Event Log Semantics
<!-- description: JSONL 事件兼容性 -->

###### Append 格式
成功 set phase 后追加一行 JSON：`timestamp`、`operator: "user"`、`phase`、`action: "set_phase_status"`、`result: "success"` 和 `metadata`。metadata 至少包含 `status`，可包含 `reason`、`previous_status` 和 `previous_current_phase`。

###### Python 兼容
事件行使用 compact JSON，UTF-8，字段语义兼容 Python `EventLogger`。日志读取跳过空行和 malformed JSON line，不因单行损坏导致整个工具失败。

###### 写入顺序
写工具先校验 state 和 event log 目标路径可用，再原子写 state，最后 append event。若 event append 失败，工具返回结构化错误并说明 state 是否已写入。第一版不自动回滚 state。

## Dashboard Integration
<!-- description: `/copaper` 展示变化 -->

###### 未 ready 优先初始化
readiness 为 `needs-init` 或 `blocked` 时，Dashboard 行为保持现状：展示 readiness、init preview、冲突说明和初始化建议，不显示 phase 控制建议。

###### Ready 后工作流区块
readiness 为 `ready` 时，Dashboard 增加 `Workflow` 区块。该区块展示当前 phase、phase 表、最近事件和下一步建议，例如“确认后可将当前 phase 设为 `in_progress`”。

###### 模板确认门槛
`/copaper` slash command 模板必须说明：修改 phase 是写操作，必须先复述目标 phase/status/reason 并等待用户确认。未确认前不得调用 `copaper_workflow_set_phase`。

## Error Handling
<!-- description: 失败和异常规则 -->

###### Missing state
如果 `.agents/state.json` 不存在，workflow tools 返回 `needs-init` 风格错误，建议先运行 `/copaper` 完成初始化写入。

###### Invalid state
如果 state 不是 JSON object、缺少 `phases` object 或 phase 对象不可解释，status/log 可返回 blocked 摘要，set phase 必须拒绝写入。

###### Missing event log
log 查询在 `.agents/events.jsonl` 不存在时返回空事件列表和 warning。set phase 写入前若 event log 父目录不可用或路径不安全，拒绝写入。

###### Workflow metadata 异常
如果 `state.workflow` 存在但结构不符合预期，工具忽略该 metadata 并返回 warning。不得因此阻止 status 查看或 set phase。

## Data Model
<!-- description: 结构化结果模型 -->

###### Phase row
`WorkflowPhaseRow` 包含 `id`、`status`、`completedAt`、`knownStatus`、`fields`。`fields` 是 phase 对象中除 `status` 和 `completed_at` 之外的浅层字段摘要。

###### Workflow metadata
`WorkflowMetadataSummary` 包含 `available`、`phaseOrder`、`dependencies`、`warnings`。dependencies 只用于展示，不用于 gating。

###### Set phase result
`WorkflowSetPhaseResult` 包含 `ok`、`root`、`phase`、`previousStatus`、`nextStatus`、`previousCurrentPhase`、`nextCurrentPhase`、`warnings`、`errors`、`eventAppended` 和稳定 JSON block。

###### JSON 稳定性
所有结果字段名、status 值、operator 值、action 值保持 English。中文只出现在 Markdown 渲染层和 localized message 中。

## Testing
<!-- description: 验证策略 -->

###### Dynamic phase tests
构造包含非默认 phase ID 的 state，例如 `discussion_problem_framing` 和 `discussion_evidence_mapping`，验证 status、Dashboard 和 set phase 都不依赖当前 6-phase 名称。

###### Future metadata tests
构造包含 `state.workflow.phase_order`、`state.workflow.dependencies` 和循环依赖的 state，验证工具能展示 metadata，不做 topological sort，也不阻止 set phase。

###### Set phase tests
覆盖四种 status：`not_started`、`in_progress`、`complete`、`skipped`。验证 `complete` 写 timestamp，其他状态清空 timestamp，`skipped` 无 reason 时拒绝写入。

###### Preservation tests
验证 set phase 保留 phase 对象未知字段、保留 state 顶层未知字段、保留未来 workflow metadata，并按动态顺序重算 `current_phase`。

###### Event tests
验证成功 set phase 追加 Python-compatible JSONL event。验证 log 查询支持 `lastN`、`phase`、`operator`，并跳过 malformed lines。

###### ToolContext tests
验证 workflow tools 使用 runtime `ToolContext` root，而不是插件初始化时捕获的 root。

## Acceptance Criteria
<!-- description: 完成判定 -->

###### Post-init 闭环
用户完成 init apply 后，可以在 `/copaper` 中看到 workflow 状态、当前 phase、最近事件和可确认执行的下一步 phase 操作。

###### Schema 不锁死
测试证明工具能处理非默认 phase 名称、额外 phase 数量、未来 workflow metadata 和循环 dependencies。实现中不应出现固定 phase 名称驱动的 workflow 逻辑。

###### 写入安全
phase 写操作必须显式确认，参数非法或 state 无效时写入 0 文件。成功写入保留未知字段，并追加 event log。

###### 范围保持克制
本阶段不生成 `state.workflow`，不创建 `.agents/skills/`，不创建 `relatedwork/`，不实现文献流、git 操作、报告或子代理编排。
