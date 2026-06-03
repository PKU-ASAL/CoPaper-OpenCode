import { describe, expect, test } from "bun:test"
import { resolveBridge, runBridge, type BridgeDeps, type SpawnFn, type SpawnResult } from "../src/python-bridge"

const ROOT = "/tmp/copaper-bridge-test"

function fakeNow(): { tick: () => number; reset: () => void } {
  let n = 0
  return { tick: () => (n += 100), reset: () => (n = 0) }
}

function recordingSpawn(result: SpawnResult): { spawn: SpawnFn; calls: Array<{ command: string[]; cwd: string; env: Record<string, string>; timeoutMs: number }> } {
  const calls: Array<{ command: string[]; cwd: string; env: Record<string, string>; timeoutMs: number }> = []
  const spawn: SpawnFn = async (command, options) => {
    calls.push({ command, cwd: options.cwd, env: options.env, timeoutMs: options.timeoutMs })
    return result
  }
  return { spawn, calls }
}

describe("python-bridge", () => {
  test("resolveBridge prefers .venv/bin/copaper when present", async () => {
    const deps: BridgeDeps = { resolveVenv: () => "/venv/bin/copaper", resolveUv: () => "/usr/bin/uv" }
    const resolved = await resolveBridge(ROOT, deps)
    expect(resolved.ok).toBe(true)
    if (resolved.ok) {
      expect(resolved.resolution.kind).toBe("venv-bin")
      expect(resolved.resolution.path).toBe("/venv/bin/copaper")
      expect(resolved.resolution.args).toEqual([])
    }
  })

  test("resolveBridge falls back to uv when venv missing", async () => {
    const deps: BridgeDeps = { resolveVenv: () => null, resolveUv: () => "/usr/bin/uv" }
    const resolved = await resolveBridge(ROOT, deps)
    expect(resolved.ok).toBe(true)
    if (resolved.ok) {
      expect(resolved.resolution.kind).toBe("uv-run")
      expect(resolved.resolution.path).toBe("/usr/bin/uv")
      expect(resolved.resolution.args).toEqual(["run", "--project", ROOT, "copaper"])
    }
  })

  test("resolveBridge fails with copaper-cli-unavailable when nothing found", async () => {
    const deps: BridgeDeps = { resolveVenv: () => null, resolveUv: () => null }
    const resolved = await resolveBridge(ROOT, deps)
    expect(resolved.ok).toBe(false)
    if (!resolved.ok) {
      expect(resolved.error.code).toBe("copaper-cli-unavailable")
    }
  })

  test("runBridge spawns venv binary with --root and forwards args", async () => {
    const { spawn, calls } = recordingSpawn({ exitCode: 0, stdout: "hello\n", stderr: "", timedOut: false })
    const clock = fakeNow()
    const deps: BridgeDeps = { resolveVenv: () => "/venv/bin/copaper", resolveUv: () => null, spawn, now: clock.tick }
    const result = await runBridge({ root: ROOT, args: ["relatedwork", "status", "--json"] }, deps)
    expect(result.ok).toBe(true)
    expect(calls.length).toBe(1)
    expect(calls[0].command).toEqual(["/venv/bin/copaper", "--root", ROOT, "relatedwork", "status", "--json"])
    expect(calls[0].cwd).toBe(ROOT)
    if (result.ok) {
      expect(result.command).toContain("relatedwork status --json")
      expect(result.stdout).toBe("hello\n")
      expect(result.exitCode).toBe(0)
      expect(result.resolution.kind).toBe("venv-bin")
    }
  })

  test("runBridge prepends uv-run args when using uv fallback", async () => {
    const { spawn, calls } = recordingSpawn({ exitCode: 0, stdout: "", stderr: "", timedOut: false })
    const deps: BridgeDeps = { resolveVenv: () => null, resolveUv: () => "/usr/bin/uv", spawn, now: fakeNow().tick }
    await runBridge({ root: ROOT, args: ["relatedwork", "keywords"] }, deps)
    expect(calls[0].command).toEqual(["/usr/bin/uv", "run", "--project", ROOT, "copaper", "--root", ROOT, "relatedwork", "keywords"])
  })

  test("runBridge surfaces non-zero exit", async () => {
    const { spawn } = recordingSpawn({ exitCode: 2, stdout: "", stderr: "boom\n", timedOut: false })
    const deps: BridgeDeps = { resolveVenv: () => "/venv/bin/copaper", resolveUv: () => null, spawn, now: fakeNow().tick }
    const result = await runBridge({ root: ROOT, args: ["relatedwork", "import"] }, deps)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("copaper-nonzero-exit")
      expect(result.stderr).toBe("boom\n")
      expect(result.exitCode).toBe(2)
    }
  })

  test("runBridge surfaces bridge-timeout when spawn reports timedOut", async () => {
    const { spawn } = recordingSpawn({ exitCode: null, stdout: "", stderr: "", timedOut: true })
    const deps: BridgeDeps = { resolveVenv: () => "/venv/bin/copaper", resolveUv: () => null, spawn, now: fakeNow().tick }
    const result = await runBridge({ root: ROOT, args: ["relatedwork", "download"], timeoutMs: 1_000 }, deps)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("bridge-timeout")
    }
  })

  test("runBridge captures spawn rejections as bridge-spawn-failed", async () => {
    const spawn: SpawnFn = async () => {
      throw new Error("EACCES")
    }
    const deps: BridgeDeps = { resolveVenv: () => "/venv/bin/copaper", resolveUv: () => null, spawn, now: fakeNow().tick }
    const result = await runBridge({ root: ROOT, args: ["relatedwork", "status"] }, deps)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("bridge-spawn-failed")
      expect(result.error.message).toContain("EACCES")
    }
  })

  test("runBridge returns copaper-cli-unavailable without spawning when resolution fails", async () => {
    let invoked = false
    const spawn: SpawnFn = async () => {
      invoked = true
      return { exitCode: 0, stdout: "", stderr: "", timedOut: false }
    }
    const deps: BridgeDeps = { resolveVenv: () => null, resolveUv: () => null, spawn, now: fakeNow().tick }
    const result = await runBridge({ root: ROOT, args: ["relatedwork", "status"] }, deps)
    expect(invoked).toBe(false)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("copaper-cli-unavailable")
  })
})
