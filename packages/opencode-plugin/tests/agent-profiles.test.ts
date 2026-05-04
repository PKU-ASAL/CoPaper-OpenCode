import { describe, expect, test } from "bun:test"
import {
  VIBEPAPER_AGENT_NAMES,
  buildDefaultAgentProfiles,
  getDefaultAgentProfile,
  isVibePaperAgentName,
} from "../src/agent-profiles"

describe("agent profiles", () => {
  test("exports v1 agent names in exact order", () => {
    expect(VIBEPAPER_AGENT_NAMES).toEqual([
      "vibepaper-coordinator",
      "vibepaper-storyline",
      "vibepaper-writer",
      "vibepaper-recorder",
    ])
  })

  test("builds four enabled VibePaper subagent profiles", () => {
    const profiles = buildDefaultAgentProfiles()

    expect(Object.keys(profiles)).toEqual([...VIBEPAPER_AGENT_NAMES])

    for (const profile of Object.values(profiles)) {
      expect(profile.enabled).toBe(true)
      expect(profile.mode).toBe("subagent")
      expect(profile.description.length).toBeGreaterThan(0)
      expect(profile.prompt).toContain("VibePaper")
      expect(profile.prompt).toContain("Role Boundary")
      expect(profile.prompt).toContain("Artifact Boundary")
      expect(profile.prompt).toContain("Workflow Rules")
      expect(profile.prompt).toContain("Tool Policy")
      expect(profile.prompt).toContain("Handoff")
      expect(profile.temperatureHint.length).toBeGreaterThan(0)
    }
  })

  test("permission defaults and maximums match built-in roles", () => {
    expect(getDefaultAgentProfile("vibepaper-coordinator")).toMatchObject({
      permissionProfile: "readOnly",
      maxPermissionProfile: "readOnly",
    })
    expect(getDefaultAgentProfile("vibepaper-storyline")).toMatchObject({
      permissionProfile: "storylineWrite",
      maxPermissionProfile: "storylineWrite",
    })
    expect(getDefaultAgentProfile("vibepaper-writer")).toMatchObject({
      permissionProfile: "paperWrite",
      maxPermissionProfile: "paperWrite",
    })
    expect(getDefaultAgentProfile("vibepaper-recorder")).toMatchObject({
      permissionProfile: "stateRecord",
      maxPermissionProfile: "stateRecord",
    })
  })

  test("writer prompt keeps paper.md and writing-rule boundaries", () => {
    const prompt = getDefaultAgentProfile("vibepaper-writer").prompt

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
    for (const agentName of ["vibepaper-storyline", "vibepaper-writer"] as const) {
      const prompt = getDefaultAgentProfile(agentName).prompt

      expect(prompt).toContain("Do not fabricate experiments, data, citations, literature conclusions, or contributions")
      expect(prompt).toContain("ask the user or mark assumptions")
    }
  })

  test("recorder prompt keeps artifact recording boundaries", () => {
    const prompt = getDefaultAgentProfile("vibepaper-recorder").prompt

    expect(prompt).toContain("vibepaper_artifact_record")
    expect(prompt).toContain("Do not edit paper.md")
    expect(prompt).toContain("Do not edit storyline.md")
  })

  test("prompts avoid unsupported orchestration and external-operation claims", () => {
    for (const profile of Object.values(buildDefaultAgentProfiles())) {
      expect(profile.prompt).not.toMatch(/automatic handoff|scheduler|web|network|shell|git|checker|report|provider|secret/i)
    }
  })

  test("identifies built-in VibePaper agent names", () => {
    expect(isVibePaperAgentName("vibepaper-writer")).toBe(true)
    expect(isVibePaperAgentName("writer")).toBe(false)
    expect(isVibePaperAgentName(null)).toBe(false)
  })
})
