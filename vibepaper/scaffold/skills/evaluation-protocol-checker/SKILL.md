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

## VibePaper Structure Rules

Before checking evaluation protocol, read `writingrules.md` to understand the paper structure. Focus on these key sections:

### Key Sections to Check

1. **Insight Section**
   - What does the insight claim?
   - What needs to be validated?
   - What are the conditions?

2. **Method Section**
   - What are the key design decisions?
   - What alternatives were considered?
   - What parameters were chosen?

3. **实验方案 Section**
   - What RQs are stated?
   - What datasets are used?
   - What baselines are compared?
   - What metrics are measured?
   - What statistical tests are used?

4. **实验结果 Section**
   - What conclusions are drawn?
   - Are conclusions supported by results?
   - Are negative results discussed?

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

## Example Output

### Example 1: Missing RQ for Insight Validation

```
<!-- AI Comments: 
**AI-GENERATED EVALUATION PROTOCOL ANALYSIS - FOR AUTHOR REVIEW**

[PROTOCOL ISSUE TYPE]
RQ-Insight Misalignment: Insight Not Testable

[LOCATION]
Section: 实验 > 实验方案
Text: "实验方案：(1)离线实验：在公开数据集和真实攻击数据上评估检测效果；(2)在线实验：在实际网络环境中部署验证；(3)消融实验：分析各模块的贡献"

[PROBLEM DESCRIPTION]
The core insight is "temporal correlation characteristics of attack behavior are important for detection", but there is no RQ that directly tests whether temporal correlation actually helps detection.

[DETECTED ISSUE]
- Insight claim: "时序关联特性对攻击检测重要"
- RQs stated: (1) detection effectiveness, (2) online deployment, (3) ablation
- Missing RQ: Direct test of whether temporal patterns improve detection vs. non-temporal approaches
- Current RQs test overall performance, not the insight itself

[IMPACT ON EVALUATION]
- What's missing: RQ that tests "Does temporal correlation actually help?" with controlled comparison
- Why it matters: Without this RQ, the core insight is claimed but not validated; reviewers will question whether insight is real
- Risk: Reviewers may ask "How do you know temporal patterns help? Maybe your method works for other reasons."

[EXPECTED STANDARDS]
- In similar papers: Papers testing an insight always include RQ that directly validates the insight (e.g., "RQ: Does temporal modeling improve detection over non-temporal baselines?")
- In top venues: Explicit RQs for each claim with controlled experiments
- For this claim: Need RQ like "Does temporal correlation improve detection over non-temporal approaches? Under what conditions?"

[SUGGESTED ACTIONS]
1. Add RQ: "RQ1: Does temporal correlation modeling improve detection effectiveness compared to non-temporal approaches?"
2. Design experiment: Compare temporal version vs. non-temporal version (ablate temporal component)
3. Add conditions testing: "Under what conditions does temporal modeling help most?" (test on different attack types)
4. Measure temporal-specific improvements: Show cases where temporal patterns are crucial vs. where they're not
5. Strengthen insight validation: "RQ2: How does the length of temporal window affect detection?"

[SEVERITY]
Critical - The core insight is not directly tested. This is a fundamental gap in evaluation.

**END AI-GENERATED EVALUATION PROTOCOL ANALYSIS**
-->
```

### Example 2: Missing Internal Validity Discussion

