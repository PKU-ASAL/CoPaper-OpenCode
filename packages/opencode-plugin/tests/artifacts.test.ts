import { afterEach, describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, symlinkSync, utimesSync } from "node:fs"
import { join } from "node:path"
import { buildArtifactStatus, renderArtifactStatusOutput } from "../src/artifacts"
import { buildProjectFiles } from "../src/project-templates"
import { ARTIFACT_IDS, ARTIFACT_RECORD_IDS } from "../src/types"
import { hashTree, makeTempProject } from "./fixtures"

const projects: ReturnType<typeof makeTempProject>[] = []
afterEach(() => { while (projects.length) projects.pop()!.cleanup() })
function temp() { const project = makeTempProject(); projects.push(project); return project }

function writeDefaultProject(project: ReturnType<typeof makeTempProject>) {
  for (const file of buildProjectFiles({ name: "Artifact Paper", domain: "artifact systems", createdAt: "2026-05-01T10:00:00.000Z" })) {
    project.write(file.path, file.content)
  }
}

function row(result: Awaited<ReturnType<typeof buildArtifactStatus>>, id: string) {
  const artifact = result.artifacts.find((item) => item.id === id)
  if (!artifact) throw new Error(`Missing artifact row: ${id}`)
  return artifact
}

describe("artifact status", () => {
  test("keeps scan artifact ids broader than recordable artifact ids", () => {
    expect(ARTIFACT_IDS).toEqual(["storyline", "paper", "relatedwork", "cross_index", "skills", "checker_results"])
    expect(ARTIFACT_RECORD_IDS).toEqual(["storyline", "paper", "relatedwork", "cross_index", "checker_results"])
    expect(ARTIFACT_IDS).toContain("skills")
    expect(ARTIFACT_RECORD_IDS).not.toContain("skills")
  })

  test("classifies default init templates without writing project files", async () => {
    const project = temp()
    writeDefaultProject(project)
    const before = hashTree(project.root)

    const result = await buildArtifactStatus({ root: project.root, locale: "zh-CN" })
    const markdown = renderArtifactStatusOutput(result)

    expect(result.readonly).toBe(true)
    const storyline = row(result, "storyline")
    expect(storyline.status).toBe("template")
    expect(storyline.recommendation.artifactId).toBe("storyline")
    expect(storyline.metadata).toMatchObject({ path: "storyline.md" })
    expect(row(result, "paper").status).toBe("template")
    expect(row(result, "relatedwork").status).toBe("missing")
    expect(row(result, "skills").status).toBe("missing")
    expect(row(result, "checker_results").status).toBe("missing")
    expect(result.summary.readyCount).toBe(0)
    expect(result.summary.blockedCount).toBe(6)
    expect(result.summary.staleCount).toBe(0)
    expect(result.summary.recommendedFocus).toBe("storyline")
    expect(result.recommendation.artifactId).toBe("storyline")
    expect("artifact" in (result.recommendation as unknown as Record<string, unknown>)).toBe(false)
    expect(markdown).toContain("## CoPaper 工件状态")
    const tableSection = markdown.slice(markdown.indexOf("| 工件 |"), markdown.indexOf("### 警告"))
    expect(tableSection).toContain("| 工件 | 状态 | 置信度 | 证据 | 推荐下一步 |")
    expect(tableSection).toContain("| storyline | template | high |")
    expect(tableSection).toContain("继续完善 storyline.md")
    expect(tableSection).not.toContain("路径")
    expect(tableSection).not.toContain("警告")
    expect(markdown).toContain("```json")
    expect(hashTree(project.root)).toBe(before)
  })

  test("classifies substantive storyline and paper as ready in English", async () => {
    const project = temp()
    writeDefaultProject(project)
    project.write("storyline.md", `# Storyline
###### Problem Frame
<!-- description: The concrete problem context -->
This study explains why artifact-aware writing systems need durable status signals.

###### Central Claim
<!-- description: The paper's central argument -->
Read-only artifact telemetry helps writers continue work without mutating workflow state.
`)
    project.write("paper.md", `# Paper
## Introduction
###### Motivation
<!-- description: Why the work matters -->
Artifact-aware dashboards reduce coordination overhead for iterative research writing.

## Method
###### Design
<!-- description: How the system works -->
The cockpit inspects files, literature metadata, skills, and checker evidence read-only.

## Results
###### Findings
<!-- description: What changed -->
The status view distinguishes templates, partial work, ready artifacts, and stale checks.
`)

    const result = await buildArtifactStatus({ root: project.root, locale: "en-US" })
    const markdown = renderArtifactStatusOutput(result)

    expect(row(result, "storyline").status).toBe("ready")
    expect(row(result, "paper").status).toBe("ready")
    expect(row(result, "paper").evidence.some((item) => item.startsWith("substantive-sections="))).toBe(true)
    expect(markdown).toContain("## Artifact Status")
  })

  test("includes cross_index as a scan artifact", async () => {
    const project = temp()
    writeDefaultProject(project)
    project.write(".agents/cross_index.json", "{\"nodes\":[]}\n")

    const result = await buildArtifactStatus({ root: project.root, locale: "zh-CN" })
    const crossIndex = row(result, "cross_index")

    expect(crossIndex.status).toBe("ready")
    expect(crossIndex.confidence).toBe("high")
    expect(crossIndex.evidence).toContain("cross-index-present")
    expect(crossIndex.recorded).toBe(null)
  })

  test("merges recorded readiness from state without writing files", async () => {
    const project = temp()
    writeDefaultProject(project)
    project.write(".agents/state.json", `${JSON.stringify({
      project: { name: "Recorded Paper" },
      phases: {},
      event_log_path: ".agents/events.jsonl",
      artifacts: {
        paper: {
          status: "ready",
          confidence: "high",
          evidence: ["manual-review"],
          provenance: { source: "opencode", operator: "user", reason: "reviewed draft" },
          updated_at: "2026-05-02T12:00:00.000Z",
        },
      },
    }, null, 2)}\n`)
    const before = hashTree(project.root)

    const result = await buildArtifactStatus({ root: project.root, locale: "zh-CN" })
    const paper = row(result, "paper")

    expect(paper.status).toBe("template")
    expect(paper.recorded?.record?.status).toBe("ready")
    expect(paper.recorded?.record?.provenance.reason).toBe("reviewed draft")
    expect(result.recordedArtifacts?.find((item) => item.artifact === "paper")?.record?.confidence).toBe("high")
    expect(hashTree(project.root)).toBe(before)
  })

  test("marks recorded readiness stale when content hash differs", async () => {
    const project = temp()
    writeDefaultProject(project)
    project.write(".agents/state.json", `${JSON.stringify({
      phases: {},
      event_log_path: ".agents/events.jsonl",
      artifacts: {
        storyline: {
          status: "ready",
          confidence: "high",
          evidence: ["manual-review"],
          provenance: { source: "opencode", operator: "user", reason: "reviewed storyline" },
          updated_at: "2026-05-02T12:00:00.000Z",
          content_hash: "sha256:old",
        },
      },
    }, null, 2)}\n`)

    const result = await buildArtifactStatus({ root: project.root, locale: "zh-CN" })
    const storyline = row(result, "storyline")

    expect(storyline.recorded?.stale).toBe(true)
    expect(storyline.recorded?.warnings).toContain("recorded-content-hash-mismatch")
    expect(result.summary.staleCount).toBeGreaterThanOrEqual(1)
  })

  test("classifies relatedwork partial and five skills ready", async () => {
    const project = temp()
    writeDefaultProject(project)
    project.write("relatedwork/literature.json", `${JSON.stringify([{ id: "smith2026", title: "Artifact Cockpits" }], null, 2)}\n`)
    project.write("relatedwork/paper_list.bib", "@article{smith2026,title={Artifact Cockpits}}\n")
    project.write("relatedwork/summaries/smith2026.md", "# Smith 2026\n###### Summary\n<!-- description: Paper summary -->\nA summary of the related paper.\n")
    for (let index = 1; index <= 5; index += 1) {
      project.write(`.agents/skills/skill-${index}/SKILL.md`, `# Skill ${index}\n`)
    }

    const result = await buildArtifactStatus({ root: project.root, locale: "zh-CN" })

    expect(row(result, "relatedwork").status).toBe("partial")
    expect(row(result, "relatedwork").evidence).toContain("literature-entries=1")
    expect(row(result, "skills").status).toBe("ready")
    expect(row(result, "skills").evidence).toContain("skill-count=5")
  })

  test("classifies empty relatedwork directory as partial evidence", async () => {
    const project = temp()
    writeDefaultProject(project)
    mkdirSync(project.path("relatedwork"))

    const result = await buildArtifactStatus({ root: project.root, locale: "zh-CN" })
    const relatedwork = row(result, "relatedwork")

    expect(relatedwork.status).toBe("partial")
    expect(relatedwork.evidence).toContain("directory-present")
  })

  test("classifies canonical relatedwork catalog and paper summaries as ready", async () => {
    const project = temp()
    writeDefaultProject(project)
    project.write("relatedwork/literature.json", `${JSON.stringify({
      version: 1,
      updated_at: "",
      papers: {
        smith2026: { title: "Artifact Cockpits" },
      },
    }, null, 2)}\n`)
    project.write("relatedwork/paper_list.bib", "@article{smith2026,title={Artifact Cockpits}}\n")
    project.write("relatedwork/papers/smith2026.md", "# Smith 2026\n###### Summary\n<!-- description: Paper summary -->\nA canonical relatedwork paper summary.\n")
    project.write(".agents/cross_index.json", "{}\n")

    const result = await buildArtifactStatus({ root: project.root, locale: "zh-CN" })
    const relatedwork = row(result, "relatedwork")

    expect(relatedwork.status).toBe("ready")
    expect(relatedwork.evidence).toContain("literature-entries=1")
    expect(relatedwork.evidence).toContain("paper-summaries=1")
  })

  test("reports dangling symlink artifact path as unknown", async () => {
    const project = temp()
    writeDefaultProject(project)
    rmSync(project.path("paper.md"), { force: true })
    symlinkSync("missing-paper.md", project.path("paper.md"))

    const result = await buildArtifactStatus({ root: project.root, locale: "zh-CN" })
    const paper = row(result, "paper")

    expect(paper.status).toBe("unknown")
    expect(paper.warnings.some((warning) => warning === "path-not-file" || warning === "path-is-symlink")).toBe(true)
  })

  test("reports symlinked artifact ancestor outside root as unknown", async () => {
    const project = temp()
    const outside = temp()
    writeDefaultProject(project)
    symlinkSync(outside.root, project.path("relatedwork"), "dir")

    const result = await buildArtifactStatus({ root: project.root, locale: "zh-CN" })
    const relatedwork = row(result, "relatedwork")

    expect(relatedwork.status).toBe("unknown")
    expect(relatedwork.warnings.length).toBeGreaterThan(0)
  })

  test("keeps recorded relatedwork readiness when nested symlink points outside root", async () => {
    const project = temp()
    const outside = temp()
    writeDefaultProject(project)
    project.write("relatedwork/literature.json", `${JSON.stringify([{ id: "smith2026", title: "Artifact Cockpits" }], null, 2)}\n`)
    symlinkSync(outside.root, project.path("relatedwork", "external"), "dir")
    project.write(".agents/state.json", `${JSON.stringify({
      phases: {},
      event_log_path: ".agents/events.jsonl",
      artifacts: {
        relatedwork: {
          status: "ready",
          confidence: "high",
          evidence: ["manual-review"],
          provenance: { source: "opencode", operator: "user", reason: "reviewed relatedwork" },
          updated_at: "2026-05-02T12:00:00.000Z",
          content_hash: "sha256:old",
        },
      },
    }, null, 2)}\n`)
    const before = hashTree(project.root)

    const resultPromise = buildArtifactStatus({ root: project.root, locale: "zh-CN" })
    await expect(resultPromise).resolves.toBeDefined()
    const result = await resultPromise
    const relatedwork = row(result, "relatedwork")

    expect(relatedwork.recorded?.record?.status).toBe("ready")
    expect(relatedwork.recorded?.record?.provenance.reason).toBe("reviewed relatedwork")
    expect(result.recordedArtifacts?.find((item) => item.artifact === "relatedwork")?.record?.content_hash).toBe("sha256:old")
    expect(hashTree(project.root)).toBe(before)
  })

  test("marks checker results stale when precheck predates paper", async () => {
    const project = temp()
    writeDefaultProject(project)
    project.write("paper.md", "# Paper\n###### Current Draft\n<!-- description: Current draft -->\nThe paper has newer substantive content than the precheck report.\n")
    project.write(".agents/precheck_report.md", "# Precheck\nNo issues found.\n")
    const oldTime = new Date("2026-05-01T10:00:00.000Z")
    const newTime = new Date("2026-05-01T11:00:00.000Z")
    utimesSync(project.path(".agents", "precheck_report.md"), oldTime, oldTime)
    utimesSync(project.path("paper.md"), newTime, newTime)

    const result = await buildArtifactStatus({ root: project.root, locale: "zh-CN" })
    const checker = row(result, "checker_results")

    expect(checker.status).toBe("stale")
    expect(checker.evidence).toContain("precheck-report-present")
    expect(checker.warnings).toContain("checker-results-older-than-paper")
  })

  test("keeps file artifact checks available when state json is invalid", async () => {
    const project = temp()
    writeDefaultProject(project)
    project.write(".agents/state.json", "{ invalid json")
    project.write("storyline.md", `# Storyline
###### Research Gap
<!-- description: Concrete research gap -->
The artifact cockpit needs status derived from files rather than mutable workflow state.

###### Contribution
<!-- description: Concrete contribution -->
It reports artifact readiness while leaving phase state untouched.
`)

    const result = await buildArtifactStatus({ root: project.root, locale: "zh-CN" })

    expect(row(result, "storyline").status).toBe("ready")
    expect(row(result, "checker_results").status).toBe("unknown")
    expect(result.warnings).toContain("state-json-invalid")
  })

  test("reports unsafe artifact file path as unknown", async () => {
    const project = temp()
    writeDefaultProject(project)
    rmSync(project.path("paper.md"), { force: true })
    mkdirSync(join(project.root, "paper.md"))

    const result = await buildArtifactStatus({ root: project.root, locale: "zh-CN" })
    const paper = row(result, "paper")

    expect(paper.status).toBe("unknown")
    expect(paper.warnings).toContain("path-not-file")
  })
})
