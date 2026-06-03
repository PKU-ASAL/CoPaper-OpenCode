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

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `paper.md` | **Required** | Step 1 (start) | Primary analysis target |
| `.agents/state.json` | Tool gap | Final step | Checker-result persistence is not currently exposed by the OpenCode plugin; do not edit state directly in plugin-based workflows |

Do NOT read `writingrules.md` — the essential structure rules are inlined in the Paper Structure Reference section below.

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

## Paper Structure Reference

The paper follows VibePaper structure. Key rules for this checker:
- **Level 1-5** (`#` to `#####`): Structural headings only — no body text allowed under these.
- **Level 6** (`######`): Content paragraphs. Title = topic sentence (≤50 chars). Body = supporting text (≤500 chars).
- **Metadata**: HTML comments `<!-- description: ... -->` guide what each section should contain.

### Key Sections to Check

1. **Insight Section**: Is the insight technically deep? Does it require non-trivial implementation?
2. **Insight挑战性分析 Section**: Are challenges real and non-trivial? Is "why hard" clearly explained? Are challenges specific and concrete?
3. **整体方法设计 Section**: Is the overall architecture described? Are components and interactions clear? Is there sufficient design detail?
4. **各模块情况 Section**: Is each module described in depth? Are technical challenges for each module addressed? Are implementation details provided?
5. **实验 Section**: Does evaluation demonstrate technical contribution? Are implementation details for experiments clear?

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

## Examples

For detailed comment examples, see [`examples.md`](examples.md) in this skill directory.

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
