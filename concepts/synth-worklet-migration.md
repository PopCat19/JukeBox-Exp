# Synth Worklet Migration

Status: PLAN (draft 2026-07-07)
Depends on: synth/ audio-backend, synth/audio-worklet-processor, synth/synth.ts,
            synth/modules/ (S1 InstrumentModule), concepts/socket-architecture.md
Supersedes: nothing — additive roadmap

## 0. thesis

The synth render core should run in AudioWorklet, not on the main thread.
This roadmap describes the incremental refactor from today's shared-mutable-state
architecture toward an immutable-snapshot-based pipeline that can target either
the main thread or an AudioWorklet processor.

This is a **PCB change**, not a socket expansion. The socket architecture
(socket-architecture.md) explicitly names the synth core as soldered. The
refactor keeps all four sockets (S1–S4) stable and unchanged. No new socket.

Analogy: the synth is moving from a single-sided PCB with jumper wires to a
multi-layer PCB with a clean signal bus. The hot-swap sockets (S1) stay
unchanged.

## 1. current architecture

```
editor (song-document.ts)
  │
  ▼  reads/writes Song directly (shared mutable)
Synth (synth.ts)
  │  ~2500 line synthesize()
  │  ~20 module imports
  │  syncSongState() on every render call
  │  mutates transport, tones, mods, filters, Song temp fields
  ▼
AudioBackend (audio-backend.ts)
  │  SAB ring buffer or postMessage queue
  ▼
AudioWorklet node (audio-worklet-processor.ts)
  └→ pure buffer player (zero synthesis)
```

Problems:

- Song is shared mutable state between editor and synth — unsafe across threads
- Synth imports ~20 modules — worklet code must be plain JS blob
- Editor reads synth internals directly — worklet is opaque
- `synthesize()` is one monolithic loop — hard to split

## 2. target architecture (phased)

### Phase 0 → Phase 1 target (main thread only)

```
editor (song-document.ts)
  │
  ▼  reads/writes Song (mutable, editor-owned)
Synth (facade — synth/synth.ts)
  │  thin API: play(), pause(), seek(), isPlayingSong, playhead
  ▼
Render Coordinator (synth/render/coordinator.ts)
  │  tick scheduling, Song → Snapshot sync, AudioBackend control
  ▼
Render Core (synth/render/core.ts)
  │  pure function: Snapshot + RenderState → audio + Telemetry
  │  no Song reference, no imports beyond plain-js-safe helpers
  ▼
AudioBackend (unchanged)
  │  SAB ring buffer or postMessage queue
  ▼
AudioWorklet node (unchanged buffer player)
```

### Phase 2 target (worklet render)

```
editor (song-document.ts)
  │
  ▼
Synth (facade)
  │
  ▼
Render Coordinator
  │  sends Snapshot messages via AudioWorkletNode.port
  ▼
AudioWorklet (updated worklet)
  │  Render Core runs HERE
  │  receives Snapshot → produces audio directly into output
  │  sends Telemetry back (playhead, spectrum, caps)
  │
  ├→ SAB ring buffer (removed — worklet writes output directly)
  └→ Telemetry (main thread reads via port messages)
```

## 3. phase 0 — snapshot protocol

### 3.1 SongSnapshot type

A plain-data snapshot covering everything the render core needs:

```typescript
// synth/render/snapshot.ts

interface SongSnapshot {
  readonly version: number;           // monotonic, incremented per snapshot
  readonly editSequence: number;      // monotonic, incremented per editor mutation
  readonly timestamp: number;         // performance.now() snapshot was taken

  // Song structure
  readonly sampleRate: number;
  readonly beatsPerBar: number;
  readonly barCount: number;
  readonly ticksPerPart: number;
  readonly partsPerBeat: number;
  readonly pitchChannelCount: number;
  readonly noiseChannelCount: number;
  readonly channelSnapshots: ChannelSnapshot[];

  // Transport state
  readonly loopBarStart: number;
  readonly loopBarEnd: number;
  readonly loopRepeatCount: number;
  readonly loopBarCopy: number;
  readonly barCountOverride: number | null;

  // Global params
  readonly masterGain: number;
  readonly eqFilter: FilterSettings;
  readonly inVolumeCap: number;
  readonly outVolumeCap: number;
  readonly compressionThreshold: number;
  readonly limitThreshold: number;
  readonly compressionRatio: number;
  readonly limitRatio: number;
  readonly limitDecay: number;
  readonly limitRise: number;
}
```

### 3.2 Builder

`SnapshotBuilder` constructs a snapshot from the mutable Song:

```typescript
// synth/render/snapshot.ts

class SnapshotBuilder {
  private _editSequence = 0;
  private _version = 0;

  build(song: Song): SongSnapshot { ... }
  incrementEditSequence(): void { this._editSequence++; }
}
```

Called from the coordinator at tick boundaries. `editSequence` is bumped
whenever the editor applies a change. The worklet accepts only newer
sequences; old renders finish the current tick and pick up the new
snapshot on the next tick boundary.

