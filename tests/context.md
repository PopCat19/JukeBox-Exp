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
- `song-document-integration.test.ts`, Integration tests for Sprint 1 refactorings and song serialization
- `plugin-round-trip.test.ts`, Per-plugin-type instrument round-trip encode/decode tests
- `song-round-trip.test.ts`, Integration tests for song serialization round-trip encode/decode
- `song-serialization.test.ts`, Unit tests for song serialization API and failure resilience
- `synth-math.test.ts`, Unit tests for pure synth math utilities (getLFOAmplitude, computeChordExpression, operatorAmplitudeCurve, adjacentNotesHaveMatchingPitches, volume conversion round-trips)
- `synth-utilities.test.ts`, Unit tests for synth utility functions

## Source-to-test cross-reference

See `TESTING.md` for the full cross-reference table mapping source modules
to their test files, including modules with no test coverage.
