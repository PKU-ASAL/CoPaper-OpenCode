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

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `paper.md` | **Required** | Step 1 (start) | Primary analysis target |
| `.agents/state.json` | Write-only | Final step | Persist checker results |

Do NOT read `writingrules.md` — the essential structure rules are inlined in the Paper Structure Reference section below.

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

## Paper Structure Reference

The paper follows VibePaper structure. Key rules for this checker:
- **Level 1-5** (`#` to `#####`): Structural headings only — no body text allowed under these.
- **Level 6** (`######`): Content paragraphs. Title = topic sentence (≤50 chars). Body = supporting text (≤500 chars).
- **Metadata**: HTML comments `<!-- description: ... -->` guide what each section should contain.

### Key Sections to Check

1. **Insight Section**: Is the insight clearly defined? Are all terms defined? Is the core concept accessible?
2. **Problem Section**: Is the problem clearly stated? Are domain-specific terms explained? Is the importance justification clear?
3. **Existing Methods Section**: Are baseline methods properly introduced? Are limitations explained in accessible terms? Are technical comparisons clear?
4. **Method Section**: Are all method components clearly defined? Is the algorithm/process described accessibly? Are technical decisions justified clearly?
5. **Evaluation Section**: Are metrics clearly defined? Are experimental terms explained? Are results presented clearly?

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

## Examples

For detailed comment examples, see [`examples.md`](examples.md) in this skill directory.

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
