# Manual OpenCode Smoke Checklist

1. Build package: `bun run build`.
2. Create a local tarball: `npm pack`.
3. Create a temporary project: `tmp_project="$(mktemp -d)"`.
4. If reusing a temporary project, remove stale local installs first: `bun remove --cwd "$tmp_project" @vibepaper/opencode || true; rm -rf "$tmp_project/node_modules/@vibepaper" "$tmp_project/bun.lock" "$tmp_project/package-lock.json"`.
5. Test the local tarball by installing it first: `bun add --cwd "$tmp_project" "$(pwd)/vibepaper-opencode-0.1.0.tgz"`.
6. Run the installed binary: `"$tmp_project/node_modules/.bin/vibepaper-opencode" init --root "$tmp_project"`.
7. If local tarball installation is not needed, run the deterministic local fallback: `bun <repo>/packages/opencode-plugin/dist/cli.js init --root <tmp-project>`.
8. Confirm `opencode.json` contains a VibePaper plugin entry. Local tarball installs should use a `file://.../node_modules/@vibepaper/opencode/dist/index.js` entry; published installs should use `"@vibepaper/opencode"`.
9. Confirm `.opencode/commands/vibe.md` exists.
10. Confirm `.opencode/commands/vibe-doctor.md` exists.
11. Restart OpenCode in the temporary project.
12. Run `/vibe-doctor` and confirm it displays doctor markdown.
13. Run `/vibe` and confirm the agent calls or attempts to call `vibepaper_dashboard`.
14. If `/vibe` cannot call the tool, run terminal doctor and record the failure.
