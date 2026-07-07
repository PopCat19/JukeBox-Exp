# Synth Worklet Migration — Progress Log

Status: IN PROGRESS (2026-07-07)
Branch: `dev-exp`
Commit range: `4695f9a7..3ea8b7b7` (12 commits ahead)
Latest: Phase 5 complete — worklet-native synth dispatch

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

## Phase 1 — Render Core Split (COMPLETE)

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
| Transport advancement extracted | ✅ Done | `render-core.ts` — `getSamplesPerTick`, `getNextBarFromSnapshot`, `advanceTickTransport`, `computePlayheadFromState`. Pure functions for tick/part/beat/bar advancement with loop handling. |
| renderTick advances transport | ✅ Done | `renderTick()` now calls transport functions. Still returns silence (no tone sample rendering). |
| Synth delegates to render-core BPM calc | ✅ Done | `Synth.getSamplesPerTickSpecificBPM()` → `renderGetSamplesPerTick()` |
| Transport tests | ✅ Done | `tests/synth/render-core.test.ts` — 15 transport tests (getSamplesPerTick, getNextBar, advanceTickTransport, computePlayhead, renderTick integration) |
| Rename core.ts→render-core.ts | ✅ Done | Avoids `.gitignore` `core.*` pattern for core dumps |
| tsconfig_synth.json updated | ✅ Done | Both files added to synth project |

### Architecture rules

- Socket architecture (S1–S4) stays stable — synth core is soldered PCB, no new socket.
- render-core functions must be pure: no DOM, no AudioContext, no mutable Song reference.
- PostProcessingState is already import-free and browser-free — verified.
- The `renderPostProcessing()` function allocates dummy silence buffers only in the null-unfiltered-buffer fallback (test isolation). The coordinator path always provides real buffers.

## Phase 3 — Worklet Entry Scaffold (COMPLETE)

### Deliverables

| Item | Status | Files |
|------|--------|-------|
| JukeBoxComputeToneProcessor | ✅ Done | `synth/render/worklet.ts` — AudioWorkletProcessor with Tone pool (Deque), WorkletEnvelopeComputer bridge
| buildToneRenderEnv() | ✅ Done | Constructs ToneRenderEnv from serialized WorkletToneCommand (50+ fields)
| WorkletScopeState | ✅ Done | active tones map (per-slot persistence), pending tick, diagnostics
| tsconfig_worklet.json | ✅ Done | noUnusedLocals, no DOM lib, includes worklet.ts + worklet-messages.ts
| Build pipeline | ✅ Done | `esbuild` produces `dist/beepbox_synth_worklet.min.js` — zero DOM, 175KB

## Phase 4 — Message Protocol (COMPLETE)

### Deliverables

| Item | Status | Files |
|------|--------|-------|
| WorkletToneCommand interface | ✅ Done | `synth/render/worklet-messages.ts` — 50+ fields mapping to ToneRenderEnv
| Message types | ✅ Done | MSG_INIT, MSG_TICK, MSG_STOP, MSG_RESET, MSG_READY, MSG_TICK_COMPLETE
| WorkletToneCommand → ToneRenderEnv | ✅ Done | Deserialized in buildToneRenderEnv() with scratch buffers
| audio-backend.ts worklet loading | ✅ Done | `_doActivate()` loads compute-tone module
| synth.ts _initComputeWorklet /_sendWorkletTick | ✅ Done | Sends SongSnapshot on init, per-tick tone data via _buildToneCommand

## Phase 5 — Worklet-native Synth Dispatch (COMPLETE)

### Deliverables

| Item | Status | Files |
|------|--------|-------|
| Worklet-native instrument synth functions | ✅ Done | `synth/render/worklet-synth.ts` — chip, pulse, noise, spectrum, harmonics, FM (algorithm routing), supersaw, drumset
| Local DSP helpers | ✅ Done | `workletApplyFilters`, `localWrap`, `workletSanitizeFilters` — no Synth reference
| Wave buffer serialization | ✅ Done | `waveBuffer`, `drumsetWaves` in WorkletToneCommand, populated from instrumentState
| Mod value serialization | ✅ Done | `_buildModValues()` — 23 mod types queried from modState
| Main-thread delegation | ✅ Done | `_workletActive` flag gates playTone + effectsSynth. Set after ready ack (not eagerly)
| Tick ordering | ✅ Done | `_sendWorkletTick` moved after determineCurrentActiveTones for correct tone data
| Empty tick messages | ✅ Done | Sent even when 0 tones active — recycles stale tones in worklet
| context.md | ✅ Done | `synth/render/context.md` — documents all 6 render files