```
<!-- AI Comments: 
**AI-GENERATED EVALUATION PROTOCOL ANALYSIS - FOR AUTHOR REVIEW**

[PROTOCOL ISSUE TYPE]
Internal Validity Threats Not Addressed: No Internal Validity Discussion

[LOCATION]
Section: 实验
Text: "实验评估了本文方法在不同数据集上的表现，结果显示检测率达到92%，相比最优基线HOLMES（78%）提升18%"

[PROBLEM DESCRIPTION]
The evaluation claims significant improvement but does not discuss or address threats to internal validity, such as implementation differences, parameter tuning, or statistical significance.

[DETECTED ISSUE]
- Claims 18% improvement over baseline
- No statistical significance testing mentioned
- No discussion of implementation effort/bias
- No control for confounding factors
- No discussion of parameter tuning differences
- Single run reported (no multiple repetitions)

[IMPACT ON EVALUATION]
- What's missing: Statistical tests, multiple runs, implementation fairness discussion, confounding variable analysis
- Why it matters: Without these, improvement could be due to luck, implementation bias, or confounders, not the method itself
- Risk: Reviewers will question whether improvement is real or artifact of evaluation

[EXPECTED STANDARDS]
- In similar papers: Always include: (1) statistical tests (t-test, ANOVA), (2) confidence intervals, (3) multiple runs with different seeds, (4) implementation fairness discussion
- In top venues: Detailed validity threat analysis with mitigation strategies
- For this claim: Need p-values, confidence intervals, multiple runs, fairness discussion

[SUGGESTED ACTIONS]
1. Add statistical tests: "Improvement is statistically significant (p < 0.01, paired t-test)"
2. Add confidence intervals: "Detection rate: 92% ± 3.2% (95% CI)"
3. Run multiple repetitions: "Results averaged over 5 runs with different random seeds (seeds: 42, 123, 456, 789, 1024)"
4. Discuss implementation fairness: "We used authors' implementation for HOLMES and followed their recommended parameters. For fair comparison, we spent equal engineering effort on all baselines."
5. Identify confounding factors: "Potential confounders: dataset characteristics, attack type distribution. We control for these by X, Y."
6. Add validity threat discussion: "Internal Validity: To ensure fair comparison, we X, Y, Z..."

[SEVERITY]
Major - Missing internal validity discussion undermines confidence in claimed improvements.

**END AI-GENERATED EVALUATION PROTOCOL ANALYSIS**
-->
```

### Example 3: External Validity Not Addressed

```
<!-- AI Comments: 
**AI-GENERATED EVALUATION PROTOCOL ANALYSIS - FOR AUTHOR REVIEW**

[PROTOCOL ISSUE TYPE]
External Validity Threats Not Addressed: Single Dataset

[LOCATION]
Section: 实验 > 实验方案 > 数据采集
Text: "数据集：(1)公开数据集：CTF挑战数据、DARPA Engage数据集；(2)真实数据：某安全厂商提供的脱敏APT攻击案例"

[PROBLEM DESCRIPTION]
The paper claims a general method for "enterprise network APT detection" but only tests on one type of dataset (CTF + one vendor's APT cases). Generalizability is not tested.

[DETECTED ISSUE]
- Claim: General method for enterprise APT detection
- Datasets: CTF (not real enterprise), one vendor's APT cases
- Missing: Diverse enterprise networks, different industries, different scales
- Missing: Discussion of generalizability limits
- Risk: Method may not generalize beyond tested dataset

[IMPACT ON EVALUATION]
- What's missing: Multiple enterprise datasets, cross-domain testing, scale testing
- Why it matters: Claim of general method is not supported by evaluation on single dataset type
- Risk: Reviewers will question whether method works beyond the tested cases

[EXPECTED STANDARDS]
- In similar papers: At least 2-3 datasets from different sources; cross-domain testing if claiming generality
- In top venues: Diverse datasets, discussion of generalizability, external validity threats
- For this claim: Need datasets from multiple enterprises, different industries, varying scales

[SUGGESTED ACTIONS]
1. Add more datasets: "To test generalizability, we evaluate on datasets from: (1) Financial sector, (2) Government sector, (3) Healthcare sector"
2. Add cross-domain testing: "We test whether model trained on domain A generalizes to domain B"
3. Add scale testing: "We test on networks of sizes: small (100 hosts), medium (1000 hosts), large (10000 hosts)"
4. Discuss generalizability limits: "External Validity: Our evaluation covers X types of networks. We cannot claim generalization to Y without further testing."
5. Add external validity threat section: "External Validity: Potential limitations on generalization include X, Y. We mitigate by Z."

[SEVERITY]
Major - Single dataset limits generalizability claims. Need diverse evaluation.

**END AI-GENERATED EVALUATION PROTOCOL ANALYSIS**
-->
```

### Example 4: Construct Validity Issue - Metric Misalignment