### 3.3 Message protocol (main ↔ worklet)

Defined before any worklet render code:

| direction | message | purpose |
|-----------|---------|---------|
| main → worklet | `snapshot` | new SongSnapshot at tick boundary |
| main → worklet | `transport` | play, pause, seek, resume |
| main → worklet | `live-input` | current liveInputPitches (piano keys) |
| main → worklet | `reset` | full state reset (new song load) |
| worklet → main | `telemetry` | playhead, spectrum, volume caps, fade state |
| worklet → main | `underrun` | buffer underrun (allocation/logging) |

The `snapshot` message is the only large one. It carries the full
snapshot, not a delta. The worklet applies it atomically at the start
of the next tick.

## 4. phase 1 — synth facade + render core split

### 4.1 Synth facade (`synth/synth.ts`)

The existing file shrinks to a thin layer that owns the editor-facing
API and delegates rendering through the coordinator:

| method | behavior |
|--------|----------|
| `constructor(song)` | creates coordinator, render core |
| `play()` | calls coordinator.attach() + resumeContext() + coordinator.play() |
| `pause()` | calls coordinator.pause() |
| `seek(bar)` | seekSamples + seekBar |
| `get playhead` | delegates to coordinator.audiblePlayhead |
| `set bar(n)` | seekBar(n) |
| `arrange(...)` | no change — Song mutation flows through existing path |
| `spectrumEnabled` | delegates to render core telemetry routing |
| `onSpectrumUpdate` | callback from telemetry |

### 4.2 Render coordinator (`synth/render/coordinator.ts`)

Owns:

- AudioBackend lifecycle (activate, deactivate, resumeContext)
- Tick scheduling (rAF fill loop, need-data callbacks)
- `Song → Snapshot` sync at tick boundaries
- AudioBackendHost interface (old synthesize callback)
- Playhead accounting (producer head - queued samples = audible head)
- Live input capture (routes to snapshot)

### 4.3 Render core (`synth/render/core.ts`)

A pure function:

```typescript
function renderTick(
  snapshot: SongSnapshot,
  state: RenderState,       // mutable, owned by render core
  outputBufferLength: number,
  playSong: boolean,
): RenderResult {
  // same logic as current synthesize() body
  // but reads from snapshot, not this.song
  // no side effects outside state + output buffers
}

interface RenderResult {
  left: Float32Array;
  right: Float32Array;
  telemetry: RenderTelemetry;
}

interface RenderTelemetry {
  playhead: number;
  spectrum: { left: Float32Array; right: Float32Array } | null;
  volumeCaps: number[];
}
```

What moves into the render core:

- Tone lifecycle (tone allocation, release, fade)
- Note pattern reading (from snapshot, not Song)
- `computeTone()`, `playTone()`, `playModTone()`
- Modulator value computation (from snapshot)
- Envelope computation
- Arpeggio timing
- Effects dispatch (reverb, delay, distortion, bitcrusher)
- Post-processing (compression, limiting, EQ)
- Stop-fade gain ramp
- Metronome
- Lead-in silencing
- Per-channel volume cap tracking

What stays in the coordinator/facade:

- AudioContext lifecycle
- Song mutations (editor applies changes through Change pattern)
- Undo/redo
- URL serialization
- Live input capture (piano → current note buffer)
- Spectrum display callbacks
- `isPlayingSong`, `_stopFadeSamplesRemaining`, `liveInputEndTime`

What stays in Song directly (unchanged):

- All data model classes (Channel, Instrument, Note, Pattern)
- Serialization (to/from base64 URL)
- Serialization formats (jukebox-exp-v2)
- Change classes

### 4.4 State ownership

The render core owns its own copy of:

- `ChannelState[]`
- `InstrumentState[]`
- `Tone` pools (active, released, mod)
- `ModState` (values, nextValues, heldMods)
- `EnvelopeComputer` instances
- Effect delay lines (reverb, echo)

These are initialized from snapshot data and maintained by the render
core. The coordinator never touches them directly.

### 4.5 Testing strategy (phase 1)

```typescript
// tests/synth/render-core.test.ts

// Given a snapshot (built from a known Song)
// When renderTick() is called
// Then output buffers match old Synth.synthesize() output

// Offline test: no AudioContext, no AudioBackend
// Just: Song → SnapshotBuilder → renderTick() → compare with old synth
```

Key invariant: `renderTick(snapshot, state, ...)` produces bit-identical
output to the old `Synth.synthesize()` for the same song and same playhead.

## 5. phase 2 — worklet render

### 5.1 Worklet bundle generator (`synth/worklet/render-bundle.ts`)

Generates a plain JS string blob that registers a new AudioWorklet processor.
The blob contains:

1. Inlined pure-DSP helpers (no imports — functions are stringified)
2. Inlined ChannelState/InstrumentState/Tone as plain JS classes
3. Composed S1 module DSP strings (via `buildSynthSource(ctx)`)
4. The render core logic ported to plain JS
5. Message handlers for snapshot/transport/live-input
6. Telemetry sender (postMessage back to main)

