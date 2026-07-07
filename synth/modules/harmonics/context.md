# synth/modules/harmonics/ — Harmonics Synthesis

## Purpose

Harmonics synthesis module — the socket-packed version of `synth/plugins/harmonics.ts`. Band-limited waveform rendering with harmonics control points.

## Files

| File | Purpose |
|------|---------|
| `module.ts` | InstrumentModule impl |
| `schema.ts` | Param schema (empty — no custom params) |
| `serde.ts` | Namespaced FieldWriter/FieldReader |
| `dsp.ts` | Re-exports buildHarmonicsSource |
| `context.md` | This file |
