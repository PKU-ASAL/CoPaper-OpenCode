import { existsSync, readFileSync, copyFileSync, mkdirSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { mergePluginConfig } from "./config"
import { assertInsideRoot, backupPathFor, writeFileAtomic } from "./fs-utils"
import { t } from "./i18n"
import { detectRoot } from "./root"
import { hasManagedMarker, renderCommandTemplate, type CommandName } from "./templates"
import { DEFAULT_LOCALE, PACKAGE_NAME, type Locale } from "./types"

export interface InitOptions {
  root?: string
  cwd?: string
  config?: string
  dryRun?: boolean
  force?: boolean
  now?: Date
  cliEntryPath?: string
  pluginSpecifier?: string
  locale?: Locale
}

export type FileAction =
  | { kind: "write"; path: string; content: string; backupFrom?: string; backupTo?: string }
  | { kind: "skip"; path: string; reason: string }

export type InitPlan =
  | { ok: true; root: string; dryRun: boolean; actions: FileAction[]; messages: string[] }
  | { ok: false; error: string }

export type InitResult = { ok: true; messages: string[] } | { ok: false; error: string }

export async function planInit(options: InitOptions): Promise<InitPlan> {
  const detection = await detectRoot({ cwd: options.cwd ?? process.cwd(), explicitRoot: options.root })
  const root = detection.root
  const now = options.now ?? new Date()
  const locale = options.locale ?? DEFAULT_LOCALE
  const pluginSpecifier = options.pluginSpecifier ?? resolvePluginSpecifier(root, options.cliEntryPath)
  const configPath = selectConfigPath(root, options.config)
  if (!configPath.ok) return { ok: false, error: configPath.error }

  const actions: FileAction[] = []
  const configAction = planConfigAction(root, configPath.path, pluginSpecifier, now)
  if (!configAction.ok) return { ok: false, error: configAction.error }
  actions.push(configAction.action)

  for (const command of ["vibe", "vibe-doctor"] as CommandName[]) {
    const commandAction = planCommandAction(root, command, Boolean(options.force), now, locale)
    if (!commandAction.ok) return { ok: false, error: commandAction.error }
    actions.push(commandAction.action)
  }

  return { ok: true, root, dryRun: Boolean(options.dryRun), actions, messages: [`Root: ${root}`, t(locale, "cli.restart")] }
}

export async function applyInitPlan(plan: InitPlan): Promise<InitResult> {
  if (!plan.ok) return plan
  if (plan.dryRun) return { ok: true, messages: plan.messages.concat(plan.actions.map(actionSummary)) }
  try {
    for (const action of plan.actions) {
      if (action.kind === "skip") continue
      assertInsideRoot(plan.root, action.path)
      if (action.backupFrom && action.backupTo) {
        assertInsideRoot(plan.root, action.backupFrom)
        assertInsideRoot(plan.root, action.backupTo)
        mkdirSync(dirname(action.backupTo), { recursive: true })
        copyFileSync(action.backupFrom, action.backupTo)
      }
      writeFileAtomic(action.path, action.content)
    }
    return { ok: true, messages: plan.messages }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

function selectConfigPath(root: string, explicitConfig?: string): { ok: true; path: string } | { ok: false; error: string } {
  if (explicitConfig) return validateConfigPath(root, resolve(root, explicitConfig))
  const json = join(root, "opencode.json")
  const jsonc = join(root, "opencode.jsonc")
  const hasJson = existsSync(json)
  const hasJsonc = existsSync(jsonc)
  if (hasJson && hasJsonc) return { ok: false, error: "Both opencode.json and opencode.jsonc exist; pass --config to choose one" }
  if (hasJson) return validateConfigPath(root, json)
  if (hasJsonc) return validateConfigPath(root, jsonc)
  return validateConfigPath(root, json)
}

function validateConfigPath(root: string, path: string): { ok: true; path: string } | { ok: false; error: string } {
  try {
    assertInsideRoot(root, path)
    return { ok: true, path }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function resolvePluginSpecifier(root: string, cliEntryPath?: string): string {
  if (!cliEntryPath) return PACKAGE_NAME
  const indexPath = join(dirname(cliEntryPath), "index.js")
  if (!existsSync(indexPath)) return PACKAGE_NAME
  if (!indexPath.endsWith(join("node_modules", "@vibepaper", "opencode", "dist", "index.js"))) return PACKAGE_NAME
  try {
    assertInsideRoot(root, indexPath)
    return pathToFileURL(indexPath).href
  } catch {
    return PACKAGE_NAME
  }
}

function planConfigAction(root: string, path: string, pluginSpecifier: string, now: Date): { ok: true; action: FileAction } | { ok: false; error: string } {
  if (!existsSync(path)) return { ok: true, action: { kind: "write", path, content: `${JSON.stringify({ plugin: [pluginSpecifier] })}\n` } }
  const input = readFileSync(path, "utf8")
  const merge = mergePluginConfig(input, pluginSpecifier)
  if (!merge.ok) return { ok: false, error: merge.error }
  if (!merge.changed) return { ok: true, action: { kind: "skip", path, reason: "plugin already configured" } }
  const rel = relative(root, path)
  return { ok: true, action: { kind: "write", path, content: merge.output, backupFrom: path, backupTo: backupPathFor(root, rel, now) } }
}

function planCommandAction(root: string, command: CommandName, force: boolean, now: Date, locale: Locale): { ok: true; action: FileAction } | { ok: false; error: string } {
  const path = join(root, ".opencode", "commands", `${command}.md`)
  try {
    assertInsideRoot(root, path)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
  const next = renderCommandTemplate(command, locale)
  if (!existsSync(path)) return { ok: true, action: { kind: "write", path, content: next } }
  const current = readFileSync(path, "utf8")
  if (current === next) return { ok: true, action: { kind: "skip", path, reason: "command already current" } }
  if (!hasManagedMarker(current, command) && !force) return { ok: false, error: `Refusing to overwrite unmanaged command: ${path}` }
  const rel = relative(root, path)
  return { ok: true, action: { kind: "write", path, content: next, backupFrom: path, backupTo: backupPathFor(root, rel, now) } }
}

function actionSummary(action: FileAction): string {
  if (action.kind === "skip") return `skip ${action.path}: ${action.reason}`
  return `write ${action.path}${action.backupTo ? ` backup ${action.backupTo}` : ""}`
}
