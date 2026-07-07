# Socket Architecture — Mechanical Keyboard Modularity for JukeBox-Exp

Status: LIVE (updated 2026-07-07)
Depends on: synth/plugins/ registry pattern, changes/ command pattern,
            shared/styles/ token system
Supersedes: nothing — additive concept

## 0. thesis

A mechanical keyboard is extensible because it has FEW, NARROW, STABLE
interfaces (MX stem, hot-swap socket, USB, keycap profile) — not because
everything is configurable. This spec defines JukeBox-Exp's equivalent
sockets, and explicitly names what stays soldered.

Analogy map:

| keyboard                               | jukebox-exp                            | state            |
|----------------------------------------|----------------------------------------|------------------|
| PCB/plate                              | synth core (tone lifecycle, audio)     | soldered ✓       |
| hot-swap socket                        | instrument module API (S1)             | done ✓           |
| switches                               | instrument packages (synth/modules/)   | done ✓ (12/12)   |
| stabilizers                            | effect packages (synth/effects/)       | interface done   |
| keycaps                                | themes                                 | done ✓           |
| firmware keymap                        | input inventory + concerns             | done ✓           |
| QMK modules                            | prompts (modal registry)               | partial          |

## 1. the four sockets

Only FOUR public extension interfaces. Everything else is internal.

  S1. InstrumentModule   — sound generators (12 core modules migrated)
  S2. EffectModule       — signal processors (interface defined, 0 shipped)
  S3. Theme              — CSS var map (exists, freeze it)
  S4. InputBinding       — inventory entry (exists, freeze it)

Rule: if a contribution can't ship through S1–S4, it is a core change
and goes through normal review, not the plugin path.

## 2. target tree (current state)

    synth/
      socket/                    # THE interfaces. small. stable. versioned.
        version.ts               # SOCKET_VERSION, compat checks
        param-schema.ts          # declarative parameter descriptors
        serde.ts                 # FieldWriter/FieldReader + container format
        instrument-module.ts     # S1 contract
        effect-module.ts         # S2 contract (interface only, 0 impls)
        capability-schema.ts     # InstrumentCapabilities flag interface
        capability-lookup.ts     # resolve caps from module id or legacy type
        registry.ts              # register/resolve, namespace validation
        bridge.ts                # InstrumentModule → SynthPlugin dispatch
        instrument-tagging.ts    # tag instruments with _socketModuleId at
                                 # type-change boundaries
        id-table.ts              # ModuleIdTable for compact URL storage
        legacy-importer.ts       # legacy format → module.migrate()
        url-varint.ts            # varint encoding for module id + payload
        resolve-or-placeholder.ts# auto-placeholder on unknown module id
        json-serde-adapter.ts    # JSON-compatible FieldWriter/FieldReader
        external-loader.ts       # dynamic community module loading with validation
        context.md
      modules/                   # switches. one folder per instrument (12 core).
        chip/                    #   schema.ts + dsp.ts + serde.ts + module.ts
        noise/                   #   same shape for all 12
        fm/
        fm6/
        spectrum/
        harmonics/
        drumset/
        picked-string/
        supersaw/
        pulse/
        mod/
        custom-chip-wave/
        placeholder/             # zero-output module for unknown ids
        index.ts                 # barrel re-export of all 12 modules + CORE_MODULE_IDS
        context.md
      effects/                   # stabilizers. interface defined, empty.
      plugins/                   # legacy plugin dispatch (deprecated but kept
                                 # for backward compat during migration)
      formats/
        jukebox-exp-v2.ts        # JSON container format (module round-trip done)
      ... rest unchanged

    community_modules/           # external modules, one dir per module
      simple_synth/              # example: sine oscillator, frequency param
        module.ts                # test-only community module (id: community.simple.synth)
        schema.ts
        serde.ts
        dsp.ts
        context.md

    editor/
      generated-ui/              # schema → panel/slider/change-op factory
        panel-factory.ts
        change-factory.ts
      ... rest unchanged

## 3. S1 — InstrumentModule contract

    // synth/socket/instrument-module.ts
    export interface InstrumentModule {
      readonly id: string;            // stable, namespaced: "core.fm",
                                      // "community.slarmoo.wavetable"
      readonly socketVersion: number; // compile-time compat gate (currently 1)
      readonly displayName: string;
      readonly capabilities: Partial<InstrumentCapabilities>;
      readonly schema: ParamSchema;

      // DSP: string-builder OR wasm binding. per-tone/per-chunk boundary,
      // NEVER per-sample virtual dispatch.
      buildSynthSource(ctx: SynthBuildContext): string;

      // serde: module owns its params. host owns the container.
      serialize(params: Record<string, unknown>, w: FieldWriter): void;
      deserialize(r: FieldReader, version: number): Record<string, unknown>;

      // optional escape hatches
      initialize?(): Record<string, unknown>;
      panel?(host: PanelHost): PanelInstance;
      migrate?(legacy: unknown, formatVersion: number): Record<string, unknown>;
    }

    InstrumentCapabilities flags (capability-schema.ts):
      isFm, isFm6, isNoise, isMod, isDrumset
      hasWaveSelect, hasSpectrum, hasHarmonics, hasLoopControls
      hasStringSustain, hasSupersaw, hasPulseWidth
      hasEnvelopes, hasUnison, hasNoteFilter, hasEffects, hasChord
      hasAliasableWaveform, hasCustomWaveEditor

