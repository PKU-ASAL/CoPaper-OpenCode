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

## VibePaper Structure Rules

Before checking problem definition, read `writingrules.md` to understand the paper structure. Focus on these key sections:

### Key Sections to Check

1. **问题背景 (Problem Background)**
   - Is the domain context provided?
   - Are current trends discussed?
   - Is the evolution of the problem described?

2. **问题定义 (Problem Definition)**
   - Is the problem precisely defined?
   - Are boundaries and scope clear?
   - Are constraints stated?
   - Is there formal definition?

3. **问题为什么重要 (Why Important)**
   - Is importance claimed?
   - Is importance justified with evidence?
   - Are multiple importance dimensions covered?

4. **问题场景 (Problem Scenarios)**
   - Are concrete scenarios described?
   - Do scenarios illustrate problem clearly?
   - Are scenarios realistic?

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

## Example Output

### Example 1: Vague Problem Statement

```
<!-- AI Comments: 
**AI-GENERATED PROBLEM ANALYSIS - FOR AUTHOR REVIEW**

[PROBLEM ISSUE TYPE]
Unclear Problem Statement: Vague Problem Description

[LOCATION]
Section: 问题定义
Text: "本文研究企业网络安全中的攻击检测问题"

[PROBLEM DESCRIPTION]
The problem is stated in very vague terms. "攻击检测问题" (attack detection problem) is too broad and unspecific. There are many types of attack detection problems - which specific one is being addressed?

[DETECTED ISSUE]
- Problem described as "enterprise network security attack detection"
- No specification of: What type of attacks? What detection approach? What scale?
- Problem scope undefined
- Unclear what subset of "attack detection" is addressed
- Could refer to: IDS, APT detection, malware detection, intrusion detection, etc.

[WHAT'S MISSING]
- Missing element 1: Specific type of attack detection (e.g., "APT attack chain detection" vs "real-time intrusion detection")
- Missing element 2: Detection context (real-time vs post-hoc, network vs host, etc.)
- Missing element 3: Problem scope and boundaries
- Missing element 4: What aspect of existing detection is insufficient

[IMPACT ON PAPER]
- Reviewer concern: "What exactly is the problem? The paper claims to solve 'attack detection' but that's too broad."
- Motivation strength: Weak - reviewers can't assess if problem is significant without specifics
- Research validity: Unclear what problem is being solved, so hard to evaluate contribution

[EVIDENCE EXAMPLES]
- Specific problem: "We address the problem of detecting Advanced Persistent Threat (APT) attack chains in enterprise networks in real-time (within 1 second of log generation)"
- Scope definition: "We focus on multi-stage APT attacks that span reconnaissance, lateral movement, and data exfiltration phases"
- Boundary: "We do not address insider threats or social engineering attacks"

[SUGGESTED ACTIONS]
1. Replace vague statement with specific problem definition: "本文研究企业网络环境中高级持续性威胁(APT)攻击链的实时检测问题"
2. Add problem scope: Specifically mention what types of attacks, what detection latency, what environment
3. Define boundaries: What is NOT addressed (e.g., insider threats, DDoS)
4. Add formal problem definition: Input, output, constraints, success criteria
5. Provide concrete example: "For example, detecting the attack chain: Reconnaissance → Lateral Movement → Data Exfiltration in real-time"

[SEVERITY]
Critical - Vague problem definition undermines the entire paper. Reviewers cannot evaluate contribution without clear problem statement.

**END AI-GENERATED PROBLEM ANALYSIS**
-->
```

### Example 2: Missing Importance Evidence

