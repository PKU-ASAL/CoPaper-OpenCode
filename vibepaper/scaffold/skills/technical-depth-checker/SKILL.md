---
name: technical-depth-checker
description: Evaluates whether the design section contains sufficient technical depth, including significant new designs, non-trivial challenges, and solutions that cannot be achieved with simple approaches.
---

# Technical Depth Checker Skill

This skill evaluates the technical depth of a paper's design section, ensuring it contains significant new designs, addresses real challenges that cannot be solved with simple solutions, and provides sufficient technical detail for the claimed contribution.

## When to Use This Skill

- User requests to check technical depth (e.g., "check technical depth", "is the design deep enough?")
- User wants to verify design significance and complexity
- User needs to ensure challenges are non-trivial
- User wants to strengthen technical contributions

## Role and Responsibilities

You are an AI assistant performing technical depth analysis of academic papers. Your comments are AI-generated and must be clearly marked as such. Your analysis should be:
- **Expert-level**: Assess against state-of-the-art technical standards
- **Critical**: Honestly evaluate whether challenges are real and solutions are non-trivial
- **Constructive**: Suggest how to increase technical depth
- **Domain-aware**: Consider domain-specific expectations for depth
- **Transparent**: All comments must be explicitly marked as AI-generated

## Key Markers and Their Meanings

| Marker | Meaning | When to Use |
|--------|---------|-------------|
| `<!-- AI Comments:` | Start of AI-generated comment | ALWAYS use to begin every comment |
| `**AI-GENERATED TECHNICAL DEPTH ANALYSIS - FOR AUTHOR REVIEW**` | Warning that content is AI-generated | ALWAYS include at the start of comment body |
| `[DEPTH ISSUE TYPE]` | Category of technical depth problem | ALWAYS include to classify the issue |
| `[LOCATION]` | Where the issue is found | ALWAYS include with section name and exact quote |
| `[SEVERITY]` | How serious the issue is | ALWAYS include (Critical/Major/Minor) |
| `**END AI-GENERATED TECHNICAL DEPTH ANALYSIS**` | End of AI analysis content | ALWAYS include before closing `-->` |

## Technical Depth Issue Types

### 1. Shallow or Trivial Design

**Definition**: The design lacks significant new contributions and appears too simple for a research paper.

| Type | Description | Example |
|------|-------------|---------|
| **Direct Application** | Simply applies existing technique without adaptation | "We use BERT for text classification" without novel adaptation |
| **Configuration Change** | Only differs in parameters/settings | "We set learning rate to 0.001 instead of 0.01" |
| **Pipeline Assembly** | Just combines existing tools | "We use Spark + Kafka + Flink" as-is |
| **Obvious Extension** | Straightforward extension anyone would do | Add one feature that naturally follows from prior work |
| **Implementation Only** | Novelty claimed for implementation details | "We implemented X in Rust" when algorithm is unchanged |

### 2. Missing Technical Challenges

**Definition**: The design doesn't address real challenges or the challenges are not actually difficult.

| Type | Description | Example |
|------|-------------|---------|
| **No Challenge Stated** | Design presented without discussing challenges | Method described but no difficulties mentioned |
| **Pseudo-Challenges** | Claimed challenges are trivial or already solved | "Challenge: We need to store data" (solved by databases) |
| **Missing Why-Hard Analysis** | Doesn't explain why problem is hard | States "this is challenging" without explanation |
| **Challenge Not Addressed** | Challenge mentioned but design doesn't solve it | Lists challenge, solution ignores it |
| **Over-Simplified Challenge** | Real challenge exists but oversimplified | Complex problem reduced to trivial solution |

### 3. Obvious or Standard Solutions

**Definition**: The proposed solution could be achieved with simple, standard, or obvious approaches.

| Type | Description | Example |
|------|-------------|---------|
| **Standard Library Solution** | Could use existing library/framework | Custom implementation when standard library exists |
| **Textbook Approach** | Uses well-known technique as if novel | Standard algorithm presented as innovation |
| **Off-the-Shelf Components** | Just configures existing components | "We configured K8s with 3 replicas" |
| **Brute Force Solution** | Solution is simple enumeration/search | "We check all possibilities" without optimization |
| **Obvious Heuristic** | Intuitive heuristic anyone would think of | "We use most frequent item" as sophisticated method |

