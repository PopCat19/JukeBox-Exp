# editor/changes context

- `index.ts`, Barrel re-export of all editor change classes
- `song.ts`, Implements undoable changes for song-level settings and structure
- `notes.ts`, Implements undoable changes for note editing and pattern manipulation
- `filters.ts`, Implements undoable changes for filter control points and settings
- `sliders.ts`, Implements undoable changes for continuous instrument slider values
- `util.ts`, Shared utility functions for editor change operations

## Subdirectories
- `instruments/`, Undoable changes for individual instrument properties (chip-wave, effects, envelopes, fm-operators, misc, presets, tone, unison, waveforms)
