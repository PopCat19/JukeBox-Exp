# AGENTS.md

## Project overview

Browser-based music sketching tool. Fork of JukeBox_TypeScript / Ultrabox / JummBox / BeepBox. Song data encoded in URL hash — copy URL to save/share.

Read `README.md` for the human-facing overview.

## Project structure

Three TypeScript projects (separate tsconfigs):

**editor/** — main editor UI and logic
- `components/` — UI widgets (pattern-editor, piano, track-editor, instrument-bar, menus, etc.)
- `core/` — change dispatch, keyboard/menu handling, preferences, selection, prompts
- `prompts/` — modal prompt dialogs (export, import, instrument browser, euclidgen, etc.)
- `ui/` — reusable UI primitives (base, buttons, chips, containers, inputs, labels, layout, prompts, rows, sliders)
- `changes/` — change types for the undo/redo system (notes, instruments, filters, sliders, song)
- `renderers/` — render logic (instrument values, effects, layout, mod settings, presets)
- `rendering/` — low-level canvas drawing (custom chip, custom algorithm)
- `config/` — editor config, keyboard layouts, preset categories
- `input/` — input inventory system
- `io/` — MIDI I/O, song recovery

**synth/** — audio synthesis engine
- `synthesis/` — per-instrument-type synthesis (fm, harmonics, pulse, noise, drum, supersaw, etc.)
- `plugins/` — plugin registry + capability interfaces (same instrument types as synthesis)
- `instruments/` — instrument data model (operator, envelope, filter settings)
- `formats/` — serialization format handling (jukebox-exp, legacy compat)
- `config/` — synth config, enums, types, instrument registry

**player/** — standalone song player (separate HTML entrypoint)

**shared/** — shared kernel
- `themes/` — 58 color theme definitions
- `color-config.ts`, `events.ts`, `oscilloscope.ts`

**Other directories:**
- `scripts/` — build, lint, deploy, dev tooling
- `tests/` — bun:test test files
- `docs/` — architecture refactors and audits
- `concepts/` — design concept docs
- `conventions/` — dev-mini conventions reference
- `readme_manifest/` — modular README source files
- `tools/` — generate-readme.sh
- `website/` — GitHub Pages deployment output
- `dist/` — local build output

## Setup commands

```bash
bun install
bun run dev              # watch + auto-reload (scripts/live-editor.sh)
bun run build            # production build → dist/
bun run build:offline    # offline-capable build
```

## Testing & quality

```bash
bun test                  # bun:test (all tests in tests/)
bun run typecheck         # tsc --noEmit (editor)
bun run typecheck:synth   # tsc --noEmit (synth)
bun run typecheck:player  # tsc --noEmit (player)
bun run typecheck:all     # all three typechecks
bun run lint              # ESLint + Biome format check
bun run lint:fix          # auto-fix lint issues
```

Always run `bun test && bun run typecheck:all` before committing.

## Separated TypeScript projects

The codebase uses three `tsconfig*.json` files (all extend `tsconfig.base.json`):
- `tsconfig_editor.json` — editor/
- `tsconfig_synth.json` — synth/
- `tsconfig_player.json` — player/

Each project has its own strictness and lib settings. Typecheck individually before committing changes that span modules.

## Code style

- TypeScript strict mode, no implicit any
- ESLint + Biome formatting (config in `eslint.config.mjs` and `biome.json`)
- Follows dev-mini conventions (reference in `conventions/DEVELOPMENT.md`)
- Module headers serve as in-code documentation
- `context.md` files in folders with 5+ non-obvious files — keep them in sync

## README workflow

Edit `readme_manifest/*.md`, then run `bash tools/generate-readme.sh`.

## Deployment

```bash
bun run deploy            # full deploy to GitHub Pages (scripts/deploy.sh)
bun run deploy-files      # deploy built files only (scripts/deploy_files.sh)
```

## Guarded files

- `readme_manifest/*.md` — generated README sources, edit only through the manifest workflow
