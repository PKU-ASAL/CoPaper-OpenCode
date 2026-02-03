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

## 可用的 Skills

### 1. markdown2latex

**名称：** `markdown2latex`

**功能：** 将 markdown 学术论文内容转换为高质量的 LaTeX 格式，适用于顶级会议和期刊投稿。

**使用场景：**
- 从 markdown 生成完整的 LaTeX 文档
- 转换特定章节到 LaTeX
- 学术论文格式化

**示例提示：**
```
- "生成 paper.md 对应的 latex"
- "Convert the Introduction section from paper.md to LaTeX"
- "将 methodology.md 转换为 LaTeX 格式"
```

**特点：**
- 遵循学术写作规范
- 主题句-支撑结构的段落组织
- 保留数学公式和引用
- 自动补充必要的学术内容

### 2. markdown-review

**名称：** `markdown-review`

**功能：** 审查和改进 markdown 学术论文内容，专注于论点清晰度、论证充分性和逻辑连贯性。

**使用场景：**
- 审查 markdown 论文内容
- 改进学术写作质量
- 获取详细的改进建议

**两种模式：**

**模式 1：直接修订（默认）**
```
- "Review paper.md"
- "评审 introduction.md"
- "Improve the Methodology section"
```
输出：直接返回修订后的内容

**模式 2：详细建议**
```
- "Give me suggestions for paper.md"
- "提供 paper.md 的改进建议"
- "What should I improve in my paper?"
```
输出：按优先级分组的结构化建议

**审查重点：**
1. 论点清晰度
2. 论证充分性
3. 逻辑连贯性
4. 段落结构（主题句+支撑细节）
5. 学术严谨性

### 3. latex-review

**名称：** `latex-review`

**功能：** 审查和改进 LaTeX 学术论文内容，分析论文质量和出版准备度。

**使用场景：**
- 审查 LaTeX 论文文件
- 改进 LaTeX 文档质量
- 投稿前检查

**两种模式：**

**模式 1：直接修订（默认）**
```
- "Review paper.tex"
- "评审这个 LaTeX 文件"
- "Improve the Results section in paper.tex"
```
输出：返回修订后的 LaTeX 内容

**模式 2：详细建议**
```
- "Give me suggestions for paper.tex"
- "提供 LaTeX 改进建议"
- "Is my paper ready for submission?"
```
输出：结构化建议，包含具体章节引用和可操作的修改建议

**审查重点：**
1. 逻辑连贯性和流畅度
2. 段落结构
3. 核心论点的清晰度
4. 创新性和原创性
5. 学术严谨性和语调
6. LaTeX 格式和技术细节

## Skills 文件结构

这些 Skills 的文件存放在 `.github/skills/` 目录下：

```
.github/skills/
├── markdown2latex/
│   └── SKILL.md          # Markdown 转 LaTeX 的指令
├── markdown-review/
│   └── SKILL.md          # Markdown 审查指令
└── latex-review/
    └── SKILL.md          # LaTeX 审查指令
```

Skills 会根据你的提示自动激活，无需手动选择。Copilot 会自动发现并加载相应的 `SKILL.md` 文件来执行任务。
