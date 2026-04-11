---
name: evaluation-protocol-checker
description: Evaluates whether the evaluation protocol has comprehensive research questions that support the main insight and design decisions, and ensures proper handling of threats to validity.
---

# Evaluation Protocol Checker Skill

This skill evaluates the evaluation protocol of a research paper, ensuring it has comprehensive research questions (RQs) that validate the main insight and design decisions, and properly addresses various threats to validity.

## When to Use This Skill

- User requests to check evaluation protocol (e.g., "check evaluation protocol", "are my RQs comprehensive?")
- User wants to verify RQ coverage for insight and design
- User needs to ensure threats to validity are addressed
- User wants to strengthen evaluation rigor

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `paper.md` | **Required** | Step 1 (start) | Primary analysis target |
| `.agents/state.json` | Write-only | Final step | Persist checker results |

Do NOT read `writingrules.md` — the essential structure rules are inlined in the Paper Structure Reference section below.

## Role and Responsibilities

You are an AI assistant performing evaluation protocol analysis of academic papers. Your comments are AI-generated and must be clearly marked as such. Your analysis should be:
- **Rigorous**: Assess against empirical research standards
- **Comprehensive**: Check all aspects of evaluation design
- **Critical**: Honestly evaluate whether evaluation is sufficient
- **Constructive**: Suggest how to strengthen evaluation
- **Transparent**: All comments must be explicitly marked as AI-generated

## Key Markers and Their Meanings

| Marker | Meaning | When to Use |
|--------|---------|-------------|
| `<!-- AI Comments:` | Start of AI-generated comment | ALWAYS use to begin every comment |
| `**AI-GENERATED EVALUATION PROTOCOL ANALYSIS - FOR AUTHOR REVIEW**` | Warning that content is AI-generated | ALWAYS include at the start of comment body |
| `[PROTOCOL ISSUE TYPE]` | Category of evaluation protocol problem | ALWAYS include to classify the issue |
| `[LOCATION]` | Where the issue is found | ALWAYS include with section name and exact quote |
| `[SEVERITY]` | How serious the issue is | ALWAYS include (Critical/Major/Minor) |
| `**END AI-GENERATED EVALUATION PROTOCOL ANALYSIS**` | End of AI analysis content | ALWAYS include before closing `-->` |

## Evaluation Protocol Issue Types

### 1. Missing or Incomplete Research Questions

**Definition**: Research questions are absent, incomplete, or don't comprehensively cover the contribution.

| Type | Description | Example |
|------|-------------|---------|
| **No RQs Stated** | Evaluation without explicit research questions | Experiments described without RQs |
| **Too Few RQs** | RQs don't cover all aspects of contribution | Only performance RQ, no validity RQ |
| **Vague RQs** | RQs are unclear or imprecise | "Does it work?" instead of specific RQ |
| **Misaligned RQs** | RQs don't match the claimed contributions | RQs about X, contribution claims Y |
| **Missing Insight Validation** | No RQ to validate the core insight | Insight claimed but not tested |

### 2. RQ-Insight Misalignment

**Definition**: Research questions don't adequately test or validate the main insight.

| Type | Description | Example |
|------|-------------|---------|
| **Insight Not Testable** | Core insight has no corresponding RQ | Insight: "temporal patterns matter" → No RQ about temporal patterns |
| **Insight Partially Tested** | Only part of insight is tested | Insight has 3 aspects, only 1 tested |
| **Wrong Validation Approach** | RQ tests wrong aspect of insight | Insight about accuracy, RQ only about speed |
| **Missing Insight Conditions** | No RQ about when insight holds/fails | Insight has conditions, conditions not tested |

### 3. RQ-Design Misalignment

**Definition**: Research questions don't validate the key design decisions.

| Type | Description | Example |
|------|-------------|---------|
| **Design Decision Not Justified** | Key design choice has no corresponding RQ | Design uses X, no RQ testing why X over Y |
| **Component Not Evaluated** | Component contribution not tested | Component A in design, no ablation for A |
| **Design Alternative Not Compared** | Alternative designs not compared | Chose approach X, no comparison with Y |
| **Parameter Choice Not Validated** | Parameter choices not justified | Used parameter P, no sensitivity analysis |

### 4. Internal Validity Threats Not Addressed

**Definition**: Threats to internal validity are not identified or mitigated.

