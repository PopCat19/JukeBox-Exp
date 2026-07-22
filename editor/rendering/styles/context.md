# editor/rendering/styles

CSS-in-JS style definitions for the editor UI. Each file exports a CSS string (embedded `<style>` content or template literal) used by the corresponding editor component.

## Files

- `animations.ts`, `@keyframes` definitions for editor UI animations
- `base-widgets.ts`, CSS for editor base widget controls — layout-option, select, slider, checkbox
- `editor-layout.ts`, CSS for editor layout components — instrument-bar, canvas, track area
- `filter-editors.ts`, CSS for filter/chip editor components — filter canvas, chip canvas
- `form-inputs.ts`, CSS for editor form input controls — text, number, checkbox, dropdown
- `icon-buttons.ts`, CSS for editor icon button components — tip spans, volume speaker
- `icon-symbols.ts`, CSS custom property declarations for editor icon SVGs (data URIs)
- `navigator-panes.ts`, CSS for content-sized attached panes and independently sized detached Navigator pane domains
- `prompt-clean-channel.ts`, CSS for the clean channel prompt — tab bar, channel list pane
- `prompt-command-palette.ts`, PMD CSS for the transient compact command palette
- `prompt-compact-search.ts`, CSS for compact search prompt (preset/tag browser with tabs)
- `prompt-keyboard-shortcuts.ts`, CSS for the keyboard shortcuts prompt — shortcut categories
- `prompt-export.ts`, CSS for Export Song prompt anatomy across modal and Navigator hosts
- `prompt-limiter.ts`, PMD layout and responsive styling for the limiter settings prompt
- `prompt-misc.ts`, CSS for remaining miscellaneous prompts — songRecovery, import, etc.
- `prompt-navigator.ts`, PMD CSS for the persistent Navigator shell and bounded pane workspace
- `prompt-sample-browser.ts`, CSS for sample browser prompt — list pane with reorderable items
- `prompt-shell.ts`, CSS for generic prompt container, dock, shell, titlebar
- `prompt-small.ts`, CSS for small one-off prompts — beatsPerBar, tip, and compact dialogs
- `responsive.ts`, CSS for responsive layout breakpoints — wide screen (>=711px) and narrow
- `shared-ui.ts`, CSS for shared UI components — labelRow, searchInput, selectableRow, tagListItem
