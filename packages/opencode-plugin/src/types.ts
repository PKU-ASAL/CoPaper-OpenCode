export const PACKAGE_NAME = "@vibepaper/opencode" as const
export const CLI_NAME = "vibepaper-opencode" as const
export const BUNX_CLI_COMMAND = `bunx -p ${PACKAGE_NAME} ${CLI_NAME}` as const
export const SCHEMA_VERSION = 1 as const
export const VIBE_COMMAND = "vibe" as const
export const VIBE_DOCTOR_COMMAND = "vibe-doctor" as const
export const DEFAULT_LOCALE = "zh-CN" as const
export const SUPPORTED_LOCALES = ["zh-CN", "en-US"] as const
export type Locale = typeof SUPPORTED_LOCALES[number]

export function isVibePaperPluginSpecifier(value: unknown): value is string {
  return typeof value === "string" && (value === PACKAGE_NAME || (value.startsWith("file://") && value.includes("/@vibepaper/opencode/dist/index.js")))
}

export type CheckStatus = "pass" | "warn" | "fail" | "info"
export type CheckSeverity = "error" | "warning" | "info"
export type OutputFormat = "text" | "markdown" | "json"

export interface RootDetection {
  root: string
  reason: string
}

export interface DoctorCheck {
  id: string
  status: CheckStatus
  severity: CheckSeverity
  message: string
  remediation: string | null
}

export interface DoctorResult {
  schemaVersion: typeof SCHEMA_VERSION
  ok: boolean
  root: string | null
  rootReason: string
  packageVersion: string
  checks: DoctorCheck[]
  nextSteps: string[]
}

export interface DashboardInstallation {
  configPresent: boolean
  configParseable: boolean
  pluginConfigured: boolean
  vibeCommandPresent: boolean
  vibeDoctorCommandPresent: boolean
  vibeCommandManaged: boolean
  vibeDoctorCommandManaged: boolean
}

export interface DashboardResult {
  schemaVersion: typeof SCHEMA_VERSION
  ok: boolean
  root: string | null
  packageVersion: string
  installation: DashboardInstallation
  recommendations: string[]
}

export type ReadinessProjectStatus = "ready" | "needs-init" | "blocked"
export type ReadinessItemStatus = "ready" | "missing" | "conflict" | "invalid" | "exists-user" | "exists-managed" | "optional"

export interface ReadinessItem {
  id: string
  path: string
  status: ReadinessItemStatus
  required: boolean
  message: string
}

export interface ReadinessSummary {
  ready: number
  missing: number
  conflict: number
  invalid: number
  optional: number
}

export interface ReadinessResult {
  ok: boolean
  status: ReadinessProjectStatus
  root: string
  items: ReadinessItem[]
  summary: ReadinessSummary
}

export type InitPreviewAction = "create" | "exists-managed" | "exists-user" | "conflict" | "optional"
export type InitPreviewReason = "missing-required" | "missing-guidance" | "already-managed" | "user-owned" | "unsafe-target" | "future-optional"

export interface InitPreviewItem {
  path: string
  action: InitPreviewAction
  reason: InitPreviewReason
  safe: boolean
}

export interface InitPreviewResult {
  readonly: true
  blocked: boolean
  items: InitPreviewItem[]
}
