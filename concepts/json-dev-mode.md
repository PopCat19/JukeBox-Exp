# JSON Dev Mode

Status: PROPOSAL (draft 2026-07-07)
Depends on: synth/render/render-core.ts, synth/formats/json-serialization.ts,
            synth/synth.ts (synthesize), editor/changes/, editor/core/
Related: concepts/synth-worklet-migration.md (shared render extraction)
Supersedes: nothing — additive workflow proposal

## 0. thesis

Reduce browser-testing overhead by making the synth and editor change pipeline
testable through JSON fixtures and `bun test`. Instead of clicking around a
browser to verify audio output or edit behavior, define inputs and expected
outputs as JSON files and run them headlessly.

## 1. what it would look like

```
tests/
  fixtures/
    songs/
      simple-melody.json       # Song as JSON (toJsonObject output)
      drum-pattern.json
      mod-wobble.json
    edits/
      transpose-notes.json     # { inputSong, editOp, expectedOutputSong }
    audio/
      simple-melody-expected.npy  # or .json with frame hashes
  dev-mode/
    synth-render.test.ts       # Song → json → deserialize → Synth → Float32Array → compare
    editor-changes.test.ts     # Song → json → deserialize → apply edit → json → compare
```

A test:

```ts
// synth-render.test.ts
import { Song } from "../synth/song";
import { Synth } from "../synth/synth";
import { toJsonObjectImpl } from "../synth/formats/json-serialization";

test("simple melody renders at expected energy level", () => {
  const song = Song.fromJson(loadFixture("songs/simple-melody.json"));
  const synth = new Synth(song);
  const bufL = new Float32Array(synth.getSamplesPerBar() * 4);
  const bufR = new Float32Array(synth.getSamplesPerBar() * 4);

  // play 4 bars
  synth.play();
  synth.synthesize(bufL, bufR, bufL.length);

  // assert on aggregate energy within tolerance
  const energy = bufL.reduce((a, b) => a + b * b, 0) / bufL.length;
  expect(energy).toBeCloseTo(expectedEnergy, 4);
});
```

## 2. what exists right now

| Capability | Status | Notes |
|---|---|---|
| Song → JSON | READY | `toJsonObjectImpl` / `fromJsonObjectImpl` in `json-serialization.ts` |
| JSON → Song | READY | Full round-trip tested in `tests/song-round-trip.test.ts` |
| Synth accepts Song | READY | `new Synth(song)` works headlessly |
| Synth writes Float32Array | READY | `synthesize(bufL, bufR, len)` — no AudioContext required |
| Editor changes on Song | PARTIAL | `editor/core/` and `editor/changes/` operate on Song; some go through SongDocument |
| Deterministic render | NOT YET | `performance.now()` calls, stutter detection pollute output |
| renderTick() works | NOT YET | Returns silence; tone rendering not extracted |
| Fixture format | NOT YET | No fixtures directory or loader helpers |

## 3. oracle findings (2026-07-07)

Subagent oracle reviewed the approach. Key points:

- Approach is sound but not "nearly there" for audio comparison tests
- `renderTick()` in render-core.ts currently returns silence — real audio lives in `Synth.synthesize()`
- First step: synth characterization tests using existing `Synth.synthesize()` directly (bun test can do this)
- Editor change tests need a fake `SongDocument` seam — some change code touches document internals
- Float comparison goldens are brittle across JS engines — use tolerances, energy sums, spectral hashes
- `performance.now()`, sample loading, and random seeds can poison determinism
- The synth-worklet-migration.md concept is related — extracting render core from Synth helps both goals

## 4. recommended phases

### Phase 1: synth smoke tests (1-2 days)

- Build a fixture loader helper: read JSON → `Song.fromJsonObject()` → create Synth
- Call `Synth.synthesize()` headlessly in bun test (no DOM, no AudioWorklet needed)
- Assert on aggregate properties: energy, peak, zero-silence proportion
- Uses existing code — no extraction needed

### Phase 2: extract one instrument path into renderTick (medium effort)

- Pull one instrument type's tone rendering out of `Synth.computeTone()` into `render-core.ts`
- `renderTick()` then actually produces audio for that instrument
- Enables snapshot-style comparison: render 1 bar, hash the Float32Array, compare

### Phase 3: editor change pipeline fixtures (larger effort)

- Create a seam around `SongDocument` so change operations can run without DOM
- Define edit operations as JSON: `{ "type": "transpose", "channel": 0, "semitones": 2 }`
- Run through the change pipeline, serialize back to JSON, compare

## 5. risks

- Float determinism: JS engines (V8, Hermes, bun's JSC) may differ at low bits.
  Mitigation: energy sums, spectral hashes, wide tolerance, or snapshots of
  serialized intermediate state instead of raw Float32Array bits.
- `performance.now()` in synthesize: stutter detection is harmless (read-only),
  but `Synth` constructor may allocate audio resources. Check if `new Synth(song)`
  needs AudioContext.
- Sample loading: custom sample loading is async and may need mocking.
- No test infra cost: fixture pattern is simple but must be maintained.

## 6. prior art

- Odin's `-define` mode: command-line game logic tests without GPU/audio.
- BeepBox/JummBox forks: no known headless test infra — manual browser testing is the norm.
- synth-worklet-migration.md: shares the goal of extracting the render core from Synth class.
