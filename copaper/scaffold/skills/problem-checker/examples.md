# Problem Checker - Examples

These examples are extracted from the main SKILL.md for context efficiency. Refer to these when you need format guidance for problem checker comments.

## Example 1: Vague Problem Statement

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

## Example 2: Missing Importance Evidence

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

## Example 3: Missing Practical Relevance

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

## Example 4: Problem-Solution Mismatch

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

## Example 5: Weak Problem Motivation

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
