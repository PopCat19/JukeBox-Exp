# tests/ context

Purpose: bun:test test files covering editor, synth, and shared modules.

## Files

- `test-helpers.ts`, Shared test fixtures for song serialization and round-trip tests
- `debug-tools.test.ts`, Tests for __jukebox__ debug utilities
- `dsp-utils.test.ts`, Unit tests for pure DSP utility functions (applyFilters, sanitizeDelayLine, findRandomZeroCrossing)
- `filtering.test.ts`, Unit tests for digital filter coefficient computation and frequency response
- `input-inventory.test.ts`, Unit tests for input binding inventory and concern modules
- `notes.test.ts`, Unit tests for note and pattern data structures
- `song-document-integration.test.ts`, Integration tests for Sprint 1 refactorings and song serialization
- `song-serialization.test.ts`, Unit tests for song serialization (encode/decode)
- `synth-math.test.ts`, Unit tests for pure synth math utilities (getLFOAmplitude, computeChordExpression, operatorAmplitudeCurve, adjacentNotesHaveMatchingPitches, volume conversion round-trips)
- `synth-utilities.test.ts`, Unit tests for synth utility functions
