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

###### 不写入项目文件
<!-- description: Files not modified in this phase -->
当前阶段不会创建、修改或删除 `paper.md`、`storyline.md`、`writingrules.md`、`.agents/state.json`、`.agents/events.jsonl`、`AGENTS.md` 或 `relatedwork/`。

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

## 本地 Tarball

###### 发布前本地测试
<!-- description: Local tarball install note -->
测试本地 tarball 时，先把 tarball 安装到目标项目，再运行 `node_modules/.bin/vibepaper-opencode init`；这会在发布前写入稳定的项目内 `file://` 插件入口。
