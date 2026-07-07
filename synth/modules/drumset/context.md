# synth/modules/drumset/ — Drumset Synthesis

## Purpose

Drumset synthesis module — the socket-packed version of `synth/plugins/drumset.ts`. 12 sub-instruments with per-drum envelopes and spectrum waves.

## Files

| File | Purpose |
|------|---------|
| `module.ts` | InstrumentModule impl |
| `schema.ts` | Param schema (empty — no custom params) |
| `serde.ts` | Namespaced FieldWriter/FieldReader |
| `dsp.ts` | Re-exports buildDrumSource |
| `context.md` | This file |
