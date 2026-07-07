# synth/modules/noise/ — Noise Synthesis

## Purpose

Noise synthesis module — the socket-packed version of `synth/plugins/noise.ts`.

## Files

| File | Purpose |
|------|---------|
| `module.ts` | InstrumentModule impl — wraps schema, serde, dsp |
| `schema.ts` | Noise params — chipNoise |
| `serde.ts` | Namespaced FieldWriter/FieldReader for noise params |
| `dsp.ts` | Re-exports buildNoiseSource from shared synthesis |
| `context.md` | This file |

## Vocabulary

- chipNoise: noise type index (0=retro, 1=white, 2=clang, 3=buzz)
