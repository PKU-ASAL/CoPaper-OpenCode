# @vibepaper/opencode

OpenCode integration plugin for VibePaper.

## Install into a project

```bash
bunx @vibepaper/opencode init
```

Restart OpenCode, then run:

```text
/vibe-doctor
/vibe
```

## Diagnose

```bash
bunx @vibepaper/opencode doctor
bunx @vibepaper/opencode doctor --format markdown
bunx @vibepaper/opencode doctor --format json
```

## MVP scope

This package only installs the OpenCode plugin and command integration. It does not create `paper.md`, `storyline.md`, `relatedwork/`, or VibePaper workflow state.
