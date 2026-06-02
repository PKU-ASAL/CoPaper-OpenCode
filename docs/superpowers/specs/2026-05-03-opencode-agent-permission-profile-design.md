# OpenCode Agent Permission Profile Design
<!-- description: CoPaper 专用 agent 与权限配置设计 -->

## Summary
<!-- description: 本阶段目标 -->

###### 建立专用 agent 底座
本阶段为 `@copaper/opencode` 增加 CoPaper 专用 subagent profile。插件启动时注入论文工作流角色、默认 prompt、模型 hint 和权限模板，为后续 writing、skills、review、literature 等流程提供基础设施。

###### 保持声明式启动
插件启动时只读取配置并注入 OpenCode agent config。启动不得写文件、不得扫描论文状态、不得执行 workflow、不得自动调用 subagent，也不得安装 skills。

###### 优先治理权限边界
本阶段重点不是自动化论文流程，而是定义谁可以读什么、写什么、调用什么工具。写作、状态记录、流程协调必须分离，避免单个 agent 拥有过宽权限。

## Goals
<!-- description: 必须实现的能力 -->

###### 注入四个 v1 agents
默认注入 `copaper-coordinator`、`copaper-storyline`、`copaper-writer` 和 `copaper-recorder`。它们都是 OpenCode `subagent`，由用户或 `/copaper` 建议显式调用。

###### 支持项目级覆盖
读取项目本地 `.opencode/copaper.json`。配置可禁用 agent、替换模型 hint、调整 temperature、追加 prompt 偏好，并在允许范围内收紧权限。

###### 输出安全诊断
配置解析失败、未知 agent、权限升级被拒、同名 OpenCode agent 冲突等情况必须进入 diagnostics。`/copaper-doctor` 应能展示 agent 注入状态和修复建议。

###### 复用后续工具治理
Agent profile 应为后续 `skills install/apply`、reviewer、literature、reporter 和 git operator 提供权限分层基础，而不是只服务当前四个角色。

## Non-Goals
<!-- description: 本阶段明确不做的内容 -->

###### 不做调度器
本阶段不实现多 agent scheduler，不自动 handoff，不自动串联 storyline、writing、record、review 或 literature。Agent 只能建议用户切换角色。

###### 不管理 provider secret
CoPaper 不配置 API key、provider base URL 或全局模型提供商。模型字段只是 OpenCode agent 的 model hint，provider 管理交给 OpenCode。

###### 不开放危险工具
v1 不给任何 agent 默认开放 unrestricted bash、git、checker、relatedwork download、web search、external directory 或 report generation。

###### 不生成 agent 文件
本阶段不写 `.opencode/agents/*.md`。Agent 由插件 `config` hook 声明式注入，避免多配置源、重启依赖和权限漂移。

## Role Taxonomy
<!-- description: v1 内置角色 -->

###### `copaper-coordinator`
只读调度员。它读取 Dashboard、artifact readiness 和项目状态，解释当前项目位置，推荐下一步角色。它不写文件、不更新 state、不运行 shell、不联网，也不直接执行论文流程。

###### `copaper-storyline`
研究叙事架构师。它围绕 `storyline.md` 帮用户收敛 problem、central claim、contribution、evidence plan 和 reader journey。写入 `storyline.md` 前必须确认，不直接修改 `paper.md` 或 state。

###### `copaper-writer`
正文写作者。它围绕 `paper.md` 起草或改写 Level 6 段落，参考 `storyline.md`、`.agents/cross_index.json` 和相关 `relatedwork/papers/*.md`。它不得修改 Level 1-5 结构，不直接写 state。

###### `copaper-recorder`
状态记录员。它只在用户确认后调用 CoPaper confirmed state-write 工具，记录 artifact readiness 或后续 phase decision。它不编辑 `paper.md`、`storyline.md` 或 relatedwork。

## Deferred Roles
<!-- description: v2 或更晚角色 -->

