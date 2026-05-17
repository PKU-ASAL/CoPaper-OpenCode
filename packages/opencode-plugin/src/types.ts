export const PACKAGE_NAME = "@vibepaper/opencode" as const
export const CLI_NAME = "vibepaper-opencode" as const
export const BUNX_CLI_COMMAND = `bunx -p ${PACKAGE_NAME} ${CLI_NAME}` as const
export const SCHEMA_VERSION = 1 as const
export const VIBE_COMMAND = "vibe" as const
export const VIBE_DOCTOR_COMMAND = "vibe-doctor" as const
export const DEFAULT_LOCALE = "zh-CN" as const
export const SUPPORTED_LOCALES = ["zh-CN", "en-US"] as const
export type Locale = typeof SUPPORTED_LOCALES[number]
export const WORKFLOW_PHASE_STATUSES = ["not_started", "in_progress", "complete", "skipped"] as const
export const WORKFLOW_OPERATORS = ["user", "ai", "system"] as const
export type WorkflowPhaseStatus = typeof WORKFLOW_PHASE_STATUSES[number]
export type WorkflowOperator = typeof WORKFLOW_OPERATORS[number]
export const ARTIFACT_STATUSES = ["missing", "template", "partial", "ready", "stale", "unknown"] as const
export const ARTIFACT_CONFIDENCE = ["low", "medium", "high"] as const
export const ARTIFACT_IDS = ["storyline", "paper", "relatedwork", "cross_index", "skills", "checker_results"] as const
export const ARTIFACT_RECORD_IDS = ["storyline", "paper", "relatedwork", "cross_index", "checker_results"] as const
export type ArtifactStatus = typeof ARTIFACT_STATUSES[number]
export type ArtifactConfidence = typeof ARTIFACT_CONFIDENCE[number]
export type ArtifactId = typeof ARTIFACT_IDS[number]
export type ArtifactRecordId = typeof ARTIFACT_RECORD_IDS[number]

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

export type ArtifactRecommendationId = "continue-storyline" | "continue-paper" | "continue-relatedwork" | "continue-cross-index" | "continue-skills" | "run-checkers" | "confirm-readiness" | "refresh-readiness" | "continue-workflow" | "unavailable"

export interface ArtifactRecommendation {
  id: ArtifactRecommendationId
  messageKey: "artifact.recommendationStoryline" | "artifact.recommendationPaper" | "artifact.recommendationRelatedwork" | "artifact.recommendationCrossIndex" | "artifact.recommendationSkills" | "artifact.recommendationCheckers" | "artifact.recommendationConfirmReadiness" | "artifact.recommendationRefreshReadiness" | "artifact.recommendationContinue" | "artifact.recommendationUnavailable"
  artifactId: ArtifactId | null
  command: string | null
}

export interface ArtifactReadinessProvenance {
  source: "opencode" | string
  operator: "user" | string
  reason: string
  [key: string]: unknown
}

export interface ArtifactReadinessRecord {
  status: ArtifactStatus
  confidence: ArtifactConfidence
  evidence: string[]
  provenance: ArtifactReadinessProvenance
  updated_at: string
  content_hash?: string
  [key: string]: unknown
}

export interface RecordedArtifactReadiness {
  artifact: ArtifactRecordId
  record: ArtifactReadinessRecord | null
  stale: boolean
  currentContentHash: string | null
  warnings: string[]
}

export interface ArtifactRow {
  id: ArtifactId
  labelKey: "artifact.label.storyline" | "artifact.label.paper" | "artifact.label.relatedwork" | "artifact.label.cross_index" | "artifact.label.skills" | "artifact.label.checker_results"
  path: string
  status: ArtifactStatus
  confidence: ArtifactConfidence
  evidence: string[]
  warnings: string[]
  recommendation: ArtifactRecommendation
  metadata: Record<string, unknown>
  updatedAt: string | null
  recorded?: RecordedArtifactReadiness | null
}

export interface ArtifactSummary {
  total: number
  byStatus: Record<ArtifactStatus, number>
  readyOrPartial: number
  readyCount: number
  blockedCount: number
  staleCount: number
  recommendedFocus: ArtifactId | null
}

export interface ArtifactError {
  code: "root-detection-failed" | "path-not-file" | "read-failed" | "state-json-invalid"
  message: string
  path?: string
}