ParamSchema drives:

  1. settings panel (editor/generated-ui/panel-factory.ts)
  2. undoable change classes (change-factory.ts → command pattern)
  3. default field-level serialization (via JsonFieldWriter/JsonFieldReader)

A module with zero custom UI and zero custom serde is:
schema.ts + dsp.ts + module.ts (the "3-pin switch").

### Capability resolution order (capability-lookup.ts)

  1. instrument._socketModuleId → getInstrument(id) → mod.capabilities
  2. instrument.type → LEGACY_TYPE_CAPABILITIES (legacy songs)
  3. DEFAULT_CAPABILITIES

Module capabilities are merged over DEFAULT_CAPABILITIES.
Legacy songs without_socketModuleId fall back to a static type-keyed table.

## 4. serialization — two paths

### 4a. URL hash (current)

The URL hash uses a bit-packed format (legacy CharCode-based encoding).
Module payloads are inserted as a new tag Z (SongTagCode.socketPayload):

    [tag Z][base64 JSON blob]

Each blob contains:
    {"id": "core.fm", "version": 1, "params": {"modulationIndex": 3, ...}}

Deserialization: tag Z handler calls resolveOrPlaceholder(payload.id) to
get the module, then module.deserialize() via JsonFieldReader to restore
params. Unknown ids auto-register a zero-output placeholder module
(resolve-or-placeholder.ts).

Old URLs without tag Z skip cleanly via the default switch case.

### 4b. JSON v2 format (jukebox-exp-v2.ts)

The per-song JSON format stores _socketModuleId on each instrument.
On import, fromJukeboxExpV2Json restores the id, resolves the module,
and calls module.deserialize() to hydrate params.

### 4c. url-varint (future container)

A separate url-varint.ts + id-table.ts implementation builds a per-song
ModuleIdTable that maps module ids ↔ small integers. The first 16 slots
(ID_TABLE_RESERVED) are reserved for core module ids at startup:

    ModuleIdTable.defaultReservedIds = CORE_MODULE_IDS;  // set in bridge.ts

This enables compact varint-based encoding where core module ids use
0-15 (zero overhead per instrument), and community/external ids are
appended after slot 15. Not yet wired into the song serialization path.

### Container principle

    HOST OWNS CONTAINER, MODULE OWNS PAYLOAD.

- unknown moduleId → auto-register placeholder, preserve payload
  opaquely, round-trip losslessly
- legacy formats: jukebox-exp-v2.ts calls module.deserialize() after
  restoring _socketModuleId. Never write legacy except via explicit
  export-compat path.

## 5. what stays soldered (deliberately)

- tone lifecycle, voice allocation, mixing bus
- envelope computer (modules reference envelope targets via schema)
- pattern/note/channel data model
- change dispatcher + history manager (modules emit changes THROUGH it)
- audio worklet / ring buffer plumbing
- PMD color system (modules consume tokens, never define colors)

## 6. bridge — module → plugin dispatch

Core modules register through BOTH the socket registry and the legacy
plugin dispatch. The bridge (bridge.ts):

    registerModuleAsPlugin(module, InstrumentType.chip, ["waveSelect"], {
      getSynthFunction: ...   // optional override
      initialize: ...         // optional override
    });

This validates the module id, registers in the socket registry, records
the type→moduleId mapping in INSTRUMENT_TYPE_TO_MODULE_ID (used by
instrument-tagging.ts), generates a default getSynthFunction (or uses
the override), and registers a SynthPlugin with the old dispatch.

Community/external modules register through the socket registry only —
they skip the old numeric plugin dispatch entirely.

INSTRUMENT_TYPE_TO_MODULE_ID is populated at boot, mapping 12 core
InstrumentType values to their module id strings.

## 7. instrument tagging

The Instrument class has NO socket dependency by design. The
instrument-tagging.ts helper retrofits _socketModuleId at known
type-change boundaries:

- song.initToDefault (new song)
- ChangeChannelCount, ChangeCloneChannel, ChangeAddChannelInstrument
- ChangePreset, ChangeRandomGeneratedInstrument
- ChangePasteInstrument, ChangeAppendInstrument, selection._reconcilePastedInstruments
- setDefaultInstruments (editor reset)
- MidiParser instrument creation
- preserveOrTagInstrumentWithModule for deep-copy paths

This ensures all newly created instruments carry _socketModuleId and
can round-trip their module payload through URL hash or JSON.

## 8. id table

ModuleIdTable (id-table.ts):

- Bidirectional module id ↔ small integer mapping
- First 16 slots reserved for core module IDs (populated at boot from
  CORE_MODULE_IDS, ordered by InstrumentType index)
