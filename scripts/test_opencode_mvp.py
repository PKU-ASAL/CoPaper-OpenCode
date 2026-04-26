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
TMP_DIR = REPO_ROOT / ".tmp" / "vibepaper-opencode-m0"


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


def write_vibepaper_fixture(project_root: Path) -> None:
    runtime = project_root / ".vibepaper"
    runtime.mkdir(parents=True, exist_ok=True)
    now = "2026-04-26T00:00:00.000Z"
    state = {
        "schema_version": 1,
        "project": {
            "name": "MVP Test",
            "domain": "SE",
            "language": "en",
            "created_at": now,
        },
        "workflow": {
            "current_phase": "storyline",
            "phases": {
                "storyline": {"status": "in_progress", "started_at": now, "completed_at": None},
                "literature": {"status": "not_started", "started_at": None, "completed_at": None},
                "writing": {"status": "not_started", "started_at": None, "completed_at": None},
                "review": {"status": "not_started", "started_at": None, "completed_at": None},
                "submission": {"status": "not_started", "started_at": None, "completed_at": None},
            },
        },
        "last_updated_at": now,
    }
    artifacts = {
        "schema_version": 1,
        "artifacts": {
            "paper.md": {"type": "paper", "status": "template", "sections": {}},
            "storyline.md": {"type": "storyline", "status": "template"},
            "writingrules.md": {"type": "writing_rules", "status": "minimal"},
        },
    }
    files = {
        runtime / "state.json": state,
        runtime / "config.json": {"schema_version": 1, "mode": "balanced"},
        runtime / "memory.json": {"schema_version": 1, "project_summary": "", "latest_decisions": [], "open_questions": [], "context_notes": []},
        runtime / "tasks.json": {"schema_version": 1, "tasks": {}},
        runtime / "artifacts.json": artifacts,
    }
    for path, payload in files.items():
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    (runtime / "events.jsonl").write_text("", encoding="utf-8")
    (project_root / "paper.md").write_text("# Untitled Paper\n\n## Abstract\n", encoding="utf-8")
    (project_root / "storyline.md").write_text("# Research Storyline\n\n## Problem\n", encoding="utf-8")
    (project_root / "writingrules.md").write_text("# Writing Rules\n", encoding="utf-8")


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

            const state = JSON.parse(await fs.readFile(path.join(projectRoot, ".vibepaper", "state.json"), "utf-8"))
            assert.equal(state.workflow.current_phase, "literature")
            assert.equal(state.workflow.phases.storyline.status, "complete")

            await expectReject(
              "state file write block",
              () => hooks["tool.execute.before"](
                {{ tool: "write", sessionID: "parent-1", callID: "call-1" }},
                {{ args: {{ filePath: path.join(projectRoot, ".vibepaper", "state.json") }} }},
              ),
              /blocked direct edits to \\.vibepaper\\/state\\.json/,
            )

            await expectReject(
              "state patch block",
              () => hooks["tool.execute.before"](
                {{ tool: "apply_patch", sessionID: "parent-1", callID: "call-2" }},
                {{ args: {{ patchText: "*** Begin Patch\\n*** Update File: .vibepaper/state.json\\n@@\\n-x\\n+y\\n*** End Patch" }} }},
              ),
              /blocked direct edits to \\.vibepaper\\/state\\.json/,
            )

            await hooks["tool.execute.before"](
              {{ tool: "edit", sessionID: "parent-1", callID: "call-3" }},
              {{ args: {{ filePath: path.join(projectRoot, "paper.md") }} }},
            )

            await expectReject(
              "dangerous git block",
              () => hooks["tool.execute.before"](
                {{ tool: "bash", sessionID: "parent-1", callID: "call-4" }},
                {{ args: {{ command: "git reset --hard" }} }},
              ),
              /blocked git reset --hard/,
            )

            await expectReject(
              "protected shell write block",
              () => hooks["tool.execute.before"](
                {{ tool: "bash", sessionID: "parent-1", callID: "call-5" }},
                {{ args: {{ command: "Set-Content .vibepaper/state.json '{{}}'" }} }},
              ),
              /blocked shell writes to protected \\.vibepaper runtime files/,
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

            const events = await fs.readFile(path.join(projectRoot, ".vibepaper", "events.jsonl"), "utf-8")
            assert.match(events, /"operator":"opencode-plugin"/)
            assert.match(events, /"action":"set_phase_status"/)
            assert.match(events, /"action":"spawn_agent"/)
            console.log("OpenCode plugin MVP harness checks passed.")
            """
        ),
        encoding="utf-8",
    )
    return harness


def verify_vibepaper_fixture(project_root: Path) -> None:
    for relative in [
        ".vibepaper/state.json",
        ".vibepaper/config.json",
        ".vibepaper/events.jsonl",
        ".vibepaper/memory.json",
        ".vibepaper/tasks.json",
        ".vibepaper/artifacts.json",
        "storyline.md",
        "paper.md",
        "writingrules.md",
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

    write_vibepaper_fixture(TMP_DIR)
    verify_vibepaper_fixture(TMP_DIR)
    harness = write_node_harness(TMP_DIR)
    run([executable("node"), str(harness)])
    print(f"\nMVP smoke test completed: {TMP_DIR}")


if __name__ == "__main__":
    main()
