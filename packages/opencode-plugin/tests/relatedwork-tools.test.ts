import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  renderRelatedworkToolOutput,
  runRelatedworkBuildIndex,
  runRelatedworkClean,
  runRelatedworkDownload,
  runRelatedworkImport,
  runRelatedworkKeywords,
  runRelatedworkRegisterSummary,
  runRelatedworkSearch,
  runRelatedworkSummarize,
  runRelatedworkSyncBib,
} from "../src/relatedwork-tools"
import type { SpawnFn, SpawnResult } from "../src/python-bridge"
import { makeTempProject } from "./fixtures"

interface SpawnCall {
  command: string[]
  cwd: string
  timeoutMs: number
}

function recordingSpawn(result: SpawnResult): { spawn: SpawnFn; calls: SpawnCall[] } {
  const calls: SpawnCall[] = []
  const spawn: SpawnFn = async (command, options) => {
    calls.push({ command, cwd: options.cwd, timeoutMs: options.timeoutMs })
    return result
  }
  return { spawn, calls }
}

const VENV_PATH = "/fake/.venv/bin/vibe"

function commandTail(call: SpawnCall, length: number): string[] {
  return call.command.slice(-length)
}

function expectCommandContainsInOrder(command: string[], expected: string[]) {
  let searchFrom = 0
  for (const value of expected) {
    const foundAt = command.indexOf(value, searchFrom)
    expect(foundAt).toBeGreaterThanOrEqual(0)
    searchFrom = foundAt + 1
  }
}

function makeBaseProject() {
  const project = makeTempProject()
  project.write(".agents/state.json", `${JSON.stringify({
    project: { name: "test", domain: "test", created_at: "2024-01-01T00:00:00Z" },
    phases: {
      literature: {
        status: "not_started",
        completed_at: null,
        catalog_path: "relatedwork/literature.json",
        papers_found: 0,
        papers_downloaded: 0,
        download_failures: 0,
        summaries_done: 0,
        cross_index_built: false,
      },
    },
    current_phase: "literature",
    event_log_path: ".agents/events.jsonl",
  }, null, 2)}\n`)
  project.write("relatedwork/.keep", "")
  return project
}

function makeCatalog(papers: number, downloaded: number, summariesDone: number, project: ReturnType<typeof makeTempProject>) {
  const papersList: Record<string, unknown>[] = []
  for (let i = 0; i < papers; i += 1) {
    const pdfRelativePath = i < downloaded ? `relatedwork/pdfs/paper-${i}.pdf` : null
    const summaryRelativePath = i < summariesDone ? `relatedwork/papers/paper-${i}.md` : null
    if (pdfRelativePath) project.write(pdfRelativePath, "%PDF-1.4\n")
    if (summaryRelativePath) project.write(summaryRelativePath, `# Summary for paper-${i}\n`)
    papersList.push({
      paper_id: `paper-${i}`,
      title: `Paper ${i}`,
      download_status: i < downloaded ? "downloaded" : "queued",
      pdf_path: pdfRelativePath,
      summary_path: summaryRelativePath,
    })
  }
  return { papers: papersList }
}

