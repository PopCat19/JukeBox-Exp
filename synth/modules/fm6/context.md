# synth/modules/fm6/ — FM Synthesis (6-operator)

## Purpose

6-operator FM synthesis module — the socket-packed version of `synth/plugins/fm6.ts`.

## Files

| File | Purpose |
|------|---------|
| `module.ts` | InstrumentModule impl |
| `schema.ts` | FM6 params — algorithm6Op, feedbackType6Op, feedbackAmplitude |
| `serde.ts` | Namespaced FieldWriter/FieldReader |
| `dsp.ts` | Re-exports buildFm6Source |
| `context.md` | This file |
