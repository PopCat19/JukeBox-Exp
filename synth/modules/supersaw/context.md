# synth/modules/supersaw/ context

Purpose: Supersaw instrument as a self-contained S1 socket module.

- `module.ts`, InstrumentModule implementation, default export
- `dsp.ts`, Re-exports buildSupersawSource from core synthesis
- `schema.ts`, Param schema for supersaw params (dynamism, spread, shape, pulse width, phase offset)
- `serde.ts`, Namespaced FieldWriter/FieldReader for supersaw params
- (changes live in editor/changes/sliders.ts — editor-layer undoable classes, not synth-layer)
