# Novelty Checker - Examples

These examples are extracted from the main SKILL.md for context efficiency. Refer to these when you need format guidance for novelty checker comments.

## Example 1: Duplicate Insight

```
<!-- AI Comments: 
**AI-GENERATED NOVELTY ANALYSIS - FOR AUTHOR REVIEW**

[NOVELTY ISSUE TYPE]
Duplicate or Near-Duplicate Insight: Near-Duplicate

[LOCATION]
Section: Insight > Insight的具体描述
Text: "我们发现传统入侵检测系统忽略了攻击行为的时序关联特性，通过建模攻击行为的时序演化规律，可以显著提升对复杂攻击链的识别能力"

[PROBLEM DESCRIPTION]
The core insight about using temporal patterns for attack detection has been explored in prior work. The claimed novelty is not sufficiently differentiated.

[DETECTED ISSUE]
The insight "temporal correlation characteristics of attack behavior" and "modeling temporal evolution patterns" appears in prior work with very similar formulation.

[EXISTING WORK]
- Paper: "Sequential Attack Detection Using Temporal Patterns" (Chen et al., CCS 2019)
  - Similarity: Also uses temporal correlation for attack chain detection
  - Key difference: Chen et al. use HMM, this paper uses graph neural network
  - Core insight overlap: ~80% (same observation about temporal patterns)

- Paper: "Time-Series Analysis for APT Detection" (Wang et al., NDSS 2020)
  - Similarity: Models attack evolution over time
  - Key difference: Different modeling approach (statistical vs. learning-based)

[IMPACT ON NOVELTY]
- Strength of prior work: Both papers are in top-tier venues (CCS, NDSS)
- Overlap: Core insight about temporal patterns is ~80% similar
- Differentiation needed: Must clearly state what's novel BEYOND the temporal insight

[SUGGESTED ACTIONS]
1. Cite and acknowledge Chen et al. (CCS 2019) and Wang et al. (NDSS 2020)
2. Differentiate explicitly: "While Chen et al. use HMM for temporal patterns, our approach differs by using graph neural networks, which enables X, Y, Z that HMM cannot achieve"
3. Adjust claim scope: Instead of claiming "discovering temporal patterns", claim "novel graph-based representation of temporal patterns that overcomes limitations of HMM-based approaches"
4. Strengthen method novelty: Emphasize what graph neural networks contribute beyond prior temporal modeling

[SEVERITY]
Critical - The core insight overlaps significantly with published work in top venues. Novelty claim needs major revision.

**END AI-GENERATED NOVELTY ANALYSIS**
-->
```

## Example 2: Missing Prior Art Citation

```
<!-- AI Comments: 
**AI-GENERATED NOVELTY ANALYSIS - FOR AUTHOR REVIEW**

[NOVELTY ISSUE TYPE]
Missing Prior Art Citation: Key Related Work Omitted

[LOCATION]
Section: 现有方法局限
Text: "现有方法的共性局限在于：(1)攻击行为孤立检测；(2)时序信息缺失；(3)上下文信息不足"

[PROBLEM DESCRIPTION]
The analysis of existing method limitations omits a key paper that directly addresses the stated limitations, making the gap claim potentially invalid.

[DETECTED ISSUE]
Claims "existing methods lack temporal information" but omits citation to Holmes et al. (2019) which explicitly uses temporal information for attack detection.

[EXISTING WORK]
- Paper: "HOLMES: Composable APT Detection" (Holmes et al., CCS 2019)
  - Similarity: Uses temporal causality graphs for APT detection
  - Key contribution: Explicitly models temporal relationships between attack stages
  - Should be cited: Directly addresses claimed limitation

[IMPACT ON NOVELTY]
- Strength of prior work: Top-tier venue (CCS), well-cited (500+ citations)
- Overlap: Directly contradicts claim that existing methods lack temporal information
- Differentiation needed: Must explain why HOLMES's temporal modeling is insufficient

[SUGGESTED ACTIONS]
1. Cite HOLMES (CCS 2019) in the existing methods section
2. Update limitation analysis: "While HOLMES uses temporal causality graphs, it has limitations X, Y, Z that our approach addresses"
3. Differentiate explicitly: Show why your temporal modeling is different/better
4. Adjust gap claim: Change from "existing methods lack temporal information" to "existing temporal modeling approaches have limitations in X, Y, Z"

[SEVERITY]
Major - Key related work that contradicts limitation claim is missing, weakening the novelty argument.

**END AI-GENERATED NOVELTY ANALYSIS**
-->
```

