# Upstream Mapping

Structural differences between [JukeeBox/JukeBox_TypeScript](https://github.com/JukeeBox/JukeBox_TypeScript) (upstream) and this fork. Use this to translate upstream diffs into fork paths.

## `editor/changes/`

Upstream has a single `editor/changes.ts`. This fork splits it into modules under `editor/changes/`:

| Upstream content | Fork path |
|---|---|
| Song-level changes (`ChangeTempo`, `ChangeOctaveCount`, etc.) | `editor/changes/song.ts` |
| Instrument changes (`ChangePreset`, `ChangeChipWave`, etc.) | `editor/changes/instruments.ts` |
| Note/pattern changes (`ChangeNoteAdded`, `ChangeTranspose`, etc.) | `editor/changes/notes.ts` |
| Filter changes (`ChangeEQFilterType`, etc.) | `editor/changes/filters.ts` |
| Slider changes (`ChangeVolume`, `ChangePan`, etc.) | `editor/changes/sliders.ts` |
| Utilities (`generateScaleMap`, `discardInvalidPatternInstruments`) | `editor/changes/util.ts` |
| Exports | `editor/changes/index.ts` (barrel) |

## `synth/`

Upstream has a single `synth/synth.ts`. This fork splits it into modules:

| Upstream content | Fork path |
|---|---|
| `Song` class, serialization/deserialization | `synth/song.ts` |
| `SongTagCode`, `base64IntToCharCode`, `BitFieldReader/Writer` | `synth/serialization.ts` |
| `Instrument` class | `synth/instruments.ts` |
| `Note`, `Pattern`, `Channel` classes | `synth/channels.ts`, `synth/notes.ts` |
| Chip waves, noise definitions | `synth/waves.ts` |
| Shared utilities (`clamp`, etc.) | `synth/util.ts` |
| Re-exports | `synth/index.ts` |
| `Config`, `InstrumentType`, enums | `synth/SynthConfig.ts` (unchanged) |

## 1:1 mapping (no structural change)

These directories map directly — upstream file paths match fork paths:

- `editor/*.ts` (except `changes.ts`)
- `player/*.ts`
- `global/*.ts`

## Quick reference

When reading an upstream diff:

1. `editor/changes.ts` → determine concern (song/instrument/note/filter/slider) → corresponding `editor/changes/*.ts`
2. `synth/synth.ts` → `Song` class → `synth/song.ts`, serialization → `synth/serialization.ts`, instruments → `synth/instruments.ts`
3. Everything else → same path in both repos
