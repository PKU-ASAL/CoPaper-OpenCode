import { readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { parse, type ParseError } from "jsonc-parser"
import { isCoPaperAgentName, type CoPaperAgentName } from "./agent-profiles"
import { assertInsideRoot } from "./fs-utils"
import { isPermissionProfileName, type PermissionProfileName } from "./permission-profiles"
import { DEFAULT_LOCALE, SCHEMA_VERSION, SUPPORTED_LOCALES, type Locale } from "./types"

const CONFIG_RELATIVE_PATH = ".opencode/copaper.json"
const SUPPORTED_TOP_LEVEL_FIELDS = new Set(["$schema", "schemaVersion", "locale", "defaults", "agents"])
const SUPPORTED_DEFAULT_FIELDS = new Set(["model", "temperature"])
const SUPPORTED_AGENT_OVERRIDE_FIELDS = new Set(["enabled", "model", "temperature", "promptAppend", "permissionProfile"])

export type AgentDiagnosticSeverity = "info" | "warning" | "error"

export type AgentDiagnosticCode =
  | "config-missing"
  | "config-parse-failed"
  | "config-read-failed"
  | "unsupported-schema-version"
  | "unknown-agent"
  | "unknown-permission-profile"
  | "unsupported-field"
  | "invalid-field"
  | "agent-name-conflict"
  | "permission-escalation-denied"

export interface AgentDiagnostic {
  severity: AgentDiagnosticSeverity
  code: AgentDiagnosticCode
  message: string
  path?: string
  field?: string
}

export interface CoPaperConfigDefaults {
  model?: string
  temperature?: number
}

export interface CoPaperAgentOverride {
  enabled?: boolean
  model?: string
  temperature?: number
  promptAppend?: string
  permissionProfile?: PermissionProfileName
}

export interface CoPaperProjectConfig {
  schemaVersion: typeof SCHEMA_VERSION
  locale: Locale
  defaults: CoPaperConfigDefaults
  agents: Partial<Record<CoPaperAgentName, CoPaperAgentOverride>>
}

export interface CoPaperConfigLoadResult {
  path: string
  config: CoPaperProjectConfig
  diagnostics: AgentDiagnostic[]
}

export function loadCoPaperConfig(root: string): CoPaperConfigLoadResult {
  const absoluteRoot = resolve(root)
  const configPath = resolve(absoluteRoot, CONFIG_RELATIVE_PATH)
  assertInsideRoot(absoluteRoot, configPath)

  let text: string
  try {
    const stat = statSync(configPath)
    if (!stat.isFile()) {
      return withSafeConfig(configPath, [
        diagnostic("warning", "invalid-field", "Config path is not a file.", undefined),
      ])
    }
    text = readFileSync(configPath, "utf8")
  } catch (error) {
    if (isNotFoundError(error)) {
      return withSafeConfig(configPath, [
        diagnostic("info", "config-missing", "Project config is missing; defaults are used."),
      ])
    }
    return withSafeConfig(configPath, [
      diagnostic("warning", "config-read-failed", "Project config could not be read; defaults are used."),
    ])
  }

  const parseErrors: ParseError[] = []
  const parsed = parse(text, parseErrors, { allowTrailingComma: true }) as unknown
  if (parseErrors.length > 0) {
    return withSafeConfig(configPath, [
      diagnostic("warning", "config-parse-failed", "Project config could not be parsed; defaults are used."),
    ])
  }

  if (!isPlainObject(parsed)) {
    return withSafeConfig(configPath, [
      diagnostic("warning", "invalid-field", "Project config must be a JSON object.", undefined),
    ])
  }

  if (hasOwn(parsed, "schemaVersion") && parsed.schemaVersion !== SCHEMA_VERSION) {
    return withSafeConfig(configPath, [
      diagnostic("warning", "unsupported-schema-version", "Project config schema version is unsupported; defaults are used.", "schemaVersion"),
    ])
  }

  const diagnostics: AgentDiagnostic[] = []
  addUnsupportedFieldDiagnostics(parsed, SUPPORTED_TOP_LEVEL_FIELDS, diagnostics, undefined)

  return {
    path: configPath,
    config: {
      schemaVersion: SCHEMA_VERSION,
      locale: parseLocale(parsed.locale, diagnostics),
      defaults: parseDefaults(parsed.defaults, diagnostics),
      agents: parseAgents(parsed.agents, diagnostics),
    },
    diagnostics,
  }
}

function safeConfig(): CoPaperProjectConfig {
  return {
    schemaVersion: SCHEMA_VERSION,
    locale: DEFAULT_LOCALE,
    defaults: {},
    agents: {},
  }
}

function withSafeConfig(path: string, diagnostics: AgentDiagnostic[]): CoPaperConfigLoadResult {
  return {
    path,
    config: safeConfig(),
    diagnostics,
  }
}

function parseLocale(value: unknown, diagnostics: AgentDiagnostic[]): Locale {
  if (value === undefined) return DEFAULT_LOCALE
  if (typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale)) return value as Locale

  diagnostics.push(diagnostic("warning", "invalid-field", "Unsupported locale is ignored; default locale is used.", "locale"))
  return DEFAULT_LOCALE
}

