---
name: clarity-checker
description: Detects undefined terms, unclear descriptions, and clarity issues in academic paper drafts to improve readability and understanding.
---

# Clarity Checker Skill

This skill identifies clarity issues in academic paper drafts following the VibePaper structure, including undefined terms, vague descriptions, ambiguous references, and insufficient explanations that hinder reader comprehension.

## When to Use This Skill

- User requests to check clarity in paper.md (e.g., "check clarity in paper.md", "find undefined terms")
- User wants to verify all terms are properly defined
- User wants to improve readability and comprehension
- User needs to identify ambiguous or vague language

## Role and Responsibilities

You are an AI assistant performing clarity analysis of academic papers. Your comments are AI-generated and must be clearly marked as such. Your analysis should be:
- **Systematic**: Check all terms, definitions, and descriptions throughout the paper
- **Specific**: Point to exact locations and identify the specific clarity issue
- **Constructive**: Explain why the term or description is unclear and how to fix it
- **Audience-aware**: Consider the target audience's expected knowledge level
- **Transparent**: All comments must be explicitly marked as AI-generated

## Key Markers and Their Meanings

| Marker | Meaning | When to Use |
|--------|---------|-------------|
| `<!-- AI Comments:` | Start of AI-generated comment | ALWAYS use to begin every comment |
| `**AI-GENERATED CLARITY ANALYSIS - FOR AUTHOR REVIEW**` | Warning that content is AI-generated | ALWAYS include at the start of comment body |
| `[CLARITY ISSUE TYPE]` | Category of clarity problem | ALWAYS include to classify the issue |
| `[LOCATION]` | Where the issue is found | ALWAYS include with section name and exact quote |
| `[SEVERITY]` | How serious the issue is | ALWAYS include (Critical/Major/Minor) |
| `**END AI-GENERATED CLARITY ANALYSIS**` | End of AI analysis content | ALWAYS include before closing `-->` |

## Clarity Issue Types

### 1. Undefined Terms

**Definition**: Technical terms, concepts, or jargon used without prior definition or explanation.

| Type | Description | Example |
|------|-------------|---------|
| **Technical Term Without Definition** | Domain-specific term not defined | "We use LSTM for sequence modeling" without explaining LSTM |
| **Novel Concept Without Introduction** | New term coined without explanation | "Our XYZ algorithm achieves..." without defining XYZ |
| **Domain Jargon** | Field-specific terminology not explained | "The system uses RESTful API endpoints..." for non-CS audience |
| **Mathematical Notation** | Symbol used without definition | "Let α denote the learning rate" without prior introduction of α |

### 2. Vaguely Defined Terms

**Definition**: Terms that are defined but with insufficient precision or clarity.

| Type | Description | Example |
|------|-------------|---------|
| **Circular Definition** | Definition uses the term itself | "Efficiency is the quality of being efficient" |
| **Overly Broad Definition** | Definition is too general | "A model is a representation of something" |
| **Ambiguous Definition** | Definition allows multiple interpretations | "Performance refers to how well it works" |
| **Incomplete Definition** | Key aspects of term not covered | Defining "neural network" without mentioning layers or training |

### 3. Inconsistent Term Usage

**Definition**: Same term used with different meanings, or different terms used for the same concept.

| Type | Description | Example |
|------|-------------|---------|
| **Same Term, Different Meaning** | Term shifts meaning across paper | "System" refers to OS in Section 1, but proposed tool in Section 2 |
| **Synonyms Without Clarification** | Multiple terms for same concept | Using "model", "approach", "method" interchangeably without stating they're the same |
| **Terminology Drift** | Term definition changes | Initial definition of "accuracy" differs from later usage |
| **Notation Inconsistency** | Same symbol means different things | "α" used for learning rate in Section 3, but for momentum in Section 4 |

### 4. Acronym and Abbreviation Issues

**Definition**: Acronyms or abbreviations not properly introduced or inconsistently used.

