# CoPaper 工作流数据流分析

## 核心结论

CoPaper 当前有两套需要区分的结构：

1. **阶段结构（phase model）**：`storyline → literature → discussion → experiments → writing → latex_review`
2. **工件结构（artifact model）**：`storyline.md`、`paper.md`、`relatedwork/`（含 `literature.json` / `paper_list.bib` / `pdfs/` / `papers/`）、`.agents/state.json`、`.agents/events.jsonl`

`copaper/constants.py` 中的 `PHASE_DEPENDENCIES` 只表达推荐正向顺序，不足以表达当前技能层面已经存在的“跳过、重入、补跑、逆向提炼”等真实工作流。

## 核心工件

| 工件 | 角色 | 谁主要生产它 | 谁主要消费它 |
|---|---|---|---|
| `storyline.md` | 研究问题、insight、设计与评测意图的高层叙事 | `storyline-helper`、用户 | `relatedwork-finder`、`socratic-discussion`、`experiment-analyzer`、`markdown-helper`、`writing-orchestrator` |
| `paper.md` | 正式论文框架与段落级内容 | `markdown-helper`、`mad-writer`、`latex2markdown`、用户 | `writing-orchestrator`、`markdown-review`、7 checkers、`review-revise`、`submission-precheck`、`markdown2latex` |
| `relatedwork/literature.json` / `paper_list.bib` / `relatedwork/papers/*.md` / `relatedwork/summary.md` | 文献元数据、BibTeX、摘要与归纳 | `relatedwork-finder` + `copaper relatedwork` | `markdown-helper`、`markdown-review`、`review-revise`、`mad-writer` |
| `.agents/state.json` | 状态、checker 结果、技能中间状态 | `copaper init`、部分 skills | `copaper status`、`writing-orchestrator`、`review-revise`、`socratic-discussion`、`experiment-analyzer` |
| `.agents/events.jsonl` | CLI 操作日志 | `copaper` CLI | `copaper log`、`copaper report` |

## 哪些步骤 / skill 只需要 `storyline.md`

| Skill / 步骤 | 最小输入 | 输出 | 备注 |
|---|---|---|---|
| `storyline-helper` | `storyline.md`（模板 + 用户输入） | `storyline.md` | 现在也支持从 `paper.md` 反向提炼，但其标准模式仍然是 storyline-first |
| `relatedwork-finder`（主路径） | `storyline.md` | `relatedwork/`、`paper_list.bib`、交叉索引 | 这是其 primary path |

## 哪些步骤 / skill 需要 `paper.md`

| Skill / 步骤 | 最小输入 | 输出 | 备注 |
|---|---|---|---|
| `writing-orchestrator` | `paper.md` | 写作计划 / 调度结果 | 没有 `paper.md` 无法扫描结构 |
| `markdown-helper` | `paper.md` + `storyline.md` | `paper.md` | 实际写作时二者都重要，但目标文件是 `paper.md` |
| `mad-writer` | `paper.md` | `paper.md` | 迭代写作与自动修复都围绕 paper 进行 |
| `markdown-review` | `paper.md` | checker 评论 / 报告 | 七个 checker 都以 `paper.md` 为主输入 |
| `review-revise` | `paper.md` + checker state | `paper.md` | 修订对象是 `paper.md` |
| `submission-precheck` | `paper.md` | `.agents/precheck_report.md` | 投稿前检查完全围绕 paper |
| `markdown2latex` | `paper.md` | LaTeX | 导出路径 |
| `latex2markdown` | LaTeX + `paper.md` 模板 | `paper.md` | 导入路径 |

## 哪些步骤 / skill 同时使用 `storyline.md` 与 `paper.md`

| Skill / 步骤 | 输入 | 输出 | 作用 |
|---|---|---|---|
| `socratic-discussion` | `storyline.md` + `paper.md` + checker results | 讨论记录、建议 | 用 storyline 理解高层意图，用 paper 检查具体表述 |
| `experiment-analyzer` | `storyline.md` + `paper.md` + 实验代码/数据 | 分析报告、状态更新 | 用 storyline/paper 映射 RQ 与实验 |
| `review-revise` | `paper.md` + `storyline.md` + checker state | 修订后的 `paper.md` | `storyline.md` 用于保证修订不偏题 |
| `markdown-helper` | `storyline.md` + `paper.md` | `paper.md` | storyline 提供 narrative，paper 提供结构和上下文 |

## 明确存在的逆向 / 回流路径

当前实现里，已经存在或应该明确承认的逆向路径包括：

1. **`paper.md → storyline.md`**
   - 现在由 `storyline-helper` 的 reverse extraction mode 支持
   - 用途：已有较完整论文草稿时，反向补齐研究主线

