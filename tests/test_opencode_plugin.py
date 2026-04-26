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
    source = (PLUGIN_DIR / "src" / "index.ts").read_text(encoding="utf-8")
    for expected in [
        "vibepaper_status",
        "vibepaper_set_phase",
        "vibepaper_spawn_agent",
        "tool.execute.before",
        "experimental.chat.system.transform",
        "session.create",
        "promptAsync",
    ]:
        assert expected in source