```
<!-- AI Comments: 
**AI-GENERATED PROBLEM ANALYSIS - FOR AUTHOR REVIEW**

[PROBLEM ISSUE TYPE]
Insufficient Importance Justification: Missing Evidence for Importance

[LOCATION]
Section: 问题为什么重要
Text: "APT攻击对企业造成严重威胁，需要有效的检测方法"

[PROBLEM DESCRIPTION]
The importance claim is made ("严重威胁") but no supporting evidence is provided. The claim is asserted without data, citations, or concrete examples.

[DETECTED ISSUE]
- Claim: "APT attacks pose serious threat to enterprises"
- Evidence provided: None
- No statistics on attack frequency
- No data on financial impact
- No case studies
- No industry reports cited
- No quantification of "严重威胁"

[WHAT'S MISSING]
- Missing element 1: Statistics on APT attack frequency/prevalence
- Missing element 2: Financial impact data (cost of APT attacks)
- Missing element 3: Case study examples (real APT incidents)
- Missing element 4: Industry report citations
- Missing element 5: Detection time statistics (showing current inadequacy)

[IMPACT ON PAPER]
- Reviewer concern: "Why is this problem important? The author claims it's serious but provides no evidence."
- Motivation strength: Weak - unsubstantiated claims don't convince reviewers
- Research validity: Without evidence of importance, research contribution is unclear

[EVIDENCE EXAMPLES]
- Statistical evidence: "According to Mandiant M-Trends 2023, average APT dwell time is 287 days, with median cost of $2.5M per incident"
- Case study: "The SolarWinds attack (2020) affected 18,000 organizations and cost an estimated $90M in remediation"
- Industry report: "Gartner predicts APT detection market will reach $12B by 2026, indicating strong industry demand"
- Failure evidence: "Current solutions detect only 60% of APTs, with average false positive rate of 90% (Study X)"

[SUGGESTED ACTIONS]
1. Add statistical evidence with citation:
   "根据Mandiant M-Trends 2023报告，APT攻击的平均驻留时间为287天，平均每次攻击造成250万美元损失"
   
2. Add case study:
   "典型案例：2020年SolarWinds攻击影响18,000个组织，修复成本估计达9000万美元"

3. Add industry report citation:
   "据Gartner预测，APT检测市场规模将在2026年达到120亿美元，反映企业对此类威胁的高度关注"

4. Add current solution failure evidence:
   "现有方案对APT的检测率仅为60%，误报率高达90%（研究X），难以满足实际需求"

5. Quantify "严重威胁":
   - "导致的平均损失: $X"
   - "影响的组织数量: Y"
   - "检测所需时间: Z天"

[SEVERITY]
Major - Missing evidence for importance claims significantly weakens paper motivation. Must add concrete supporting evidence.

**END AI-GENERATED PROBLEM ANALYSIS**
-->
```

### Example 3: Missing Practical Relevance

