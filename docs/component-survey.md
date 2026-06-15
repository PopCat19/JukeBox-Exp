# Component System Survey

## Current State

No shared component system exists. UI elements are created ad-hoc via `imperative-html` (`HTML.button()`, `HTML.div()`, `HTML.input()`, etc.) with inline styles or CSS classes defined in `editor/rendering/style.ts`.

Existing helpers:
- `editor/ui/html-wrapper.ts`, `InputBox`, `Slider` (undo-aware wrappers)
- `editor/prompts/input-helpers.ts`, `validateKey`, `validateNumber`, `validate`, `labelRow`, `updatePlayButton`
- `editor/prompts/base-prompt.ts`, `_cancelButton`, `_okayButton`, `_getOkayRow`, `buildTitlebar`

---

## Duplicated Patterns

### 1. Label Row (2em height, right-aligned)

**Definition exists** in `input-helpers.ts:31` but is **never imported/called**. Every prompt inlines it instead.

```ts
// input-helpers.ts (unused)
export function labelRow(...children) {
  return div({ style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" }, ...children);
}
```

**Inline duplicates (exact `height: 2em`):**
| File | Line(s) |
|------|---------|
| `instrument-export-prompt.ts` | 39 |
| `instrument-import-prompt.ts` | 42 |
| `beats-per-bar-prompt.ts` | 41, 51 |
| `channel-settings-prompt.ts` | 55, 60, 65, 70, 75, 82 |
| `song-duration-prompt.ts` | 41, 51 |
| `shortener-config-prompt.ts` | 26 |
| `move-notes-sideways-prompt.ts` | 37, 47 |
| `limiter-prompt.ts` | 341, 347, 353, 359, 364, 369 |
| `octave-count-prompt.ts` | 31, 35 |
| `theme-prompt.ts` | 103 |

**Variants with `height: 3em` or extra margin:**
| File | Line(s) |
|------|---------|
| `euclidgen-rhythm-prompt.ts` | 343, 350, 357, 367, 374, 381 |

**~24 inline copies** of essentially the same layout.

---

### 2. Search Input

Two files use nearly identical styles for a text search input:

```ts
// preset-selector-prompt.ts:53
const inputStyle = `flex: 1; min-width: 0; padding: 6px 10px; border: 2px solid var(--ui-widget-background);
  border-radius: 6px; background: var(--editor-background); color: var(--primary-text);
  font-size: 14px; outline: none; box-sizing: border-box;`;

// keyboard-shortcuts-prompt.ts:141
style: `width: 100%; padding: 6px 10px; border: 2px solid var(--ui-widget-background);
  border-radius: 6px; background: var(--editor-background); color: var(--primary-text);
  font-size: 14px; outline: none; box-sizing: border-box; margin-top: 0.75em; margin-bottom: 1em;`
```

Should be a CSS class (e.g. `.searchInput`) or a factory function.

---

### 3. Tag/Chip Badge

Two near-identical inline styles for small tag pills:

```ts
// preset-selector-prompt.ts:252 (tag banner)
`display: inline-block; padding: 1px 6px; margin: 0 2px; border-radius: 3px;
  background: var(--ui-widget-background); color: var(--primary-text); font-size: 11px; cursor: pointer;`

// preset-selector-prompt.ts:503 (info panel tags)
`display: inline-block; padding: 1px 6px; margin: 2px; border-radius: 3px; font-size: 11px;
  cursor: pointer; background: ${active ? "rgba(255,255,255,0.2)" : "var(--ui-widget-background)"};
  color: ${active ? "var(--primary-text)" : "var(--secondary-text)"};`
```

A `tagChip(text, active?)` helper could unify these.

---

### 4. Tag Browser List Item

```ts
// tag-browser-prompt.ts:112
`padding: 4px 8px; cursor: pointer; font-size: 12px; border-radius: 4px;
  border: 1px solid ${active ? "var(--ui-widget-focus)" : "var(--ui-widget-background)"};
  background: ${active ? "rgba(255,255,255,0.12)" : "transparent"};
  color: ${active ? "var(--primary-text)" : "var(--secondary-text)"};
  display: flex; justify-content: space-between; align-items: center;`
```

Same active/inactive toggle pattern as tag chips, different sizing.

---

### 5. Number Stepper Input

`euclidgen-rhythm-prompt.ts` creates 7 identical number inputs:

```ts
// Lines 216-269, all share:
input({ style: "width: 3em; margin-left: 1em;", type: "number", min, max, value, step })
```

A `stepperInput(min, max, value, step?)` factory would reduce repetition.

---

### 6. Section Label

```ts
// preset-selector-prompt.ts:486, 497, uppercase section headers
`color: var(--secondary-text); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;`
```

Used for "Results", "Tags" labels in the info panel.

---

## Proposed Components

### Location: `editor/ui/components.ts`

New file alongside existing `editor/ui/` utilities. Exports factory functions that return `HTMLElement` instances, consistent with the `imperative-html` pattern.

### API Sketch

```ts
import { HTML } from "imperative-html/dist/esm/elements-strict";
const { div, span, input } = HTML;

// Label row, replaces 24+ inline copies
export function labelRow(...children: (HTMLElement | string)[]): HTMLDivElement;
export function labelRow(opts: { height?: string; marginTop?: string }, ...children: (HTMLElement | string)[]): HTMLDivElement;

// Search input, replaces 2 inline copies
export function searchInput(placeholder: string, extraStyle?: string): HTMLInputElement;

// Tag chip, replaces 2 inline copies
export function tagChip(text: string, active?: boolean): HTMLSpanElement;

// Tag list item, replaces tag-browser inline style
export function tagListItem(tag: string, presetCount: number, active?: boolean, selected?: boolean): HTMLDivElement;

// Number stepper, replaces 7 copies in euclidgen
export function stepperInput(min: number | string, max: number | string, value: number | string, step?: string): HTMLInputElement;

// Section label, replaces 2 inline copies
export function sectionLabel(text: string): HTMLDivElement;

// Okay/cancel row, currently on BasePrompt, could be extracted
export function okayRow(okayButton: HTMLButtonElement, ...extra: HTMLElement[]): HTMLDivElement;
```

### CSS Additions: `editor/rendering/style.ts`

Some patterns are better as CSS classes than JS factories:

```css
.beepboxEditor .searchInput { /* shared search input style */ }
.beepboxEditor .tagChip { /* shared tag chip base */ }
.beepboxEditor .tagChip.active { /* active variant */ }
.beepboxEditor .labelRow { /* shared label row layout */ }
.beepboxEditor .sectionLabel { /* uppercase section header */ }
```

### Barrel Export: `editor/ui/index.ts`

Add: `export { Components } from "./components";` or individual named exports.

---

## Migration Plan

1. Create `editor/ui/components.ts` with the factory functions above
2. Add corresponding CSS classes to `style.ts`
3. Export from `editor/ui/index.ts`
4. Migrate prompts one at a time:
   - Start with `labelRow` (highest duplication, 24+ copies)
   - Then `searchInput` (2 copies, easy win)
   - Then `tagChip` (2 copies in same file)
   - Then `stepperInput` (7 copies in euclidgen)
   - Then `tagListItem` (1 copy, but complex active state)
5. Keep existing `input-helpers.ts` `labelRow` as re-export for backward compat, or remove it
