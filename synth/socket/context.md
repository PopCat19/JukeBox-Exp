# synth/socket/ context

Purpose: Formal socket interfaces — stable, versioned extension contracts for instruments and effects.

- `version.ts`, SOCKET_VERSION constant and compat check functions
- `param-schema.ts`, Declarative parameter descriptors — drives UI, changes, and serde
- `serde.ts`, Namespaced serialization contract — FieldWriter/FieldReader, container format
- `instrument-module.ts`, S1 socket — InstrumentModule interface for sound generators
- `effect-module.ts`, S2 socket — EffectModule interface for signal processors
- `registry.ts`, Namespaced registry — register/resolve InstrumentModule and EffectModule
- `bridge.ts`, Bridging InstrumentModule to existing SynthPlugin dispatch for migration
