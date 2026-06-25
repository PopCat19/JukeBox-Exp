# 2026-06-24 Tree-Wide Refactor Schedule

Purpose: Phased plan for DRY, SoC, KISS, and stratification improvements across editor, synth, and shared domains. Each phase lists scope, concrete targets, validation steps, and risk notes.

---

## Phase 0 · Prep (this session)

| Task | Detail |
|---|---|
| Snapshot baseline | Run `bun test && bun run typecheck:all && bun run lint` and record pass/fail. |
| Freeze feature work | No feature commits until Phase 1 lands on a branch (`refactor/foundation`). |
| Branch strategy | One branch per phase; squash after green checks. |

---

## Phase 1 · Shared Kernel consolidation (DRY + SoC)

**Status: COMPLETE** (2026-06-24)

**Goal:** Single source of truth for cross-domain utilities.

| Change | Files | Status |
|---|---|---|
| 1.1 Merge color conversion | `shared/color-utils.ts`, `shared/pmd/color.ts` | ✓ rgbToHex, hexToRgb, maxOklchChroma, clampOklchChroma added to color-utils; pmd/color.ts re-exports; dead getContrastColor removed |
| 1.2 Extract `setSelectedValue` | New `editor/ui/select-helpers.ts` | ✓ Single export with optional select2 flag; barrel exported from ui/index.ts; 4 renderer files updated |
| 1.3 Extract `buildOptions` | `editor/ui/build-helpers.ts` (already exists) | ✓ 6 local copies deleted; imports redirected to shared barrel |
| 1.4 Extract `numberInput` | `editor/ui/build-helpers.ts` (already exists) | ✓ 2 local copies deleted; imports redirected to shared barrel |
| 1.5 Extract `wrap` utility | `synth/util.ts` | ✓ Shared wrap() added; Synth.wrap delegates to it; add-samples-prompt uses import; barrel exported from synth/index.ts |
| 1.6 Extract `hexToRgb` | `shared/color-utils.ts` | ✓ Private _hexToRgb in CVV prompt replaced with shared import |
| 1.7 Remove local `ChangeSongTitle` | `editor/components/song-settings-panel.ts` | ✓ Replaced with import from ../changes; canonical version handles title truncation and doc title update |

**Validation:** `bun run typecheck:all`, `bun test`, manual spot-check of color themes, select dropdowns, sample prompt.

**Risk:** Select2 DOM coupling in `setSelectedValue` — confirm jQuery is available in all call sites.

---

## Phase 2 · Change system DRY (DRY + KISS)

**Status: COMPLETE** (2026-06-24)

**Goal:** Eliminate repetitive Change subclasses.

| Change | Files | Status |
|---|---|---|
| 2.1 Generic `ChangeFieldValue` | New `editor/changes/field-value.ts` | ✓ Created generic class with options for target, property, clamp, maxLength, afterSet, unsetModKey. |
| 2.2 Data-driven slider changes | `editor/changes/sliders.ts` | ○ Existing slider changes extend ChangeInstrumentSlider; consider refactoring to use ChangeFieldValue with preset setting. |
| 2.3 Remove local `ChangeSongTitle` | `editor/components/song-settings-panel.ts` | ✓ Already done in Phase 1. |
| 2.4 Refactor simple song-level changes | `editor/changes/song.ts` | ✓ Refactored ChangeTempo, ChangeSongReverb, ChangeVolume, ChangePan, ChangePanDelay, ChangeOctave, ChangeKey, ChangeKeyOctave, ChangeSongTitle, ChangeChannelName to use ChangeFieldValue. |

**Validation:** `bun test` (undo/redo coverage), manual undo/redo in editor.

**Risk:** Callers that `instanceof` check specific Change classes — grep before replacing. If found, keep named aliases (`export const ChangeTempo = ChangeFieldValue.bind(null, ...)` pattern).

---

## Phase 3 · Input binding consolidation (DRY + KISS)

**Status: COMPLETE** (2026-06-24)

**Goal:** Replace 14 identical one-liner files with a single helper.

| Change | Files | Status |
|---|---|---|
| 3.1 Create `byConcern` helper | `editor/input/concerns/by-concern.ts` | ✓ Created function that filters inputBindings by concern. |
| 3.2 Replace 14 files | `editor/input/concerns/*.ts` | ✓ All 14 concern files now use byConcern helper. |
| 3.3 Update barrel | `editor/input/concerns/index.ts` | ✓ Added byConcern export. |

**Validation:** `bun run typecheck:all`, grep for stale imports.

**Risk:** Tree-shaking — confirm esbuild still includes bindings used by prompts.

---

## Phase 4 · Stratification: move synth logic out of synth.ts (SoC + SRP)

**Status: PARTIAL** (2026-06-24) — 4.1 complete

