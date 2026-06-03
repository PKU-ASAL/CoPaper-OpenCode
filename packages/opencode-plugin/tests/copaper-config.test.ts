import { describe, expect, test } from "bun:test"
import { resolve } from "node:path"
import { mkdirSync } from "node:fs"
import { loadCoPaperConfig } from "../src/copaper-config"
import { DEFAULT_LOCALE, SCHEMA_VERSION } from "../src/types"
import { hashTree, makeTempProject } from "./fixtures"

describe("copaper config loader", () => {
  test("missing config returns defaults, diagnostic, and no mutation", () => {
    const project = makeTempProject("copaper-config-missing-")
    try {
      project.write("paper.md", "# Paper\n")
      const before = hashTree(project.root)

      const result = loadCoPaperConfig(project.root)

      expect(result.path).toBe(resolve(project.root, ".opencode", "copaper.json"))
      expect(result.config).toEqual({
        schemaVersion: SCHEMA_VERSION,
        locale: DEFAULT_LOCALE,
        defaults: {},
        agents: {},
      })
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          severity: "info",
          code: "config-missing",
        }),
      ])
      expect(hashTree(project.root)).toBe(before)
    } finally {
      project.cleanup()
    }
  })

  test("parses valid config with defaults and agent overrides", () => {
    const project = makeTempProject("copaper-config-valid-")
    try {
      project.write(
        ".opencode/copaper.json",
        `{
          // JSONC comments are supported.
          "$schema": "https://copaper.dev/opencode.schema.json",
          "schemaVersion": ${SCHEMA_VERSION},
          "locale": "en-US",
          "defaults": {
            "model": "gpt-5.5",
            "temperature": 0.4,
          },
          "agents": {
            "copaper-writer": {
              "enabled": false,
              "model": "writer-model",
              "temperature": 1.5,
              "promptAppend": "Use concise academic prose.",
              "permissionProfile": "paperWrite",
            },
          },
        }`,
      )

      const result = loadCoPaperConfig(project.root)

      expect(result.diagnostics).toEqual([])
      expect(result.config).toEqual({
        schemaVersion: SCHEMA_VERSION,
        locale: "en-US",
        defaults: {
          model: "gpt-5.5",
          temperature: 0.4,
        },
        agents: {
          "copaper-writer": {
            enabled: false,
            model: "writer-model",
            temperature: 1.5,
            promptAppend: "Use concise academic prose.",
            permissionProfile: "paperWrite",
          },
        },
      })
    } finally {
      project.cleanup()
    }
  })

  test("parse failure falls back to safe config with warning", () => {
    const project = makeTempProject("copaper-config-parse-")
    try {
      project.write(".opencode/copaper.json", "{ invalid json")

      const result = loadCoPaperConfig(project.root)

      expect(result.config).toEqual({
        schemaVersion: SCHEMA_VERSION,
        locale: DEFAULT_LOCALE,
        defaults: {},
        agents: {},
      })
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          severity: "warning",
          code: "config-parse-failed",
        }),
      ])
    } finally {
      project.cleanup()
    }
  })

  test("unsupported schema falls back to safe config with warning", () => {
    const project = makeTempProject("copaper-config-schema-")
    try {
      project.write(
        ".opencode/copaper.json",
        JSON.stringify({
          schemaVersion: SCHEMA_VERSION + 1,
          locale: "en-US",
          defaults: { model: "unsafe-model", temperature: 2 },
          agents: { "copaper-writer": { enabled: false } },
        }),
      )

      const result = loadCoPaperConfig(project.root)

      expect(result.config).toEqual({
        schemaVersion: SCHEMA_VERSION,
        locale: DEFAULT_LOCALE,
        defaults: {},
        agents: {},
      })
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          severity: "warning",
          code: "unsupported-schema-version",
        }),
      ])
    } finally {
      project.cleanup()
    }
  })

  test("unknown fields and unknown agents are ignored with warnings", () => {
    const project = makeTempProject("copaper-config-unknown-")
    try {
      project.write(
        ".opencode/copaper.json",
        JSON.stringify({
          schemaVersion: SCHEMA_VERSION,
          locale: DEFAULT_LOCALE,
          extraTop: true,
          defaults: { model: "default-model", unknownDefault: true },
          agents: {
            "copaper-storyline": { enabled: true, unknownOverride: "ignored" },
            "not-a-copaper-agent": { enabled: true },
          },
        }),
      )

      const result = loadCoPaperConfig(project.root)

      expect(result.config).toEqual({
        schemaVersion: SCHEMA_VERSION,
        locale: DEFAULT_LOCALE,
        defaults: { model: "default-model" },
        agents: { "copaper-storyline": { enabled: true } },
      })
      expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
        "unsupported-field",
        "unsupported-field",
        "unsupported-field",
        "unknown-agent",
      ])
    } finally {
      project.cleanup()
    }
  })

  test("invalid locale, temperature, and permission profile are ignored", () => {
    const project = makeTempProject("copaper-config-invalid-")
    try {
      project.write(
        ".opencode/copaper.json",
        JSON.stringify({
          schemaVersion: SCHEMA_VERSION,
          locale: "fr-FR",
          defaults: { model: "   ", temperature: 2.5 },
          agents: {
            "copaper-writer": {
              enabled: true,
              temperature: -0.1,
              promptAppend: "",
              permissionProfile: "admin",
            },
          },
        }),
      )

      const result = loadCoPaperConfig(project.root)

      expect(result.config).toEqual({
        schemaVersion: SCHEMA_VERSION,
        locale: DEFAULT_LOCALE,
        defaults: {},
        agents: { "copaper-writer": { enabled: true } },
      })
      expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
        "invalid-field",
        "invalid-field",
        "invalid-field",
        "invalid-field",
        "invalid-field",
        "unknown-permission-profile",
      ])
    } finally {
      project.cleanup()
    }
  })

  test("non-file config falls back to safe config with warning", () => {
    const project = makeTempProject("copaper-config-non-file-")
    try {
      mkdirSync(project.path(".opencode", "copaper.json"), { recursive: true })

      const result = loadCoPaperConfig(project.root)

      expect(result.config).toEqual({
        schemaVersion: SCHEMA_VERSION,
        locale: DEFAULT_LOCALE,
        defaults: {},
        agents: {},
      })
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          severity: "warning",
          code: "invalid-field",
        }),
      ])
    } finally {
      project.cleanup()
    }
  })
})
