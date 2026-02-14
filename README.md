# VibePaper Agent Skills

这个仓库包含了用于学术论文写作和审查的三个 Agent Skills，遵循 [Agent Skills 标准](https://agentskills.io/)。

## 启用 Agent Skills

在 VS Code 中启用 Agent Skills：

1. 打开设置 (Cmd/Ctrl + ,)
2. 搜索 `chat.useAgentSkills`
3. 勾选启用该设置

或者在 `settings.json` 中添加：
```json
{
  "chat.useAgentSkills": true
}
```

## 安装 Skills

将这些 Skills 安装到你的工作区：

### 方法 1：克隆仓库（推荐）

```bash
# 克隆整个仓库到你的项目目录
git clone https://github.com/yourusername/vibepaper-skill.git

# 或者只复制 .github/skills 目录到你的项目根目录
cp -r vibepaper-skill/.github/skills /your-project/.github/
```

### 方法 2：手动下载

1. 下载本仓库的 `.github/skills/` 目录
2. 将整个 `skills` 目录放到你项目的 `.github/` 目录下
3. 确保目录结构为：
   ```
   your-project/
   └── .github/
       └── skills/
           ├── markdown2latex/
           │   └── SKILL.md
           ├── markdown-review/
           │   └── SKILL.md
           └── latex-review/
               └── SKILL.md
   ```

安装完成后，重启 VS Code 或重新加载窗口（Cmd/Ctrl + Shift + P → "Reload Window"），Skills 即可生效。

## 使用方法

1. 初始化项目
- 目前提供三个选项，technical paper，empirical paper，nsfc proposal 
- 使用initailizer skill: initailize a techinical paper/ empirical paper/nsfc proposal

2. 使用helper写general.md, general.md是整个论文的大纲，请先编写general.md再编写其他章节
- 使用markdown-helper skill: help me write the paper/ help me write general.md
- agent会问你若干问题，按照agent的提示回答

3. 学生，AI，老师协同迭代完成主要内容
- 可以使用markdown-review skill来让AI审阅你的内容，AI会将带有AI suggestion: 字样的HTML注释插入到相应位置：
- 人类可以写带有Human Comment：字样的HTML注释来添加注释
- 你可以在内容中插入`{需要内容的描述}`的占位符，然后让helper来帮你填写相关内容：  `help me write design.md`,`帮助我写 design.md`

4. 你可以使用relatedwork-finder帮你去搜索和下载相关工作，agent会自己形成bibtex文档，对关键文献写总结
- `find related work`

5. 提供一个novelty-checker,可以根据下载的文献，检查你的insight的novelty如何
- `check the novelty of this paper`

## Skills 文件结构

这些 Skills 的文件存放在 `.github/skills/` 目录下：

Skills 会根据你的提示自动激活，无需手动选择。Copilot 会自动发现并加载相应的 `SKILL.md` 文件来执行任务。
