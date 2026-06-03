import type { CoPaperAgentRuntimeState } from "./agent-config"
import type { AgentDiagnostic } from "./copaper-config"
import type { DoctorCheck } from "./types"

const defaultRuntimeState: CoPaperAgentRuntimeState = { agents: [], diagnostics: [] }
const runtimeStateByRoot = new Map<string, CoPaperAgentRuntimeState>()
let latestRuntimeState: CoPaperAgentRuntimeState = defaultRuntimeState

export function setLatestCoPaperAgentRuntimeState(state: CoPaperAgentRuntimeState, root?: string): void {
  latestRuntimeState = state
  if (root !== undefined) runtimeStateByRoot.set(root, state)
}

export function getLatestCoPaperAgentRuntimeState(root?: string): CoPaperAgentRuntimeState {
  if (root !== undefined) return runtimeStateByRoot.get(root) ?? defaultRuntimeState
  return latestRuntimeState
}

export function agentRuntimeToDoctorChecks(state: CoPaperAgentRuntimeState): DoctorCheck[] {
  return [
    ...state.agents.map((agent): DoctorCheck => {
      if (agent.status === "injected") {
        return {
          id: `agents.${agent.name}`,
          status: "pass",
          severity: "info",
          message: `CoPaper agent "${agent.name}" is injected`,
          remediation: null,
        }
      }

      if (agent.status === "disabled") {
        return {
          id: `agents.${agent.name}`,
          status: "warn",
          severity: "warning",
          message: `CoPaper agent "${agent.name}" is disabled`,
          remediation: `Set agents.${agent.name}.enabled to true in .opencode/copaper.json`,
        }
      }

      return {
        id: `agents.${agent.name}`,
        status: "fail",
        severity: "warning",
        message: `CoPaper agent "${agent.name}" conflicts with an existing OpenCode agent`,
        remediation: `Rename the existing agent or disable agents.${agent.name} in .opencode/copaper.json`,
      }
    }),
    ...state.diagnostics.flatMap(diagnosticToDoctorCheck),
  ]
}

function diagnosticToDoctorCheck(diagnostic: AgentDiagnostic): DoctorCheck[] {
  if (diagnostic.code === "config-missing" || diagnostic.severity === "info") return []

  return [{
    id: diagnostic.field === undefined ? `agent-config.${diagnostic.code}` : `agent-config.${diagnostic.code}.${diagnostic.field}`,
    status: diagnostic.severity === "error" ? "fail" : "warn",
    severity: diagnostic.severity === "error" ? "error" : "warning",
    message: diagnostic.message,
    remediation: "Fix .opencode/copaper.json, then restart OpenCode",
  }]
}
