# Copaper-你的论文助手

## 使用前须知

###### 工具定位
CoPaper 只能用于辅助完成论文写作、项目管理和资料整理，不能替代作者的学术判断、实验验证或最终责任。

###### 学术诚信
所有实验数据、图表、指标、案例和结论都必须来自真实实验或可核查来源。不得使用 CoPaper 抄袭、伪造数据、编造引用、夸大贡献，或进行任何其他学术不端行为。

###### 分步生成
由于目前模型和项目能力仍有局限，建议按章节、按小节、按段落逐步生成和修改论文，不要一次性要求生成整篇论文。一次处理过多内容时，模型更容易遗漏约束、混淆上下文或产生质量不稳定的结果。

###### 人工核查
所有由 CoPaper 或模型生成的内容都可能包含幻觉、不准确表述或未经验证的推断。提交、传播或用于正式论文前，作者必须逐条人工核查事实、数据、引用、实验设置、结论和文字原创性。

## CoPaper OpenCode 插件安装

###### 从本地 packages 安装
在仓库根目录进入插件包并安装依赖、构建：

```bash
cd packages/opencode-plugin
bun install
bun run build
```

然后把本地插件安装到目标 CoPaper 项目：

```bash
bun run dev:install <target-project>
```

其中 `<target-project>` 是需要启用插件的项目目录。安装完成后重启 OpenCode，并在目标项目中运行：

```text
/copaper-doctor
/copaper
```

###### 从 npm 安装
如果使用已发布版本，可在目标项目根目录运行：

```bash
bunx -p @copaper/opencode copaper-opencode init
```

Bun 需要 `-p`，因为包名是 `@copaper/opencode`，命令名是 `copaper-opencode`。

## 插件能力总览

###### OpenCode Tools
插件目前注册了 23 个 `copaper_*` 工具，主要分为只读检查、初始化、导入提取、relatedwork、状态记录和 workflow 管理。

| 工具 | 作用 |
|---|---|
| `copaper_dashboard` | 显示项目 readiness、核心文件状态和初始化预览；只读。 |
| `copaper_init_apply` | 在用户明确确认后初始化项目核心文件。 |
| `copaper_artifact_status` | 检查 `storyline.md`、`paper.md`、relatedwork、checker 等工件就绪度；只读。 |
| `copaper_artifact_record` | 在确认后记录工件 readiness 到状态文件和事件日志。 |
| `copaper_paper_structure_status` | 扫描 `paper.md` 结构完成度、Level 5 写作目标和结构问题；只读。 |
| `copaper_storyline_structure_status` | 扫描 `storyline.md` 章节完成度、TODO 和下一步目标；只读。 |
| `copaper_pdf_extract` | 从用户指定的项目内 PDF 提取文本；只读。 |
| `copaper_ppt_extract` | 从用户指定的项目内 PPTX 提取 slide 文本和可选 notes；只读。 |
| `copaper_checker_status` | 汇总 checker 状态、严重程度计数、stale 信号和预检证据；只读。 |
| `copaper_checker_record` | 在确认后记录一次 checker 结果摘要。 |
| `copaper_relatedwork_status` | 检查 relatedwork catalog、BibTeX、PDF、summary 和 cross-index 状态；只读。 |
| `copaper_relatedwork_keywords` | 基于 storyline 或指定文档提取检索关键词，写入 `relatedwork/queries.txt`。 |
| `copaper_relatedwork_search` | 调用 Semantic Scholar / arXiv 搜索相关工作，写入搜索缓存。 |
| `copaper_relatedwork_import` | 将搜索缓存导入 `relatedwork/literature.json`。 |
| `copaper_relatedwork_sync_bib` | 根据 literature catalog 同步 `relatedwork/paper_list.bib`。 |
| `copaper_relatedwork_download` | 下载相关工作 PDF 到 relatedwork PDF 目录。 |
| `copaper_relatedwork_summarize` | 调用 CLI/LLM 为 PDF 生成论文摘要。 |
| `copaper_relatedwork_register_summary` | 把已有摘要文件登记到 literature catalog。 |
| `copaper_relatedwork_build_index` | 从相关工作摘要构建 `.agents/cross_index.json`。 |
| `copaper_relatedwork_clean` | 清理 relatedwork 中的陈旧条目、孤立 PDF 或摘要。 |
| `copaper_workflow_status` | 显示当前 phase、各 phase 状态和下一步建议；只读。 |
| `copaper_workflow_log` | 查询近期 workflow event log，可按 phase/operator 过滤；只读。 |
| `copaper_workflow_set_phase` | 在确认后修改 workflow phase 状态并写入事件日志。 |