```
<!-- AI Comments: 
**AI-GENERATED PROBLEM ANALYSIS - FOR AUTHOR REVIEW**

[PROBLEM ISSUE TYPE]
Missing Practical Relevance Evidence: No Practical Context

[LOCATION]
Section: 问题背景
Text: "攻击链检测是网络安全的重要研究方向"

[PROBLEM DESCRIPTION]
The problem is presented as a research topic without real-world context. There's no discussion of who needs this, where it would be deployed, or what practical constraints exist.

[DETECTED ISSUE]
- Problem framed purely as research topic
- No real-world deployment context
- No industry need demonstrated
- No stakeholder analysis
- No practical constraints discussed
- Abstract motivation only

[WHAT'S MISSING]
- Missing element 1: Real-world context (enterprise SOC environment)
- Missing element 2: Industry need (e.g., survey showing SOCs struggle with attack chain analysis)
- Missing element 3: Stakeholder analysis (who benefits: SOC analysts, CISOs, etc.)
- Missing element 4: Deployment context (where/how this would be used in practice)
- Missing element 5: Practical constraints (real-time requirements, scale, integration needs)

[IMPACT ON PAPER]
- Reviewer concern: "Is this a real problem that practitioners care about, or just a research exercise?"
- Motivation strength: Weak - no demonstration of practical need
- Research validity: Risk of being seen as solution looking for a problem

[EVIDENCE EXAMPLES]
- Industry need: "调研显示，90%的SOC团队认为攻击链分析是当前最大的痛点（SANS 2023报告）"
- Practical context: "企业安全运营中心(SOC)每天产生超过100万条日志，安全分析师难以手动关联攻击链"
- Stakeholder: "安全分析师平均需要4小时手动构建一条攻击链，且准确率仅为70%"
- Deployment context: "我们的目标是在企业SOC环境中，对实时日志流进行攻击链检测，要求延迟<1秒"
- Practical constraints: "实际部署面临：日志格式异构、网络规模大(10k+主机)、实时性要求高"

[SUGGESTED ACTIONS]
1. Add industry need evidence with citation:
   "根据SANS 2023安全运营调研，90%的SOC团队将攻击链分析列为最大挑战"

2. Describe real-world context:
   "企业安全运营中心(SOC)每天处理数十万至数百万条安全日志，分析师需要从中识别和关联多阶段攻击"

3. Identify stakeholders:
   "本研究的受益者包括：(1) SOC分析师：减少手动分析工作量；(2) CISO：提升威胁可见性；(3) 企业：降低APT攻击损失"

4. Describe deployment scenario:
   "系统部署在企业SOC环境中，实时处理来自SIEM的日志流，在日志产生后1秒内完成攻击链检测"

5. Discuss practical constraints:
   "实际部署面临三大挑战：(1) 日志格式异构（厂商A、B、C格式不同）；(2) 规模大（万级主机）；(3) 实时性要求（秒级响应）"

[SEVERITY]
Major - Missing practical context reduces relevance and impact. Must add real-world context and evidence.

**END AI-GENERATED PROBLEM ANALYSIS**
-->
```

### Example 4: Problem-Solution Mismatch

```
<!-- AI Comments: 
**AI-GENERATED PROBLEM ANALYSIS - FOR AUTHOR REVIEW**

[PROBLEM ISSUE TYPE]
Problem-Solution Mismatch: Overclaimed Problem Scope

[LOCATION]
Section: 问题定义
Text: "本文研究企业网络中的攻击检测问题，包括已知攻击、未知攻击、内部威胁和APT攻击"

[PROBLEM DESCRIPTION]
The problem statement claims a broad scope ("known attacks, unknown attacks, insider threats, and APT attacks"), but the actual solution appears to address only a subset (APT attack chain detection).

[DETECTED ISSUE]
- Claimed problem scope: Known attacks, unknown attacks, insider threats, AND APT attacks
- Actual solution: APT attack chain detection (based on method section)
- Discrepancy: Claims broad problem, addresses narrow subset
- Insider threats: Not addressed in method
- Unknown attacks: Not specifically addressed
- Overclaim: Problem scope larger than solution

[WHAT'S MISSING]
- Missing element 1: Justification for why other problem types are not addressed
- Missing element 2: Clarification that solution focuses on APT attack chains
- Missing element 3: Discussion of problem subtypes and which are addressed

[IMPACT ON PAPER]
- Reviewer concern: "The problem statement claims to address insider threats and unknown attacks, but the method only handles APT chains. This is misleading."
- Motivation strength: Undermined by overclaiming
- Research validity: Creates false expectations that solution doesn't meet

[EVIDENCE EXAMPLES]
- Accurate problem statement: "本文研究企业网络中APT攻击链的检测问题，重点关注多阶段攻击的时序关联特征"
- Scope limitation acknowledgment: "我们关注外部APT攻击，不涉及内部威胁和DDoS攻击"
- Justification: "内部威胁具有不同的行为模式，需要专门的研究方法，不在本文范围内"

[SUGGESTED ACTIONS]
1. Revise problem statement to accurately reflect scope:
   "本文研究企业网络环境中APT攻击链的实时检测问题"
   
2. Remove overclaimed aspects:
   Remove "已知攻击、未知攻击、内部威胁" unless actually addressed
   
3. Add scope limitations section:
   "研究范围：本文关注外部APT攻击的多阶段检测，不包括以下情况：
   - 内部威胁检测（需要不同的行为基线）
   - DDoS攻击检测（攻击模式不同）
   - 社会工程攻击检测（无技术特征）"
   
4. Justify scope choice:
   "我们选择APT攻击链作为研究对象，因为：(1) 影响大（平均损失$2.5M）；(2) 检测难（平均驻留287天）；(3) 现有方案不足"

5. If multiple problem types are addressed, provide clear breakdown of which method component addresses which.

[SEVERITY]
Major - Problem-solution mismatch creates false expectations and undermines credibility. Must align problem statement with actual contribution.

**END AI-GENERATED PROBLEM ANALYSIS**
-->
```

