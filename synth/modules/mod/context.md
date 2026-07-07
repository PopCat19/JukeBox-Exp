# synth/modules/mod/ — Modulator Channel

## Purpose

Modulator channel synthesis module — the socket-packed version of `synth/plugins/mod.ts`. Special instrument type with no DSP code generation — delegates to `Synth.runModSynth` at runtime.

## Files

| File | Purpose |
|------|---------|
| `module.ts` | InstrumentModule impl |
| `schema.ts` | Param schema (empty) |
| `serde.ts` | Namespaced FieldWriter/FieldReader |
| `context.md` | This file |
