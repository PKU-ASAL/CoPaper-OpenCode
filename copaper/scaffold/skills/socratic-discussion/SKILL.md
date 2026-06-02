---
name: socratic-discussion
description: Conducts Socratic research discussions to help users critically examine their insights, methods, and claims. Integrates with 7 checker dimensions for targeted questioning. Use this skill when the user wants to discuss or analyze their research.
---
# Socratic Discussion Skill
This is the core value skill in CoPaper. It helps researchers think more deeply about their own work through structured Socratic questioning instead of letting the system provide answers directly. It operates over the 57 discussion dimensions defined in `copaper/dimensions.py`, aligned with the 7 checker families used across the project.
Its purpose is not to draft faster. Its purpose is to improve judgment: clearer problem definition, better novelty boundaries, stronger technical depth, tighter logic, clearer expression, sounder evaluation design, and more trustworthy evidence.

## When to Use This Skill
- User says "discuss my research"
- User says "research discussion"
- User says "analyze my insight"
- User says "analyze my claim"
- User says "苏格拉底讨论" or "研究讨论"
- User says "分析我的 Insight" or "帮我审视这个想法"
- User wants critical feedback before writing `paper.md`
- User wants to stress-test claims, methods, or contribution statements
- User wants a guided discussion based on checker findings

## Seven Checker Families
This skill must recognize all seven checker families:
1. `problem-checker`
2. `novelty-checker`
3. `technical-depth-checker`
4. `logic-checker`
5. `clarity-checker`
6. `evaluation-protocol-checker`
7. `data-checker`

## Five Laws of Socratic Discussion
1. **Question Before Answer** — never provide answers first.
2. **Constraint-Based Difficulty** — adjust difficulty to response quality.
3. **Evidence Demanded** — every important claim must face evidence.
4. **Alternative Mandatory** — every dimension must consider alternatives.
5. **Human Escalation Available** — the user can skip, pause, or stop anytime.

## Five Socratic Question Types
Each dimension is explored in this order:
1. **Clarification (澄清)** — "What exactly do you mean by X?"
2. **Assumption (假设)** — "What assumptions underlie this?"
3. **Evidence (证据)** — "What evidence supports this?"
4. **Alternative (替代)** — "Are there other approaches or explanations?"
5. **Implication (影响)** — "What follows if this is true or false?"
Do not reorder the sequence unless the user explicitly asks to jump.

## Core Discussion Principles
- Ask one main question at a time.
- Discuss exactly one dimension at a time.
- Prefer the predefined question bank in `copaper/dimensions.py`.
- If checker issues exist, use them to sharpen the first question.
- If the user's answer is weak, ask a narrower follow-up instead of changing dimensions.
- Never fabricate evidence, references, experiments, or prior work.
- Never claim a checker issue is resolved unless the discussion genuinely addressed it.

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `storyline.md` | **Required** | Step 1 (start) | Research narrative, insight, method outline |
| `paper.md` | **Required** | Step 1 (start) | Current paper state and claim wording |
| Checker status | Optional | Step 2 (if checker-driven discussion) | Use `copaper_checker_status` for read-only checker family status, severity counts, stale signals, and precheck evidence |
| `relatedwork/papers/*.md` | Optional | Step 1 (as needed) | Prior-work summaries for contrast questions |
| `.agents/cross_index.json` | Optional | Step 1 (as needed) | Paper-technique mappings for targeted questioning |
| `.agents/discussion_log.json` | Optional | Step 3 (to find covered dimensions) | Prior discussion history |
| `copaper/dimensions.py` | **Required** | Step 1 (start) | 57 dimensions and question bank |

If some files do not exist yet, continue with the available context instead of blocking the workflow.

## Workflow
### Step 1: Gather Research Context
1. Read `storyline.md`.
2. Read `paper.md`.
3. Read relevant summaries from `relatedwork/papers/`.
4. Read `.agents/cross_index.json` if available.
5. Read `copaper/dimensions.py`.
Goal: understand the user's problem, insight, method, and evidence situation before asking questions.

### Step 2: Integrate Checker Results
1. Call `copaper_workflow_status` if workflow phase status, current phase, phase table, or next-step recommendation is needed.
2. Call `copaper_checker_status` to detect which of the 7 checker families have run, whether results are stale, and the Critical/Major/Minor counts.
3. Use the tool output to prioritize checker families with stale or non-clean statuses.
4. If detailed issue text is needed and is not present in the current conversation, ask the user to run or provide `markdown-review`; do not read `.agents/state.json` directly just to infer checker status.
5. Map available unresolved issues to dimensions using `checker_name` and issue meaning.
6. Mark those dimensions as priority dimensions.
If checker results exist, explicitly tell the user that checker-flagged dimensions will be prioritized first.

