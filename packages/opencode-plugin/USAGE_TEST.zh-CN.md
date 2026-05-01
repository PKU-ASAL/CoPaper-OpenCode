# @vibepaper/opencode 使用测试文档
<!-- description: OpenCode 插件 Dashboard 阶段的中文使用测试流程 -->

## 文档状态
<!-- description: 本文档适用范围和阶段 -->

###### 当前适用范围
本文档记录截至 `feature/opencode-plugin-mvp` 分支当前 Dashboard 阶段的使用测试流程，覆盖 `@vibepaper/opencode` 的安装、诊断、中文 Dashboard、只读 readiness、初始化预览、确认初始化写入、OpenCode slash commands、locale、打包和回归验证。

###### 当前不覆盖内容
插件当前只在用户确认初始化并提供参数后写入第一版初始化文件；不创建 `.agents/skills/` 或 `relatedwork/`，也不推进阶段、记忆或子代理编排。

## 环境要求
<!-- description: 执行测试前需要准备的工具 -->

###### 必需工具
- Bun `>=1.1.0`
- Node/npm，用于 `npm pack --dry-run`
- Python 测试环境，用于仓库级 `pytest`
- OpenCode，用于 `/vibe` 和 `/vibe-doctor` 手动 smoke 测试

###### 工作目录
插件源码位于 `packages/opencode-plugin`。以下命令默认在该目录运行；仓库级 Python 测试在仓库根目录运行。

## 自动化验证
<!-- description: 每次改动后优先运行的检查 -->

###### 仓库级回归
```bash
python -m pytest tests/ -q
```
期望结果是全部 Python 测试通过。最近一次完整验证结果为 `305 passed in 42.11s`。

###### 插件级回归
```bash
bun run typecheck
bun test
bun run build
bun run test:cli
bun run test:package
npm pack --dry-run
```
期望结果是 TypeScript 检查和构建通过，Bun 测试全部通过，dry-run tarball 只包含 `dist/`、`README.md` 和 `package.json`。

###### 最近插件验证
最近一次完整验证结果为：`bun test` 通过 `97` 项，`test:cli` 通过 `16` 项，`test:package` 通过 `5` 项，`npm pack --dry-run` 报告 `28` 个打包文件和 `vibepaper-opencode-0.1.0.tgz` 文件名。

###### 本阶段新增覆盖
- `i18n.test.ts`：验证 `zh-CN` 默认语言、`en-US`、环境变量和 fallback
- `readiness.test.ts`：验证缺失、ready、冲突、无效 JSON、用户 `AGENTS.md` 和只读 hash
- `init-preview.test.ts`：验证 `create`、`exists-user`、`conflict`、`optional` 和稳定英文枚举
- `dashboard.test.ts`：验证中文/英文 Dashboard、坏集成优先修复、ready 项目和 JSON block
- `cli.test.ts` 与 `doctor.test.ts`：验证 `--locale`、`VIBEPAPER_LANG`、doctor 文本/Markdown 和 JSON 稳定性

## 本地包测试
<!-- description: 不依赖 npm 发布的本地验证流程 -->

###### 构建本地包
```bash
bun run build
npm pack
```
期望生成 `vibepaper-opencode-0.1.0.tgz`。如果只想确认打包内容，不生成永久测试工件，可使用 `npm pack --dry-run`。

###### 创建临时项目
```bash
tmp_project="$(mktemp -d)"
```
临时目录应为空目录或普通项目目录。测试结束后可以直接删除该目录。

###### 运行初始化
Bun 1.3.13 的 `bunx` 不能直接执行本地 tarball。测试 tarball 时，应先安装到临时项目，再运行安装后的 bin：
```bash
tarball="$(pwd)/vibepaper-opencode-0.1.0.tgz"
bun remove --cwd "$tmp_project" @vibepaper/opencode || true
rm -rf "$tmp_project/node_modules/@vibepaper" "$tmp_project/bun.lock" "$tmp_project/package-lock.json"
bun add --cwd "$tmp_project" "$tarball"
"$tmp_project/node_modules/.bin/vibepaper-opencode" init --root "$tmp_project"
```
如果不需要验证 tarball 安装路径，使用确定性的本地 fallback：
```bash
bun dist/cli.js init --root "$tmp_project"
```
如果项目中已经生成过旧版 `/vibe` 或 `/vibe-doctor`，需要重新运行 `init` 刷新受管命令文件；受管文件会自动备份后覆盖。
本地 tarball 测试必须使用安装后的 `node_modules/.bin/vibepaper-opencode`，这样 `init` 才能把 OpenCode 插件入口写成项目内稳定的 `file://` 路径，真实 OpenCode 会话才能加载 `vibepaper_dashboard` 工具。

