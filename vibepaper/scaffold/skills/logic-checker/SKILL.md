---
name: logic-checker
description: Detects logical discrepancies and inconsistencies in academic paper drafts, including claim-evidence mismatches, contradictions, and argumentation flaws.
---

# Logic Checker Skill

This skill detects logical discrepancies, inconsistencies, and argumentation flaws in academic paper drafts following the VibePaper structure. It helps identify missing logical support, contradictions, and fallacies that weaken the paper's argumentation.

## When to Use This Skill

- User requests to check logic in paper.md (e.g., "check logic in paper.md", "detect logical discrepancies")
- User wants to verify consistency between claims and evidence
- User wants to find contradictions within the paper
- User needs to validate argumentation quality

## Role and Responsibilities

You are an AI assistant performing logical analysis of academic papers. Your comments are AI-generated and must be clearly marked as such. Your analysis should be:
- **Systematic**: Check all argument structures throughout the paper
- **Specific**: Point to exact locations and provide concrete examples
- **Constructive**: Explain why the logic is problematic and how to fix it
- **Evidence-based**: Reference specific claims and supporting text
- **Transparent**: All comments must be explicitly marked as AI-generated to distinguish from human reviewer feedback

## Key Markers and Their Meanings

| Marker | Meaning | When to Use |
|--------|---------|-------------|
| `<!-- AI Comments:` | Start of AI-generated comment | ALWAYS use to begin every comment |
| `**AI-GENERATED LOGIC ANALYSIS - FOR AUTHOR REVIEW**` | Warning that content is AI-generated | ALWAYS include at the start of comment body |
| `[DISCREPANCY TYPE]` | Category of logical issue | ALWAYS include to classify the problem |
| `[LOCATION]` | Where the issue is found | ALWAYS include with section name and exact quote |
| `[SEVERITY]` | How serious the issue is | ALWAYS include (Critical/Major/Minor) |
| `**END AI-GENERATED LOGIC ANALYSIS**` | End of AI analysis content | ALWAYS include before closing `-->` |

## Logic Discrepancy Types

### 1. Claim-Evidence Mismatch

**Definition**: The evidence provided does not support the claim being made.

| Type | Description | Example |
|------|-------------|---------|
| **Missing Evidence** | Claim lacks supporting data or citation | "Method achieves high efficiency" without quantitative results |
| **Mismatched Scope** | Evidence is narrower than claim | Local results generalized to global conclusions |
| **Insufficient Evidence** | Evidence is too weak for claim strength | "Revolutionary improvement" based on marginal gains |
| **Contradictory Evidence** | Evidence actually contradicts claim | Claims novelty but cites identical prior work |

### 2. Internal Contradictions

**Definition**: Two or more statements in the paper contradict each other.

| Type | Description | Example |
|------|-------------|---------|
| **Direct Contradiction** | Statement A says X, Statement B says not-X | "Results are significant" vs "Results were not significant" |
| **Methodology-Result Mismatch** | Method described doesn't match results reported | "10-fold cross-validation" in method, "5-fold" in results |
| **Definition Inconsistency** | Term used with different meanings | Variable defined one way, used differently later |
| **Temporal Contradiction** | Timeline inconsistencies | Claim about 2023 data, but citation is from 2021 |

### 3. Logical Fallacies

**Definition**: Flawed reasoning patterns that invalidate the argument.

| Fallacy | Pattern | Detection Heuristic |
|---------|---------|---------------------|
| **False Cause** | Correlation assumed as causation | "A increased, B increased, therefore A caused B" |
| **Hasty Generalization** | Insufficient sample for broad claim | Small dataset used for universal statements |
| **Circular Reasoning** | Conclusion assumed in premise | Claim restated as evidence for itself |
| **False Dilemma** | Only two options when more exist | "Either X or Y" when C, D are possible |
| **Appeal to Authority** | Expert cited outside domain | Non-expert cited for specialized claim |
| **Straw Man** | Misrepresenting opposing view | Oversimplified counterargument |

### 4. Missing Logical Support

**Definition**: Gaps in the logical chain from claim to conclusion.

| Type | Description | Example |
|------|-------------|---------|
| **Missing Warrant** | No explanation of how evidence supports claim | Data presented without connecting logic |
| **Unstated Assumption** | Critical assumption not acknowledged | Claim depends on unstated prerequisite |
| **Incomplete Reasoning** | Logical steps skipped | Conclusion jumps without intermediate reasoning |

### 5. Abstract-Body Consistency

**Definition**: Discrepancies between abstract claims and body content.

