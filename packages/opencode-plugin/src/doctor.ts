import { existsSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { parse, type ParseError } from "jsonc-parser"
import { assertInsideRoot } from "./fs-utils"
import { detectRoot } from "./root"
import { hasManagedMarker } from "./templates"
import { PACKAGE_NAME, SCHEMA_VERSION, type DoctorCheck, type DoctorResult } from "./types"

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
    addUnavailableConfigChecks(checks, configSelection.message)
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
        const configured = Array.isArray(plugins) && plugins.includes(PACKAGE_NAME)
        checks.push({ id: "plugin.configured", status: configured ? "pass" : "fail", severity: "error", message: configured ? `${PACKAGE_NAME} is listed in plugin config` : `${PACKAGE_NAME} not found in plugin config`, remediation: configured ? null : "Run: bunx @vibepaper/opencode init" })
      }
    }
  }

  addCommandChecks(root, checks, "vibe")
  addCommandChecks(root, checks, "vibe-doctor")
  const ok = checks.every((check) => !(check.severity === "error" && check.status === "fail"))
  return { schemaVersion: SCHEMA_VERSION, ok, root, rootReason: detection.reason, packageVersion: options.packageVersion, checks, nextSteps: ok ? ["Restart OpenCode if you just installed, then run /vibe"] : ["Run: bunx @vibepaper/opencode init", "Restart OpenCode, then run /vibe-doctor"] }
}

export function renderDoctorJson(result: DoctorResult): string {
  return JSON.stringify(result, null, 2)
}

export function renderDoctorMarkdown(result: DoctorResult): string {
  const rows = result.checks.map((check) => `| ${check.id} | ${check.status} | ${escapePipes(check.message)} |`).join("\n")
  return `## VibePaper Doctor v${result.packageVersion}

**Root:** \`${result.root ?? "unknown"}\` (${result.rootReason})

| Check | Status | Message |
|---|---|---|
${rows}

**Next step:** ${result.nextSteps[0] ?? "No action required"}
`
}

export function renderDoctorText(result: DoctorResult): string {
  const lines = [`VibePaper OpenCode Doctor v${result.packageVersion}`, `Root: ${result.root ?? "unknown"} (${result.rootReason})`, ""]
  for (const check of result.checks) {
    const glyph = check.status === "pass" ? "✓" : check.status === "fail" ? "✗" : check.status === "warn" ? "!" : "i"
    lines.push(`${glyph} ${check.id.padEnd(32)} ${check.message}`)
    if (check.remediation) lines.push(`  → ${check.remediation}`)
  }
  lines.push("", result.ok ? "All required checks passed." : "One or more required checks failed.")
  lines.push(...result.nextSteps.map((step) => `Next: ${step}`))
  return `${lines.join("\n")}\n`
}

function selectExistingConfig(root: string): string | null {
  const json = join(root, "opencode.json")
  const jsonc = join(root, "opencode.jsonc")
  if (existsSync(json)) return json
  if (existsSync(jsonc)) return jsonc
  return null
}

function selectConfigPath(root: string, explicitConfig?: string): { ok: true; path: string } | { ok: false; message: string } {
  if (!explicitConfig) {
    const path = selectExistingConfig(root)
    return path ? { ok: true, path } : { ok: false, message: "OpenCode config not found" }
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

function addUnavailableConfigChecks(checks: DoctorCheck[], message: string) {
  checks.push({ id: "config.present", status: "fail", severity: "error", message, remediation: "Run: bunx @vibepaper/opencode init" })
  checks.push({ id: "config.parse", status: "fail", severity: "error", message: "OpenCode config cannot be parsed because it is unavailable", remediation: "Run: bunx @vibepaper/opencode init" })
  checks.push({ id: "plugin.configured", status: "fail", severity: "error", message: `${PACKAGE_NAME} is not configured`, remediation: "Run: bunx @vibepaper/opencode init" })
}

function addCommandChecks(root: string, checks: DoctorCheck[], command: "vibe" | "vibe-doctor") {
  const path = join(root, ".opencode", "commands", `${command}.md`)
  const presentId = command === "vibe" ? "commands.vibe.present" : "commands.vibe-doctor.present"
  const managedId = command === "vibe" ? "commands.vibe.managed" : "commands.vibe-doctor.managed"
  const severity = command === "vibe" ? "error" : "warning"
  if (!existsSync(path)) {
    checks.push({ id: presentId, status: "fail", severity, message: `${path} not found`, remediation: "Run: bunx @vibepaper/opencode init" })
    checks.push({ id: managedId, status: "warn", severity: "warning", message: `${command} command marker missing because command file is missing`, remediation: "Run: bunx @vibepaper/opencode init" })
    return
  }
  const commandRead = readTextFile(path)
  if (!commandRead.ok) {
    checks.push({ id: presentId, status: "fail", severity, message: `${path} is not a readable file: ${commandRead.error}`, remediation: "Run: bunx @vibepaper/opencode init" })
    checks.push({ id: managedId, status: "warn", severity: "warning", message: `${command} command marker cannot be verified`, remediation: "Run: bunx @vibepaper/opencode init" })
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