### Step 3: Determine Uncovered Dimensions
1. Read `.agents/discussion_log.json` if it exists.
2. If it does not exist, treat it as an empty record.
3. Read the top-level `covered_dimensions` field.
4. Identify dimensions not yet discussed.
5. Sort uncovered dimensions in this order:
   - checker-flagged dimensions first
   - then by checker family
   - then by registry order in `copaper/dimensions.py`

### Step 4: Present a Dimension Menu
Present the uncovered dimensions grouped by checker family.
Example:
```text
Uncovered Discussion Dimensions:

Problem Definition (problem-checker):
  ⚠️ 1. Unclear Problem Statement [checker found issues]
  2. Missing Problem Formalization

Novelty (novelty-checker):
  ⚠️ 3. Duplicate or Near-Duplicate Insight [checker found issues]
  4. Insufficient Differentiation
```
Use `⚠️` to mark dimensions tied to unresolved checker issues.
**STOP AND WAIT** for the user to choose one dimension.

### Step 5: Start the Discussion Loop
For the selected dimension:
1. Set the current dimension.
2. Reset the per-dimension round counter.
3. Load the five question types in order.
4. Start with Clarification.
5. Use the predefined question text from `copaper/dimensions.py` when available.
6. If this dimension has checker issues, incorporate the issue wording into the first question.

### Step 6: Delegate Deep Question Preparation
Use a deep subagent for each round, following the repo's subagent pattern.
Recommended delegation pattern:
- Use `task(category="deep")` or equivalent.
- The subagent should:
  - read relevant context files
  - read prior rounds for the current dimension
  - read linked checker issues if present
  - generate one targeted question for the current question type
  - assess the user's latest answer as `sufficient`, `weak`, or `skipped`
  - propose one follow-up if the answer is weak
The subagent must not edit project files. It only returns analysis and question wording.

### Step 7: Run the Question-Answer Cycle
For each round:
1. Ask exactly one question.
2. Wait for the user response.
3. Accept these control responses at any time:
   - `skip` — skip this question
   - `done` — end this dimension
   - `pause` — pause the overall discussion
   - `stop` — stop the overall discussion
4. Evaluate the response.
5. If sufficient, move to the next question type.
6. If weak, explain the weakness precisely and ask a narrower follow-up.
Do not mistake long answers for strong answers.

### Step 8: Handle Weak Responses
If the response is weak:
1. State the weakness clearly and respectfully.
2. Tie the weakness to a concrete issue when possible:
   - missing scope boundary
   - missing assumption
   - missing evidence
   - missing comparison
   - contradiction with current paper content
   - unresolved checker issue
3. Ask one targeted follow-up.
4. Do not exceed the weak-response limit.
If the user still cannot answer after the limit, summarize the gap and move on or offer to close the dimension.

### Step 9: Safety Valves
This skill must enforce all safety valves:
- **Per-dimension limit**: maximum 10 rounds per dimension
- **Total session limit**: maximum 50 rounds across all dimensions
- **Weak-response limit**: maximum 3 follow-up questions for one weak-response chain
- **User escape**: `skip`, `done`, `pause`, and `stop` must always work
If a dimension reaches 8 rounds, warn the user that the dimension is near the limit.
If a dimension reaches 10 rounds, stop that dimension and move to summary.
If the overall session reaches 50 rounds, stop further questioning and produce a session wrap-up.

### Step 10: Generate a Dimension Summary
After completing a dimension, generate all of these sections:
1. `Key Points`
2. `Strengths`
3. `Weaknesses`
4. `Open Questions`
5. `Suggestions`
6. `Checker Issues Addressed`
The summary must include key points, strengths, weaknesses, unresolved questions, specific suggestions for `storyline.md` or `paper.md`, and checker issue IDs that were meaningfully addressed.
Do not apply any edits automatically.

### Step 11: Ask for User Confirmation
After showing the dimension summary, ask whether the user:
- accepts the suggestions for later use
- wants to continue to another dimension
**STOP AND WAIT** before moving to the next dimension.

### Step 12: Record the Discussion
Write the result to `.agents/discussion_log.json`.
If the file does not exist, create it. Preserve old records and append new session entries.

