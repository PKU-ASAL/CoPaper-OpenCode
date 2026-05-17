export const PERMISSION_PROFILE_NAMES = ["readOnly", "storylineWrite", "paperWrite", "stateRecord"] as const

export type PermissionProfileName = (typeof PERMISSION_PROFILE_NAMES)[number]
export type OpenCodePermissionDecision = "allow" | "ask" | "deny"
export type OpenCodePermissionRule = OpenCodePermissionDecision | Record<string, OpenCodePermissionDecision>
export type OpenCodePermissionConfig = Record<string, OpenCodePermissionRule>

const READ_ONLY_PROFILE: OpenCodePermissionConfig = {
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
  vibepaper_relatedwork_status: "allow",
  vibepaper_workflow_status: "allow",
  vibepaper_workflow_log: "allow",
  vibepaper_init_apply: "deny",
  vibepaper_artifact_record: "deny",
  vibepaper_checker_record: "deny",
  vibepaper_workflow_set_phase: "deny",
}

const PERMISSION_PROFILES = {
  readOnly: READ_ONLY_PROFILE,
  storylineWrite: {
    ...READ_ONLY_PROFILE,
    edit: { "*": "deny", "storyline.md": "ask" },
  },
  paperWrite: {
    ...READ_ONLY_PROFILE,
    edit: { "*": "deny", "paper.md": "ask" },
  },
  stateRecord: {
    ...READ_ONLY_PROFILE,
    vibepaper_artifact_record: "ask",
    vibepaper_checker_record: "ask",
  },
} satisfies Record<PermissionProfileName, OpenCodePermissionConfig>

export function isPermissionProfileName(value: unknown): value is PermissionProfileName {
  return typeof value === "string" && PERMISSION_PROFILE_NAMES.includes(value as PermissionProfileName)
}

export function getPermissionProfile(name: PermissionProfileName): OpenCodePermissionConfig {
  return clonePermissionConfig(PERMISSION_PROFILES[name])
}

export function canUsePermissionProfile(
  maximum: PermissionProfileName,
  requested: PermissionProfileName,
): boolean {
  return maximum === requested || requested === "readOnly"
}

function clonePermissionConfig(profile: OpenCodePermissionConfig): OpenCodePermissionConfig {
  return Object.fromEntries(
    Object.entries(profile).map(([permissionName, rule]) => [
      permissionName,
      typeof rule === "object" ? { ...rule } : rule,
    ]),
  )
}
