# @vibepaper/opencode

OpenCode integration plugin for VibePaper.

## Install into a project

```bash
bunx -p @vibepaper/opencode vibepaper-opencode init
```

The package name and binary name differ, so Bun requires `-p` to select the package before running the `vibepaper-opencode` binary.

Restart OpenCode, then run:

```text
/vibe-doctor
/vibe
```

If you already installed an older local build, rerun `init` to refresh the managed slash commands.

For local tarball testing, install the tarball into the target project and run `node_modules/.bin/vibepaper-opencode init`; this writes a `file://` plugin entry that OpenCode can load before the package is published.

## Diagnose

```bash
bunx -p @vibepaper/opencode vibepaper-opencode doctor
bunx -p @vibepaper/opencode vibepaper-opencode doctor --format markdown
bunx -p @vibepaper/opencode vibepaper-opencode doctor --format json
```

## MVP scope

This package only installs the OpenCode plugin and command integration. It does not create `paper.md`, `storyline.md`, `relatedwork/`, or VibePaper workflow state.