### Step 13: Workflow State
Use `copaper_workflow_set_phase` only for phase-level updates such as marking `discussion` as `in_progress` or `complete`, and only after explicit user confirmation.
The tool call writes `.agents/state.json` and appends the workflow event to `.agents/events.jsonl`; do not substitute a prompt-only note or manual file edit.

The current OpenCode plugin does not expose a dedicated tool for discussion metadata or checker issue resolution status. Do not manually edit `.agents/state.json` for those fields in plugin-based workflows; report the limitation instead.

## Checker-Priority Strategy
When unresolved checker issues exist:
1. Prioritize those dimensions first.
2. Mention the checker family explicitly in the menu.
3. Use the issue description to sharpen the opening question.
4. Keep the discussion tied to the actual weakness reported by the checker.
5. In the summary, note whether the issue was clarified, narrowed, partially addressed, or still unresolved.
This makes the skill the repair layer between automated diagnosis and later writing.

## Menu Grouping by Checker
When presenting the dimension menu, group by:
- Problem Definition — `problem-checker`
- Novelty — `novelty-checker`
- Technical Depth — `technical-depth-checker`
- Logic — `logic-checker`
- Clarity — `clarity-checker`
- Evaluation Protocol — `evaluation-protocol-checker`
- Data / Evidence Integrity — `data-checker`

## Question Generation Guidance
When generating a question, prefer this source order:
1. predefined question text in the dimension registry
2. unresolved checker issue wording
3. relevant claims in `storyline.md`
4. relevant claims in `paper.md`
5. contrasts from `relatedwork/papers/`
Good questions are specific, contextualized, and hard enough to expose gaps.
Bad questions are generic, multi-part, answer-supplying, dismissive, or dependent on fabricated evidence.

## `.agents/discussion_log.json` Format
The discussion log must be JSON and must preserve history.
Recommended structure:
```json
{
  "version": 1,
  "covered_dimensions": ["problem_unclear_statement"],
  "sessions": [
    {
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2026-04-09T10:30:00Z",
      "dimension_id": "problem_unclear_statement",
      "dimension_name": "Unclear Problem Statement",
      "checker_name": "problem-checker",
      "priority_reason": "unresolved checker issue",
      "status": "completed",
      "total_rounds_before_dimension": 3,
      "rounds_used": 5,
      "rounds": [
        {
          "round": 1,
          "question_type": "clarification",
          "question_text": "Can you state the core problem in one sentence?",
          "user_answer": "...",
          "ai_assessment": "sufficient",
          "follow_up": "",
          "linked_checker_issue_ids": ["issue_id_1"],
          "timestamp": "2026-04-09T10:31:00Z"
        }
      ],
      "summary": {
        "key_points": ["..."],
        "strengths": ["..."],
        "weaknesses": ["..."],
        "open_questions": ["..."],
        "suggestions": ["..."],
        "checker_issues_addressed": ["issue_id_1"]
      }
    }
  ]
}
```
Required top-level fields: `version`, `covered_dimensions`, `sessions`.
Required session fields: `session_id`, `timestamp`, `dimension_id`, `dimension_name`, `checker_name`, `priority_reason`, `status`, `total_rounds_before_dimension`, `rounds_used`, `rounds`, `summary`.
Required round fields: `round`, `question_type`, `question_text`, `user_answer`, `ai_assessment`, `follow_up`, `linked_checker_issue_ids`, `timestamp`.
Required summary fields: `key_points`, `strengths`, `weaknesses`, `open_questions`, `suggestions`, `checker_issues_addressed`.

## Must NOT Do
- **NEVER** write the research content for the user
- **NEVER** automatically modify `storyline.md` or `paper.md`
- **NEVER** skip user confirmation between dimensions
- **NEVER** discuss multiple dimensions in one round
- **NEVER** exceed 10 rounds for one dimension
- **NEVER** exceed 50 rounds in one session
- **NEVER** provide answers instead of questions
- **NEVER** fabricate references, evidence, experiments, or prior work
- **NEVER** dismiss the user's ideas; guide them to examine their own reasoning
- **NEVER** mark checker issues resolved without support
- **NEVER** erase prior history from `.agents/discussion_log.json`

## Important Notes
1. This skill is the core value of CoPaper because it improves thinking, not just writing speed.
2. The checkers provide the issue map; this skill provides the interactive reasoning layer.
3. Checker integration is optional, but much more powerful when checker results exist.
4. Every completed dimension should leave behind a reusable summary and concrete suggestions.
5. Discussion logs are long-term memory for later revision and writing phases.
6. Bilingual support matters for triggers, menu labels, and prompts.
7. The correct tone is rigorous but respectful.
