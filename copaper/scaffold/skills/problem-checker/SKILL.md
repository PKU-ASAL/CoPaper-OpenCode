---
name: problem-checker
description: Evaluates whether the problem is clearly defined, and whether its importance and practicalness are thoroughly supported with evidence.
---

# Problem Checker Skill

This skill evaluates whether the problem addressed by a research paper is clearly defined, and whether its importance and practicalness are thoroughly supported with concrete evidence.

## When to Use This Skill

- User requests to check problem definition (e.g., "check my problem definition", "is my problem clearly defined?")
- User wants to verify problem importance is well-justified
- User needs to ensure practical relevance is demonstrated
- User wants to strengthen problem motivation

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `paper.md` | **Required** | Step 1 (start) | Primary analysis target — read problem-related sections |
| `.agents/state.json` | Tool gap | Step 9 (end) | Checker-result persistence is not currently exposed by the OpenCode plugin; do not edit state directly in plugin-based workflows |

Do NOT read `writingrules.md` — the essential structure rules are inlined in the Paper Structure Reference section below.

## Role and Responsibilities

You are an AI assistant performing problem definition analysis of academic papers. Your comments are AI-generated and must be clearly marked as such. Your analysis should be:
- **Rigorous**: Assess against research methodology standards
- **Evidence-based**: Check if claims are supported by data/citations
- **Critical**: Honestly evaluate whether problem is well-motivated
- **Constructive**: Suggest how to strengthen problem justification
- **Transparent**: All comments must be explicitly marked as AI-generated

## Key Markers and Their Meanings

| Marker | Meaning | When to Use |
|--------|---------|-------------|
| `<!-- AI Comments:` | Start of AI-generated comment | ALWAYS use to begin every comment |
| `**AI-GENERATED PROBLEM ANALYSIS - FOR AUTHOR REVIEW**` | Warning that content is AI-generated | ALWAYS include at the start of comment body |
| `[PROBLEM ISSUE TYPE]` | Category of problem definition issue | ALWAYS include to classify the issue |
| `[LOCATION]` | Where the issue is found | ALWAYS include with section name and exact quote |
| `[SEVERITY]` | How serious the issue is | ALWAYS include (Critical/Major/Minor) |
| `**END AI-GENERATED PROBLEM ANALYSIS**` | End of AI analysis content | ALWAYS include before closing `-->` |

## Problem Definition Issue Types

### 1. Unclear Problem Statement

**Definition**: The problem is not clearly or precisely defined, making it difficult to understand what the paper addresses.

