# Navigator Context

Purpose: Defines navigator contracts, persistent shell, runtime, and identity ownership rules.

## Files

- `add-samples-pane.ts` - Standalone add-samples pane wrapper with dirty-leave ownership
- `channel-volume-visualizer-pane.ts` - Standalone visualizer pane wrapper with hidden-work suspension
- `command-registry.ts` - Shared typed command metadata, ranking, argument validation, and executors
- `instrument-browser-pane.ts` - Standalone instrument browser pane wrapper
- `contracts.ts` - Pane lifecycle, decisions, commands, and retained-state contracts
- `route-identity.ts` - Canonical finite-JSON pane route identity
- `ownership.ts` - Generation-safe ownership for one live pane
- `navigator-runtime.ts` - Serialized attached and detached pane coordination
- `navigator-route-host.ts` - Transitional adapter owning flattened legacy Prompt roots and typed transient import delivery
- `native-panes.ts` - Native pane domain routing
- `navigator-detached-host.ts` - Same-origin detached window host and close coordination
- `prompt-pane-owner.ts` - Shared attached prompt-root flattening and native prompt lifecycle adapter
- `navigator-shell.ts` - Searchable PMD route workspace and attached pane host
- `index.ts` - Navigator contract barrel
