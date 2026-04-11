# Technical Depth Checker - Examples

These examples are extracted from the main SKILL.md for context efficiency. Refer to these when you need format guidance for technical depth checker comments.

## Example 1: Shallow Design - Direct Application

```
<!-- AI Comments: 
**AI-GENERATED TECHNICAL DEPTH ANALYSIS - FOR AUTHOR REVIEW**

[DEPTH ISSUE TYPE]
Shallow or Trivial Design: Direct Application

[LOCATION]
Section: 整体方法设计
Text: "本方法采用机器学习模型对日志进行分类，识别异常行为。具体地，我们使用随机森林算法，提取日志的特征向量，训练分类器进行预测"

[PROBLEM DESCRIPTION]
The design applies a standard machine learning algorithm (Random Forest) to log classification without any novel adaptation, modification, or domain-specific customization. This is a direct application of an existing technique.

[DETECTED ISSUE]
- Uses Random Forest as-is without modification
- No novel feature engineering described
- No domain-specific adaptation mentioned
- No custom algorithm or technique introduced
- Appears to be standard ML pipeline application

[WHY THIS LACKS DEPTH]
- What's missing: Novel adaptation of ML to the specific problem, custom feature engineering, domain-specific modifications, addressing unique challenges of log data
- Why it matters: Direct application of standard tools doesn't constitute research contribution; anyone can apply Random Forest
- Standard expectation: Novel features, custom preprocessing, adaptation to log characteristics, addressing class imbalance, handling temporal dependencies

[COMPARISON TO EXPECTED DEPTH]
- In similar papers: Log anomaly detection papers typically include custom feature extraction, time-series modeling, or novel representations
- In top venues: Include novel architectures, custom models, or significant adaptations
- For this contribution type: If claiming method contribution, need novel algorithm/architecture; if claiming system contribution, need engineering depth in handling scale/real-time

[SUGGESTED IMPROVEMENTS]
1. Add novel feature engineering specific to log data: "We design log-specific features that capture X, Y, Z characteristics unique to attack patterns"
2. Adapt the algorithm to domain constraints: "Standard Random Forest cannot handle X, so we modify it to Y, enabling Z"
3. Address domain-specific challenges: "Log data has characteristics X, Y that standard ML cannot handle; we propose modifications to address these"
4. Increase sophistication: Consider ensemble approaches, custom loss functions, or domain-informed architectures
5. If not claiming method novelty, reposition as system contribution and add significant engineering depth

[SEVERITY]
Critical - Direct application of standard ML without adaptation is insufficient for a research paper. Need significant additional technical contribution.

**END AI-GENERATED TECHNICAL DEPTH ANALYSIS**
-->
```

## Example 2: Missing Technical Challenges

```
<!-- AI Comments: 
**AI-GENERATED TECHNICAL DEPTH ANALYSIS - FOR AUTHOR REVIEW**

[DEPTH ISSUE TYPE]
Missing Technical Challenges: No Challenge Stated

[LOCATION]
Section: 各模块情况 > 模块1
Text: "模块1：行为提取器。功能：从日志流中提取可疑攻击行为。核心思想：使用多阶段过滤方法，结合签名匹配、异常检测和威胁情报，识别潜在攻击行为"

[PROBLEM DESCRIPTION]
The module description presents the solution without discussing what challenges exist in behavior extraction. There's no mention of why this is hard or what makes it non-trivial.

[DETECTED ISSUE]
- No challenges stated for behavior extraction
- Solution presented without difficulty context
- No "why hard" analysis
- Appears straightforward but may have hidden complexity
- Missing technical depth in problem understanding

[WHY THIS LACKS DEPTH]
- What's missing: Challenges in behavior extraction (false positives, evasion, polymorphism, scale, real-time constraints, etc.)
- Why it matters: Without challenges, readers can't appreciate the contribution; appears trivial
- Standard expectation: Clear statement of why this module is challenging, what makes it hard, why naive approaches fail

[COMPARISON TO EXPECTED DEPTH]
- In similar papers: Security papers explicitly discuss challenges: evasion attacks, adversarial examples, concept drift, alert fatigue, etc.
- In top venues: Deep analysis of challenges with examples, failure modes, and why existing solutions fail
- For this contribution type: Security systems papers require explicit challenge analysis for each component

[SUGGESTED IMPROVEMENTS]
1. Add challenge analysis: "Behavior extraction faces key challenges: (1) High false positive rate (>90% in prior work), (2) Adversarial evasion by attackers, (3) Concept drift in attack patterns, (4) Real-time processing at 1M logs/sec"
2. Explain why naive approaches fail: "Simple threshold-based detection suffers from X; signature matching misses Y; anomaly detection has Z limitation"
3. Show non-triviality: "This is not solvable by straightforward approaches because X, Y, Z"
4. Connect to solution: "Our multi-stage filtering addresses these challenges by X, Y, Z"
5. Add technical depth: Discuss specific techniques for each challenge

[SEVERITY]
Major - Missing challenge analysis makes the contribution appear trivial. Need explicit "why hard" discussion.

**END AI-GENERATED TECHNICAL DEPTH ANALYSIS**
-->
```

