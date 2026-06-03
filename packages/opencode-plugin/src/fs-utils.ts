import { closeSync, existsSync, mkdirSync, openSync, realpathSync, renameSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, relative, resolve, sep } from "node:path"

export function assertInsideRoot(root: string, target: string): void {
  if (hasParentDirectorySegment(target)) {
    throw new Error(`Refusing to write outside root: ${target}`)
  }
  const realRoot = realpathSync(resolve(root))
  const existingAncestor = nearestExistingAncestor(target)
  const realAncestor = realpathSync(existingAncestor)
  if (!isInsideOrSame(realRoot, realAncestor)) {
    throw new Error(`Refusing to write outside root: ${target}`)
  }
}

export function backupPathFor(root: string, relativePath: string, now = new Date()): string {
  if (isAbsolute(relativePath)) {
    throw new Error(`Refusing to create backup outside backup directory: ${relativePath}`)
  }
  const stamp = now.toISOString().replace(/[:.]/g, "-")
  const backupBase = resolve(root, ".opencode", "copaper", "backups", stamp)
  const backupPath = resolve(backupBase, relativePath)
  if (!isInsideOrSame(backupBase, backupPath)) {
    throw new Error(`Refusing to create backup outside backup directory: ${relativePath}`)
  }
  return backupPath
}

function isInsideOrSame(root: string, target: string): boolean {
  const rel = relative(root, target)
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

function hasParentDirectorySegment(target: string): boolean {
  const separators = sep === "\\" ? /[\\/]+/ : /\//
  return target.split(separators).includes("..")
}

export function writeFileAtomic(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`
  writeFileSync(tempPath, content)
  const fd = openSync(tempPath, "r")
  try { closeSync(fd) } finally { renameSync(tempPath, filePath) }
}

function nearestExistingAncestor(target: string): string {
  let current = resolve(target)
  while (!existsSync(current)) {
    const parent = dirname(current)
    if (parent === current) return current
    current = parent
  }
  return current
}
