---
name: markdown-review
description: Reviews and improves markdown academic paper content following VibePaper GUI structure. Use this skill when the user wants to review or improve paper.md content for academic quality.
---

# Markdown Review Skill

This skill provides comprehensive review of markdown content for computer science research papers by running all available checkers sequentially. It follows the VibePaper structure rules.

## When to Use This Skill

- User requests to review paper.md (e.g., "review paper.md", "check my paper")
- User wants comprehensive academic quality check
- User wants to run all checkers at once

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `paper.md` | **Required** | Step 1 (start) | Primary analysis target; read to understand paper content for all 7 checkers |
| `.agents/state.json` | Tool gap | After each checker completes | Checker-result persistence is not currently exposed by the OpenCode plugin; do not edit state directly in plugin-based workflows |

Additional files (such as `writingrules.md`, `relatedwork/papers/*.md`, `.agents/cross_index.json`) are read indirectly by the individual checker sub-skills, not by `markdown-review` itself. This orchestrator only reads `paper.md` directly. If checker-result persistence is needed, state that the current OpenCode plugin does not expose a dedicated checker-record tool; do not hand-edit `.agents/state.json`.

## Review Workflow

This skill runs **seven specialized checkers** in sequence, each focusing on a different aspect of paper quality:

### Checker Execution Order

| Step | Checker | Purpose | Focus Area |
|------|---------|---------|------------|
| 1 | **problem-checker** | Is the problem clearly defined? | Problem validity and motivation |
| 2 | **novelty-checker** | Is the insight novel? | Core contribution validity |
| 3 | **technical-depth-checker** | Is the design deep enough? | Technical contribution quality |
| 4 | **logic-checker** | Are arguments consistent? | Logical coherence |
| 5 | **clarity-checker** | Are terms clear? | Readability and comprehension |
| 6 | **evaluation-protocol-checker** | Is evaluation rigorous? | Experimental validity |
| 7 | **data-checker** | Is data real and reproducible? | Data authenticity |

### Why This Order?

1. **Problem definition first**: If the problem isn't clearly defined and justified, other issues may be moot
2. **Novelty second**: Validates the core insight's novelty after problem is established
3. **Technical depth third**: Validates the method's contribution value
4. **Logic fourth**: Ensures argumentation is sound before diving into details
5. **Clarity fifth**: Improves readability after structural issues are identified
6. **Evaluation protocol sixth**: Checks experimental design rigor
7. **Data last**: Verifies all reported results are real and reproducible

## How This Skill Works

### Step 1: Read Paper Context

First, read the essential files:
1. Read `paper.md` to understand the paper content
2. Do NOT read additional context files directly here. Related-work context, cross-index context, and structure rules are handled indirectly by the individual checker sub-skills.

### Step 2: Run Problem Checker

**Action**: Invoke the problem-checker skill

**What it checks**:
- Is the problem clearly defined?
- Is importance thoroughly supported with evidence?
- Is practical relevance demonstrated?
- Is problem-solution alignment maintained?

**Output**: Problem definition issues with severity levels (Critical/Major/Minor)

### Step 3: Run Novelty Checker

**Action**: Invoke the novelty-checker skill

**What it checks**:
- Is the core insight novel?
- Is there prior work that challenges novelty claims?
- Are novelty claims properly justified?
- Is differentiation from prior work clear?

**Output**: Novelty issues with severity levels (Critical/Major/Minor)

### Step 4: Run Technical Depth Checker

**Action**: Invoke the technical-depth-checker skill

**What it checks**:
- Is the design technically sophisticated?
- Are challenges real and non-trivial?
- Is there sufficient technical detail?
- Are design decisions justified?

**Output**: Technical depth issues with severity levels

### Step 5: Run Logic Checker

**Action**: Invoke the logic-checker skill

**What it checks**:
- Are claims supported by evidence?
- Are there internal contradictions?
- Are there logical fallacies?
- Is abstract-body consistency maintained?

**Output**: Logic issues with severity levels

