# synth/modules/pulse/ — Pulse Width Modulation

## Purpose

Pulse width modulation synthesis module — the socket-packed version of `synth/plugins/pulse.ts`.

## Files

| File | Purpose |
|------|---------|
| `module.ts` | InstrumentModule impl — wraps schema, serde, dsp |
| `schema.ts` | Pulse width params — pulseWidth, decimalOffset |
| `serde.ts` | Namespaced FieldWriter/FieldReader for pulse params |
| `dsp.ts` | Re-exports buildPulseWidthSource from shared synthesis |
| `context.md` | This file |

## Vocabulary

- pulseWidth: pulse width modulation amount
- decimalOffset: phase offset for pulse width