export interface ArtifactStatusResult {
  schemaVersion: typeof SCHEMA_VERSION
  readonly: true
  ok: boolean
  root: string | null
  locale: Locale
  localeFallback: boolean
  artifacts: ArtifactRow[]
  recordedArtifacts?: RecordedArtifactReadiness[]
  summary: ArtifactSummary
  recommendation: ArtifactRecommendation
  warnings: string[]
  errors: ArtifactError[]
}

export type ArtifactRecordErrorCode = "root-detection-failed" | "agent-not-authorized" | "missing-state" | "invalid-state" | "invalid-artifact" | "invalid-status" | "invalid-confidence" | "missing-evidence" | "missing-reason" | "write-failed" | "event-log-failed"

export interface ArtifactRecordError {
  code: ArtifactRecordErrorCode
  message: string
  path?: string
}

export interface ArtifactRecordOptions {
  root?: string
  cwd?: string
  worktree?: string
  locale?: string
  env?: Record<string, string | undefined>
  agent?: string
  artifact: ArtifactRecordId | string
  status: ArtifactStatus | string
  confidence: ArtifactConfidence | string
  evidence: string[]
  reason: string
  contentHash?: string
  now?: Date
}

export interface ArtifactRecordResult {
  schemaVersion: typeof SCHEMA_VERSION
  ok: boolean
  root: string | null
  locale: Locale
  localeFallback: boolean
  artifact: ArtifactRecordId | string | null
  previousRecord: ArtifactReadinessRecord | null
  record: ArtifactReadinessRecord | null
  stale: boolean
  currentContentHash: string | null
  eventAppended: boolean
  warnings: string[]
  errors: ArtifactRecordError[]
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
  artifactStatus: ArtifactStatusResult | null
  workflowStatus: WorkflowStatusResult | null
  workflowLog: WorkflowLogResult | null
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

export type PaperStructureStatus = "complete" | "partial" | "incomplete"
export type PaperStructureViolationSeverity = "error" | "warning"
export type PaperStructureViolationType = "body-under-structural-heading" | "heading-level-skip" | "level6-title-too-long" | "level6-body-too-long"
export type PaperStructureErrorCode = "root-detection-failed" | "missing-paper" | "invalid-paper" | "unsafe-path" | "read-failed"

export interface PaperStructureOptions {
  root?: string
  cwd?: string
  worktree?: string
  locale?: string
  env?: Record<string, string | undefined>
}

export interface PaperStructureHeading {
  line: number
  level: number
  title: string
  status: PaperStructureStatus
  level6Children: number
  descendantLevel5: number
}

export interface PaperStructureViolation {
  type: PaperStructureViolationType
  severity: PaperStructureViolationSeverity
  line: number
  message: string
  heading?: string
}

export interface PaperStructureSummary {
  total: number
  level5Total: number
  complete: number
  partial: number
  incomplete: number
  level5Complete: number
  level5Incomplete: number
  violationCount: number
}

export interface PaperStructureError {
  code: PaperStructureErrorCode
  message: string
  path?: string
}

export interface PaperStructureResult {
  schemaVersion: typeof SCHEMA_VERSION
  readonly: true
  ok: boolean
  root: string | null
  locale: Locale
  localeFallback: boolean
  path: string | null
  headings: PaperStructureHeading[]
  level5Targets: PaperStructureHeading[]
  nextTarget: PaperStructureHeading | null
  summary: PaperStructureSummary
  violations: PaperStructureViolation[]
  updatedAt: string | null
  warnings: string[]
  errors: PaperStructureError[]
}

export type StorylineStructureStatus = "filled" | "partial" | "empty"
export type StorylineStructureErrorCode = "root-detection-failed" | "missing-storyline" | "invalid-storyline" | "unsafe-path" | "read-failed"

export interface StorylineStructureOptions {
  root?: string
  cwd?: string
  worktree?: string
  locale?: string
  env?: Record<string, string | undefined>
}

export interface StorylineStructureSection {
  line: number
  title: string
  status: StorylineStructureStatus
  substantiveLines: number
  todoLines: number
}

export interface StorylineStructureSummary {
  total: number
  filled: number
  partial: number
  empty: number
}

export interface StorylineStructureError {
  code: StorylineStructureErrorCode
  message: string
  path?: string
}

export interface StorylineStructureResult {
  schemaVersion: typeof SCHEMA_VERSION
  readonly: true
  ok: boolean
  root: string | null
  locale: Locale
  localeFallback: boolean
  path: string | null
  sections: StorylineStructureSection[]
  nextSection: StorylineStructureSection | null
  summary: StorylineStructureSummary
  updatedAt: string | null
  warnings: string[]
  errors: StorylineStructureError[]
}

export type ImportExtractErrorCode = "root-detection-failed" | "missing-path" | "missing-file" | "invalid-file" | "unsafe-path" | "unsupported-format" | "file-too-large" | "read-failed"

export interface ImportExtractOptions {
  root?: string
  cwd?: string
  worktree?: string
  locale?: string
  env?: Record<string, string | undefined>
  path: string
  maxBytes?: number
  includeNotes?: boolean
}

export interface ImportExtractError {
  code: ImportExtractErrorCode
  message: string
  path?: string
}

export interface PdfExtractResult {
  schemaVersion: typeof SCHEMA_VERSION
  readonly: true
  ok: boolean
  root: string | null
  locale: Locale
  localeFallback: boolean
  path: string | null
  bytes: number
  sourceHash: string | null
  pageCount: number
  characters: number
  confidence: ArtifactConfidence
  text: string
  updatedAt: string | null
  warnings: string[]
  errors: ImportExtractError[]
}

export interface PptExtractSlide {
  slide: number
  title: string
  text: string
  notes?: string
}

export interface PptExtractResult {
  schemaVersion: typeof SCHEMA_VERSION
  readonly: true
  ok: boolean
  root: string | null
  locale: Locale
  localeFallback: boolean
  path: string | null
  bytes: number
  sourceHash: string | null
  slideCount: number
  characters: number
  slides: PptExtractSlide[]
  updatedAt: string | null
  warnings: string[]
  errors: ImportExtractError[]
}

export type CheckerRunStatus = "not_run" | "clean" | "issues_found" | "stale" | "unknown"
export type CheckerStatusErrorCode = "root-detection-failed" | "missing-state" | "invalid-state" | "missing-precheck-report" | "invalid-precheck-report" | "unsafe-path" | "read-failed"
export const CHECKER_RECORD_IDS = ["problem-checker", "novelty-checker", "technical-depth-checker", "logic-checker", "clarity-checker", "evaluation-protocol-checker", "data-checker"] as const
export const CHECKER_RECORD_STATUSES = ["clean", "issues_found", "unknown"] as const
export const CHECKER_ISSUE_SEVERITIES = ["Critical", "Major", "Minor"] as const
export type CheckerRecordId = typeof CHECKER_RECORD_IDS[number]
export type CheckerRecordStatus = typeof CHECKER_RECORD_STATUSES[number]
export type CheckerIssueSeverity = typeof CHECKER_ISSUE_SEVERITIES[number]

export interface CheckerStatusOptions {
  root?: string
  cwd?: string
  worktree?: string
  locale?: string
  env?: Record<string, string | undefined>
}

export interface CheckerStatusError {
  code: CheckerStatusErrorCode
  message: string
  path?: string
}

export interface CheckerStatusRow {
  id: string
  status: CheckerRunStatus
  updatedAt: string | null
  stale: boolean
  critical: number
  major: number
  minor: number
  total: number
  source: string | null
  summary: string | null
  warnings: string[]
}

export interface CheckerStatusPrecheckReport {
  present: boolean
  path: string
  updatedAt: string | null
  stale: boolean
  critical: number
  major: number
  minor: number
  warnings: string[]
}

export interface CheckerStatusSummary {
  total: number
  run: number
  missing: number
  stale: number
  clean: number
  issuesFound: number
  unknown: number
  critical: number
  major: number
  minor: number
  precheckPresent: boolean
}

export interface CheckerStatusResult {
  schemaVersion: typeof SCHEMA_VERSION
  readonly: true
  ok: boolean
  root: string | null
  locale: Locale
  localeFallback: boolean
  statePath: string | null
  paperUpdatedAt: string | null
  checkers: CheckerStatusRow[]
  summary: CheckerStatusSummary
  precheckReport: CheckerStatusPrecheckReport
  warnings: string[]
  errors: CheckerStatusError[]
}

export type CheckerRecordErrorCode = "root-detection-failed" | "agent-not-authorized" | "missing-state" | "invalid-state" | "invalid-checker" | "invalid-status" | "invalid-counts" | "missing-summary" | "missing-evidence" | "missing-reason" | "invalid-issues" | "write-failed" | "event-log-failed"

export interface CheckerRecordIssue {
  severity: CheckerIssueSeverity
  message: string
  location?: string
  suggestion?: string
  id?: string
}

export interface CheckerRecordData {
  status: CheckerRecordStatus
  updated_at: string
  critical: number
  major: number
  minor: number
  total: number
  summary: string
  evidence: string[]
  issues: CheckerRecordIssue[]
  provenance: {
    source: "opencode"
    operator: "user"
    reason: string
  }
  [key: string]: unknown
}

export interface CheckerRecordError {
  code: CheckerRecordErrorCode
  message: string
  path?: string
}

export interface CheckerRecordOptions {
  root?: string
  cwd?: string
  worktree?: string
  locale?: string
  env?: Record<string, string | undefined>
  agent?: string
  checker: CheckerRecordId | string
  status: CheckerRecordStatus | string
  critical: number
  major: number
  minor: number
  summary: string
  evidence: string[]
  reason: string
  issues?: CheckerRecordIssue[]
  now?: Date
}

export interface CheckerRecordResult {
  schemaVersion: typeof SCHEMA_VERSION
  ok: boolean
  root: string | null
  locale: Locale
  localeFallback: boolean
  checker: CheckerRecordId | string | null
  previousRecord: Record<string, unknown> | null
  record: CheckerRecordData | null
  eventAppended: boolean
  warnings: string[]
  errors: CheckerRecordError[]
}

export type WorkflowErrorCode = "missing-state" | "invalid-state" | "invalid-phase" | "invalid-status" | "missing-reason" | "root-detection-failed" | "write-failed" | "event-log-failed"

export interface WorkflowError {
  code: WorkflowErrorCode
  message: string
  path?: string
}

export interface WorkflowStateDocument {
  project?: Record<string, unknown>
  phases: Record<string, Record<string, unknown>>
  current_phase?: string
  event_log_path?: string
  workflow?: {
    phase_order?: string[]
    dependencies?: Record<string, string[]>
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface WorkflowPhaseRow {
  id: string
  status: string
  knownStatus: boolean
  completedAt: string | null
  fields: Record<string, unknown>
}

export interface WorkflowSummary {
  total: number
  byStatus: Record<WorkflowPhaseStatus, number> & { unknown: number }
}

export interface WorkflowMetadataSummary {
  available: boolean
  phaseOrder: string[]
  dependencies: Record<string, string[]>
}

export interface WorkflowRecommendation {
  id: "continue-current-phase" | "unavailable"
  messageKey: "workflow.recommendationContinue" | "workflow.recommendationUnavailable"
  phase: string | null
}

export interface WorkflowStatusResult {
  schemaVersion: typeof SCHEMA_VERSION
  readonly: true
  ok: boolean
  root: string | null
  locale: Locale
  localeFallback: boolean
  project: Record<string, unknown> | null
  currentPhase: string | null
  phases: WorkflowPhaseRow[]
  summary: WorkflowSummary
  metadata: WorkflowMetadataSummary
  recommendation: WorkflowRecommendation
  warnings: string[]
  errors: WorkflowError[]
}

export interface WorkflowEvent {
  timestamp: string | null
  phase: string | null
  operator: string | null
  action: string | null
  result: unknown
  fields: Record<string, unknown>
}

export interface WorkflowLogQueryOptions {
  root?: string
  cwd?: string
  worktree?: string
  locale?: string
  env?: Record<string, string | undefined>
  phase?: string
  operator?: WorkflowOperator | string
  lastN?: number
}

export interface WorkflowSetPhaseOptions {
  root?: string
  cwd?: string
  worktree?: string
  locale?: string
  env?: Record<string, string | undefined>
  phase: string
  status: WorkflowPhaseStatus | string
  reason?: string
  now?: Date
}

export interface WorkflowLogResult {
  schemaVersion: typeof SCHEMA_VERSION
  readonly: true
  ok: boolean
  root: string | null
  locale: Locale
  localeFallback: boolean
  logPath: string | null
  filters: {
    phase: string | null
    operator: string | null
    lastN: number
  }
  events: WorkflowEvent[]
  skippedMalformed: number
  warnings: string[]
  errors: WorkflowError[]
}

export interface WorkflowSetPhaseResult {
  schemaVersion: typeof SCHEMA_VERSION
  ok: boolean
  root: string | null
  locale: Locale
  localeFallback: boolean
  phase: string | null
  previousStatus: string | null
  nextStatus: WorkflowPhaseStatus | null
  previousCurrentPhase: string | null
  currentPhase: string | null
  eventAppended: boolean
  warnings: string[]
  errors: WorkflowError[]
}
