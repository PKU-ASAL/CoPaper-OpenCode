---
name: writing-orchestrator
description: Orchestrates structured paper framework writing by scanning paper.md completion status, recommending writing order, and offering fine mode (markdown-helper) or fast mode (mad-writer). Auto-triggers 7-checker review after each section. Use this skill when the user wants to write or start writing their paper systematically.
---

# Writing-Orchestrator Skill

This skill is the human-led writing coordinator for VibePaper.
It inspects `paper.md`, shows what is complete or still empty, recommends the next section based on logical dependency, and routes the user to either `markdown-helper` or `mad-writer` while treating `markdown-review` as the mandatory review gate.

## When to Use This Skill

Use this skill when the user wants to write the paper systematically instead of jumping directly into freeform drafting.

Typical triggers:
- `write paper framework`
- `撰写论文框架`
- `开始写论文`
- `systematically write my paper`
- `which section should I write next`

Use it when the user wants to:
- scan `paper.md` and understand current completion status
- get a progress overview before writing
- receive a recommended writing order
- choose between a careful mode and a faster mode
- enforce a seven-checker review after each completed section

This skill is an orchestrator, not a direct replacement for drafting or revision skills.

## Context Sources

Read these sources as needed:
1. `paper.md`
2. `storyline.md`
3. `writingrules.md`
4. `.agents/state.json`
5. `relatedwork/papers/*.md`
6. `fig/`
7. `.agents/cross_index.json`

Use `paper.md` for structure, `storyline.md` for the research narrative, `writingrules.md` for constraints, `.agents/state.json` for progress, `relatedwork/papers/*.md` for support material, `fig/` for available visuals, and `.agents/cross_index.json` for paper-to-topic linkage. If some sources are missing, continue with available context and state what is missing.

## Completion Scan Rules

The orchestrator must scan `paper.md` from top to bottom and inspect every Level 2 to Level 5 heading.

Use the core rule below:
- **Complete**: the node has at least one Level 6 child
- **Incomplete**: the node has no Level 6 child

Reporting refinement:
- Use **partial** for parent nodes whose descendants are mixed.
- Treat Level 5 nodes as the primary operational writing targets.
- Never modify Level 2-5 headings during scanning.

## Workflow

### Step 1: Read `paper.md` and scan all Level 2-5 sections

1. Read `paper.md`.
2. Identify every Level 2, Level 3, Level 4, and Level 5 heading.
3. For each node, detect whether Level 6 children exist beneath it.
4. Mark each node as `complete`, `incomplete`, or `partial`.
5. If `paper.md` does not exist, stop and tell the user the framework file is required first.

### Step 2: Display structure overview and progress summary

Show a compact overview of the paper structure.

Recommended output shape: show counts for Complete / Partial / Incomplete and then print the relevant heading tree with status markers such as `## Introduction [partial]` and `### Existing Methods [incomplete]`.

The overview must:
- show completed and incomplete sections clearly
- expose partial parent sections clearly
- include a numeric summary
- make the next writing target easy to choose

### Step 3: Recommend writing order based on logical dependencies

Recommend the next section based on dependency, not only on textual position.

Core dependency chain:
1. `Insight`
2. `Problem Definition`
3. `Existing Methods`
4. `Technical Limitations`
5. `Method Design`
6. `Experiments`

Practical paper-level order:
1. Introduction core
2. Related Work
3. Method
4. Experiments
5. Discussion
6. Conclusion

Recommendation rules:
- prefer the earliest incomplete section whose prerequisites already exist
- prefer core argument sections before polish sections
- explain why the recommended section unlocks later writing

### Step 4: User selects a section and chooses a mode

After showing the overview and recommendation, ask the user which section they want to write.
Then offer exactly two writing modes.

#### Fine Mode (精细模式)

Invoke `markdown-helper`.

Use this mode when:
- the section is strategically important
- the user wants paragraph-by-paragraph confirmation
- the section contains core claims, motivation, or method novelty

Requirements:
- keep the human in the loop for each paragraph
- rely on `markdown-helper` instead of re-implementing its logic
- preserve its review-before-insert workflow

#### Fast Mode (快速模式)

Invoke `mad-writer`.

Use this mode when:
- the section is less delicate
- the user wants faster progress on a larger unfinished region
- the section is descriptive, comparative, or bulk-writing heavy

