import { BUNX_CLI_COMMAND, PACKAGE_NAME, SCHEMA_VERSION, VIBE_COMMAND, VIBE_DOCTOR_COMMAND } from "./types"

export type CommandName = typeof VIBE_COMMAND | typeof VIBE_DOCTOR_COMMAND

export function commandMarker(command: CommandName): string {
  return `<!-- VibePaper managed: ${PACKAGE_NAME}; command=${command}; schemaVersion=${SCHEMA_VERSION} -->`
}

export function hasManagedMarker(content: string, command: CommandName): boolean {
  return content.startsWith(commandMarker(command))
}

export function renderCommandTemplate(command: CommandName): string {
  if (command === VIBE_COMMAND) return renderVibeCommand()
  return renderVibeDoctorCommand()
}

function renderVibeCommand(): string {
  return `${commandMarker(VIBE_COMMAND)}
---
description: Show VibePaper project dashboard
---

Call the \`vibepaper_dashboard\` tool and display the returned content to the user.

If the tool is unavailable, tell the user:
- Run \`/vibe-doctor\` to diagnose
- Or run in terminal: \`${BUNX_CLI_COMMAND} doctor\`

Do not invent VibePaper status. Only display what the tool returns.
`
}

function renderVibeDoctorCommand(): string {
  return `${commandMarker(VIBE_DOCTOR_COMMAND)}
---
description: Diagnose VibePaper OpenCode plugin installation
---

Run this diagnostic and display the output verbatim:

!\`${BUNX_CLI_COMMAND} doctor --format markdown 2>&1 || true\`

This is a convenience wrapper. For authoritative diagnostics, run in terminal:
\`${BUNX_CLI_COMMAND} doctor\`

Do not interpret or modify the diagnostic output.
`
}
