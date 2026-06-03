import { accessSync, constants as fsConstants, existsSync, lstatSync } from "node:fs"
import { join } from "node:path"
import { assertInsideRoot } from "./fs-utils"
import type { BridgeError, BridgeOptions, BridgeResolution, BridgeResult } from "./types"

const DEFAULT_TIMEOUT_MS = 60_000
const MAX_STREAM_BYTES = 1 << 20

export interface SpawnResult {
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
}

export interface SpawnOptions {
  cwd: string
  env: Record<string, string>
  timeoutMs: number
}

export type SpawnFn = (command: string[], options: SpawnOptions) => Promise<SpawnResult>

export interface BridgeDeps {
  spawn?: SpawnFn
  resolveVenv?: (root: string) => string | null
  resolveUv?: () => string | null
  now?: () => number
}

const defaultSpawn: SpawnFn = async (command, options) => {
  const child = Bun.spawn(command, {
    cwd: options.cwd,
    env: options.env,
    stdout: "pipe",
    stderr: "pipe",
  })
  let timedOut = false
  const timeoutHandle = setTimeout(() => {
    timedOut = true
    try {
      child.kill()
    } catch {
      // ignore
    }
  }, options.timeoutMs)
  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      readStream(child.stdout),
      readStream(child.stderr),
      child.exited,
    ])
    return { stdout, stderr, exitCode, timedOut }
  } finally {
    clearTimeout(timeoutHandle)
  }
}

async function readStream(stream: ReadableStream<Uint8Array> | null | undefined): Promise<string> {
  if (!stream) return ""
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const chunks: string[] = []
  let total = 0
  let truncated = false
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (truncated) continue
      total += value.byteLength
      if (total > MAX_STREAM_BYTES) {
        const remaining = MAX_STREAM_BYTES - (total - value.byteLength)
        if (remaining > 0) chunks.push(decoder.decode(value.subarray(0, remaining), { stream: true }))
        chunks.push(`\n[output truncated at ${MAX_STREAM_BYTES} bytes]`)
        truncated = true
        continue
      }
      chunks.push(decoder.decode(value, { stream: true }))
    }
  } finally {
    reader.releaseLock()
  }
  if (!truncated) chunks.push(decoder.decode())
  return chunks.join("")
}

function defaultResolveVenv(root: string): string | null {
  const candidate = join(root, ".venv", "bin", "vibe")
  try {
    assertInsideRoot(root, candidate)
  } catch {
    return null
  }
  if (!existsSync(candidate)) return null
  let stat
  try {
    stat = lstatSync(candidate)
  } catch {
    return null
  }
  if (!stat.isFile()) return null
  try {
    accessSync(candidate, fsConstants.X_OK)
  } catch {
    return null
  }
  return candidate
}

function defaultResolveUv(): string | null {
  const which = Bun.which?.("uv")
  return typeof which === "string" && which.length > 0 ? which : null
}

export async function resolveBridge(root: string, deps: BridgeDeps = {}): Promise<{ ok: true; resolution: BridgeResolution } | { ok: false; error: BridgeError }> {
  const venv = (deps.resolveVenv ?? defaultResolveVenv)(root)
  if (venv !== null) {
    return { ok: true, resolution: { kind: "venv-bin", path: venv, args: [] } }
  }
  const uv = (deps.resolveUv ?? defaultResolveUv)()
  if (uv !== null) {
    return { ok: true, resolution: { kind: "uv-run", path: uv, args: ["run", "--project", root, "vibe"] } }
  }
  return {
    ok: false,
    error: {
      code: "vibe-cli-unavailable",
      message: "vibe CLI not found: no executable at <root>/.venv/bin/vibe and `uv` is not on PATH",
    },
  }
}

export async function runBridge(options: BridgeOptions, deps: BridgeDeps = {}): Promise<BridgeResult> {
  const timeoutMs = options.timeoutMs && Number.isFinite(options.timeoutMs) ? Math.max(1_000, Math.trunc(options.timeoutMs)) : DEFAULT_TIMEOUT_MS
  const start = deps.now ? deps.now() : Date.now()
  const resolved = await resolveBridge(options.root, deps)
  if (!resolved.ok) {
    return {
      ok: false,
      resolution: null,
      command: null,
      error: resolved.error,
      stdout: "",
      stderr: "",
      exitCode: null,
      durationMs: (deps.now ? deps.now() : Date.now()) - start,
    }
  }
  const resolution = resolved.resolution
  const baseCommand = [resolution.path, ...resolution.args]
  const argv = [...baseCommand, "--root", options.root, ...options.args]
  const command = argv.map(escapeArg).join(" ")
  const env = sanitizeEnv({ ...process.env, ...options.env })
  let spawnResult: SpawnResult
  try {
    spawnResult = await (deps.spawn ?? defaultSpawn)(argv, { cwd: options.root, env, timeoutMs })
  } catch (error) {
    return {
      ok: false,
      resolution,
      command,
      error: { code: "bridge-spawn-failed", message: `Failed to spawn vibe CLI: ${errorMessage(error)}` },
      stdout: "",
      stderr: "",
      exitCode: null,
      durationMs: (deps.now ? deps.now() : Date.now()) - start,
    }
  }
  const durationMs = (deps.now ? deps.now() : Date.now()) - start
  if (spawnResult.timedOut) {
    return {
      ok: false,
      resolution,
      command,
      error: { code: "bridge-timeout", message: `vibe CLI exceeded ${timeoutMs}ms timeout` },
      stdout: spawnResult.stdout,
      stderr: spawnResult.stderr,
      exitCode: spawnResult.exitCode,
      durationMs,
    }
  }
  const exitCode = spawnResult.exitCode ?? -1
  if (exitCode !== 0) {
    return {
      ok: false,
      resolution,
      command,
      error: { code: "vibe-nonzero-exit", message: `vibe CLI exited with code ${exitCode}` },
      stdout: spawnResult.stdout,
      stderr: spawnResult.stderr,
      exitCode,
      durationMs,
    }
  }
  return {
    ok: true,
    resolution,
    command,
    stdout: spawnResult.stdout,
    stderr: spawnResult.stderr,
    exitCode,
    durationMs,
  }
}

function escapeArg(arg: string): string {
  if (arg === "") return "''"
  if (/^[A-Za-z0-9_\-./=:@%+,]+$/.test(arg)) return arg
  return `'${arg.replace(/'/g, "'\\''")}'`
}

function sanitizeEnv(env: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") out[key] = value
  }
  return out
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