## Example 3: Overstated Novelty Claim

```
<!-- AI Comments: 
**AI-GENERATED NOVELTY ANALYSIS - FOR AUTHOR REVIEW**

[NOVELTY ISSUE TYPE]
Overstated Novelty Claims: "First to..." Without Evidence

[LOCATION]
Section: Insight > Insight创新性
Text: "本Insight的创新性体现在：(1)首次将时序图神经网络引入攻击链建模"

[PROBLEM DESCRIPTION]
The claim "首次将时序图神经网络引入攻击链建模" (first to introduce temporal graph neural networks for attack chain modeling) is a strong novelty claim that requires verification.

[DETECTED ISSUE]
Claims "first to use temporal GNN for attack chain modeling" without:
1. Evidence that no prior work exists
2. Comprehensive literature search
3. Qualification of scope (first in what domain/context?)

[EXISTING WORK]
- Paper: "Dynamic Graph Neural Networks for Network Intrusion Detection" (Li et al., 2021)
  - Similarity: Uses temporal GNN for security
  - Difference: Network intrusion rather than attack chain specifically
  
- Paper: "Temporal Graph Networks for Anomaly Detection" (Rossi et al., 2020)
  - Similarity: Temporal GNN methodology
  - Difference: General anomaly detection, not attack chains

[IMPACT ON NOVELTY]
- Overlap: Temporal GNN methodology is not novel (well-established)
- Application: Attack chain modeling may be novel, but needs verification
- Claim strength: "首次" (first) is very strong and easily falsifiable

[SUGGESTED ACTIONS]
1. Remove or qualify "首次" claim unless absolutely verified
2. Alternative phrasing: "We apply temporal GNN to attack chain modeling, adapting techniques from X, Y, Z domains"
3. Cite temporal GNN foundational work (Rossi et al., 2020)
4. Focus novelty on: HOW temporal GNN is adapted/applied, not on being "first"
5. If truly first: Provide evidence - "To our knowledge, no prior work has applied temporal GNN to attack chain modeling (verified through search of X, Y, Z databases)"

[SEVERITY]
Major - Strong claims of "first" without verification can damage credibility if proven wrong.

**END AI-GENERATED NOVELTY ANALYSIS**
-->
```

## Example 4: Weak Differentiation

