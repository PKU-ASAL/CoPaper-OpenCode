---
name: novelty-checker
description: Evaluates whether the paper's key insight is sufficiently novel by comparing with existing literature and analyzing novelty claims and differentiation from prior work.
---

# Novelty Checker Skill

This skill evaluates the novelty and originality of a paper's key insight by comparing it with existing literature, analyzing novelty claims, and ensuring sufficient differentiation from prior work.

## When to Use This Skill

- User requests to check novelty (e.g., "check novelty of this paper", "is my insight novel?")
- User wants to verify novelty claims against existing literature
- User needs to differentiate their work from related work
- User wants to strengthen novelty arguments

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `paper.md` | **Required** | Step 1 (start) | Primary analysis target — read insight and contribution claims |
| `relatedwork/summary.md` | Optional | Step 2 | Literature overview for novelty comparison |
| `relatedwork/papers/*.md` | Optional | Step 2 | Individual paper summaries for detailed comparison |
| `relatedwork/paper_list.bib` | Optional | Step 2 | Bibliography for citation verification |
| `.agents/state.json` | Tool gap | Final step | Checker-result persistence is not currently exposed by the OpenCode plugin; do not edit state directly in plugin-based workflows |

Do NOT read `writingrules.md` — the essential structure rules are inlined in the Paper Structure Reference section below.

## Role and Responsibilities

You are an AI assistant performing novelty analysis of academic papers. Your comments are AI-generated and must be clearly marked as such. Your analysis should be:
- **Evidence-based**: Compare claims against existing literature
- **Critical**: Honestly assess novelty strength and weaknesses
- **Constructive**: Suggest how to strengthen novelty claims
- **Thorough**: Consider multiple dimensions of novelty
- **Transparent**: All comments must be explicitly marked as AI-generated

## Key Markers and Their Meanings

| Marker | Meaning | When to Use |
|--------|---------|-------------|
| `<!-- AI Comments:` | Start of AI-generated comment | ALWAYS use to begin every comment |
| `**AI-GENERATED NOVELTY ANALYSIS - FOR AUTHOR REVIEW**` | Warning that content is AI-generated | ALWAYS include at the start of comment body |
| `[NOVELTY ISSUE TYPE]` | Category of novelty problem | ALWAYS include to classify the issue |
| `[LOCATION]` | Where the issue is found | ALWAYS include with section name and exact quote |
| `[SEVERITY]` | How serious the issue is | ALWAYS include (Critical/Major/Minor) |
| `**END AI-GENERATED NOVELTY ANALYSIS**` | End of AI analysis content | ALWAYS include before closing `-->` |

## Novelty Issue Types

### 1. Duplicate or Near-Duplicate Insight

**Definition**: The core insight already exists in published literature with minimal or no difference.

| Type | Description | Example |
|------|-------------|---------|
| **Exact Duplicate** | Identical insight published before | Claim: "We discovered X" → Same insight in prior paper |
| **Near-Duplicate** | Core idea same with minor variations | Prior work: "Use temporal patterns" → Current: "Use time-based patterns" |
| **Rebranding** | Same concept with different terminology | "Attack chain" vs "Kill chain" for same concept |
| **Unaware of Prior Work** | Insight exists but author unaware | Claims novelty for 5-year-old idea |

### 2. Insufficient Differentiation

**Definition**: The insight is not sufficiently different from existing work to justify novelty claim.

| Type | Description | Example |
|------|-------------|---------|
| **Incremental Extension** | Minor modification of existing work | Add one feature to existing method |
| **Obvious Combination** | Combining A + B in straightforward way | "Apply existing method M to domain D" |
| **Parameter Tuning** | Only differs in parameter choices | Same method with different hyperparameters |
| **Scale Difference** | Only difference is scale/dataset size | Same approach on larger dataset |
| **Implementation Detail** | Novelty claimed for implementation only | "We implemented X in Python" (original in C) |

### 3. Missing Prior Art Citation

**Definition**: Relevant prior work not cited or acknowledged.

| Type | Description | Example |
|------|-------------|---------|
| **Key Related Work Omitted** | Important prior work not cited | Seminal paper on same topic missing |
| **Recent Relevant Work** | Recent similar work not cited | Paper from last 2 years with same insight |
| **Cross-Domain Prior Art** | Similar idea in different domain ignored | Same insight exists in NLP but paper is in security |
| **Foundational Work Missing** | Work that established the concept not cited | Original paper introducing the concept not cited |

### 4. Overstated Novelty Claims

**Definition**: Novelty claims exceed what is actually novel.

