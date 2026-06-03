import { describe, expect, test } from "bun:test"
import {
  COPAPER_AGENT_NAMES,
  buildDefaultAgentProfiles,
  getDefaultAgentProfile,
  isCoPaperAgentName,
} from "../src/agent-profiles"

describe("agent profiles", () => {
  test("exports v1 agent names in exact order", () => {
    expect(COPAPER_AGENT_NAMES).toEqual([
      "copaper-coordinator",
      "copaper-storyline",
      "copaper-writer",
      "copaper-reviewer",
      "copaper-recorder",
      "copaper-literature",
    ])
  })

  test("builds enabled CoPaper subagent profiles", () => {
    const profiles = buildDefaultAgentProfiles()

    expect(Object.keys(profiles)).toEqual([...COPAPER_AGENT_NAMES])

    for (const profile of Object.values(profiles)) {
      expect(profile.enabled).toBe(true)
      expect(profile.mode).toBe("subagent")
      expect(profile.description.length).toBeGreaterThan(0)
      expect(profile.prompt).toContain("CoPaper")
      expect(profile.prompt).toContain("Role Boundary")
      expect(profile.prompt).toContain("Artifact Boundary")
      expect(profile.prompt).toContain("Workflow Rules")
      expect(profile.prompt).toContain("Tool Policy")
      expect(profile.prompt).toContain("Handoff")
      expect(profile.temperatureHint.length).toBeGreaterThan(0)
    }
  })

  test("permission defaults and maximums match built-in roles", () => {
    expect(getDefaultAgentProfile("copaper-coordinator")).toMatchObject({
      permissionProfile: "readOnly",
      maxPermissionProfile: "readOnly",
    })
    expect(getDefaultAgentProfile("copaper-storyline")).toMatchObject({
      permissionProfile: "storylineWrite",
      maxPermissionProfile: "storylineWrite",
    })
    expect(getDefaultAgentProfile("copaper-writer")).toMatchObject({
      permissionProfile: "paperWrite",
      maxPermissionProfile: "paperWrite",
    })
    expect(getDefaultAgentProfile("copaper-reviewer")).toMatchObject({
      permissionProfile: "readOnly",
      maxPermissionProfile: "readOnly",
    })
    expect(getDefaultAgentProfile("copaper-recorder")).toMatchObject({
      permissionProfile: "stateRecord",
      maxPermissionProfile: "stateRecord",
    })
    expect(getDefaultAgentProfile("copaper-literature")).toMatchObject({
      permissionProfile: "literatureWrite",
      maxPermissionProfile: "literatureWrite",
    })
  })

  test("literature prompt enforces relatedwork orchestration rules", () => {
    const prompt = getDefaultAgentProfile("copaper-literature").prompt

    expect(prompt).toContain("copaper_relatedwork_status")
    expect(prompt).toContain("copaper_workflow_set_phase")
    expect(prompt.toLowerCase()).toContain("restate")
    expect(prompt).toContain("Never auto-advance the literature phase")
    expect(prompt).toContain("copaper-cli-unavailable")
  })

  test("writer prompt keeps paper.md and writing-rule boundaries", () => {
    const prompt = getDefaultAgentProfile("copaper-writer").prompt

    expect(prompt).toContain("paper.md")
    expect(prompt).toContain("Read storyline.md before drafting")
    expect(prompt).toContain(".agents/cross_index.json")
    expect(prompt).toContain("relatedwork/papers/*.md")
    expect(prompt).toContain("Level 1-5")
    expect(prompt).toContain("Level 6")
    expect(prompt).toContain("50 characters")
    expect(prompt).toContain("500 characters")
    expect(prompt).toContain("Do not edit .agents/state.json")
  })

  test("storyline and writer prompts include anti-fabrication boundaries", () => {
    for (const agentName of ["copaper-storyline", "copaper-writer"] as const) {
      const prompt = getDefaultAgentProfile(agentName).prompt

      expect(prompt).toContain("Do not fabricate experiments, data, citations, literature conclusions, or contributions")
      expect(prompt).toContain("ask the user or mark assumptions")
    }
  })

  test("recorder prompt keeps artifact recording boundaries", () => {
    const prompt = getDefaultAgentProfile("copaper-recorder").prompt

    expect(prompt).toContain("copaper_artifact_record")
    expect(prompt).toContain("Do not edit paper.md")
    expect(prompt).toContain("Do not edit storyline.md")
  })

  test("reviewer prompt keeps checker review read-only", () => {
    const prompt = getDefaultAgentProfile("copaper-reviewer").prompt

    expect(prompt).toContain("checker")
    expect(prompt).toContain("Do not edit paper.md")
    expect(prompt).toContain("Do not call state-writing tools")
    expect(prompt).toContain("copaper_checker_status")
    expect(prompt).toContain("@copaper-recorder")
  })

  test("prompts avoid unsupported orchestration and external-operation claims", () => {
    for (const profile of Object.values(buildDefaultAgentProfiles()).filter((profile) => profile.name !== "copaper-reviewer")) {
      expect(profile.prompt).not.toMatch(/automatic handoff|scheduler|web|network|shell|git|checker|report|provider|secret/i)
    }

    expect(getDefaultAgentProfile("copaper-reviewer").prompt).not.toMatch(/automatic handoff|scheduler|web|network|shell|git|provider|secret/i)
  })

  test("identifies built-in CoPaper agent names", () => {
    expect(isCoPaperAgentName("copaper-writer")).toBe(true)
    expect(isCoPaperAgentName("writer")).toBe(false)
    expect(isCoPaperAgentName(null)).toBe(false)
  })
})
