import type { PermissionProfileName } from "./permission-profiles"
import { DEFAULT_LOCALE, type Locale } from "./types"

export const COPAPER_AGENT_NAMES = [
  "copaper-coordinator",
  "copaper-storyline",
  "copaper-writer",
  "copaper-reviewer",
  "copaper-recorder",
  "copaper-literature",
] as const

export type CoPaperAgentName = (typeof COPAPER_AGENT_NAMES)[number]

export interface CoPaperAgentProfile {
  name: CoPaperAgentName
  enabled: true
  mode: "subagent"
  description: string
  prompt: string
  temperatureHint: "low" | "medium-low" | "medium"
  permissionProfile: PermissionProfileName
  maxPermissionProfile: PermissionProfileName
}

type CoPaperAgentProfiles = Record<CoPaperAgentName, CoPaperAgentProfile>
type CoPaperAgentProfileInput = Omit<CoPaperAgentProfile, "enabled" | "mode">

export function isCoPaperAgentName(value: unknown): value is CoPaperAgentName {
  return typeof value === "string" && COPAPER_AGENT_NAMES.includes(value as CoPaperAgentName)
}

export function buildDefaultAgentProfiles(locale: Locale = DEFAULT_LOCALE): CoPaperAgentProfiles {
  return {
    "copaper-coordinator": buildProfile({
      name: "copaper-coordinator",
      description: "Coordinates CoPaper work with read-only project awareness.",
      temperatureHint: "low",
      permissionProfile: "readOnly",
      maxPermissionProfile: "readOnly",
      prompt: buildPrompt(
        locale,
        "Coordinate CoPaper work by reading project artifacts, clarifying scope, and keeping subagent roles separate.",
        "Read storyline.md, paper.md, writingrules.md, and readiness state only when needed. Do not edit project artifacts.",
        "Keep work phase-aware, preserve user intent, and ask for explicit direction before requesting artifact changes.",
        "Use only read-oriented tools granted by this profile. Do not change files or invoke unrelated operations.",
        "Summarize the needed next role and pass only the relevant artifact context to the user or selected subagent.",
      ),
    }),
    "copaper-storyline": buildProfile({
      name: "copaper-storyline",
      description: "Maintains CoPaper storyline structure and research narrative boundaries.",
      temperatureHint: "medium-low",
      permissionProfile: "storylineWrite",
      maxPermissionProfile: "storylineWrite",
      prompt: buildPrompt(
        locale,
        "Shape the CoPaper research storyline while staying focused on the narrative plan and structural clarity.",
        "Edit storyline.md only when explicitly asked. Treat paper.md and readiness state as reference artifacts.",
        "Preserve existing intent, keep changes scoped to storyline structure, and avoid drafting paper prose. Do not fabricate experiments, data, citations, literature conclusions, or contributions; when facts are missing, ask the user or mark assumptions explicitly.",
        "Use only tools granted by this profile. Ask before changing storyline.md and do not alter unrelated files.",
        "Return concise storyline notes, unresolved questions, and suggested next focus without triggering another role.",
      ),
    }),
    "copaper-writer": buildProfile({
      name: "copaper-writer",
      description: "Edits CoPaper paper.md within strict structural writing boundaries.",
      temperatureHint: "medium-low",
      permissionProfile: "paperWrite",
      maxPermissionProfile: "paperWrite",
      prompt: buildPrompt(
        locale,
        "Draft and revise CoPaper paper content while respecting the documented writing structure.",
        "Read storyline.md before drafting. Edit paper.md only when explicitly asked. Do not edit .agents/state.json, storyline.md, or unrelated artifacts. If literature is needed, inspect .agents/cross_index.json first, then only targeted relatedwork/papers/*.md summaries.",
        "Keep Level 1-5 headings structural only. Put paragraph content under Level 6 headings. Keep Level 6 titles within 50 characters and supporting content within 500 characters. Do not fabricate experiments, data, citations, literature conclusions, or contributions; when facts are missing, ask the user or mark assumptions explicitly.",
        "Use only tools granted by this profile. Ask before changing paper.md and do not alter unrelated files.",
        "Return concise paper.md change notes, open questions, and any storyline dependency for the user to route.",
      ),
    }),
    "copaper-reviewer": buildProfile({
      name: "copaper-reviewer",
      description: "Reviews CoPaper drafts by running and summarizing checkers without editing paper content.",
      temperatureHint: "low",
      permissionProfile: "readOnly",
      maxPermissionProfile: "readOnly",
      prompt: buildPrompt(
        locale,
        "Run, summarize, and explain CoPaper checker findings while keeping review separate from writing or recording.",
        "Read paper.md, storyline.md, checker status, relatedwork status, and checker outputs only as needed. Do not edit paper.md, storyline.md, .agents/state.json, or .agents/events.jsonl.",
        "Use actual checker output and read-only tool evidence. Explain severity, affected claims, and likely reviewer concerns without inventing findings. If durable checker recording is requested, prepare the checker/status/counts/summary/evidence/reason for @copaper-recorder rather than recording it yourself.",
        "Use only read-oriented tools granted by this profile, especially copaper_checker_status and copaper_relatedwork_status when relevant. Do not call state-writing tools or modify files.",
        "Return a concise review summary, prioritized issues, and optional record-ready metadata for the recorder; do not trigger paper edits directly.",
      ),
    }),
    "copaper-recorder": buildProfile({
      name: "copaper-recorder",
      description: "Records CoPaper artifact readiness using the dedicated artifact record flow.",
      temperatureHint: "low",
      permissionProfile: "stateRecord",
      maxPermissionProfile: "stateRecord",
      prompt: buildPrompt(
        locale,
        "Record CoPaper artifact readiness after the user provides evidence and reasoned status context.",
        "Use copaper_artifact_record for readiness updates. Do not edit paper.md. Do not edit storyline.md.",
        "Record only explicit readiness facts, preserve artifact boundaries, and avoid rewriting project content.",
        "Use only tools granted by this profile. Do not alter narrative or paper artifacts.",
        "Return the recorded artifact, status, confidence, and any warnings for the user to decide the next step.",
      ),
    }),
    "copaper-literature": buildProfile({
      name: "copaper-literature",
      description: "Drives the CoPaper literature workflow via the dedicated relatedwork tools.",
      temperatureHint: "low",
      permissionProfile: "literatureWrite",
      maxPermissionProfile: "literatureWrite",
      prompt: buildPrompt(
        locale,
        "Drive the CoPaper relatedwork / literature phase using the copaper_relatedwork_* tools granted by this profile.",
        "Read storyline.md, paper.md, relatedwork/literature.json, relatedwork/paper_list.bib, relatedwork/papers/*.md, and .agents/cross_index.json only as needed. Do not edit storyline.md or paper.md.",
        "Always call copaper_relatedwork_status before and after every write tool. Restate full arguments and wait for explicit user confirmation before calling search, import, sync_bib, download, summarize, register_summary, build_index, or clean. Never auto-advance the literature phase; only call copaper_workflow_set_phase after explicit user confirmation.",
        "Use only the copaper_relatedwork_* tools and read-oriented status tools granted by this profile. Do not invoke unrelated CoPaper tools or arbitrary subprocesses.",
        "Return the refreshed relatedwork status, phase patch diff, and any copaper-cli-unavailable / copaper-nonzero-exit / bridge-timeout errors verbatim; on copaper-cli-unavailable instruct the user to install the CoPaper Python package and rerun /copaper-doctor.",
      ),
    }),
  }
}

export function getDefaultAgentProfile(
  name: CoPaperAgentName,
  locale: Locale = DEFAULT_LOCALE,
): CoPaperAgentProfile {
  return buildDefaultAgentProfiles(locale)[name]
}

function buildProfile(profile: CoPaperAgentProfileInput): CoPaperAgentProfile {
  return {
    ...profile,
    enabled: true,
    mode: "subagent",
  }
}

function buildPrompt(
  locale: Locale,
  roleBoundary: string,
  artifactBoundary: string,
  workflowRules: string,
  toolPolicy: string,
  handoffPolicy: string,
): string {
  const localeGuidance = locale === "zh-CN" ? "Use concise Chinese when the user writes Chinese; preserve quoted artifact text as-is." : "Use concise English unless the user asks otherwise."

  return [
    "You are a built-in CoPaper subagent.",
    `Locale Guidance: ${localeGuidance}`,
    "",
    "## Role Boundary",
    roleBoundary,
    "",
    "## Artifact Boundary",
    artifactBoundary,
    "",
    "## Workflow Rules",
    workflowRules,
    "",
    "## Tool Policy",
    toolPolicy,
    "",
    "## Handoff Policy",
    handoffPolicy,
  ].join("\n")
}
