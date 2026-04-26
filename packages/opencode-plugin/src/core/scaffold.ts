import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { ARTIFACTS_FILE, CONFIG_FILE, EVENTS_FILE, MEMORY_FILE, STATE_FILE, TASKS_FILE, VIBEPAPER_DIR, projectFile } from "./paths.js"
import { PHASES, type Phase, type PhaseState, type VibePaperArtifacts, type VibePaperConfig, type VibePaperMemory, type VibePaperState, type VibePaperTasks } from "./schema.js"

export type InitProjectArgs = {
  name?: string
  domain?: string
  language?: "en" | "zh"
  force?: boolean
}

export type InitProjectResult = {
  root: string
  initialized: boolean
  alreadyInitialized: boolean
  state: VibePaperState
  created: string[]
  skipped: string[]
  overwritten: string[]
}

const DEFAULT_NAME = "Untitled Paper"
const DEFAULT_DOMAIN = "unspecified"
const DEFAULT_LANGUAGE = "en"

export const MINIMAL_PAPER = `# Untitled Paper

## Abstract

## Introduction

## Background

## Design

## Evaluation

## Discussion

## Related Work

## Conclusion
`

export const MINIMAL_STORYLINE = `# Research Storyline

## Problem

## Motivation

## Key Insight

## Approach

## Contributions

## Evaluation Plan

## Open Questions
`

export const MINIMAL_WRITING_RULES = `# Writing Rules

- Write clearly and concretely.
- Prefer claims that are backed by evidence.
- Mark uncertain claims explicitly.
- Keep placeholders visible until real content is available.
`

function phaseState(status: PhaseState["status"], now: string): PhaseState {
  return {
    status,
    started_at: status === "in_progress" ? now : null,
    completed_at: null,
  }
}

export function createInitialState(args: InitProjectArgs = {}, now = new Date().toISOString()): VibePaperState {
  const phases = Object.fromEntries(
    PHASES.map((phase) => [phase, phaseState(phase === "storyline" ? "in_progress" : "not_started", now)]),
  ) as Record<Phase, PhaseState>

  return {
    schema_version: 1,
    project: {
      name: args.name?.trim() || DEFAULT_NAME,
      domain: args.domain?.trim() || DEFAULT_DOMAIN,
      language: args.language || DEFAULT_LANGUAGE,
      created_at: now,
    },
    workflow: {
      current_phase: "storyline",
      phases,
    },
    last_updated_at: now,
  }
}

export function createInitialConfig(args: InitProjectArgs = {}): VibePaperConfig {
  return {
    schema_version: 1,
    mode: "balanced",
    language: args.language || DEFAULT_LANGUAGE,
  }
}

export function createInitialMemory(): VibePaperMemory {
  return {
    schema_version: 1,
    project_summary: "",
    latest_decisions: [],
    open_questions: [],
    context_notes: [],
  }
}

export function createInitialTasks(): VibePaperTasks {
  return {
    schema_version: 1,
    tasks: {},
  }
}

export function createInitialArtifacts(): VibePaperArtifacts {
  return {
    schema_version: 1,
    artifacts: {
      "paper.md": { type: "paper", status: "template", sections: {} },
      "storyline.md": { type: "storyline", status: "template" },
      "writingrules.md": { type: "writing_rules", status: "minimal" },
    },
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath, "utf-8")
    return true
  } catch {
    return false
  }
}

async function writeJson(root: string, projectPath: string, payload: unknown, result: InitProjectResult, force: boolean): Promise<void> {
  await writeProjectFile(root, projectPath, `${JSON.stringify(payload, null, 2)}\n`, result, force)
}

async function writeProjectFile(root: string, projectPath: string, content: string, result: InitProjectResult, force: boolean): Promise<void> {
  const target = projectFile(root, projectPath)
  await mkdir(path.dirname(target), { recursive: true })
  const exists = await fileExists(target)
  if (exists && !force) {
    result.skipped.push(projectPath)
    return
  }
  await writeFile(target, content, "utf-8")
  if (exists) result.overwritten.push(projectPath)
  else result.created.push(projectPath)
}

async function appendInitEvent(root: string, state: VibePaperState, result: InitProjectResult): Promise<void> {
  const target = projectFile(root, EVENTS_FILE)
  await mkdir(path.dirname(target), { recursive: true })
  const event = {
    timestamp: new Date().toISOString(),
    operator: "opencode-plugin",
    phase: state.workflow.current_phase,
    action: "init_project",
    result: "success",
    metadata: {
      project: state.project,
      created: result.created,
      skipped: result.skipped,
      overwritten: result.overwritten,
    },
  }
  await writeFile(target, `${JSON.stringify(event)}\n`, { encoding: "utf-8", flag: "a" })
  if (!result.created.includes(EVENTS_FILE) && !result.overwritten.includes(EVENTS_FILE) && !result.skipped.includes(EVENTS_FILE)) {
    result.created.push(EVENTS_FILE)
  }
}

export async function initProject(root: string, args: InitProjectArgs = {}): Promise<InitProjectResult> {
  const force = Boolean(args.force)
  const existingState = await fileExists(projectFile(root, STATE_FILE))

  if (existingState && !force) {
    const state = JSON.parse(await readFile(projectFile(root, STATE_FILE), "utf-8")) as VibePaperState
    return {
      root,
      initialized: false,
      alreadyInitialized: true,
      state,
      created: [],
      skipped: [STATE_FILE],
      overwritten: [],
    }
  }

  await mkdir(projectFile(root, VIBEPAPER_DIR), { recursive: true })
  const state = createInitialState(args)
  const result: InitProjectResult = {
    root,
    initialized: true,
    alreadyInitialized: false,
    state,
    created: [],
    skipped: [],
    overwritten: [],
  }

  await writeJson(root, STATE_FILE, state, result, force)
  await writeJson(root, CONFIG_FILE, createInitialConfig(args), result, force)
  await writeProjectFile(root, EVENTS_FILE, "", result, force)
  await writeJson(root, MEMORY_FILE, createInitialMemory(), result, force)
  await writeJson(root, TASKS_FILE, createInitialTasks(), result, force)
  await writeJson(root, ARTIFACTS_FILE, createInitialArtifacts(), result, force)
  await writeProjectFile(root, "paper.md", MINIMAL_PAPER, result, force)
  await writeProjectFile(root, "storyline.md", MINIMAL_STORYLINE, result, force)
  await writeProjectFile(root, "writingrules.md", MINIMAL_WRITING_RULES, result, force)
  await appendInitEvent(root, state, result)

  return result
}