###### `copaper-literature`
文献角色需要联网、下载、BibTeX 同步、PDF 摘要和 cross-index 写入，权限复杂。它应等 v1 profile 稳定后作为 `researchNetwork` 类能力加入。

###### `copaper-reviewer`
评审角色可先读 `paper.md` 和 checker 结果，但一旦运行 checker 或 precheck 就进入 process 类权限。v1 不开放自动 checker 执行。

###### `copaper-experiment`
实验角色需要读取代码、数据和结果文件，项目差异大。它应在 artifact permissions 和 external directory 策略更成熟后设计。

###### `copaper-git`
Git 角色涉及 commit、diff、rollback 和工作区安全，是最高风险类别。它必须最后引入，并只响应显式用户请求。

## Configuration File
<!-- description: 项目级配置 -->

###### 配置路径
项目级覆盖文件为 `.opencode/copaper.json`。该文件属于 OpenCode 插件运行配置，不写入 `.agents/state.json`，也不承载 API key 或 provider secret。

###### Schema version
配置使用 `schemaVersion: 1`。缺少文件时使用默认 profile。不支持的版本不会中断插件，而是降级到安全默认配置并产生 warning diagnostic。

###### 示例配置
配置可以覆盖模型、temperature、promptAppend、enabled 和 permissionProfile。`promptAppend` 只追加项目偏好，不能覆盖内置安全规则。

```json
{
  "schemaVersion": 1,
  "locale": "zh-CN",
  "defaults": {
    "model": "openai/gpt-5.5",
    "temperature": 0.2
  },
  "agents": {
    "copaper-writer": {
      "model": "anthropic/claude-sonnet-4-5",
      "temperature": 0.4,
      "promptAppend": "Use concise conference-paper style.",
      "permissionProfile": "paperWrite"
    }
  }
}
```

###### 不支持字段
v1 不支持 `promptOverride`、`rawOpenCodeAgent`、原始 `permission`、原始 `tools`、`provider`、`apiKey` 或 `autoRun`。这些字段被忽略并产生 diagnostics。

## Permission Profiles
<!-- description: 权限模板 -->

###### `readOnly`
允许 `read`、`glob`、`grep` 和 `question`。禁止 `edit`、`bash`、`webfetch`、`websearch`、`external_directory`、process 类能力和危险 CoPaper 写工具。

###### `storylineWrite`
继承只读能力，并允许确认式编辑 `storyline.md`。它禁止编辑 `paper.md`、`.agents/state.json`、`.agents/events.jsonl`、relatedwork、shell、网络和外部目录。

###### `paperWrite`
继承只读能力，并允许确认式编辑 `paper.md`。它禁止编辑 `storyline.md`、state、events、relatedwork、shell、网络和外部目录。

###### `stateRecord`
允许读取和调用 CoPaper confirmed state-write 工具，但不给 OpenCode 通用 `edit` 权限。State 写入必须经工具内部路径、schema、event log 和确认校验。

## Maximum Permission Matrix
<!-- description: 安全天花板 -->

###### Coordinator 上限
`copaper-coordinator` 最大权限是 `readOnly`。项目配置不能把它升级为任何写权限。

###### Storyline 上限
`copaper-storyline` 最大权限是 `storylineWrite`，可降级为 `readOnly`。它不能获得 paper、state、shell 或网络权限。

###### Writer 上限
`copaper-writer` 最大权限是 `paperWrite`，可降级为 `readOnly`。它不能获得 storyline、state、shell 或网络权限。

###### Recorder 上限
`copaper-recorder` 最大权限是 `stateRecord`，可降级为 `readOnly`。它不能获得通用 edit，也不能修改论文正文。

## Merge Semantics
<!-- description: 默认与覆盖合并 -->

###### 默认优先安全
合并顺序为内置 profile、项目覆盖、安全降级。配置错误不能让插件不可用，也不能扩大权限。

