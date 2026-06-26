# tests/ context

Purpose: bun:test test files covering editor, synth, and shared modules.

## Files

- `test-helpers.ts`, Shared test fixtures (Song factories, assertion helpers)
- `TESTING.md`, Conventions doc + source-to-test cross-reference table
- `barrel-exports.test.ts`, Barrel re-export contract tests for synth, editor/ui, shared
- `debug-tools.test.ts`, Tests for __jukebox__ debug utilities
- `dsp-utils.test.ts`, Unit tests for pure DSP utility functions (applyFilters, sanitizeDelayLine, findRandomZeroCrossing)
- `filtering.test.ts`, Unit tests for digital filter coefficient computation and frequency response
- `input-inventory.test.ts`, Unit tests for input binding inventory and concern modules
- `notes.test.ts`, Unit tests for note and pattern data structures
- `pattern-editor-contract.test.ts`, Structural contract tests for pattern-editor.ts rendering invariants (stale canvas path, SVG/canvas y-center alignment)
- `loop-editor-contract.test.ts`, Structural contract tests for loop-editor.ts UI invariants (CSS class for disabled state, no inline opacity conflict) and song-editor.ts focus-steal listeners (mouseup blur buttons, keydown intercept Space on button/select)
- `song-document-integration.test.ts`, Integration tests for Sprint 1 refactorings and song serialization
- `plugin-round-trip.test.ts`, Per-plugin-type instrument round-trip encode/decode tests
- `song-round-trip.test.ts`, Integration tests for song serialization round-trip encode/decode
- `song-serialization.test.ts`, Unit tests for song serialization API and failure resilience
- `synthesis.test.ts`, Unit tests for synthesis source string builders (chip, drum, effects, FM, FM6, harmonics, noise, picked-string, pulse, spectrum, supersaw)
- `synth-contract.test.ts`, Systematic contract tests for extraction safety: generated-source drift (Category A), host interface snapshot rot (Category B), cross-field contamination (Category C), barrel export erosion (Category D)
- `deque.test.ts`, Unit tests for Deque<T> — FIFO/LIFO order, capacity expansion, index get/set/remove, empty errors
- `fft.test.ts`, Unit tests for FFT module — scaleElementsByFactor, discreteFourierTransform, fastFourierTransform, forward/inverse real FFT round-trip
- `tone.test.ts`, Unit tests for Tone — constructor, reset, state defaults
- `channels.test.ts`, Unit tests for Channel and ChannelState — defaults, arrays, audio buffer sizing
- `waves.test.ts`, Unit tests for waves module — SpectrumWave constructor/reset/hash, SpectrumWaveState caching
- `envelope-computer.test.ts`, Unit tests for EnvelopeComputer — constructor, reset, computeEnvelope static (all envelope types), computePitchEnvelope, getLowpassCutoffDecayVolumeCompensation
- `picked-string.test.ts`, Unit tests for PickedString — constructor, reset, coefficient defaults
- `instrument-state.test.ts`, Unit tests for InstrumentState — constructor, tone pools, flag defaults, type/unison/effect defaults
- `song-utilities.test.ts`, Unit tests for song-utilities — envelopeFromLegacyIndex, isProperUrl, restoreChipWaveListToDefault, clearSamples

## Source-to-test cross-reference

See `TESTING.md` for the full cross-reference table mapping source modules
to their test files, including modules with no test coverage.
