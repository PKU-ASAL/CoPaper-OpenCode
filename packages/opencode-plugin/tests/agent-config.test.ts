import { describe, expect, test } from "bun:test"
import { buildCoPaperAgentConfig } from "../src/agent-config"
import { SCHEMA_VERSION } from "../src/types"
import { makeTempProject } from "./fixtures"

describe("agent config builder", () => {
  test("missing config injects default agents in order", () => {
    const project = makeTempProject("agent-config-defaults-")
    try {
      const result = buildCoPaperAgentConfig({ root: project.root, existingAgents: {} })

      expect(Object.keys(result.injectedAgents)).toEqual([
        "copaper-coordinator",
        "copaper-storyline",
        "copaper-writer",
        "copaper-reviewer",
        "copaper-recorder",
        "copaper-literature",
      ])
      expect(result.injectedAgents["copaper-writer"]?.permission.edit).toEqual({ "*": "deny", "paper.md": "ask" })
      expect(result.runtime.agents.map((agent) => agent.name)).toEqual(Object.keys(result.injectedAgents))
      expect(result.runtime.agents.every((agent) => agent.status === "injected")).toBe(true)
    } finally {
      project.cleanup()
    }
  })

  test("applies defaults, per-agent overrides, and prompt append", () => {
    const project = makeTempProject("agent-config-overrides-")
    try {
      project.write(
        ".opencode/copaper.json",
        JSON.stringify({
          schemaVersion: SCHEMA_VERSION,
          locale: "en-US",
          defaults: {
            model: "default-model",
            temperature: 0.9,
          },
          agents: {
            "copaper-writer": {
              model: "writer-model",
              temperature: 0.2,
              promptAppend: "Use short paragraphs.",
            },
          },
        }),
      )

      const result = buildCoPaperAgentConfig({ root: project.root, existingAgents: {} })

      expect(result.injectedAgents["copaper-coordinator"]).toMatchObject({
        model: "default-model",
        temperature: 0.9,
      })
      expect(result.injectedAgents["copaper-writer"]).toMatchObject({
        model: "writer-model",
        temperature: 0.2,
      })
      expect(result.injectedAgents["copaper-writer"]?.prompt).toContain("## Project-specific preferences\nUse short paragraphs.")
    } finally {
      project.cleanup()
    }
  })

  test("disabled agents are not injected", () => {
    const project = makeTempProject("agent-config-disabled-")
    try {
      project.write(
        ".opencode/copaper.json",
        JSON.stringify({
          schemaVersion: SCHEMA_VERSION,
          agents: {
            "copaper-writer": { enabled: false },
          },
        }),
      )

      const result = buildCoPaperAgentConfig({ root: project.root, existingAgents: {} })

      expect(result.injectedAgents["copaper-writer"]).toBeUndefined()
      expect(result.runtime.agents.find((agent) => agent.name === "copaper-writer")).toMatchObject({
        status: "disabled",
      })
    } finally {
      project.cleanup()
    }
  })

  test("existing OpenCode agent conflict skips injection", () => {
    const project = makeTempProject("agent-config-conflict-")
    try {
      const userAgent = {
        description: "User-owned writer",
        mode: "subagent" as const,
        prompt: "Do not replace me.",
        permission: { read: "allow" as const },
      }

      const result = buildCoPaperAgentConfig({
        root: project.root,
        existingAgents: { "copaper-writer": userAgent },
      })

      expect(result.injectedAgents["copaper-writer"]).toBeUndefined()
      expect(userAgent.prompt).toBe("Do not replace me.")
      expect(result.runtime.agents.find((agent) => agent.name === "copaper-writer")).toMatchObject({
        status: "conflicted",
      })
      expect(result.diagnostics.find((diagnostic) => diagnostic.code === "agent-name-conflict")).toMatchObject({
        path: ".opencode/copaper.json",
        field: "agents.copaper-writer",
      })
    } finally {
      project.cleanup()
    }
  })

  test("permission escalation is denied", () => {
    const project = makeTempProject("agent-config-escalation-")
    try {
      project.write(
        ".opencode/copaper.json",
        JSON.stringify({
          schemaVersion: SCHEMA_VERSION,
          agents: {
            "copaper-coordinator": { permissionProfile: "paperWrite" },
          },
        }),
      )

      const result = buildCoPaperAgentConfig({ root: project.root, existingAgents: {} })
      const runtimeRow = result.runtime.agents.find((agent) => agent.name === "copaper-coordinator")

      expect(result.injectedAgents["copaper-coordinator"]?.permission.edit).toBe("deny")
      expect(runtimeRow).toMatchObject({ permissionProfile: "readOnly" })
      expect(result.diagnostics.find((diagnostic) => diagnostic.code === "permission-escalation-denied")).toMatchObject({
        path: ".opencode/copaper.json",
        field: "agents.copaper-coordinator.permissionProfile",
      })
    } finally {
      project.cleanup()
    }
  })

  test("permission downgrade is allowed", () => {
    const project = makeTempProject("agent-config-downgrade-")
    try {
      project.write(
        ".opencode/copaper.json",
        JSON.stringify({
          schemaVersion: SCHEMA_VERSION,
          agents: {
            "copaper-writer": { permissionProfile: "readOnly" },
          },
        }),
      )

      const result = buildCoPaperAgentConfig({ root: project.root, existingAgents: {} })

      expect(result.injectedAgents["copaper-writer"]?.permission.edit).toBe("deny")
      expect(result.runtime.agents.find((agent) => agent.name === "copaper-writer")).toMatchObject({
        status: "injected",
        permissionProfile: "readOnly",
      })
      expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain("permission-escalation-denied")
    } finally {
      project.cleanup()
    }
  })
})
