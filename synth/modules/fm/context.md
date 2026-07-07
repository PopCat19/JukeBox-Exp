# synth/modules/fm/ — FM Synthesis (4-operator)

## Purpose

FM synthesis module — the socket-packed version of `synth/plugins/fm.ts`. 4-operator FM with algorithm-dependent compiled function caching.

## Files

| File | Purpose |
|------|---------|
| `module.ts` | InstrumentModule impl |
| `schema.ts` | FM params — algorithm, feedbackType, feedbackAmplitude |
| `serde.ts` | Namespaced FieldWriter/FieldReader |
| `dsp.ts` | Re-exports buildFmSource |
| `context.md` | This file |
