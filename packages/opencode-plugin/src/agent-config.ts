import {
  VIBEPAPER_AGENT_NAMES,
  buildDefaultAgentProfiles,
  type VibePaperAgentName,
  type VibePaperAgentProfile,
} from "./agent-profiles"
import {
  canUsePermissionProfile,
  getPermissionProfile,
  type OpenCodePermissionConfig,
  type PermissionProfileName,
} from "./permission-profiles"
import {
  loadVibePaperConfig,
  type AgentDiagnostic,
  type AgentDiagnosticCode,
  type AgentDiagnosticSeverity,
} from "./vibepaper-config"

const CONFIG_RELATIVE_PATH = ".opencode/vibepaper.json"

export type AgentRuntimeStatus = "injected" | "disabled" | "conflicted"

export interface OpenCodeAgentConfig {
  description: string
  mode: "subagent"
  model?: string
  temperature?: number
  prompt: string
  permission: OpenCodePermissionConfig
}

export interface VibePaperAgentRuntimeRow {
  name: VibePaperAgentName
  status: AgentRuntimeStatus
  description: string
  permissionProfile: PermissionProfileName
  model?: string
  temperature?: number
}

export interface VibePaperAgentRuntimeState {
  agents: VibePaperAgentRuntimeRow[]
  diagnostics: AgentDiagnostic[]
}

export interface VibePaperAgentConfigResult {
  injectedAgents: Partial<Record<VibePaperAgentName, OpenCodeAgentConfig>>
  runtime: VibePaperAgentRuntimeState
  diagnostics: AgentDiagnostic[]
}

interface BuildVibePaperAgentConfigInput {
  root: string
  existingAgents: Record<string, OpenCodeAgentConfig>
}

interface EffectiveAgentProfile {
  name: VibePaperAgentName
  enabled: boolean
  description: string
  mode: "subagent"
  model?: string
  temperature?: number
  prompt: string
  permissionProfile: PermissionProfileName
}

export function buildVibePaperAgentConfig({
  root,
  existingAgents,
}: BuildVibePaperAgentConfigInput): VibePaperAgentConfigResult {
  const loaded = loadVibePaperConfig(root)
  const profiles = buildDefaultAgentProfiles(loaded.config.locale)
  const mergeDiagnostics: AgentDiagnostic[] = []
  const injectedAgents: Partial<Record<VibePaperAgentName, OpenCodeAgentConfig>> = {}
  const runtimeAgents: VibePaperAgentRuntimeRow[] = []

  for (const agentName of VIBEPAPER_AGENT_NAMES) {
    const profile = profiles[agentName]
    const override = loaded.config.agents[agentName]
    const effectiveProfile = buildEffectiveProfile(profile, {
      model: loaded.config.defaults.model,
      temperature: loaded.config.defaults.temperature,
      enabled: override?.enabled,
      overrideModel: override?.model,
      overrideTemperature: override?.temperature,
      promptAppend: override?.promptAppend,
      requestedPermissionProfile: override?.permissionProfile,
      diagnostics: mergeDiagnostics,
    })

    if (!effectiveProfile.enabled) {
      runtimeAgents.push(toRuntimeRow(effectiveProfile, "disabled"))
      continue
    }

    if (Object.prototype.hasOwnProperty.call(existingAgents, agentName)) {
      mergeDiagnostics.push(agentConfigDiagnostic(
        "warning",
        "agent-name-conflict",
        `OpenCode agent "${agentName}" already exists; VibePaper injection is skipped.`,
        `agents.${agentName}`,
      ))
      runtimeAgents.push(toRuntimeRow(effectiveProfile, "conflicted"))
      continue
    }

    injectedAgents[agentName] = toOpenCodeAgentConfig(effectiveProfile)
    runtimeAgents.push(toRuntimeRow(effectiveProfile, "injected"))
  }

  const diagnostics = [...loaded.diagnostics, ...mergeDiagnostics]
  return {
    injectedAgents,
    runtime: {
      agents: runtimeAgents,
      diagnostics,
    },
    diagnostics,
  }
}

function buildEffectiveProfile(
  profile: VibePaperAgentProfile,
  options: {
    model?: string
    temperature?: number
    enabled?: boolean
    overrideModel?: string
    overrideTemperature?: number
    promptAppend?: string
    requestedPermissionProfile?: PermissionProfileName
    diagnostics: AgentDiagnostic[]
  },
): EffectiveAgentProfile {
  let permissionProfile = profile.permissionProfile
  const model = options.overrideModel ?? options.model

  if (options.requestedPermissionProfile !== undefined) {
    if (canUsePermissionProfile(profile.maxPermissionProfile, options.requestedPermissionProfile)) {
      permissionProfile = options.requestedPermissionProfile
    } else {
      options.diagnostics.push(agentConfigDiagnostic(
        "warning",
        "permission-escalation-denied",
        `Agent "${profile.name}" requested permission profile "${options.requestedPermissionProfile}" above maximum "${profile.maxPermissionProfile}"; default is used.`,
        `agents.${profile.name}.permissionProfile`,
      ))
    }
  }

  return {
    name: profile.name,
    enabled: options.enabled ?? profile.enabled,
    description: profile.description,
    mode: profile.mode,
    ...(model === undefined ? {} : { model }),
    temperature: options.overrideTemperature ?? options.temperature ?? temperatureFromHint(profile.temperatureHint),
    prompt: appendProjectPreferences(profile.prompt, options.promptAppend),
    permissionProfile,
  }
}

function toOpenCodeAgentConfig(profile: EffectiveAgentProfile): OpenCodeAgentConfig {
  return {
    description: profile.description,
    mode: profile.mode,
    ...(profile.model === undefined ? {} : { model: profile.model }),
    ...(profile.temperature === undefined ? {} : { temperature: profile.temperature }),
    prompt: profile.prompt,
    permission: getPermissionProfile(profile.permissionProfile),
  }
}

function toRuntimeRow(
  profile: EffectiveAgentProfile,
  status: AgentRuntimeStatus,
): VibePaperAgentRuntimeRow {
  return {
    name: profile.name,
    status,
    description: profile.description,
    permissionProfile: profile.permissionProfile,
    ...(profile.model === undefined ? {} : { model: profile.model }),
    ...(profile.temperature === undefined ? {} : { temperature: profile.temperature }),
  }
}

function appendProjectPreferences(prompt: string, promptAppend: string | undefined): string {
  if (promptAppend === undefined) return prompt

  return [
    prompt,
    "",
    "## Project-specific preferences",
    promptAppend,
  ].join("\n")
}

function temperatureFromHint(hint: VibePaperAgentProfile["temperatureHint"]): number {
  switch (hint) {
    case "low":
      return 0.2
    case "medium-low":
      return 0.4
    case "medium":
      return 0.7
  }
}

function agentConfigDiagnostic(
  severity: AgentDiagnosticSeverity,
  code: AgentDiagnosticCode,
  message: string,
  field: string,
): AgentDiagnostic {
  return {
    severity,
    code,
    message,
    path: CONFIG_RELATIVE_PATH,
    field,
  }
}
