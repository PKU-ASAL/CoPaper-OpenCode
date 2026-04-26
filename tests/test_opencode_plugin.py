from __future__ import annotations

import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
PLUGIN_DIR = REPO_ROOT / "packages" / "opencode-plugin"


def test_plugin_package_manifest() -> None:
    manifest = json.loads((PLUGIN_DIR / "package.json").read_text(encoding="utf-8"))
    assert manifest["name"] == "@vibepaper/opencode"
    assert manifest["main"] == "dist/index.js"
    assert "@opencode-ai/plugin" in manifest["dependencies"]


def test_plugin_exposes_mvp_tools_and_hooks() -> None:
    source = "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted((PLUGIN_DIR / "src").rglob("*.ts"))
    )
    for expected in [
        "vibepaper_init",
        "vibepaper_status",
        "vibepaper_set_phase",
        "vibepaper_spawn_agent",
        "command.execute.before",
        "tool.execute.before",
        "experimental.chat.system.transform",
        "session.create",
        "promptAsync",
        "VibePaper Initialized",
        "MINIMAL_PAPER",
    ]:
        assert expected in source


def test_plugin_uses_vibepaper_runtime_paths() -> None:
    source = "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted((PLUGIN_DIR / "src").rglob("*.ts"))
    )
    assert ".vibepaper" in source
    assert ".vibepaper/state.json" in source
    assert ".vibepaper/events.jsonl" in source
    assert "literature phase" not in source


def test_plugin_has_core_and_opencode_modules() -> None:
    for relative in [
        "src/core/schema.ts",
        "src/core/paths.ts",
        "src/core/state.ts",
        "src/core/eventlog.ts",
        "src/core/scaffold.ts",
        "src/core/dashboard.ts",
        "src/core/policy.ts",
        "src/opencode/context.ts",
        "src/opencode/tools.ts",
        "src/opencode/hooks.ts",
    ]:
        assert (PLUGIN_DIR / relative).exists()
