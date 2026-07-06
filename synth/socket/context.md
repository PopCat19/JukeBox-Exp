# synth/socket/ context

Purpose: Formal socket interfaces — stable, versioned extension contracts for instruments and effects.

- `version.ts`, SOCKET_VERSION constant and compat check functions
- `param-schema.ts`, Declarative parameter descriptors — drives UI, changes, and serde
- `serde.ts`, Namespaced serialization contract — FieldWriter/FieldReader, container format
- `instrument-module.ts`, S1 socket — InstrumentModule interface for sound generators
- `effect-module.ts`, S2 socket — EffectModule interface for signal processors
- `registry.ts`, Namespaced registry — register/resolve InstrumentModule and EffectModule
- `bridge.ts`, Bridging InstrumentModule to existing SynthPlugin dispatch for migration
- `id-table.ts`, Per-song ModuleIdTable for compact URL storage of namespaced module IDs
- `legacy-importer.ts`, Legacy format importer — reads legacy instrument data, calls module.migrate()
- `url-varint.ts`, Varint encoding helpers for compact module ID + payload in song URL bitstream