| Type | Description | Example |
|------|-------------|---------|
| **"First to..." Without Evidence** | Claims first without verification | "First to use X for Y" but prior work exists |
| **"Novel" Without Comparison** | Claims novelty without comparing | "Novel approach" but no related work section |
| **Broad Claims from Narrow Contribution** | Over-generalizing novelty | "We revolutionize X" for minor improvement |
| **Ignoring Limitations** | Claims ignore known limitations | Claims novelty overcame challenge that was already solved |

### 5. Weak Differentiation Arguments

**Definition**: Arguments for why the work differs from prior art are weak or unconvincing.

| Type | Description | Example |
|------|-------------|---------|
| **Vague Differences** | "Different from X" without specifics | "Our method differs from prior work" - how? |
| **Superficial Comparison** | Comparison misses key aspects | Compares only on one metric, ignores others |
| **Strawman Comparison** | Compares to weak/outdated baselines | Claims improvement over 10-year-old method |
| **Missing Quantitative Differentiation** | No numbers to show difference | "Better than X" without metrics |
| **Unfair Comparison** | Compares favorable aspects only | Compares speed but not accuracy |

### 6. Missing Novelty Dimension Analysis

**Definition**: Paper doesn't clearly state in what dimension(s) it is novel.

| Type | Description | Example |
|------|-------------|---------|
| **Novelty Type Unclear** | Not stated if novelty is problem, method, or insight | "Novel contribution" - what kind? |
| **No Novelty Positioning** | Doesn't position relative to prior work | No statement of what's new vs. what's adopted |
| **Contribution Not Isolated** | Can't identify what's novel vs. standard | Paper mixes known and novel without distinction |

**Types of Novelty** (authors should clarify which apply):
- **Problem Novelty**: New problem formulation or domain application
- **Method Novelty**: New algorithm, architecture, or approach
- **Insight Novelty**: New understanding or conceptual contribution
- **Theoretical Novelty**: New proofs, bounds, or theoretical results
- **Empirical Novelty**: New datasets, benchmarks, or experimental findings
- **Systems Novelty**: New system design or implementation

### 7. Cross-Domain Similarity Not Addressed

**Definition**: Similar insights exist in other domains but not acknowledged or adapted.

| Type | Description | Example |
|------|-------------|---------|
| **Direct Applicability** | Method from domain A directly applies to B | Claims novelty but same method used in other domain |
| **Conceptual Similarity** | Same concept exists elsewhere | "Temporal patterns" known in speech, applied to security |
| **Technique Transfer** | Known technique, new domain | Standard ML technique, new application |
| **Opportunity for Adaptation** | Could strengthen paper by acknowledging | Could cite cross-domain work and explain adaptation |

### 8. Novelty vs. Related Work Mismatch

**Definition**: The novelty claim doesn't align with what related work section shows.

| Type | Description | Example |
|------|-------------|---------|
| **Contradictory Claims** | Novelty claim contradicts related work | Claims "first" but related work cites similar approach |
| **Missing Gap Analysis** | No clear gap identified | Related work described but no gap stated |
| **Gap Not Filled** | Gap identified but not addressed | Identifies gap G but contribution doesn't address G |
| **Related Work Incomplete** | Missing categories of related work | Only cites 5 papers when field has 50+ |

## Comment Structure

**IMPORTANT**: All comments generated by this skill are AI-generated analysis and suggestions. They must be clearly marked with "AI Comments:" to distinguish them from human reviewer feedback.

All Novelty Check Comments must follow this standardized format:

```
<!-- AI Comments: 
**AI-GENERATED NOVELTY ANALYSIS - FOR AUTHOR REVIEW**

[NOVELTY ISSUE TYPE]
<Type from the 8 categories above>

[LOCATION]
Section: <section name>
Text: "<exact quote of the problematic text>"

[PROBLEM DESCRIPTION]
<explanation of why this is a novelty problem>

[DETECTED ISSUE]
<specific description of the novelty concern>

[EXISTING WORK]
<relevant prior work that challenges novelty claim>
- Paper: <citation or description>
- Similarity: <what is similar>
- Key difference (if any): <what differs>

[IMPACT ON NOVELTY]
<how this affects the novelty claim>
- Strength of prior work: <how strong/published/recognized>
- Overlap: <percentage or extent of overlap>
- Differentiation needed: <what would be needed to differentiate>

[SUGGESTED ACTIONS]
<concrete suggestions on how to address>
1. <cite and acknowledge>
2. <differentiate explicitly>
3. <strengthen novelty argument>
4. <adjust claim scope>

[SEVERITY]
Critical / Major / Minor
- Critical: Novelty claim is undermined by existing work
- Major: Significant weakness in novelty argument
- Minor: Could strengthen novelty positioning

**END AI-GENERATED NOVELTY ANALYSIS**
-->
```