2. **`paper.md → relatedwork-finder`**
   - `relatedwork-finder` 已明确把 `paper.md` 作为 fallback source
   - 用途：storyline 缺失时，直接根据 paper 反查相关工作

3. **`LaTeX → paper.md`**
   - `latex2markdown` 已支持
   - 用途：已有旧论文或模板项目时导入 CoPaper 结构

4. **`checker results → paper.md`**
   - `review-revise` 已支持多轮修订
   - 用途：paper 写作完成后多次回退修复

## 每个步骤都可以跳过或重复执行吗？

### 跳过

从 CLI 行为看，答案是 **可以**。

- `copaper skip <phase>` 对所有有效 phase 名称都可执行
- 当前工具层没有对 `storyline` / `writing` 设置硬限制
- 因此“是否建议跳过”和“工具层是否允许跳过”是两回事

### 重复执行 / 重入

从 skill 设计看，答案也是 **可以，但表达不够清晰**。

- `relatedwork-finder` 可以在 gap analysis 后再次检索
- `socratic-discussion` 可以按未覆盖维度反复继续
- `experiment-analyzer` 可以在不同 mode 间多次进入
- `writing-orchestrator` / `markdown-helper` / `mad-writer` 本身就是循环式工作流
- `markdown-review` / `review-revise` 天然支持多轮迭代
- `copaper rollback <phase>` 提供 Git 维度的阶段性回退

## 当前结构的其它问题

### 1. 阶段模型过于线性，无法表达真实数据流

`PHASE_DEPENDENCIES` 只表达单向依赖，但真实工作流至少是一个带回边的图：

- `paper.md` 可以反向补 `storyline.md`
- `paper.md` 可以反向驱动 literature
- checker 可以把工作流从 writing 拉回到 discussion / experiments 的思考层

### 2. 缺少“工件就绪度”状态

`.agents/state.json` 主要记录 phase status，而不是关键工件是否 ready，例如：

- `storyline.md` 是否只是模板，还是已有 substantive content
- `paper.md` 是否只有框架，还是已有完整段落
- `relatedwork/summary.md` 是否存在
- `.agents/cross_index.json` 是否已构建

这导致很多 skill 只能靠“文件是否存在”或临时扫描内容来推断阶段。

### 3. CLI 只能管理少量状态，很多 progress 仍靠 skill 手写 state

CLI 现在有：`init`、`status`、`set-phase`、`skip`、`log`、`report`、`commit`、`rollback`、`diff`。

这一轮改进后，phase 的显式状态推进已经可以通过 `set-phase` 完成，`current_phase` 也会随真实状态自动重算。

但它仍然没有：

- `resume phase`
- `record artifact readiness`
- `record discussion / writing progress`

所以虽然 phase-level 的状态推进问题已经部分缓解，多个 skill 仍然需要直接写 `.agents/state.json` 来表达更细粒度的工作流进度，这与“优先通过 CLI 管理状态”的目标仍存在张力。

### 4. checker 体系几乎只覆盖 `paper.md`

当前 7 checker 都围绕 `paper.md` 工作。

这意味着：

- 如果用户只有 `storyline.md`，还没有写 `paper.md`，系统缺少同等级的自动质量门
- `storyline.md` 阶段更多依赖人工讨论或 skill 自身流程，而不是统一 checker 框架

### 5. source skills 与 scaffold skills 双份维护，容易漂移

仓库里同时存在：

- `.agents/skills/*`
- `copaper/scaffold/skills/*`

任何 skill 的更新都必须同步两份，否则 `copaper init` 初始化出来的项目会落后于仓库源码。

### 6. 之前 `copaper init` 没有复制 `paper.md`

这个问题已修复，但它暴露了一个更深层问题：

- 当前 workflow 的很多 skill 把 `paper.md` 当作必需前提
- 但初始化脚手架过去没有把它作为 first-class artifact

这类问题说明“阶段设计”和“初始化工件集合”还没有完全对齐。

## 建议的后续改进方向

1. 把 phase model 从线性链升级成“推荐路径 + 允许回流”的有向图
2. 在 `.agents/state.json` 中增加 artifact readiness / artifact provenance 字段
3. 给 CLI 增加更细粒度的状态更新命令，而不是让 skills 直接改 JSON
4. 为 `storyline.md` 引入与 paper checker 对应的 lightweight checker / validator
5. 给 source skills → scaffold skills 增加自动同步校验测试

## 当前实现后的结论

修复 `copaper init` 复制 `paper.md` 后，初始化脚手架终于与当前 skill 生态基本一致：

- storyline-first 可以直接开始
- paper-first 也可以成立
- literature 可以从 storyline 或 paper 双向进入
- review / revise / latex 路径与 paper 主工件保持一致

但要真正把“可跳过、可重入、可逆向”变成一等能力，还需要继续把 phase model 改造成 artifact-driven workflow model。
