import { existsSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { parse, type ParseError } from "jsonc-parser"
import { assertInsideRoot } from "./fs-utils"
import { detectRoot } from "./root"
import { hasManagedMarker } from "./templates"
import { t } from "./i18n"
import { BUNX_CLI_COMMAND, DEFAULT_LOCALE, isVibePaperPluginSpecifier, PACKAGE_NAME, SCHEMA_VERSION, type DoctorCheck, type DoctorResult, type Locale } from "./types"

const INIT_REMEDIATION = `Run: ${BUNX_CLI_COMMAND} init`

export interface DoctorOptions {
  root?: string
  cwd?: string
  config?: string
  worktree?: string
  packageVersion: string
}

export async function runDoctor(options: DoctorOptions): Promise<DoctorResult> {
  const detection = await detectRoot({ cwd: options.cwd ?? process.cwd(), explicitRoot: options.root, worktree: options.worktree })
  const root = detection.root
  const checks: DoctorCheck[] = []
  checks.push({ id: "root.detected", status: "pass", severity: "error", message: `Root detected: ${root}`, remediation: null })

  const configSelection = selectConfigPath(root, options.config)
  if (!configSelection.ok) {
    addUnavailableConfigChecks(checks, configSelection.message, configSelection.remediation)
  } else {
    const configPath = configSelection.path
    checks.push({ id: "config.present", status: "pass", severity: "error", message: `${configPath} found`, remediation: null })
    const configRead = readTextFile(configPath)
    if (!configRead.ok && configRead.missing) {
      checks.pop()
      addUnavailableConfigChecks(checks, "OpenCode config not found")
    } else if (!configRead.ok) {
      checks.push({ id: "config.parse", status: "fail", severity: "error", message: `Failed to read ${configPath}: ${configRead.error}`, remediation: "Replace it with a readable OpenCode config file, then rerun doctor" })
      checks.push({ id: "plugin.configured", status: "fail", severity: "error", message: `${PACKAGE_NAME} cannot be verified`, remediation: "Fix the config file" })
    } else {
      const errors: ParseError[] = []
      const parsedConfig = parse(configRead.content, errors, { allowTrailingComma: true, disallowComments: false }) as Record<string, unknown> | null
      if (errors.length > 0 || !parsedConfig || typeof parsedConfig !== "object" || Array.isArray(parsedConfig)) {
        checks.push({ id: "config.parse", status: "fail", severity: "error", message: `Failed to parse ${configPath}`, remediation: "Fix the config file syntax, then rerun doctor" })
        checks.push({ id: "plugin.configured", status: "fail", severity: "error", message: `${PACKAGE_NAME} cannot be verified`, remediation: "Fix the config file syntax" })
      } else {
        checks.push({ id: "config.parse", status: "pass", severity: "error", message: "OpenCode config parsed successfully", remediation: null })
        const plugins = parsedConfig.plugin
        const configured = Array.isArray(plugins) && plugins.some(isVibePaperPluginSpecifier)
        checks.push({ id: "plugin.configured", status: configured ? "pass" : "fail", severity: "error", message: configured ? `${PACKAGE_NAME} is listed in plugin config` : `${PACKAGE_NAME} not found in plugin config`, remediation: configured ? null : INIT_REMEDIATION })
      }
    }
  }

  addCommandChecks(root, checks, "vibe")
  addCommandChecks(root, checks, "vibe-doctor")
  const ok = checks.every((check) => !(check.severity === "error" && check.status === "fail"))
  return { schemaVersion: SCHEMA_VERSION, ok, root, rootReason: detection.reason, packageVersion: options.packageVersion, checks, nextSteps: ok ? ["Restart OpenCode if you just installed, then run /vibe"] : [INIT_REMEDIATION, "Restart OpenCode, then run /vibe-doctor"] }
}

export function renderDoctorJson(result: DoctorResult): string {
  return JSON.stringify(result, null, 2)
}

export function renderDoctorMarkdown(result: DoctorResult, locale: Locale = DEFAULT_LOCALE): string {
  const rows = result.checks.map((check) => `| ${check.id} | ${localizedStatus(locale, check.status)} | ${escapePipes(check.message)} |`).join("\n")
  return `## ${t(locale, "doctor.title", { version: result.packageVersion })}

**${t(locale, "doctor.root", { root: result.root ?? "unknown", reason: result.rootReason })}**

| ${t(locale, "table.check")} | ${t(locale, "table.status")} | ${t(locale, "table.message")} |
|---|---|---|
${rows}

**${t(locale, "doctor.next", { step: result.nextSteps[0] ?? "No action required" })}**
`
}

export function renderDoctorText(result: DoctorResult, locale: Locale = DEFAULT_LOCALE): string {
  const lines = [t(locale, "doctor.title", { version: result.packageVersion }), t(locale, "doctor.root", { root: result.root ?? "unknown", reason: result.rootReason }), ""]
  for (const check of result.checks) {
    const glyph = check.status === "pass" ? "✓" : check.status === "fail" ? "✗" : check.status === "warn" ? "!" : "i"
    lines.push(`${glyph} ${check.id.padEnd(32)} ${check.message}`)
    if (check.remediation) lines.push(`  → ${check.remediation}`)
  }
  lines.push("", result.ok ? t(locale, "doctor.allPassed") : t(locale, "doctor.failed"))
  lines.push(...result.nextSteps.map((step) => t(locale, "doctor.next", { step })))
  return `${lines.join("\n")}\n`
}

function localizedStatus(locale: Locale, status: DoctorCheck["status"]): string {
  return t(locale, `status.${status}`)
}

function selectExistingConfig(root: string): { ok: true; path: string } | { ok: false; message: string; remediation?: string } {
  const json = join(root, "opencode.json")
  const jsonc = join(root, "opencode.jsonc")
  const hasJson = existsSync(json)
  const hasJsonc = existsSync(jsonc)
  if (hasJson && hasJsonc) {
    return {
      ok: false,
      message: "OpenCode config is ambiguous: both opencode.json and opencode.jsonc exist",
      remediation: "Pass --config opencode.json or --config opencode.jsonc, or remove one file",
    }
  }
  if (hasJson) return { ok: true, path: json }
  if (hasJsonc) return { ok: true, path: jsonc }
  return { ok: false, message: "OpenCode config not found" }
}

function selectConfigPath(root: string, explicitConfig?: string): { ok: true; path: string } | { ok: false; message: string; remediation?: string } {
  if (!explicitConfig) {
    return selectExistingConfig(root)
  }
  const path = resolve(root, explicitConfig)
  try {
    assertInsideRoot(root, path)
    return { ok: true, path }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, message }
  }
}

