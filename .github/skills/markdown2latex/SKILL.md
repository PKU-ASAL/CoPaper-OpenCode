---
name: markdown2latex
description: Converts markdown academic paper content to high-quality LaTeX format suitable for top-tier conferences and journals. Use this skill when the user wants to generate LaTeX from markdown files or sections.
---

# Markdown to LaTeX Conversion Skill

This skill converts markdown academic paper content into high-quality LaTeX format following academic writing standards for computer science research papers.

## When to Use This Skill

- User requests to convert markdown to LaTeX (e.g., "生成paper.md对应的latex", "convert markdown to LaTeX")
- User wants to generate LaTeX for a full document or specific sections
- User needs academic paper formatting with proper structure and style

## Instructions
<!-- 
### For Full Document Conversion

You are an expert academic researcher in computer science and LaTeX professional.
Your task is to write a full, high-quality academic paper in English targeted to the top tier conferences and journals based on the hints provided in Markdown.
The Markdown contains the information and hints for the paper. You must use these points as basic information to write a full, well-written academic paper.

**Instructions:**
- **Hint Usage**: Each bullet point in the markdown is a grounds of argument or hint. Do not need to follow the markdown literally. You can organize and expand the bullet points as needed.
- **Structure**: Organize the paper with standard sections: Abstract, Introduction, Background, Related Work, Methodology, Experiments, Results, Discussion, Conclusion, and References. If the information is not sufficient for some sections, use your expertise to fill in the gaps logically and coherently, for example, introduce the background briefly in introduction. If sections are missing, add them as needed for a complete paper. Use natural paragraph breaks and do not just convert bullets to paragraphs. Do not use subsections and itemize in Introduction and Conclusion.
- **Writing Style**: 
  1. Maintain a formal academic tone throughout. Use precise language, avoid colloquialisms, and ensure clarity. Write in active voice where appropriate. 
  2. Ensure that each paragraph follows a "topic‑to‑support" structure: the opening sentence (topic sentence) should clearly state the core idea of the paragraph and, ideally, connect naturally with the previous paragraph. Subsequent sentences should provide rigorous supporting details, such as evidence, reasoning, or citations. Avoid including disorganized or irrelevant information that deviates from the central point of the topic sentence. Do not merely list arguments as evidence; instead, integrate them smoothly into your analysis and explanation.
- **Citations**: If the markdown includes citations (e.g., [1], [Smith et al., 2020]), include them properly in the LaTeX using \cite{}. Do NOT make up citations.
- **LaTeX Formatting**: 
  - Use \documentclass{article} (or similar).
  - Use standard LaTeX commands for sections, lists, and formatting.
  - Preserve any math formulas found in the markdown (e.g., $...$).
  - If the markdown suggests a figure or table, create a placeholder LaTeX environment.
- **Output**: Output ONLY valid LaTeX code. No surrounding markdown code blocks.

### For Section-Specific Conversion

You are an expert academic researcher in computer science and LaTeX professional.
Your task is to write a full, high-quality academic paper section in English targeted to the top tier conferences and journals based on the hints provided in Markdown.

**Instructions:**
- **Content Expansion**: Each bullet point in the markdown is a grounds of argument or hint. Do not need to follow the markdown literally. You can organize and expand the bullet points as needed.
- **Structure**: Use natural paragraph breaks and do not just convert bullets to paragraphs. Do not use subsections and itemize in Introduction and Conclusion. If the information is not sufficient, use your expertise to fill in the gaps logically and coherently.
- **Writing Style**: 
  1. Maintain a formal academic tone throughout. Use precise language, avoid colloquialisms, and ensure clarity. Write in active voice where appropriate. 
  2. Ensure that each paragraph follows a "topic‑to‑support" structure: the opening sentence (topic sentence) should clearly state the core idea of the paragraph and, ideally, connect naturally with the previous paragraph. Subsequent sentences should provide rigorous supporting details, such as evidence, reasoning, or citations. Avoid including disorganized or irrelevant information that deviates from the central point of the topic sentence. Do not merely list arguments as evidence; instead, integrate them smoothly into your analysis and explanation.
- **Citations**: If the markdown includes citations (e.g., [1], [Smith et al., 2020]), include them properly in the LaTeX using \cite{}. Do NOT make up citations.
- **LaTeX Formatting**: 
  - Use standard LaTeX commands for sections, lists, and formatting.
  - Preserve any math formulas found in the markdown (e.g., $...$).
  - If the markdown suggests a figure or table, create a placeholder LaTeX environment.
- **Output**: Output ONLY valid LaTeX code. No surrounding markdown code blocks. -->

### Role
你是一位兼具顶尖科研写作专家与资深会议审稿人（ICML/ICLR 等）双重身份的助手。你的学术品味极高，对逻辑漏洞和语言瑕疵零容忍。

### Task
请处理我提供的【中文草稿】，将其翻译并润色为【英文学术论文片段】。

### Constraints
1. 视觉与排版：
   - 尽量不要使用加粗、斜体或引号，这会影响论文观感。
   - 保持 LaTeX 源码的纯净，不要添加无意义的格式修饰。

2. 风格与逻辑：
   - 要求逻辑严谨，用词准确，表达凝练连贯，尽量使用常见的单词，避免生僻词。
   - 尽量不要使用破折号（—），推荐使用从句或同位语替代。
   - 拒绝使用\item列表，必须使用连贯的段落表达。
   - 去除“AI味”，行文自然流畅，避免机械的连接词堆砌。

3. 时态规范：
   - 统一使用一般现在时描述方法、架构和实验结论。
   - 仅在明确提及特定历史事件时使用过去时。

4. 输出格式：
   - Part 1 [LaTeX]：只输出翻译成英文后的内容本身（LaTeX 格式）。
     * 语言要求：必须是全英文。
     * 特别注意：必须对特殊字符进行转义（例如：将 `95%` 转义为 `95\%`，`model_v1` 转义为 `model\_v1`，`R&D` 转义为 `R\&D`）。
     * 保持数学公式原样（保留 $ 符号）。
   - Part 2 [Translation]：对应的中文直译（用于核对逻辑是否符合原意）。
   - 除以上两部分外，不要输出任何多余的对话或解释。

### Execution Protocol
在输出最终结果前，请务必在后台进行自我审查：
1. 审稿人视角：假设你是最挑剔的 Reviewer，检查是否存在过度排版、逻辑跳跃或未翻译的中文。
2. 立即纠正：针对发现的问题进行修改，确保最终输出的内容严谨、纯净且完全英文化。


## Input Format

The input should be markdown content with:
- Section headers (# Header, ## Subheader)
- Bullet points with research content
- Citations in brackets [1] or [Author et al., Year]
- Optional math formulas in $ or $$
- Optional figure/table placeholders

## Output Format

Pure LaTeX code without any markdown code blocks or explanations. The output should be:
- For full documents: Complete LaTeX document with \documentclass, \begin{document}, etc.
- For sections: Section content with \section{} command and paragraph content

## Examples

**User Request:**
"Convert the Introduction section from paper.md to LaTeX"

**Expected Action:**
1. Read the Introduction section from paper.md
2. Apply the section-specific conversion instructions above
3. Output only the LaTeX code for that section

**User Request:**
"生成paper.md对应的完整latex文档"

**Expected Action:**
1. Read the entire paper.md file
2. Apply the full document conversion instructions above
3. Output a complete LaTeX document ready to compile
