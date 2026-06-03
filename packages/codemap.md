# packages/

## Responsibility

###### Integration package workspace
`packages/` contains distributable integration packages that extend CoPaper beyond the Python CLI. The current package is `opencode-plugin/`, the OpenCode integration published as `@copaper/opencode`.

###### Package-level navigation
This aggregate map points maintainers to package boundaries and cross-package responsibilities. For OpenCode-specific entry points, tools, tests, and release risks, see [packages/opencode-plugin/codemap.md](opencode-plugin/codemap.md).

## Directory Map

###### `opencode-plugin/`
OpenCode integration package with a Bun/TypeScript plugin export, `copaper-opencode` installer CLI, command templates, agent profiles, dashboard/status tools, Python CLI bridge helpers, scripts, tests, and package metadata.

## Data & Control Flow

###### Package build path
Source package code builds from `opencode-plugin/src/` into `opencode-plugin/dist/`. `package.json` exposes `./dist/index.js` as the plugin export and `./dist/cli.js` as the `copaper-opencode` binary.

###### Runtime interaction path
Installed OpenCode commands and plugin tools operate inside a target CoPaper project, reading workflow artifacts and using confirmed state-write bridges where mutation is required.

## Integration Points

###### OpenCode host
`opencode-plugin/` depends on `@opencode-ai/plugin` and updates OpenCode configuration plus managed `.opencode/commands/` entries during install workflows.

###### CoPaper project assets
The package connects to `paper.md`, `storyline.md`, `writingrules.md`, `.agents/` state and events, checker reports, cross-index data, and `relatedwork/` metadata in target projects.

###### Python CLI bridge
Related-work and doctor workflows can resolve the Python `copaper` CLI through a target virtual environment or `uv run --project`, reporting bridge failures as structured diagnostics.

## Maintenance Notes

###### Keep source maps aligned
Update this aggregate codemap when packages are added, removed, renamed, or their responsibilities shift. Keep detailed package internals in the package-local codemap.

###### Rebuild before release checks
Generated `dist/` output and local package tarballs can drift from TypeScript sources. Rebuild before package smoke tests, installer validation, or npm release preparation.

###### Preserve safety boundaries
Most plugin tools are read-only; state writers require explicit confirmation and path validation. New package work should preserve non-destructive installs and managed-marker protections.
