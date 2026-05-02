# @vibepaper/opencode 测试手册
<!-- description: OpenCode 插件 Dashboard 与初始化写入测试流程 -->

## 文档状态
<!-- description: 测试手册适用范围和当前基线 -->

###### 适用阶段
本文档覆盖 `feature/opencode-plugin-mvp` 分支的 Dashboard + 初始化写入阶段。测试范围包括安装、诊断、locale、Dashboard、显式确认初始化、workflow 状态/日志/阶段控制、冲突保护、本地 tarball、打包内容和回归验证。

###### 当前边界
初始化 smoke 只在用户明确确认并提供项目名称、研究领域后写入第一版初始化文件。它不会创建 `.agents/skills/` 或 `relatedwork/`，也不会自动推进阶段、记忆、文献流程或子代理编排；显式 workflow 阶段控制见后文手测步骤。

###### 最近验证基线
- `python -m pytest tests/ -q`：`305 passed in 41.82s`
- `bun test`：`114 pass`，`0 fail`
- `bun run test:cli`：`16 pass`，`0 fail`
- `bun run test:package`：`5 pass`，`0 fail`
- `npm pack --dry-run`：`32` 个 package 文件，tarball 文件名为 `vibepaper-opencode-0.1.0.tgz`

###### 更新规则
每次修改插件行为后，先更新自动化验证结果，再更新手测记录。命令名、工具名、JSON 字段和枚举保持 English；说明文字默认使用中文。

## 快速验收
<!-- description: 常用验证命令和预期结果 -->

###### 仓库级回归
在仓库根目录运行：

```bash
python -m pytest tests/ -q
```

期望全部 Python 测试通过。若失败来自 OpenCode 插件无关模块，记录失败并不要扩大本次插件修复范围。

###### 插件完整回归
在 `packages/opencode-plugin` 运行：

```bash
bun test
bun run typecheck
bun run build
bun run test:cli
bun run test:package
npm pack --dry-run
```

期望所有命令退出码为 `0`。`npm pack --dry-run` 只应列出 `dist/`、`README.md` 和 `package.json` 相关 package 文件。

###### 文档快速检查
只改文档时，在仓库根目录运行：

```bash
git diff --check -- packages/opencode-plugin/README.md packages/opencode-plugin/USAGE_TEST.zh-CN.md
```

期望无输出。该检查只验证 diff 格式，不替代行为测试。

## 自动化覆盖
<!-- description: 测试文件和行为映射 -->

###### 核心测试映射
- `i18n.test.ts`：验证 `zh-CN` 默认语言、`en-US`、环境变量和 fallback。
- `readiness.test.ts`：验证缺失、ready、冲突、无效 JSON、用户 `AGENTS.md` 和只读 hash。
- `init-preview.test.ts`：验证 `create`、`exists-user`、`conflict`、`optional` 和稳定英文枚举。
- `project-templates.test.ts`：验证第一版初始化文件集合和 Python-compatible state。
- `project-init.test.ts`：验证 apply 成功、缺参、冲突、父路径阻塞、dangling symlink 和本地化输出。
- `dashboard.test.ts`：验证中文/英文 Dashboard、坏集成优先修复、ready 项目、apply 后 ready 和 JSON block。
- `plugin.test.ts`：验证工具注册、`ToolContext` 根目录、Dashboard 只读路径和 init apply 写入路径。
- `cli.test.ts`、`doctor.test.ts`、`package-smoke.test.ts`：验证 CLI、doctor、打包 smoke 和 locale。

###### 回归重点
`/vibe` 必须先返回只读 Dashboard，不应直接写项目文件。`vibepaper_init_apply` 必须要求 `name` 和 `domain`，并在任何目标冲突、父路径阻塞或 dangling symlink 时整体中止。

## 本地包安装测试
<!-- description: 不依赖 npm 发布的本地安装流程 -->

###### 构建本地包
在 `packages/opencode-plugin` 运行：

```bash
bun run build
npm pack
```

期望生成 `vibepaper-opencode-0.1.0.tgz`。如果只需要检查打包内容，使用 `npm pack --dry-run`，避免留下 tarball 工件。

###### 创建临时项目
创建空目录作为目标项目：

```bash
tmp_project="$(mktemp -d)"
```

测试结束后可直接删除该目录。若要复现 OpenCode 行为，应在该目录启动或打开 OpenCode。

###### 安装本地 tarball
Bun 1.3.13 的 `bunx` 不能直接执行本地 tarball。测试 tarball 时，应先安装到临时项目，再运行安装后的 bin：

```bash
tarball="$(pwd)/vibepaper-opencode-0.1.0.tgz"
bun remove --cwd "$tmp_project" @vibepaper/opencode || true
rm -rf "$tmp_project/node_modules/@vibepaper" "$tmp_project/bun.lock" "$tmp_project/package-lock.json"
bun add --cwd "$tmp_project" "$tarball"
"$tmp_project/node_modules/.bin/vibepaper-opencode" init --root "$tmp_project"
```

