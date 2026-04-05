# VibePaper Agent Skills

这个仓库包含了用于学术论文检索、阅读、写作和审查的 Agent Skills。本项目基于 OpenCode 和 Oh-My-OpenCode (Sisyphus) 架构开发，深度集成了多模态模型和 MCP (Model Context Protocol) 插件。

**核心理念：本工具起主要作用的是“结构与模板”，而不是大模型的自由发挥。** 
AI 只能基于你提供的 Insight 和实验数据来帮你组织语言、优化文字。但如果你遵循模板，AI 能完美地帮你检查逻辑漏洞、完善文字表达、甚至自动化繁琐的文献检索与对比阅读工作。

## 环境配置与依赖要求

为了充分发挥本项目的自动化能力（特别是单篇文献的深度多模态阅读与严格的段落级协助写作），你需要以下环境：

1. **基础运行环境**：
   - 使用 VSCode 作为主力编辑器。
   - 在终端中运行 [OpenCode](https://github.com/opencode-ai/opencode) 或基于它的增强版架构 [Oh-My-OpenCode](https://github.com/oh-my-opencode/oh-my-opencode)（推荐使用 Sisyphus 代理模式）。
   
2. **多模态大模型配置**：
   - 必须为底层的 subagent (例如 `Sisyphus-Junior`) 配置**支持多模态输入（原生读取 PDF/图片）且上下文窗口极长**的强大模型。
   - **强烈推荐**：`google/gemini-3.1-pro-preview` 或能够直接处理多模态文件的强模型。因为在 `relatedwork-finder` 和 `markdown-helper` 的子任务中，Sisyphus-Junior 会直接挂载原版 PDF 文献和上万字的 `paper.md` / `storyline.md` 作为上下文。如果模型多模态能力弱或上下文短，将导致严重的幻觉或任务崩溃。
   - （日常配置参考：VSCode + OpenCode终端 + Opencode Go 接入 GLM-5 + API 中转站接入 Gemini 3.1 Pro 用于多模态理解写作）。

3. **文献检索依赖 (MCP)**：
   - 本项目依赖网络检索能力来自动查找和下载学术论文。
   - **必须安装并配置**：[Serper MCP Server](https://github.com/garylab/serper-mcp-server) 或类似的支持网页搜索与下载的 MCP 插件。请确保你的 OpenCode 环境已正确加载该 MCP。

## 使用工作流

1. **初始化项目**
   - 模板选择：项目中提供了 `technical_paper` 和 `empirical_paper`。
   - 复制所需的模板从 `template` 文件夹到项目根目录，并重命名为 `paper.md`。

2. **制定核心研究主线**
   - 必须首先完善 `storyline.md`（实验室的小组会讨论模板，把它转为markdown即可）。这是整篇论文的灵魂，包含了你的核心 Insight、问题定义、方法架构和实验预期。**后续所有的 AI 写作和文献总结都将以此文件为最高指导准则。**

3. **文献检索与阅读 (`relatedwork-finder`)**
   - 指令：`"find related work"`
   - 流程：Agent 会自动根据 `storyline.md` 生成关键词，调用 Serper MCP 检索最新相关文献，下载 PDF，并在你的**每一步确认**下，启动独立的多模态上下文窗口逐篇阅读并生成结构化总结（输出到 `relatedwork/papers/`）。

4. **交互式辅助写作 (`markdown-helper`)**
   - 指令：`"help me write the paper"` 或 `"help me write paper.md"`
   - 流程：Agent 会自上而下扫描 `paper.md`。遇到空白的底层节点时，它会综合 `storyline.md`、`paper.md` 已写内容以及下载的文献总结，启动独立的写作子 Agent 为你**起草一段（且严格只起草一段）**内容。
   - **强控设计**：每次起草前需要你确认；起草后你可以直接接受，也可以提出修改意见让它重写。绝不多线程暴走。

5. **论文结构与质量审查 (`markdown-review`)**
   - 请严格查看 `writingrules.md`，了解论文的具体层级规范。AI 会基于此规范来约束自己。
   - 你可以使用额外的指令检查新颖度（例如："check the novelty of this paper"）。

## Skills 文件结构

这些核心控制逻辑文件存放在 `.agents/skills/` 目录下。
Skills 会根据你的自然语言提示自动激活，Opencode 会自动发现并加载相应的 `SKILL.md` 文件来分配给特定的 Subagent 执行任务。
