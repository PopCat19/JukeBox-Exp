# synth/socket/ context

Purpose: Formal socket interfaces — stable, versioned extension contracts for instruments and effects.

- `version.ts`, SOCKET_VERSION constant and compat check functions
- `param-schema.ts`, Declarative parameter descriptors — drives UI, changes, and serde
- `serde.ts`, Namespaced serialization contract — FieldWriter/FieldReader, container format
- `capability-schema.ts`, InstrumentCapabilities interface (capability flag declarations)
- `capability-lookup.ts`, Resolves capabilities from socket module id with legacy type fallback
- `instrument-module.ts`, S1 socket — InstrumentModule interface for sound generators
- `effect-module.ts`, S2 socket — EffectModule interface for signal processors
- `registry.ts`, Namespaced registry — register/resolve InstrumentModule and EffectModule
- `bridge.ts`, Bridging InstrumentModule to existing SynthPlugin dispatch for migration
  - Also exports `INSTRUMENT_TYPE_TO_MODULE_ID` populated at boot
- `instrument-tagging.ts`, Tag freshly created/edited instruments with their `_socketModuleId`
- `id-table.ts`, Per-song ModuleIdTable for compact URL storage of namespaced module IDs
- `legacy-importer.ts`, Legacy format importer — reads legacy instrument data, calls module.migrate()
- `url-varint.ts`, Varint encoding helpers for compact module ID + payload in song URL bitstream
- `resolve-or-placeholder.ts`, Resolve a module id with auto-registered placeholder fallback