### 4. Insufficient Technical Detail

**Definition**: The design lacks the technical detail necessary for readers to understand or reproduce the contribution.

| Type | Description | Example |
|------|-------------|---------|
| **Missing Algorithm Details** | Algorithm described at too high level | "We use ML to classify" without model/architecture |
| **Missing Implementation Details** | No implementation specifics | No data structures, APIs, or component details |
| **Missing Parameters** | Key parameters not specified | "We tuned parameters" without values |
| **Missing Data Structures** | No discussion of data structures | Claims efficiency without data structure design |
| **Missing Workflow** | No clear execution flow | Components described but no interaction diagram |
| **Missing Edge Cases** | Only happy path described | No discussion of failure cases or exceptions |

### 5. Missing Design Rationale

**Definition**: Design decisions are not justified with technical reasoning.

| Type | Description | Example |
|------|-------------|---------|
| **Arbitrary Choices** | Design choices made without justification | "We chose X" without explaining why |
| **Missing Trade-off Analysis** | No discussion of alternatives | Doesn't explain why X over Y |
| **No Comparative Reasoning** | Doesn't compare with alternatives | "Our approach is better" without comparison |
| **Missing Constraint Analysis** | Constraints not discussed | Doesn't explain constraints that motivated design |
| **No Design Principles** | Underlying principles not articulated | Complex design without guiding principles |

### 6. Missing Complexity Analysis

**Definition**: No analysis of time/space complexity or why the approach handles complexity well.

| Type | Description | Example |
|------|-------------|---------|
| **No Complexity Claim** | Claims efficiency without complexity analysis | "Our method is efficient" without Big-O |
| **No Scalability Discussion** | Doesn't discuss how it scales | No mention of performance under load |
| **Missing Bottleneck Analysis** | Doesn't identify computational bottlenecks | No discussion of what's expensive |
| **No Resource Analysis** | Resource requirements not discussed | Memory/CPU/Network requirements absent |
| **Unrealistic Complexity Claims** | Claims not backed by analysis | "O(1) lookup" without data structure justification |

### 7. Superficial Challenge-Solution Mapping

**Definition**: The mapping between challenges and solutions is weak or superficial.

| Type | Description | Example |
|------|-------------|---------|
| **Generic Solution** | One-size-fits-all solution for specific challenge | Generic approach for domain-specific problem |
| **Challenge Mismatch** | Solution doesn't actually address stated challenge | Challenge: "scalability" → Solution: "better UI" |
| **Missing Challenge-Solution Link** | No explicit connection between challenge and design | Challenges listed, solutions not linked |
| **Shallow Mapping** | Link exists but superficial | "Challenge X → we use technique Y" without depth |

### 8. Missing Alternative Design Discussion

**Definition**: No discussion of alternative designs and why they were not chosen.

| Type | Description | Example |
|------|-------------|---------|
| **No Alternatives Considered** | Only one design presented | Doesn't mention other possible approaches |
| **Strawman Alternatives** | Alternatives are obviously bad | Compares only to trivial baselines |
| **Missing Design Space** | Design space not explored | Doesn't discuss spectrum of possible designs |
| **No Ablation Justification** | No explanation for why components are needed | Components added without necessity argument |

### 9. Insufficient Novelty in Design

**Definition**: The design doesn't introduce sufficient novel components or techniques.

| Type | Description | Example |
|------|-------------|---------|
| **All Components Standard** | No novel component in the design | Everything is off-the-shelf |
| **No Novel Technique** | No new algorithm/method introduced | Uses only existing techniques |
| **No Novel Combination** | Combination also not novel | Combination of A+B also exists in prior work |
| **Minor Variation Only** | Only minor tweaks to existing designs | Tiny modification of prior approach |

### 10. Missing Domain-Specific Depth

**Definition**: Lacks the depth expected in the specific domain (systems, ML, theory, etc.).