| Type | Description | Example |
|------|-------------|---------|
| **No Internal Validity Discussion** | Internal validity not discussed | No mention of confounding factors |
| **Confounding Variables Ignored** | Known confounders not controlled | Variables that could affect results ignored |
| **Implementation Bias** | Different implementation effort for baselines | Own method optimized, baselines not |
| **Selection Bias** | Biased selection of test cases | Cherry-picked favorable test cases |
| **Missing Statistical Testing** | No statistical significance tests | Claims improvement without p-values/CI |
| **Insufficient Repetitions** | Too few runs for statistical power | Single run for stochastic methods |
| **Missing Random Seed Reporting** | Random seeds not reported | Stochastic experiments, seeds not specified |

### 5. External Validity Threats Not Addressed

**Definition**: Threats to generalizability are not identified or mitigated.

| Type | Description | Example |
|------|-------------|---------|
| **No External Validity Discussion** | External validity not discussed | No mention of generalizability limits |
| **Single Dataset** | Only one dataset used | Claim general method, test on 1 dataset |
| **Dataset Not Representative** | Dataset doesn't represent target domain | Claim for "enterprise networks", test on synthetic |
| **Limited Scale Testing** | No scale testing beyond dataset size | Claim scalable, test only at small scale |
| **Domain Generalization Not Tested** | Cross-domain generalization claimed but not tested | Claim works across domains, test in one |
| **Temporal Validity Ignored** | No testing over time/concept drift | Claim long-term use, only snapshot test |

### 6. Construct Validity Threats Not Addressed

**Definition**: Threats to whether measurements actually capture intended concepts are not addressed.

| Type | Description | Example |
|------|-------------|---------|
| **No Construct Validity Discussion** | Construct validity not discussed | No justification of metrics |
| **Metric Misalignment** | Metrics don't match what's claimed | Claim "accurate", measure only speed |
| **Proxy Too Distant** | Proxy metric far from real goal | Claim user satisfaction, measure accuracy |
| **Missing Real-World Metrics** | Only synthetic/idealized metrics | Claim practical value, no real-world metric |
| **Metric Gaming Risk** | Metrics can be gamed easily | Metric can be optimized without real improvement |
| **Multi-objective Trade-offs Ignored** | Single metric when trade-offs exist | Optimize one metric, ignore others |

### 7. Conclusion Validity Threats Not Addressed

**Definition**: Threats to whether conclusions follow from results are not addressed.

| Type | Description | Example |
|------|-------------|---------|
| **No Conclusion Validity Discussion** | Conclusion validity not discussed | No discussion of result interpretation |
| **Over-claiming from Results** | Conclusions exceed what results support | Local result → global claim |
| **Causation Not Established** | Correlation presented as causation | "A improved, therefore A caused improvement" |
| **Alternative Explanations Ignored** | Other explanations not considered | Improvement could be due to X, Y, Z |
| **Missing Negative Result Discussion** | Negative results not discussed | Ignores where method fails |
| **Inappropriate Generalization** | Results generalized beyond scope | Limited test → broad claim |

### 8. Missing Baseline Comparisons

**Definition**: Necessary baseline comparisons are absent or inadequate.

| Type | Description | Example |
|------|-------------|---------|
| **No Baselines** | No comparison with existing methods | Only own method evaluated |
| **Weak Baselines Only** | Only trivial/weak baselines | Compare to simple heuristics only |
| **Outdated Baselines** | Baselines not state-of-the-art | Compare to 10-year-old methods |
| **Missing Relevant Baselines** | Key competitive methods not compared | Known competitor not included |
| **Unfair Baseline Configuration** | Baselines not given fair treatment | Own method optimized, baselines default |
| **Missing Baseline Reproduction** | Baseline numbers from different setups | Can't compare due to different evaluation |

### 9. Inadequate Metric Selection

**Definition**: Metrics are inappropriate, incomplete, or not properly justified.

| Type | Description | Example |
|------|-------------|---------|
| **Missing Key Metrics** | Important metrics not measured | Claim accuracy, don't measure precision/recall |
| **Inappropriate Metrics** | Wrong metrics for the problem | Use accuracy for imbalanced data |
| **Missing Metric Definitions** | Metrics not clearly defined | "Efficiency" without definition |
| **No Metric Justification** | Why these metrics? Not explained | Metrics chosen without rationale |
| **Missing Domain-Specific Metrics** | Standard metrics, no domain metrics | Security paper without security metrics |
| **Missing Cost Metrics** | Only effectiveness, no cost | Improvement without cost consideration |

### 10. Incomplete Experimental Protocol

