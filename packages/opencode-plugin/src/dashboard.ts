import { buildArtifactStatus } from "./artifacts"
import { runDoctor } from "./doctor"
import { buildInitPreview } from "./init-preview"
import { resolveLocale, t } from "./i18n"
import { inspectReadiness } from "./readiness"
import { BUNX_CLI_COMMAND, SCHEMA_VERSION, type ArtifactRow, type DashboardInstallation, type DashboardRecommendation, type DashboardResult, type InitPreviewItem, type Locale, type ReadinessItem, type ReadinessSummary, type WorkflowEvent, type WorkflowPhaseRow } from "./types"
import { buildWorkflowStatus, queryWorkflowLog } from "./workflow"

export interface DashboardOptions {
  root?: string
  cwd?: string
  worktree?: string
  packageVersion: string
  locale?: string
  env?: Record<string, string | undefined>
}

export async function buildDashboardResult(options: DashboardOptions): Promise<DashboardResult> {
  const resolved = resolveLocale(options.locale, options.env)
  const doctor = await runDoctor(options)
  const integration = integrationFromDoctor(doctor.checks)
  const healthyIntegration = doctor.ok
  const readiness = healthyIntegration && doctor.root ? inspectReadiness(doctor.root) : null
  const initPreview = readiness ? buildInitPreview(readiness) : { readonly: true as const, blocked: true, items: [] }
  const recommendation = chooseRecommendation(healthyIntegration, readiness?.ok ?? false)
  const readyRoot = healthyIntegration && (readiness?.ok ?? false) && doctor.root ? doctor.root : null
  let artifactStatus: DashboardResult["artifactStatus"] = null
  let workflowStatus: DashboardResult["workflowStatus"] = null
  let workflowLog: DashboardResult["workflowLog"] = null
  if (readyRoot) {
    artifactStatus = await buildArtifactStatus({ root: readyRoot, locale: resolved.locale, env: options.env })
    const statusResult = await buildWorkflowStatus({ root: readyRoot, locale: resolved.locale, env: options.env })
    workflowStatus = statusResult
    if (statusResult.ok) {
      const logResult = await queryWorkflowLog({ root: readyRoot, locale: resolved.locale, env: options.env, lastN: 5 })
      workflowLog = logResult
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    ok: healthyIntegration && (readiness?.ok ?? false),
    root: doctor.root,
    packageVersion: doctor.packageVersion,
    locale: resolved.locale,
    localeFallback: resolved.fallback,
    integration,
    readiness,
    initPreview,
    recommendation,
    artifactStatus,
    workflowStatus,
    workflowLog,
  }
}

export function renderDashboardOutput(result: DashboardResult): string {
  const locale = result.locale
  const dashboardStatus = result.ok ? t(locale, "dashboard.statusReady") : result.readiness?.status === "blocked" ? t(locale, "dashboard.statusBlocked") : t(locale, "dashboard.statusNeedsInit")
  const readinessRows = result.readiness ? result.readiness.items.map((item) => renderReadinessRow(locale, item)).join("\n") : `| integration | ${t(locale, "status.fail")} | ${escapePipes(t(locale, "dashboard.noPreview"))} |`
  const previewRows = result.initPreview.items.length > 0 ? result.initPreview.items.map((item) => renderPreviewRow(locale, item)).join("\n") : `| - | - | ${escapePipes(t(locale, "dashboard.noPreview"))} |`
  const artifactSection = renderArtifactSection(locale, result)
  const workflowSection = renderWorkflowSection(locale, result)

  return `## ${t(locale, "dashboard.title")}

**${t(locale, "dashboard.statusLabel")}** ${dashboardStatus}
**${t(locale, "dashboard.version", { version: result.packageVersion })}**
**${t(locale, "dashboard.root", { root: result.root ?? "unknown" })}**

### ${t(locale, "dashboard.readiness")}

${result.readiness ? renderReadinessSummary(locale, result.readiness.summary) : t(locale, "dashboard.noPreview")}

### ${t(locale, "dashboard.checklist")}

| ${t(locale, "table.check")} | ${t(locale, "table.status")} | ${t(locale, "table.message")} |
|---|---|---|
${readinessRows}

${artifactSection ? `${artifactSection}\n` : ""}
### ${t(locale, "dashboard.nextStep")}

${t(locale, result.recommendation.messageKey)}${result.recommendation.command ? `\n\n\`${result.recommendation.command}\`` : ""}

${workflowSection ? `${workflowSection}\n` : ""}
### ${t(locale, "dashboard.initPreview")}

| ${t(locale, "table.path")} | ${t(locale, "table.action")} | ${t(locale, "table.reason")} |
|---|---|---|
${previewRows}

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
`
}

function integrationFromDoctor(checks: { id: string; status: string }[]): DashboardInstallation {
  const check = (id: string) => checks.find((item) => item.id === id)?.status === "pass"
  return {
    configPresent: check("config.present"),
    configParseable: check("config.parse"),
    pluginConfigured: check("plugin.configured"),
    copaperCommandPresent: check("commands.copaper.present"),
    copaperDoctorCommandPresent: check("commands.copaper-doctor.present"),
    copaperCommandManaged: check("commands.copaper.managed"),
    copaperDoctorCommandManaged: check("commands.copaper-doctor.managed"),
  }
}

function chooseRecommendation(healthyIntegration: boolean, ready: boolean): DashboardRecommendation {
  if (!healthyIntegration) return { id: "repair-installation", messageKey: "recommendation.repairInstallation", command: `${BUNX_CLI_COMMAND} init` }
  if (ready) return { id: "continue-workflow", messageKey: "recommendation.ready", command: null }
  return { id: "preview-init", messageKey: "recommendation.previewInit", command: null }
}

function renderReadinessRow(locale: Locale, item: ReadinessItem): string {
  return `| ${item.path} | ${t(locale, `status.${item.status}`)} | ${escapePipes(item.message)} |`
}

function renderReadinessSummary(locale: Locale, summary: ReadinessSummary): string {
  return [
    `${t(locale, "summary.ready")}=${summary.ready}`,
    `${t(locale, "summary.missing")}=${summary.missing}`,
    `${t(locale, "summary.conflict")}=${summary.conflict}`,
    `${t(locale, "summary.invalid")}=${summary.invalid}`,
    `${t(locale, "summary.optional")}=${summary.optional}`,
  ].join("; ")
}

function renderPreviewRow(locale: Locale, item: InitPreviewItem): string {
  return `| ${item.path} | ${t(locale, `action.${item.action}`)} | ${t(locale, `reason.${item.reason}`)} |`
}

function renderArtifactSection(locale: Locale, result: DashboardResult): string {
  if (!result.artifactStatus?.ok) return ""

  const none = t(locale, "artifact.none")
  const rows = result.artifactStatus.artifacts.length > 0 ? result.artifactStatus.artifacts.map((artifact) => renderArtifactRow(locale, artifact)).join("\n") : `| ${none} | ${none} | ${none} | ${none} | ${none} | ${none} | ${none} |`

  return `### ${t(locale, "dashboard.artifacts")}

| ${t(locale, "artifact.artifact")} | ${t(locale, "artifact.artifactStatus")} | ${t(locale, "artifact.confidence")} | ${t(locale, "artifact.recordedStatus")} | ${t(locale, "artifact.recordedFreshness")} | ${t(locale, "artifact.evidence")} | ${t(locale, "artifact.recommendation")} |
|---|---|---|---|---|---|---|
${rows}`
}

function renderArtifactRow(locale: Locale, artifact: ArtifactRow): string {
  const none = t(locale, "artifact.none")
  const recordedStatus = artifact.recorded?.record?.status ?? t(locale, "artifact.recordedMissing")
  const recordedFreshness = artifact.recorded?.record ? artifact.recorded.stale ? t(locale, "artifact.staleRecorded") : t(locale, "artifact.fresh") : none
  const evidence = [...artifact.evidence, ...artifact.warnings].join(", ") || none
  return `| ${escapePipes(artifact.id)} | ${escapePipes(artifact.status)} | ${escapePipes(artifact.confidence)} | ${escapePipes(recordedStatus)} | ${escapePipes(recordedFreshness)} | ${escapePipes(evidence)} | ${escapePipes(t(locale, artifact.recommendation.messageKey))} |`
}

function renderWorkflowSection(locale: Locale, result: DashboardResult): string {
  if (!result.workflowStatus || !result.workflowLog) return ""
  if (!result.workflowStatus.ok || !result.workflowLog.ok) return ""

  const none = t(locale, "workflow.none")
  const phaseRows = result.workflowStatus.phases.length > 0 ? result.workflowStatus.phases.map((phase) => renderWorkflowPhaseRow(locale, phase)).join("\n") : `| ${none} | ${none} | ${none} |`
  const eventRows = result.workflowLog.events.length > 0 ? result.workflowLog.events.map((event) => renderWorkflowEventRow(locale, event)).join("\n") : `| ${none} | ${none} | ${none} | ${none} | ${none} |`

  return `### ${t(locale, "dashboard.workflow")}

**${t(locale, "workflow.currentPhase")}:** ${result.workflowStatus.currentPhase ?? none}

| ${t(locale, "workflow.phase")} | ${t(locale, "workflow.phaseStatus")} | ${t(locale, "workflow.completedAt")} |
|---|---|---|
${phaseRows}

#### ${t(locale, "dashboard.recentEvents")}

| ${t(locale, "workflow.timestamp")} | ${t(locale, "workflow.phase")} | ${t(locale, "workflow.operator")} | ${t(locale, "workflow.action")} | ${t(locale, "workflow.result")} |
|---|---|---|---|---|
${eventRows}`
}

function renderWorkflowPhaseRow(locale: Locale, phase: WorkflowPhaseRow): string {
  return `| ${escapePipes(phase.id)} | ${escapePipes(phase.status)} | ${escapePipes(phase.completedAt ?? t(locale, "workflow.none"))} |`
}

function renderWorkflowEventRow(locale: Locale, event: WorkflowEvent): string {
  return `| ${formatWorkflowValue(locale, event.timestamp)} | ${formatWorkflowValue(locale, event.phase)} | ${formatWorkflowValue(locale, event.operator)} | ${formatWorkflowValue(locale, event.action)} | ${formatWorkflowValue(locale, event.result)} |`
}

function formatWorkflowValue(locale: Locale, value: unknown): string {
  if (value === null || value === undefined || value === "") return t(locale, "workflow.none")
  if (typeof value === "string") return escapePipes(value)
  return escapePipes(JSON.stringify(value))
}

function escapePipes(input: string): string {
  return input.replace(/\|/g, "\\|")
}