| Type | Description | Example |
|------|-------------|---------|
| **Vague Problem Description** | Problem stated in vague terms | "We address the security problem" without specifics |
| **Missing Problem Scope** | Boundaries of problem not defined | What's included/excluded unclear |
| **Ambiguous Problem Object** | What is being improved unclear | "We improve detection" - detection of what? |
| **Multiple Unrelated Problems** | Paper claims to solve multiple disconnected issues | "We solve X and Y and Z" where X, Y, Z are unrelated |
| **Problem-Method Confusion** | Problem confused with solution | "Our problem is to design a GNN" (that's a method) |

### 2. Missing Problem Formalization

**Definition**: The problem lacks formal or precise definition necessary for research.

| Type | Description | Example |
|------|-------------|---------|
| **No Formal Definition** | Problem only described informally | No mathematical/system definition |
| **Missing Input/Output Specification** | What system takes in and outputs unclear | No clear I/O specification |
| **Missing Constraints** | Constraints on problem not stated | Real-world constraints ignored |
| **Missing Success Criteria** | How to measure success undefined | No metrics or criteria specified |
| **Missing Assumptions** | Assumptions about context not stated | Hidden assumptions not acknowledged |

### 3. Insufficient Importance Justification

**Definition**: The importance/significance of the problem is not adequately justified.

| Type | Description | Example |
|------|-------------|---------|
| **No Importance Claim** | Importance of problem not stated | Why this problem matters not mentioned |
| **Vague Importance Statement** | Importance claimed without specifics | "This is important" without explanation |
| **Missing Evidence for Importance** | Importance claimed without supporting data | "Critical problem" without citation/data |
| **Opinion-Based Importance** | Importance based only on author opinion | "We think this is important" only |
| **Missing Impact Quantification** | No quantification of problem impact | "Causes huge losses" without numbers |

### 4. Missing Practical Relevance Evidence

**Definition**: The practical relevance/real-world applicability is not demonstrated.

| Type | Description | Example |
|------|-------------|---------|
| **No Practical Context** | Real-world context not provided | Purely theoretical motivation |
| **Missing Industry Need** | No evidence from industry/practitioners | "Practitioners need this" without evidence |
| **Missing Real-World Scenarios** | No concrete use case scenarios | Abstract problem, no examples |
| **Missing Stakeholder Analysis** | Who benefits not identified | No mention of users/stakeholders |
| **Missing Deployment Context** | Where/how it would be used unclear | No deployment scenario described |

### 5. Weak Problem Motivation

**Definition**: The motivation for why this problem needs research attention is weak.

| Type | Description | Example |
|------|-------------|---------|
| **No Problem Urgency** | Why this problem NOW not explained | No timeliness or urgency argument |
| **Missing Gap Identification** | Gap in knowledge/practice not identified | "Problem exists" but no gap shown |
| **Missing Problem Evolution** | How problem evolved/changed not discussed | Problem context missing |
| **Trivial Problem** | Problem may not be significant enough | Solution seems straightforward |
| **Already Solved Problem** | Problem may already have good solutions | Prior work not adequately reviewed |

### 6. Missing Evidence Types

**Definition**: Key types of evidence that should support the problem are missing.

| Type | Description | Example |
|------|-------------|---------|
| **Missing Statistical Evidence** | No quantitative data on problem scale | "Widespread problem" without statistics |
| **Missing Case Studies** | No concrete examples/cases | No illustrative cases provided |
| **Missing Industry Reports** | No industry/agency reports cited | Claim about industry but no industry citation |
| **Missing User Studies** | No user/practitioner input | "Users struggle with X" without user data |
| **Missing Economic Evidence** | No economic/financial impact data | "Costly problem" without cost data |
| **Missing Failure Evidence** | No evidence of existing solution failures | No analysis of why current approaches fail |

### 7. Problem-Solution Mismatch

**Definition**: The problem definition doesn't align with what the paper actually solves.

| Type | Description | Example |
|------|-------------|---------|
| **Stated vs. Solved Mismatch** | Problem described differs from what's addressed | Claims to solve X, actually solves Y |
| **Overclaimed Problem Scope** | Problem scope larger than what's addressed | Claims broad problem, solves narrow case |
| **Missing Problem Subtypes** | Problem has variants but only one addressed | Complex problem, only one variant solved |
| **Solution Doesn't Address Core Issue** | Solution targets peripheral aspect | Core problem remains unaddressed |

### 8. Incomplete Problem Context

**Definition**: The context surrounding the problem is incomplete.

| Type | Description | Example |
|------|-------------|---------|
| **Missing Domain Context** | Domain-specific context not provided | Security problem without security context |
| **Missing Temporal Context** | Why this problem NOW not explained | No current relevance argument |
| **Missing Stakeholder Perspective** | Multiple stakeholder views not considered | Only one viewpoint shown |
| **Missing Related Problem Analysis** | How this relates to other problems unclear | Problem in isolation |
| **Missing Problem Dependencies** | Dependencies on other problems not discussed | Problem treated as independent |

## Comment Structure

**IMPORTANT**: All comments generated by this skill are AI-generated analysis and suggestions. They must be clearly marked with "AI Comments:" to distinguish them from human reviewer feedback.

All Problem Check Comments must follow this standardized format:

```
<!-- AI Comments: 
**AI-GENERATED PROBLEM ANALYSIS - FOR AUTHOR REVIEW**

[PROBLEM ISSUE TYPE]
<Type from the 8 categories above>

[LOCATION]
Section: <section name>
Text: "<exact quote of the problematic text>"

[PROBLEM DESCRIPTION]
<explanation of why this is a problem definition issue>

[DETECTED ISSUE]
<specific description of the problem definition concern>

[WHAT'S MISSING]
<specific elements that are absent or insufficient>
- Missing element 1: <description>
- Missing element 2: <description>

[IMPACT ON PAPER]
<how this affects the paper's credibility and motivation>
- Reviewer concern: <what reviewers might question>
- Motivation strength: <how this weakens motivation>
- Research validity: <how this affects validity>

[EVIDENCE EXAMPLES]
<examples of evidence that could strengthen this>
- Type of evidence: <specific example>
- Type of evidence: <specific example>

[SUGGESTED ACTIONS]
<concrete suggestions to strengthen problem definition>
1. <specific action with example>
2. <specific action with example>
3. <specific action with example>

[SEVERITY]
Critical / Major / Minor
- Critical: Problem definition fundamentally flawed or missing
- Major: Significant weakness in problem justification
- Minor: Could strengthen problem motivation

**END AI-GENERATED PROBLEM ANALYSIS**
-->
```

## Workflow

### Step 1: Read Problem Section

From `paper.md`, read the problem-related sections:
1. **问题背景** (Problem Background)
2. **问题定义** (Problem Definition)
3. **问题为什么重要** (Why the Problem is Important)
4. **问题场景** (Problem Scenarios) if present

### Step 2: Extract Problem Statement

Identify:
1. What is the stated problem?
2. What domain does it belong to?
3. What are the boundaries/scope?
4. What are the constraints?
5. What are the success criteria?

### Step 3: Analyze Problem Clarity

Check:
1. Is the problem statement precise and unambiguous?
2. Is there a formal definition?
3. Are inputs/outputs/inputs specified?
4. Are constraints stated?
5. Are assumptions explicit?

### Step 4: Evaluate Importance Justification

For each importance claim:
1. What claim is made about importance?
2. Is there supporting evidence?
3. What type of evidence? (statistics, citations, reports, etc.)
4. Is the evidence credible and sufficient?
5. Is impact quantified?

### Step 5: Assess Practical Relevance

Check:
1. Is real-world context provided?
2. Are concrete scenarios described?
3. Is there evidence from industry/practice?
4. Are stakeholders identified?
5. Is deployment context discussed?

### Step 6: Check Evidence Quality

For each piece of evidence:
1. Is it from a credible source?
2. Is it recent and relevant?
3. Is it specific (not vague)?
4. Does it directly support the claim?
5. Is it quantitative where possible?

### Step 7: Verify Problem-Solution Alignment

Compare:
1. Does the stated problem match what's solved?
2. Is the scope of problem addressed realistic?
3. Are problem variants addressed?

### Step 8: Generate Comments

For each issue found:
1. Classify the type (from 8 categories)
2. Quote the exact location
3. Explain the problem definition issue
4. Describe what's missing
5. Provide evidence examples
6. Suggest specific actions
7. Assign severity level

### Step 9: Provide Summary Report

Generate a comprehensive problem definition assessment.

## Evidence Types for Problem Justification

### Type 1: Statistical Evidence

**What it is**: Quantitative data showing problem scale/frequency

**Examples**:
- "According to [Report], 78% of enterprises experienced APT attacks in 2023"
- "The average cost of data breaches reached $4.35 million (IBM, 2023)"
- "Over 10,000 critical vulnerabilities were disclosed in 2023 (NVD)"

**When to use**: To show problem is widespread, costly, or frequent

### Type 2: Case Study Evidence

**What it is**: Concrete real-world examples of the problem

**Examples**:
- "The SolarWinds attack (2020) demonstrates how APTs evade detection for months"
- "Case study: Company X lost $50M due to delayed attack detection"
- "Notable incidents: Target (2013), Equifax (2017), SolarWinds (2020)"

**When to use**: To make abstract problems concrete and memorable

### Type 3: Industry Report Evidence

**What it is**: Reports from industry analysts, agencies, or organizations

**Sources**:
- Gartner, Forrester (industry analysts)
- Verizon DBIR, IBM X-Force (security reports)
- Government agencies (CISA, NIST)
- Industry consortiums

**Examples**:
- "Gartner predicts that by 2025, 60% of enterprises will..."
- "According to Verizon DBIR 2023, 82% of breaches involved..."

**When to use**: For authoritative backing of problem claims

### Type 4: User/Practitioner Evidence

**What it is**: Evidence from actual users or practitioners facing the problem

**Types**:
- Survey results
- Interview findings
- Practitioner testimonials
- User studies

**Examples**:
- "Our survey of 50 SOC analysts found that 90% struggle with..."
- "Interviews with security teams revealed that average investigation time is..."

**When to use**: To show problem is real from practitioner perspective

### Type 5: Economic/Financial Evidence

**What it is**: Financial impact or economic cost data

**Types**:
- Direct costs (financial losses, remediation costs)
- Indirect costs (productivity loss, reputation damage)
- Market size (industry spending on the problem)

**Examples**:
- "The APT detection market is projected to reach $12B by 2026"
- "Average cost of APT attack: $2.5M (including investigation, remediation, downtime)"

**When to use**: To show economic significance

### Type 6: Failure Evidence

**What it is**: Evidence that existing solutions fail to adequately address the problem

**Types**:
- Performance gaps of current methods
- Documented failures
- Known limitations acknowledged by community

**Examples**:
- "Current IDS solutions have 90% false positive rate (Study X)"
- "Despite advances, average APT detection time remains 287 days (Mandiant, 2023)"

**When to use**: To justify need for new research solution

## Paper Structure Reference

The paper follows CoPaper structure. Key rules for this checker:
- **Level 1-5** (`#` to `#####`): Structural headings only — no body text allowed under these.
- **Level 6** (`######`): Content paragraphs. Title = topic sentence (≤50 chars). Body = supporting text (≤500 chars).
- **Metadata**: HTML comments `<!-- description: ... -->` guide what each section should contain.

### Key Sections to Check

1. **问题背景 (Problem Background)**: Domain context, current trends, problem evolution
2. **问题定义 (Problem Definition)**: Precise definition, boundaries, scope, constraints, formal definition
3. **问题为什么重要 (Why Important)**: Importance claims with evidence, multiple dimensions
4. **问题场景 (Problem Scenarios)**: Concrete scenarios, realistic illustrations

## Output Format

### Summary Report

After analyzing the paper, provide a summary:

```markdown
## Problem Definition Assessment Summary

**Paper**: [Paper title]

### Problem Statement Clarity

**Problem Defined**: Yes / Partially / No

**Problem Statement**: [Extracted problem statement]

**Problem Scope**: Clearly defined / Partially defined / Not defined

**Formal Definition**: Present / Missing

**Clarity Issues**:
- [List clarity issues found]

### Importance Justification

**Importance Claimed**: Yes / No

**Importance Claims**:
1. [Claim 1]
2. [Claim 2]
...

**Evidence Provided**:
- Statistical evidence: Yes/No (examples)
- Case study evidence: Yes/No (examples)
- Industry reports: Yes/No (examples)
- User studies: Yes/No (examples)
- Economic evidence: Yes/No (examples)
- Failure evidence: Yes/No (examples)

**Evidence Quality**:
- Credible sources: Yes/No
- Specific (not vague): Yes/No
- Quantitative: Yes/No
- Recent and relevant: Yes/No

**Missing Evidence Types**:
- [List types of evidence that should be added]

### Practical Relevance

**Real-World Context**: Provided / Partially provided / Not provided

**Concrete Scenarios**: [Number] scenarios described

**Stakeholders Identified**: Yes/No

**Industry Need Demonstrated**: Yes/No

**Deployment Context**: Discussed / Not discussed

### Problem-Solution Alignment

**Alignment**: Strong / Moderate / Weak

**Scope Match**: Problem scope matches solution scope / Mismatch

**Issues**:
- [List alignment issues]

### Problem Definition Issues Found
- Critical: X
- Major: Y
- Minor: Z

### Evidence Coverage Matrix

| Evidence Type | Present? | Quality | Source Credibility |
|---------------|----------|---------|-------------------|
| Statistical | Yes/No | High/Med/Low | Strong/Med/Weak |
| Case Studies | Yes/No | High/Med/Low | Strong/Med/Weak |
| Industry Reports | Yes/No | High/Med/Low | Strong/Med/Weak |
| User Studies | Yes/No | High/Med/Low | Strong/Med/Weak |
| Economic Data | Yes/No | High/Med/Low | Strong/Med/Weak |
| Failure Evidence | Yes/No | High/Med/Low | Strong/Med/Weak |

### Strengths
- [What aspects of problem definition are strong]

### Weaknesses
- [What aspects need improvement]

### Recommendations

**To Improve Clarity**:
1. [Specific recommendation]
2. [Specific recommendation]

**To Strengthen Importance**:
1. [Specific evidence to add]
2. [Specific evidence to add]

**To Demonstrate Practicalness**:
1. [Specific recommendation]
2. [Specific recommendation]

**To Add Missing Evidence**:
1. [Specific evidence type and source]
2. [Specific evidence type and source]

### Risk Assessment

**Reviewer Concerns Likely**:
1. [Specific concerns reviewers might raise]
2. [Specific concerns reviewers might raise]

**Motivation Strength**: Strong / Moderate / Weak
- [Reasoning]
```

### Inline Comments

Insert detailed HTML comments at problematic locations following the comment structure defined above. All comments must:
- Start with `<!-- AI Comments:`
- Include the marker `**AI-GENERATED PROBLEM ANALYSIS - FOR AUTHOR REVIEW**`
- End with `**END AI-GENERATED PROBLEM ANALYSIS**` before the closing `-->`

## Examples

For detailed comment examples, see [`examples.md`](examples.md) in this skill directory.

## Common Patterns

### Pattern 1: Checking Problem Statement Precision

When checking problem clarity, ask:
1. Can someone replicate what problem is being solved?
2. Are boundaries clearly defined?
3. Is there a formal or operational definition?
4. Can you distinguish this problem from related problems?
5. Is the problem object (what's being improved) clear?

### Pattern 2: Evaluating Evidence Quality

For each piece of evidence, check:
1. **Source credibility**: Is the source authoritative? (industry report > blog post)
2. **Specificity**: Is it specific or vague? ("$4.35M" > "huge losses")
3. **Currency**: Is it recent? (< 3 years preferred)
4. **Relevance**: Does it directly support the claim?
5. **Quantification**: Is there a number? (quantified > qualitative)

### Pattern 3: Assessing Practical Relevance

To check practical relevance:
1. Is there a real-world use case?
2. Would practitioners care about this?
3. Are practical constraints discussed?
4. Is deployment scenario described?
5. Are stakeholders identified?

### Pattern 4: Checking Problem Motivation

To evaluate motivation strength:
1. Is there a gap in current knowledge/practice?
2. Is there urgency (why NOW)?
3. Is there evidence of existing solution failures?
4. Is the problem evolving or static?
5. Are there multiple motivation dimensions (practical + theoretical)?

## Important Notes

1. **All comments are AI-generated**: Every comment inserted by this skill is generated by AI analysis and must be clearly marked with "AI Comments:". These are NOT human reviewer feedback and should not be treated as such.

2. **Problem definition is foundational**: Without a clear problem, the entire paper's contribution is unclear. This is critical.

3. **Evidence is essential for importance**: Claims without evidence are opinions. Importance must be demonstrated, not just asserted.

4. **Practical relevance matters**: Papers that lack practical context may be seen as "solutions looking for problems."

5. **Multiple evidence types strengthen**: The strongest problem justifications use multiple evidence types (statistics + case studies + industry reports + etc.)

6. **Align problem with solution**: Overclaiming the problem creates mismatch and damages credibility.

7. **Quantify where possible**: "78% of enterprises" is stronger than "many enterprises."

8. **Use authoritative sources**: Industry reports (Gartner, Forrester), government agencies (CISA, NIST), and well-cited studies carry more weight.

9. **Consider reviewer perspective**: Reviewers will ask "Why should I care?" - answer this preemptively.

10. **Authors should verify**: AI can suggest evidence types, but authors must find and cite actual sources.

## Detection Checklist

Use this checklist during analysis:

### Problem Statement Clarity
- [ ] Problem is precisely stated (not vague)
- [ ] Problem scope and boundaries are defined
- [ ] Problem object (what's being improved) is clear
- [ ] Formal or operational definition provided
- [ ] Input/output/constraints specified
- [ ] Success criteria defined

### Importance Justification
- [ ] Importance is explicitly claimed
- [ ] Each importance claim has supporting evidence
- [ ] Evidence is from credible sources
- [ ] Evidence is specific (quantified where possible)
- [ ] Multiple evidence types used
- [ ] Impact is quantified (cost, frequency, etc.)

### Practical Relevance
- [ ] Real-world context is provided
- [ ] Concrete use case scenarios described
- [ ] Industry need demonstrated
- [ ] Stakeholders identified
- [ ] Deployment context discussed
- [ ] Practical constraints acknowledged

### Problem Motivation
- [ ] Gap in current solutions identified
- [ ] Urgency/timeliness explained
- [ ] Evidence of existing solution failures
- [ ] Problem evolution discussed
- [ ] Multiple motivation dimensions

### Evidence Quality
- [ ] Evidence sources are credible
- [ ] Evidence is recent (< 3 years)
- [ ] Evidence is specific and relevant
- [ ] Quantitative evidence included
- [ ] Multiple evidence types used

### Problem-Solution Alignment
- [ ] Problem scope matches solution scope
- [ ] Stated problem matches what's actually addressed
- [ ] Scope limitations acknowledged
- [ ] No overclaiming of problem scope

### Problem Context
- [ ] Domain context provided
- [ ] Temporal context (why now) explained
- [ ] Multiple stakeholder perspectives considered
- [ ] Related problems discussed
- [ ] Problem dependencies acknowledged
