#!/usr/bin/env bun
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

interface Args {
  target: string
  withPython: boolean
  skipBuild: boolean
  skipInit: boolean
}

interface SpawnFailure {
  label: string
  exitCode: number
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = resolve(SCRIPT_DIR, "..")
const REPO_ROOT = resolve(PLUGIN_DIR, "..", "..")
const USAGE = "Usage: bun run dev:install <target-project-dir> [--with-python] [--skip-build] [--skip-init]"

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2))
  if ("error" in parsed) {
    console.error(parsed.error)
    console.error(USAGE)
    process.exit(2)
  }
  const { target, withPython, skipBuild, skipInit } = parsed

  ensureTargetIsDirectory(target)
  ensureTargetPackageJson(target)

  if (!skipBuild) await run(["bun", "run", "build"], PLUGIN_DIR, "build")

  await run(["bun", "link"], PLUGIN_DIR, "link-plugin")
  await run(["bun", "link", "@copaper/opencode"], target, "link-target")

  if (!skipInit) {
    const cliPath = join(target, "node_modules", ".bin", "copaper-opencode")
    if (!existsSync(cliPath)) {
      throw new Error(`Linked CLI not found at ${cliPath}. bun link may have failed; rerun and inspect the link-target step output.`)
    }
    await run([cliPath, "init", "--force", "--root", target], target, "init")
  }

  if (withPython) {
    if (!hasOnPath("uv")) {
      console.warn("[uv-python] `uv` not on PATH; skipping Python install. Install uv and rerun with --with-python.")
    } else {
      const targetVenv = join(target, ".venv")
      if (!existsSync(targetVenv)) await run(["uv", "venv"], target, "uv-venv")
      await run(["uv", "pip", "install", "-e", REPO_ROOT], target, "uv-pip")
    }
  }

  console.log("")
  console.log("Done. Next steps:")
  console.log(`  1. Restart OpenCode inside ${target}.`)
  console.log("  2. Run /copaper-doctor to verify the install (look for copaper-cli.available and commands.copaper-relatedwork.present).")
  console.log("  3. Run /copaper-relatedwork to drive the relatedwork workflow.")
}

function parseArgs(argv: string[]): Args | { error: string } {
  const positional: string[] = []
  let withPython = false
  let skipBuild = false
  let skipInit = false
  for (const arg of argv) {
    if (arg === "--with-python") withPython = true
    else if (arg === "--skip-build") skipBuild = true
    else if (arg === "--skip-init") skipInit = true
    else if (arg === "--help" || arg === "-h") {
      console.log(USAGE)
      process.exit(0)
    } else if (arg.startsWith("--")) return { error: `Unknown flag: ${arg}` }
    else positional.push(arg)
  }
  if (positional.length !== 1) return { error: "Expected exactly one target directory argument." }
  return { target: resolve(positional[0]), withPython, skipBuild, skipInit }
}

function ensureTargetIsDirectory(target: string): void {
  if (!existsSync(target)) throw new Error(`Target does not exist: ${target}`)
  if (!statSync(target).isDirectory()) throw new Error(`Target is not a directory: ${target}`)
}

function ensureTargetPackageJson(target: string): void {
  const path = join(target, "package.json")
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>
      if (typeof parsed.name === "string" && parsed.name.length > 0) return
    } catch {
      // fall through to overwrite with stub
    }
  }
  console.log(`[bootstrap] Writing minimal package.json at ${path} (required by bun link).`)
  const stub = { name: pickStubName(target), private: true, version: "0.0.0" }
  writeFileSync(path, `${JSON.stringify(stub, null, 2)}\n`)
}

function pickStubName(target: string): string {
  const base = target.split("/").filter((part) => part.length > 0).pop() ?? "copaper-target"
  return base.toLowerCase().replace(/[^a-z0-9._-]/g, "-")
}

function hasOnPath(command: string): boolean {
  const which = Bun.which(command)
  return typeof which === "string" && which.length > 0
}

async function run(command: string[], cwd: string, label: string): Promise<void> {
  console.log(`[${label}] ${command.join(" ")}`)
  const child = Bun.spawn(command, { cwd, stdout: "inherit", stderr: "inherit" })
  const exitCode = await child.exited
  if (exitCode !== 0) {
    const failure: SpawnFailure = { label, exitCode }
    throw new Error(`Step '${failure.label}' exited with code ${failure.exitCode}.`)
  }
}