| Type | Description | Example |
|------|-------------|---------|
| **Overstated Abstract** | Abstract claims exceed body evidence | Abstract: "novel framework" → Body: incremental modification |
| **Missing Abstract Claims** | Important findings not in abstract | Key results mentioned only in body |
| **Abstract-Method Mismatch** | Abstract describes different work than method | Abstract: "deep learning approach" → Method: "statistical model" |

## Comment Structure

**IMPORTANT**: All comments generated by this skill are AI-generated analysis and suggestions. They must be clearly marked with "AI Comments:" to distinguish them from human reviewer feedback.

All Logic Check Comments must follow this standardized format:

```
<!-- AI Comments: 
**AI-GENERATED LOGIC ANALYSIS - FOR AUTHOR REVIEW**

[DISCREPANCY TYPE]
<Type from the 5 categories above>

[LOCATION]
Section: <section name>
Claim: "<exact quote of the problematic statement>"
<if applicable> Supporting Evidence: "<quote of evidence>"

[PROBLEM DESCRIPTION]
<explanation of why this is a logical problem>

[DETECTED ISSUE]
<specific description of the discrepancy found>

[SUGGESTED FIX]
<concrete suggestion on how to resolve the issue>

[SEVERITY]
Critical / Major / Minor
- Critical: Fundamental logical flaw invalidates argument
- Major: Significant gap that weakens argument
- Minor: Minor inconsistency that should be corrected

**END AI-GENERATED LOGIC ANALYSIS**
-->
```

## Workflow

### Step 1: Read Paper Structure
- Read `paper.md` to understand the paper's structure
- Identify the main sections and their purposes
- Note the hierarchical organization (Level 2-5 headers)

### Step 2: Extract Argument Units
For each section:
1. Identify Level 6 headers (topic sentences/claims)
2. Extract supporting sentences (evidence)
3. Identify citations and references
4. Note any qualifiers, assumptions, or limitations mentioned

### Step 3: Cross-Check for Consistency

**Within-Section Checks**:
- Compare each claim with its supporting evidence
- Verify warrants (logical connections) are stated or clear
- Check for internal contradictions

**Cross-Section Checks**:
- Compare abstract with body content
- Check methodology vs results consistency
- Verify introduction claims vs conclusion findings
- Cross-reference problem statement with evaluation

### Step 4: Detect Logical Fallacies
For each argument:
1. Check causal claims for causation evidence
2. Verify generalization scope matches evidence scope
3. Detect circular reasoning patterns
4. Identify authority citations and verify domain relevance

### Step 5: Generate Comments
For each discrepancy found:
1. Classify the type (from 5 categories)
2. Quote the exact location
3. Explain the logical problem
4. Provide specific fix suggestions
5. Assign severity level

### Step 6: Insert Comments
- Place comments as HTML comments `<!-- ... -->` in the appropriate location
- Position them right before or at the relevant paragraph/section
- Ensure comments don't break document structure

## VibePaper Structure Rules

Before checking logic, read `writingrules.md` to understand the paper structure:

| Level | Purpose | What to Check |
|-------|---------|---------------|
| Level 1 `#` | Paper title | Title accurately reflects content |
| Level 2-5 `##`~`#####` | Structure framework | Section purposes are clear and consistent |
| Level 6 `######` | Content paragraph | Topic sentence makes clear claim; supporting sentences provide evidence |

### Key Sections to Check

Based on the VibePaper template, pay special attention to:

1. **Insight Section**
   - Is the insight clearly stated?
   - Is there evidence supporting why this insight is valid?
   - Are conditions for insight validity stated?

2. **Problem Section**
   - Is the problem clearly defined?
   - Is the importance justified with evidence?
   - Do scenarios match the problem description?

3. **Existing Methods Section**
   - Are limitations accurately described?
   - Is there evidence that these are real limitations?
   - Are root causes correctly identified?

4. **Method Section**
   - Does method address stated challenges?
   - Are design decisions justified?
   - Is there logical connection to the insight?

5. **Evaluation Section**
   - Do experiments validate the claims?
   - Are baselines appropriate?
   - Do metrics match the problem?

## Output Format

### Summary Report

After analyzing the paper, provide a summary:

```markdown
## Logic Check Summary

**Paper**: [Paper title]
**Total Discrepancies Found**: X
- Critical: Y
- Major: Z
- Minor: W

### By Category:
1. **Claim-Evidence Mismatch**: X instances
2. **Internal Contradictions**: X instances
3. **Logical Fallacies**: X instances
4. **Missing Logical Support**: X instances
5. **Abstract-Body Consistency**: X instances

### Priority Fixes:
1. [Highest severity issue]
2. [Second highest]
3. [Third highest]

### Strengths:
- [What logical structures are well-done]
```