| Type | Description | Example |
|------|-------------|---------|
| **Systems Paper: No Architecture** | Systems paper without architectural depth | No component diagram, no distributed design |
| **ML Paper: No Model Detail** | ML paper without model architecture | "We use neural networks" without architecture |
| **Theory Paper: No Proof Sketch** | Theory without formal treatment | Claims without proofs or formal reasoning |
| **Empirical Paper: No Experimental Design** | Empirical without rigorous methodology | No experimental protocol or controls |
| **Algorithm Paper: No Pseudocode** | Algorithm without formal description | No pseudocode or formal specification |

## Comment Structure

**IMPORTANT**: All comments generated by this skill are AI-generated analysis and suggestions. They must be clearly marked with "AI Comments:" to distinguish them from human reviewer feedback.

All Technical Depth Check Comments must follow this standardized format:

```
<!-- AI Comments: 
**AI-GENERATED TECHNICAL DEPTH ANALYSIS - FOR AUTHOR REVIEW**

[DEPTH ISSUE TYPE]
<Type from the 10 categories above>

[LOCATION]
Section: <section name>
Text: "<exact quote of the problematic text>"

[PROBLEM DESCRIPTION]
<explanation of why this is a technical depth problem>

[DETECTED ISSUE]
<specific description of the technical depth concern>

[WHY THIS LACKS DEPTH]
<explanation of why current content is insufficient>
- What's missing: <specific missing elements>
- Why it matters: <how this affects contribution>
- Standard expectation: <what similar papers typically include>

[COMPARISON TO EXPECTED DEPTH]
<what would be expected for this type of contribution>
- In similar papers: <how others handle this>
- In top venues: <what top-tier papers include>
- For this contribution type: <what's needed for claimed contribution>

[SUGGESTED IMPROVEMENTS]
<concrete suggestions to increase technical depth>
1. <specific addition or modification>
2. <specific addition or modification>
3. <specific addition or modification>

[SEVERITY]
Critical / Major / Minor
- Critical: Lacks technical depth for any research publication
- Major: Significant depth issue that weakens contribution
- Minor: Could be strengthened with additional depth

**END AI-GENERATED TECHNICAL DEPTH ANALYSIS**
-->
```

## Workflow

### Step 1: Identify Contribution Type

Determine what type of contribution the paper makes:
- **Algorithm/Method**: New algorithm or method
- **System**: New system design/implementation
- **Theory**: Theoretical contribution
- **Empirical**: Experimental study
- **Tool/Framework**: Tool or framework
- **Application**: Application of existing techniques

Each type has different depth expectations.

### Step 2: Read Design Section

From `paper.md`:
1. Read the **整体方法设计** (Overall Method Design) section
2. Read the **各模块情况** (Module Details) section
3. Read the **Insight挑战性分析** (Challenge Analysis) section
4. Note all technical challenges stated
5. Note all design decisions made
6. Note all components and their interactions

### Step 3: Extract Technical Challenges

Identify:
1. What challenges are stated?
2. Why are they challenging?
3. What makes them hard?
4. Why can't simple solutions work?
5. Are challenges domain-appropriate?

### Step 4: Analyze Design Depth

For each design component:
1. Is it novel? How novel?
2. Is it described in sufficient detail?
3. Is the rationale provided?
4. Is complexity analyzed?
5. Are alternatives discussed?

### Step 5: Check Challenge-Solution Mapping

For each challenge:
1. What solution addresses it?
2. How does the solution address it?
3. Is the solution non-trivial?
4. Could a simpler solution work?
5. Is the mapping clear and explicit?

### Step 6: Assess Technical Sophistication

Evaluate:
1. Does design show engineering sophistication?
2. Are non-obvious design decisions made?
3. Are trade-offs properly analyzed?
4. Is there depth in component interactions?
5. Are edge cases and failure modes handled?

### Step 7: Compare with Standards

Compare against:
1. **Similar papers in the domain**: What do they include?
2. **Top-tier venue papers**: What level of detail?
3. **State-of-the-art**: How does this compare?
4. **Expected contribution**: What's needed for claimed contribution?

### Step 8: Generate Comments

For each depth issue found:
1. Classify the type (from 10 categories)
2. Quote the exact location
3. Explain the depth problem
4. Compare to expected depth
5. Provide specific improvements
6. Assign severity level

### Step 9: Provide Summary Report

Generate a comprehensive technical depth assessment.