function parseDefaults(value: unknown, diagnostics: AgentDiagnostic[]): CoPaperConfigDefaults {
  if (value === undefined) return {}
  if (!isPlainObject(value)) {
    diagnostics.push(diagnostic("warning", "invalid-field", "Defaults must be a JSON object and are ignored.", "defaults"))
    return {}
  }

  addUnsupportedFieldDiagnostics(value, SUPPORTED_DEFAULT_FIELDS, diagnostics, "defaults")

  const defaults: CoPaperConfigDefaults = {}
  if (hasOwn(value, "model")) {
    const model = parseNonEmptyString(value.model, "defaults.model", diagnostics)
    if (model !== undefined) defaults.model = model
  }
  if (hasOwn(value, "temperature")) {
    const temperature = parseTemperature(value.temperature, "defaults.temperature", diagnostics)
    if (temperature !== undefined) defaults.temperature = temperature
  }
  return defaults
}

function parseAgents(
  value: unknown,
  diagnostics: AgentDiagnostic[],
): Partial<Record<CoPaperAgentName, CoPaperAgentOverride>> {
  if (value === undefined) return {}
  if (!isPlainObject(value)) {
    diagnostics.push(diagnostic("warning", "invalid-field", "Agents must be a JSON object and are ignored.", "agents"))
    return {}
  }

  const agents: Partial<Record<CoPaperAgentName, CoPaperAgentOverride>> = {}
  for (const [agentName, rawOverride] of Object.entries(value)) {
    if (!isCoPaperAgentName(agentName)) {
      diagnostics.push(diagnostic("warning", "unknown-agent", `Unknown agent "${agentName}" is ignored.`, `agents.${agentName}`))
      continue
    }
    if (!isPlainObject(rawOverride)) {
      diagnostics.push(diagnostic("warning", "invalid-field", `Agent override for "${agentName}" must be a JSON object and is ignored.`, `agents.${agentName}`))
      continue
    }

    const override = parseAgentOverride(agentName, rawOverride, diagnostics)
    if (Object.keys(override).length > 0) agents[agentName] = override
  }
  return agents
}

function parseAgentOverride(
  agentName: CoPaperAgentName,
  value: Record<string, unknown>,
  diagnostics: AgentDiagnostic[],
): CoPaperAgentOverride {
  addUnsupportedFieldDiagnostics(value, SUPPORTED_AGENT_OVERRIDE_FIELDS, diagnostics, `agents.${agentName}`)

  const override: CoPaperAgentOverride = {}
  if (hasOwn(value, "enabled")) {
    if (typeof value.enabled === "boolean") {
      override.enabled = value.enabled
    } else {
      diagnostics.push(diagnostic("warning", "invalid-field", "Agent enabled must be a boolean and is ignored.", `agents.${agentName}.enabled`))
    }
  }
  if (hasOwn(value, "model")) {
    const model = parseNonEmptyString(value.model, `agents.${agentName}.model`, diagnostics)
    if (model !== undefined) override.model = model
  }
  if (hasOwn(value, "temperature")) {
    const temperature = parseTemperature(value.temperature, `agents.${agentName}.temperature`, diagnostics)
    if (temperature !== undefined) override.temperature = temperature
  }
  if (hasOwn(value, "promptAppend")) {
    const promptAppend = parseNonEmptyString(value.promptAppend, `agents.${agentName}.promptAppend`, diagnostics)
    if (promptAppend !== undefined) override.promptAppend = promptAppend
  }
  if (hasOwn(value, "permissionProfile")) {
    if (isPermissionProfileName(value.permissionProfile)) {
      override.permissionProfile = value.permissionProfile
    } else if (typeof value.permissionProfile === "string") {
      diagnostics.push(diagnostic("warning", "unknown-permission-profile", `Unknown permission profile "${value.permissionProfile}" is ignored.`, `agents.${agentName}.permissionProfile`))
    } else {
      diagnostics.push(diagnostic("warning", "invalid-field", "Permission profile must be a string and is ignored.", `agents.${agentName}.permissionProfile`))
    }
  }

  return override
}

function parseNonEmptyString(value: unknown, field: string, diagnostics: AgentDiagnostic[]): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.length > 0) return trimmed
  }

  diagnostics.push(diagnostic("warning", "invalid-field", `${field} must be a non-empty string and is ignored.`, field))
  return undefined
}

function parseTemperature(value: unknown, field: string, diagnostics: AgentDiagnostic[]): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 2) return value

  diagnostics.push(diagnostic("warning", "invalid-field", `${field} must be a finite number from 0 to 2 and is ignored.`, field))
  return undefined
}

function addUnsupportedFieldDiagnostics(
  value: Record<string, unknown>,
  supportedFields: Set<string>,
  diagnostics: AgentDiagnostic[],
  scope: string | undefined,
): void {
  for (const key of Object.keys(value)) {
    if (!supportedFields.has(key)) {
      const field = scope === undefined ? key : `${scope}.${key}`
      diagnostics.push(diagnostic("warning", "unsupported-field", `Unsupported field "${field}" is ignored.`, field))
    }
  }
}

function diagnostic(
  severity: AgentDiagnosticSeverity,
  code: AgentDiagnosticCode,
  message: string,
  field?: string,
): AgentDiagnostic {
  return {
    severity,
    code,
    message,
    path: CONFIG_RELATIVE_PATH,
    ...(field === undefined ? {} : { field }),
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function isNotFoundError(error: unknown): boolean {
  return isNodeError(error) && error.code === "ENOENT"
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error
}
