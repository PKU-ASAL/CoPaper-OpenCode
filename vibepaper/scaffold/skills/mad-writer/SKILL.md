---
name: mad-writer
description: Automatically writes and improves paper.md content by running a write-check-fix loop. Can use relatedwork-finder to download papers and bogus-data-helper to generate placeholder data. Runs all checkers to iteratively improve the paper until no issues remain or user input is needed.
---

# Mad-Writer Skill

This skill automatically writes and improves `paper.md` by running an iterative write-check-fix loop. It can find related work, generate placeholder data, and runs all checkers to maximize content quality.

**Key Capabilities**:
- 📚 **Finds related work** using relatedwork-finder
- 📊 **Generates placeholder data** using bogus-data-helper
- ✍️ **Writes content** iteratively
- ✅ **Runs all checkers** including data-checker
- 🔧 **Fixes issues** automatically
- 🛑 **Stops** when done or needs user input

## When to Use This Skill

- User wants to automatically write/improve paper.md (e.g., "write my paper", "mad write", "auto improve paper")
- User wants maximum content generation with quality checks
- User has skeleton/outline and wants it filled in
- User wants iterative improvement until checkers pass
- User wants related work found and summarized automatically
- User wants placeholder data generated for experiments

## Core Philosophy

**Write as much as possible, find what you need, check everything, fix what you can, ask for what you can't.**

This skill operates in a continuous loop:
1. **Find related work** - Use relatedwork-finder to download and summarize papers
2. **Generate placeholder data** - Use bogus-data-helper for experimental sections
3. **Write** - Add or improve content
4. **Check** - Run all checkers (including data-checker)
5. **Fix** - Address issues found
6. **Repeat** - Continue until done or stuck

## Paper Structure Reference

The paper follows VibePaper structure. Key rules for this skill:
- **Level 1** (`#`): Paper title only.
- **Level 2-5** (`##` to `#####`): Structural headings only — do NOT modify these.
- **Level 6** (`######`): Content paragraphs. Title = topic sentence (≤50 chars). Body = supporting text (≤500 chars).
- **Metadata**: HTML comments `<!-- description: ... -->` guide what each section should contain.

Do NOT read `writingrules.md` — the essential structure rules are inlined above.

## Input Files

| File | Required | When to Read | Purpose |
|------|----------|-------------|---------|
| `paper.md` | **Required** | Phase 1 (initialization) and every rewrite iteration | Current paper content; scan for empty sections, assess state, write content |
| `storyline.md` | Conditional | Phase 1 (if exists) | Research narrative for grounding content |
| `relatedwork/summary.md` | Conditional | Phase 0-1 (if literature exists) | Context from related work for citations |
| Checker status | Conditional | Phase 3 (checker loop) | Use `vibepaper_checker_status` for read-only checker run status, severity counts, stale signals, and precheck evidence |
| `.agents/state.json` | Tool gap / optional fallback | Phase 6 (progress tracking) | Read experiment context only when needed; the OpenCode plugin does not expose arbitrary progress metadata writes |

When writing content, refer to the Paper Structure Reference above instead of reading `writingrules.md`.
For checker status summaries, call `vibepaper_checker_status`; do not read `.agents/state.json` directly just to infer checker run status when the plugin tool is available.
If the user wants durable checker summaries after an actual checker run, restate checker, status, Critical/Major/Minor counts, summary, evidence, and reason; wait for explicit confirmation; then route to `@vibepaper-recorder` so it can call `vibepaper_checker_record`.
For phase-level workflow updates, use `vibepaper_workflow_set_phase` after restating the intended phase/status and waiting for explicit confirmation. The tool writes `.agents/state.json` and appends `.agents/events.jsonl`; do not replace it with prompt-only status text. Do not hand-edit `.agents/state.json` for checker results, progress counters, or experiment metadata in plugin-based workflows.

## Work Loop

