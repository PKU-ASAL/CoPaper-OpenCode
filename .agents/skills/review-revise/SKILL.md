---
name: review-revise
description: Conducts multi-round Review-Revise cycles based on 7-checker output to systematically improve paper quality. Each issue requires user confirmation before modification. Use this skill when the user wants to review and revise their paper.
---
# Review-Revise Skill
This skill runs a controlled Review-Revise loop over checker findings. In plugin-based workflows, read-only checker status is available through `vibepaper_checker_status`, and confirmed checker run summaries can be recorded through `vibepaper_checker_record`; full issue-resolution writes are still a tool gap.
Use `@vibepaper-reviewer` when available to explain checker findings, severity, and likely reviewer concerns before any writing revision is proposed. The reviewer is read-only and must not edit `paper.md`.
It is the repair layer after diagnosis: the seven checkers identify issues, then this skill helps the user process them in a severity-first order, propose fixes one issue at a time, and apply changes only after explicit confirmation.
Its purpose is not to auto-rewrite the paper.
Its purpose is to convert checker output into careful, auditable, multi-round improvement while keeping the user in control of every modification.

## When to Use This Skill
- User says "review and revise"
- User says "审稿修改"
- User says "多轮修改"
- User wants systematic paper improvement based on checker feedback
- User wants to repair issues reported by the seven-checker workflow
- User wants a guided revise-confirm-apply process instead of freeform rewriting
Use this skill after `markdown-review` has produced checker results, or when the user explicitly wants a multi-round checker-driven revision workflow.

## The 7 Checkers
This skill must integrate findings from all seven checker families:
1. `problem-checker`
2. `novelty-checker`
3. `technical-depth-checker`
4. `logic-checker`
5. `clarity-checker`
6. `evaluation-protocol-checker`
7. `data-checker`

## Severity Levels
All issues must be sorted and processed by severity in this exact order:
1. **Critical** — Must fix before submission
2. **Major** — Should fix, significantly impacts quality
3. **Minor** — Nice to fix, polish items
If multiple issues share the same severity, keep unresolved ones first, then preserve checker order from `markdown-review`, then preserve original issue order inside each checker result.
Never process Minor issues ahead of unresolved Critical or Major issues unless the user explicitly chooses to skip higher-severity items.

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `paper.md` | **Required** | Step 1 (start) | Primary analysis target; read to understand current paper content |
| Checker status | Optional | Step 1 (start) | Call `vibepaper_checker_status` to inspect existing checker runs, severity counts, stale signals, and precheck evidence |
| `storyline.md` | Optional | Step 5b (when revising narrative/claim alignment) | Research narrative for grounding revisions |
| `.agents/cross_index.json` | Optional but preferred | Step 5b (before reading relatedwork summaries) | Cross-reference index; consult FIRST to identify which `relatedwork/papers/*.md` files are relevant to the current issue |
| `relatedwork/papers/*.md` | Optional | Step 5b (only the summaries identified through cross-index) | Individual literature summaries; read ONLY the specific files identified through `.agents/cross_index.json` or when the issue clearly depends on prior work |

If some files do not exist yet, continue with the available context instead of blocking the workflow.

## Workflow
### Step 1: Read Paper and Checker State
1. Read `paper.md`.
2. Call `vibepaper_checker_status` to determine whether previous checker results exist and whether they are stale.
3. Use the current `markdown-review` output as the authoritative source for issue details. The status tool gives summary and freshness, not full issue text.
4. Extract checker name, issue ID, severity, description, suggestion, status, and any checker-generated HTML comment text from the fresh review output when available.
5. If `@vibepaper-reviewer` is available, ask it to summarize and explain the issue set without editing files.
6. Build a working list of unresolved issues.
Goal: understand what the paper says now and what the seven checkers still consider problematic.
If checker results are not available, do not fabricate them and do not create state entries manually.

### Step 2: Run Review First If Needed
If checker results do not exist yet, or the `checkers` field is missing or empty:
1. Invoke the `markdown-review` skill first.
2. Run all seven checkers in the standard order.
3. Use the returned checker report as the working issue queue.
4. Call `vibepaper_checker_status` after the review to inspect status/freshness if checker summaries or precheck evidence were produced.
5. If the user wants durable checker summaries, restate the actual checker output summary and route the confirmed record action to `@vibepaper-recorder` so it can call `vibepaper_checker_record`.
Do not invent checker findings.
This skill must be driven by actual checker output from state or from the immediately returned review report.

