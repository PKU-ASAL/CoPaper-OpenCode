import { runDoctor } from "./doctor"
import { buildInitPreview } from "./init-preview"
import { resolveLocale, t } from "./i18n"
import { inspectReadiness } from "./readiness"
import { BUNX_CLI_COMMAND, SCHEMA_VERSION, type DashboardInstallation, type DashboardRecommendation, type DashboardResult, type InitPreviewItem, type Locale, type ReadinessItem, type ReadinessSummary } from "./types"

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
  }
}

export function renderDashboardOutput(result: DashboardResult): string {
  const locale = result.locale
  const dashboardStatus = result.ok ? t(locale, "dashboard.statusReady") : result.readiness?.status === "blocked" ? t(locale, "dashboard.statusBlocked") : t(locale, "dashboard.statusNeedsInit")
  const readinessRows = result.readiness ? result.readiness.items.map((item) => renderReadinessRow(locale, item)).join("\n") : `| integration | ${t(locale, "status.fail")} | ${escapePipes(t(locale, "dashboard.noPreview"))} |`
  const previewRows = result.initPreview.items.length > 0 ? result.initPreview.items.map((item) => renderPreviewRow(locale, item)).join("\n") : `| - | - | ${escapePipes(t(locale, "dashboard.noPreview"))} |`

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

### ${t(locale, "dashboard.nextStep")}

${t(locale, result.recommendation.messageKey)}${result.recommendation.command ? `\n\n\`${result.recommendation.command}\`` : ""}

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
    vibeCommandPresent: check("commands.vibe.present"),
    vibeDoctorCommandPresent: check("commands.vibe-doctor.present"),
    vibeCommandManaged: check("commands.vibe.managed"),
    vibeDoctorCommandManaged: check("commands.vibe-doctor.managed"),
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

function escapePipes(input: string): string {
  return input.replace(/\|/g, "\\|")
}
