# editor/renderers context

- `index.ts` — Barrel re-export of editor renderer functions
- `instrument-visibility.ts` — Manages instrument type and effects row visibility in the editor
- `render-effects.ts` — Syncs effects select option text with on/off icons for current instrument
- `render-instrument-values.ts` — Syncs slider/input values for non-mod instruments in the editor
- `render-layout.ts` — Computes layout metrics and applies visibility/style for all editor sub-panels
- `render-mod-settings.ts` — Renders modulator channel settings UI in the instrument editor
- `render-options-menu.ts` — Syncs options menu text with current preference on/off states
- `render-post-sync.ts` — Handles post-branch sync UI updates in the instrument editor
- `render-preset-setup.ts` — Handles non-mod channel preset setup UI in the instrument editor
- `render-song-settings.ts` — Syncs song-level settings UI elements with current song state
