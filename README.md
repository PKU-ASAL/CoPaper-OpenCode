# Copaper - 你的论文助手

<p align="right">
  <a href="README.en.md">English</a> | <strong>中文</strong>
</p>

完整文档：<https://pku-asal.github.io/CoPaper-OpenCode/>

## 中文快速指南

CoPaper 是给研究者用的论文写作工作流工具。它不会替你“想出一篇论文”，而是把写作过程拆开：先理清 research storyline，再补 related work，接着写 `paper.md`，最后再进入 LaTeX 草稿。

它适合那种材料已经有一些、但容易散在 PPT、PDF、实验记录、草稿和对话里的项目。CoPaper 做的事比较朴素：帮你把这些材料放到一个可追踪的流程里。

### 使用前须知

###### 工具定位
CoPaper 只是辅助工具。论文是否成立，实验是否可信，结论是否能写，最后都要由作者负责。

###### 学术诚信
实验数据、图表、指标、案例和结论必须来自真实实验或可核查来源。不要用 CoPaper 抄袭、编数据、编引用，或者把贡献写得比实际更大。

###### 分步生成
模型现在还不适合一口气处理整篇论文。更稳的做法是按章节、小节、段落推进。一次塞太多内容，模型更容易漏约束、串上下文，写出来也会忽好忽坏。

###### 人工核查
CoPaper 或模型生成的内容都可能有幻觉、不准确表述或未经验证的推断。正式使用前，请逐条检查事实、数据、引用、实验设置、结论和文字原创性。

### 适合谁

- 正在用 OpenCode / Oh-My-OpenCode 写论文的研究者
- 想把论文拆成 storyline、literature、discussion、experiments、writing、latex_review 等阶段来推进的人
- 需要记录阶段状态、artifact readiness、checker 结果和 related-work 进度的人
- 已经有 PPT、PDF 初稿或 LaTeX 草稿，想迁移到 `storyline.md` / `paper.md` 工作流的人

### 核心能力

- `copaper` CLI：初始化项目、查看状态、更新 phase、记录日志、生成报告、管理 relatedwork
- OpenCode 插件：提供 `/copaper`、`/copaper-doctor`、`/copaper-relatedwork` 和 `copaper_*` 工具
- Subagents：区分 coordinator、storyline、writer、reviewer、recorder、literature 等角色
- Skills：覆盖 storyline 构建、相关工作、苏格拉底讨论、实验分析、写作、审阅、LaTeX 终稿等流程
- 状态文件：用 `.agents/state.json` 和 `.agents/events.jsonl` 保存可审计的工作流状态

### 快速安装

安装 Python CLI：

```bash
pip install -e .[dev]
```

验证：

```bash
copaper --help
python -m copaper --help
```

安装 OpenCode 插件发布包：

```bash
bunx -p @copaper/opencode copaper-opencode init
```

使用本仓库本地开发版本：

```bash
cd packages/opencode-plugin
bun install
bun run build
bun run dev:install <target-project>
```

安装后重启 OpenCode，并在目标项目中运行：

```text
/copaper-doctor
/copaper
```

### 最小使用流程

```bash
# 1. 初始化论文项目
copaper --root <project-dir> init --name "My Paper" --domain "software engineering"

# 2. 查看当前状态
copaper --root <project-dir> status

# 3. 进入某个阶段
copaper --root <project-dir> set-phase storyline --status in_progress

# 4. 完成阶段后更新状态
copaper --root <project-dir> set-phase storyline --status complete

# 5. 查看最近事件
copaper --root <project-dir> log --last 10
```

在 OpenCode 中，推荐从 `/copaper` 开始查看 Dashboard，再根据任务交给对应 subagent 或 skill。

### 推荐写作路径

```text
初始化项目
→ 完成 storyline.md
→ 检索和整理 relatedwork
→ 做 Socratic discussion
→ 准备实验或记录跳过原因
→ 按 section 写 paper.md
→ 逐节 checker / review-revise
→ submission precheck
→ 生成 LaTeX 终稿
```

每个阶段都可以重入。后续发现前面材料不足时，回到对应阶段修正即可。

### 文档

完整用户手册请看 GitHub Pages：

```text
https://pku-asal.github.io/CoPaper-OpenCode/
```

仓库内文档入口：

- 中文用户手册：[docs/index.md](docs/index.md)
- English guide：[docs/en.md](docs/en.md)
- 完整参考手册：[docs/full-manual.md](docs/full-manual.md)
- OpenCode 插件文档：[packages/opencode-plugin/README.md](packages/opencode-plugin/README.md)
- 项目架构地图：[codemap.md](codemap.md)

### 开发与测试

Python 测试：

```bash
.venv/bin/pytest
```

OpenCode 插件测试：

```bash
cd packages/opencode-plugin
bun run typecheck
bun test
bun run build
```

文档本地预览：

```bash
pip install -r docs/requirements.txt
mkdocs serve
```

## License

MIT