## 安装结果检查
<!-- description: 初始化后必须出现的文件和内容 -->

###### 期望生成文件
- `$tmp_project/opencode.json`
- `$tmp_project/.opencode/commands/vibe.md`
- `$tmp_project/.opencode/commands/vibe-doctor.md`

###### 期望配置内容
`opencode.json` 应包含 VibePaper 插件注册。本地 tarball 安装应写入项目内 `file://` 插件入口，例如：
```json
{
  "plugin": ["file:///tmp/project/node_modules/@vibepaper/opencode/dist/index.js"]
}
```
发布后的 npm 安装应写入包名：`"@vibepaper/opencode"`。
如果项目已有 OpenCode 配置，安装器应合并插件项，而不是覆盖无关配置。

###### 期望不生成内容
初始化 OpenCode 插件集成时只应生成 OpenCode 配置和 slash commands，不应生成 `paper.md`、`storyline.md`、`writingrules.md`、`relatedwork/`、`.agents/state.json`、`.agents/events.jsonl` 或 `AGENTS.md`。这些属于后续 VibePaper 工作流写入流程，不在当前阶段内。

## Doctor 测试
<!-- description: 诊断命令的手动验证流程 -->

###### 终端诊断
```bash
bun dist/cli.js doctor --root "$tmp_project"
bun dist/cli.js doctor --root "$tmp_project" --format markdown
bun dist/cli.js doctor --root "$tmp_project" --format json
VIBEPAPER_LANG=en-US bun dist/cli.js doctor --root "$tmp_project"
bun dist/cli.js doctor --root "$tmp_project" --locale en-US
```
如果测试已发布 npm 包，使用下面的 Bun 语法；不要写成 `bunx @vibepaper/opencode doctor`：
```bash
bunx -p @vibepaper/opencode vibepaper-opencode doctor --root "$tmp_project"
```
期望诊断能够识别 OpenCode 配置、插件注册、`/vibe` 命令和 `/vibe-doctor` 命令。默认文本和 Markdown 输出为中文，`--locale en-US` 或 `VIBEPAPER_LANG=en-US` 输出英文。JSON 输出应保持字段名和状态枚举为英文，便于自动化检查。

###### 歧义配置诊断
如果同一项目同时存在 `opencode.json` 和 `opencode.jsonc`，且未显式传入 `--config`，doctor 应失败关闭并提示选择配置文件。传入 `--config opencode.jsonc` 后应读取指定配置。

## OpenCode 手动测试
<!-- description: 在真实 OpenCode 会话中的 smoke 流程 -->

###### 启动 OpenCode
在临时项目目录启动 OpenCode，或在 OpenCode 中打开该目录。初始化完成后建议重启 OpenCode，确保插件和 slash command 被重新加载。

###### 运行诊断命令
在 OpenCode 会话中执行：
```text
/vibe-doctor
```
期望看到 doctor markdown 输出，且能指出当前插件集成状态。

###### 运行仪表盘命令
在 OpenCode 会话中执行：
```text
/vibe
```
期望 agent 调用或尝试调用 `vibepaper_dashboard` 工具，并返回中文 Dashboard，固定包含 Header、项目就绪度、检查清单、推荐下一步、初始化预览和 JSON block。预览可列出 `paper.md`、`storyline.md`、`writingrules.md`、`.agents/state.json`、`.agents/events.jsonl` 和 `AGENTS.md`，但 `/vibe` 前后的目录 hash 应保持一致。若工具调用失败，应记录 OpenCode 报错并用终端 doctor 复核。