如果不验证 tarball 安装路径，可使用本地构建 fallback：

```bash
bun dist/cli.js init --root "$tmp_project"
```

###### 安装后文件
`init` 只应写入 OpenCode 集成文件：

- `$tmp_project/opencode.json`
- `$tmp_project/.opencode/commands/vibe.md`
- `$tmp_project/.opencode/commands/vibe-doctor.md`

`init` 不应写入 `paper.md`、`storyline.md`、`writingrules.md`、`AGENTS.md`、`.agents/state.json`、`.agents/events.jsonl`、`.agents/skills/` 或 `relatedwork/`。

###### 配置内容
本地 tarball 安装应写入项目内稳定 `file://` 插件入口，例如：

```json
{
  "plugin": ["file:///tmp/project/node_modules/@vibepaper/opencode/dist/index.js"]
}
```

发布后的 npm 安装应写入包名：`"@vibepaper/opencode"`。如果项目已有 OpenCode 配置，安装器应合并插件项，而不是覆盖无关配置。

## Doctor 测试
<!-- description: 终端诊断命令验证流程 -->

###### 基础诊断
在终端运行：

```bash
bun dist/cli.js doctor --root "$tmp_project"
bun dist/cli.js doctor --root "$tmp_project" --format markdown
bun dist/cli.js doctor --root "$tmp_project" --format json
```

期望 doctor 识别 OpenCode 配置、插件注册、`/vibe` 和 `/vibe-doctor`。默认文本和 Markdown 输出为中文；JSON 字段名和状态枚举保持 English。

###### Locale 诊断
验证英文输出：

```bash
VIBEPAPER_LANG=en-US bun dist/cli.js doctor --root "$tmp_project"
bun dist/cli.js doctor --root "$tmp_project" --locale en-US
```

未知 locale 应回退到 `zh-CN`。命令名、工具名、JSON 字段和枚举不随语言变化。

###### 发布包语法
测试已发布 npm 包时，应使用 Bun 的 `-p` 语法：

```bash
bunx -p @vibepaper/opencode vibepaper-opencode doctor --root "$tmp_project"
```

不要写成 `bunx @vibepaper/opencode doctor`，因为包名和 bin 名不同。

###### 歧义配置
如果同一项目同时存在 `opencode.json` 和 `opencode.jsonc`，且未显式传入 `--config`，doctor 应失败关闭并提示选择配置文件。传入 `--config opencode.jsonc` 后应读取指定配置。

## OpenCode 手动测试
<!-- description: 真实 OpenCode 会话中的 smoke 流程 -->

###### 启动会话
在临时项目目录启动 OpenCode，或在 OpenCode 中打开该目录。安装后建议重启 OpenCode，确保插件和 slash command 被重新加载。

###### 运行诊断命令
在 OpenCode 会话中执行：

```text
/vibe-doctor
```

期望看到 doctor markdown 输出，且能指出当前插件集成状态。若工具或命令无法加载，用终端 doctor 复核配置。

###### 运行 Dashboard
在 OpenCode 会话中执行：

```text
/vibe
```

期望 agent 调用或尝试调用 `vibepaper_dashboard`。输出应包含 Header、项目就绪度、检查清单、推荐下一步、初始化预览和 JSON block。此步骤只读，`/vibe` 前后的目录 hash 应保持一致。

###### Dashboard 状态
未初始化但 OpenCode 集成健康的项目应显示 `needs-init`，并列出核心文件的 `create` 预览动作。已具备核心文件和 `.agents/state.json` 的项目应显示 `ready`。OpenCode 集成损坏时，应优先推荐修复安装，并隐藏项目初始化预览。

###### 确认初始化
在 `/vibe` 显示 `needs-init` 后，输入“确认初始化”。如果缺少项目名称或研究领域，期望 agent 先追问。提供 `name` 和 `domain` 后，agent 才应调用 `vibepaper_init_apply`。

###### 成功写入
成功 apply 后应出现以下文件：

- `paper.md`
- `storyline.md`
- `writingrules.md`
- `AGENTS.md`
- `.agents/state.json`
- `.agents/events.jsonl`

不应出现 `.agents/skills/` 或 `relatedwork/`。再次运行 `/vibe` 应显示 ready 语义，`.agents/state.json` 中的 `project.name`、`project.domain` 和 `project.created_at` 应被写入。

###### Workflow 状态检查
成功初始化后，再次运行 `/vibe`。期望 Dashboard 包含工作流区块，展示当前 phase、动态 phase 状态表和最近事件。若 `.agents/state.json` 中出现非默认 phase 名称，Dashboard 应展示实际 phase 名称，不应假设固定 6 个阶段。