```
┌─────────────────────────────────────────────────────────┐
│                    MAD-WRITER LOOP                       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Phase 0: PREPARATION   │
              │  - Find related work    │
              │    (relatedwork-finder) │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌────────────────────────┐
│  Phase 1: INITIALIZATION│
               │  - Read paper.md        │
               │  - Read storyline.md    │
               │  - Read related work    │
               │  - Assess current state│
              └────────────┬─────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Phase 2: WRITE SPRINT  │
              │  - Find empty sections  │
              │  - Expand sparse content│
              │  - Fill placeholders    │
              │  - Add missing details  │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌────────────────────────────┐
              │  Phase 3: CHECKER LOOP      │
              │  Run checkers 1-6:          │
              │  (NOT data-checker yet)     │
              └────────────┬───────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Issues Found?         │
              └────────┬───────────────┬┘
                       │               │
                      Yes              No
                       │               │
                       ▼               ▼
            ┌──────────────┐   ┌──────────────┐
            │ Can Fix?     │   │ Phase 5:     │
            └──────┬───┬───┘   │ GENERATE     │
                   │   │       │ BOGUS DATA   │
                  Yes  No      └──────┬───────┘
                   │   │              │
                   │   └─────┐        │
                   │         ▼        │
                   │   ┌──────────────┐│
                   │   │ STOP         ││
                   │   │ Need User    ││
                   │   │ Input        ││
                   │   └──────────────┘│
                   │                   │
                   ▼                   │
          ┌────────────────┐           │
          │ Fix Issues     │           │
          │ Remove comments│           │
          └────────┬───────┘           │
                   │                   │
                   └─────────────┬─────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │ Max Iterations?│
                        └────────┬───┬───┘
                                 │   │
                                No  Yes
                                 │   │
                                 │   └───┐
                                 │       ▼
                                 │  ┌─────────────┐
                                 │  │ STOP        │
                                 │  │ Max Reached │
                                 │  └─────────────┘
                                 │
                                 └───────┐
                                         │
                                         ▼
                                 [Return to Phase 2]
```

## Detailed Workflow

### Phase 0: Preparation (Optional but Recommended)

**Step 0.1: Find Related Work**

If the paper needs related work citations or context:

1. **Invoke relatedwork-finder skill**
   - Trigger: "find related work for this paper"
   - Input: Current paper content
   - Output: 
     - Downloaded related papers in `relatedwork/` folder
     - `relatedwork/paper_list.bib` - bibliography
     - `relatedwork/summary.md` - summaries of key papers

2. **Integrate Related Work**
   - Read `relatedwork/summary.md` for context
   - Add citations to paper where relevant
   - Update "Existing Methods" section with related work

**Note**: Do NOT generate bogus data at this stage. Bogus data is generated later in Phase 5 after the paper structure is finalized.

**Step 0.2: Prepare Context**

After related work:
- Read `relatedwork/summary.md` if it exists
- Understand the domain and related methods
- Use this context for writing

### Phase 1: Initialization

**Step 1.1: Read Essential Files**
1. Read `paper.md` - current paper content
2. Read `storyline.md` (if exists) - research narrative for grounding
3. Read `relatedwork/summary.md` (if exists) - context from related work

**Step 1.2: Assess Current State**
- What sections are complete?
- What sections are empty or sparse?
- What sections need improvement?
- What information is missing?

### Phase 2: Writing Sprint

**Step 2.1: Identify Writing Targets**

Prioritize in this order:
1. **Empty Level 6 headers** - Fill in missing paragraphs
2. **Sparse sections** - Expand underdeveloped content
3. **Placeholder markers** - Replace `[TODO]`, `[FILL]`, etc.
4. **Weak sections** - Strengthen based on checker feedback

**Step 2.2: Write Content**

For each target:
1. Read the section context (what comes before/after)
2. Check the `description` metadata for this section's requirements
3. Write content following rules:
   - Topic sentence (Level 6 header): ≤ 50 characters
   - Supporting sentences: ≤ 500 characters total
   - Follow the `description` guidance from structure
4. Ensure coherence with adjacent sections

