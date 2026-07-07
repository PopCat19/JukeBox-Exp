# synth/modules/chip/ — Chip Wave Synthesis

## Purpose

Chip wave synthesis module — the socket-packed version of `synth/plugins/chip.ts`. Handles normal, loopable, and custom chip wave variants.

## Files

| File | Purpose |
|------|---------|
| `module.ts` | InstrumentModule impl — wraps schema, serde, dsp |
| `schema.ts` | Chip params — chipWave, chipNoise |
| `serde.ts` | Namespaced FieldWriter/FieldReader for chip params |
| `dsp.ts` | Re-exports buildChipSource / buildLoopableChipSource |
| `context.md` | This file |
