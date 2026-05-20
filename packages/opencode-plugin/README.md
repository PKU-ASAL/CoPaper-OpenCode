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
- `@vibepaper-reviewer`: read-only checker review, issue explanation, and checker-summary preparation; it does not edit `paper.md` or write state.
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

###### storyline.md 只读结构扫描
<!-- description: Read-only storyline structure status tool -->
`vibepaper_storyline_structure_status` 只读取 `storyline.md`，解析 `#####` 故事线章节、filled/partial/empty 状态、TODO 覆盖和下一个待补章节。该工具不写文件、不推进 phase、不记录 artifact readiness。

## 导入提取

###### 显式路径提取
<!-- description: Read-only import extraction tools -->
`vibepaper_pdf_extract` 和 `vibepaper_ppt_extract` 只读取用户明确提供的项目内路径，不会自动扫描目录或猜测候选文件。PDF 工具提取文本、页数、source hash 和置信度；PPTX 工具提取 slide text、标题、可选 notes、source hash。二者都不写文件、不推进 phase、不记录 artifact readiness。

###### checker 只读状态
<!-- description: Read-only checker status tool -->
`vibepaper_checker_status` 只读取 `.agents/state.json` 的 `checkers` 区域、`.agents/precheck_report.md` 和 `paper.md` 更新时间，汇总 7 个 checker 的运行状态、Critical/Major/Minor 计数、stale 信号和预检报告证据。该工具不运行 checker、不写状态、不推进 phase、不记录 artifact readiness。

###### relatedwork 只读状态
<!-- description: Read-only relatedwork status tool -->
`vibepaper_relatedwork_status` 只读取 `relatedwork/literature.json`、`relatedwork/paper_list.bib`、`relatedwork/pdfs/`、`relatedwork/papers/`、`relatedwork/search_cache.json`、`relatedwork/queries.txt`、`relatedwork/summary.md` 和 `.agents/cross_index.json`，汇总论文数量、PDF 下载、摘要、BibTeX、cross-index 和每篇论文状态。该工具不运行 search/import/download/summarize/build-index，不写 `.agents/state.json`，不追加事件日志。

###### checker 结果记录
<!-- description: Checker result recording tool -->
当用户明确要求记录 checker 结果时，agent 必须先复述 checker、status、Critical/Major/Minor 计数、summary、evidence 和 reason，并等待确认后才由 `@vibepaper-recorder` 调用 `vibepaper_checker_record`。该工具写入 `.agents/state.json` 的 `checkers` 区域并追加 `.agents/events.jsonl`，不运行 checker、不标记单个 issue resolved、不推进 phase、不记录 artifact readiness。

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

## 本地开发

###### 一键安装到目标项目
<!-- description: dev:install script wires bun link + init in one command -->
本仓库提供 `dev:install` 脚本，把当前源码 link 到任意目标项目，并一次完成 build / link / `init --force` / 可选 Python 安装：

```bash
cd packages/opencode-plugin
bun run dev:install /path/to/target-project                    # 默认行为
bun run dev:install /path/to/target-project --with-python      # 同时 uv pip install -e <repo-root>
bun run dev:install /path/to/target-project --skip-build       # 直接用现有 dist/
bun run dev:install /path/to/target-project --skip-init        # 不刷新 .opencode/commands/
```

脚本会：

1. `bun run build`（除非 `--skip-build`）
2. 在插件目录 `bun link`
3. 在目标项目 `bun link @vibepaper/opencode`（自动补一个最小 `package.json` 以满足 bun link 要求）
4. 运行 `vibepaper-opencode init --force --root <target>`，刷新 `.opencode/commands/vibe.md`、`vibe-doctor.md`、`vibe-relatedwork.md`
5. `--with-python` 时若目标项目缺 `.venv` 就先 `uv venv`，然后 `uv pip install -e <repo-root>`，让 `<target>/.venv/bin/vibe` 可用

完成后**重启 OpenCode**，在目标项目里运行 `/vibe-doctor` 验证 `commands.vibe-relatedwork.present` 与 `vibe-cli.available` 这两条 check 都通过。

###### 日常迭代
<!-- description: dev:watch workflow for source edits -->
改完源码后只需 rebuild + 重启 OpenCode：

```bash
bun run build
# 或后台 watch
bun run dev:watch
```

`.opencode/commands/*.md` 模板没变时不必再跑 `init`。