**Step 2.3: Fill Common Gaps**

Automatically add when missing:
- Evidence citations where claims are made
- Quantitative data where appropriate
- Technical details in method sections
- Examples to clarify concepts

### Phase 3: Checker Loop

**Step 3.1: Run ALL Checkers (Including data-checker)**

Run these checkers in sequence:

| Order | Checker | Purpose | Skip If |
|-------|---------|---------|---------|
| 1 | **problem-checker** | Problem definition quality | No problem section |
| 2 | **novelty-checker** | Insight novelty | No insight section |
| 3 | **technical-depth-checker** | Design depth | No method section |
| 4 | **logic-checker** | Argument consistency | Minimal content |
| 5 | **clarity-checker** | Term clarity | Minimal content |
| 6 | **evaluation-protocol-checker** | Evaluation rigor | No evaluation section |
| 7 | **data-checker** | Data authenticity | No evaluation section |

**Important Notes on data-checker**:
- ✅ Now INCLUDED - checks if data is real or placeholder
- If you used bogus-data-helper, data-checker will flag the `⚠️ [BOGUS]` markers
- This is EXPECTED - it reminds you to replace placeholder data with real results
- You CAN continue improving the paper while data-checker reports issues
- Final submission MUST have real experimental data (no bogus markers)

**Step 3.2: Collect All Checker Feedback**

Aggregate feedback from all 7 checkers by severity:
- **Critical issues**: Must address before proceeding
- **Major issues**: Should address
- **Minor issues**: Good to address
- **Data issues**: Check if `⚠️ [BOGUS]` markers need replacement

After running the checker loop, call `vibepaper_checker_status` to inspect checker run status, severity counts, stale signals, and precheck evidence. Use the actual checker outputs for issue details; the status tool is a read-only summary and freshness check, not an issue-detail store. If the user confirms recording a run summary, use `vibepaper_checker_record` through `@vibepaper-recorder`; do not write checker state by hand.

**Step 3.3: Filter Fixable Issues**

For each issue, determine if it can be addressed:

| Can Fix | Cannot Fix |
|---------|------------|
| ✅ Unclear term definition | ❌ Missing real experimental data (must replace bogus data) |
| ✅ Missing explanation | ❌ Requires domain expert knowledge |
| ✅ Logical gap | ❌ Contradictory user requirements |
| ✅ Vague statement | ❌ Missing citation source (no access) |
| ✅ Missing example | ❌ User decision needed |
| ✅ Sparse content | ❌ Real-world data not available |
| ✅ Add placeholder data (via bogus-data-helper) | ❌ Cannot fabricate real results |

### Phase 4: Issue Resolution

**Step 4.1: Address Fixable Issues**

For each fixable issue:
1. Locate the problematic text
2. Understand the checker's concern
3. Modify content to address the issue
4. Remove the addressed comment
5. Verify the fix doesn't break other sections

**Step 4.2: Track Unfixable Issues**

For issues that cannot be addressed:
- Missing information (need user input)
- Requires experimental data
- Requires domain expertise
- Contradictory requirements

**Step 4.3: Decide Continue or Stop**

Continue writing loop if:
- ✅ At least one issue was addressed
- ✅ New content was added
- ✅ Progress is being made

Stop and request user input if:
- ❌ Cannot address any remaining issues
- ❌ Missing critical information
- ❌ Checker found no issues (paper is complete)
- ❌ Max iterations reached (safety limit)

### Phase 5: Generate Placeholder Data (Final Stage)

**When to run this phase**: ONLY after all checkers pass (no issues found in Phase 3/4).

**Step 5.1: Identify Missing Data**

After checkers pass, identify:
- Which evaluation sections need experimental data?
- What format should tables/figures be in?
- What metrics need to be reported?

**Step 5.2: Generate Placeholder Data**

Use bogus-data-helper to create placeholder data:

