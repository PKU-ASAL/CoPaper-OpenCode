# VibePaper Agent Skills

这个仓库包含了用于学术论文写作和审查的三个 Agent Skills，遵循 [Agent Skills 标准](https://agentskills.io/)。

**请注意：本工具起主要作用的是模板，而不是大模型。AI只能帮助你优化文字，不能帮助你生成具体的有意义的内容。我们试过包括Opus和GPT5.4在内的所有模型，都不能帮你生成具体的内容。但是AI可以帮你按照模板去检查论文是否有遗漏或者帮你完善文字。**

**我目前使用vscode+opencode+glm5。我一般在vscode里面看markdown，看git的修改历史，在vscode里面的terminal开opencode+glm5**

## 安装

- 请把这个项目当作一个template，以此为基础创建你自己的项目

## 使用方法

1. 初始化项目
- 目前提供两个选项，technical_paper，empirical_paper
- 请把对应的模板从template中复制到当前项目目录下，命名为paper.md

2. 请查看writingrules.md，按照其中的要求去写paper.md

3. paper.md是整个论文，请按照论文的标准去写paper

3. 使用helper写paper.md
- 使用markdown-helper skill: help me write the paper/ help me write paper.md
- agent会问你若干问题，按照agent的提示回答

4. 你可以使用relatedwork-finder帮你去搜索和下载相关工作，agent会自己形成bibtex文档，对关键文献写总结
- `find related work`

5. 提供一个novelty-checker,可以根据下载的文献，检查你的insight的novelty如何
- `check the novelty of this paper`

## Skills 文件结构

这些 Skills 的文件存放在 `.agents/skills/` 目录下：

Skills 会根据你的提示自动激活，无需手动选择。Copilot 会自动发现并加载相应的 `SKILL.md` 文件来执行任务。
