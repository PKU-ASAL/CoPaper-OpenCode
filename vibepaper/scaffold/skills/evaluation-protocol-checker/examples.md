# Evaluation Protocol Checker - Examples

These examples are extracted from the main SKILL.md for context efficiency. Refer to these when you need format guidance for evaluation protocol checker comments.

## Example 1: Missing RQ for Insight Validation

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

## Example 2: Missing Internal Validity Discussion

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

## Example 3: External Validity Not Addressed

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

## Example 4: Construct Validity Issue - Metric Misalignment

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

## Example 5: Missing Baseline Comparison

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