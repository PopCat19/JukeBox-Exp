# Navigator Context

Purpose: Defines navigator contracts, persistent shell, runtime, and identity ownership rules.

## Files

- `command-registry.ts` - Shared typed command metadata, ranking, argument validation, and executors
- `contracts.ts` - Pane lifecycle, decisions, commands, and retained-state contracts
- `route-identity.ts` - Canonical finite-JSON pane route identity
- `ownership.ts` - Generation-safe ownership for one live pane
- `navigator-runtime.ts` - Serialized attached and detached pane coordination
- `navigator-route-host.ts` - Transitional adapter owning legacy Prompt roots and typed transient import delivery
- `navigator-shell.ts` - Persistent PMD pane host shell
- `index.ts` - Navigator contract barrel
