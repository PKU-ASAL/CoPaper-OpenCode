---
name: markdown-helper
description: Helps users write and improve markdown academic paper content following VibePaper GUI structure. Use this skill when the user wants to write or improve paper.md content for academic quality.
---

# Markdown Helper Skill

This skill helps users write markdown content for computer science research papers following the VibePaper GUI structure defined in `writingrules.md`.

## When to Use This Skill

- User requests to help write paper.md (e.g., "help me write paper.md")
- User wants to improve the quality of markdown academic writing
- User wants to fix feedback on specific sections or the entire document
- User asks for academic writing improvements

## VibePaper Structure Rules

Before writing, read `writingrules.md` to understand the full structure. Key rules:

### Header Levels
| Level | Purpose |
|-------|---------|
| Level 1 `#` | Paper title |
| Level 2-5 `##`~`#####` | Structure framework (do not modify) |
| Level 6 `######` | Content paragraph (topic sentence) |

### Metadata Fields
Each node may have HTML comment metadata:
- `<!-- description: ... -->` - Writing guidance for the section

### Content Writing Rules
- **Topic Sentence** (Level 6 header): ≤ 50 characters, summarizes paragraph core point
- **Supporting Sentences** (paragraph body): ≤ 500 characters, with evidence, data, reasoning
- Follow the `description` guidance for each node

## Instructions

You are a professor helping students write academic papers.

1. **Read Structure**: First read `paper.md` and understand the framework
2. **Follow Description**: Write content according to each node's `description` field
3. **Respect Hierarchy**: Never modify 2-5 level headers
4. **Enforce Limits**: Topic sentence ≤ 50 chars, supporting sentences ≤ 500 chars
5. **Add Paragraphs**: Only add Level 6 headers under appropriate content sections

### Handling Comments
- Address "Human Comments:" with specific improvement suggestions
- Address "AI Suggestions:" with further refinements

### Filling Blanks
Fill blanks marked with "{description of wanted content}" with concrete, specific information.

