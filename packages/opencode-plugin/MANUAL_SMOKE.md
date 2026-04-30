# Manual OpenCode Smoke Checklist

1. Build package: `bun run build`.
2. Create a local tarball: `npm pack`.
3. In a temporary project, run `bunx <path-to-vibepaper-opencode-0.1.0.tgz> init` if supported.
4. If tarball execution is not supported, run the deterministic local fallback: `bun <repo>/packages/opencode-plugin/dist/cli.js init --root <tmp-project>`.
5. Confirm `opencode.json` contains `"plugin": ["@vibepaper/opencode"]`.
6. Confirm `.opencode/commands/vibe.md` exists.
7. Confirm `.opencode/commands/vibe-doctor.md` exists.
8. Restart OpenCode in the temporary project.
9. Run `/vibe-doctor` and confirm it displays doctor markdown.
10. Run `/vibe` and confirm the agent calls or attempts to call `vibepaper_dashboard`.
11. If `/vibe` cannot call the tool, run terminal doctor and record the failure.
