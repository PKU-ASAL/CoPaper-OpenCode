# packages/opencode-plugin/

## Responsibility

###### OpenCode package boundary
This package publishes `@vibepaper/opencode`, the OpenCode integration for VibePaper. It provides the installer CLI, plugin export, managed slash commands, agent profiles, dashboard tools, read-only status tools, and confirmed state-write bridges used inside target projects.

###### Implementation detail map
Source-level architecture lives in `src/codemap.md`. This file stays package-level: entry points, directories, scripts, tests, generated outputs, integrations, and release risks.

## Package Entry Points

###### CLI binary
`package.json` exposes `vibepaper-opencode` as `./dist/cli.js`. Source lives in `src/cli.ts`; the README documents `init`, `doctor`, locale options, local tarball usage, and dev install workflows.

###### Plugin export
The package export `.` resolves to `./dist/index.js`, built from `src/index.ts`. It registers the OpenCode plugin hook, injected VibePaper agents, and all `vibepaper_*` tool handlers.

###### Published files
The npm package includes `dist/`, `package.json`, and `README.md`. Generated `dist/` files and local `vibepaper-opencode-0.1.0.tgz` tarballs are build/release artifacts, not source of truth.

## Directory Map

###### `src/`
TypeScript source for the plugin runtime, installer, config handling, command templates, agent profiles, dashboards, workflow/status tools, import extraction, Python bridge, i18n, and shared utilities. See `src/codemap.md`.

###### `tests/`
Bun tests cover CLI/package smoke, plugin registration, installer/config/root handling, command templates, agents/permissions, dashboard/readiness/init, workflow records, checker/artifact state, relatedwork bridge/status, structure scans, imports, and i18n.

###### `scripts/`
Developer automation lives in `scripts/dev-install.ts` and `scripts/dev-reset.ts`. These wire local builds into target projects, refresh managed OpenCode commands, and clean local Bun links.

## Build/Test/Release

###### Build and typecheck
`bun run build` runs `tsc -p tsconfig.json`, emitting declarations and ES module JavaScript from `src/**/*.ts` to `dist/`. `bun run typecheck` runs `tsc --noEmit`; `tests/` and `dist/` are excluded from compilation.

###### Test scripts
`bun run test` runs the full Bun test suite. Focused scripts include `bun run test:cli` for `tests/cli.test.ts` and `bun run test:package` for `tests/package-smoke.test.ts`.

###### Release artifacts
Release packaging depends on a fresh `dist/` matching `src/`, plus any checked local `.tgz` generated for smoke testing. The tarball should install the stable `vibepaper-opencode` binary and plugin export documented in README.

## Integration Points

###### OpenCode runtime
The plugin depends on `@opencode-ai/plugin` and reads OpenCode directory/worktree/client context. It installs `.opencode/commands/` wrappers and updates `opencode.json` or `opencode.jsonc` plugin entries using managed markers.

###### VibePaper project files
Tools inspect or write VibePaper project artifacts such as `paper.md`, `storyline.md`, `writingrules.md`, `AGENTS.md`, `.agents/state.json`, `.agents/events.jsonl`, checker reports, cross-index data, and `relatedwork/` metadata.

###### Python CLI bridge
Related-work write tools and doctor checks resolve the Python `vibe` CLI through a target `.venv` or `uv run --project`. Failures are reported as structured plugin diagnostics instead of hidden shell errors.

## Key Risks

###### Generated code drift
`dist/` and local `.tgz` artifacts can fall behind `src/`. Rebuild before packaging or smoke tests so the CLI binary and plugin export reflect current TypeScript sources.

###### Safety boundary regressions
Most tools are intentionally read-only, while state writers require explicit confirmation and validated paths. New integrations must preserve non-destructive installs, managed-marker checks, and atomic state/event writes.

###### Runtime dependency gaps
OpenCode context, Bun, `@opencode-ai/plugin`, and optional Python `vibe` or `uv` availability shape behavior. Doctor and package smoke tests should catch missing command files, plugin entries, binary wiring, and bridge failures.