**Goal:** `synth.ts` ≤ 1500 lines; per-instrument logic lives in plugins.

| Change | Files | Status |
|---|---|---|
| 4.1 Delegate synth functions to plugins | `synth/plugins/*.ts`, `synth/synth.ts` | ✓ Moved 9 private static synth functions + 9 function caches out of synth.ts into their respective plugins (chip, harmonics, noise, drumset, spectrum, pulse, supersaw, picked-string). Removed bridge registry (_synthFunctionRegistry, registerSynthFunction, getStaticSynthFunction, static initializer block, loopableChipSynth). modSynth remains in synth.ts (accesses private members bar/tick/beat/part/wantToSkip) with a public runModSynth bridge. synth.ts reduced from 5021→4870 lines (−151, ~47 from function bodies + ~104 from bridge + caches). |
| 4.2 Extract modulator resolution | New `synth/modulator-resolution.ts` | ○ Not yet started. |
| 4.3 Extract effects dispatch | `synth/plugins/effects.ts` or new `synth/effects-dispatch.ts` | ○ Not yet started. effectsSynth still in synth.ts. |
| 4.4 Split `song-serialization.ts` (4548→3750 lines) | New `synth/formats/json-serialization.ts` (501 lines) | ✓ Extracted toJsonObjectImpl, fromJsonObjectImpl, FORMAT constant, and 5 legacy name tables from song-serialization.ts into synth/formats/json-serialization.ts. Updated consumers (song.ts, jukebox-exp.ts, legacy-compat.ts) to import JSON functions from new location. song-serialization.ts reduced from 4548→3750 lines (−798). All 173 tests pass, typecheck clean. |

**Validation:** `bun test` (serialization round-trips), `bun run typecheck:synth`, manual playback of songs with each instrument type.

**Risk:** Dynamic `new Function()` compilation depends on closure over `Config` and `Synth`. Each plugin now owns its own caches — verified that all generated code references work via the value-imported `Synth` and `Config` globals.

---

## Phase 5 · Editor file size reduction (SRP + KISS)

**Goal:** Files > 1000 lines split by concern.

| File | Lines | Proposed split |
|---|---|---|
| `editor/song-editor.ts` | 3798 | Extract `editor-setup.ts` (DOM construction), `editor-bindings.ts` (keyboard/mouse wiring), `editor-render-loop.ts` (rAF scheduling). Keep `SongEditor` as thin orchestrator. |
| `editor/prompts/import-prompt.ts` | 1514 | Extract `midi-parser.ts`, `midi-track-assigner.ts`, `midi-drum-mapper.ts`. |
| `editor/prompts/channel-volume-visualizer-prompt.ts` | 1761 | Extract `spectrum-renderer.ts`, `channel-volume-controls.ts`. |
| `editor/core/dev-inspector.ts` | 806 | Borderline; leave as-is unless it grows. |
| `editor/renderers/instrument-visibility.ts` | 699 | Within limit; no split needed. |

**Validation:** `bun run typecheck`, manual editor smoke test.

---

## Phase 6 · Context.md and header audit (Convention compliance)

**Goal:** Every folder with ≥5 files has a `context.md`; every file listed has a `Purpose:` header.

| Task | Detail |
|---|---|
| 6.1 Add missing context.md | `editor/input/concerns/` (after Phase 3), `editor/changes/instruments/` (already has files but no context.md). |
| 6.2 Verify headers | Run `grep -rL "Purpose:" editor/ synth/ shared/ player/` — add headers to any file missing one. |
| 6.3 Sync context.md entries | After all splits, update `context.md` in each modified folder. |

---

## Sequencing

```
Phase 0 (prep) → Phase 1 (shared) → Phase 2 (changes) → Phase 3 (bindings)
                                                          ↓
                                        Phase 4 (synth stratification)
                                                          ↓
                                        Phase 5 (editor split)
                                                          ↓
                                        Phase 6 (context audit)
```

Phases 1–3 can be merged into a single PR if preferred. Phase 4 should land separately (synth-only). Phase 5 is editor-only. Phase 6 is a final sweep.

---

## Metrics to track

| Metric | Target |
|---|---|
| Longest file | ≤ 1500 lines |
| Duplicate function count | 0 (grep for known duplicates after each phase) |
| `bun test` pass rate | 100% |
| `bun run typecheck:all` | 0 errors |
| `bun run lint` | 0 warnings (Biome + ESLint) |

---

## Open questions (resolve before Phase 2)

1. Does any code use `instanceof ChangeTempo` (or similar named Change classes)? If yes, Phase 2 needs aliased exports.
2. Is jQuery/select2 available in the player context? If not, `setSelectedValue` with select2 flag needs a guard.
3. Are the 14 concern binding files imported by anything outside the editor? (Check player and synth imports.)
