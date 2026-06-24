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

**Goal:** Eliminate repetitive Change subclasses.

| Change | Files | Rationale |
|---|---|---|
| 2.1 Generic `ChangeFieldValue` | New `editor/changes/field-value.ts` | ~30 simple Change classes in `changes/song.ts`, `changes/instruments/tone.ts`, etc. follow the pattern: get oldValue, set newValue, notify. One class with `(target, key, old, new)` replaces them. |
| 2.2 Data-driven slider changes | `editor/changes/sliders.ts` | 30+ `ChangeXxxSlider` subclasses differ only by property name and min/max. Replace with `ChangeSliderValue(doc, 'propertyName', min, max, old, new)`. Keep named exports as thin wrappers if callers rely on them. |
| 2.3 Remove local `ChangeSongTitle` | `editor/components/song-settings-panel.ts` | Duplicate of `changes/song.ts:563`. Delete local class, import from `changes`. |

**Validation:** `bun test` (undo/redo coverage), manual undo/redo in editor.

**Risk:** Callers that `instanceof` check specific Change classes — grep before replacing. If found, keep named aliases (`export const ChangeTempo = ChangeFieldValue.bind(null, ...)` pattern).

---

## Phase 3 · Input binding consolidation (DRY + KISS)

**Goal:** Replace 14 identical one-liner files with a single helper.

| Change | Files | Rationale |
|---|---|---|
| 3.1 Create `byConcern` helper | `editor/input/concerns/by-concern.ts` | `export const byConcern = (c: InputConcern) => inputBindings.filter(b => b.concern === c);` |
| 3.2 Replace 14 files | `editor/input/concerns/*.ts` | Each file becomes a one-line re-export or is deleted in favor of inline calls. |
| 3.3 Update barrel | `editor/input/concerns/index.ts` | Re-export `byConcern` and the concern constants. |

**Validation:** `bun run typecheck:all`, grep for stale imports.

**Risk:** Tree-shaking — confirm esbuild still includes bindings used by prompts.

---

## Phase 4 · Stratification: move synth logic out of synth.ts (SoC + SRP)

**Goal:** `synth.ts` ≤ 1500 lines; per-instrument logic lives in plugins.

| Change | Files | Rationale |
|---|---|---|
| 4.1 Delegate synth functions to plugins | `synth/plugins/*.ts`, `synth/synth.ts` | Static methods `chipSynth`, `harmonicsSynth`, etc. in `synth.ts` (~200 lines) duplicate the `getSynthFunction` path. Move implementations into each plugin's `getSynthFunction` body. Delete `_synthFunctionRegistry` and the 10 static methods. |
| 4.2 Extract modulator resolution | New `synth/modulator-resolution.ts` | ~300 lines of mod value computation in `synth.ts`. Single `resolveModulators(synth, song, channelIndex, instrumentIndex, bufferIndex, samplesPerTick)` function. |
| 4.3 Extract effects dispatch | `synth/plugins/effects.ts` or new `synth/effects-dispatch.ts` | `effectsSynth` method and signature bitmask (~100 lines). Keep in plugin or dedicated module. |
| 4.4 Split `song-serialization.ts` (4548 lines) | New `synth/formats/legacy-compat.ts`, `synth/formats/jukebox-exp.ts` | Move legacy format parsing out of main serializer. Each file ≤ 1000 lines. |

**Validation:** `bun test` (serialization round-trips), `bun run typecheck:synth`, manual playback of songs with each instrument type.

**Risk:** Dynamic `new Function()` compilation depends on closure over `Config` and `Synth`. Confirm plugins can pass these through without circular deps.

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
