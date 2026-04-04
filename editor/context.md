# Editor Context
#
# Purpose: Defines the interactive song editor application.
#
## Root Files
- `main.ts` - Initializes and starts the editor application
- `song-editor.ts` - Main editor entry point and orchestration
- `song-document.ts` - Represents the editable song state document
- `song-custom-samples.ts` - Manages user uploaded custom audio samples
- `song-editor-original.ts` - Legacy original editor implementation backup

## Subdirectories
- `changes/` - Change tracking, undo/redo, and song modification handlers
- `components/` - UI component implementations for the editor interface
- `config/` - Editor configuration, preset definitions, and settings
- `core/` - Core editor logic, event handling, and state management
- `input/` - User input handling, keyboard, mouse, and command routing
- `io/` - File import/export, MIDI, and data persistence
- `prompts/` - Modal dialogues, input prompts, and user interactions
- `renderers/` - Visual rendering logic for editor UI elements
- `rendering/` - Low level canvas rendering utilities and custom drawing
- `ui/` - Reusable UI components, widgets, and base styles