### Example 5: Weak Problem Motivation

```
<!-- AI Comments: 
**AI-GENERATED PROBLEM ANALYSIS - FOR AUTHOR REVIEW**

[PROBLEM ISSUE TYPE]
Weak Problem Motivation: No Problem Urgency

[LOCATION]
Section: 问题为什么重要
Text: "攻击链检测是一个有价值的研究方向"

[PROBLEM DESCRIPTION]
The problem is described as "valuable" but there's no explanation of why this problem needs attention NOW, or what gap exists that justifies new research.

[DETECTED ISSUE]
- No timeliness argument (why now?)
- No gap identification (what's missing in current solutions?)
- No urgency (why can't this wait?)
- Generic motivation ("valuable research direction")
- No evolution context (how has problem changed?)

[WHAT'S MISSING]
- Missing element 1: Timeliness argument (recent trends, new threats, technology changes)
- Missing element 2: Gap in current solutions (what can't existing methods do?)
- Missing element 3: Urgency factors (regulatory, threat landscape, industry demand)
- Missing element 4: Problem evolution (how has APT threat changed recently?)

[IMPACT ON PAPER]
- Reviewer concern: "Why does this problem need new research? What's wrong with existing solutions?"
- Motivation strength: Weak - no urgency or gap identified
- Research validity: Unclear why this work is needed now

[EVIDENCE EXAMPLES]
- Timeliness: "近年来APT攻击呈现三大趋势：(1) 攻击链复杂度提升（从5阶段增至10+阶段）；(2) 检测时间要求更严格（从小时级降至秒级）；(3) 攻击隐蔽性增强（使用合法工具）"
- Gap: "现有方法在攻击链检测方面存在以下局限：(1) 静态规则无法适应多变攻击模式；(2) 独立检测无法关联跨阶段行为；(3) 高误报率导致分析师过载"
- Urgency: "CISA在2023年要求关键基础设施在24小时内报告安全事件，对实时检测提出更高要求"
- Evolution: "与2020年相比，2023年APT攻击的驻留时间从200天增至287天，表明现有检测能力不足"

[SUGGESTED ACTIONS]
1. Add timeliness argument:
   "近年来，APT攻击呈现三大新趋势，使得现有检测方法面临挑战：
   (1) 攻击链复杂度：从传统5阶段演化为10+阶段的复杂链条
   (2) 检测实时性：企业要求在攻击早期阶段（前3个阶段）即识别
   (3) 攻击隐蔽性：攻击者越来越多地使用合法工具，绕过传统检测"

2. Identify gap in current solutions:
   "现有攻击链检测方法存在三大局限：
   (1) 静态规则依赖：无法适应攻击模式变化
   (2) 孤立检测：无法关联跨阶段行为
   (3) 高误报率：>90%的误报导致分析师疲劳"

3. Add urgency factors:
   "紧迫性体现在：(1) CISA新规要求24小时内报告事件；(2) 攻击驻留时间持续增加（287天）；(3) 90%企业表示现有工具不足"

4. Discuss problem evolution:
   "与2020年相比，2023年APT攻击更复杂、更隐蔽，传统方法已难以应对"

[SEVERITY]
Major - Weak motivation without urgency or gap makes research contribution unclear. Must add timeliness and gap analysis.

**END AI-GENERATED PROBLEM ANALYSIS**
-->
```

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
