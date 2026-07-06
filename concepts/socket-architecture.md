# Socket Architecture — Mechanical Keyboard Modularity for JukeBox-Exp

Status: DRAFT / open-ended
Depends on: synth/plugins/ registry pattern, changes/ command pattern,
            shared/styles/ token system
Supersedes: nothing yet — additive concept

## 0. thesis

A mechanical keyboard is extensible because it has FEW, NARROW, STABLE
interfaces (MX stem, hot-swap socket, USB, keycap profile) — not because
everything is configurable. This spec defines JukeBox-Exp's equivalent
sockets, and explicitly names what stays soldered.

Analogy map:

| keyboard        | jukebox-exp                        | status        |
|-----------------|------------------------------------|---------------|
| PCB/plate       | synth core (tone lifecycle, audio) | soldered ✅ ok |
| hot-swap socket | instrument plugin API              | 70% there     |
| switches        | instrument packages                | scattered ❌   |
| stabilizers     | effect packages                    | scattered ❌   |
| keycaps         | themes                             | done ✅        |
| firmware keymap | input inventory + concerns         | done ✅        |
| QMK modules     | prompts (modal registry)           | partial       |

## 1. the four sockets

Only FOUR public extension interfaces. Everything else is internal.

  S1. InstrumentModule   — sound generators
  S2. EffectModule       — signal processors
  S3. Theme              — CSS var map (exists, freeze it)
  S4. InputBinding       — inventory entry (exists, freeze it)

Rule: if a contribution can't ship through S1–S4, it's a core change
and goes through normal review, not the plugin path.

## 2. target tree

    synth/
      core/                      # soldered. tone lifecycle, mixing,
        tone.ts                  # audio backend, ring buffer, deque,
        channels.ts              # envelope computer, FFT, filtering
        audio-backend.ts
        ...
      socket/                    # THE interfaces. small. stable. versioned.
        instrument-module.ts     # S1 contract
        effect-module.ts         # S2 contract
        param-schema.ts          # declarative parameter descriptors
        serde.ts                 # namespaced serialization contract
        registry.ts              # register/resolve, capability queries
        version.ts               # SOCKET_VERSION, compat checks
      modules/                   # switches. one folder per instrument.
        fm/
          module.ts              # implements InstrumentModule, default export
          dsp.ts                 # synthesis source builder (or wasm binding)
          schema.ts              # params: ranges, defaults, units, tips
          serde.ts               # own binary/json/url encoding, ID-namespaced
          changes.ts             # undoable change classes for its params
          panel.ts               # OPTIONAL custom UI; else schema-generated
          fm.test.ts             # co-located round-trip + contract tests
          context.md
        chip/ ... pulse/ ... supersaw/ ... harmonics/ ... noise/ ...
        spectrum/ ... picked-string/ ... drumset/ ... fm6/ ...
        custom-algorithm/ ... mod/
      effects/                   # stabilizers. same shape as modules/.
        reverb/ echo/ phaser/ ring-mod/ granular/ distortion/
        bitcrusher/ compressor/ wavetable/
      formats/                   # container format only (see §4)
      wasm-synth/                # unchanged; modules bind to it via dsp.ts

    editor/
      generated-ui/              # schema → panel/slider/change-op factory
        panel-factory.ts
        change-factory.ts        # generic ChangeSetParam<T> from schema
      ...rest unchanged

## 3. S1 — InstrumentModule contract (sketch)

    // synth/socket/instrument-module.ts
    export interface InstrumentModule {
      readonly id: string;            // stable, namespaced: "core.fm",
                                      // "community.slarmoo.wavetable"
      readonly socketVersion: 1;      // compile-time compat gate
      readonly displayName: string;
      readonly capabilities: CapabilitySet;   // reuse capabilities.ts
      readonly schema: ParamSchema;           // drives UI + changes + serde

      // DSP: string-builder OR wasm binding. per-tone/per-chunk boundary,
      // NEVER per-sample virtual dispatch (perf).
      buildSynthSource(ctx: SynthBuildContext): string;

      // serde: module owns its params. host owns the envelope/container.
      serialize(state: InstrumentState, w: FieldWriter): void;
      deserialize(r: FieldReader, version: number): InstrumentState;

      // optional escape hatches
      panel?(host: PanelHost): PanelInstance;  // else generated from schema
      migrate?(legacy: LegacyBlob): InstrumentState;
    }