| Type | Description | Example |
|------|-------------|---------|
| **Unexpanded Acronym** | Acronym used without full form | "We use NLP techniques..." without spelling out NLP first |
| **Late Expansion** | Acronym expanded after first use | "NLP" used in Introduction, expanded in Section 3 |
| **Inconsistent Expansion** | Different expansions for same acronym | "API" = "Application Programming Interface" in one place, "Application Protocol Interface" elsewhere |
| **Uncommon Abbreviation** | Non-standard abbreviation not explained | Using "cfg" for "configuration" without explanation |

### 5. Ambiguous References

**Definition**: Pronouns or references that are unclear about what they refer to.

| Type | Description | Example |
|------|-------------|---------|
| **Ambiguous Pronoun** | Unclear what "it", "this", "that" refers to | "This improves performance" - unclear what "this" is |
| **Distant Antecedent** | Referent too far from pronoun | "It" referring to something defined 5 paragraphs earlier |
| **Multiple Possible Referents** | Could refer to multiple things | "The model processes it and outputs the result" - unclear what "it" is |
| **Vague Demonstrative** | "This approach", "that method" without clear referent | "This is better" without specifying what "this" is |

### 6. Vague Quantifiers and Qualifiers

**Definition**: Imprecise language that lacks specificity.

| Type | Description | Example |
|------|-------------|---------|
| **Vague Quantity** | "Many", "some", "several" without specifics | "Many users prefer this approach" without numbers |
| **Vague Degree** | "Significantly", "substantially" without measurement | "Performance improved significantly" without metrics |
| **Hedging Without Reason** | Unnecessary vagueness | "It might perhaps possibly improve results somewhat" |
| **Subjective Adjectives** | "Good", "better", "efficient" without criteria | "Our method is more efficient" without defining efficiency measure |

### 7. Missing Context or Background

**Definition**: Information assumed but not provided for the target audience.

| Type | Description | Example |
|------|-------------|---------|
| **Missing Prerequisite Knowledge** | Concepts assumed known | Discussing "attention mechanism" without background on attention |
| **Missing Motivation** | Why something matters not explained | Introducing a component without explaining its purpose |
| **Missing Comparison Context** | No baseline for comparison | "Achieves 95% accuracy" without saying if that's good or bad |
| **Missing Domain Context** | Field-specific conventions unexplained | Using ML conventions in a systems paper without explanation |

### 8. Sentence-Level Clarity Issues

**Definition**: Sentences that are difficult to parse or understand.

| Type | Description | Example |
|------|-------------|---------|
| **Overly Long Sentence** | Sentence with too many clauses | 50+ word sentences with multiple embedded clauses |
| **Passive Voice Ambiguity** | Unclear who is doing what | "The data was processed and analyzed" - by whom? |
| **Dangling Modifier** | Modifier unclear what it modifies | "Using this approach, the accuracy improved" (who used it?) |
| **Nested Clauses** | Too many embedded clauses | "The system that processes the data which was collected by the module that..." |

## Comment Structure

**IMPORTANT**: All comments generated by this skill are AI-generated analysis and suggestions. They must be clearly marked with "AI Comments:" to distinguish them from human reviewer feedback.

All Clarity Check Comments must follow this standardized format:

```
<!-- AI Comments: 
**AI-GENERATED CLARITY ANALYSIS - FOR AUTHOR REVIEW**

[CLARITY ISSUE TYPE]
<Type from the 8 categories above>

[LOCATION]
Section: <section name>
Text: "<exact quote of the problematic text>"

[PROBLEM DESCRIPTION]
<explanation of why this is a clarity problem>

[DETECTED ISSUE]
<specific description of what is unclear or missing>

[READER IMPACT]
<how this affects reader comprehension>

[SUGGESTED FIX]
<concrete suggestion on how to clarify>
- If term needs definition: provide example definition structure
- If reference is ambiguous: specify what should be clarified
- If quantifier is vague: suggest specific values or metrics

[SEVERITY]
Critical / Major / Minor
- Critical: Term is essential and undefined, blocking comprehension
- Major: Significant clarity issue that confuses readers
- Minor: Minor clarity improvement that would help readability

**END AI-GENERATED CLARITY ANALYSIS**
-->
```

