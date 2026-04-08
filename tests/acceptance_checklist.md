# VibePaper Acceptance Checklist

Manual verification steps for each Phase of the VibePaper workflow.

## Phase A: Storyline (storyline-helper)

- [ ] Invoke storyline-helper skill
- [ ] Fill in 3 sections in paper.md (Level 6 headers with content)
- [ ] Verify `.agents/state.json` updates storyline phase status
- [ ] Verify event log records the changes

## Phase B: Literature Review (relatedwork-finder)

- [ ] Invoke relatedwork-finder skill
- [ ] Search for related papers on a topic
- [ ] Verify papers saved to `relatedwork/papers/`
- [ ] Verify `.agents/cross_index.json` generated with tech point mappings
- [ ] Verify bidirectional query works (paper → tech points, tech point → papers)

## Phase C: Socratic Discussion (socratic-discussion)

- [ ] Invoke socratic-discussion skill
- [ ] Discuss 1 dimension (e.g., novelty)
- [ ] Verify discussion log saved
- [ ] Verify state.json records discussion progress

## Phase D: Experiment Analysis (experiment-analyzer)

- [ ] Invoke experiment-analyzer skill
- [ ] Analyze experiment code/results
- [ ] Verify state.json updates experiment phase status

## Phase E: Writing (writing-orchestrator)

- [ ] Invoke writing-orchestrator skill
- [ ] Write 1 Section using fine mode (markdown-helper)
- [ ] Verify 7-checker review triggered after section completion
- [ ] Verify coherence check results displayed

## Phase F: Review & Revise (review-revise)

- [ ] Invoke review-revise skill
- [ ] Complete 1 round of review-revise cycle
- [ ] Verify checker results drive the revision
- [ ] Verify each modification requires user confirmation
- [ ] Verify review report generated

## CLI Workflow

- [ ] `vibe init "My Paper" --domain SE` — creates project
- [ ] `vibe status` — shows all phases
- [ ] `vibe status --json` — outputs valid JSON
- [ ] `vibe commit storyline -m "draft"` — creates git commit
- [ ] `vibe log` — shows event entries
- [ ] `vibe log --phase storyline` — filters by phase
- [ ] `vibe rollback storyline` — resets phase
- [ ] `vibe report` — generates weekly report
- [ ] `vibe report --since 2024-01-01` — filters by date
- [ ] `vibe report --output report.md` — writes to file
- [ ] `vibe diff storyline literature` — shows phase diff
- [ ] `vibe skip literature --reason "not needed"` — skips phase

## Git Integration

- [ ] Commits use format `[phase] message`
- [ ] Co-author trailer added when identity detected
- [ ] Rollback safely resets to phase commit
- [ ] `has_uncommitted_changes()` detects dirty state
- [ ] Identity detection reads git config

## Pre-Submission

- [ ] Invoke submission-precheck skill
- [ ] Verify 7 check items covered (format, citations, figures, word count, completeness, data authenticity, quality)
- [ ] Verify precheck report generated at `.agents/precheck_report.md`