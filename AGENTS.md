# AGENTS.md

## Project overview

Browser-based music sketching tool. Fork of JukeBox_TypeScript / Ultrabox / JummBox / BeepBox. Song data encoded in URL hash, copy URL to save/share.

Read `README.md` for the human-facing overview.

## Project structure

Three TypeScript projects (separate tsconfigs):

**editor/**, main editor UI and logic
- `components/`, UI widgets (pattern-editor, piano, track-editor, instrument-bar, menus, etc.)
- `core/`, change dispatch, keyboard/menu handling, preferences, selection, prompts
- `prompts/`, modal prompt dialogs (export, import, instrument browser, euclidgen, etc.)
- `ui/`, reusable UI primitives (base, buttons, chips, containers, inputs, labels, layout, prompts, rows, sliders)
- `changes/`, change types for the undo/redo system (notes, instruments, filters, sliders, song)
- `renderers/`, render logic (instrument values, effects, layout, mod settings, presets)
- `rendering/`, low-level canvas drawing (custom chip, custom algorithm)
- `config/`, editor config, keyboard layouts, preset categories
- `input/`, input inventory system
- `io/`, MIDI I/O, song recovery

**synth/**, audio synthesis engine
- `synthesis/`, per-instrument-type synthesis (fm, harmonics, pulse, noise, drum, supersaw, etc.)
- `plugins/`, plugin registry + capability interfaces (same instrument types as synthesis)
- `instruments/`, instrument data model (operator, envelope, filter settings)
- `formats/`, serialization format handling (jukebox-exp, legacy compat)
- `config/`, synth config, enums, types, instrument registry

**player/**, standalone song player (separate HTML entrypoint)

**shared/**, shared kernel
- `themes/`, 58 color theme definitions
- `color-config.ts`, `color-utils.ts`, `events.ts`, `spectrum.ts`
- `pmd/`, PMD color system (base16, variables, compositing)
- `pmd-adapter.ts`, legacy PMD to new color system bridge

**Other directories:**
- `scripts/`, build, lint, deploy, dev tooling
- `tests/`, bun:test test files (14 files, 269 tests, 3109 expect calls)
- `docs/`, architecture refactors and audits
- `concepts/`, design concept docs
- `conventions/`, dev-mini conventions reference
- `readme_manifest/`, modular README source files
- `tools/`, generate-readme.sh
- `website/`, GitHub Pages deployment output
- `dist/`, local build output

## Setup commands

```bash
bun install
bun run dev              # watch + auto-reload (single-tab; scripts/live-editor.sh)
bun run dev:static        # watch, no reload (multi-tab safe; scripts/live-editor-static.sh)
bun run build            # production build → dist/
bun run build:offline    # offline-capable build
```

## Testing & quality

```bash
bun test                  # bun:test (all tests in tests/)
bun test --filter "getLFO" # run tests matching name pattern
bun run typecheck         # tsc --noEmit (editor)
bun run typecheck:synth   # tsc --noEmit (synth)
bun run typecheck:player  # tsc --noEmit (player)
bun run typecheck:all     # all three typechecks
bun run lint              # Biome format/lint + type-check + ESLint
bun run lint:fix          # auto-fix formatting with Biome --write
```

Before every commit: `bun test && bun run typecheck:all`.

See `tests/TESTING.md` for the source-to-test cross-reference, test conventions,
and assertion rules.

## Debug tools

Open the browser console (F12) on a dev build. `window.__jukebox__` exposes:

```js
// State inspection
__jukebox__.hash()        // Decode current URL hash → readable JSON object
__jukebox__.clipboard()   // Show localStorage + system clipboard contents
__jukebox__.validate()    // Cross-type contamination, stale refs, consistency

// Action recorder, produces deterministic replay scripts
__jukebox__.record.start()   // Begin capture
__jukebox__.record.dump()    // Show captured ops so far
__jukebox__.record.stop()    // Stop, print replay script, copy to clipboard
__jukebox__.record.ops()     // Raw op array

// Replay, paste a recorded script into a fresh tab's console
__jukebox__.replay(ops)  // Deterministic: restores song, navigates, pastes
```

Recorded scripts include the initial song hash (`load` op), cursor navigation (`navigate` ops), clipboard payloads, and all Selection actions. Change ops are captured for documentation but skipped during replay (they happen as side effects). Scripts self-contained, work on a fresh blank tab.

## Separated TypeScript projects

The codebase uses three `tsconfig*.json` files (all extend `tsconfig.base.json`):
- `tsconfig_editor.json`, editor/
- `tsconfig_synth.json`, synth/
- `tsconfig_player.json`, player/

Each project has its own strictness and lib settings. Typecheck individually before committing changes that span modules.

## Code style

- TypeScript strict mode, no implicit any
- ESLint + Biome formatting (config in `eslint.config.mjs` and `biome.json`)
- Follows dev-mini conventions (reference in `conventions/DEVELOPMENT.md`)
- Module headers serve as in-code documentation
- `context.md` files in folders with 5+ non-obvious files, keep them in sync

## README workflow

Edit `readme_manifest/*.md`, then run `bash tools/generate-readme.sh`.

## Deployment

```bash
bun run deploy            # full deploy to GitHub Pages (scripts/deploy.sh)
bun run deploy-files      # deploy built files only (scripts/deploy_files.sh)
```

## Guarded files

- `readme_manifest/*.md`, generated README sources, edit only through the manifest workflow