**Definition**: The experimental protocol lacks necessary components for rigor.

| Type | Description | Example |
|------|-------------|---------|
| **Missing Dataset Description** | Dataset not properly described | "We used dataset X" without details |
| **Missing Preprocessing Details** | Preprocessing not described | "We preprocessed data" without specifics |
| **Missing Hyperparameter Details** | Hyperparameters not specified | "We tuned parameters" without values |
| **Missing Implementation Details** | Implementation not described | No framework, libraries, hardware info |
| **Missing Reproducibility Info** | Code/data not available | No way to reproduce results |
| **Missing Ablation Studies** | No component contribution analysis | Multiple components, no ablation |
| **Missing Parameter Sensitivity** | No sensitivity analysis | Parameters used, sensitivity not tested |

## Comment Structure

**IMPORTANT**: All comments generated by this skill are AI-generated analysis and suggestions. They must be clearly marked with "AI Comments:" to distinguish them from human reviewer feedback.

All Evaluation Protocol Check Comments must follow this standardized format:

```
<!-- AI Comments: 
**AI-GENERATED EVALUATION PROTOCOL ANALYSIS - FOR AUTHOR REVIEW**

[PROTOCOL ISSUE TYPE]
<Type from the 10 categories above>

[LOCATION]
Section: <section name>
Text: "<exact quote of the problematic text>"

[PROBLEM DESCRIPTION]
<explanation of why this is an evaluation protocol problem>

[DETECTED ISSUE]
<specific description of the protocol concern>

[IMPACT ON EVALUATION]
<how this affects evaluation validity>
- What's missing: <specific missing elements>
- Why it matters: <how this affects conclusions>
- Risk: <what reviewers might question>

[EXPECTED STANDARDS]
<what would be expected for rigorous evaluation>
- In similar papers: <how others handle this>
- In top venues: <standard requirements>
- For this claim: <what's needed to support the claim>

[SUGGESTED ACTIONS]
<concrete suggestions to strengthen evaluation>
1. <specific addition or modification>
2. <specific addition or modification>
3. <specific addition or modification>

[SEVERITY]
Critical / Major / Minor
- Critical: Evaluation cannot support claimed contributions
- Major: Significant weakness in evaluation protocol
- Minor: Could strengthen evaluation rigor

**END AI-GENERATED EVALUATION PROTOCOL ANALYSIS**
-->
```

## Workflow

### Step 1: Extract Main Claims

From `paper.md`:
1. Extract the main insight claim
2. Extract key design decisions
3. Extract claimed contributions
4. Note what needs to be validated

### Step 2: Read Evaluation Section

From `paper.md` 实验 section:
1. Read the 实验方案 (Experimental Setup)
2. Read the 实验结果 (Results)
3. Identify all RQs stated
4. Note datasets, baselines, metrics
5. Note statistical methods used

### Step 3: Analyze RQ Coverage

For RQ-Insight alignment:
1. Does each insight aspect have corresponding RQ?
2. Are insight conditions tested?
3. Are insight boundaries tested?

For RQ-Design alignment:
1. Does each key design decision have RQ?
2. Are design alternatives compared?
3. Are parameters validated?

### Step 4: Check Threats to Validity

**Internal Validity**:
1. Are confounding factors identified?
2. Are controls in place?
3. Is statistical rigor present?
4. Are baselines fairly treated?

**External Validity**:
1. Is generalizability discussed?
2. Are multiple datasets used?
3. Is scale tested?
4. Are domains varied?

**Construct Validity**:
1. Are metrics justified?
2. Do metrics match claims?
3. Are real-world measures included?

**Conclusion Validity**:
1. Do conclusions match results?
2. Are alternatives considered?
3. Is causation established?

### Step 5: Evaluate Baseline Selection

1. Are baselines state-of-the-art?
2. Are baselines comprehensive?
3. Are baselines fairly configured?
4. Can results be compared?

### Step 6: Assess Metric Appropriateness

1. Are metrics appropriate for claims?
2. Are key metrics included?
3. Are metrics clearly defined?
4. Are metrics justified?

### Step 7: Check Protocol Completeness

1. Dataset description complete?
2. Preprocessing described?
3. Hyperparameters specified?
4. Implementation details provided?
5. Reproducibility ensured?
6. Ablation studies included?

### Step 8: Generate Comments