- Max 256 entries per song
- encode()/decode() for compact byte-sequence embedding in song URLs
- Not yet wired into song serialization

## 9. placeholder modules

When deserializing an unknown module id (e.g. a community module that
is not currently loaded), resolve-or-placeholder.ts auto-registers a
zero-output placeholder under the original id:

    resolveOrPlaceholder(id)
      → getInstrument(id) ?? createPlaceholderModule(id)
      → registerPlaceholderModule(id, placeholder)
      → returns the module

Placeholders register directly into the instrument map, bypassing
namespace validation (the id is preserved for future round-trip).
isPlaceholderResolution(id) checks if the id resolves to a placeholder.

## 10. external loading

external-loader.ts provides dynamic community module loading:

    loadExternalModule(specifier, expectedId?)
      → dynamic import
      → validates default export (InstrumentModule shape)
      → validates namespace (rejects core.*)
      → validates serialize, deserialize, schema (object + params array)
      → registerInstrument(module)

loadExternalModules(manifest) runs multiple loads in parallel.

Validation is conservative: checks callable fields exist but does NOT
call them at load time (avoids side effects). An example community
module exists at community_modules/simple_synth/ (id: community.simple.synth,
sine oscillator with frequency param).

## 11. community module pattern

Directory structure per community module:

    community_modules/<name>/
      module.ts       # InstrumentModule implementation (default export)
      schema.ts       # ParamSchema
      serde.ts        # serialize/deserialize via FieldWriter/FieldReader
      dsp.ts          # DSP source builder
      context.md      # directory context

Community module ids use the "community." namespace
(/^community\.[a-zA-Z][a-zA-Z0-9._-]*$/). They register through the
socket registry only, not the legacy plugin dispatch.

## 12. migration plan (completed phases)

phase 0 — freeze: write socket/*.ts interfaces + SOCKET_VERSION.
          Contract tests: registry round-trip, unknown-module preservation,
          schema→panel snapshot.
          Status: DONE

phase 1 — proof switch: migrate supersaw as first socket module.
          Status: DONE (all 12 core types migrated)

phase 2 — schema-generated UI: panel-factory + change-factory; port
          core modules to generated form where applicable.
          Status: DONE (pattern established, per-module coverage varies)

phase 3 — serde container: implement module-owned serialization in URL
          hash (tag Z) + JSON v2 (fromJukeboxExpV2Json).
          Status: DONE

phase 4 — migrate remaining instruments (11 → 12): chip, noise, fm,
          fm6, spectrum, harmonics, drumset, pickedString, supersaw,
          pulse, mod, customChipWave. Effects chain not started.
          Status: DONE (12/12 core instruments)

phase 5 — external loading: dynamic import with validation, example
          community module.
          Status: DONE (external-loader.ts + simple_synth example)

### remaining

- S2 EffectModule: interface defined, 0 implementations shipped
- url-varint container: module exists but not wired into song serialization
- Code generation pipeline for community modules
- Sandboxing model for community DSP (new Function() is already eval-adjacent)

## 13. key design decisions

- **instrument freed of socket dependency**: _socketModuleId is a
  runtime property set externally, not on the Instrument class.
- **capabilities on module, not type**: modules declare their own
  Partial<InstrumentCapabilities>, merged over defaults. Legacy songs
  fall back to a static type-keyed table.
- **placeholder preserves original id**: the zero-output module is
  registered under the original unknown id, not a synthetic namespace.
- **external loader validates but doesn't call**: serialize/deserialize
  must exist as functions but are not invoked at load time.
- **bridge provides default getSynthFunction**: modules that don't need
  per-unison caching get a generic function builder.
- **id-table reserved slots by InstrumentType order**: indices 0-11
  match type enum values for predictable encoding. Slots 12-15 blank.
- **serde via FieldWriter/FieldReader**: module uses named field calls
  (writeInt, writeBlob), not raw byte manipulation, keeping serde
  format-agnostic. JsonFieldAdapter bridges to JSON; future adapters
  can target bit-packed without changing module code.

## 14. anti-goals

- no per-sample plugin dispatch (perf)
- no registry-for-everything (prompts, renderers, io stay internal)
- no config marketplace / dynamic remote loading in v1
- no breaking existing song URLs, ever

## 15. open questions

- [ ] mod (modulator) instrument targets OTHER instruments' params —
      does schema need addressable param paths as a first-class concept?
- [ ] drumset: 12 sub-instruments per instance — nested schemas or
      composite module? Current implementation uses flat params.
- [ ] wasm binding surface: unverified (no wasm modules yet)
- [ ] preset categories (14 files): still centralized. Move into module
      folders or stay centralized? Leaning centralized.
- [ ] should EffectModule and InstrumentModule share a base, or is
      "same shape, different socket" (MX vs stabilizer) cleaner?
- [ ] community module sandboxing: dynamic import + new Function() is
      already eval-adjacent. Threat model needed for user-hosted modules.
- [ ] url-varint wiring: ModuleIdTable exists but is not used in
      synth-serialize/deserialize. Tag Z path works; varint would save
      bytes but adds complexity.