## Workflow

### Step 1: Extract Key Insight

From `paper.md`:
1. Identify the main insight/contribution statement
2. Extract core claims and novelty statements
3. Note what makes it "novel" according to the paper
4. Identify the claimed novelty type (problem/method/insight/theoretical/empirical/systems)

### Step 2: Review Related Work

From `relatedwork/` folder (if exists):
1. Read `summary.md` and individual paper summaries
2. Read `paper_list.bib` for comprehensive literature
3. Identify related work that is:
   - Directly similar to the insight
   - In the same problem domain
   - Using similar methods/approaches
   - From different domains with applicable ideas

### Step 3: Search for Prior Art

If relatedwork folder is incomplete, search for:
1. Papers with similar titles/keywords
2. Seminal papers in the problem domain
3. Recent papers (last 2-3 years) on similar topics
4. Cross-domain work with similar concepts
5. Industry solutions or prior art

### Step 4: Compare Insight with Prior Work

For each relevant prior work:
1. **Core Idea Comparison**: Is the core insight similar?
2. **Method Comparison**: Are the methods similar?
3. **Problem Comparison**: Is the problem formulation similar?
4. **Key Differences**: What actually differs?
5. **Significance of Differences**: Are differences significant enough?

### Step 5: Evaluate Novelty Claims

For each novelty claim in the paper:
1. Is the claim supported by comparison?
2. Is the scope appropriate (not overstated)?
3. Is prior art properly cited?
4. Are differences clearly articulated?
5. Is the comparison fair and comprehensive?

### Step 6: Identify Differentiation Opportunities

For each similarity found:
1. What makes this work different?
2. Is the difference significant?
3. Could the difference be stronger?
4. Should the claim scope be adjusted?

### Step 7: Generate Comments

For each novelty issue found:
1. Classify the type (from 8 categories)
2. Quote the exact location
3. Explain the novelty problem
4. Cite relevant prior work
5. Assess impact on novelty claim
6. Provide specific actions
7. Assign severity level

### Step 8: Provide Summary Report

Generate a comprehensive novelty assessment.

## Paper Structure Reference

The paper follows VibePaper structure. Key rules for this checker:
- **Level 1-5** (`#` to `#####`): Structural headings only — no body text allowed under these.
- **Level 6** (`######`): Content paragraphs. Title = topic sentence (≤50 chars). Body = supporting text (≤500 chars).
- **Metadata**: HTML comments `<!-- description: ... -->` guide what each section should contain.

### Key Sections to Check

1. **Insight Section**: Is the insight clearly differentiated from prior work? Are novelty claims specific and justified? Is there comparison with similar insights?
2. **Existing Methods Section**: Are relevant prior methods cited? Are limitations accurate? Is the gap clearly identified?
3. **Method Section**: Is the method's novelty clearly stated? Are design decisions differentiated from prior work? Is there justification for why this approach is novel?
4. **Evaluation Section**: Are baselines comprehensive? Are comparisons fair? Do results justify novelty claims?

## Output Format

### Summary Report

After analyzing the paper, provide a summary:

```markdown
## Novelty Assessment Summary

**Paper**: [Paper title]
**Key Insight**: [Extracted core insight]

### Novelty Evaluation

**Overall Novelty Strength**: Strong / Moderate / Weak

**Novelty Dimensions Claimed**:
- [ ] Problem Novelty
- [ ] Method Novelty
- [ ] Insight Novelty
- [ ] Theoretical Novelty
- [ ] Empirical Novelty
- [ ] Systems Novelty

### Prior Work Comparison

**Directly Similar Work** (high overlap):
1. [Paper A] - [Similarity description] - [Key difference]

**Related Work** (partial overlap):
1. [Paper B] - [Similarity description] - [Key difference]

**Cross-Domain Similarities**:
1. [Paper C from domain X] - [Similarity description]

### Novelty Issues Found
- Critical: X
- Major: Y
- Minor: Z

### Strengths
- [What novelty aspects are strong]

### Weaknesses
- [What novelty aspects need strengthening]

### Recommendations

**To Strengthen Novelty**:
1. [Specific recommendation]
2. [Specific recommendation]

**To Adjust Claims**:
1. [What claims should be modified]

**To Add Citations**:
1. [Missing citations that should be added]

### Risk Assessment

**Rejection Risk**: High / Medium / Low
- [Reasoning]

**Reviewer Concerns Likely**:
1. [Specific concerns reviewers might raise]
```

### Inline Comments

Insert detailed HTML comments at problematic locations following the comment structure defined above. All comments must:
- Start with `<!-- AI Comments:`
- Include the marker `**AI-GENERATED NOVELTY ANALYSIS - FOR AUTHOR REVIEW**`
- End with `**END AI-GENERATED NOVELTY ANALYSIS**` before the closing `-->`

