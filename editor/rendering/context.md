# editor/rendering context

- `index.ts`, Barrel re-export of editor rendering modules
- `style.ts`, Injects editor CSS styles and handles theme-dependent styling
- `custom-algorithm-canvas.ts`, Canvas editor for custom FM algorithm and feedback routing
- `custom-chip-canvas.ts`, Canvas editor for custom chip waveforms

## PMD compliance

`style.ts` is the canonical location for editor CSS. The prompt chrome
section (`.prompt`, `.prompt-titlebar`, `.prompt-hint`, `.prompt-button-row`,
etc.) and the prompt-specific class blocks (`.compactSearchPrompt`,
`.keyboardShortcutsPrompt`, etc.) follow PMD design system rules:

- Color tiers: 88x (headings) / 80x (body) / 64x (subtext) / 8x (surface)
  via CSS custom properties. No ad-hoc `rgba()`.
- Sizing: 8/10/12/16/20/40/48px text only.
- Weights: 500 (body) / 600 (headings) / 700 (8px affixes only).
- Border-radius: 8px compact / 16px standard via `--border-radius-medium`
  and `--border-radius-large` tokens.
- Borders: 2px solid only on prompt titlebar hover/focus inner outlines.
  No borders on standalone elements.
- No gradients, no shadows.
- Animation timing: 150ms with `--ease` (cubic-bezier 0.4, 0, 0.2, 1).
- Prompt background: 8×40% flyout (translucent), 24px backdrop blur.

When adding new prompt-specific styles, prefer extending an existing
class block here over inline styles in prompt files. Use the tokens
in `editor/ui/style-constants.ts`.
