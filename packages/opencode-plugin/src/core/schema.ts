export const PHASES = ["storyline", "literature", "writing", "review", "submission"] as const
export const STATUSES = ["not_started", "in_progress", "complete", "skipped"] as const

export type Phase = (typeof PHASES)[number]
export type PhaseStatus = (typeof STATUSES)[number]

export type ProjectInfo = {
  name: string
  domain: string
  language: "en" | "zh"
  created_at: string
}

export type PhaseState = Record<string, unknown> & {
  status?: PhaseStatus
  started_at?: string | null
  completed_at?: string | null
  skip_reason?: string
}

export type VibePaperState = {
  schema_version: number
  project?: ProjectInfo
  workflow: {
    current_phase: Phase
    phases: Record<Phase, PhaseState>
  }
  last_updated_at?: string
}

export type VibePaperConfig = {
  schema_version: number
  mode: "balanced" | "strict"
  language: "en" | "zh"
}

export type VibePaperMemory = {
  schema_version: number
  project_summary: string
  latest_decisions: string[]
  open_questions: string[]
  context_notes: string[]
}

export type VibePaperTasks = {
  schema_version: number
  tasks: Record<string, unknown>
}

export type VibePaperArtifacts = {
  schema_version: number
  artifacts: {
    "paper.md": {
      type: "paper"
      status: "template" | "draft" | "complete"
      sections: Record<string, unknown>
    }
    "storyline.md": {
      type: "storyline"
      status: "template" | "draft" | "complete"
    }
    "writingrules.md": {
      type: "writing_rules"
      status: "minimal" | "custom"
    }
  }
}

export type VibePaperEvent = {
  timestamp: string
  operator: "opencode-plugin"
  phase?: Phase
  action: string
  result: string
  metadata: Record<string, unknown>
}