###### Dashboard 状态检查
未初始化但 OpenCode 集成健康的项目应显示 `needs-init` 语义、缺失文件和 `create` 预览动作；已具备核心文件和 `.agents/state.json` 的项目应显示 `ready` 语义。若 OpenCode 集成损坏，Dashboard 应优先推荐修复安装，并隐藏项目初始化预览。

###### 确认初始化写入
在 `/vibe` 显示 `needs-init` 后，输入“确认初始化”。如果缺少项目名称或研究领域，期望 agent 先追问。提供 `name` 和 `domain` 后，期望 agent 调用 `vibepaper_init_apply`，并返回写入摘要。

###### 初始化写入结果
成功写入后应出现 `paper.md`、`storyline.md`、`writingrules.md`、`AGENTS.md`、`.agents/state.json` 和 `.agents/events.jsonl`。不应出现 `.agents/skills/` 或 `relatedwork/`。再次运行 `/vibe` 应显示 ready 语义。

###### 初始化冲突测试
如果预先创建 `paper.md` 等任一目标文件，再确认初始化，期望 apply 整体中止，`changedFiles` 为空，其他缺失目标仍不存在。

###### JSON block 检查
Dashboard 末尾的 JSON block 应保留稳定英文模型字段，例如 `schemaVersion`、`integration`、`readiness`、`initPreview`、`recommendation`。状态、动作和原因枚举应保持英文，例如 `ready`、`missing`、`conflict`、`create`、`exists-user`、`future-optional`。

## 根目录识别测试
<!-- description: 多层目录和配置冲突的关键场景 -->

###### 显式 root 优先
传入 `--root <dir>` 时，CLI 应以该目录为项目根，而不是继续向上搜索 Git 或 OpenCode 配置。

###### 最近配置优先
从子目录运行时，应优先选择最近目录中的 `opencode.json`、`opencode.jsonc` 或受管 `.opencode/commands/vibe.md` 标记；同一目录内优先级为 `opencode.json`、`opencode.jsonc`、marker。

###### 损坏 marker 处理
如果较近的 `.opencode/commands/vibe.md` 是目录或不可读文件，root 检测不应崩溃，应忽略该 marker 并继续向父目录查找有效配置。

## 验收标准
<!-- description: 当前 Dashboard 阶段判定通过的条件 -->

###### 自动化验收
- 仓库级 Python 测试通过
- 插件 TypeScript 类型检查通过
- 插件 Bun 测试通过
- CLI smoke 测试通过
- package smoke 测试通过
- `npm pack --dry-run` 不包含测试、fixture、环境文件或手动 smoke 文档

###### 手动验收
- `init` 能写入 OpenCode 插件配置和两个 slash command
- `/vibe-doctor` 能默认展示中文诊断信息，并可通过 `--locale en-US` 或 `VIBEPAPER_LANG=en-US` 获得英文输出
- `/vibe` 能展示 readiness、检查清单、推荐下一步、初始化预览和稳定 JSON block，并在收集参数后确认执行初始化写入
- 失败时有明确 doctor 输出或错误信息可记录

## 故障记录模板
<!-- description: 手测失败时建议记录的信息 -->

###### 记录字段
- 操作系统和 Bun 版本
- OpenCode 版本
- 使用的安装方式：npm、tarball 或 `dist/cli.js`
- 执行的命令和完整输出
- `opencode.json` 或 `opencode.jsonc` 的相关片段
- `.opencode/commands/` 下实际生成的文件列表
- 是否能通过终端 `doctor --format json` 复现

## 后续扩展
<!-- description: Dashboard 阶段之后可补充的测试方向 -->

###### 发布后测试
包发布到 npm 后，应补充真实 `bunx -p @vibepaper/opencode vibepaper-opencode init` 安装测试，并确认 OpenCode 能从已发布包加载插件。由于包名和 bin 名不同，Bun 需要通过 `-p` 指定包名，再运行 `vibepaper-opencode`。

###### 工作流集成测试
后续如果插件开始实际初始化 VibePaper 工作流文件，再新增 `paper.md`、`storyline.md`、`writingrules.md`、`relatedwork/`、`.agents/state.json`、`.agents/events.jsonl` 和阶段状态相关测试。
