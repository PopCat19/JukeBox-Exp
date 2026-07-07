# synth/modules/picked-string/ — Picked String Synthesis

## Purpose

Picked string synthesis module — the socket-packed version of `synth/plugins/picked-string.ts`. Karpluss-Strong algorithm with all-pass filter for dispersion.

## Files

| File | Purpose |
|------|---------|
| `module.ts` | InstrumentModule impl |
| `schema.ts` | Param schema (empty — no custom params) |
| `serde.ts` | Namespaced FieldWriter/FieldReader |
| `dsp.ts` | Re-exports buildPickedStringSource |
| `context.md` | This file |
