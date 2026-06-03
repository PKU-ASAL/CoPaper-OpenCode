#!/usr/bin/env bun
import { existsSync, lstatSync, statSync, unlinkSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const PLUGIN_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const USAGE = "Usage: bun run dev:reset <target-project-dir>"

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

async function main(): Promise<void> {
  const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"))
  if (positional.length !== 1) {
    console.error(USAGE)
    process.exit(2)
  }
  const target = resolve(positional[0])
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    console.error(`Target is not a directory: ${target}`)
    process.exit(2)
  }

  await runBestEffort(["bun", "remove", "@vibepaper/opencode"], target, "unlink-target")

  const linkPath = join(target, "node_modules", "@vibepaper", "opencode")
  if (existsSync(linkPath) || isOrphanSymlink(linkPath)) {
    try {
      unlinkSync(linkPath)
      console.log(`[unlink-symlink] removed ${linkPath}`)
    } catch (error) {
      console.warn(`[unlink-symlink] could not remove ${linkPath}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  await runBestEffort(["bun", "unlink"], PLUGIN_DIR, "unlink-plugin")

  console.log("")
  console.log("Done. Slash command files under .opencode/commands/ and opencode.json plugin entry remain intact.")
  console.log("Remove them manually if you also want to uninstall the OpenCode integration.")
}

function isOrphanSymlink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink()
  } catch {
    return false
  }
}

async function runBestEffort(command: string[], cwd: string, label: string): Promise<void> {
  console.log(`[${label}] ${command.join(" ")}`)
  const child = Bun.spawn(command, { cwd, stdout: "inherit", stderr: "inherit" })
  const exitCode = await child.exited
  if (exitCode !== 0) console.warn(`[${label}] exited ${exitCode} (continuing).`)
}
