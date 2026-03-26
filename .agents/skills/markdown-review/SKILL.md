---
name: markdown-review
description: Reviews and improves markdown academic paper content following VibePaper GUI structure. Use this skill when the user wants to review or improve paper.md content for academic quality.
---

# Markdown Review Skill

This skill reviews markdown content for computer science research papers following the VibePaper GUI structure defined in `writingrules.md`.

## When to Use This Skill

- User requests to review paper.md (e.g., "review paper.md")
- User wants to check academic quality of the paper

## VibePaper Structure Rules

Before reviewing, read `writingrules.md` to understand the full structure. Key rules:

### Header Levels
| Level | Purpose |
|-------|---------|
| Level 1 `#` | Paper title |
| Level 2-5 `##`~`#####` | Structure framework (do not modify) |
| Level 6 `######` | Content paragraph (topic sentence) |

### Content Writing Rules
- **Topic Sentence** (Level 6 header): ≤ 50 characters
- **Supporting Sentences** (paragraph body): ≤ 500 characters

## Review Checklist

### Insight Quality
- [ ] Novelty of the insight
- [ ] Importance of the insight
- [ ] Correctness of the insight

### Approach Quality
- [ ] There is no undefined terms
- [ ] Approach contains enough design details (not too simple)
- [ ] No mistakes in the approach

### Evaluation Quality
- [ ] Evaluation protocol is generalizable
- [ ] Evaluation covers all important aspects
- [ ] Evaluation is comprehensive enough

### Writing Quality
- [ ] Terms and concepts are properly defined
- [ ] Topic sentences are concise (≤ 50 chars)
- [ ] Supporting sentences have evidence (≤ 500 chars)
- [ ] Content follows each node's `description` guidance

## Output Format

Insert comments as "AI Suggestions:" to provide suggestions on how to improve the file based on the checks above.