describe("relatedwork tools", () => {
  let project: ReturnType<typeof makeTempProject>

  beforeEach(() => {
    project = makeBaseProject()
  })

  afterEach(() => {
    project.cleanup()
  })

  test("keywords uses Python CLI without plugin phase patch or event", async () => {
    const { spawn, calls } = recordingSpawn({ exitCode: 0, stdout: "kw1\nkw2\n", stderr: "", timedOut: false })
    const result = await runRelatedworkKeywords(
      { root: project.root, source: "storyline.md", count: 5 },
      { spawn, resolveVenv: () => VENV_PATH, resolveUv: () => null },
    )
    expect(result.ok).toBe(true)
    expect(calls.length).toBe(1)
    expect(commandTail(calls[0], 6)).toEqual(["relatedwork", "keywords", "--from", "storyline.md", "--count", "5"])
    expect(result.phasePatch).toBeNull()
    expect(result.statusAfter?.ok).toBe(true)
    // No plugin phase-patch event was emitted; Python CLI side effects are handled by the bridge command.
    expect(() => project.read(".agents/events.jsonl")).toThrow()
  })

  test("import patches literature phase counters and appends event", async () => {
    project.write("relatedwork/literature.json", JSON.stringify(makeCatalog(3, 1, 0, project)))
    const { spawn, calls } = recordingSpawn({ exitCode: 0, stdout: "imported 3 papers\n", stderr: "", timedOut: false })
    const result = await runRelatedworkImport(
      { root: project.root, input: "relatedwork/search_cache.json" },
      { spawn, resolveVenv: () => VENV_PATH, resolveUv: () => null, now: () => 0 },
    )
    expect(result.ok).toBe(true)
    expectCommandContainsInOrder(calls[0].command, ["relatedwork", "import", "--input", "relatedwork/search_cache.json"])
    expect(result.phasePatch).not.toBeNull()
    expect(result.phasePatch?.ok).toBe(true)
    const after = result.phasePatch?.after ?? {}
    expect(after.papers_found).toBe(3)
    expect(after.papers_downloaded).toBe(1)
    expect(after.summaries_done).toBe(0)
    expect(after.cross_index_built).toBe(false)
    // event log contains a relatedwork.import event
    const eventLog = project.read(".agents/events.jsonl")
    expect(eventLog).toContain("relatedwork.import")
    expect(eventLog).toContain("\"success\"")
    // state.json updated
    const state = JSON.parse(project.read(".agents/state.json"))
    expect(state.phases.literature.papers_found).toBe(3)
    expect(state.phases.literature.papers_downloaded).toBe(1)
  })

  test("download updates downloaded count from refreshed status", async () => {
    project.write("relatedwork/literature.json", JSON.stringify(makeCatalog(2, 2, 0, project)))
    const { spawn, calls } = recordingSpawn({ exitCode: 0, stdout: "ok\n", stderr: "", timedOut: false })
    const result = await runRelatedworkDownload(
      { root: project.root, all: true },
      { spawn, resolveVenv: () => VENV_PATH, resolveUv: () => null },
    )
    expect(result.ok).toBe(true)
    expect(commandTail(calls[0], 2)).toEqual(["relatedwork", "download"])
    expect(calls[0].command).not.toContain("--all")
    expect(result.phasePatch?.after?.papers_downloaded).toBe(2)
    const eventLog = project.read(".agents/events.jsonl")
    expect(eventLog).toContain("relatedwork.download")
  })

  test("download forwards Python CLI compatible paper-id and ignores legacy all flag", async () => {
    const { spawn, calls } = recordingSpawn({ exitCode: 0, stdout: "ok\n", stderr: "", timedOut: false })

    await runRelatedworkDownload(
      { root: project.root, paperId: "paper-123", all: true },
      { spawn, resolveVenv: () => VENV_PATH, resolveUv: () => null },
    )

    const command = calls[0].command
    expectCommandContainsInOrder(command, ["relatedwork", "download", "--paper-id", "paper-123"])
    expect(command).not.toContain("--id")
    expect(command).not.toContain("--all")
  })

  test("build_index sets cross_index_built when cross_index.json exists", async () => {
    project.write("relatedwork/literature.json", JSON.stringify(makeCatalog(2, 2, 2, project)))
    project.write(".agents/cross_index.json", JSON.stringify({ entries: [] }))
    const { spawn, calls } = recordingSpawn({ exitCode: 0, stdout: "built\n", stderr: "", timedOut: false })
    const result = await runRelatedworkBuildIndex(
      { root: project.root },
      { spawn, resolveVenv: () => VENV_PATH, resolveUv: () => null },
    )
    expect(result.ok).toBe(true)
    expect(commandTail(calls[0], 2)).toEqual(["relatedwork", "build-index"])
    expect(result.phasePatch?.after?.cross_index_built).toBe(true)
  })

  test("search requires non-empty queries", async () => {
    const result = await runRelatedworkSearch({ root: project.root, queries: [] }, {})
    expect(result.ok).toBe(false)
    expect(result.errors[0]?.code).toBe("invalid-args")
  })

  test("search builds --query repetitions", async () => {
    const { spawn, calls } = recordingSpawn({ exitCode: 0, stdout: "ok\n", stderr: "", timedOut: false })
    await runRelatedworkSearch(
      { root: project.root, queries: ["foo", "bar"], limit: 5 },
      { spawn, resolveVenv: () => VENV_PATH, resolveUv: () => null },
    )
    const command = calls[0].command
    expectCommandContainsInOrder(command, ["relatedwork", "search", "--query", "foo", "--query", "bar", "--limit", "5"])
    const queryFlagPositions: number[] = []
    command.forEach((value, index) => {
      if (value === "--query") queryFlagPositions.push(index)
    })
    expect(queryFlagPositions.length).toBe(2)
    expect(command[queryFlagPositions[0] + 1]).toBe("foo")
    expect(command[queryFlagPositions[1] + 1]).toBe("bar")
    expect(command).toContain("--limit")
  })

  test("sync-bib invokes Python CLI sync-bib subcommand", async () => {
    const { spawn, calls } = recordingSpawn({ exitCode: 0, stdout: "synced\n", stderr: "", timedOut: false })

    const result = await runRelatedworkSyncBib(
      { root: project.root },
      { spawn, resolveVenv: () => VENV_PATH, resolveUv: () => null },
    )

    expect(result.ok).toBe(true)
    expect(commandTail(calls[0], 2)).toEqual(["relatedwork", "sync-bib"])
  })

  test("vibe-cli-unavailable surfaces without phase patch", async () => {
    const result = await runRelatedworkSyncBib(
      { root: project.root },
      { spawn: async () => ({ exitCode: 0, stdout: "", stderr: "", timedOut: false }), resolveVenv: () => null, resolveUv: () => null },
    )
    expect(result.ok).toBe(false)
    expect(result.errors[0]?.code).toBe("vibe-cli-unavailable")
    expect(result.phasePatch?.ok).toBe(true) // status refreshed and patch attempted (idempotent zeros)
  })

  test("non-zero exit surfaces vibe-nonzero-exit and still refreshes status", async () => {
    const { spawn } = recordingSpawn({ exitCode: 1, stdout: "", stderr: "no network\n", timedOut: false })
    const result = await runRelatedworkDownload(
      { root: project.root },
      { spawn, resolveVenv: () => VENV_PATH, resolveUv: () => null },
    )
    expect(result.ok).toBe(false)
    expect(result.errors[0]?.code).toBe("vibe-nonzero-exit")
    expect(result.stderr).toContain("no network")
    expect(result.statusAfter?.ok).toBe(true)
  })

  test("register_summary requires paperId and path", async () => {
    const missingPaper = await runRelatedworkRegisterSummary({ root: project.root, paperId: "", path: "x" }, {})
    expect(missingPaper.ok).toBe(false)
    const missingPath = await runRelatedworkRegisterSummary({ root: project.root, paperId: "p", path: "" }, {})
    expect(missingPath.ok).toBe(false)
  })

  test("register_summary forwards Python CLI compatible summary-path", async () => {
    project.write("relatedwork/papers/paper-1.md", "# Summary\n")
    const { spawn, calls } = recordingSpawn({ exitCode: 0, stdout: "registered\n", stderr: "", timedOut: false })

    await runRelatedworkRegisterSummary(
      { root: project.root, paperId: "paper-1", path: "relatedwork/papers/paper-1.md" },
      { spawn, resolveVenv: () => VENV_PATH, resolveUv: () => null },
    )

    const command = calls[0].command
    expectCommandContainsInOrder(command, ["relatedwork", "register-summary", "--paper-id", "paper-1", "--summary-path", "relatedwork/papers/paper-1.md"])
    expect(command).not.toContain("--path")
  })

  test("summarize forwards optional flags only when provided", async () => {
    const { spawn, calls } = recordingSpawn({ exitCode: 0, stdout: "", stderr: "", timedOut: false })
    await runRelatedworkSummarize(
      { root: project.root, paperId: "abc" },
      { spawn, resolveVenv: () => VENV_PATH, resolveUv: () => null },
    )
    const command = calls[0].command
    expectCommandContainsInOrder(command, ["relatedwork", "summarize", "--paper-id", "abc"])
    expect(command).toContain("--paper-id")
    expect(command).not.toContain("--storyline")
    expect(command).not.toContain("--template")
  })

  test("clean propagates --dry-run", async () => {
    const { spawn, calls } = recordingSpawn({ exitCode: 0, stdout: "", stderr: "", timedOut: false })
    await runRelatedworkClean(
      { root: project.root, dryRun: true },
      { spawn, resolveVenv: () => VENV_PATH, resolveUv: () => null },
    )
    expectCommandContainsInOrder(calls[0].command, ["relatedwork", "clean", "--dry-run"])
    expect(calls[0].command).not.toContain("--yes")
  })

  test("clean forwards --yes for confirmed non-dry-run bridge calls", async () => {
    const { spawn, calls } = recordingSpawn({ exitCode: 0, stdout: "cleaned\n", stderr: "", timedOut: false })

    await runRelatedworkClean(
      { root: project.root },
      { spawn, resolveVenv: () => VENV_PATH, resolveUv: () => null },
    )

    expectCommandContainsInOrder(calls[0].command, ["relatedwork", "clean", "--yes"])
    expect(calls[0].command).not.toContain("--dry-run")
  })

  test("renderRelatedworkToolOutput surfaces stdout, stderr, status counts, and json", async () => {
    project.write("relatedwork/literature.json", JSON.stringify(makeCatalog(2, 1, 0, project)))
    const { spawn } = recordingSpawn({ exitCode: 0, stdout: "imported\n", stderr: "", timedOut: false })
    const result = await runRelatedworkImport(
      { root: project.root, input: "relatedwork/search_cache.json" },
      { spawn, resolveVenv: () => VENV_PATH, resolveUv: () => null },
    )
    const rendered = renderRelatedworkToolOutput(result)
    expect(rendered).toContain("vibepaper_relatedwork_import")
    expect(rendered).toContain("imported")
    expect(rendered).toContain("papers=2")
    expect(rendered).toContain("```json")
  })
})