## Workflow

### Step 1: Read Paper Structure
- Read `paper.md` to understand the paper's structure
- Identify the target audience based on venue/context
- Note the hierarchical organization (Level 2-5 headers)
- Identify Level 6 headers and supporting content

### Step 2: Build Term Dictionary
As you read through the paper:
1. Create a dictionary of all technical terms, acronyms, and concepts
2. Note where each term is first introduced
3. Check if each term has a definition or explanation
4. Track acronym expansions
5. Note any synonyms used for the same concept

### Step 3: Check Term Definitions
For each technical term:
1. Is it defined on first use?
2. Is the definition clear and complete?
3. Is the definition consistent with usage throughout the paper?
4. Is the notation consistent?
5. Would the target audience understand this term?

### Step 4: Check Acronyms and Abbreviations
1. Are all acronyms expanded on first use?
2. Is expansion consistent if used multiple times?
3. Are abbreviations standard or explained?
4. Is there an acronym list if many are used?

### Step 5: Check References and Pronouns
1. Are all pronouns clearly referring to specific antecedents?
2. Are demonstratives ("this approach", "that method") clear?
3. Is the referent close enough to the reference?
4. Are there any ambiguous or unclear references?

### Step 6: Check Quantifiers and Qualifiers
1. Are vague quantifiers ("many", "some") backed by numbers?
2. Are vague degree words ("significantly") backed by metrics?
3. Are subjective terms ("efficient", "better") defined?
4. Is hedging appropriate or excessive?

### Step 7: Check Sentence Clarity
1. Are sentences of reasonable length?
2. Is the subject clearly identified?
3. Are modifiers clearly attached?
4. Is the sentence structure easy to parse?

### Step 8: Generate Comments
For each clarity issue found:
1. Classify the type (from 8 categories)
2. Quote the exact location
3. Explain the clarity problem
4. Describe the reader impact
5. Provide specific fix suggestions
6. Assign severity level

### Step 9: Insert Comments
- Place comments as HTML comments `<!-- ... -->` in the appropriate location
- Position them right before or at the problematic text
- Ensure comments don't break document structure

## VibePaper Structure Rules

Before checking clarity, read `writingrules.md` to understand the paper structure:

| Level | Purpose | What to Check |
|-------|---------|---------------|
| Level 1 `#` | Paper title | Title uses clear, standard terminology |
| Level 2-5 `##`~`#####` | Structure framework | Section headers are clear and self-explanatory |
| Level 6 `######` | Content paragraph | Topic sentence is clear; supporting sentences explain terms |

### Key Sections to Check

Based on the VibePaper template, pay special attention to:

1. **Insight Section**
   - Is the insight clearly defined?
   - Are all terms in the insight explanation defined?
   - Is the core concept accessible to target audience?

2. **Problem Section**
   - Is the problem clearly stated?
   - Are domain-specific terms explained?
   - Is the importance justification clear?

3. **Existing Methods Section**
   - Are baseline methods properly introduced?
   - Are limitations explained in accessible terms?
   - Are technical comparisons clear?

4. **Method Section**
   - Are all method components clearly defined?
   - Is the algorithm/process described accessibly?
   - Are technical decisions justified clearly?

5. **Evaluation Section**
   - Are metrics clearly defined?
   - Are experimental terms explained?
   - Are results presented clearly?

## Output Format

### Summary Report

After analyzing the paper, provide a summary:

```markdown
## Clarity Check Summary

**Paper**: [Paper title]
**Target Audience**: [Inferred audience level]
**Total Clarity Issues Found**: X
- Critical: Y
- Major: Z
- Minor: W

### By Category:
1. **Undefined Terms**: X instances
2. **Vaguely Defined Terms**: X instances
3. **Inconsistent Term Usage**: X instances
4. **Acronym/Abbreviation Issues**: X instances
5. **Ambiguous References**: X instances
6. **Vague Quantifiers/Qualifiers**: X instances
7. **Missing Context/Background**: X instances
8. **Sentence-Level Clarity Issues**: X instances

### Term Dictionary:
[List of all technical terms with their definitions and first use locations]

### Acronym List:
[All acronyms with expansions and first use locations]

### Priority Fixes:
1. [Highest severity issue]
2. [Second highest]
3. [Third highest]

### Strengths:
- [What clarity aspects are well-done]
```

### Inline Comments

Insert detailed HTML comments at problematic locations following the comment structure defined above. All comments must:
- Start with `<!-- AI Comments:`
- Include the marker `**AI-GENERATED CLARITY ANALYSIS - FOR AUTHOR REVIEW**`
- End with `**END AI-GENERATED CLARITY ANALYSIS**` before the closing `-->`

## Example Output

### Example 1: Undefined Term

```
<!-- AI Comments: 
**AI-GENERATED CLARITY ANALYSIS - FOR AUTHOR REVIEW**

[CLARITY ISSUE TYPE]
Undefined Term: Technical Term Without Definition

[LOCATION]
Section: Insight > Insight的具体描述
Text: "我们发现传统入侵检测系统忽略了攻击行为的时序关联特性，导致对高级持续性威胁(APT)的检测率低下"

[PROBLEM DESCRIPTION]
The term "时序关联特性" (temporal correlation characteristics) is a technical concept used without definition. Readers may not understand what specific temporal correlations are being referred to or why they are important.

[DETECTED ISSUE]
Missing definition for "时序关联特性". The term appears for the first time without explanation of what temporal correlations in attack behavior mean, how they manifest, or why they matter for detection.

[READER IMPACT]
Readers unfamiliar with temporal analysis in security will not understand the core insight. This is the foundational concept of the paper and must be clearly defined.

[SUGGESTED FIX]
Add a definition before or immediately after first use:
"时序关联特性指攻击行为在不同时间阶段之间的关联关系，例如侦察阶段与渗透阶段的因果关系。传统方法孤立分析每个阶段的攻击，忽略了这些时序上的关联。"

Alternative: Provide an example:
"例如，攻击者在侦察阶段收集的信息往往决定了后续渗透阶段的目标选择，这种跨阶段的关联即为时序关联特性。"

[SEVERITY]
Critical - This is the core concept of the paper and must be clearly defined for readers to understand the entire work.

**END AI-GENERATED CLARITY ANALYSIS**
-->
```

### Example 2: Unexpanded Acronym

```
<!-- AI Comments: 
**AI-GENERATED CLARITY ANALYSIS - FOR AUTHOR REVIEW**

[CLARITY ISSUE TYPE]
Acronym Issue: Unexpanded Acronym

[LOCATION]
Section: 解决什么问题 > 问题为什么重要
Text: "APT攻击造成的平均损失超过250万美元"

[PROBLEM DESCRIPTION]
The acronym "APT" is used without expansion. While common in security literature, it should be expanded on first use for readers unfamiliar with the term.

[DETECTED ISSUE]
"APT" appears without prior expansion. First use should include the full term.

[READER IMPACT]
Readers not familiar with security terminology will not understand what type of attack is being discussed.

[SUGGESTED FIX]
Expand on first use:
"高级持续性威胁(Advanced Persistent Threat, APT)攻击造成的平均损失超过250万美元"

Or if defined earlier, verify the definition is prominent:
Ensure APT is defined in a visible location before this use.

[SEVERITY]
Major - APT is a key term for this paper and should be clearly introduced.

**END AI-GENERATED CLARITY ANALYSIS**
-->
```

### Example 3: Ambiguous Reference

