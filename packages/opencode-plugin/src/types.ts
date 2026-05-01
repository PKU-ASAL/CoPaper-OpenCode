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

export type DashboardRecommendationMessageKey = "recommendation.repairInstallation" | "recommendation.previewInit" | "recommendation.ready"

export interface DashboardRecommendation {
  id: "repair-installation" | "preview-init" | "continue-workflow"
  messageKey: DashboardRecommendationMessageKey
  command: string | null
}

export interface DashboardResult {
  schemaVersion: typeof SCHEMA_VERSION
  ok: boolean
  root: string | null
  packageVersion: string
  locale: Locale
  localeFallback: boolean
  integration: DashboardInstallation
  readiness: ReadinessResult | null
  initPreview: InitPreviewResult
  recommendation: DashboardRecommendation
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

export type ProjectInitMode = "apply"
export type ProjectInitErrorCode = "missing-name" | "missing-domain" | "conflict" | "write-failed" | "root-detection-failed"

export interface ProjectInitError {
  code: ProjectInitErrorCode
  message: string
  path?: string
}

export interface ProjectInitConflict {
  path: string
  status: ReadinessItemStatus
  reason: string
}

export interface ProjectInitApplyOptions {
  root?: string
  cwd?: string
  worktree?: string
  name: string
  domain: string
  locale?: Locale
  now?: Date
}

export interface ProjectInitApplyResult {
  schemaVersion: typeof SCHEMA_VERSION
  ok: boolean
  root: string | null
  mode: ProjectInitMode
  locale: Locale
  changedFiles: string[]
  skippedFiles: string[]
  conflicts: ProjectInitConflict[]
  errors: ProjectInitError[]
  readinessBefore: ReadinessResult | null
  readinessAfter: ReadinessResult | null
}

export interface ProjectTemplateInput {
  name: string
  domain: string
  createdAt: string
}

export interface ProjectFileTemplate {
  path: string
  content: string
}

export interface ProjectStatePhaseBase {
  status: "not_started"
  completed_at: null
}

export interface ProjectState {
  project: {
    name: string
    created_at: string
    domain: string
  }
  phases: {
    storyline: ProjectStatePhaseBase & { metadata: Record<string, never> }
    literature: ProjectStatePhaseBase & { catalog_path: string; papers_found: number; papers_downloaded: number; download_failures: number; summaries_done: number; cross_index_built: boolean }
    discussion: ProjectStatePhaseBase & { rounds: number; dimensions_covered: string[] }
    experiments: ProjectStatePhaseBase & { skip_reason: null; data_files: string[] }
    writing: ProjectStatePhaseBase & { sections_complete: number; sections_total: number }
    latex_review: ProjectStatePhaseBase & { review_rounds: number; comments_addressed: number; comments_total: number }
  }
  current_phase: "storyline"
  event_log_path: ".agents/events.jsonl"
  git: {
    auto_commit: false
    identity: {
      role: "assistant"
      git_name: "VibePaper Bot"
      git_email: "bot@vibepaper.dev"
    }
  }
  checkers: Record<string, never>
}
