export const PHASES = ["storyline", "literature", "writing", "review", "submission"] as const
export const STATUSES = ["not_started", "in_progress", "complete", "skipped"] as const

export type Phase = (typeof PHASES)[number]
export type PhaseStatus = (typeof STATUSES)[number]

export type ProjectInfo = {
  name?: string
  domain?: string
  language?: string
  created_at?: string
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

export type VibePaperEvent = {
  timestamp: string
  operator: "opencode-plugin"
  phase?: Phase
  action: string
  result: string
  metadata: Record<string, unknown>
}