###### Workflow 日志查询
询问“最近发生了什么”时，期望 agent 调用 `vibepaper_workflow_log`。输出应包含最近事件表和稳定 JSON block。损坏的 JSONL 行应被跳过并通过 warning 反映。

###### Workflow 阶段修改
要求修改阶段状态时，期望 agent 先复述目标 phase、status，并在 status 为 `skipped` 时复述 reason，然后等待确认。确认后调用 `vibepaper_workflow_set_phase`，更新 `.agents/state.json` 并向 `.agents/events.jsonl` 追加 `set_phase_status` 事件。

###### 动态 phase 回归
将 `.agents/state.json` 的 `phases` 临时改为自定义 phase，例如 `discussion_problem_framing` 和 `discussion_evidence_mapping`，并加入循环 `workflow.dependencies`。期望 status、Dashboard 和 set phase 都能工作，不要求 DAG，也不阻止写入。

###### 冲突中止
如果预先创建 `paper.md`、`AGENTS.md` 或 `.agents` 阻塞路径，再确认初始化，apply 应整体中止。期望 `changedFiles` 为空，冲突路径出现在 `conflicts`，其他缺失目标仍不存在。

###### JSON block
Dashboard JSON block 应保留稳定英文模型字段，例如 `schemaVersion`、`integration`、`readiness`、`initPreview` 和 `recommendation`。Apply JSON block 应保留 `mode`、`changedFiles`、`conflicts` 和 `errors` 等英文字段。

## 场景矩阵
<!-- description: 手动和自动化场景对照 -->

###### 必测路径
| 场景 | 触发方式 | 期望结果 |
| --- | --- | --- |
| 空项目 Dashboard | `/vibe` | `needs-init`，只读预览，目录 hash 不变 |
| 缺少参数 | “确认初始化”但缺 name/domain | agent 追问，不调用 apply |
| 成功 apply | 确认并提供 name/domain | 写入 6 个核心文件，ready |
| 用户文件冲突 | 预先创建 `paper.md` | 整体中止，`changedFiles` 为空 |
| 父路径阻塞 | 预先创建 `.agents` 文件 | 整体中止，无部分写入 |
| 损坏集成 | 删除插件配置或命令 | Dashboard 推荐修复安装 |
| 英文输出 | `--locale en-US` 或 env | 文案英文，JSON 字段仍 English |

## 根目录识别测试
<!-- description: 多层目录和配置冲突场景 -->

###### 显式 root 优先
传入 `--root <dir>` 时，CLI 应以该目录为项目根，而不是继续向上搜索 Git 或 OpenCode 配置。

###### 最近配置优先
从子目录运行时，应优先选择最近目录中的 `opencode.json`、`opencode.jsonc` 或受管 `.opencode/commands/vibe.md` 标记。同一目录内优先级为 `opencode.json`、`opencode.jsonc`、marker。

###### 损坏 marker
如果较近的 `.opencode/commands/vibe.md` 是目录或不可读文件，root 检测不应崩溃。应忽略该 marker 并继续向父目录查找有效配置。

## 验收标准
<!-- description: Dashboard + 初始化写入阶段通过条件 -->

###### 自动化验收
- 仓库级 Python 测试通过。
- 插件 TypeScript 类型检查通过。
- 插件 Bun 测试通过。
- CLI smoke 测试通过。
- package smoke 测试通过。
- `npm pack --dry-run` 不包含测试、fixture、环境文件或手动 smoke 文档。

###### 手动验收
- `init` 能写入 OpenCode 插件配置和两个 slash command。
- `/vibe-doctor` 能默认展示中文诊断信息。
- `/vibe` 能展示 readiness、检查清单、推荐下一步、初始化预览和稳定 JSON block。
- `/vibe` 在收集参数后能确认执行初始化写入。
- 冲突场景有明确错误输出，且不会部分写入。

## 故障记录模板
<!-- description: 手测失败时建议记录的信息 -->

###### 记录字段
- 操作系统、Bun 版本和 OpenCode 版本。
- 使用的安装方式：npm、tarball 或 `dist/cli.js`。
- 执行的命令、完整输出和当前工作目录。
- `opencode.json` 或 `opencode.jsonc` 的相关片段。
- `.opencode/commands/` 下实际生成的文件列表。
- `/vibe` 或 `/vibe-doctor` 的完整 markdown 输出。
- 是否能通过终端 `doctor --format json` 复现。

## 后续扩展
<!-- description: 当前阶段之后可补充的测试方向 -->

###### 发布后测试
包发布到 npm 后，应补充真实 `bunx -p @vibepaper/opencode vibepaper-opencode init` 安装测试，并确认 OpenCode 能从已发布包加载插件。

###### Workflow 深化
后续可补充 `.agents/skills/`、`relatedwork/`、阶段推进、状态迁移和更深 workflow 行为测试。第一版 `vibepaper_init_apply` 的核心文件写入已在当前阶段覆盖。
