# Synth Audio Stability

Purpose: Records synth playback stutter incidents, diagnosis signals, and stability rules.

## Snapshot-build stutter incident

Dense imported MIDI playback stuttered on medium-dense songs while the AudioWorklet output sink used the SAB ring buffer.

Observed runtime signals:

- `[AudioBackend] underrun mode=sab lastFill=raf slots=1/6 ms=88-138 budgetStop=true`
- `[Synth] Audio stutter ... chan=71.2ms setup=68.8ms play=1.4ms`
- `hotInst=[... type=3 ... a/l/r=0/0/7]`, released spectrum tones were expensive in setup, not sample playback.

Root cause:

- `Synth.computeTone()` called `snapshotBuilder.build(song)` once per tone.
- Dense bars with many active or released tones rebuilt the full `SongSnapshot` dozens of times per audio buffer.
- The main-thread producer then needed more time than one SAB slot contained, so the worklet drained the ring and emitted silence.

Fix:

- `Synth.synthesize()` builds one `_renderSnapshot` per audio buffer after `syncSongState()`.
- `computeTone()` reuses `_renderSnapshot` for every tone in that buffer.
- `_renderSnapshot` is cleared before leaving `synthesize()`.

Rules:

- Never build `SongSnapshot` inside per-tone, per-sample, or per-channel hot loops.
- Treat `setup` time above buffer budget as producer starvation, even when `play` and `fx` are small.
- Keep worklet underrun logs able to name the fill source: `raf`, `need-data`, `manual`, or `activate`.
- Use larger buffers only for diagnosis. If synth cost scales with buffer size, larger buffers increase UI stalls.

Useful runtime blame fields:

- `setup`: tone state, envelope, mod, snapshot, and `computeTone()` preparation.
- `play`: oscillator or sample generation.
- `fx`: `effectsSynth()` time.
- `hotInst`: slowest instrument, with active/live/released tone counts.
- `hotType`: slowest instrument type aggregate.
- `lastFill`: producer trigger that last wrote to the SAB ring.
- `budgetStop`: fill loop stopped after its per-frame budget.

Validation checklist:

- Play the dense MIDI import that reproduced stutter.
- Confirm no continuing `[AudioBackend] underrun` logs during playback.
- Confirm `[Synth] Audio stutter` logs, if any, show `setup` below buffer budget.
- Run `bun run typecheck:synth` after synth changes.
- Run `bun run typecheck:all` before committing cross-context changes.