describe("relatedwork tools - plugin phase-patch events are appended atomically", () => {
  test("two sequential write tools append two events", async () => {
    const project = makeBaseProject()
    try {
      project.write("relatedwork/literature.json", JSON.stringify({ papers: [{ paper_id: "p", title: "t", download_status: "queued" }] }))
      const { spawn } = recordingSpawn({ exitCode: 0, stdout: "", stderr: "", timedOut: false })
      const deps = { spawn, resolveVenv: () => VENV_PATH, resolveUv: () => null }
      await runRelatedworkImport({ root: project.root }, deps)
      await runRelatedworkSyncBib({ root: project.root }, deps)
      const lines = readFileSync(join(project.root, ".agents/events.jsonl"), "utf8").trim().split("\n")
      expect(lines.length).toBe(2)
      const actions = lines.map((line) => JSON.parse(line).action)
      expect(actions).toEqual(["relatedwork.import", "relatedwork.sync-bib"])
    } finally {
      project.cleanup()
    }
  })

  test("keywords never appends plugin phase-patch events", async () => {
    const project = makeBaseProject()
    try {
      const { spawn } = recordingSpawn({ exitCode: 0, stdout: "kw\n", stderr: "", timedOut: false })
      const deps = { spawn, resolveVenv: () => VENV_PATH, resolveUv: () => null }
      await runRelatedworkKeywords({ root: project.root }, deps)
      await runRelatedworkKeywords({ root: project.root, count: 3 }, deps)
      expect(() => readFileSync(join(project.root, ".agents/events.jsonl"), "utf8")).toThrow()
    } finally {
      project.cleanup()
    }
  })
})