###### 解除 link
<!-- description: dev:reset removes the link in a target project -->
```bash
bun run dev:reset /path/to/target-project
```

会从目标项目卸掉 `@vibepaper/opencode`、删除 `node_modules/@vibepaper/opencode` 符号链接，并解除全局 link。`.opencode/commands/` 下的文件和 `opencode.json` 的 plugin 条目保留，需要手动清理。

###### 升级到新版本
<!-- description: dev:install is idempotent; rerun to upgrade -->
`dev:install` 是幂等的，**升级不需要先卸载**：

```bash
cd packages/opencode-plugin
bun run dev:install /path/to/target-project
```

`init --force` 会安全覆盖带有 `<!-- VibePaper managed: ... -->` 标记的 `vibe.md` 与 `vibe-doctor.md`，新增 `vibe-relatedwork.md`；`opencode.json` 已包含 `@vibepaper/opencode` 条目时不重复添加；`bun link` 让该 specifier 解析到本地最新源码，覆盖之前的 npm 安装。重启 OpenCode 即可生效。

###### 完整卸载
<!-- description: full uninstall steps for a target project -->
若要把目标项目完全恢复到未安装状态：

```bash
# 1. 解除 link 并删除 node_modules 符号链接
cd /Users/zrzz/Coding/VibePaper-OpenCode/packages/opencode-plugin
bun run dev:reset /path/to/target-project

# 2. 删除 slash 命令和 OpenCode 配置中的 plugin 条目
cd /path/to/target-project
trash .opencode/commands/vibe.md .opencode/commands/vibe-doctor.md .opencode/commands/vibe-relatedwork.md
trash opencode.json   # 或手动编辑去掉 plugin 数组里的 "@vibepaper/opencode"

# 3. 重启 OpenCode 让其重新读取配置
```

`trash` 取代 `rm` 以便文件可恢复；若不可用可用 `rm`。Python 端的 `<target>/.venv/bin/vibe` 不属于 OpenCode 集成，保留即可。

###### Python 端前置条件
<!-- description: Python prerequisites for relatedwork tools -->
`vibe-relatedwork` 的所有写盘工具底层都调用 `vibe relatedwork ...` Python CLI。bridge 的解析顺序：

1. `<target>/.venv/bin/vibe`（首选；最快、零依赖）
2. `PATH` 中的 `uv` → `uv run --project <target> vibe ...`
3. 都没有 → 工具返回 `vibe-cli-unavailable`，`/vibe-doctor` 的 `vibe-cli.available` 检查会标红

###### Relatedwork 参数合同
<!-- description: Python CLI argument contract for relatedwork bridge -->
插件侧 relatedwork 写工具只负责生成 Python CLI 支持的参数：download 使用 `--paper-id` 限定单篇论文，未指定 `paperId` 时让 Python CLI 处理待下载论文；register-summary 使用 `--summary-path`；clean 在工具确认后以 `--yes` 非交互执行，预览时使用 `dryRun` 对应的 `--dry-run`。

`keywords` 也是 Python 写盘工具：它会通过 Python CLI 写入 `relatedwork/queries.txt`。插件不会为 `keywords` 额外追加 phase-patch 事件；其他 relatedwork 写工具会刷新 literature 计数并追加插件侧事件。

两种安装方式：

```bash
# 方式 A：dev:install 时一并装到目标项目的 .venv
bun run dev:install /path/to/target-project --with-python
# 等价于：cd <target> && uv venv（缺则建）&& uv pip install -e <repo-root>

# 方式 B：手动管理目标项目的 venv
cd /path/to/target-project
uv venv                                         # 若没有 .venv
uv pip install -e /path/to/VibePaper-OpenCode   # 把 vibepaper 装到当前 .venv
```

###### Relatedwork 最小发布验证
<!-- description: Focused relatedwork release validation -->
修改 relatedwork bridge 后，在插件目录运行：

```bash
bun test tests/relatedwork-tools.test.ts
bun run typecheck
```

这两个命令验证 TypeScript 工具生成的 `vibe relatedwork ...` 参数与当前 Python CLI 合同一致，并保证类型检查通过。

要求 `uv >= 0.4`（用于 `uv venv` 和 `uv pip install`）。bridge 不会主动激活 `.venv`，所以**不依赖** shell 的 `source .venv/bin/activate`。