### Step 3: Aggregate and Sort Issues
1. Aggregate unresolved checker issues from the actual checker output into one review queue.
2. Exclude already resolved issues unless the user explicitly asks to revisit them.
3. Normalize severity labels if needed so they map to `Critical`, `Major`, or `Minor`.
4. Sort the queue in this order:
   - `Critical`
   - `Major`
   - `Minor`
5. Preserve checker family identity for every issue.
6. Present a compact queue summary to the user.
Example:
```text
Review Queue:
- Critical: 2
- Major: 5
- Minor: 4
```

### Step 4: Ask the User for Processing Strategy
Before revising anything, use the `question` tool to ask the user how they want to process the queue.
Offer these options exactly:
1. **Process one-by-one** (recommended)
2. **Process by checker group**
3. **Skip certain issues**
Recommended prompt:
```text
I found X unresolved issues from the seven checkers, ordered by severity.
How would you like to proceed?
1) Process one-by-one (recommended)
2) Process by checker group
3) Skip certain issues
```
**STOP AND WAIT** for the user's choice before generating or applying any revision.

### Step 5: Process Each Selected Issue
For each selected issue in the current round, follow this exact sub-workflow.

#### Step 5a: Show the Specific Problem
Display all of the following to the user:
- checker name
- issue ID
- severity
- the specific problem text
- the suggestion text
- the relevant checker HTML comment, if present
The user should see exactly what triggered the revise action.

#### Step 5b: Launch a Writing Subagent
Use `task(category="writing")` to generate a revision suggestion.
The subagent should:
- read `paper.md`
- read `storyline.md` when useful
- read the issue details from the current checker queue or, if available, the existing `checkers` field in `.agents/state.json`
- read `.agents/cross_index.json` FIRST to identify which `relatedwork/papers/*.md` files are relevant to the current issue, then read ONLY those specific summaries — do NOT read all files under `relatedwork/papers/` indiscriminately
- focus on exactly one issue at a time
- propose a concrete revision for the relevant paper section
- explain why the revision addresses the checker finding
- return suggested text only
- never edit files directly
The subagent is a suggestion generator, not an auto-editor.

#### Step 5c: Ask for Confirmation
After the subagent returns, show the proposed revision and ask the user to choose one of these actions:
- **Confirm**
- **Modify**
- **Reject**
- **Skip**
**STOP AND WAIT** for the user's answer.
Each modification requires explicit user confirmation.
Silence, ambiguity, or partial approval does not count as confirmation.

#### Step 5d: Apply Only Confirmed Changes
If and only if the user confirms:
1. Apply the approved modification to `paper.md`.
2. Keep the change tightly scoped to the current issue.
3. Avoid unrelated edits.
4. Preserve the existing VibePaper structure and heading hierarchy.
If the user asks for a modified suggestion first, revise the suggestion and ask again.
Do not silently merge user intent into the paper without another confirmation point.

#### Step 5e: Mark the Issue as Resolved
After a confirmed edit is applied, mark the issue as resolved in the in-session working queue.
Only mark an issue resolved after the corresponding paper change has actually been applied.
Do not mark sibling issues as resolved automatically.
Do not call `CheckerTracker.mark_issue_resolved()` or hand-edit `.agents/state.json` in plugin-based workflows; the current OpenCode plugin records checker run summaries but has no checker-resolution tool. If durable resolution tracking is required, explicitly report this tool gap to the user.

### Step 6: Re-Run Review After the Round
After the selected issue set for the round is processed:
1. Save all accepted changes.
2. Invoke `markdown-review` again to re-run all seven checkers.
3. Use the new checker report as the updated issue source.
4. Detect newly introduced issues, still-unresolved issues, and issues that disappeared.
5. Build a fresh severity-sorted queue for the next round.
This re-check is mandatory.
The paper must be re-evaluated after each round rather than assuming the previous diagnosis is still current.

