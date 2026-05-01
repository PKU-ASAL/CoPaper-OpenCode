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

## Dashboard

###### 只读仪表盘
<!-- description: Read-only Dashboard behavior -->
`/vibe` 会打开只读 Dashboard，检查 OpenCode 集成、VibePaper 核心文件、状态文件、项目指导文件、可选 `relatedwork/`，并显示初始化预览。

###### Dashboard 只读边界
<!-- description: Read-only Dashboard boundary -->
Dashboard 工具本身只读取项目并展示初始化预览，不写入项目文件。确认初始化后的实际写入由下一节的 `vibepaper_init_apply` 流程完成。

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
完整自动化验证、本地 tarball 安装、OpenCode 手动 smoke、初始化写入和冲突场景见 `USAGE_TEST.zh-CN.md`。该文档是当前 Dashboard + 初始化写入阶段的测试手册。

## 本地 Tarball

###### 发布前本地测试
<!-- description: Local tarball install note -->
测试本地 tarball 时，先把 tarball 安装到目标项目，再运行 `node_modules/.bin/vibepaper-opencode init`；这会在发布前写入稳定的项目内 `file://` 插件入口。具体命令和验收点见 `USAGE_TEST.zh-CN.md`。
