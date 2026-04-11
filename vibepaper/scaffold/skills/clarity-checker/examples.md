# Clarity Checker - Examples

These examples are extracted from the main SKILL.md for context efficiency. Refer to these when you need format guidance for clarity checker comments.

## Example 1: Undefined Term

```
<!-- AI Comments: 
**AI-GENERATED CLARITY ANALYSIS - FOR AUTHOR REVIEW**

[CLARITY ISSUE TYPE]
Undefined Term: Technical Term Without Definition

[LOCATION]
Section: Insight > Insight的具体描述
Text: "我们发现传统入侵检测系统忽略了攻击行为的时序关联特性，导致对高级持续性威胁(APT)的检测率低下"

[PROBLEM DESCRIPTION]
The term "时序关联特性" (temporal correlation characteristics) is a technical concept used without definition. Readers may not understand what specific temporal correlations are being referred to or why they are important.

[DETECTED ISSUE]
Missing definition for "时序关联特性". The term appears for the first time without explanation of what temporal correlations in attack behavior mean, how they manifest, or why they matter for detection.

[READER IMPACT]
Readers unfamiliar with temporal analysis in security will not understand the core insight. This is the foundational concept of the paper and must be clearly defined.

[SUGGESTED FIX]
Add a definition before or immediately after first use:
"时序关联特性指攻击行为在不同时间阶段之间的关联关系，例如侦察阶段与渗透阶段的因果关系。传统方法孤立分析每个阶段的攻击，忽略了这些时序上的关联。"

Alternative: Provide an example:
"例如，攻击者在侦察阶段收集的信息往往决定了后续渗透阶段的目标选择，这种跨阶段的关联即为时序关联特性。"

[SEVERITY]
Critical - This is the core concept of the paper and must be clearly defined for readers to understand the entire work.

**END AI-GENERATED CLARITY ANALYSIS**
-->
```

## Example 2: Unexpanded Acronym

```
<!-- AI Comments: 
**AI-GENERATED CLARITY ANALYSIS - FOR AUTHOR REVIEW**

[CLARITY ISSUE TYPE]
Acronym Issue: Unexpanded Acronym

[LOCATION]
Section: 解决什么问题 > 问题为什么重要
Text: "APT攻击造成的平均损失超过250万美元"

[PROBLEM DESCRIPTION]
The acronym "APT" is used without expansion. While common in security literature, it should be expanded on first use for readers unfamiliar with the term.

[DETECTED ISSUE]
"APT" appears without prior expansion. First use should include the full term.

[READER IMPACT]
Readers not familiar with security terminology will not understand what type of attack is being discussed.

[SUGGESTED FIX]
Expand on first use:
"高级持续性威胁(Advanced Persistent Threat, APT)攻击造成的平均损失超过250万美元"

Or if defined earlier, verify the definition is prominent:
Ensure APT is defined in a visible location before this use.

[SEVERITY]
Major - APT is a key term for this paper and should be clearly introduced.

**END AI-GENERATED CLARITY ANALYSIS**
-->
```

## Example 3: Ambiguous Reference

```
<!-- AI Comments: 
**AI-GENERATED CLARITY ANALYSIS - FOR AUTHOR REVIEW**

[CLARITY ISSUE TYPE]
Ambiguous Reference: Ambiguous Pronoun

[LOCATION]
Section: 整体方法设计 > 模块间的逻辑联系
Text: "威胁评估模块的反馈用于优化行为提取模块的阈值，这提升了整体检测效果"

[PROBLEM DESCRIPTION]
The pronoun "这" (this) is ambiguous. It could refer to "反馈" (feedback), "优化" (optimization), or the entire preceding clause.

[DETECTED ISSUE]
"这" could mean:
1. The feedback itself
2. The optimization process
3. The use of feedback for optimization

[READER IMPACT]
Readers may be uncertain about what exactly improves detection effectiveness.

[SUGGESTED FIX]
Replace the ambiguous pronoun with explicit reference:
Option 1: "威胁评估模块的反馈用于优化行为提取模块的阈值，这种反馈机制提升了整体检测效果"
Option 2: "威胁评估模块的反馈用于优化行为提取模块的阈值，从而提升整体检测效果"
Option 3: "威胁评估模块的反馈用于优化行为提取模块的阈值，这种优化提升了整体检测效果"

[SEVERITY]
Minor - The meaning can be inferred but could be clearer.

**END AI-GENERATED CLARITY ANALYSIS**
-->
```

## Example 4: Vague Quantifier

```
<!-- AI Comments: 
**AI-GENERATED CLARITY ANALYSIS - FOR AUTHOR REVIEW**

[CLARITY ISSUE TYPE]
Vague Quantifier: Vague Quantity

[LOCATION]
Section: 现有方法局限 > 存在的共性技术局限
Text: "传统方法误报率高达90%，大量误报会淹没真实攻击告警"

[PROBLEM DESCRIPTION]
"大量" (large amount/many) is vague. While the 90% figure is provided, the subsequent claim about "大量误报" lacks specificity.

[DETECTED ISSUE]
"大量误报" is imprecise. How many is "large"? What is the threshold?

[READER IMPACT]
Readers cannot assess the scale of the problem or the effectiveness of solutions that claim to address it.

[SUGGESTED FIX]
Replace vague quantifier with specific data:
Option 1: "传统方法误报率高达90%，每天产生数万条误报告警，淹没了真实攻击告警"
Option 2: "传统方法误报率高达90%，导致安全团队需要处理超过1000条/天的误报"
Option 3: If specific numbers are unavailable, provide relative context: "传统方法误报率高达90%，意味着每10条告警中有9条是误报，严重干扰了安全分析"

[SEVERITY]
Major - Quantitative claims need specific support for credibility.

**END AI-GENERATED CLARITY ANALYSIS**
-->
```

## Example 5: Inconsistent Term Usage

```
<!-- AI Comments: 
**AI-GENERATED CLARITY ANALYSIS - FOR AUTHOR REVIEW**

[CLARITY ISSUE TYPE]
Inconsistent Term Usage: Same Term, Different Meaning

[LOCATION]
Section: 各模块情况 > 模块1
Text: "系统需要在日志产生后1秒内完成攻击链分析"

[PROBLEM DESCRIPTION]
The term "系统" (system) has been used to refer to both:
1. The proposed attack detection system (Section 3-4)
2. The overall network/system being monitored (Section 1)

This usage appears to refer to the proposed detection system, but this is inconsistent with earlier usage in Section 1 where "系统" referred to the monitored network.

[DETECTED ISSUE]
Term "系统" shifts meaning. In 问题定义 section, "企业网络环境中的系统" refers to the target systems being protected. In this section, "系统" refers to the detection tool being proposed.

[READER IMPACT]
Readers may be confused about whether this refers to the proposed tool or the target environment.

[SUGGESTED FIX]
Use consistent terminology:
- For the proposed tool: "检测系统" (detection system), "本方法" (our method), or "攻击链分析系统"
- For the target environment: "目标网络" (target network), "被监控系统" (monitored system), or "企业系统"

[SEVERITY]
Major - Inconsistent terminology confuses readers about the subject of discussion.

**END AI-GENERATED CLARITY ANALYSIS**
-->
```