function addUnavailableConfigChecks(checks: DoctorCheck[], message: string, remediation = INIT_REMEDIATION) {
  checks.push({ id: "config.present", status: "fail", severity: "error", message, remediation })
  checks.push({ id: "config.parse", status: "fail", severity: "error", message: `OpenCode config cannot be parsed: ${message}`, remediation })
  checks.push({ id: "plugin.configured", status: "fail", severity: "error", message: `${PACKAGE_NAME} is not configured`, remediation })
}

function addCommandChecks(root: string, checks: DoctorCheck[], command: "vibe" | "vibe-doctor") {
  const path = join(root, ".opencode", "commands", `${command}.md`)
  const presentId = command === "vibe" ? "commands.vibe.present" : "commands.vibe-doctor.present"
  const managedId = command === "vibe" ? "commands.vibe.managed" : "commands.vibe-doctor.managed"
  const severity = command === "vibe" ? "error" : "warning"
  if (!existsSync(path)) {
    checks.push({ id: presentId, status: "fail", severity, message: `${path} not found`, remediation: INIT_REMEDIATION })
    checks.push({ id: managedId, status: "warn", severity: "warning", message: `${command} command marker missing because command file is missing`, remediation: INIT_REMEDIATION })
    return
  }
  const commandRead = readTextFile(path)
  if (!commandRead.ok) {
    checks.push({ id: presentId, status: "fail", severity, message: `${path} is not a readable file: ${commandRead.error}`, remediation: INIT_REMEDIATION })
    checks.push({ id: managedId, status: "warn", severity: "warning", message: `${command} command marker cannot be verified`, remediation: INIT_REMEDIATION })
    return
  }
  const content = commandRead.content
  checks.push({ id: presentId, status: "pass", severity, message: `${path} exists`, remediation: null })
  const managed = hasManagedMarker(content, command)
  checks.push({ id: managedId, status: managed ? "pass" : "warn", severity: "warning", message: managed ? `${command} command is VibePaper-managed` : `${command} command exists but is not VibePaper-managed`, remediation: managed ? null : "Review the command file or rerun init with --force" })
}

function readTextFile(path: string): { ok: true; content: string } | { ok: false; error: string; missing: boolean } {
  try {
    if (!statSync(path).isFile()) return { ok: false, error: `${path} is not a file`, missing: false }
    return { ok: true, content: readFileSync(path, "utf8") }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : ""
    return { ok: false, error: message, missing: code === "ENOENT" }
  }
}

function escapePipes(input: string): string {
  return input.replace(/\|/g, "\\|")
}
