import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { tmpdir } from "node:os"
import { createHash } from "node:crypto"

export function makeTempProject(prefix = "vibepaper-opencode-") {
  const root = mkdtempSync(join(tmpdir(), prefix))
  return {
    root,
    path: (...parts: string[]) => join(root, ...parts),
    write: (path: string, content: string) => {
      const full = join(root, path)
      mkdirSync(join(full, ".."), { recursive: true })
      writeFileSync(full, content)
    },
    read: (path: string) => readFileSync(join(root, path), "utf8"),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  }
}

export function hashTree(root: string): string {
  const hash = createHash("sha256")
  function walk(dir: string) {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name)
      const rel = relative(root, full)
      const stat = statSync(full)
      hash.update(rel)
      hash.update(stat.isDirectory() ? "dir" : "file")
      if (stat.isDirectory()) walk(full)
      else hash.update(readFileSync(full))
    }
  }
  walk(root)
  return hash.digest("hex")
}