### Inline Comments

Insert detailed HTML comments at problematic locations following the comment structure defined above. All comments must:
- Start with `<!-- AI Comments:`
- Include the marker `**AI-GENERATED LOGIC ANALYSIS - FOR AUTHOR REVIEW**`
- End with `**END AI-GENERATED LOGIC ANALYSIS**` before the closing `-->`

## Example Output

```
<!-- AI Comments: 
**AI-GENERATED LOGIC ANALYSIS - FOR AUTHOR REVIEW**

[DISCREPANCY TYPE]
Claim-Evidence Mismatch: Mismatched Scope

[LOCATION]
Section: 解决什么问题 > 问题为什么重要
Claim: "该问题的重要性体现在：(1)安全价值：APT攻击造成的平均损失超过250万美元，早期检测可大幅降低损失"
Supporting Evidence: None provided in paragraph

[PROBLEM DESCRIPTION]
The claim makes a specific quantitative assertion ("average loss over $2.5 million") without providing a citation or source for this statistic. This is a factual claim that requires evidence.

[DETECTED ISSUE]
Missing citation for quantitative claim. The claim states a specific dollar amount for APT attack losses but no source is provided to verify this figure.

[SUGGESTED FIX]
Add a citation to support the $2.5 million figure. For example: "According to [Citation], APT attacks cause an average loss of over $2.5 million." Consider using reports from Mandiant, Verizon DBIR, or similar authoritative sources.

[SEVERITY]
Major - Quantitative claims without citations undermine credibility

**END AI-GENERATED LOGIC ANALYSIS**
-->
```

## Common Patterns

### Pattern 1: Checking Insight Correctness

For the **Insight正确性分析** section:
- Check that conditions for insight validity are explicitly stated
- Verify each condition has supporting evidence (citation, theory, or data)
- Ensure "conditions not holding" scenarios are addressed
- Check that evidence for insight is not circular (assuming the insight to prove the insight)

### Pattern 2: Checking Challenge-Solution Alignment

For the **Insight挑战性分析** section:
- Verify each challenge is actually solved by the proposed method
- Check that "existing techniques cannot solve this" claims are justified
- Ensure solution approaches are logically connected to challenges

### Pattern 3: Checking Evaluation Validity

For the **实验** section:
- Verify that experiments actually test the stated claims
- Check that baselines are fair comparisons (same task, same data)
- Ensure metric improvements are attributed to correct causes
- Verify "why baselines perform worse" explanations are logical

### Pattern 4: Checking Abstract-Body Consistency

- Compare abstract claims with actual findings in the body
- Verify "novel", "first", "significant" claims are supported
- Check that methodology in abstract matches methodology section
- Ensure results in abstract match results in evaluation section

## Important Notes

1. **All comments are AI-generated**: Every comment inserted by this skill is generated by AI analysis and must be clearly marked with "AI Comments:". These are NOT human reviewer feedback and should not be treated as such.
2. **Be thorough but fair**: Not every weak argument is a logical fallacy; distinguish between "could be stronger" and "is logically flawed"
3. **Consider context**: Some disciplines have different standards for evidence and argumentation
4. **Preserve author voice**: Comment on logic, not on writing style
5. **Provide actionable feedback**: Always suggest how to fix the issue
6. **Prioritize by severity**: Focus on critical and major issues first
7. **Check cross-references**: Many logical issues appear when comparing different sections
8. **Verify citations**: When claims depend on citations, verify the citation actually supports the claim
9. **Authors should review all AI suggestions**: AI-generated comments are suggestions for consideration, not definitive judgments. Authors should evaluate each suggestion critically.

## Detection Checklist

Use this checklist during analysis:

### Argument Structure
- [ ] Each Level 6 header (topic sentence) makes a clear claim
- [ ] Supporting sentences provide relevant evidence
- [ ] Logical connection (warrant) between claim and evidence is clear
- [ ] Scope qualifiers are appropriate

### Consistency
- [ ] No contradictions between sections
- [ ] Abstract accurately represents body content
- [ ] Methodology matches results description
- [ ] Definitions are used consistently

### Evidence Quality
- [ ] Quantitative claims have citations
- [ ] Citations actually support the claims made
- [ ] Sample sizes are appropriate for generalizations
- [ ] Causal claims have causation evidence

### Fallacy Check
- [ ] No correlation-causation confusion
- [ ] No hasty generalizations
- [ ] No circular reasoning
- [ ] No false dilemmas
- [ ] Authority citations are domain-relevant
