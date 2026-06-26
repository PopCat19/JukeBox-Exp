# TESTING

Purpose: Conventions and cross-references for the test suite (bun:test).

Designed for an AI-driven codebase. Every convention reduces ambiguity
for an LLM generating or modifying tests.

## Finding the test for a source module

Use the cross-reference table below. If no test file is listed, the
module has no dedicated test coverage. Add a test file when modifying
an uncovered module.

### synth/

| Source | Test file | Scope |
|--------|-----------|-------|
| `synth/util.ts` | `tests/synth-utilities.test.ts` | clamp, validateRange, fittingPowerOfTwo, fade conversion |
| `synth/synth-config.ts` | `tests/synth-utilities.test.ts` | performIntegral, getPulseWidthRatio, getArpeggioPitchIndex, effects helpers, EffectType, Config |
| `synth/synth-config.ts` | `tests/song-document-integration.test.ts` | hasEffect, effectsIncludeTransition, effectsIncludeChord |
| `synth/synth-math.ts` | `tests/synth-math.test.ts` | getLFOAmplitude, computeChordExpression, operatorAmplitudeCurve, adjacentNotesHaveMatchingPitches, volume conversion |
| `synth/synth-shared.ts` | `tests/synth-math.test.ts` | instrumentVolumeToVolumeMult, noteSizeToVolumeMult |
| `synth/dsp-utils.ts` | `tests/dsp-utils.test.ts` | applyFilters, sanitizeDelayLine, findRandomZeroCrossing |
| `synth/filtering.ts` | `tests/filtering.test.ts` | FilterCoefficients, FrequencyResponse, DynamicBiquadFilter, warp functions |
| `synth/notes.ts` | `tests/notes.test.ts` | Note, Pattern, makeNotePin |
| `synth/song.ts` | `tests/song-serialization.test.ts` | toBase64String, fromBase64String, failure resilience |
| `synth/song.ts` | `tests/song-round-trip.test.ts` | round-trip encode/decode, modified song, toJsonObject/fromJsonObject |
| `synth/song.ts` | `tests/song-document-integration.test.ts` | hasEffect, effects bitmask round-trip |
| `synth/song.ts` | `tests/plugin-round-trip.test.ts` | per-type instrument encode→decode |
| `synth/instruments/` | `tests/synth-math.test.ts` | Instrument usage in operatorAmplitudeCurve |
| `synth/serialization.ts` | `tests/song-serialization.test.ts` | base64CharCodeToInt, base64IntToCharCode, getNeededBits |
| `synth/formats/jukebox-exp.ts` | `tests/barrel-exports.test.ts` | fromJukeboxExpJson, toJukeboxExpJson (indirect) |
| `synth/index.ts` (barrel) | `tests/barrel-exports.test.ts` | All synth re-exports |
| `synth/plugins/` | `tests/barrel-exports.test.ts` | Plugin registry barrel |
| `synth/synthesis/` | `tests/barrel-exports.test.ts` | Synthesis source builders barrel |
| `synth/synthesis/chip.ts` | `tests/synthesis.test.ts` | buildChipSource, buildLoopableChipSource |
| `synth/synthesis/drum.ts` | `tests/synthesis.test.ts` | buildDrumSource |
| `synth/synthesis/effects.ts` | `tests/synthesis.test.ts` | buildEffectsSource |
| `synth/synthesis/fm.ts` | `tests/synthesis.test.ts` | buildFmSource |
| `synth/synthesis/fm6.ts` | `tests/synthesis.test.ts` | buildFm6Source |
| `synth/synthesis/harmonics.ts` | `tests/synthesis.test.ts` | buildHarmonicsSource |
| `synth/synthesis/noise.ts` | `tests/synthesis.test.ts` | buildNoiseSource |
| `synth/synthesis/picked-string.ts` | `tests/synthesis.test.ts` | buildPickedStringSource |
| `synth/synthesis/pulse.ts` | `tests/synthesis.test.ts` | buildPulseWidthSource |
| `synth/synthesis/spectrum.ts` | `tests/synthesis.test.ts` | buildSpectrumSource |
| `synth/synthesis/supersaw.ts` | `tests/synthesis.test.ts` | buildSupersawSource |
| `synth/config/` | `tests/barrel-exports.test.ts` | Config, types, utils barrel |
| `synth/formats/` | `tests/barrel-exports.test.ts` | JukeboxExp + legacy compat barrel |
| `synth/synth.ts` | `tests/synth-contract.test.ts` | Public API surface after extraction (sanitizeFilters delegation, removed legacy fields) |

