# AGENTS.md

## Project overview

Browser-based music sketching tool. Fork of JukeBox_TypeScript / Ultrabox / JummBox / BeepBox. Song data encoded in URL hash, copy URL to save/share.

Read `README.md` for the human-facing overview.

## Project structure

3 bounded contexts:

| Directory | Purpose |
|-----------|---------|
| `editor/` | Song editor UI |
| `synth/` | Audio engine, standalone |
| `player/` | Embeddable miniature player |
| `shared/` | Shared kernel (themes, events, color, pmd) |

Other top-level dirs: `scripts/`, `tests/`, `docs/`, `concepts/`, `conventions/`, `readme_manifest/`, `tools/`, `website/`, `dist/`.

**Per-directory details live in each dir's `context.md` file.** When you need
file-level structure in a directory, read its `context.md`. That is the single
source of truth — do not duplicate its contents in decisions or plans.

## Setup commands

```bash
bun install
bun run dev              # watch + auto-reload
bun run dev:static        # watch, no reload (multi-tab safe)
bun run build            # production build → dist/
bun run build:offline    # offline-capable build
```

## Testing & quality

```bash
bun test                  # all tests
bun test --filter "name"  # subset by test name
bun run typecheck:all     # editor + synth + player separately
bun run lint              # Biome + type-check + ESLint
bun run lint:fix          # auto-fix formatting
```

Before every commit: `bun test && bun run typecheck:all`.

Test conventions and source-to-test map: `tests/TESTING.md`.

## Debug tools

Browser console (F12) on a dev build:

```js
__jukebox__.validate()               // Cross-type contamination, stale refs
__jukebox__.record.start()/stop()    // Capture ops, dump replay script
__jukebox__.replay(ops)              // Deterministic: restores song, navigates, pastes
```

## TypeScript projects

3 tsconfigs extending `tsconfig.base.json`:

- `tsconfig_editor.json` (editor/)
- `tsconfig_synth.json` (synth/)
- `tsconfig_player.json` (player/)

Typecheck individually before cross-project changes.

## Code style

- TypeScript strict mode, no implicit any
- ESLint + Biome formatting
- Follow dev-mini conventions (see `conventions/DEVELOPMENT.md`)
- Module headers carry `Purpose:` lines. `context.md` entries derive from them.
- `context.md` in directories with 5+ non-obvious files — single source of truth for file structure

## README workflow

Edit `readme_manifest/*.md`, run `bash tools/generate-readme.sh`.

## Deployment

```bash
bun run deploy       # full deploy (scripts/deploy.sh)
bun run deploy-files # built files only (scripts/deploy_files.sh)
```

## Guarded files

- `readme_manifest/*.md`, generated README sources, edit only through the manifest workflow
