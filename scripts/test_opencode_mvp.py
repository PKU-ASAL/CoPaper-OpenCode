from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
PLUGIN_DIR = REPO_ROOT / "packages" / "opencode-plugin"
TMP_DIR = REPO_ROOT / ".tmp" / "vibepaper-opencode-mvp"


def run(cmd: list[str], cwd: Path = REPO_ROOT) -> None:
    print(f"\n$ {' '.join(cmd)}")
    subprocess.run(cmd, cwd=cwd, check=True)


def executable(name: str) -> str:
    candidates = [name]
    if sys.platform == "win32":
        candidates = [f"{name}.cmd", f"{name}.exe", name]
    for candidate in candidates:
        found = shutil.which(candidate)
        if found:
            return found
    raise RuntimeError(f"Required executable not found on PATH: {name}")


def require(path: Path) -> None:
    if not path.exists():
        raise AssertionError(f"Missing expected path: {path}")


def write_local_plugin_config(project_root: Path) -> None:
    plugins_dir = project_root / ".opencode" / "plugins"
    plugins_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(PLUGIN_DIR / "src" / "index.ts", plugins_dir / "vibepaper.ts")
    package_json = project_root / ".opencode" / "package.json"
    package_json.write_text(
        json.dumps(
            {"dependencies": {"@opencode-ai/plugin": "1.4.3"}},
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    opencode_json = project_root / "opencode.json"
    config = json.loads(opencode_json.read_text(encoding="utf-8"))
    config.pop("plugin", None)
    opencode_json.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")


def write_node_harness(project_root: Path) -> Path:
    harness = REPO_ROOT / ".tmp" / "vibepaper-opencode-mvp-harness.mjs"
    plugin_entry = PLUGIN_DIR / "dist" / "index.js"
    harness.write_text(
        textwrap.dedent(
            f"""
            import assert from "node:assert/strict"
            import fs from "node:fs/promises"
            import path from "node:path"
            import {{ pathToFileURL }} from "node:url"

            const projectRoot = {json.dumps(str(project_root))}
            const pluginEntry = {json.dumps(str(plugin_entry))}
            const mod = await import(pathToFileURL(pluginEntry).href)
            const plugin = mod.VibePaperPlugin || mod.server || mod.default
            assert.equal(typeof plugin, "function")

            let childCounter = 0
            const sessionCalls = []
            const ctx = {{
              directory: projectRoot,
              worktree: projectRoot,
              project: {{ id: "mvp-project" }},
              client: {{
                session: {{
                  async create(input) {{
                    sessionCalls.push({{ method: "create", input }})
                    childCounter += 1
                    return {{ id: `child-${{childCounter}}` }}
                  }},
                  async promptAsync(input) {{
                    sessionCalls.push({{ method: "promptAsync", input }})
                    return {{}}
                  }},
                  async prompt(input) {{
                    sessionCalls.push({{ method: "prompt", input }})
                    return {{ info: {{ id: "assistant-1" }}, parts: [] }}
                  }},
                }},
              }},
            }}

            const hooks = await plugin(ctx, {{ root: projectRoot }})
            assert.ok(hooks.tool)
            const tools = hooks.tool
            assert.ok(tools.vibepaper_status)
            assert.ok(tools.vibepaper_set_phase)
            assert.ok(tools.vibepaper_spawn_agent)
            assert.equal(typeof hooks["tool.execute.before"], "function")
            assert.equal(typeof hooks["experimental.chat.system.transform"], "function")

            const toolContext = {{
              sessionID: "parent-1",
              messageID: "message-1",
              agent: "build",
              directory: projectRoot,
              worktree: projectRoot,
              abort: new AbortController().signal,
              metadata() {{}},
              ask() {{}},
            }}

            async function expectReject(label, fn, expected) {{
              try {{
                await fn()
              }} catch (error) {{
                assert.match(String(error.message || error), expected, label)
                return
              }}
              throw new Error(`${{label}} did not reject`)
            }}

            const statusBefore = await tools.vibepaper_status.execute({{}}, toolContext)
            assert.match(statusBefore, /Project: MVP Test \\(SE\\)/)
            assert.match(statusBefore, /Current phase: storyline/)

            const statusAfter = await tools.vibepaper_set_phase.execute(
              {{ phase: "storyline", status: "complete", reason: "MVP smoke test" }},
              toolContext,
            )
            assert.match(statusAfter, /Current phase: literature/)

            const state = JSON.parse(await fs.readFile(path.join(projectRoot, ".agents", "state.json"), "utf-8"))
            assert.equal(state.current_phase, "literature")
            assert.equal(state.phases.storyline.status, "complete")

            await expectReject(
              "state file write block",
              () => hooks["tool.execute.before"](
                {{ tool: "write", sessionID: "parent-1", callID: "call-1" }},
                {{ args: {{ filePath: path.join(projectRoot, ".agents", "state.json") }} }},
              ),
              /blocked direct edits to \\.agents\\/state\\.json/,
            )

            await expectReject(
              "state patch block",
              () => hooks["tool.execute.before"](
                {{ tool: "apply_patch", sessionID: "parent-1", callID: "call-2" }},
                {{ args: {{ patchText: "*** Begin Patch\\n*** Update File: .agents/state.json\\n@@\\n-x\\n+y\\n*** End Patch" }} }},
              ),
              /blocked direct edits to \\.agents\\/state\\.json/,
            )

            await expectReject(
              "literature paper write block",
              () => hooks["tool.execute.before"](
                {{ tool: "edit", sessionID: "parent-1", callID: "call-3" }},
                {{ args: {{ filePath: path.join(projectRoot, "paper.md") }} }},
              ),
              /blocked paper\\.md edits during the literature phase/,
            )

            await expectReject(
              "dangerous git block",
              () => hooks["tool.execute.before"](
                {{ tool: "bash", sessionID: "parent-1", callID: "call-4" }},
                {{ args: {{ command: "git reset --hard" }} }},
              ),
              /blocked git reset --hard/,
            )

            const systemOutput = {{ system: [] }}
            await hooks["experimental.chat.system.transform"]({{ sessionID: "parent-1", model: {{}} }}, systemOutput)
            assert.match(systemOutput.system.join("\\n"), /Current phase: literature/)

            const spawned = JSON.parse(await tools.vibepaper_spawn_agent.execute(
              {{ agent: "vibepaper-reviewer", prompt: "Reply MVP_CHILD_OK", title: "MVP child test" }},
              toolContext,
            ))
            assert.equal(spawned.task_id, "child-1")
            assert.equal(spawned.parent_session, "parent-1")
            assert.equal(sessionCalls[0].method, "create")
            assert.equal(sessionCalls[1].method, "promptAsync")
            assert.equal(sessionCalls[1].input.body.agent, "vibepaper-reviewer")

            const events = await fs.readFile(path.join(projectRoot, ".agents", "events.jsonl"), "utf-8")
            assert.match(events, /"operator":"opencode-plugin"/)
            assert.match(events, /"action":"set_phase_status"/)
            assert.match(events, /"action":"spawn_agent"/)
            console.log("OpenCode plugin MVP harness checks passed.")
            """
        ),
        encoding="utf-8",
    )
    return harness


def verify_scaffold(project_root: Path) -> None:
    for relative in [
        ".agents/state.json",
        ".agents/events.jsonl",
        ".agents/skills/relatedwork-summarizer/SKILL.md",
        "storyline.md",
        "paper.md",
        "writingrules.md",
        "AGENTS.md",
        "opencode.json",
        ".opencode/commands/vibe-status.md",
        ".opencode/commands/vibe-spawn-agent.md",
        ".opencode/agents/vibepaper-reviewer.md",
        ".opencode/agents/vibepaper-writer.md",
    ]:
        require(project_root / relative)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--keep-temp", action="store_true")
    parser.add_argument("--skip-python-tests", action="store_true")
    parser.add_argument("--skip-npm-install", action="store_true")
    args = parser.parse_args()

    if not args.skip_python_tests:
        run([sys.executable, "-m", "pytest", "tests/", "-v"])

    if not args.skip_npm_install:
        run([executable("npm"), "--prefix", str(PLUGIN_DIR), "ci"])
    run([executable("npm"), "--prefix", str(PLUGIN_DIR), "run", "typecheck"])
    run([executable("npm"), "--prefix", str(PLUGIN_DIR), "run", "build"])

    if TMP_DIR.exists() and not args.keep_temp:
        shutil.rmtree(TMP_DIR)
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    run([
        sys.executable,
        "-m",
        "vibepaper",
        "--root",
        str(TMP_DIR),
        "init",
        "--name",
        "MVP Test",
        "--domain",
        "SE",
    ])
    verify_scaffold(TMP_DIR)
    write_local_plugin_config(TMP_DIR)
    harness = write_node_harness(TMP_DIR)
    run([executable("node"), str(harness)])
    print(f"\nMVP smoke test completed: {TMP_DIR}")


if __name__ == "__main__":
    main()
