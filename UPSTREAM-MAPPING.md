# Upstream Mapping

Structural differences between upstream (`~/JukeBox_TypeScript`, [JukeeBox/JukeBox_TypeScript](https://github.com/JukeeBox/JukeBox_TypeScript)) and this fork. Use this to translate upstream diffs into fork paths.

## `editor/changes/`

Upstream has a single `editor/changes.ts`. This fork splits it into modules under `editor/changes/`:

| Upstream content | Fork path |
|---|---|
| Song-level changes (`ChangeTempo`, `ChangeOctaveCount`, `ChangeVolume`, `ChangePan`, etc.) | `editor/changes/song.ts` |
| Instrument changes (`ChangePreset`, `ChangeChipWave`, etc.) | `editor/changes/instruments.ts` |
| Note/pattern changes (`ChangeNoteAdded`, `ChangeTranspose`, etc.) | `editor/changes/notes.ts` |
| Filter changes (`ChangeEQFilterType`, etc.) | `editor/changes/filters.ts` |
| Slider changes (`ChangeEchoDelay`, `ChangeReverb`, etc.) | `editor/changes/sliders.ts` |
| Utilities (`generateScaleMap`, `discardInvalidPatternInstruments`) | `editor/changes/util.ts` |
| Exports | `editor/changes/index.ts` (barrel) |

## `editor/` (other extractions)

| Fork file | Extracted from | Content |
|---|---|---|
| `editor/rendering/themes/*.ts` | `editor/ColorConfig.ts` | Theme CSS definitions split into one file per theme |
| `editor/config/preset-categories.ts` | `editor/EditorConfig.ts` | Preset instrument categories and `Preset`/`PresetCategory` interfaces |
| `editor/rendering/custom-chip-canvas.ts` | `editor/SongEditor.ts` | `CustomChipCanvas` class for waveform editing |
| `editor/rendering/custom-algorythm-canvas.ts` | `editor/SongEditor.ts` | `CustomAlgorythmCanvas` class for FM algorithm editing |

## `synth/`

Upstream has a single `synth/synth.ts`. This fork splits it into modules:

| Upstream content | Fork path |
|---|---|
| `Song` class, serialization/deserialization | `synth/song.ts` |
| `SongTagCode`, `base64IntToCharCode`, `BitFieldReader/Writer` | `synth/serialization.ts` |
| `Instrument` class | `synth/instruments.ts` |
| `Note`, `Pattern`, `Channel` classes | `synth/channels.ts`, `synth/notes.ts` |
| Spectrum, harmonics, granular waveform classes | `synth/waves.ts` |
| Shared utilities (`clamp`, etc.) | `synth/util.ts` |
| Re-exports | `synth/index.ts` |
| `Config`, `InstrumentType`, enums, chip wave/noise presets | `synth/synth-config.ts` |
| Synthesis engine (remaining after extraction) | `synth/synth.ts` (reduced from upstream) |
| `PickedString` class (extracted from synth.ts) | `synth/picked-string.ts` |
| `EnvelopeComputer` class (extracted from synth.ts) | `synth/envelope-computer.ts` |
| `Tone` class (extracted from synth.ts) | `synth/tone.ts` |
| `InstrumentState` class (extracted from synth.ts) | `synth/instrument-state.ts` |
| `ChannelState` class (extracted from synth.ts) | `synth/channel-state.ts` |
| Shared filter coefficients and volume utilities (extracted from `Synth` statics) | `synth/synth-shared.ts` |
| Shared with upstream (unchanged) | `synth/deque.ts`, `synth/fft.ts`, `synth/filtering.ts` |

## 1:1 mapping (no structural change)

These directories map directly — upstream file paths match fork paths:

- `player/*.ts`
- `shared/events.ts` (upstream: `global/Events.ts`)
- `shared/oscilloscope.ts` (upstream: `global/Oscilloscope.ts`)

## Renamed files (kebab-case)

All fork files use kebab-case. Key upstream-to-fork name translations:

| Upstream name | Fork name |
|---|---|
| `SynthConfig.ts` | `synth/synth-config.ts` |
| `SongEditor.ts` | `editor/song-editor.ts` |
| `SongDocument.ts` | `editor/song-document.ts` |
| `ColorConfig.ts` | `editor/rendering/color-config.ts` |
| `EditorConfig.ts` | `editor/config/editor-config.ts` |
| `Change.ts` | `editor/core/change.ts` |
| `Selection.ts` | `editor/core/selection.ts` |
| `Preferences.ts` | `editor/core/preferences.ts` |
| All `*Prompt.ts` files | `editor/prompts/*-prompt.ts` (kebab-case) |
| All component files | `editor/components/*-*.ts` (kebab-case) |

## Quick reference

When reading an upstream diff:

1. `editor/changes.ts` → determine concern (song/instrument/note/filter/slider) → corresponding `editor/changes/*.ts`
2. `synth/synth.ts` → `Song` class → `synth/song.ts`, serialization → `synth/serialization.ts`, instruments → `synth/instruments.ts`
3. PascalCase filenames → convert to kebab-case (see table above)
4. `global/*.ts` → `shared/*.ts`
5. Everything else → same path (with kebab-case name)

For direct local comparison: `git diff upstream/main...HEAD` or `diff -rq ~/JukeBox_TypeScript/editor ./editor`.
