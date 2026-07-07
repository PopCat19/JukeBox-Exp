# synth/modules/custom-chip-wave/ context

Purpose: Custom chip wave socket module — a chip variant with user-editable wave shape.

- `schema.ts`, Param schema — serialization-only chipWave field; UI driven by editorRows
- `serde.ts`, Float32Array custom wave serialization (64 elements, byte blobs)
- `dsp.ts`, Re-exports buildChipSource / buildLoopableChipSource from shared synth
- `module.ts`, InstrumentModule — same DSP as chip, no wave selector, has custom wave editor