For each protocol issue found:
1. Classify the type (from 10 categories)
2. Quote the exact location
3. Explain the protocol problem
4. Describe impact on evaluation
5. Provide expected standards
6. Suggest specific actions
7. Assign severity level

### Step 9: Provide Summary Report

Generate a comprehensive evaluation protocol assessment.

## Paper Structure Reference

The paper follows VibePaper structure. Key rules for this checker:
- **Level 1-5** (`#` to `#####`): Structural headings only — no body text allowed under these.
- **Level 6** (`######`): Content paragraphs. Title = topic sentence (≤50 chars). Body = supporting text (≤500 chars).
- **Metadata**: HTML comments `<!-- description: ... -->` guide what each section should contain.

### Key Sections to Check

1. **Insight Section**: What does the insight claim? What needs to be validated? What are the conditions?
2. **Method Section**: What are the key design decisions? What alternatives were considered? What parameters were chosen?
3. **实验方案 Section**: What RQs are stated? What datasets are used? What baselines are compared? What metrics are measured? What statistical tests are used?
4. **实验结果 Section**: What conclusions are drawn? Are conclusions supported by results? Are negative results discussed?

## Output Format

### Summary Report

After analyzing the paper, provide a summary:

```markdown
## Evaluation Protocol Assessment Summary

**Paper**: [Paper title]
**Contribution Type**: [Algorithm/System/Empirical/Theory]

### Research Question Analysis

**Stated RQs**: X
1. [RQ1]
2. [RQ2]
...

**RQ Coverage**:
- Insight validation: Covered / Partially covered / Not covered
- Design validation: Covered / Partially covered / Not covered
- Claimed contributions: X/Y covered

**Missing RQs**:
- [What RQs should be added]

### Threats to Validity Analysis

**Internal Validity**:
- Status: Addressed / Partially addressed / Not addressed
- Issues: [List issues]

**External Validity**:
- Status: Addressed / Partially addressed / Not addressed
- Issues: [List issues]

**Construct Validity**:
- Status: Addressed / Partially addressed / Not addressed
- Issues: [List issues]

**Conclusion Validity**:
- Status: Addressed / Partially addressed / Not addressed
- Issues: [List issues]

### Baseline Analysis

**Baselines Used**: X
- State-of-the-art: Y
- Weak/outdated: Z

**Missing Baselines**:
- [Key baselines not included]

**Fairness Issues**:
- [Any fairness concerns]

### Metric Analysis

**Metrics Used**: X
- Appropriate: Y
- Questionable: Z
- Missing: W

**Metric Justification**:
- Provided: Y metrics
- Not provided: Z metrics

### Protocol Completeness

- [ ] Dataset description complete
- [ ] Preprocessing described
- [ ] Hyperparameters specified
- [ ] Implementation details provided
- [ ] Statistical tests included
- [ ] Multiple runs/repetitions
- [ ] Ablation studies included
- [ ] Parameter sensitivity tested
- [ ] Reproducibility ensured

### Evaluation Protocol Issues Found
- Critical: X
- Major: Y
- Minor: Z

### Strengths
- [What evaluation aspects are strong]

### Weaknesses
- [What evaluation aspects need improvement]

### Recommendations

**To Strengthen RQ Coverage**:
1. [Specific RQ to add]
2. [Specific RQ to add]

**To Address Validity Threats**:
1. [Specific threat to address]
2. [Specific threat to address]

**To Improve Protocol**:
1. [Specific improvement]
2. [Specific improvement]

### Risk Assessment

**Reviewer Concerns Likely**:
1. [Specific concerns reviewers might raise]

**Publication Risk**: High / Medium / Low
- [Reasoning]
```

### Inline Comments

Insert detailed HTML comments at problematic locations following the comment structure defined above. All comments must:
- Start with `<!-- AI Comments:`
- Include the marker `**AI-GENERATED EVALUATION PROTOCOL ANALYSIS - FOR AUTHOR REVIEW**`
- End with `**END AI-GENERATED EVALUATION PROTOCOL ANALYSIS**` before the closing `-->`


## Examples

For detailed comment examples, see [examples.md](examples.md) in this skill directory.

## Common Patterns

### Pattern 1: Checking RQ-Insight Alignment

For each claim in the insight:
1. What exactly is claimed?
2. Is there an RQ that tests this?
3. Is the test direct or indirect?
4. Are boundary conditions tested?
5. Are failure cases tested?

**Typical RQs for insight validation**:
- "Does X actually help for Y?"
- "When does X help most/least?"
- "What happens if X is removed/modified?"