**Untested synth modules:** `tone.ts`, `channels.ts`, `channel-state.ts`,
`envelope-computer.ts`, `mod-state.ts`, `fft.ts`, `waves.ts`, `deque.ts`,
`picked-string.ts`, `song-utilities.ts`, `instrument-state.ts`,
`config/sample-loader.ts` (barrel verified),
`formats/legacy-compat.ts` (barrel verified).

**Instrument type round-trips (tested):** chip, fm, noise, spectrum, drumset,
harmonics, pwm, pickedString, supersaw, customChipWave, mod, fm6op.
All 12 types verified via encode→decode→type-preservation.

### editor/

| Source | Test file | Scope |
|--------|-----------|-------|
| `editor/input/inventory.ts` | `tests/input-inventory.test.ts` | InputBinding, inputBindings |
| `editor/components/pattern-editor.ts` | `tests/pattern-editor-contract.test.ts` | Stale canvas path guard, SVG/canvas y-center alignment |
| `editor/components/loop-editor.ts` | `tests/loop-editor-contract.test.ts` | CSS class for disabled state, no inline opacity conflict |
| `editor/ui/index.ts` (barrel) | `tests/barrel-exports.test.ts` | buildOptions, numberInput, Slider, Layout, createDiv, etc. |
| `editor/song-editor.ts` | `tests/loop-editor-contract.test.ts` | Focus-steal listeners for buttons/selects |

**Untested editor modules:** All `editor/core/`, `editor/changes/`,
`editor/prompts/`, `editor/renderers/`,
`editor/rendering/`, `editor/io/`, `editor/config/`,
`editor/ui/*` subdirectories (except barrel), `editor/main.ts`,
`editor/song-document.ts`,
`editor/song-custom-samples.ts`, `editor/components/mute-editor.ts`.

### shared/

| Source | Test file | Scope |
|--------|-----------|-------|
| `shared/color-utils.ts` | `tests/shared-utilities.test.ts` | parseCssColor, hslToRgb, oklchToHex, formatColorForTab, hexToRgb, rgbToHex, etc. |
| `shared/pmd/color.ts` | `tests/shared-utilities.test.ts` | safeOklchToRgb, oklchToRgb |
| `shared/color-config.ts` | `tests/shared-utilities.test.ts` | colorConfig (indirect through color utils) |
| `shared/events.ts` | `tests/barrel-exports.test.ts` | events (indirect) |
| `shared/spectrum.ts` | none | Spectrogram type exports |

## Test structure: every file

```
// <filename>.test.ts
//
// Purpose: <one-line intent>
//
// This module:
// - <verb-led scope item>

import { describe, test, expect } from "bun:test";
// imports from source modules: prefer direct paths over barrels for unit tests
// use barrel imports only for barrel-contract tests (tests/barrel-exports.test.ts)

describe("<group name>", () => {
  test("<does what>", () => {
    expect(actual).toBe(expected);  // concrete value, not "is defined"
  });
});
```

### Assertion rules

- Every `test()` must contain at least one `expect()` that would fail if
  the code under test has a real bug. No bare "didn't crash" tests.
- No `toBeDefined()` or `toBeTruthy()` — use `typeof`, `.length`, or
  concrete value comparison instead.
- After a bare `not.toThrow()`, add a follow-up state assertion that
  verifies the operation produced correct output.
- No `toBe(true)` / `toBe(false)` — use `toBeTrue()` / `toBeFalse()`.
- Property-based invariants over magic constants where possible
  (monotonic sequence, round-trip idempotence, range bounds).

### Import conventions

- Unit tests: import directly from the source file
  (`../synth/synth-math`). Avoid barrel paths for unit tests.
- Barrel contract tests: import from the barrel (`../synth`).
  These go in `tests/barrel-exports.test.ts` only.
- Shared helpers: import from `./test-helpers`.

### When to add a test

- Adding a new source module: add a test file in `tests/` following
  the naming convention `<module-name>.test.ts`.
- Fixing a bug: add a regression test that would have caught the bug
  before fixing.
- Refactoring: verify existing tests pass before the change. If no
  tests exist, add a round-trip test for the refactored path.
- Modifying an untested module (unmarked in the table above): add
  coverage as part of the change — one test per public function at minimum.

### Running tests

```
bun test                     # all tests
bun test --filter "getLFO"   # run tests matching "getLFO"
```

Always run `bun test && bun run typecheck:all` before committing.

## Adding a new test file

1. Create `tests/<module-name>.test.ts`
2. Add the Purpose header (see structure section above)
3. Add describe/test blocks matching the source module's exports
4. Import from `./test-helpers` for Song/Instrument factories
5. Update `tests/context.md` with the new file entry
6. Add a row to this file's cross-reference table