###### CoPaper Subagents
插件会向 OpenCode 注入 6 个内置 subagents，用权限边界把协调、写作、审稿、记录和文献流程分开。

| Subagent | 作用 |
|---|---|
| `@copaper-coordinator` | 只读协调者；查看项目状态、澄清任务范围、推荐下一步或应交给哪个角色。 |
| `@copaper-storyline` | 负责 `storyline.md` 的研究主线整理和结构维护，只在确认后修改 storyline。 |
| `@copaper-writer` | 负责按 CoPaper 结构撰写或修改 `paper.md`，不改 storyline 或状态文件。 |
| `@copaper-reviewer` | 只读审稿角色；解释 checker 结果、严重程度和潜在审稿风险，不直接改论文。 |
| `@copaper-recorder` | 负责记录 artifact readiness 或 checker summary 等状态事实，不改论文内容。 |
| `@copaper-literature` | 负责 relatedwork 流程，调用检索、导入、下载、摘要和 cross-index 工具。 |

###### Project Skills
项目当前包含 28 个 skills，位于 `.agents/skills/`。它们是给 agent 的工作流说明，用来约束什么时候读哪些文件、如何修改、何时必须等待确认。

| Skill | 作用 |
|---|---|
| `storyline-helper` | 交互式构建和改进 `storyline.md`，只润色用户提供的研究内容，不凭空生成主线。 |
| `socratic-discussion` | 通过苏格拉底式提问审视 insight、claim、方法和证据，覆盖 7 类 checker 维度。 |
| `writing-orchestrator` | 扫描 `paper.md` 完成度，推荐写作顺序，并路由到细粒度、严格或快速写作模式。 |
| `markdown-helper` | 按 CoPaper 结构帮助撰写和改进 `paper.md` 内容。 |
| `state-machine-markdown-helper` | 用严格状态机和上下文隔离逐段写作，减少幻觉和跨段污染。 |
| `mad-writer` | 自动执行 write-check-fix 循环，可结合 relatedwork 和 placeholder data 迭代改稿。 |
| `markdown-review` | 对 markdown 论文内容进行结构化审阅和改进建议。 |
| `review-revise` | 基于 7-checker 输出进行多轮确认式修改，每个问题单独确认后再改。 |
| `problem-checker` | 检查问题定义是否清楚、重要性和实践性证据是否充分。 |
| `novelty-checker` | 检查核心 insight 的新颖性，以及与已有工作的差异是否讲清楚。 |
| `technical-depth-checker` | 检查设计是否有足够技术深度、非平凡挑战和具体解决方案。 |
| `logic-checker` | 检查 claim 与 evidence 是否匹配，是否有矛盾或论证断裂。 |
| `clarity-checker` | 检查术语定义、描述清晰度、指代和可读性问题。 |
| `evaluation-protocol-checker` | 检查 RQ、实验设计、设计决策验证和 validity threats 是否充分。 |
| `data-checker` | 检查 placeholder/bogus data，并验证表格和图是否有可复现实验脚本。 |
| `submission-precheck` | 投稿前综合检查格式、引用、图表、字数、完整性、数据真实性和质量。 |
| `experiment-analyzer` | 分析实验代码、实验结果或实验协议，并帮助映射到研究问题。 |
| `bogus-data-helper` | 生成明确标记为 synthetic 的占位实验表格、图和指标，提醒必须替换为真实结果。 |
| `relatedwork-finder` | 根据 `storyline.md` 或 `paper.md` 查找、导入和下载相关工作。 |
| `relatedwork-summarizer` | 调用 relatedwork CLI 总结 PDF、构建 cross-index，并生成覆盖报告。 |
| `pdf2paper` | 从已有 PDF 草稿提取内容并映射到 `paper.md` 框架，不发明新内容。 |
| `ppt2storyline` | 从 PPT/PPTX 提取 slide 信息并映射到 `storyline.md`。 |
| `latex2markdown` | 将 LaTeX 论文内容迁移进 CoPaper 的 `paper.md` 结构。 |
| `markdown2latex` | 将 `paper.md` 转为高质量 LaTeX，可适配会议模板。 |
| `latex-final-writer` | 在 `paper.md` 完成后，基于会议/期刊 LaTeX 模板创建 `writing_plan.md`、初始化 `tex/` 结构，并逐节写作终稿。 |
| `humanizer` | 去除 AI 写作痕迹，让文本更自然，同时保留原意和语气。 |
| `human-comment-helper` | 帮教师或导师把人工反馈整理成结构化 comments，并区分 AI 示例与真人意见。 |
| `copaper-manage` | 指导 agent 使用 OpenCode 插件工具管理初始化、workflow、event log 和 readiness 状态。 |