### Step 6: Run Clarity Checker

**Action**: Invoke the clarity-checker skill

**What it checks**:
- Are all technical terms defined?
- Are acronyms properly expanded?
- Are references and pronouns clear?
- Is terminology used consistently?

**Output**: Clarity issues with severity levels

### Step 7: Run Evaluation Protocol Checker

**Action**: Invoke the evaluation-protocol-checker skill

**What it checks**:
- Do RQs validate the insight?
- Are threats to validity addressed?
- Are baselines comprehensive and fair?
- Are metrics appropriate?

**Output**: Evaluation protocol issues with severity levels

### Step 8: Run Data Checker

**Action**: Invoke the data-checker skill

**What it checks**:
- Is there placeholder/bogus data?
- Do all tables/figures have reproduction scripts?
- Do script outputs match reported results?
- Is data consistent across the paper?

**Output**: Data authenticity issues with severity levels

### Step 9: Generate Comprehensive Report

After all checkers complete, generate a summary report aggregating all findings.

## Output Format

### Summary Report Structure

```markdown
# Comprehensive Paper Review Report

**Paper**: [Paper title]
**Review Date**: [Date]
**Total Issues Found**: X

---

## Executive Summary

### Overall Assessment
- **Problem Definition**: Clear / Moderate / Unclear
- **Novelty**: Strong / Moderate / Weak
- **Technical Depth**: Deep / Moderate / Shallow
- **Logical Coherence**: Strong / Moderate / Weak
- **Clarity**: Clear / Moderate / Unclear
- **Evaluation Rigor**: Rigorous / Moderate / Weak
- **Data Authenticity**: Verified / Issues Found

### Critical Issues (Must Fix)
1. [Issue from problem-checker]
2. [Issue from novelty-checker]
3. [Issue from technical-depth-checker]
...

### Major Issues (Should Fix)
1. [Issue from logic-checker]
2. [Issue from clarity-checker]
...

### Minor Issues (Consider Fixing)
1. [Issue from evaluation-protocol-checker]
...

---

## Detailed Checker Results

### 1. Problem Definition Assessment

**Checker**: problem-checker
**Issues Found**: X (Critical: Y, Major: Z, Minor: W)

**Key Findings**:
- [Summary of problem definition issues]

**Strengths**:
- [What's good about problem definition]

**Weaknesses**:
- [What needs improvement]

---

### 2. Novelty Assessment

**Checker**: novelty-checker
**Issues Found**: X (Critical: Y, Major: Z, Minor: W)

**Key Findings**:
- [Summary of novelty issues]

**Strengths**:
- [What's good about novelty]

**Weaknesses**:
- [What needs improvement]

---

### 3. Technical Depth Assessment

**Checker**: technical-depth-checker
**Issues Found**: X (Critical: Y, Major: Z, Minor: W)

**Key Findings**:
- [Summary of technical depth issues]

**Strengths**:
- [What shows good depth]

**Weaknesses**:
- [What lacks depth]

---

### 4. Logic Assessment

**Checker**: logic-checker
**Issues Found**: X (Critical: Y, Major: Z, Minor: W)

**Key Findings**:
- [Summary of logic issues]

**Strengths**:
- [What's logically sound]

**Weaknesses**:
- [What has logic problems]

---

### 5. Clarity Assessment

**Checker**: clarity-checker
**Issues Found**: X (Critical: Y, Major: Z, Minor: W)

**Key Findings**:
- [Summary of clarity issues]

**Strengths**:
- [What's clear]

**Weaknesses**:
- [What's unclear]

---

### 6. Evaluation Protocol Assessment

**Checker**: evaluation-protocol-checker
**Issues Found**: X (Critical: Y, Major: Z, Minor: W)

**Key Findings**:
- [Summary of evaluation issues]

**Strengths**:
- [What's rigorous]

**Weaknesses**:
- [What needs improvement]

---

### 7. Data Authenticity Assessment

**Checker**: data-checker
**Issues Found**: X (Critical: Y, Major: Z, Minor: W)

**Key Findings**:
- [Summary of data issues]

**Strengths**:
- [What's verified]

**Weaknesses**:
- [What needs attention]

---

## Prioritized Action Items

### Immediate Actions (Critical Issues)
1. [ ] [Action item 1]
2. [ ] [Action item 2]

### Important Actions (Major Issues)
1. [ ] [Action item 1]
2. [ ] [Action item 2]

### Optional Improvements (Minor Issues)
1. [ ] [Action item 1]
2. [ ] [Action item 2]

---

## Publication Readiness Assessment

### Ready for Submission?
- [ ] **Yes**: All critical issues resolved
- [ ] **Almost**: Only minor issues remain
- [ ] **No**: Critical or major issues need attention

### Risk Level
- **High**: Multiple critical issues, high rejection risk
- **Medium**: Major issues exist, may face reviewer concerns
- **Low**: Only minor issues, ready for submission

### Likely Reviewer Concerns
1. [Concern that reviewers might raise]
2. [Concern that reviewers might raise]

---

## Recommendations by Section

### For Insight Section
- [Specific recommendation]

### For Method Section
- [Specific recommendation]

### For Evaluation Section
- [Specific recommendation]

### For Writing Quality
- [Specific recommendation]

---

## Next Steps

1. Address all **Critical** issues first
2. Review and fix **Major** issues
3. Consider **Minor** improvements
4. Re-run this review after fixes
5. Prepare for submission when all issues resolved
```

