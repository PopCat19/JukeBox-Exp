# Synth Worklet Migration — Progress Log

Status: IN PROGRESS (2026-07-07)
Branch: `dev-exp`
Commit range: `4695f9a7..2c748d80` (8 commits ahead)

## Phase 0 — Snapshot Protocol (COMPLETE)

### Deliverables

| Item | Status | Files |
|------|--------|-------|
| Snapshot types | ✅ Done | `synth/render/snapshot.ts` — SongSnapshot, ChannelSnapshot, InstrumentSnapshot, PatternSnapshot, NoteSnapshot, FilterSettingsSnapshot, etc. |
| SnapshotBuilder | ✅ Done | `synth/render/snapshot.ts` — SnapshotBuilder.build(song) deep-copies Song into immutable snapshot. Includes version (monotonic), editSequence, timestamp. |
| Unit tests | ✅ Done | `tests/synth/render/snapshot.test.ts` — 15 tests covering defaults, immutability, known structure, version monotonicity, editSequence, wave data, filter points, etc. |
| Wire into editor | ✅ Done | `editor/song-document.ts` — editSequence bumped on 3 paths: SongDocument.record() (all toolbar/UI changes), direct hash change, history navigation. |
| Builder on Synth | ✅ Done | `synth/synth.ts` — SnapshotBuilder owned on Synth, incrementEditSequence() public method. |

### Snapshots include all fields the render core reads from Song

Song-level: sampleRate, beatsPerBar, barCount, ticksPerPart, partsPerBeat, pitch/noise/mod channel counts, masterGain, eqFilter+subFilters+type, compression/limit thresholds+ratios, limitDecay, limitRise, in/outVolumeCap, channelVolumeCaps, tempo, rhythm, reverb, scaleCustom, octave, key, patternInstruments, layeredInstruments.

Transport: loopBarStart/End, loopRepeatCount, loopBarCopy, barCountOverride.

Per-channel: muted, octave, name, instruments (full), barPatternMap, patterns (full).

Per-instrument: ALL fields — type, socketModuleId, volume, pan, effects bitmask, all filters, all envelopes, all effect params (distortion, chorus, reverb, echo, phaser, ring mod, granular, bitcrush), FM params (algorithm, operators, custom algorithm/feedback), vibrato, unison, chord/arpeggio, pulse width, supersaw, string sustain, modulators, custom chip wave (Float32Array→number[]), spectrum/harmonics/drumset waves, note range/velocity limits.

### Known gaps

- `ChangeSong` history path (full song replacement via URL hash) does not go through `SongDocument.record()`. editSequence is bumped directly in `_whenHistoryStateChanged` for both direct-hash-change and back/forward navigation. Verified working.

## Phase 1 — Render Core Split (IN PROGRESS)

### Completed

| Item | Status | Files |
|------|--------|-------|
| RenderState interface | ✅ Done | `synth/render/render-core.ts` — playhead, bar/beat/part/tick, postProc, stopFade, channel ring buffers, tone pool, flags |
| renderTick() signature | ✅ Done | `renderTick(snapshot, state, outputBufferLength, playSong) → RenderResult` |
| RenderTelemetry / RenderResult types | ✅ Done | playhead, spectrum, volumeCaps |
| Post-processing extracted | ✅ Done | `renderPostProcessing()` — wraps PostProcessingState.processBlock() with SongSnapshot params. `renderStopFade()` — cubic ease-out ramp. `songParamsFromSnapshot()` — builds SongPostParams from snapshot. |
| PostProcessingState in RenderState | ✅ Done | `RenderState.postProc: PostProcessingState` |
| StopFadeState in RenderState | ✅ Done | `RenderState.stopFade: StopFadeState` |
| Tone pool management | ✅ Done | `render-core.ts` — `tonePool: Deque<Tone>` in RenderState, pure functions `allocTone`, `recycleTone`, `releaseTone`, `freeReleasedTone`, `freeAllTones`. Synth delegates. |
| playTone extracted | ✅ Done | `render-core.ts` — pure function dispatching to synthesizer, clearing envelopes. Synth delegates. |
| computeNoteExpression extracted | ✅ Done | `render-core.ts` — computes note-pin expression range from playhead + tick timing. |
| playModTone snapshot-based | ✅ Done | `render-core.ts` — reads tick timing from RenderState, instrument data from SongSnapshot. Uses computeNoteExpression. |
| Characterization tests expanded | ✅ Done | `tests/synth/render-core.test.ts` — 16 tests (4 old + 6 tone pool + 3 playTone + 3 computeNoteExpression) |
| Rename core.ts→render-core.ts | ✅ Done | Avoids `.gitignore` `core.*` pattern for core dumps |
| tsconfig_synth.json updated | ✅ Done | Both files added to synth project |