## Example 3: Obvious Solution

```
<!-- AI Comments: 
**AI-GENERATED TECHNICAL DEPTH ANALYSIS - FOR AUTHOR REVIEW**

[DEPTH ISSUE TYPE]
Obvious or Standard Solutions: Standard Library Solution

[LOCATION]
Section: 各模块情况 > 模块2
Text: "攻击链构建模块：我们使用图数据结构存储攻击行为，使用邻接表表示攻击阶段间的关联关系"

[PROBLEM DESCRIPTION]
The solution uses standard graph data structures (adjacency list) which are textbook approaches. This is an obvious solution that doesn't demonstrate technical depth.

[DETECTED ISSUE]
- Adjacency list is a standard data structure
- No novel graph representation proposed
- No custom data structure designed
- No discussion of why standard structures are insufficient
- Appears to be straightforward application of known techniques

[WHY THIS LACKS DEPTH]
- What's missing: Custom graph representation, specialized data structures for attack chains, optimizations for temporal graphs
- Why it matters: Using standard data structures without adaptation shows no technical contribution
- Standard expectation: Novel representation, custom indexing, optimizations, or adaptations for domain-specific requirements

[COMPARISON TO EXPECTED DEPTH]
- In similar papers: Temporal graph papers propose specialized representations (e.g., T-GNN, temporal edge encoding)
- In top venues: Custom data structures with complexity analysis, optimizations for domain constraints
- For this contribution type: Security graph papers typically propose attack-specific representations with specialized queries

[SUGGESTED IMPROVEMENTS]
1. Explain why standard graphs insufficient: "Standard adjacency lists cannot efficiently query temporal patterns X, Y, Z; they have limitations A, B, C"
2. Propose custom representation: "We design Attack Temporal Graph (ATG) with specialized indexing for temporal queries, enabling X in O(Y) time"
3. Add optimizations: "We optimize for query patterns X, Y using techniques Z, achieving W speedup"
4. Show complexity advantage: "Our representation achieves O(X) for operation Y compared to O(Z) in standard graphs"
5. Add domain-specific design: "ATG includes specialized nodes for X, edges for Y, optimized for security queries Z"

[SEVERITY]
Major - Using standard data structures without adaptation lacks technical depth. Need custom design or significant optimization.

**END AI-GENERATED TECHNICAL DEPTH ANALYSIS**
-->
```

## Example 4: Insufficient Technical Detail

