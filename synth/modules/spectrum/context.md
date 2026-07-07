# synth/modules/spectrum/ — Spectrum Synthesis

## Purpose

Spectrum synthesis module — the socket-packed version of `synth/plugins/spectrum.ts`. Band-limited interpolation with spectrum wave editing.

## Files

| File | Purpose |
|------|---------|
| `module.ts` | InstrumentModule impl |
| `schema.ts` | Param schema (empty — no custom params) |
| `serde.ts` | Namespaced FieldWriter/FieldReader |
| `dsp.ts` | Re-exports buildSpectrumSource |
| `context.md` | This file |
