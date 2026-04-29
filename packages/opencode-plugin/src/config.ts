import { applyEdits, findNodeAtLocation, getNodeValue, modify, parse, parseTree, type ParseError } from "jsonc-parser"
import { PACKAGE_NAME } from "./types"

export type MergeResult =
  | { ok: true; changed: boolean; output: string }
  | { ok: false; changed: false; error: string }

export function mergePluginConfig(input: string): MergeResult {
  const errors: ParseError[] = []
  const root = parseTree(input, errors, { allowTrailingComma: true, disallowComments: false })
  if (!root || errors.length > 0) {
    return { ok: false, changed: false, error: `Failed to parse OpenCode config: ${errors.map((e) => e.error).join(", ")}` }
  }

  const parsed = parse(input, errors, { allowTrailingComma: true, disallowComments: false }) as Record<string, unknown>
  if (errors.length > 0 || typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, changed: false, error: "OpenCode config must be a JSON object" }
  }

  const pluginNode = findNodeAtLocation(root, ["plugin"])
  if (!pluginNode) {
    const edits = modify(input, ["plugin"], [PACKAGE_NAME], { formattingOptions: { insertSpaces: true, tabSize: 2 } })
    return { ok: true, changed: true, output: applyEdits(input, edits) }
  }

  const current = getNodeValue(pluginNode)
  if (!Array.isArray(current)) {
    return { ok: false, changed: false, error: "OpenCode config field plugin must be an array" }
  }

  if (current.includes(PACKAGE_NAME)) {
    return { ok: true, changed: false, output: input }
  }

  const edits = modify(input, ["plugin", -1], PACKAGE_NAME, { formattingOptions: { insertSpaces: true, tabSize: 2 } })
  return { ok: true, changed: true, output: applyEdits(input, edits) }
}
