# UI Utilities

Purpose: Reusable UI primitives, factory functions, design tokens, and interaction helpers used across editor prompts and components.

## Root files

- `array-buffer-reader.ts`, Reads binary data from ArrayBuffer with position tracking
- `array-buffer-writer.ts`, Writes binary data to ArrayBuffer with position tracking
- `index.ts`, Barrel re-export of editor UI utility modules
- `build-helpers.ts`, Factory functions for common UI elements like selects and inputs
- `select-helpers.ts`, Shared DOM helpers for synchronizing HTMLSelectElement values
- `style.ts`, Style composition helpers with token-based CSS shorthand functions
- `style-constants.ts`, Standardized design tokens for UI spacing, sizing, typography, and animation
- `tip-span.ts`, Styled span element for tooltip-style hints
- `value-label.ts`, Formatted numeric value display label
- `states.ts`, PMD role and interaction-state token builders for inline styles
- `surfaces.ts`, Composer for PMD interactive-surface roles (primary, secondary, ghost)
- `interactions.ts`, PMD interaction helpers (hoverReveal with outline or color mode, focusReveal, setActive)

## Subdirectories

- `base/`, Foundational factory functions (container, button, input, label)
- `buttons/`, Button variants (action, clear, delete, dropdown, icon, selector, tab, toggle)
- `chips/`, Tag/chip variants (tag, list item, suggestion item)
- `containers/`, Layout containers (flex row/column, form row, scrollable, select)
- `inputs/`, Input variants (checkbox, color picker, input box, search, stepper)
- `labels/`, Label variants (field label, section label)
- `layout/`, Editor layout mode CSS grid configuration
- `prompts/`, Prompt sub-components (pane, input row, info banner, instructions)
- `rows/`, Row layout variants (slider row, slider row with input)
- `sliders/`, Slider component with regular and delta-track variants