```
<!-- AI Comments: 
**AI-GENERATED CLARITY ANALYSIS - FOR AUTHOR REVIEW**

[CLARITY ISSUE TYPE]
Ambiguous Reference: Ambiguous Pronoun

[LOCATION]
Section: 整体方法设计 > 模块间的逻辑联系
Text: "威胁评估模块的反馈用于优化行为提取模块的阈值，这提升了整体检测效果"

[PROBLEM DESCRIPTION]
The pronoun "这" (this) is ambiguous. It could refer to "反馈" (feedback), "优化" (optimization), or the entire preceding clause.

[DETECTED ISSUE]
"这" could mean:
1. The feedback itself
2. The optimization process
3. The use of feedback for optimization

[READER IMPACT]
Readers may be uncertain about what exactly improves detection effectiveness.

[SUGGESTED FIX]
Replace the ambiguous pronoun with explicit reference:
Option 1: "威胁评估模块的反馈用于优化行为提取模块的阈值，这种反馈机制提升了整体检测效果"
Option 2: "威胁评估模块的反馈用于优化行为提取模块的阈值，从而提升整体检测效果"
Option 3: "威胁评估模块的反馈用于优化行为提取模块的阈值，这种优化提升了整体检测效果"

[SEVERITY]
Minor - The meaning can be inferred but could be clearer.

**END AI-GENERATED CLARITY ANALYSIS**
-->
```

### Example 4: Vague Quantifier

```
<!-- AI Comments: 
**AI-GENERATED CLARITY ANALYSIS - FOR AUTHOR REVIEW**

[CLARITY ISSUE TYPE]
Vague Quantifier: Vague Quantity

[LOCATION]
Section: 现有方法局限 > 存在的共性技术局限
Text: "传统方法误报率高达90%，大量误报会淹没真实攻击告警"

[PROBLEM DESCRIPTION]
"大量" (large amount/many) is vague. While the 90% figure is provided, the subsequent claim about "大量误报" lacks specificity.

[DETECTED ISSUE]
"大量误报" is imprecise. How many is "large"? What is the threshold?

[READER IMPACT]
Readers cannot assess the scale of the problem or the effectiveness of solutions that claim to address it.

[SUGGESTED FIX]
Replace vague quantifier with specific data:
Option 1: "传统方法误报率高达90%，每天产生数万条误报告警，淹没了真实攻击告警"
Option 2: "传统方法误报率高达90%，导致安全团队需要处理超过1000条/天的误报"
Option 3: If specific numbers are unavailable, provide relative context: "传统方法误报率高达90%，意味着每10条告警中有9条是误报，严重干扰了安全分析"

[SEVERITY]
Major - Quantitative claims need specific support for credibility.

**END AI-GENERATED CLARITY ANALYSIS**
-->
```

### Example 5: Inconsistent Term Usage

```
<!-- AI Comments: 
**AI-GENERATED CLARITY ANALYSIS - FOR AUTHOR REVIEW**

[CLARITY ISSUE TYPE]
Inconsistent Term Usage: Same Term, Different Meaning

[LOCATION]
Section: 各模块情况 > 模块1
Text: "系统需要在日志产生后1秒内完成攻击链分析"

[PROBLEM DESCRIPTION]
The term "系统" (system) has been used to refer to both:
1. The proposed attack detection system (Section 3-4)
2. The overall network/system being monitored (Section 1)

This usage appears to refer to the proposed detection system, but this is inconsistent with earlier usage in Section 1 where "系统" referred to the monitored network.

[DETECTED ISSUE]
Term "系统" shifts meaning. In 问题定义 section, "企业网络环境中的系统" refers to the target systems being protected. In this section, "系统" refers to the detection tool being proposed.

[READER IMPACT]
Readers may be confused about whether this refers to the proposed tool or the target environment.

[SUGGESTED FIX]
Use consistent terminology:
- For the proposed tool: "检测系统" (detection system), "本方法" (our method), or "攻击链分析系统"
- For the target environment: "目标网络" (target network), "被监控系统" (monitored system), or "企业系统"

[SEVERITY]
Major - Inconsistent terminology confuses readers about the subject of discussion.

**END AI-GENERATED CLARITY ANALYSIS**
-->
```