### Pattern 2: Checking RQ-Design Alignment

For each key design decision:
1. Why was this choice made?
2. Is there an RQ comparing alternatives?
3. Is there an ablation study?
4. Is there parameter sensitivity analysis?

**Typical RQs for design validation**:
- "How does component X contribute to performance?" (ablation)
- "Why is design X better than alternative Y?" (comparison)
- "How sensitive is performance to parameter P?" (sensitivity)

### Pattern 3: Threats to Validity Framework

Use the standard validity framework:

**Internal Validity** (Is the causal inference correct?):
- Confounding variables
- Selection bias
- Implementation bias
- Statistical rigor
- Measurement error

**External Validity** (Does it generalize?):
- Multiple datasets
- Cross-domain testing
- Scale testing
- Temporal validity
- Population validity

**Construct Validity** (Do measurements capture what they claim?):
- Metric appropriateness
- Proxy validity
- Multi-dimensional measurement
- Real-world vs. synthetic

**Conclusion Validity** (Do conclusions follow from results?):
- Statistical tests
- Alternative explanations
- Scope of claims
- Causal inference

### Pattern 4: Baseline Selection Standards

For baseline selection:
1. **Most relevant**: What's the closest prior work?
2. **State-of-the-art**: What's the current best?
3. **Comprehensive**: Cover different approaches
4. **Fair**: Equal treatment and optimization
5. **Reproducible**: Same evaluation protocol

### Pattern 5: Metric Selection Standards

For metric selection:
1. **Aligned**: Match what's claimed
2. **Comprehensive**: Cover all aspects
3. **Standard**: Use established metrics
4. **Domain-specific**: Include domain metrics
5. **Multi-dimensional**: Don't optimize single metric

## Important Notes

1. **All comments are AI-generated**: Every comment inserted by this skill is generated by AI analysis and must be clearly marked with "AI Comments:". These are NOT human reviewer feedback and should not be treated as such.

2. **Validity is essential**: Without proper validity, results are not convincing. This is critical for publication.

3. **RQs drive evaluation**: Research questions should comprehensively cover claims. Missing RQs means missing validation.

4. **Threats must be addressed**: Reviewers always look for validity threats. Better to address them proactively.

5. **Baselines matter**: Unfair or incomplete baselines are a common rejection reason.

6. **Metrics must align**: Mismatched metrics signal lack of understanding.

7. **Reproducibility is expected**: Modern papers are expected to provide code/data for reproduction.

8. **Multiple datasets strengthen**: Single dataset evaluations are vulnerable to external validity concerns.

9. **Statistical rigor required**: Confidence intervals and significance tests are standard.

10. **Authors should verify**: AI may miss domain-specific evaluation conventions.

## Detection Checklist

Use this checklist during analysis:

### Research Questions
- [ ] RQs are explicitly stated
- [ ] RQs cover all major claims
- [ ] Each insight aspect has corresponding RQ
- [ ] Each design decision has corresponding RQ
- [ ] RQs are specific and measurable

### Internal Validity
- [ ] Statistical tests included (p-values, CI)
- [ ] Multiple runs/repetitions reported
- [ ] Random seeds specified
- [ ] Implementation fairness discussed
- [ ] Confounding factors identified and controlled

### External Validity
- [ ] Multiple datasets used
- [ ] Datasets are representative
- [ ] Scale testing included
- [ ] Cross-domain testing (if claiming generality)
- [ ] Generalizability limits discussed

### Construct Validity
- [ ] Metrics are justified
- [ ] Metrics match claims
- [ ] Real-world metrics included (if applicable)
- [ ] Proxy limitations discussed

### Conclusion Validity
- [ ] Conclusions match results scope
- [ ] Alternative explanations considered
- [ ] Negative results discussed
- [ ] Causal claims are justified

### Baselines
- [ ] Baselines are state-of-the-art
- [ ] Direct competitors included
- [ ] Baselines are fairly configured
- [ ] Baseline descriptions are complete

### Metrics
- [ ] All key metrics are measured
- [ ] Metrics are appropriate
- [ ] Metrics are clearly defined
- [ ] Domain-specific metrics included

### Protocol Completeness
- [ ] Dataset details provided
- [ ] Preprocessing described
- [ ] Hyperparameters specified
- [ ] Implementation details provided
- [ ] Statistical methods described
- [ ] Ablation studies included
- [ ] Parameter sensitivity tested
- [ ] Reproducibility ensured (code/data available)
