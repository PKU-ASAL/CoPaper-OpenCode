import { describe, expect, test } from "bun:test"
import {
  PERMISSION_PROFILE_NAMES,
  type OpenCodePermissionConfig,
  canUsePermissionProfile,
  getPermissionProfile,
  isPermissionProfileName,
} from "../src/permission-profiles"

const SAFE_READ_TOOL_PERMISSIONS = [
  "vibepaper_dashboard",
  "vibepaper_artifact_status",
  "vibepaper_paper_structure_status",
  "vibepaper_storyline_structure_status",
  "vibepaper_pdf_extract",
  "vibepaper_ppt_extract",
  "vibepaper_checker_status",
  "vibepaper_workflow_status",
  "vibepaper_workflow_log",
] as const

const WRITE_TOOL_PERMISSIONS = [
  "vibepaper_init_apply",
  "vibepaper_artifact_record",
  "vibepaper_workflow_set_phase",
] as const

describe("permission profiles", () => {
  test("exports profile names in v1 order", () => {
    expect(PERMISSION_PROFILE_NAMES).toEqual(["readOnly", "storylineWrite", "paperWrite", "stateRecord"])
    expect(isPermissionProfileName("readOnly")).toBe(true)
    expect(isPermissionProfileName("unknown")).toBe(false)
  })

  test("readOnly allows inspection and denies writes/external execution", () => {
    expect(getPermissionProfile("readOnly")).toEqual({
      read: {
        "*": "allow",
        ".env": "deny",
        ".env.*": "deny",
        "**/.env": "deny",
        "**/.env.*": "deny",
        ".env.example": "allow",
        "**/.env.example": "allow",
      },
      glob: "allow",
      grep: "allow",
      question: "allow",
      lsp: "allow",
      edit: "deny",
      bash: "deny",
      webfetch: "deny",
      websearch: "deny",
      external_directory: "deny",
      task: "deny",
      skill: "deny",
      vibepaper_dashboard: "allow",
      vibepaper_artifact_status: "allow",
      vibepaper_paper_structure_status: "allow",
      vibepaper_storyline_structure_status: "allow",
      vibepaper_pdf_extract: "allow",
      vibepaper_ppt_extract: "allow",
      vibepaper_checker_status: "allow",
      vibepaper_workflow_status: "allow",
      vibepaper_workflow_log: "allow",
      vibepaper_init_apply: "deny",
      vibepaper_artifact_record: "deny",
      vibepaper_workflow_set_phase: "deny",
    })
  })

  test("read permission preserves OpenCode secret-file denials", () => {
    const profile = getPermissionProfile("readOnly")

    expectObjectRuleKeys(profile, "read", ["*", ".env", ".env.*", "**/.env", "**/.env.*", ".env.example", "**/.env.example"])
    expect(profile.read).toEqual({
      "*": "allow",
      ".env": "deny",
      ".env.*": "deny",
      "**/.env": "deny",
      "**/.env.*": "deny",
      ".env.example": "allow",
      "**/.env.example": "allow",
    })
  })

  test("all profiles allow safe read-only VibePaper tools", () => {
    for (const profileName of PERMISSION_PROFILE_NAMES) {
      const profile = getPermissionProfile(profileName)
      for (const permissionName of SAFE_READ_TOOL_PERMISSIONS) {
        expect(profile[permissionName]).toBe("allow")
      }
    }
  })

  test("non-recorder profiles deny VibePaper write and process tools", () => {
    for (const profileName of ["readOnly", "storylineWrite", "paperWrite"] as const) {
      const profile = getPermissionProfile(profileName)
      for (const permissionName of WRITE_TOOL_PERMISSIONS) {
        expect(profile[permissionName]).toBe("deny")
      }
    }
  })

  test("storylineWrite only asks to edit storyline.md", () => {
    const profile = getPermissionProfile("storylineWrite")

    expectObjectRuleKeys(profile, "edit", ["*", "storyline.md"])
    expect(profile.edit).toEqual({ "*": "deny", "storyline.md": "ask" })
    expect(typeof profile.read).toBe("object")
    expect(profile.bash).toBe("deny")
  })

  test("paperWrite only asks to edit paper.md", () => {
    const profile = getPermissionProfile("paperWrite")

    expectObjectRuleKeys(profile, "edit", ["*", "paper.md"])
    expect(profile.edit).toEqual({ "*": "deny", "paper.md": "ask" })
    expect(typeof profile.read).toBe("object")
    expect(profile.bash).toBe("deny")
  })

  test("stateRecord keeps generic edit denied and only asks for artifact records", () => {
    const profile = getPermissionProfile("stateRecord")

    expect(profile.edit).toBe("deny")
    expect(typeof profile.read).toBe("object")
    expect(profile.bash).toBe("deny")
    expect(profile.vibepaper_artifact_record).toBe("ask")
    expect(profile.vibepaper_init_apply).toBe("deny")
    expect(profile.vibepaper_workflow_set_phase).toBe("deny")
  })

  test("permission profile ordering only allows safe downgrades", () => {
    for (const profileName of PERMISSION_PROFILE_NAMES) {
      expect(canUsePermissionProfile(profileName, profileName)).toBe(true)
      expect(canUsePermissionProfile(profileName, "readOnly")).toBe(true)
    }

    expect(canUsePermissionProfile("readOnly", "storylineWrite")).toBe(false)
    expect(canUsePermissionProfile("readOnly", "paperWrite")).toBe(false)
    expect(canUsePermissionProfile("readOnly", "stateRecord")).toBe(false)
    expect(canUsePermissionProfile("storylineWrite", "paperWrite")).toBe(false)
    expect(canUsePermissionProfile("storylineWrite", "stateRecord")).toBe(false)
    expect(canUsePermissionProfile("paperWrite", "storylineWrite")).toBe(false)
    expect(canUsePermissionProfile("paperWrite", "stateRecord")).toBe(false)
    expect(canUsePermissionProfile("stateRecord", "storylineWrite")).toBe(false)
    expect(canUsePermissionProfile("stateRecord", "paperWrite")).toBe(false)
  })

  test("returns cloned permission profiles", () => {
    const firstProfile = getPermissionProfile("storylineWrite")
    const secondProfile = getPermissionProfile("storylineWrite")

    expect(firstProfile).not.toBe(secondProfile)
    expect(firstProfile.edit).not.toBe(secondProfile.edit)

    if (typeof firstProfile.edit === "object") {
      firstProfile.edit["storyline.md"] = "deny"
    }

    expect(getPermissionProfile("storylineWrite").edit).toEqual({ "*": "deny", "storyline.md": "ask" })
  })
})

function expectObjectRuleKeys(
  profile: OpenCodePermissionConfig,
  permissionName: string,
  keys: string[],
): void {
  expect(typeof profile[permissionName]).toBe("object")
  expect(Object.keys(profile[permissionName] as Record<string, unknown>)).toEqual(keys)
}