###### 合法覆盖
项目可以设置 `enabled`、`model`、`temperature`、`promptAppend` 和允许范围内的 `permissionProfile`。Agent 未配置时使用默认 profile。

###### 拒绝升级
若项目要求超出最大权限，插件拒绝升级，保留该 agent 默认权限或可安全降级权限，并记录 `permission-escalation-denied` warning。

###### Prompt 合并
最终 prompt 由内置 role、artifact rules、workflow rules、tool policy、handoff policy 和 `promptAppend` 组成。若 `promptAppend` 与内置规则冲突，内置规则优先。

## OpenCode Injection
<!-- description: config hook 行为 -->

###### 纯配置转换
`config` hook 读取 `.opencode/copaper.json`，合并 agent profile，生成 OpenCode `agent` config，并注入缺失的 `copaper-*` agents。它不得产生文件写入副作用。

###### Subagent mode
所有 v1 agents 都使用 `mode: "subagent"`。它们不替代主 assistant，而是由用户通过 `@copaper-*` 或 `/copaper` 建议显式调用。

###### 命名空间
插件只管理内置 `copaper-*` 名称。v1 不支持用户新增任意 CoPaper agent，因为新增 agent 需要单独权限审计。

###### 同名冲突
如果 OpenCode 现有 config 已定义同名 agent，插件不覆盖用户定义，跳过注入并记录 warning。用户应删除同名 OpenCode agent，改用 `.opencode/copaper.json` 覆盖。

## Tool Governance
<!-- description: CoPaper 工具层权限 -->

###### 双层权限
OpenCode permission 控制通用工具，CoPaper 工具内部仍要检查 `context.agent` 和 capability。高层工具不能只靠 prompt 防止越权。

###### Inspect tools
Dashboard、artifact status、readiness preview 等只读工具默认允许 v1 agents 使用。它们不得写 state、events 或 artifacts。

###### Record tools
`copaper_artifact_record` 等 confirmed state-write 工具只允许 `copaper-recorder` 使用，或要求未知 agent 经过额外明确确认。

###### Process tools
skills install、relatedwork、checker、report、git 和 export 属 process 类能力。v1 默认不开放，未来必须逐项设计 agent capability 和确认策略。

## Prompt Requirements
<!-- description: 内置 prompt 骨架 -->

###### 统一结构
每个 agent prompt 应包含 role boundary、artifact boundary、workflow rules、tool policy 和 handoff policy。Prompt 不能只描述写作风格。

###### 写作规则
写作相关 prompt 必须强调 Level 1-5 只作结构，正文只能位于 Level 6，Level 6 标题不超过 50 字符，段落正文不超过 500 字符。

###### 反编造规则
Storyline 和 writer 不得编造实验结果、文献结论或不存在的 contribution。缺少研究事实时必须提问或标记 assumption。

###### Handoff 规则
Agent 可建议切换角色，但 v1 不自动 handoff。Coordinator 负责推荐角色，writer 遇到 claim 不稳应交回 storyline，writer 完成后建议 recorder 记录 readiness。

## Diagnostics
<!-- description: 配置可见性 -->

###### Diagnostic 类型
Diagnostics 至少包含 severity、code、path 和 message。Code 覆盖 `config-missing`、`config-parse-failed`、`unknown-agent`、`unsupported-field`、`permission-escalation-denied` 和 `agent-name-conflict`。

###### 进程内保存
`config` hook 产生的 diagnostics 保存在插件实例闭包中。v1 不写磁盘，不追加 event log。`/copaper-doctor` 读取当前进程内的最新 diagnostics。

###### Doctor 展示
`/copaper-doctor` 展示每个 agent 的 injected、disabled、skipped 或 conflicted 状态，并列出权限 profile、模型 hint 和诊断修复建议。

###### `/copaper` 提示
普通 `/copaper` 输出只提示存在 agent profile warnings，并建议运行 `/copaper-doctor`。它不展开全部 diagnostics，避免污染 Dashboard。