### Key decisions

- Synth functions are hand-written native loops, not compiled `new Function()` strings
- Wave data serialized per-tick via Float32Array (structured clone OK for ~2KB waves)
- FM render reads `Config.algorithms[algorithm].modulatedBy[]` — all 8 algorithms
- Harmonics div-by-zero guarded
- Tick-complete posted but not yet consumed by main thread

### Commits added

```
610d9577 feat(synth): add worklet entry scaffold with build pipeline
cfaee1f4 feat(synth): wire compute-tone worklet with message protocol and tone pool
3ea8b7b7 feat(synth): add worklet-native synth dispatch and full mod serialization
```

## Stabilization note — snapshot build in hot loop

A dense MIDI import exposed SAB underruns after Phase 5. Runtime blame logs showed the worklet was starved by the main-thread producer, not by AudioWorklet processing:

- `lastFill=raf slots=1/6 ms=88-138 budgetStop=true`
- `chan=71.2ms setup=68.8ms play=1.4ms`
- `hotInst=[... type=3 ... a/l/r=0/0/7]`

Root cause: `Synth.computeTone()` built a full `SongSnapshot` once per tone. Dense released-tone sections rebuilt the whole song snapshot dozens of times per audio buffer.

Fix: `Synth.synthesize()` now builds one `_renderSnapshot` after `syncSongState()` and `computeTone()` reuses it for every tone in the buffer. Stability details live in `docs/synth-audio-stability.md`.

Rule for future worklet migration: snapshots are tick/buffer-boundary data. Do not construct snapshots inside per-tone, per-channel, or per-sample loops.

## Phase 6 — Tick-sliced Rendering (PLANNED)

### 6a (CRITICAL): Render across multiple process() calls

Current bug: `process()` processes 600+ samples per tick in one shot, but `process()` gets 128 samples per call. ~80% of samples are dropped. Audio is glitchy.

1. Track `_tickSamplesRendered` in WorkletScopeState
2. On each process() call, render `min(128, samplesPerTick - samplesRendered)` samples
3. Run `computeToneSnapshot()` only on first process() call after new tick
4. Subsequent calls reuse tone state — phase/expression already advancing

### 6b: Stable tone slot IDs

Current slot IDs shift when a tone in the middle ends. Send a stable per-tone identifier from main thread; worklet maps to its tone pool.

## Phase 7+ — Worklet-side Effects (PLANNED)

Order of implementation:

1. Panning, EQ filters, invert wave (simple, stateless)
2. Distortion, bitcrusher (state = 2-3 floats)
3. Delay-based: echo, reverb, chorus, phaser, granular (per-instrument delay line buffers)

### Risk register updates

- **R7 (Tick-slicing)**: Worklet must handle partial tick rendering across multiple process() calls. Failure mode: dropped samples, staticky audio.
- **R8 (Wave serialization)**: Float32Array wave tables transferred per tick. ~2KB per instrument type. Acceptable for <32 instruments but should cache on worklet side.

### Full commit list (12 total)

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
4d20d212 feat(synth-render): add tone pool lifecycle and playTone/playModTone to render-core
610d9577 feat(synth): add worklet entry scaffold with build pipeline
cfaee1f4 feat(synth): wire compute-tone worklet with message protocol and tone pool
3ea8b7b7 feat(synth): add worklet-native synth dispatch and full mod serialization
```

### Verification (current)

- `bun test` — 1078 pass, 0 fail
- `bun run typecheck:all` — clean (editor + synth + player + worklet)

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
4d20d212 feat(synth-render): add tone pool lifecycle and playTone/playModTone to render-core
[new]   feat(synth-render): extract transport advancement into render-core
```

### Verification

- `bun test` — 1075 pass, 0 fail
- `bun run typecheck:all` — clean (editor + synth + player)
- `bun run lint` — only pre-existing `any` type warnings (no new errors)

### Risk register updates

- **R5 (Snapshot size)**: Not yet measured — snapshot building not called at tick boundaries yet. Will profile when coordinator is built.
- **R2 (Message latency)**: editSequence tracking is in place. The coordinator will compare tick-start editSequence against last-built to decide if a new snapshot is needed.
- **New risk**: `core.*` in `.gitignore` matches `core.ts` — renamed to `render-core.ts`. Documented in progress log.