## VibePaper Structure Rules

Before checking technical depth, read `writingrules.md` to understand the paper structure. Focus on these key sections:

### Key Sections to Check

1. **Insight Section**
   - Is the insight technically deep?
   - Does it require non-trivial implementation?

2. **Insight挑战性分析 Section**
   - Are challenges real and non-trivial?
   - Is "why hard" clearly explained?
   - Are challenges specific and concrete?

3. **整体方法设计 Section**
   - Is the overall architecture described?
   - Are components and interactions clear?
   - Is there sufficient design detail?

4. **各模块情况 Section**
   - Is each module described in depth?
   - Are technical challenges for each module addressed?
   - Are implementation details provided?

5. **实验 Section**
   - Does evaluation demonstrate technical contribution?
   - Are implementation details for experiments clear?

## Output Format

### Summary Report

After analyzing the paper, provide a summary:

```markdown
## Technical Depth Assessment Summary

**Paper**: [Paper title]
**Contribution Type**: [Algorithm/System/Theory/Empirical/Tool/Application]

### Overall Technical Depth

**Depth Rating**: Deep / Moderate / Shallow

**Key Strengths**:
- [What aspects show good technical depth]

**Key Weaknesses**:
- [What aspects lack technical depth]

### Challenge Analysis

**Stated Challenges**: X
- [List each stated challenge]

**Challenge Quality**:
- Real and non-trivial: Y
- Pseudo-challenges: Z
- Missing challenge analysis: W

**Challenge-Solution Mapping**:
- Well-mapped: Y
- Weakly mapped: Z
- Unmapped: W

### Design Depth Analysis

**Design Components**: X
- Novel components: Y
- Standard components: Z
- Unclear components: W

**Design Detail Level**:
- Sufficient detail: [components]
- Insufficient detail: [components]

**Missing Elements**:
- [ ] Architecture diagram
- [ ] Algorithm pseudocode
- [ ] Complexity analysis
- [ ] Design rationale
- [ ] Alternative designs
- [ ] Trade-off analysis
- [ ] Edge case handling

### Technical Sophistication

**Sophistication Level**: High / Medium / Low

**Engineering Sophistication**:
- [What shows engineering depth]

**Missing Sophistication**:
- [What could be more sophisticated]

### Technical Depth Issues Found
- Critical: X
- Major: Y
- Minor: Z

### Comparison to Standards

**Similar Papers Include**:
- [What similar papers typically have]

**This Paper Missing**:
- [What this paper lacks compared to similar work]

**Top-Tier Papers Include**:
- [What top-tier papers have]

**This Paper Missing**:
- [What this paper lacks for top-tier]

### Recommendations

**To Increase Technical Depth**:
1. [Specific recommendation]
2. [Specific recommendation]

**To Strengthen Challenges**:
1. [Specific recommendation]
2. [Specific recommendation]

**To Add Missing Detail**:
1. [Specific recommendation]
2. [Specific recommendation]

### Risk Assessment

**Publication Risk**: High / Medium / Low
- [Reasoning]

**Reviewer Concerns Likely**:
1. [Specific concerns reviewers might raise]
```

### Inline Comments

Insert detailed HTML comments at problematic locations following the comment structure defined above. All comments must:
- Start with `<!-- AI Comments:`
- Include the marker `**AI-GENERATED TECHNICAL DEPTH ANALYSIS - FOR AUTHOR REVIEW**`
- End with `**END AI-GENERATED TECHNICAL DEPTH ANALYSIS**` before the closing `-->`

## Example Output

### Example 1: Shallow Design - Direct Application

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

### Example 2: Missing Technical Challenges

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

### Example 3: Obvious Solution

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

### Example 4: Insufficient Technical Detail

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

### Example 5: Missing Design Rationale

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

## Common Patterns

### Pattern 1: Checking Algorithm Papers

For algorithm-focused papers, check:
- Is there formal pseudocode?
- Is there complexity analysis (time/space)?
- Is there correctness proof or argument?
- Are there optimizations discussed?
- Is there comparison with state-of-the-art algorithms?
- Are edge cases handled?

### Pattern 2: Checking Systems Papers