### Inline Comments

Each checker will insert its own formatted HTML comments at relevant locations in `paper.md`. All comments are clearly marked as AI-generated and include:
- Checker name
- Issue type
- Location
- Problem description
- Suggested fix
- Severity level

## Paper Structure Reference

The paper follows VibePaper structure. Key rules for this skill:
- **Level 1** (`#`): Paper title only.
- **Level 2-5** (`##` to `#####`): Structural headings only — do NOT modify these.
- **Level 6** (`######`): Content paragraphs. Title = topic sentence (≤50 chars). Body = supporting text (≤500 chars).

Do NOT read `writingrules.md` — the essential structure rules are inlined above.

## Important Notes

1. **Sequential execution**: Checkers run one after another, each building on previous findings
2. **Comprehensive coverage**: All aspects of paper quality are checked
3. **Severity-based prioritization**: Critical issues are highlighted for immediate attention
4. **AI-generated comments**: All comments are AI analysis, clearly marked to distinguish from human reviewer feedback
5. **Reproducible review**: Run this skill multiple times as you fix issues to track progress
6. **Author responsibility**: Authors should review all AI suggestions critically before implementing
7. **Plugin tool boundary**: The current OpenCode plugin exposes workflow, artifact, dashboard, initialization, and log-query tools, but not checker-result persistence. Use `vibepaper_init_apply` for confirmed core-file initialization requests. Report checker findings in the response unless a dedicated checker-record tool becomes available.

## Usage Examples

### Example 1: Full Review

```
User: review my paper
Assistant: I'll run a comprehensive review of your paper using all seven checkers.
[Runs problem-checker → novelty-checker → technical-depth-checker → logic-checker → clarity-checker → evaluation-protocol-checker → data-checker]
[Generates comprehensive report]
```

### Example 2: Quick Check

```
User: check my paper quickly
Assistant: I'll do a quick review. Let me run the key checkers.
[Runs problem-checker, novelty-checker, logic-checker, data-checker]
[Provides summary of most critical issues]
```

### Example 3: Focus on Specific Aspect

If user wants to focus on a specific aspect, direct them to individual checkers:
- For problem definition → Use `problem-checker` directly
- For novelty concerns → Use `novelty-checker` directly
- For logic issues → Use `logic-checker` directly
- For clarity issues → Use `clarity-checker` directly
- For technical depth → Use `technical-depth-checker` directly
- For evaluation protocol → Use `evaluation-protocol-checker` directly
- For data authenticity → Use `data-checker` directly
