#!/usr/bin/env bun
import { fileURLToPath } from "node:url"
import { applyInitPlan, planInit, type FileAction } from "./installer"
import { renderDoctorJson, renderDoctorMarkdown, renderDoctorText, runDoctor } from "./doctor"
import { resolveLocale, t } from "./i18n"
import type { OutputFormat } from "./types"

const packageVersion = "0.1.0"
type Command = "init" | "doctor"
type CommonOptions = { root?: string; config?: string; dryRun?: boolean; force?: boolean; format?: OutputFormat }

async function main(argv: string[]) {
  const [command, ...rest] = argv
  if (!command || command === "--help" || command === "-h") return help(0)
  if (command === "init") return runInit(rest)
  if (command === "doctor") return runDoctorCommand(rest)
  console.error(`Unknown command: ${command}`)
  return help(2)
}

async function runInit(args: string[]) {
  const parsed = parseCommonArgs(args, "init")
  if (!parsed.ok) {
    console.error(parsed.error)
    return 2
  }
  const options = parsed.options
  const locale = resolveLocale().locale
  const plan = await planInit({ ...options, cliEntryPath: fileURLToPath(import.meta.url), locale })
  if (!plan.ok) {
    console.error(plan.error)
    return 1
  }
  if (options.dryRun) {
    console.log(t(locale, "cli.dryRun"))
    for (const action of plan.actions) console.log(actionSummary(action))
    console.log(t(locale, "cli.noFilesChanged"))
    return 0
  }
  const result = await applyInitPlan(plan)
  if (!result.ok) {
    console.error(result.error)
    return 1
  }
  for (const message of result.messages) console.log(message)
  console.log(t(locale, "cli.installed"))
  return 0
}

async function runDoctorCommand(args: string[]) {
  const parsed = parseCommonArgs(args, "doctor")
  if (!parsed.ok) {
    console.error(parsed.error)
    return 2
  }
  const options = parsed.options
  const result = await runDoctor({ root: options.root, config: options.config, packageVersion })
  const format = options.format ?? "text"
  if (format === "json") console.log(renderDoctorJson(result))
  else if (format === "markdown") console.log(renderDoctorMarkdown(result))
  else console.log(renderDoctorText(result))
  return result.ok ? 0 : 1
}

function parseCommonArgs(args: string[], command: Command): { ok: true; options: CommonOptions } | { ok: false; error: string } {
  const options: CommonOptions = {}
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "--root") {
      const value = readOptionValue(args, index, arg)
      if (!value.ok) return value
      options.root = value.value
      index += 1
    } else if (arg === "--config") {
      const value = readOptionValue(args, index, arg)
      if (!value.ok) return value
      options.config = value.value
      index += 1
    } else if (arg === "--dry-run") {
      if (command !== "init") return unsupportedOption(command, arg)
      options.dryRun = true
    } else if (arg === "--force") {
      if (command !== "init") return unsupportedOption(command, arg)
      options.force = true
    } else if (arg === "--format") {
      if (command !== "doctor") return unsupportedOption(command, arg)
      const value = readOptionValue(args, index, arg)
      if (!value.ok) return value
      if (options.format) return { ok: false, error: "Duplicate option: --format" }
      const format = parseFormat(value.value)
      if (!format.ok) return format
      options.format = format.value
      index += 1
    } else {
      return { ok: false, error: arg.startsWith("-") ? `Unknown option: ${arg}` : `Unexpected argument: ${arg}` }
    }
  }
  return { ok: true, options }
}

function parseFormat(value: string): { ok: true; value: OutputFormat } | { ok: false; error: string } {
  if (value === "text" || value === "markdown" || value === "json") return { ok: true, value }
  return { ok: false, error: `Unsupported format: ${value}` }
}

function actionSummary(action: FileAction): string {
  if (action.kind === "skip") return `skip ${action.path}: ${action.reason}`
  return `write ${action.path}${action.backupTo ? ` backup ${action.backupTo}` : ""}`
}

function readOptionValue(args: string[], index: number, flag: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = args[index + 1]
  if (!value || value.startsWith("--")) return { ok: false, error: `Missing value for ${flag}` }
  return { ok: true, value }
}

function unsupportedOption(command: Command, arg: string): { ok: false; error: string } {
  return { ok: false, error: `Unsupported option for ${command}: ${arg}` }
}

function help(code: number) {
  console.log(`Usage:
  vibepaper-opencode init [--root <dir>] [--config <path>] [--dry-run] [--force]
  vibepaper-opencode doctor [--root <dir>] [--config <path>] [--format text|markdown|json]
`)
  return code
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