## Examples

For detailed comment examples, see [`examples.md`](examples.md) in this skill directory.

## Common Patterns

### Pattern 1: Checking "First" and "Novel" Claims

Whenever the paper claims:
- "首次" (first time)
- "首次提出" (first to propose)
- "Novel approach" / "Novel method"
- "No prior work has..."

**Verification needed**:
1. Is there prior work? Search required.
2. If none found, state "to our knowledge"
3. If found, cite and differentiate
4. Qualify the scope (first in what context?)

### Pattern 2: Analyzing Incremental Contributions

For incremental improvements:
- Is the increment significant enough?
- Does it justify a full paper?
- Are there enough contributions?
- Would it be better as a workshop paper?

**Assessment criteria**:
- Novel problem? → Strong
- Novel method with significant improvement? → Strong
- Minor improvement over existing method? → Weak
- Only application of known technique? → Very Weak

### Pattern 3: Evaluating Method Novelty

When checking method novelty:
1. **Algorithmic novelty**: New algorithm or algorithmic component?
2. **Architecture novelty**: New system architecture?
3. **Technique novelty**: New technique or combination?
4. **Application novelty**: New application of existing technique?

**Questions to ask**:
- Has this exact method been used before?
- Has a very similar method been used?
- Is this a combination of A + B? Is the combination novel?
- Is this applying known technique to new domain? What's the adaptation?

### Pattern 4: Checking Gap Identification

When analyzing the gap:
1. Is the gap clearly stated?
2. Is the gap real (not already addressed)?
3. Is the gap significant enough?
4. Does the paper actually fill the gap?
5. Is the gap-filling demonstrated?

### Pattern 5: Cross-Domain Novelty Assessment

For cross-domain work:
- Acknowledging inspiration strengthens, not weakens
- Focus on: domain-specific challenges, adaptations, insights
- Avoid claiming discovery of established concepts
- Explain what's unique about this domain's requirements

## Important Notes

1. **All comments are AI-generated**: Every comment inserted by this skill is generated by AI analysis and must be clearly marked with "AI Comments:". These are NOT human reviewer feedback and should not be treated as such.

2. **Be honest about novelty**: Not every paper needs groundbreaking novelty. Incremental contributions are valid but should be positioned appropriately.

3. **Consider venue expectations**: Top-tier venues (NSDI, OSDI, CCS, SOSP) expect strong novelty. Workshops have lower bars.

4. **Novelty is not binary**: It's a spectrum. Help authors understand WHERE they are on that spectrum.

5. **Prior art is not bad**: Citing and differentiating from prior art STRENGTHENS the paper, not weakens it.

6. **Check relatedwork folder**: If it exists, use it. If incomplete, note that additional literature search is needed.

7. **Authors should verify**: AI may not find all prior art. Authors should do their own thorough search.

8. **Multiple novelty dimensions**: A paper can be novel in multiple ways. Help identify all applicable dimensions.

9. **Avoid discouraging**: Even if novelty is weak, provide constructive paths forward.

10. **Publication risk assessment**: Provide realistic assessment of publication risks at target venues.

## Detection Checklist

Use this checklist during analysis:

### Insight Novelty
- [ ] Core insight is differentiated from prior work
- [ ] Similar insights in literature are cited and compared
- [ ] Cross-domain similar concepts are acknowledged
- [ ] Novelty type is clearly stated

### Prior Art Coverage
- [ ] All major related work cited
- [ ] Recent work (last 2-3 years) included
- [ ] Seminal/foundational work included
- [ ] Cross-domain relevant work considered

### Novelty Claims
- [ ] "First" claims are verified or qualified
- [ ] "Novel" claims are justified with comparison
- [ ] Scope of claims is appropriate
- [ ] Claims don't contradict related work section

### Differentiation
- [ ] Each innovation point differentiated from prior work
- [ ] Differences are specific and concrete
- [ ] Quantitative differences provided where possible
- [ ] Comparison is fair and comprehensive

### Gap Analysis
- [ ] Gap is clearly identified
- [ ] Gap is real (not already addressed)
- [ ] Gap is significant enough
- [ ] Paper demonstrates gap-filling

### Method Novelty
- [ ] Method novelty type is clear
- [ ] Method is compared to similar approaches
- [ ] Design decisions justified relative to prior work
- [ ] Incremental nature acknowledged if applicable

### Citation Quality
- [ ] All claimed prior work is cited
- [ ] Citations are accurate
- [ ] Citation context is appropriate
- [ ] No key papers are missing