Requirements:
- rely on `mad-writer` for write→check→fix cycles
- keep the scope tied to the selected section or selected target group
- let the human review the resulting section outcome
- do not duplicate `mad-writer` logic here

### Step 5: Auto-trigger seven-checker review after each section

After the selected section is complete, automatically invoke `markdown-review`.
This review is mandatory after every completed section.

The required checker order is:
1. `problem-checker`
2. `novelty-checker`
3. `technical-depth-checker`
4. `logic-checker`
5. `clarity-checker`
6. `evaluation-protocol-checker`
7. `data-checker`

Never skip this review stage.

### Step 6: Show seven-checker results and suggest revision path

After review:
1. show a compact seven-checker summary
2. separate Critical, Major, and Minor issues
3. explain which issues matter most for the finished section
4. ask whether modifications are needed
5. if yes, suggest `review-revise`

Do not fabricate checker results.
Use real review output or persisted state.

### Step 7: Run a final full review after all sections are complete

When the scan shows no incomplete writing targets remain:
1. announce that the framework is fully populated
2. run one final full `markdown-review`
3. present the final seven-checker summary
4. suggest `review-revise` if unresolved issues remain

This final pass checks whole-paper consistency instead of only local section quality.

### Step 8: Update `.agents/state.json` with writing progress

At the end of each cycle, update `.agents/state.json`.

Track at least:
- current mode (`fine` or `fast`)
- selected section path
- latest completion snapshot
- complete / partial / incomplete counts
- latest seven-checker run reference or summary
- whether final full review has been run

If `.agents/state.json` does not exist yet, create the needed structure carefully.
Preserve unrelated fields when updating.

## Writing Order Recommendation

Use this recommendation table when advising the user.

| Order | Section Focus | Why It Comes Here |
|---|---|---|
| 1 | Insight | The paper needs a clear core claim before other sections can align. |
| 2 | Problem Definition | The reader must understand what matters and why it matters. |
| 3 | Existing Methods | Prior work defines the baseline and contextualizes the gap. |
| 4 | Technical Limitations | The paper must explain why current methods are insufficient. |
| 5 | Method Design | The solution should respond directly to the stated gap. |
| 6 | Experiments | Evaluation is convincing only after goals and design are clear. |
| 7 | Discussion | Interpretation depends on method details and evidence. |
| 8 | Conclusion | The ending should summarize arguments that already exist. |

Rationale summary: Insight anchors the story, problem definition turns it into a research need, prior work and limitations justify the new method, method design answers the validated problem, and experiments validate the claims. Discussion and conclusion usually come later because they synthesize earlier work. If the user chooses a later section first, allow it, but explain the dependency tradeoff.

## Fine Mode vs Fast Mode

Use this comparison when the user is choosing a mode.

| Dimension | Fine Mode (`markdown-helper`) | Fast Mode (`mad-writer`) |
|---|---|---|
| Chinese label | 精细模式 | 快速模式 |
| Control level | Very high | Moderate |
| Writing unit | One paragraph at a time | Section-oriented batch progress |
| Human confirmation | Required for each paragraph | Review after batch output |
| Best for | Introduction core, insight framing, method core | Related work details, experiment descriptions, bulk completion |
| Strength | Precision and user control | Speed and throughput |
| Risk | Slower progress | Less paragraph-level control |

Mode guidance: Fine Mode is better for critical sections where wording and argument precision matter; Fast Mode is better for less critical sections where structured bulk drafting is acceptable.

The interaction loop must remain section-by-section: scan, summarize, recommend, let the user pick a section and mode, invoke the downstream skill, run `markdown-review`, report results, update `.agents/state.json`, and return to the overview. Do not silently expand into full-paper auto-writing.

## Must NOT Do

- **NEVER** replace `markdown-helper` or `mad-writer`; call them instead
- **NEVER** auto-write the entire paper in one pass
- **NEVER** skip the seven-checker review after a completed section
- **NEVER** modify Level 2-5 framework headings during orchestration
- **NEVER** fabricate completion state without reading `paper.md`
- **NEVER** fabricate checker results instead of invoking or reading `markdown-review`
- **NEVER** destroy unrelated fields in `.agents/state.json`

## End Condition

Stop cleanly when:
- the user pauses after the current overview
- the user finishes one selected section and stops
- the paper framework is fully populated and the final review has run

At stop time, summarize:
- the last completed section
- which mode was used
- current completion counts
- whether seven-checker review ran
- whether follow-up revision is recommended