1. **Invoke bogus-data-helper skill**
   - Trigger: "add placeholder results" or "create example table"
   - Input: Evaluation section structure from completed paper
   - Output:
     - Placeholder tables with realistic-looking data
     - Placeholder figures/charts
     - Clear markers: `⚠️ [BOGUS: description - REPLACE WITH REAL RESULTS]`

2. **Example Placeholder Data**:
   ```markdown
   | Method | Accuracy | F1-Score | Latency (ms) |
   |--------|----------|----------|--------------|
   | Baseline A | 78.3% | 0.76 | 45 |
   | Baseline B | 81.2% | 0.79 | 62 |
   | Our Method | ⚠️ [BOGUS: 92.1% - REPLACE WITH REAL RESULTS] | ⚠️ [BOGUS: 0.91 - REPLACE] | ⚠️ [BOGUS: 38 - REPLACE] |
   ```

**Step 5.3: Run Data-Checker**

After generating placeholder data:
1. Run **data-checker** to verify:
   - All tables/figures have data
   - Placeholder markers are clear
   - No unmarked fake data

2. **Expected output**: 
   - Data-checker will report `⚠️ [BOGUS]` markers
   - This is CORRECT behavior - reminds you to replace with real data

**Step 5.4: Final Warning to User**

After generating placeholder data, ALWAYS provide a clear warning:

```markdown
## ⚠️ Placeholder Data Generated

Placeholder data has been added to your evaluation sections. 

**CRITICAL**: You MUST replace ALL placeholder data marked with `⚠️ [BOGUS]` 
with real experimental results before submission.

**What to do next**:
1. ✅ Review the placeholder data structure
2. ✅ Understand what data format is expected
3. ⚠️ Run your actual experiments
4. ⚠️ Replace ALL `⚠️ [BOGUS]` markers with real results
5. ❌ NEVER submit paper with placeholder data to venue

**Placeholder locations**:
- [List all locations with ⚠️ BOGUS markers]
```

### Phase 6: Termination

**Step 5.1: If Checkers Found No Issues**

Report success:
```markdown
## Writing Complete - All Checkers Pass

The paper has been improved and all checkers report no issues.

**Summary**:
- Sections written/expanded: [list]
- Issues addressed: [count]
- Remaining areas to monitor: [list]

**Next Steps**:
1. Run data-checker to verify data authenticity
2. Review the changes made
3. Add any missing experimental data
4. Submit for review
```

**Step 5.2: If User Input Needed**

Leave comments asking for user input:

```markdown
<!-- AI Comments: 
**MAD-WITER STOPPED - USER INPUT NEEDED**

The writing loop has stopped because critical information is missing 
that only you can provide.

**Missing Information**:

### Critical (Required to Continue):

1. **[Section Name]**: [What's missing]
   - Why needed: [Reason]
   - What to provide: [Specific guidance]
   - Example: [Concrete example]

2. **[Section Name]**: [What's missing]
   Why needed: [Reason]
   - What to provide: [Specific guidance]
   - Example: [Concrete example]

### Important (Would Strengthen Paper):

1. **[Section Name]**: [What's missing]
   - Why helpful: [Reason]

**How to Continue**:

Option 1: Provide the missing information
```
[Provide information here]
```

Option 2: Ask me to skip a section
```
Skip [section name] for now
```

Option 3: Provide guidance
```
For [section], assume [assumption]
```

**Current Progress**:
- Sections written: X/Y
- Issues addressed: Z
- Iterations completed: N

**END AI COMMENTS - MAD-WITER**
-->
```

## Writing Rules

### Rule 1: Follow Structure Strictly
- Maintain all existing Level 2-5 headers (do not modify structure)
- Write Level 6 headers as topic sentences (≤50 characters)
- Keep paragraphs under 500 characters
- Follow the `description` guidance from HTML comments

### Rule 2: Be Specific, Not Vague
- ❌ "This is important"
- ✅ "This costs enterprises $2.5M annually (Source, 2023)"

### Rule 3: Cite When Claiming
- Claims without citations are opinions
- Add `[citation needed]` if no source available
- Use placeholder format: `(Author, Year)` if unsure