###### Phase 管理入口
OpenCode 里直接管理 phase 的入口是 `copaper-manage` skill。它会先用 `copaper_workflow_status` 读取当前阶段，再在用户明确确认后调用 `copaper_workflow_set_phase` 写入 `.agents/state.json` 并追加 `.agents/events.jsonl`。其它 skill 也会在自身流程结束时使用同一个 tool，例如 `storyline-helper` 更新 `storyline`，`experiment-analyzer` 更新或跳过 `experiments`，`writing-orchestrator` 更新 `writing`。

## 整体使用流程说明书

###### 使用方式选择
CoPaper 可以用两种方式操作：CLI 适合脚本化、批处理和 Git 阶段管理；OpenCode 插件适合在 IDE 中通过 `/copaper`、subagents 和确认式工具完成日常写作。推荐混合使用：项目初始化、relatedwork 批处理和 Git 操作用 CLI；状态查看、主线写作、论文写作、审阅和 readiness 记录用插件。

###### Step 0：准备环境
目标项目至少需要 Python、Git、Bun 和 OpenCode。Python 端提供 `copaper` CLI；Bun 端安装 `@copaper/opencode` 插件；OpenCode 端负责 slash commands、tools 和 subagents。relatedwork 的搜索、关键词和摘要功能还需要在目标项目配置 `.env`，但不要把密钥提交进 Git。

```bash
# 在 CoPaper 仓库中安装 Python CLI
pip install -e .[dev]

# 在目标项目中安装 OpenCode 插件
bunx -p @copaper/opencode copaper-opencode init
```

本地开发版本可使用前文的 `bun run dev:install <target-project>`。安装后重启 OpenCode，并在目标项目运行 `/copaper-doctor` 和 `/copaper`。

###### Git 辅助管理
Git 不是单独写作阶段，而是贯穿流程的辅助管理手段。在 Git 仓库中可用 `copaper commit` 做阶段化提交，`diff` 比较阶段提交差异，`rollback` soft reset 到某阶段最后一次提交并重置阶段状态。`report` 不要求 Git 存在；但 `commit`、`rollback`、`diff` 必须在 Git 仓库中运行。

```bash
copaper --root <target-project> commit --phase storyline -m "完成研究主线初稿"
copaper --root <target-project> diff storyline literature
copaper --root <target-project> rollback storyline
```

回滚会影响工作区状态，使用前先确认当前改动是否需要保存。

###### Readiness 与 Phase 管理
Readiness 和 phase 更新也不是单独写作阶段，而是贯穿流程的状态管理动作。CoPaper 的状态更新应通过 CLI 或插件工具完成，不手改 `.agents/state.json`。当某个工件达到可用状态时，先查看证据，再显式确认记录 readiness；当一个阶段完成、跳过或回退时，再确认修改 phase。

```text
/copaper
请检查 artifact readiness
确认记录 paper.md 为 partial，confidence 为 medium，原因是 Introduction 已完成但 Evaluation 未写
确认把 writing 阶段标记为 in_progress
```

CLI 等价操作：

```bash
copaper --root <target-project> set-phase writing --status in_progress
copaper --root <target-project> log --last 10
copaper --root <target-project> report --output report.md
```

