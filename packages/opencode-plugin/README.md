# @vibepaper/opencode

###### VibePaper 的 OpenCode 集成插件
<!-- description: Package purpose and language defaults -->
`@vibepaper/opencode` 为 VibePaper 提供 OpenCode 集成，默认输出中文。命令名、工具名和 JSON 字段名保持 English，便于脚本和自动化稳定解析。

## 安装

###### 安装到目标项目
<!-- description: Bun install command -->
在目标项目根目录运行：

```bash
bunx -p @vibepaper/opencode vibepaper-opencode init
```

Bun 需要 `-p`，因为包名 `@vibepaper/opencode` 和二进制名 `vibepaper-opencode` 不同。

###### 重启并检查
<!-- description: OpenCode restart and commands -->
安装后重启 OpenCode，然后依次运行：

```text
/vibe-doctor
/vibe
```

如果已经安装过旧版本地构建，重新运行 `init` 以刷新受管 slash commands。

## VibePaper Agents

###### Injected Agents
<!-- description: Managed VibePaper agent profiles -->
- `@vibepaper-coordinator`: read-only workflow routing and next-step recommendations; it does not write project files.
- `@vibepaper-storyline`: confirmed edits to `storyline.md` only; it cannot edit other project files.
- `@vibepaper-writer`: confirmed edits to `paper.md` only, following VibePaper writing rules.
- `@vibepaper-recorder`: confirmed readiness records through VibePaper state-write tools; it does not edit paper content.

###### Project Overrides
<!-- description: Project-level agent override example -->
可在项目根目录创建 `.opencode/vibepaper.json` 覆盖默认 agent profile。例如：

```json
{
  "schemaVersion": 1,
  "defaults": {
    "model": "anthropic/claude-sonnet-4.5",
    "temperature": 0.2
  },
  "agents": {
    "vibepaper-writer": {
      "model": "openai/gpt-5.1",
      "promptAppend": "Prefer concise transitions and preserve Markdown headings.",
      "permissionProfile": "paperWrite"
    }
  }
}
```

###### Override Boundaries
<!-- description: Agent override security boundaries -->
覆盖配置可以禁用 agents、设置 model hints、设置 temperature、追加 preferences，或把 permissions downgrade 到更严格的 profile。覆盖配置不能授予 shell、Git、unrestricted editing、network 或 external directory access。VibePaper does not expose or manage raw provider secrets/API keys; model calls still use the provider credentials configured in OpenCode.

## Dashboard

###### 只读仪表盘
<!-- description: Read-only Dashboard behavior -->
`/vibe` 会打开只读 Dashboard，检查 OpenCode 集成、VibePaper 核心文件、状态文件、项目指导文件、可选 `relatedwork/`，并显示初始化预览。

###### Dashboard 只读边界
<!-- description: Read-only Dashboard boundary -->
Dashboard 工具本身只读取项目并展示初始化预览，不写入项目文件。确认初始化后的实际写入由下一节的 `vibepaper_init_apply` 流程完成。

## 工件状态

###### Ready 后的材料视图
<!-- description: Artifact status shown after ready -->
项目 ready 后，`/vibe` 会展示 `storyline.md`、`paper.md`、`relatedwork/`、`.agents/skills/`、`.agents/cross_index.json` 和 checker results 的工件状态。状态值保持 English：`missing`、`template`、`partial`、`ready`、`stale`、`unknown`。

###### 只读证据
<!-- description: Read-only artifact evidence behavior -->
`vibepaper_artifact_status` 只读取文件并展示 evidence、confidence 和 recommendation；它不写 `.agents/state.json`，不推进 phase，不安装 skills，也不运行 relatedwork、checker、report 或 git。

###### 显式记录就绪度
<!-- description: Artifact readiness write behavior -->
当用户明确要求记录工件就绪度时，agent 必须先复述 artifact、status、confidence 和 reason，并等待确认后才调用 `vibepaper_artifact_record`。该工具只写 `.agents/state.json` 的 `artifacts` 区域并追加 `.agents/events.jsonl`，不推进 phase，不运行 checker、relatedwork、report、skills 或 git。

## 论文结构

###### paper.md 只读结构扫描
<!-- description: Read-only paper structure status tool -->
`vibepaper_paper_structure_status` 只读取 `paper.md`，解析 Level 2-5 结构标题、Level 5 写作目标、Level 6 子段落覆盖情况、推荐的下一个未完成 Level 5 section，以及结构问题。该工具不写文件、不推进 phase、不记录 artifact readiness。

## 初始化项目

###### 显式确认写入
<!-- description: Init apply confirmation flow -->
`/vibe` 会先显示初始化预览。只有当用户明确说“确认初始化”，并提供项目名称与研究领域后，agent 才会调用 `vibepaper_init_apply` 工具。

###### 第一版写入范围
<!-- description: Files written by init apply -->
初始化写入只创建 `paper.md`、`storyline.md`、`writingrules.md`、`AGENTS.md`、`.agents/state.json` 和 `.agents/events.jsonl`。它不会创建 `.agents/skills/` 或 `relatedwork/`。

###### 冲突处理
<!-- description: Non-destructive conflict behavior -->
如果任一目标文件已经存在或不是安全的普通文件，初始化会整体中止，不覆盖用户内容，也不继续写入其他文件。

## 工作流状态

###### Ready 后的工作流视图
<!-- description: Workflow tools after init apply -->
项目 ready 后，`/vibe` 会显示当前 phase、phase 状态表和最近事件。phase 列表来自 `.agents/state.json`，不会写死当前 6 个默认阶段。

###### 显式确认修改阶段
<!-- description: Phase status confirmation rule -->
修改阶段状态时，agent 必须先复述目标 phase、status 和 reason（当 status 为 `skipped` 时），并等待用户确认后才调用 `vibepaper_workflow_set_phase`。

## 诊断

###### 默认中文输出
<!-- description: Doctor command examples -->
终端中可运行：

```bash
bunx -p @vibepaper/opencode vibepaper-opencode doctor
bunx -p @vibepaper/opencode vibepaper-opencode doctor --format markdown
bunx -p @vibepaper/opencode vibepaper-opencode doctor --format json
```

###### 英文输出示例
<!-- description: Locale command examples -->
需要英文输出时可使用 `--locale` 或 `VIBEPAPER_LANG`：

```bash
bunx -p @vibepaper/opencode vibepaper-opencode doctor --locale en-US
VIBEPAPER_LANG=en-US bunx -p @vibepaper/opencode vibepaper-opencode doctor
```

未知 locale 会回退到 `zh-CN`。JSON 字段名、状态值和 action 枚举保持 English，例如 `ok`、`checks`、`status`、`pass`、`fail`、`create`。

## 测试手册

###### 完整验证流程
<!-- description: Link to usage test manual -->
完整自动化验证、本地 tarball 安装、OpenCode 手动 smoke、Dashboard、工件状态/artifact status、artifact readiness record、agent profile、初始化写入、workflow 和冲突场景见 `USAGE_TEST.zh-CN.md`。该文档是当前 Dashboard + 工件状态 + 显式就绪度记录 + agent profile + 初始化写入 + workflow 阶段的测试手册。

## 本地 Tarball

###### 发布前本地测试
<!-- description: Local tarball install note -->
测试本地 tarball 时，先把 tarball 安装到目标项目，再运行 `node_modules/.bin/vibepaper-opencode init`；这会在发布前写入稳定的项目内 `file://` 插件入口。具体命令和验收点见 `USAGE_TEST.zh-CN.md`。
