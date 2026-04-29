import { runDoctor } from "./doctor"
import { SCHEMA_VERSION, type DashboardResult } from "./types"

export interface DashboardOptions {
  root?: string
  cwd?: string
  worktree?: string
  packageVersion: string
}

export async function buildDashboardResult(options: DashboardOptions): Promise<DashboardResult> {
  const doctor = await runDoctor(options)
  const check = (id: string) => doctor.checks.find((item) => item.id === id)?.status === "pass"
  return {
    schemaVersion: SCHEMA_VERSION,
    ok: doctor.ok,
    root: doctor.root,
    packageVersion: doctor.packageVersion,
    installation: {
      configPresent: check("config.present"),
      configParseable: check("config.parse"),
      pluginConfigured: check("plugin.configured"),
      vibeCommandPresent: check("commands.vibe.present"),
      vibeDoctorCommandPresent: check("commands.vibe-doctor.present"),
      vibeCommandManaged: check("commands.vibe.managed"),
      vibeDoctorCommandManaged: check("commands.vibe-doctor.managed"),
    },
    recommendations: doctor.nextSteps,
  }
}

export function renderDashboardOutput(result: DashboardResult): string {
  const status = result.ok ? "installed" : "incomplete installation"
  const rows = [
    ["OpenCode config", result.installation.configPresent && result.installation.configParseable],
    ["Plugin configured", result.installation.pluginConfigured],
    ["/vibe command", result.installation.vibeCommandPresent && result.installation.vibeCommandManaged],
    ["/vibe-doctor command", result.installation.vibeDoctorCommandPresent && result.installation.vibeDoctorCommandManaged],
  ].map(([label, ok]) => `| ${label} | ${ok ? "pass" : "fail"} |`).join("\n")

  return `## VibePaper Dashboard

**Status:** ${status}
**Version:** ${result.packageVersion}
**Root:** ${result.root ?? "unknown"}

| Check | Status |
|---|---|
${rows}

**Next step:** ${result.recommendations[0] ?? "No action required"}

\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`
`
}