The existing `AUDIO_WORKLET_PROCESSOR_CODE` gets extended with a new
render-core mode. The old buffer-player mode stays for rollback.

### 5.2 Module import problem

S1 instrument modules produce `buildSynthSource()` strings that may
reference module-scope imports (math helpers, constant tables). The
bundle generator must detect and inline these references.

Strategy:

1. Each S1 module's `dsp.ts` declares `runtimeDependencies` — named
   helpers the generated string references
2. A registry of worklet-safe helper implementations provides the
   plain-JS versions
3. The bundle generator resolves all dependencies and inlines them

### 5.3 Process() allocation audit

AudioWorklet `process()` runs on the audio thread under real-time
constraints. Allocations in `process()` are prohibited by spec.

The render core must:

- Pre-allocate all worklet-side state at init time
- Use fixed-size arrays for tone pools, envelope values, delay lines
- Never call `new Float32Array(size)` during `process()`
- Reuse output buffers across calls

### 5.4 Telemetry becomes authoritative

The worklet's telemetry (playhead, spectrum, caps) becomes the source
of truth for the editor's display. The main thread no longer derives
playhead from `this.playheadInternal` — it uses the worklet-reported
value.

The existing `playheadInternal` computation in the coordinator becomes
a fallback for non-worklet mode (rollback path).

## 6. rollback strategy

Every phase has a feature flag that keeps the old path selectable:

| flag | what it toggles |
|------|-----------------|
| `workletRender: false` (default in phase 1) | main-thread coordinator calls render core directly |
| `workletRender: true` (phase 2) | coordinator sends snapshots to worklet |
| `mainThreadRender: true` (fallback) | old Synth.synthesize() runs as before |

The flags are compile-time constants that get swapped at build time.
Multiple render modes can coexist in the same binary — the coordinator
selects the active path at startup.

## 7. risk register

| # | risk | impact | detection | mitigation |
|---|------|--------|-----------|------------|
| R1 | Generated DSP strings reference imports | worklet blob fails to load | blob compile test (phase 2) | Module dependency registry |
| R2 | Message latency between edit and snapshot | user hears stale audio | log editSequence latency (phase 0) | Tick-boundary sync; bump editSequence |
| R3 | Allocations in worklet process() | audio glitches, browser crash | allocation audit (phase 2) | Pre-allocate all worklet state |
| R4 | Editor playhead drifts from audible position | display desync | telemetry vs coordinator comparison | Telemetry wins as authoritative |
| R5 | Snapshot size causes message thrash | high GC pressure, frame drops | snapshot serialization time per frame | Compress channel data; skip unchanged channels |
| R6 | S1 module schema change | snapshot fields diverge | schema version in snapshot | `socketVersion` field in snapshot |

## 8. non-goals

- No new socket interface (synth core is soldered PCB)
- No per-sample plugin dispatch (performance invariant)
- No breaking existing song URLs, ever
- No WASM integration in scope
- No editor UI refactor

## 9. build order

1. `synth/render/snapshot.ts` — SongSnapshot types + SnapshotBuilder
2. `synth/render/core.ts` — pure renderTick() extracted from synth.ts
3. `synth/render/coordinator.ts` — tick scheduling, AudioBackend control
4. `tests/synth/render-core.test.ts` — offline snapshot render tests
5. Reshape `synth/synth.ts` to facade that uses coordinator + core
6. `synth/worklet/render-bundle.ts` — worklet blob generator
7. Port worklet processor to host render core
8. Remove old buffer-player worklet mode
9. Clean up facade (remove dead code paths)

Steps 1-5 are main-thread only and independently mergable.
Step 6-9 require the snapshot protocol to be stable.

## 10. open questions

- [ ] Channel volume cap tracking: currently reads per-channel output
      mid-render (before/after each channel). Does telemetry need per-channel
      sub-snapshot or is a peak-buffer enough?
- [ ] Reverb/echo delay lines: owned by render core's RenderState. Can they
      survive snapshot changes (edit while reverb rings out)?
- [ ] Live input (piano keyboard): main thread captures note on/off. Does
      the coordinator inject live notes into the snapshot, or send them
      as a separate message?
- [ ] Snapshot size: a 16-channel, 200-bar song with 12-instrument channels
      needs ~5-10KB per snapshot. Acceptable for postMessage, but SAB
      path can't carry snapshots. Protocol must fall back to port messages
      for the snapshot channel.

## 11. glossary

| term | meaning |
|------|---------|
| Socket architecture | The 4-interface plugin system (S1-S4) in socket-architecture.md |
| Soldered | Part of the synth core, not a plugin socket |
| Snapshot | Immutable plain-data representation of Song |
| Render core | Pure function that takes Snapshot + RenderState → audio |
| Coordinator | Tick scheduling, Song → Snapshot sync, AudioBackend control |
| Facade | Editor-facing API of the synth |
| Telemetry | Worklet → main thread data (playhead, spectrum, caps) |