```
<!-- AI Comments: 
**AI-GENERATED TECHNICAL DEPTH ANALYSIS - FOR AUTHOR REVIEW**

[DEPTH ISSUE TYPE]
Insufficient Technical Detail: Missing Algorithm Details

[LOCATION]
Section: 各模块情况 > 模块3
Text: "威胁评估模块：我们使用评分算法计算攻击链的危险程度。综合考虑攻击阶段、时间跨度和攻击类型等因素"

[PROBLEM DESCRIPTION]
The threat assessment module is described at a very high level without any algorithmic details. There's no explanation of how the scoring works, how factors are combined, or what the algorithm actually does.

[DETECTED ISSUE]
- No scoring algorithm specified
- "综合考虑" (comprehensively consider) is vague
- No mathematical formulation
- No weights or combination method
- No complexity analysis
- Not reproducible from description

[WHY THIS LACKS DEPTH]
- What's missing: Scoring function formula, weight assignment, combination method, thresholds, algorithm pseudocode
- Why it matters: Without details, contribution cannot be evaluated or reproduced; appears superficial
- Standard expectation: Mathematical formulation, algorithm specification, parameter values, complexity analysis

[COMPARISON TO EXPECTED DEPTH]
- In similar papers: Risk scoring papers include: scoring function f(x), weight derivation, mathematical formulation, pseudocode
- In top venues: Formal algorithm specification with complexity analysis, parameter sensitivity analysis
- For this contribution type: Scoring/assessment modules require formal specification for reproducibility and evaluation

[SUGGESTED IMPROVEMENTS]
1. Add mathematical formulation: "Threat score T = w1*stage_score + w2*time_factor + w3*type_severity, where w1=0.4, w2=0.3, w3=0.3"
2. Specify each component: "stage_score = X; time_factor = Y; type_severity = Z"
3. Provide pseudocode or algorithm:
   ```
   Algorithm: ThreatScore(attack_chain)
   1. Extract stages S from attack_chain
   2. Compute stage_score = Σ severity(s_i)
   3. Compute time_factor = f(duration, density)
   4. Return T = weighted_sum(stage_score, time_factor, type_severity)
   ```
4. Explain design choices: "We weight stage_score highest because X; time_factor captures Y"
5. Add complexity analysis: "ThreatScore runs in O(V+E) where V is vertices, E is edges"

[SEVERITY]
Major - Missing algorithmic details make the contribution non-reproducible and appear superficial. Need formal specification.

**END AI-GENERATED TECHNICAL DEPTH ANALYSIS**
-->
```

## Example 5: Missing Design Rationale

```
<!-- AI Comments: 
**AI-GENERATED TECHNICAL DEPTH ANALYSIS - FOR AUTHOR REVIEW**

[DEPTH ISSUE TYPE]
Missing Design Rationale: Arbitrary Choices

[LOCATION]
Section: 整体方法设计 > 输入输出定义
Text: "系统使用滑动窗口大小为60秒，窗口步长为10秒"

[PROBLEM DESCRIPTION]
Critical design parameters (window size 60s, step 10s) are stated without any justification. Why these values? What's the reasoning?

[DETECTED ISSUE]
- No justification for window size 60s
- No justification for step size 10s
- No trade-off analysis
- No sensitivity discussion
- Appears arbitrary

[WHY THIS LACKS DEPTH]
- What's missing: Rationale for parameter choices, trade-off analysis, sensitivity to parameters, experimental validation
- Why it matters: Arbitrary choices suggest lack of deep understanding; readers can't evaluate appropriateness
- Standard expectation: Clear rationale based on domain knowledge, constraints, or experimental analysis

[COMPARISON TO EXPECTED DEPTH]
- In similar papers: Parameter choices justified by: domain constraints, empirical analysis, trade-off curves, prior work justification
- In top venues: Comprehensive parameter analysis with ablation studies
- For this contribution type: Systems papers must justify all key design parameters

[SUGGESTED IMPROVEMENTS]
1. Provide domain-based rationale: "60-second window balances detection latency (shorter windows = faster detection) and context completeness (longer windows = more context). Attack chains typically span 50-70 seconds (cite report)"
2. Add constraint analysis: "Shorter windows (<30s) miss context; longer windows (>120s) delay detection and increase memory by X%"
3. Show trade-off: "We experimented with windows from 30s to 120s; 60s achieves best F1-score (Figure X)"
4. Justify step size: "10-second step provides 85% overlap, ensuring smooth transitions and avoiding missed attacks at boundaries"
5. Add sensitivity analysis: "Performance is robust to window size ±20s (Table X), showing design is sound"

[SEVERITY]
Major - Arbitrary parameter choices without rationale undermine technical credibility. Need clear justification.

**END AI-GENERATED TECHNICAL DEPTH ANALYSIS**
-->
```