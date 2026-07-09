# synth/modules/opl3/ — OPL3/YMF262-style FM Synthesis (4-op)

## Purpose

OPL3-style FM synthesis module — sound-alike cover using 4-op algorithms.
Reuses the existing FM compiled-function pattern with OPL3-specific algorithm routing.
Per-operator ADSR-like controls are exposed as envelope compute indices.

## Files

| File | Purpose |
|------|---------|
| `module.ts` | InstrumentModule impl |
| `schema.ts` | OPL3 params — algorithm, feedbackAmplitude |
| `serde.ts` | Namespaced FieldWriter/FieldReader |
| `dsp.ts` | Re-exports buildOpl3Source from synthesis |
| `context.md` | This file |
