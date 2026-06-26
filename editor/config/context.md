# editor/config

Editor configuration, preset data, and input layout definitions.

## Purpose

Bounded context for editor-level config (separate from synth-level config in `synth/config/`). Contains preset category data files, keyboard layout, and platform-detection logic.

## Files

- `index.ts`, Barrel — re-exports `EditorConfig`, `KeyboardLayout`, preset types
- `editor-config.ts`, Editor configuration — preset categories, tag list, mobile/Mac detection, version display
- `keyboard-layout.ts`, Keyboard-to-note mapping — pitch maps for QWERTY input, key event translation
- `preset_category/`, Subdirectory — preset category data files by genre/contributor (core, forks, unbox, contributors-a1..d, modded, challenges, community-mixed)