在 OpenCode 中，推荐触发 `copaper-manage` 或直接说明“把某个 phase 标记为某状态”。agent 应先复述 phase、status 和 reason，并等待确认后调用 `copaper_workflow_set_phase`；这比让 agent 手改状态文件更安全。

###### Step 1：初始化论文项目
新项目先创建 CoPaper 核心工件。CLI 会复制 `storyline.md`、`paper.md`、`writingrules.md`、`AGENTS.md` 和 `.agents/skills/`；插件初始化流程会先展示预览，并在用户明确确认后写入核心文件。

```bash
copaper --root <target-project> init --name "<project-name>" --domain "<research-domain>"
copaper --root <target-project> status
```

在 OpenCode 中可以打开 `/copaper` 查看 Dashboard。如果 Dashboard 显示项目未 ready，按提示确认初始化；如果已有文件冲突，先人工决定保留、迁移或换目录，避免覆盖已有研究材料。

初始化时也可以从已有材料导入项目，而不是从空模板开始。`ppt2storyline` 可以把组会 PPT/PPTX 转成 `storyline.md`；`pdf2paper` 可以把已有 PDF 初稿映射到 `paper.md`；`latex2markdown` 可以把已有 LaTeX 论文迁移到 markdown 框架。导入时仍要遵守“不发明新 claim”的原则，只做忠实映射和轻量润色。

```text
将这个 PPTX 提取为 storyline.md，但不要新增 slides 中没有的 claim
将这个 PDF 初稿导入到 paper.md，并保留原有论点边界
将这份 LaTeX 论文迁移到 CoPaper 的 paper.md 结构
```

如果导入生成的是 `storyline.md`，可以跳过 Step 2 的空白主线填写，检查并确认主线后直接进入 Step 3 相关工作流程。如果导入生成的是完整或接近完整的 `paper.md`，可以先补齐必要的 storyline/relatedwork 证据，然后直接进入 Step 7 审阅、修订和 checker 记录流程。

###### Step 2：填写研究主线
优先完成 `storyline.md`，它是后续文献检索、讨论、实验和写作的最高约束。推荐调用 `@copaper-storyline` 或触发 `storyline-helper`，按章节提供你的问题、重要性、insight、设计思路和评测计划。这个阶段的原则是：agent 可以润色和组织，但不替你发明研究内容。

```text
@copaper-storyline 帮我填写 storyline.md 的问题描述部分
```

完成后检查结构状态，并在确认后记录阶段进度：

```text
/copaper
请检查 storyline 结构完成度
确认把 storyline 阶段标记为 complete，原因是主线初稿已完成
```

###### Step 3：检索和整理相关工作
literature 阶段把 `storyline.md` 或 `paper.md` 转成检索关键词，搜索论文，导入元数据，同步 BibTeX，下载 PDF，生成单篇摘要，并构建 `.agents/cross_index.json`。插件中可交给 `@copaper-literature`；CLI 中可按 7 步流水线执行。

```bash
copaper --root <target-project> relatedwork keywords --count 6
copaper --root <target-project> relatedwork search --queries-file relatedwork/queries.txt --limit 5
copaper --root <target-project> relatedwork import --input relatedwork/search_cache.json
copaper --root <target-project> relatedwork sync-bib
copaper --root <target-project> relatedwork download
copaper --root <target-project> relatedwork summarize --concurrency 4
copaper --root <target-project> relatedwork build-index
copaper --root <target-project> relatedwork status
```

关键词和摘要依赖 OpenAI 兼容 LLM；搜索依赖 Semantic Scholar / arXiv。建议先用小 `limit` smoke test，确认 `.env`、网络和 `copaper` bridge 都正常，再扩大检索规模。

###### Step 4：讨论并收敛论证
discussion 阶段用 `socratic-discussion` 压测研究问题、novelty、技术深度、逻辑链、清晰度、评估协议和数据证据。这个阶段不是写论文，而是把可能被审稿人质疑的点提前暴露出来，并反向修正 `storyline.md` 或实验计划。

```text
帮我做一次 socratic discussion，重点检查 novelty 和 technical depth
```

