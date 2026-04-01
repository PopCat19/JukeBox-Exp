# editor/core context

- `index.ts` — Barrel re-export of editor core modules
- `change.ts` — Defines base classes for undoable and grouped editor mutations
- `change-notifier.ts` — Implements observer pattern for notifying editor components of state changes
- `change-dispatcher.ts` — Dispatches UI change events for instrument and song settings
- `drumset-setup.ts` — Sets up drumset UI rows with envelope and spectrum controls
- `fm-operator-setup.ts` — Sets up FM operator UI rows with frequency, amplitude, and waveform controls
- `keyboard-handler.ts` — Extracts keyboard shortcut handling from SongEditor
- `mod-slider-registry.ts` — Maps mod setting indices to Slider refs via a provider interface
- `player-animator.ts` — Drives animation-frame loop for playback UI updates
- `preferences.ts` — Manages user preference settings with localStorage persistence
- `prompt-focus-controller.ts` — Manages Hyprland-style focus behavior for prompt dialogs
- `prompt-manager.ts` — Manages the lifecycle of editor prompt dialogs
- `selection.ts` — Manages note and bar selection state with clipboard copy/paste support
- `song-performance.ts` — Manages live performance mode with real-time note input and recording