```
<!-- AI Comments: 
**AI-GENERATED NOVELTY ANALYSIS - FOR AUTHOR REVIEW**

[NOVELTY ISSUE TYPE]
Weak Differentiation Arguments: Vague Differences

[LOCATION]
Section: 整体方法设计 > 解决方案创新性
Text: "本方法的创新性体现在：(1)首次提出时序攻击链图神经网络模型；(2)设计了自适应攻击阶段转移估计算法；(3)实现了秒级实时攻击链构建机制"

[PROBLEM DESCRIPTION]
The innovation claims are stated but not differentiated from prior work. What makes each point novel compared to existing approaches?

[DETECTED ISSUE]
Three innovation points are listed but:
1. No comparison with prior work for each point
2. No explanation of what's different
3. No justification for why these are innovations

[EXISTING WORK]
For Point 1 (temporal attack chain GNN):
- Prior: "Attack Graph Generation" (Noel et al., 2016) - uses graphs for attacks
- Prior: "Temporal GNN" (Rossi et al., 2020) - temporal graph neural networks
- Need to show: What's the combination that's novel?

For Point 2 (adaptive stage transfer estimation):
- Prior: HMMs used for stage transition (Chen et al., 2019)
- Need to show: How is your estimation "adaptive" and different?

For Point 3 (real-time construction):
- Prior: Many systems claim real-time
- Need to show: What makes your approach novel for real-time?

[IMPACT ON NOVELTY]
- Each point may be novel, but this is not demonstrated
- Without differentiation, reviewers cannot assess novelty
- Risk of reviewer saying "similar to X, Y, Z"

[SUGGESTED ACTIONS]
1. For each innovation point, add explicit comparison:
   - "Unlike Noel et al. (2016) who use static attack graphs, our approach models temporal evolution..."
   - "Compared to HMM-based transition models (Chen et al., 2019), our adaptive approach differs by..."
   - "While real-time attack detection exists (X, Y), our real-time construction achieves Z which prior work cannot..."

2. Add quantitative differentiation where possible:
   - "Our approach achieves X ms latency compared to Y ms in prior work"
   - "We improve accuracy by Z% over the best prior approach"

3. Strengthen each claim with "why it matters":
   - Not just "novel", but "novel AND addresses specific limitation of prior work"

[SEVERITY]
Major - Innovation claims need explicit differentiation from prior work to be convincing.

**END AI-GENERATED NOVELTY ANALYSIS**
-->
```

## Example 5: Cross-Domain Similarity

```
<!-- AI Comments: 
**AI-GENERATED NOVELTY ANALYSIS - FOR AUTHOR REVIEW**

[NOVELTY ISSUE TYPE]
Cross-Domain Similarity Not Addressed: Direct Applicability

[LOCATION]
Section: Insight > Insight的具体描述
Text: "通过建模攻击行为的时序演化规律，可以显著提升对复杂攻击链的识别能力"

[PROBLEM DESCRIPTION]
The core concept of "modeling temporal evolution patterns for sequence recognition" is well-established in other domains (speech recognition, NLP, bioinformatics) but this is not acknowledged.

[DETECTED ISSUE]
Temporal sequence modeling is a fundamental technique in:
- Speech recognition (HMMs, RNNs, Transformers)
- NLP (sequence-to-sequence models)
- Bioinformatics (protein sequence analysis)
- Finance (time-series prediction)

The insight that "temporal patterns help recognition" is not novel in general; the novelty should be in HOW it's applied to security.

[EXISTING WORK]
- Speech Recognition: "Temporal Pattern Recognition in Speech" (Rabiner, 1989) - foundational
- NLP: "Attention is All You Need" (Vaswani et al., 2017) - temporal modeling with transformers
- Time Series: "LSTM for Time Series" (Hochreiter & Schmidhuber, 1997) - foundational

[IMPACT ON NOVELTY]
- Core concept: Not novel (temporal patterns for sequences is well-known)
- Domain application: May be novel for attack chain detection
- Strength opportunity: Could strengthen paper by acknowledging and adapting from other domains

[SUGGESTED ACTIONS]
1. Acknowledge cross-domain origins:
   - "Temporal sequence modeling has been successful in speech recognition and NLP. We adapt these insights for attack chain detection..."

2. Explain domain-specific adaptation:
   - "Unlike speech recognition where sequences are continuous, attack chains have discrete stages with complex dependencies..."
   - "We address the unique challenges of security domain: X, Y, Z..."

3. Cite foundational cross-domain work:
   - Add citations to HMM (Rabiner), LSTM (Hochreiter), etc.
   - Show awareness of broader temporal modeling literature

4. Reframe novelty:
   - Not: "We discovered temporal patterns help detection"
   - Yes: "We adapt temporal modeling techniques from X domain to address unique challenges Y in attack chain detection"

[SEVERITY]
Major - Ignoring cross-domain prior art weakens the novelty claim and misses opportunity to strengthen paper.

**END AI-GENERATED NOVELTY ANALYSIS**
-->
```