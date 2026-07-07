# community_modules/simple_synth context

Purpose: Reference community module for the S1 socket contract. Loaded via `synth/socket/external-loader.ts`. Shows a community author the minimum viable module shape (schema + serde + dsp source string).

## Files

- `module.ts`, the InstrumentModule aggregate; ties schema/serde/dsp together
- `schema.ts`, ParamSchema with a single `frequency` param
- `serde.ts`, FieldWriter/FieldReader pair for params, versioned
- `dsp.ts`, builds the per-tone renderer source string (sine oscillator)
- `context.md`, this file

## Usage

```ts
import { loadExternalModule } from "synth/socket/external-loader";
const result = await loadExternalModule("community_modules/simple_synth");
```

Module id: `community.simple.synth`