## Error Handling
<!-- description: 失败行为 -->

###### Missing config
找不到 `.opencode/copaper.json` 时使用内置默认 agents，并产生 info diagnostic。缺配置不是错误。

###### Parse failure
JSON 解析失败时使用内置默认 agents，并产生 warning。插件不得因配置文件损坏而停止加载。

###### Unknown entries
未知 agent、未知字段和未知 permission profile 被忽略或降级。它们不能进入 OpenCode raw config，也不能扩大权限。

###### Model errors
插件不验证 provider 是否存在。模型字段按 OpenCode 规则传递，若 provider 或 model 不可用，由 OpenCode runtime 暴露。

## Implementation Shape
<!-- description: 推荐工程结构 -->

###### 新增模块
新增 `agent-profiles.ts`、`permission-profiles.ts`、`copaper-config.ts`、`agent-config.ts` 和 `agent-diagnostics.ts`。`index.ts` 只负责连接 plugin hook 和工具注册。

###### Prompt 存放
v1 prompt 可先以内联 TypeScript 字符串存放。这样编译后自动进入 `dist`，避免 npm package 资源路径、文件扫描和 dev/prod 差异。

###### 纯函数优先
配置加载、profile 合并、权限降级、OpenCode agent 转换和 diagnostics 渲染都应尽量是纯函数，便于单元测试。

## Testing
<!-- description: 验证策略 -->

###### Profile tests
测试四个内置 agents 存在，`mode` 为 `subagent`，prompt 包含角色边界、artifact 规则、权限规则和 handoff 规则。

###### Permission tests
测试 `readOnly` 禁止写入和外部执行，`storylineWrite` 只允许确认式 `storyline.md`，`paperWrite` 只允许确认式 `paper.md`，`stateRecord` 不给通用 edit。

###### Config tests
覆盖 missing config、parse failure、unsupported schema、unknown agent、unsupported field、enabled false、promptAppend、model 和 temperature 合并。

###### Injection tests
覆盖默认注入、同名 OpenCode agent 冲突、权限升级拒绝、agent 禁用和 diagnostics 保存。确认 config hook 不写文件。

###### Template tests
更新 `/copaper` 和 `/copaper-doctor` 模板测试，确认用户能看到可用 agents、warnings 提示和 doctor 诊断入口。

## Acceptance Criteria
<!-- description: 完成判定 -->

###### 默认可用
没有 `.opencode/copaper.json` 时，插件启动可注入四个安全默认 subagents，并记录缺配置 info diagnostic。

###### 可安全覆盖
项目配置可禁用 agent、替换模型、调整 temperature、追加 prompt，并把 writer/storyline/recorder 降级为只读。

###### 不可越权
项目配置不能把 coordinator、writer、storyline 或 recorder 升级到超出最大权限。危险字段被忽略并进入 diagnostics。

###### 冲突可见
同名 OpenCode agent 不被覆盖，doctor 能展示 skipped/conflicted 状态和修复建议。

###### 无启动副作用
插件启动不写 `.agents/state.json`、`.agents/events.jsonl`、`.opencode/agents` 或任何项目 artifact。

###### 验证通过
实现完成后，`bun test`、`bun run typecheck` 和 `bun run build` 必须通过。若有仓库级检查失败，只修复与本阶段相关的问题。

## Follow-Up Milestones
<!-- description: 后续路线 -->

###### Skills install/apply
下一步可把 skills 安装作为 process 类 confirmed tool 接入 profile 治理，由 coordinator 推荐，用户确认后执行。

###### Reviewer role
之后可加入 `copaper-reviewer`，先做 read-only checker result review，再设计 confirmed checker/precheck execution。

###### Literature role
`copaper-literature` 应单独设计 network、download、PDF 和 cross-index 写入权限，不应混入 v1。

###### Git role
`copaper-git` 必须最后引入，并有比普通写入更强的显式确认、状态检查和失败说明。
