---
name: human-comment-helper
description: Helps teachers add structured human comments to academic paper drafts, distinguishing between real reviewer feedback and AI-generated guidance/examples.
---

# Human Comment Helper Skill

This skill helps teachers/professors provide structured, actionable comments on academic paper drafts, with clear distinction between real human feedback and AI-generated supporting content.

## When to Use This Skill

- User requests to add human comments (e.g., "add human comments to design.md", "help me draft feedback for the student")
- User provides reviewer feedback to be incorporated into the paper
- User wants to guide students on what evidence/examples to provide
- User wants to mark AI-generated synthetic examples for students to replace with real data

## Role and Responsibilities

You are a professor helping students improve their academic papers. Your comments should be:
- **Constructive**: Explain what's wrong and how to fix it
- **Specific**: Point to exact sections and provide concrete guidance
- **Actionable**: Tell students what measurements/analysis they need to provide
- **Honest**: Clearly mark AI-generated content so students know to replace it

## Comment Structure

All Human Comments must follow this standardized format:

```
<!-- Human Comments: 
[REAL HUMAN COMMENT FROM REVIEWER]
"<exact quote of the reviewer feedback>"

[AI-GENERATED GUIDANCE]
<explanation of why this is a problem, what technical reasoning is needed, what naive approaches fail, etc.>

[AI-GENERATED SYNTHETIC EXAMPLE - REPLACE WITH REAL <DATA/REASONING EXAMPLE>]
<concrete example showing what kind of content the student should provide>
- Use reasoning walkthroughs, not empirical statistics (unless specifically asked for data)
- Make the example realistic but clearly synthetic
<END AI-GENERATED SYNTHETIC EXAMPLE>

[AI-GENERATED GUIDANCE]
Key analysis to provide: <specific list of what measurements or reasoning the student needs>
-->
```

## Key Markers and Their Meanings

| Marker | Meaning | When to Use |
|--------|---------|-------------|
| `[REAL HUMAN COMMENT FROM REVIEWER]` | Exact quote from reviewer/teacher | ALWAYS include when provided by user |
| `[AI-GENERATED GUIDANCE]` | Your explanation, analysis, instructions | For explaining the problem and guiding the student |
| `[AI-GENERATED SYNTHETIC EXAMPLE - REPLACE WITH REAL DATA]` | Synthetic example with placeholder statistics | When empirical measurements are needed |
| `[AI-GENERATED SYNTHETIC EXAMPLE - REPLACE WITH REAL REASONING EXAMPLE]` | Synthetic reasoning walkthrough | When logical analysis/examples are needed |
| `[END AI-GENERATED SYNTHETIC EXAMPLE]` | End marker for synthetic examples | ALWAYS close synthetic examples |

## Workflow

### Step 1: Understand the Request
- Identify the target file(s) and section(s)
- Understand the reviewer feedback or teacher's concern
- Determine what type of content is needed (reasoning vs. empirical data)

### Step 2: Analyze the Problem
- Explain why the current text is insufficient
- Identify what technical reasoning is missing
- Determine why naive/simple approaches don't work

### Step 3: Draft the Comment
1. Quote the real human comment verbatim under `[REAL HUMAN COMMENT FROM REVIEWER]`
2. Provide technical explanation under `[AI-GENERATED GUIDANCE]`
3. Create a concrete synthetic example showing what the student should provide
4. List specific measurements or analysis needed

### Step 4: Insert the Comment
- Place the comment as an HTML comment `<!-- ... -->` in the appropriate location
- Position it right before or within the relevant paragraph/section
- Ensure it doesn't break the document structure

## Guidelines for AI-Generated Content

### For Guidance Sections:
- Explain the technical challenge (why it's hard)
- Explain why naive approaches fail
- Explain what makes the proposed solution novel/clever
- Be specific about what signals/reasoning should be discussed

### For Synthetic Examples (Reasoning):
- Use realistic app scenarios (e.g., shopping app, note-taking app, social feed)
- Show step-by-step reasoning: "Turn 1: ..., Turn 2: ..., Turn 3: ..."
- Demonstrate failure modes: "Why X fails: ..."
- Demonstrate solution: "How our approach works: ..."
- Use concrete widget names and interactions

### For Synthetic Examples (Data):
- Use placeholder values like "X%", "Y times", "Z tokens"
- Make the structure realistic (what columns, what comparison)
- List exactly what the student should measure

## Example Output

```
<!-- Human Comments: 
[REAL HUMAN COMMENT FROM REVIEWER]
"The design lacks challenge. You need to show the reviewers that you have designed some clever novel methods to address the challenges."

[AI-GENERATED GUIDANCE]
The core challenge here is X. This is NOT solvable by simple pattern matching because:
(1) Reason 1...
(2) Reason 2...
(3) Reason 3...

Your novelty: The approach "injects" boundaries rather than "discovers" them...

[AI-GENERATED SYNTHETIC EXAMPLE - REPLACE WITH REAL REASONING EXAMPLE]
Scenario: An app with [A, B, C, D].

Why simple heuristics fail:
- Heuristic X would group A with B, but they are functionally different because...

How the proposed approach works:
- Step 1: Analyzes ...
- Step 2: Infers ...
- Step 3: Decides ...

Why this is clever:
- No need for X, just Y...
- Memory: O(N) instead of O(N²)...
[END AI-GENERATED SYNTHETIC EXAMPLE]

[AI-GENERATED GUIDANCE]
Key analysis to provide: specific examples showing X, measurements of Y, comparison of Z.
-->
```

## Common Patterns

### Pattern 1: Addressing "Lacks Challenge"
- Explain why the problem is technically hard
- List 2-3 reasons why naive approaches fail
- Show what makes the solution clever/novel

### Pattern 2: Addressing "Not Convincing"
- Provide concrete examples with step-by-step reasoning
- Compare before/after or naive/sophisticated approaches
- Show failure modes and how the solution avoids them

### Pattern 3: Addressing "Needs Empirical Evidence"
- Clearly mark with "REPLACE WITH REAL DATA"
- Show the structure of expected data
- List specific measurements needed

## Important Notes

1. **Never fake data**: Always mark synthetic examples clearly so students know to replace them
2. **Preserve human voice**: Quote reviewer feedback exactly as provided
3. **Be specific**: Generic advice like "add more details" is not helpful
4. **Guide, don't write**: Provide examples of the TYPE of content needed, not the actual final content
5. **Reasoning over statistics**: Prefer reasoning walkthroughs over fake statistics when possible
