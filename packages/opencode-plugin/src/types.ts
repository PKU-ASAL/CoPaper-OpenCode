export const PACKAGE_NAME = "@vibepaper/opencode" as const
export const CLI_NAME = "vibepaper-opencode" as const
export const SCHEMA_VERSION = 1 as const
export const VIBE_COMMAND = "vibe" as const
export const VIBE_DOCTOR_COMMAND = "vibe-doctor" as const

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