### Step 7: Continue Until a Stop Condition Is Met
Repeat the Review-Revise loop until one of these conditions holds:
1. the user says they are satisfied
2. the workflow reaches the maximum of 5 rounds
3. no `Critical` or `Major` issues remain
If only Minor issues remain, tell the user that the paper has reached the polish stage and ask whether they want to continue.
At the start of each round, state the round number clearly, for example: `Round 3 of 5`.

### Step 8: Report Progress and Tool Gaps
At the end of each round and at the end of the full workflow, report progress in the response.
Recommended tracked fields, if a future dedicated review-revise history tool exists, include:
- latest checker results
- issue resolution status
- current round number
- stopped_by (`user_satisfied`, `max_rounds`, `no_critical_or_major`, `user_stopped`)
- optional review-revise history summary
Do not update `.agents/state.json` directly in plugin-based workflows. The current OpenCode plugin exposes `vibepaper_workflow_set_phase` for phase status, `vibepaper_artifact_record` for artifact readiness, and `vibepaper_checker_record` for confirmed checker run summaries. It does not expose checker issue-resolution or review-revise history persistence.

## Safety Valves
This skill must enforce all of the following:
1. **Maximum 5 revision rounds**
2. **Each modification requires explicit user confirmation**
3. **User can stop at any time**
Additional safety behavior:
- If the user says `stop`, stop the workflow cleanly.
- If the user says `pause`, preserve state and stop for now.
- If the user rejects an issue, leave it unresolved.
- If repeated suggestions fail to satisfy the user, offer to skip that issue instead of forcing progress.

## User Confirmation Rules
Confirmation is the central guardrail of this skill.
- Never auto-apply modifications.
- Never batch-apply multiple fixes without confirmation for each one.
- Never treat a suggestion request as approval.
- Never treat discussion of an issue as approval.
- If the user adjusts the wording, show the final proposed text again before applying it.
Required interaction pattern:
1. show issue
2. generate revision suggestion
3. ask for confirmation
4. apply only after confirmation

## Checker Integration Notes
This skill depends on actual checker output, either from a fresh `markdown-review` run or from already persisted checker data.
Current OpenCode plugin tool coverage:
- Supported: `vibepaper_workflow_status`, `vibepaper_workflow_log`, `vibepaper_workflow_set_phase`, `vibepaper_artifact_status`, `vibepaper_artifact_record`
- Supported for read-only checker summaries: `vibepaper_checker_status`
- Supported for confirmed checker run summaries: `vibepaper_checker_record`
- Not supported: full `get_unresolved_issues()` with issue text, `mark_issue_resolved()`, review-revise history persistence
When an unsupported operation is needed, state the tool gap instead of editing `.agents/state.json` manually.
Use `vibepaper_checker_status` for read-only checker run status, severity counts, stale signals, and precheck evidence; do not read `.agents/state.json` directly just to infer checker status when the plugin tool is available.
If the user asks to record a checker result, route the confirmed action to `@vibepaper-recorder` so it can call `vibepaper_checker_record`; do not directly edit checker state or use prompt-only persistence text.
Use `vibepaper_artifact_status` for read-only artifact readiness, evidence, confidence, and recommendation; do not infer readiness manually when the plugin tool is available.
Use `vibepaper_workflow_log` for read-only workflow event history queries; do not read `.agents/events.jsonl` directly when the plugin tool is available.
If the user asks to record artifact readiness, route the confirmed action to `@vibepaper-recorder` so it can call `vibepaper_artifact_record`; do not directly edit artifact state or use prompt-only readiness text.

## Must NOT Do
- **NEVER** auto-apply modifications
- **NEVER** exceed 5 rounds
- **NEVER** modify checker skill files
- **NEVER** skip user confirmation
- **NEVER** fabricate checker results instead of using actual checker output
- **NEVER** mark an issue resolved before the paper change is actually applied
- **NEVER** rewrite large parts of `paper.md` when handling one localized issue
- **NEVER** hand-edit `.agents/state.json` for checker persistence or issue resolution in plugin-based workflows

## End Condition Summary
When the workflow stops, summarize:
- total rounds used
- issues resolved this session
- unresolved Critical issues
- unresolved Major issues
- remaining Minor issues
- stop reason
If the stop reason is `max_rounds`, explicitly tell the user that the five-round safety cap was reached.