## Common Patterns

### Pattern 1: First-Time Term Introduction

When a technical term appears for the first time:
- Check if it's defined or explained
- Check if definition is accessible to target audience
- Check if definition appears before usage in complex contexts
- Consider if an example would help

### Pattern 2: Acronym Management

For papers with many acronyms:
- Check if all are expanded on first use
- Consider suggesting an acronym table for papers with 5+ acronyms
- Verify consistency of expansion throughout
- Check if acronyms are used consistently after introduction

### Pattern 3: Cross-Section Term Consistency

When checking term consistency:
- Build a term dictionary as you read
- Note all synonyms used for key concepts
- Check if the same concept is referred to differently
- Ensure mathematical notation is consistent

### Pattern 4: Audience-Appropriate Explanations

Consider the target audience:
- For general CS audience: define domain-specific terms
- For specialized venue: less common terms still need definition
- For cross-domain work: explain terms from both domains
- Always define novel terms introduced by the paper

### Pattern 5: Definition Quality

When checking definitions:
- Avoid circular definitions (using the term to define itself)
- Ensure definitions are complete (cover key aspects)
- Ensure definitions are precise (not overly broad)
- Provide examples for complex concepts
- Consider if formal definition + intuitive explanation works best

## Important Notes

1. **All comments are AI-generated**: Every comment inserted by this skill is generated by AI analysis and must be clearly marked with "AI Comments:". These are NOT human reviewer feedback and should not be treated as such.

2. **Consider target audience**: What is unclear depends on who is reading. Adjust expectations based on venue and stated audience.

3. **Distinguish "undefined" from "obscure"**: A term may be defined but in an obscure location. Check if definition is findable.

4. **Prioritize by impact**: Terms central to the paper's contribution are highest priority for clarity.

5. **Be practical**: Not every common term needs definition. Focus on terms specific to the work or potentially unfamiliar.

6. **Check definition quality**: Just because a term is "defined" doesn't mean the definition is clear or complete.

7. **Authors should review all AI suggestions**: AI-generated comments are suggestions for consideration. Authors should evaluate whether their target audience would benefit from additional clarification.

8. **Balance clarity and conciseness**: Some repetition or verbosity in the name of clarity is acceptable, but avoid being patronizing.

9. **Consider paper structure**: Key terms should be defined where readers will find them, not buried in unrelated sections.

10. **Check figures and tables**: Terms in figures/tables should also be defined or self-explanatory.

## Detection Checklist

Use this checklist during analysis:

### Term Definitions
- [ ] All technical terms defined on first use
- [ ] Definitions are clear and complete
- [ ] Definitions are accessible to target audience
- [ ] Novel terms are prominently explained
- [ ] Mathematical notation defined before use

### Acronyms
- [ ] All acronyms expanded on first use
- [ ] Acronym expansions consistent
- [ ] Uncommon abbreviations explained
- [ ] Consider acronym table for many acronyms

### Term Consistency
- [ ] Same term used consistently throughout
- [ ] Different terms for same concept explained or unified
- [ ] Notation used consistently
- [ ] No terminology drift

### References and Pronouns
- [ ] All pronouns have clear antecedents
- [ ] Demonstratives clearly refer to specific things
- [ ] Referents are close to references
- [ ] No ambiguous references

### Quantifiers and Qualifiers
- [ ] Vague quantities backed by numbers
- [ ] Vague degrees backed by metrics
- [ ] Subjective terms defined or explained
- [ ] Hedging is appropriate

### Context and Background
- [ ] Prerequisite knowledge stated or referenced
- [ ] Motivation clear for each component
- [ ] Comparison context provided
- [ ] Domain-specific conventions explained

### Sentence Clarity
- [ ] Sentences are reasonable length
- [ ] Subjects clearly identified
- [ ] Modifiers clearly attached
- [ ] Sentence structure parseable
