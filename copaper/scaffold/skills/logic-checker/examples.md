# Logic Checker - Examples

These examples are extracted from the main SKILL.md for context efficiency. Refer to these when you need format guidance for logic checker comments.

## Example 1: Claim-Evidence Mismatch

```
<!-- AI Comments: 
**AI-GENERATED LOGIC ANALYSIS - FOR AUTHOR REVIEW**

[DISCREPANCY TYPE]
Claim-Evidence Mismatch: Mismatched Scope

[LOCATION]
Section: 解决什么问题 > 问题为什么重要
Claim: "该问题的重要性体现在：(1)安全价值：APT攻击造成的平均损失超过250万美元，早期检测可大幅降低损失"
Supporting Evidence: None provided in paragraph

[PROBLEM DESCRIPTION]
The claim makes a specific quantitative assertion ("average loss over $2.5 million") without providing a citation or source for this statistic. This is a factual claim that requires evidence.

[DETECTED ISSUE]
Missing citation for quantitative claim. The claim states a specific dollar amount for APT attack losses but no source is provided to verify this figure.

[SUGGESTED FIX]
Add a citation to support the $2.5 million figure. For example: "According to [Citation], APT attacks cause an average loss of over $2.5 million." Consider using reports from Mandiant, Verizon DBIR, or similar authoritative sources.

[SEVERITY]
Major - Quantitative claims without citations undermine credibility

**END AI-GENERATED LOGIC ANALYSIS**
-->
```