### Rule 4: Placeholder Data Strategy

**When evaluation data is needed**:
1. **Use bogus-data-helper** to generate placeholder tables/figures
2. **Mark clearly** with `⚠️ [BOGUS: description - REPLACE WITH REAL RESULTS]`
3. **Never submit** papers with placeholder data to venues
4. **Replace with real data** before final submission

**Examples**:
```
✅ GOOD:
| Method | Accuracy | F1-Score |
|--------|----------|----------|
| Baseline A | 78.3% | 0.76 |
| Our Method | ⚠️ [BOGUS: 92.1% - REPLACE WITH REAL RESULTS] | ⚠️ [BOGUS: 0.91 - REPLACE] |

❌ BAD (no marker):
| Method | Accuracy | F1-Score |
|--------|----------|----------|
| Baseline A | 78.3% | 0.76 |
| Our Method | 92.1% | 0.91 |  # Looks real but isn't!
```

**When to use placeholder data**:
- ✅ To structure evaluation section
- ✅ To understand expected data format
- ✅ To plan experiments
- ✅ During early writing stages

**When NOT to use placeholder data**:
- ❌ Final submission to venue
- ❌ Peer review
- ❌ Public preprint (unless clearly marked)

### Rule 5: Maintain Coherence
- Each paragraph should flow from previous
- Avoid contradictions
- Cross-reference related sections

### Rule 6: Write Complete Thoughts
- Each Level 6 header should be a complete topic sentence
- Supporting sentences should fully develop the idea
- Don't leave thoughts incomplete

## Safety Limits

To prevent infinite loops, the skill has these limits:

| Limit | Value | Action |
|-------|-------|--------|
| Max iterations | 10 | Stop and report progress |
| Max time | 30 minutes | Stop and report progress |
| Max sections per iteration | 5 | Continue next iteration |
| Max total words added | 5000 | Stop and ask user |

## Output Tracking

The skill maintains an in-session progress log in the response. The current OpenCode plugin can record confirmed checker run summaries through `vibepaper_checker_record`, but it has no generic progress-log tool. Do not write hidden progress data into `.agents/state.json` or `.agents/events.jsonl`.

```markdown
<!-- MAD-WRITER LOG (Hidden)

Iteration: X/10
Time elapsed: Xm Ys
Sections modified: [list]
Issues addressed: [list]
Issues pending: [list]

Changes this iteration:
- [Section]: [What changed]
- [Section]: [What changed]

END MAD-WRITER LOG -->
```

## Example Sessions

### Example 1: Complete Success

```
User: write my paper

Mad-Writer: I'll iteratively write and improve your paper using all checkers.

[Iteration 1]
- Reading paper.md...
- Found 12 empty Level 6 headers
- Writing content for empty sections...
- Running checkers...
- Found 8 issues (3 critical, 3 major, 2 minor)
- Addressing issues...

[Iteration 2]
- Running checkers...
- Found 3 issues (1 major, 2 minor)
- Addressing issues...

[Iteration 3]
- Running checkers...
- Found 0 issues
- ✅ All checkers pass!

**Writing Complete**
- Added content to 15 sections
- Addressed 11 issues
- Paper is ready for data-checker and review
```

### Example 2: User Input Needed

```
User: fill in my paper

Mad-Writer: I'll fill in your paper iteratively.

[Iteration 1]
- Found 8 empty sections
- Filled 6 sections with available information
- Running checkers...
- Found 5 issues
- Addressed 3 issues
- 2 issues require your input

[Iteration 2]
- Attempted to address remaining issues...
- Cannot proceed without user information

**Stopped - User Input Needed**

The paper is 70% complete. I need your help with:

1. **Problem Importance**: You claim APT attacks are "critical" but provide 
   no evidence. Please provide:
   - Statistics on APT frequency
   - Financial impact data
   - Industry reports

2. **Experimental Setup**: You need to specify:
   - Dataset details
   - Baseline implementations
   - Hardware specifications

Please provide this information so I can continue.
```

