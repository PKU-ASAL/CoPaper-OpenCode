import { describe, expect, test } from "bun:test"
import {
  PERMISSION_PROFILE_NAMES,
  type OpenCodePermissionConfig,
  canUsePermissionProfile,
  getPermissionProfile,
  isPermissionProfileName,
} from "../src/permission-profiles"

const SAFE_READ_TOOL_PERMISSIONS = [
  "copaper_dashboard",
  "copaper_artifact_status",
  "copaper_paper_structure_status",
  "copaper_storyline_structure_status",
  "copaper_pdf_extract",
  "copaper_ppt_extract",
  "copaper_checker_status",
  "copaper_relatedwork_status",
  "copaper_workflow_status",
  "copaper_workflow_log",
] as const

const WRITE_TOOL_PERMISSIONS = [
  "copaper_init_apply",
  "copaper_artifact_record",
  "copaper_checker_record",
  "copaper_workflow_set_phase",
] as const

const RELATEDWORK_WRITE_TOOL_PERMISSIONS = [
  "copaper_relatedwork_keywords",
  "copaper_relatedwork_search",
  "copaper_relatedwork_import",
  "copaper_relatedwork_sync_bib",
  "copaper_relatedwork_download",
  "copaper_relatedwork_summarize",
  "copaper_relatedwork_register_summary",
  "copaper_relatedwork_build_index",
  "copaper_relatedwork_clean",
] as const

describe("permission profiles", () => {
  test("exports profile names in v1 order", () => {
    expect(PERMISSION_PROFILE_NAMES).toEqual(["readOnly", "storylineWrite", "paperWrite", "stateRecord", "literatureWrite"])
    expect(isPermissionProfileName("readOnly")).toBe(true)
    expect(isPermissionProfileName("literatureWrite")).toBe(true)
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
      copaper_dashboard: "allow",
      copaper_artifact_status: "allow",
      copaper_paper_structure_status: "allow",
      copaper_storyline_structure_status: "allow",
      copaper_pdf_extract: "allow",
      copaper_ppt_extract: "allow",
      copaper_checker_status: "allow",
      copaper_relatedwork_status: "allow",
      copaper_relatedwork_keywords: "deny",
      copaper_relatedwork_search: "deny",
      copaper_relatedwork_import: "deny",
      copaper_relatedwork_sync_bib: "deny",
      copaper_relatedwork_download: "deny",
      copaper_relatedwork_summarize: "deny",
      copaper_relatedwork_register_summary: "deny",
      copaper_relatedwork_build_index: "deny",
      copaper_relatedwork_clean: "deny",
      copaper_workflow_status: "allow",
      copaper_workflow_log: "allow",
      copaper_init_apply: "deny",
      copaper_artifact_record: "deny",
      copaper_checker_record: "deny",
      copaper_workflow_set_phase: "deny",
    })
  })

  test("literatureWrite gates relatedwork write tools behind ask and keeps inspection allowed", () => {
    const profile = getPermissionProfile("literatureWrite")

    expect(profile.bash).toBe("deny")
    expect(profile.edit).toBe("deny")
    expect(profile.copaper_relatedwork_status).toBe("allow")
    for (const permissionName of RELATEDWORK_WRITE_TOOL_PERMISSIONS) {
      expect(profile[permissionName]).toBe("ask")
    }
    expect(profile.copaper_init_apply).toBe("deny")
    expect(profile.copaper_workflow_set_phase).toBe("deny")
    expect(profile.copaper_artifact_record).toBe("deny")
  })

  test("non-literature profiles continue to deny relatedwork write tools", () => {
    for (const profileName of ["readOnly", "storylineWrite", "paperWrite", "stateRecord"] as const) {
      const profile = getPermissionProfile(profileName)
      for (const permissionName of RELATEDWORK_WRITE_TOOL_PERMISSIONS) {
        expect(profile[permissionName]).toBe("deny")
      }
    }
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

  test("all profiles allow safe read-only CoPaper tools", () => {
    for (const profileName of PERMISSION_PROFILE_NAMES) {
      const profile = getPermissionProfile(profileName)
      for (const permissionName of SAFE_READ_TOOL_PERMISSIONS) {
        expect(profile[permissionName]).toBe("allow")
      }
    }
  })

  test("non-recorder profiles deny CoPaper write and process tools", () => {
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

  test("stateRecord keeps generic edit denied and only asks for state records", () => {
    const profile = getPermissionProfile("stateRecord")

    expect(profile.edit).toBe("deny")
    expect(typeof profile.read).toBe("object")
    expect(profile.bash).toBe("deny")
    expect(profile.copaper_artifact_record).toBe("ask")
    expect(profile.copaper_checker_record).toBe("ask")
    expect(profile.copaper_init_apply).toBe("deny")
    expect(profile.copaper_workflow_set_phase).toBe("deny")
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