ParamSchema drives three things automatically:

  1. settings panel (editor/generated-ui/panel-factory.ts)
  2. undoable change classes (change-factory.ts → command pattern)
  3. default field-level serialization

A module with zero custom UI and zero custom serde is:
schema.ts + dsp.ts + module.ts. That's the "3-pin switch."

## 4. serialization — the hard 20%

Current: positional URL-base64 + jukebox-exp JSON + legacy compat.
Positional encoding is the soldered joint — adding a module today means
touching decode-variant.ts, enums.ts, song-serialization.ts.

Target: HOST OWNS CONTAINER, MODULE OWNS PAYLOAD.

    container: [moduleId][payloadVersion][payloadLength][payload...]

- moduleId is the namespaced string (interned to a varint table per song)
- unknown moduleId ⇒ preserve payload opaquely, render placeholder
  instrument, round-trip losslessly ("unknown switch still sits in the
  socket")
- legacy formats: decode-variant.ts becomes a one-way importer that
  calls module.migrate(). Never write legacy again except via explicit
  export-compat path.
- URL length budget: payload encoders should stay bit-packed; container
  overhead target ≤ 3 bytes/instrument.

OPEN QUESTION: does jukebox-exp JSON format v2 embed payloads as
base64 blobs or as structured JSON per module? (blob = simpler,
structured = human-diffable. lean structured, blob fallback.)

## 5. what stays soldered (deliberately)

- tone lifecycle, voice allocation, mixing bus
- envelope computer (modules reference envelope targets via schema)
- pattern/note/channel data model
- change dispatcher + history manager (modules emit changes THROUGH it)
- audio worklet / ring buffer plumbing
- PMD color system (modules consume tokens, never define colors)

## 6. migration plan (phased, always shippable)

phase 0 — freeze: write socket/*.ts interfaces + SOCKET_VERSION.
          Contract tests: registry round-trip, unknown-module
          preservation, schema→panel snapshot.
phase 1 — proof switch: migrate `supersaw` (self-contained, no wasm,
          moderate params) into synth/modules/supersaw/. Delete-folder
          test: build must succeed and old songs must load with
          placeholder when folder is removed.
phase 2 — schema-generated UI: panel-factory + change-factory; port
          supersaw panel to generated form; keep custom panel escape
          hatch for fm/custom-algorithm canvases.
phase 3 — serde container: implement §4 format as jukebox-exp JSON v2 +
          URL container variant; decode-variant becomes importer.
phase 4 — migrate remaining 11 instruments, then effects chain.
phase 5 — external loading (OPEN): dynamic import of third-party
          modules? Requires sandboxing decision — `new Function()`
          source builders are already eval-adjacent; a community module
          path needs a threat model first. Deliberately out of scope.

## 7. anti-goals

- no per-sample plugin dispatch (perf)
- no registry-for-everything (prompts, renderers, io stay internal)
- no config marketplace / dynamic remote loading in v1
- no breaking existing song URLs, ever

## 8. open questions

- [ ] mod (modulator) instrument: it targets OTHER instruments' params —
      does schema need addressable param paths as a first-class concept?
- [ ] drumset: 12 sub-instruments per instance — nested schemas or
      composite module?
- [ ] wasm binding surface: per-module .rs crates vs one crate with
      feature flags? (build pipeline for wasm is currently unverified)
- [ ] preset categories (14 files): do presets move into module folders
      or stay centralized? leaning centralized (presets are content,
      not code — keycap legends, not switches).
- [ ] should EffectModule and InstrumentModule share a base, or is
      "same shape, different socket" (MX vs stabilizer) cleaner?