### Example 3: Max Iterations Reached

```
User: improve my paper

Mad-Writer: I'll iteratively improve your paper.

[Iteration 1-10]
- Made steady progress each iteration
- Addressed 23 issues total
- Still have 4 minor issues remaining

**Max Iterations Reached**

I've made significant progress but hit the iteration limit. 

**Progress**:
- ✅ Problem definition: Clear
- ✅ Novelty: Well justified
- ✅ Technical depth: Good
- ⚠️ Clarity: 4 minor issues remain

**Remaining Issues** (minor):
1. Term "APT" should be expanded on first use
2. Pronoun "this" in section 3.2 is ambiguous
3. Acronym "SIEM" not expanded
4. "Significant improvement" needs quantification

These are minor and won't block submission. You can:
1. Continue: "keep improving" (I'll address these)
2. Stop here and fix manually
3. Ask for help with specific issues
```

## Important Notes

1. **Related work finding**: Uses relatedwork-finder to download actual papers and create summaries
2. **Placeholder data**: Uses bogus-data-helper to generate marked placeholder data (⚠️ [BOGUS])
3. **Iterative patience**: It may take multiple iterations to polish the paper
4. **Knows limits**: Stops when it can't make progress without user help
5. **Comprehensive checking**: Runs ALL 7 checkers including data-checker
6. **Progress tracking**: Logs all changes for transparency
7. **Safe limits**: Won't run forever due to iteration and time limits
8. **User control**: You can stop at any time by providing direction
9. **Quality over quantity**: Will stop if adding content would reduce quality
10. **Real data required**: Final submission MUST replace placeholder data with real results

## What Mad-Writer CAN and CANNOT Do

### ✅ CAN Do:
1. Find and download related work papers (via relatedwork-finder)
2. Generate placeholder data for evaluation sections (via bogus-data-helper)
3. Fill in content for all sections
4. Run all checkers including data-checker
5. Fix addressable issues automatically
6. Ask for help when stuck
7. Create realistic structure and flow
8. Add citations from related work

### ❌ CANNOT Do:
1. Generate real experimental results (must come from actual experiments)
2. Invent citations that don't exist
3. Modify paper structure (Level 2-5 headers)
4. Make user decisions
5. Create content that contradicts existing text
6. Fabricate real-world data (can only create clearly-marked placeholders)

### ⚠️ IMPORTANT Warnings:
1. **Placeholder data must be replaced**: All `⚠️ [BOGUS]` markers indicate fake data
2. **Final submission requires real data**: Never submit with bogus markers
3. **Citations should be real**: relatedwork-finder downloads actual papers
4. **User must verify**: Always review changes before submission

## Integration with Other Skills

Mad-writer automatically invokes these skills during different phases:

| Phase | Skill Invoked | Purpose |
|-------|---------------|---------|
| **Phase 0** | relatedwork-finder | Download related work papers |
| **Phase 3** | problem-checker | Check problem definition |
| **Phase 3** | novelty-checker | Check insight novelty |
| **Phase 3** | technical-depth-checker | Check technical depth |
| **Phase 3** | logic-checker | Check argument consistency |
| **Phase 3** | clarity-checker | Check term clarity |
| **Phase 3** | evaluation-protocol-checker | Check evaluation rigor |
| **Phase 5** | bogus-data-helper | Generate placeholder data (after all checkers pass) |
| **Phase 5** | data-checker | Verify placeholder data is marked correctly |

**Note**: You can also use these skills individually for focused improvements.

## When NOT to Use This Skill

- You have specific sections to work on (use markdown-helper instead)
- You want manual control over changes
- You're not ready for aggressive writing
- You need to preserve specific wording
- You want to work on one aspect at a time

## Related Skills

- **markdown-helper**: For guided, step-by-step writing
- **markdown-review**: For one-time comprehensive review
- **Individual checkers**: For focused improvements on specific aspects
