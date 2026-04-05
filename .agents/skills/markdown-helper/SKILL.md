---
name: markdown-helper
description: Helps users write and improve markdown academic paper content following VibePaper GUI structure. Use this skill when the user wants to write or improve paper.md content for academic quality.
---

# Markdown Helper Skill

This skill helps users write markdown content for computer science research papers following the VibePaper GUI structure defined in `writingrules.md`. It uses a strictly controlled, subagent-based sequential writing workflow to maximize writing quality and user control.

## When to Use This Skill

- User requests to help write paper.md (e.g., "help me write paper.md")
- User wants to systematically draft paragraph by paragraph.
- User wants to improve the quality of markdown academic writing.

## VibePaper Structure Rules

Before writing, read `writingrules.md` to understand the full structure. Key rules:

### Header Levels
| Level | Purpose |
|-------|---------|
| Level 1 `#` | Paper title |
| Level 2-5 `##`~`#####` | Structure framework (do not modify) |
| Level 6 `######` | Content paragraph (topic sentence) |

### Metadata Fields
Each node may have HTML comment metadata:
- `<!-- description: ... -->` - Writing guidance for the section

### Content Writing Rules
- **Topic Sentence** (Level 6 header): <= 50 characters, summarizes paragraph core point
- **Supporting Sentences** (paragraph body): <= 500 characters, with evidence, data, reasoning
- Follow the `description` guidance for each node

## Context Sources for Writing

Every writing task MUST be informed by these sources:
1. **storyline.md**: The core research narrative, insights, and method.
2. **paper.md**: The paper's current state and structural constraints.
3. **relatedwork/papers/**: Individual markdown summaries of related literature. The agent can dynamically read these to cite properly.

## Strict Step-by-Step Writing Workflow

The Orchestrator MUST follow this interactive, sequential workflow strictly. **NEVER use multi-threading/parallel execution for writing tasks.** Write EXACTLY ONE paragraph (Level 6 node) at a time.

### Step 1: Scan & Propose (WAIT FOR USER)
1. Read `paper.md` from top to bottom.
2. Locate the **FIRST Level 5 node (#####) or deeper that has NO Level 6 child nodes yet**.
3. Extract its `description` metadata.
4. **Announce and Ask**: Tell the user which section is next and its description. Ask: *"I found section **[Level 5 Title]** is next. Shall I launch a writing subagent to draft this paragraph?"*
5. **STOP AND WAIT** for user confirmation. Do not proceed.

### Step 2: Delegate to Subagent (Task Tool)
1. Once confirmed, use the `task` tool to launch an independent subagent (`category="writing"`, `run_in_background=false`).
2. **Prompt Requirements**: The prompt to the subagent MUST include:
   - "Please draft EXACTLY ONE Level 6 node for the section: [Level 5 Title]."
   - "Follow the description: [description metadata]."
   - "Read `writingrules.md` and strictly follow the writing constraints and norms."
   - "Read `storyline.md` for core narrative."
   - "Read `paper.md` to understand context and what has been written so far."
   - "Read relevant summaries in `relatedwork/papers/` to support your writing. Use the `Read` tool to fetch specific summaries if needed."
   - "Output ONLY the drafted Level 6 node (###### Title + Content). DO NOT edit `paper.md` yourself."
   - "**Writing Style Instructions**: 
     1. Strictly follow the writing guidelines in `writingrules.md`.
     2. Use plain, academic language. Do not use meaningless buzzwords, but maintain persuasive arguments.
     3. Be concise: if it can be said simply, do not artificially expand the text. Do not stretch to hit word limits.
     4. Maintain persuasive power by properly citing literature or evidence where applicable.
     5. You do not need to force Chinese translations for technical terms; use English/Chinese mix according to standard academic habits (e.g., use 'Loss' instead of forcing '误差')."
3. Wait for the subagent to return the drafted text.

### Step 3: Post-Writing Review (WAIT FOR USER)
1. Display the subagent's drafted paragraph to the user.
2. **Ask**: *"Here is the drafted paragraph. Do you want to Accept, Modify (please provide feedback), or Rewrite completely?"*
3. **STOP AND WAIT** for user confirmation.

### Step 4: Apply or Iterate
- If **Accept**: The Orchestrator uses the `Edit` tool to safely insert the drafted Level 6 node under the target Level 5 node in `paper.md`. Then loop back to Step 1.
- If **Modify/Rewrite**: Launch the subagent again (use `session_id` to continue its context), passing the user's feedback. Repeat Step 3.

## Crucial Anti-Patterns
- **NEVER** write multiple paragraphs at once.
- **NEVER** write directly without using the `task` subagent.
- **NEVER** insert content into `paper.md` without the user explicitly reviewing and accepting the draft in Step 3.
- **NEVER** modify Level 2-5 headers. Only append Level 6 nodes.