For systems-focused papers, check:
- Is there architecture diagram?
- Are component interactions described?
- Is there scalability analysis?
- Are distributed aspects discussed (if applicable)?
- Is there performance optimization?
- Are failure modes and recovery discussed?
- Is there resource usage analysis?

### Pattern 3: Checking ML Papers

For ML-focused papers, check:
- Is model architecture specified?
- Are hyperparameters and training details provided?
- Is there discussion of why this architecture?
- Are training challenges discussed?
- Is there ablation study?
- Are baselines comprehensive and fair?

### Pattern 4: Evaluating Challenge Difficulty

When evaluating claimed challenges:
- Is the challenge real? (exists in practice)
- Is the challenge hard? (not trivially solvable)
- Is there evidence of difficulty? (prior attempts failed)
- Why do simple approaches fail? (explicit analysis)
- Is the challenge domain-appropriate? (relevant to problem)

### Pattern 5: Assessing Design Sophistication

To assess sophistication:
- Are non-obvious design decisions made?
- Are there clever optimizations?
- Is there deep understanding of trade-offs?
- Are domain-specific constraints handled well?
- Are edge cases considered?
- Is there engineering craftsmanship?

## Important Notes

1. **All comments are AI-generated**: Every comment inserted by this skill is generated by AI analysis and must be clearly marked with "AI Comments:". These are NOT human reviewer feedback and should not be treated as such.

2. **Depth varies by contribution type**: Algorithms need formal analysis, systems need architectural depth, ML needs model detail, empirical needs methodological rigor.

3. **Consider target venue**: Top-tier venues (NSDI, OSDI, SOSP, SIGCOMM) expect high technical depth. Workshops may have lower bars.

4. **Balance depth and clarity**: Deep technical content should still be clearly explained. Depth without clarity is not helpful.

5. **Depth is necessary but not sufficient**: Technical depth is required but doesn't guarantee acceptance. Also need novelty, evaluation, etc.

6. **Real challenges matter**: Pseudo-challenges are easy to spot and weaken credibility. Focus on real, hard challenges.

7. **Engineering sophistication counts**: For systems papers, engineering depth (clever optimizations, handling edge cases) is valuable.

8. **Compare to similar work**: What do similar papers include? This is a good baseline for expectations.

9. **Authors should verify**: AI may miss domain-specific depth conventions. Authors should ensure their domain's expectations are met.

10. **Provide constructive paths**: Even if depth is lacking, show how to increase it.

## Detection Checklist

Use this checklist during analysis:

### Challenge Analysis
- [ ] All challenges are real and non-trivial
- [ ] Each challenge has "why hard" explanation
- [ ] Naive/simple solutions are shown to fail
- [ ] Challenges are specific and concrete
- [ ] Challenges are domain-appropriate

### Design Depth
- [ ] Overall architecture is described
- [ ] Components are detailed
- [ ] Component interactions are clear
- [ ] Novel components are highlighted
- [ ] Design decisions are justified

### Technical Detail
- [ ] Algorithms are formally specified
- [ ] Data structures are described
- [ ] Parameters are stated with rationale
- [ ] Complexity is analyzed
- [ ] Implementation details are sufficient

### Design Rationale
- [ ] Design choices are justified
- [ ] Trade-offs are analyzed
- [ ] Alternatives are discussed
- [ ] Constraints are explained
- [ ] Principles are articulated

### Challenge-Solution Mapping
- [ ] Each challenge has corresponding solution
- [ ] Solutions address challenges non-trivially
- [ ] Mapping is explicit and clear
- [ ] Solutions are appropriate for challenges

### Technical Sophistication
- [ ] Non-obvious design decisions made
- [ ] Clever optimizations included
- [ ] Edge cases handled
- [ ] Deep understanding demonstrated
- [ ] Engineering craftsmanship evident

### Missing Elements Check
- [ ] Architecture diagram present (if systems)
- [ ] Pseudocode present (if algorithm)
- [ ] Model architecture specified (if ML)
- [ ] Complexity analysis included
- [ ] Failure modes discussed
- [ ] Scalability addressed

### Comparison to Standards
- [ ] Matches depth of similar papers
- [ ] Meets venue expectations
- [ ] Appropriate for claimed contribution
- [ ] State-of-the-art techniques considered
