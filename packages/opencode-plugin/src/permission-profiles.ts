export const PERMISSION_PROFILE_NAMES = ["readOnly", "storylineWrite", "paperWrite", "stateRecord", "literatureWrite"] as const

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
    copaper_artifact_record: "ask",
    copaper_checker_record: "ask",
  },
  literatureWrite: {
    ...READ_ONLY_PROFILE,
    copaper_relatedwork_keywords: "ask",
    copaper_relatedwork_search: "ask",
    copaper_relatedwork_import: "ask",
    copaper_relatedwork_sync_bib: "ask",
    copaper_relatedwork_download: "ask",
    copaper_relatedwork_summarize: "ask",
    copaper_relatedwork_register_summary: "ask",
    copaper_relatedwork_build_index: "ask",
    copaper_relatedwork_clean: "ask",
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