如果讨论发现主线缺口，回到 `storyline-helper` 修改；如果发现缺实验或证据，进入实验分析；如果只是表达问题，留到 writing/review 阶段处理。

###### Step 5：准备实验或说明跳过
experiments 阶段可以用 `experiment-analyzer` 理解实验代码、分析结果、审查实验协议，或在理论/系统设计类论文中明确跳过并记录原因。不要把 placeholder data 当真实结果；如需占位，必须使用 `bogus-data-helper` 并明确标记为 synthetic。

```text
帮我分析 experiments/ 中的结果，并映射到 paper.md 的 RQ
```

跳过实验时用完整 phase 名：

```bash
copaper --root <target-project> skip experiments --reason "<reason>"
```

###### Step 6：撰写 paper.md
writing 阶段围绕 `paper.md` 展开。推荐先用 `writing-orchestrator` 扫描完成度和推荐顺序，再选择写作模式：`markdown-helper` 适合稳妥逐节写，`state-machine-markdown-helper` 适合高保真逐段写，`mad-writer` 适合快速生成和迭代。插件里可使用 `@copaper-writer`，它只应修改 `paper.md`。

```text
@copaper-writer 请根据 storyline.md 和 cross_index，先写 Introduction 的第一个 Level 5 section
```

写作时必须遵守 CoPaper 结构：Level 1-5 只做结构标题，正文只能写在 Level 6 下；Level 6 标题不超过 50 字符，正文段落不超过 500 字符。涉及文献时优先读 `.agents/cross_index.json`，再定向读取 `relatedwork/papers/*.md`。

###### Step 7：审阅、修订和记录 checker
写完一个章节后运行审阅流程。`@copaper-reviewer` 和各类 checker 负责发现问题，`review-revise` 负责按 Critical、Major、Minor 顺序逐项确认和修复。需要持久记录 checker 结果时，让 `@copaper-recorder` 在复述 checker、status、计数、summary、evidence 和 reason 后调用记录工具。

```text
@copaper-reviewer 请检查当前 paper.md 的 problem、novelty 和 logic 风险
```

最终投稿前运行 `submission-precheck`，它会检查格式、引用、图表、字数、完整性、数据真实性和整体质量，并生成预检报告。

###### Step 8：生成 LaTeX 终稿
已有材料的导入入口放在 Step 1 初始化阶段。论文成形并通过必要审阅后，最后一步使用 `latex-final-writer` 生成 LaTeX 终稿。该 skill 会基于已完成的 `paper.md`、`storyline.md`、相关工作摘要、实验材料和用户提供的会议/期刊模板，创建或更新 `writing_plan.md`，初始化 `tex/` 结构，并逐节写作可投稿的 LaTeX 草稿。

```text
我已经完成 paper.md，请基于 tex/ 模板使用 latex-final-writer 生成 LaTeX 终稿
```

生成终稿时不要凭空新增实验、数字、引用或 claim。完成后应编译 LaTeX，并人工核对引用、图表、公式、页数、匿名要求、overfull boxes 和未定义引用。

###### 推荐完整路径
最稳妥的完整路径是：安装插件和 CLI → 初始化项目或导入已有材料 → 完成/确认 `storyline.md` → 跑 relatedwork → 做 Socratic discussion → 准备实验或记录跳过原因 → 写/导入 `paper.md` → 逐节 checker/review-revise → submission precheck → 使用 `latex-final-writer` 生成 LaTeX 终稿。PPT 导入主线后可从 Step 3 继续；已有论文导入 `paper.md` 后可从 Step 7 继续。每个阶段都可以重入；如果后面发现前面有缺口，回到对应 skill 修正即可。

```text
初始化 → 主线 → 文献 → 讨论 → 实验/跳过 → 写作 → 审阅修订 → 预检 → LaTeX 终稿
```

###### 常见注意事项
`--root` 是 CLI 全局选项，必须放在子命令前。phase 名称必须使用 `storyline`、`literature`、`discussion`、`experiments`、`writing`、`latex_review`。插件中只读工具不会写文件；写盘工具通常要求先复述参数并等待明确确认。`.env` 存放密钥，不要提交。不要直接修改 `.agents/state.json` 或 `.agents/events.jsonl`，除非你是在调试底层实现。