1. **Extract modulator computation**: `SynthModState.computeLatestModValues()` reads from Song to compute active modulator values at the current bar/beat/part. Must read from snapshot instead.

2. **Extract envelope/arpeggio**: The per-tick envelope and arpeggio time advancement.

3. **Build coordinator**: `synth/render/coordinator.ts` — tick scheduling, AudioBackend control, Snapshot sync at tick boundaries.

4. **Characterization test phase shift**: Once renderTick produces bit-identical output to old `synthesize()`, update the characterization tests to compare checksums and verify they match.

### Architecture rules

- Socket architecture (S1–S4) stays stable — synth core is soldered PCB, no new socket.
- render-core functions must be pure: no DOM, no AudioContext, no mutable Song reference.
- PostProcessingState is already import-free and browser-free — verified.
- The `renderPostProcessing()` function allocates dummy silence buffers only in the null-unfiltered-buffer fallback (test isolation). The coordinator path always provides real buffers.

### Next steps (in order)

1. **Extract per-tick loop**: The bar/beat/part advancement, tick countdown, and pattern-reading logic from `synthesize()` into a pure tick-advancement function.

2. **Extract `computeTone()`**: The core DSP dispatch (~1865 lines) — reads instrument params from snapshot, produces sample data. This is the largest piece.

3. **Extract modulator computation**: `SynthModState.computeLatestModValues()` reads from Song to compute active modulator values at the current bar/beat/part. Must read from snapshot instead.

4. **Extract envelope/arpeggio**: The per-tick envelope and arpeggio time advancement.

5. **Build coordinator**: `synth/render/coordinator.ts` — tick scheduling, AudioBackend control, Snapshot sync at tick boundaries.

6. **Characterization test phase shift**: Once renderTick produces bit-identical output to old `synthesize()`, update the characterization tests to compare checksums and verify they match.

### Commits (9 total)

```
4695f9a7 docs(concepts): add synth-worklet-migration plan, remove stale ui-framework phased docs
b4c5dd2e feat(synth-render): add snapshot protocol types and builder
1644854b fix(synth-render): add missing SongSnapshot fields octave, key, patternInstruments, layeredInstruments
a8e57b4b feat(synth-render): wire SnapshotBuilder editSequence into SongDocument.record()
cf6619d7 fix(synth-render): bump editSequence on ChangeSong history paths too
5a4f9fdb feat(synth-render): add render-core types and characterization test stubs
17c12d78 fix(synth-render): add playheadNeedsReset field, fix header name, fix checksum comment
a2e7e0a9 feat(synth-render): extract post-processing into renderPostProcessing and renderStopFade functions
2c748d80 docs(synth-render): document stopFade cleanup responsibility and allocation guard in renderPostProcessing
[new]   feat(synth-render): add tone pool lifecycle and playTone/playModTone to render-core
```

### Verification

- `bun test` — 1060 pass, 0 fail
- `bun run typecheck:all` — clean (editor + synth + player)
- `bun run lint` — only pre-existing `any` type warnings (no new errors)

### Risk register updates

- **R5 (Snapshot size)**: Not yet measured — snapshot building not called at tick boundaries yet. Will profile when coordinator is built.
- **R2 (Message latency)**: editSequence tracking is in place. The coordinator will compare tick-start editSequence against last-built to decide if a new snapshot is needed.
- **New risk**: `core.*` in `.gitignore` matches `core.ts` — renamed to `render-core.ts`. Documented in progress log.