```
<!-- AI Comments: 
**AI-GENERATED EVALUATION PROTOCOL ANALYSIS - FOR AUTHOR REVIEW**

[PROTOCOL ISSUE TYPE]
Construct Validity Threats Not Addressed: Metric Misalignment

[LOCATION]
Section: 实验 > 实验方案 > 指标选择
Text: "评估指标：(1)检测率（DR）；(2)误报率（FPR）；(3)平均检测时间（MTTD）；(4)攻击链重构准确率"

[PROBLEM DESCRIPTION]
The paper claims the method provides "real-time APT detection for enterprise security" but the metrics don't include actual security impact measures. Accuracy metrics are used as proxy for security value.

[DETECTED ISSUE]
- Claim: "Real-time APT detection for enterprise security"
- Metrics: DR, FPR, MTTD, attack chain accuracy
- Missing: Actual security impact (e.g., prevented damage, reduced investigation time, SOC analyst efficiency)
- Proxy too distant: DR/FPR are proxies, not direct measures of security value
- Missing real-world validation: How does this help actual security operations?

[IMPACT ON EVALUATION]
- What's missing: Real-world security metrics, practitioner evaluation, operational impact
- Why it matters: Technical metrics don't show whether method actually helps security in practice
- Risk: Reviewers may ask "Does this actually help security teams?"

[EXPECTED STANDARDS]
- In similar papers: Include both technical metrics AND practical impact metrics
- In top venues: User studies, case studies with security teams, operational deployment results
- For this claim: Need some measure of practical security value

[SUGGESTED ACTIONS]
1. Add practical metrics: "We measure: (1) Reduction in analyst investigation time (2) Reduction in missed attacks (3) False alert burden on SOC"
2. Add user study: "We deployed the system in a SOC environment for 2 weeks and surveyed 5 analysts on usability and effectiveness"
3. Add case study: "Case Study: We detected attack X in real deployment Y days earlier than existing tools, preventing estimated $Z damage"
4. Discuss proxy limitations: "While DR/FPR are standard metrics, they don't capture X, Y aspects of practical value"
5. Add construct validity discussion: "Construct Validity: We use DR/FPR as proxies for security value. Limitations include X, Y."

[SEVERITY]
Major - Metrics don't directly measure claimed practical value. Need real-world validation.

**END AI-GENERATED EVALUATION PROTOCOL ANALYSIS**
-->
```

### Example 5: Missing Baseline Comparison

```
<!-- AI Comments: 
**AI-GENERATED EVALUATION PROTOCOL ANALYSIS - FOR AUTHOR REVIEW**

[PROTOCOL ISSUE TYPE]
Missing Baseline Comparisons: Missing Relevant Baselines

[LOCATION]
Section: 实验 > 实验方案 > 基线方法
Text: "基线方法：(1)传统IDS：Snort（签名匹配）；(2)机器学习方法：基于随机森林的异常检测"

[PROBLEM DESCRIPTION]
The paper claims to advance attack chain detection but does not compare with key competitive methods in this space (e.g., HOLMES, RAPID mentioned earlier in related work).

[DETECTED ISSUE]
- Paper mentions HOLMES and RAPID in related work section as "attack chain detection methods"
- Neither is included in baselines
- Baselines are: Snort (traditional IDS, not attack chain), Random Forest (general ML, not attack chain specific)
- Missing direct competitors in same problem space
- Claims improvement over "attack chain detection methods" but doesn't compare to them

[IMPACT ON EVALUATION]
- What's missing: HOLMES, RAPID, and other attack chain detection baselines
- Why it matters: Without comparing to direct competitors, cannot claim improvement in attack chain detection
- Risk: Reviewers will ask "Why not compare to HOLMES which you cite as most relevant?"

[EXPECTED STANDARDS]
- In similar papers: Always include most relevant prior work as baseline
- In top venues: Comprehensive baselines including all relevant recent work
- For this claim: Must include HOLMES, RAPID, and other attack chain detection methods

[SUGGESTED ACTIONS]
1. Add HOLMES as baseline: "HOLMES [Citation]: State-of-the-art attack chain detection, builds causal graphs of attacks"
2. Add RAPID as baseline: "RAPID [Citation]: Recent real-time attack detection method"
3. Justify baseline selection: "We select baselines representing: (1) Traditional approaches (Snort), (2) ML approaches (RF), (3) Attack chain approaches (HOLMES, RAPID)"
4. Ensure fair comparison: Use authors' implementations or reimplement faithfully
5. Discuss why comparison is fair: "For HOLMES, we use the same dataset preprocessing and evaluation protocol as their paper"
6. If baselines cannot be included, explain why: "HOLMES is not included because X (if valid reason); instead, we compare to Y which is most similar available"

[SEVERITY]
Critical - Missing direct competitors undermines claims of improvement. Must add relevant baselines.

**END AI-GENERATED EVALUATION PROTOCOL ANALYSIS**
-->
```

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
