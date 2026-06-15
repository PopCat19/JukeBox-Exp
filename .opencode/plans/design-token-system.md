# Design Token System Plan

**Purpose:** Organize all hardcoded CSS declarations into a consistent, reusable design token library

**This module:**
- Documents the current state of CSS/styling across the codebase
- Defines a phased approach to building a design token system
- Preserves all 58 existing themes and the channel color formula system
- Activates the unused `style-constants.ts` and expands it with PMD-inspired tokens

## Current State Analysis

### CSS Files
- **4 CSS files** total, all in `website/` (landing/manual pages only)
- **0 SCSS/SASS/Less** files, no preprocessor pipeline
- **No CSS frameworks**, just `imperative-html` with template literal interpolation

### Inline Styles (the problem)
- **175+ inline `style:`** attributes in HTML template literals across the editor
- **891+ `.style.`** DOM property manipulations for dynamic updates
- **9 `.style.cssText`** bulk assignments (shiggy components)
- Hardcoded values scattered as: `px`, `em`, `%`, raw numbers, inconsistent spacing

### Existing Token Infrastructure (underutilized)
- **`editor/ui/style-constants.ts`**, defines Gap, Padding, Margin, BorderRadius tokens but has **zero imports** across the entire codebase
- **`editor/rendering/style.ts`** (2241 lines), injects all editor CSS via JS, already defines ~30 CSS custom properties (`--button-size`, `--padding-*`, `--gap-*`, `--border-radius-*`, `--prompt-width-*`, icon symbols)
- **`shared/color-config.ts`**, ColorConfig class with 50+ `var()` references, works well, theme system is functional
- **58 theme files** in `shared/themes/`, each defines 80-120 CSS custom properties in `:root {}` blocks
- **Channel color formula system**, dynamic HSL color generation for pitch (10), noise (5), mod (4) channels

### PMD Reference (`project-minimalist-design`)
Key design principles from the sister project:
- **Lightness-driven hierarchy**, numeric tiers (100x, 88x, 80x, 72x, 8x, 4x, 0x) over arbitrary names
- **Opacity as composable dimension**, `80x@80%`, `8x+80x@16%` compositing notation
- **OKLCH over HSL**, perceptually uniform color space
- **YAGNI minimalism**, only tokens that are actually used
- **rem-based spacing scale**, 0.125, 0.25, 0.5, 1, 1.5, 2rem
- **No decorative tokens**, hierarchy via lightness/opacity/weight/spacing, not shadows/gradients

## Design Decisions

### What stays unchanged
- **ColorConfig class**, all existing `var()` references remain functional
- **58 theme files**, no modifications to theme CSS custom property definitions
- **Channel color formula system**, pitch/noise/mod HSL generation untouched
- **`editor/rendering/style.ts`**, existing CSS custom properties preserved
- **All existing visual output**, no changes to how the editor looks

### What gets added
- **New token categories** in `style-constants.ts`: Typography, Z-Index, Animation, Border, Sizing
- **PMD-inspired spacing scale**, rem-based, replacing the current px-only approach
- **CSS custom property alignment**, mirror all TypeScript tokens as `--var()` in `style.ts`
- **Systematic component usage**, wire tokens into `editor/ui/` components

### Why not refactor colors
- 58 themes × 80-120 properties each = ~5,000+ CSS custom property definitions
- Channel color formula system is music-specific and complex
- Risk of breaking themes far outweighs benefit of renaming `--primary-text` to `--80x`
- Color system already works; structural tokens (spacing, typography, z-index) are the gap

## Implementation Plan

### Phase 1: Expand `style-constants.ts`

**File:** `editor/ui/style-constants.ts`

Add the following token categories (PMD-inspired, adapted to existing codebase needs):

```typescript
// Spacing: rem-based scale (16px root)
export const Spacing = {
  xs: "0.125rem",   // 2px, borders, micro gaps
  sm: "0.25rem",    // 4px, compact spacing
  md: "0.5rem",     // 8px, standard spacing
  lg: "1rem",       // 16px, section spacing
  xl: "1.5rem",     // 24px, header spacing
  xxl: "2rem",      // 32px, prominent sections
} as const;

// Gap: component gaps (keep existing, add rem equivalents)
export const Gap = {
  xs: "0.125rem",   // 2px
  sm: "0.25rem",    // 4px
  md: "0.5rem",     // 8px (was "normal")
  lg: "0.75rem",    // 12px (was "large" → more granular)
  xl: "1rem",       // 16px
} as const;

// Padding: internal component padding
export const Padding = {
  none: "0",
  xs: "0.125rem",   // 2px
  sm: "0.25rem",    // 4px
  md: "0.5rem",     // 8px
  lg: "0.75rem",    // 12px
  xl: "1rem",       // 16px
} as const;

// Margin: external component spacing
export const Margin = {
  none: "0",
  xs: "0.125rem",   // 2px
  sm: "0.25rem",    // 4px
  md: "0.5rem",     // 8px
  lg: "0.75rem",    // 12px
  xl: "1rem",       // 16px
  xxl: "1.5rem",    // 24px
} as const;

// Border Radius
export const BorderRadius = {
  sm: "0.25rem",    // 4px, inputs, small elements
  md: "0.5rem",     // 8px, cards, buttons
  lg: "1rem",       // 16px, prompts, panels
  full: "100px",    // pill shapes, avatars
} as const;

// Border Width
export const BorderWidth = {
  hairline: "1px",
  default: "2px",
  thick: "3px",
} as const;

// Typography
export const Typography = {
  fontFamily: "'B612', sans-serif",
  fontFamilyMono: "monospace",
  sizeXs: "0.625rem",   // 10px
  sizeSm: "0.6875rem",  // 11px
  sizeMd: "0.8125rem",  // 13px (editor default)
  sizeLg: "0.875rem",   // 14px
  sizeXl: "1.1875rem",  // 19px
  size2Xl: "1.25rem",   // 20px
  weightNormal: "400",
  weightMedium: "500",
  weightBold: "700",
  lineHeightTight: "1.2",
  lineHeightNormal: "1.5",
  lineHeightRelaxed: "1.75",
} as const;

// Z-Index layers
export const ZIndex = {
  base: "0",
  below: "-1",
  above: "1",
  dropdown: "10",
  overlay: "20",
  modal: "30",
  toast: "40",
} as const;

// Animation
export const Animation = {
  durationFast: "80ms",
  durationNormal: "120ms",
  durationSlow: "170ms",
  durationSlower: "200ms",
  durationSlowest: "250ms",
  durationModal: "500ms",
  easingEase: "ease",
  easingEaseIn: "ease-in",
  easingEaseOut: "ease-out",
  easingLinear: "linear",
} as const;

// Sizing
export const Sizing = {
  button: "26px",           // --button-size
  settingsAreaWidth: "192px", // --settings-area-width
  promptSm: "250px",        // --prompt-width-sm
  promptMd: "350px",        // --prompt-width-md
  promptLg: "400px",        // --prompt-width-lg
  promptRowHeight: "2em",   // --prompt-row-height
} as const;

// Shadows (minimal, PMD principle)
export const Shadows = {
  none: "none",
  subtle: "0 0 4px rgba(0,0,0,0.3)",
  modal: "0 0 20px rgba(0,0,0,0.5)",
} as const;

// Backdrop
export const Backdrop = {
  blur: "blur(14px)",
  blurHeavy: "blur(24px)",
  dim: "brightness(0.9)",
} as const;
```

**Backward compatibility:** Keep existing `Gap.normal`, `Gap.large`, `Padding.small`, etc. as aliases to the new scale so any future imports don't break.

### Phase 2: CSS Custom Property Alignment

**File:** `editor/rendering/style.ts`

Add matching CSS custom properties to the existing `:root {}` block:

```css
:root {
  /* Existing properties preserved... */

  /* Spacing (rem-based, mirrors style-constants.ts) */
  --spacing-xs: 0.125rem;
  --spacing-sm: 0.25rem;
  --spacing-md: 0.5rem;
  --spacing-lg: 1rem;
  --spacing-xl: 1.5rem;
  --spacing-xxl: 2rem;

  /* Gap */
  --gap-xs: 0.125rem;
  --gap-sm: 0.25rem;
  --gap-md: 0.5rem;
  --gap-lg: 0.75rem;
  --gap-xl: 1rem;

  /* Padding */
  --padding-xs: 0.125rem;
  --padding-sm: 0.25rem;
  --padding-md: 0.5rem;
  --padding-lg: 0.75rem;
  --padding-xl: 1rem;

  /* Border */
  --border-width-hairline: 1px;
  --border-width-default: 2px;
  --border-width-thick: 3px;
  --border-radius-sm: 0.25rem;
  --border-radius-md: 0.5rem;
  --border-radius-lg: 1rem;
  --border-radius-full: 100px;

  /* Typography */
  --font-family: 'B612', sans-serif;
  --font-family-mono: monospace;
  --font-size-xs: 0.625rem;
  --font-size-sm: 0.6875rem;
  --font-size-md: 0.8125rem;
  --font-size-lg: 0.875rem;
  --font-size-xl: 1.1875rem;
  --font-size-2xl: 1.25rem;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* Z-Index */
  --z-base: 0;
  --z-below: -1;
  --z-above: 1;
  --z-dropdown: 10;
  --z-overlay: 20;
  --z-modal: 30;
  --z-toast: 40;

  /* Animation */
  --anim-duration-fast: 80ms;
  --anim-duration-normal: 120ms;
  --anim-duration-slow: 170ms;
  --anim-duration-slower: 200ms;
  --anim-duration-slowest: 250ms;
  --anim-duration-modal: 500ms;
  --anim-easing-ease: ease;
  --anim-easing-ease-in: ease-in;
  --anim-easing-ease-out: ease-out;
  --anim-easing-linear: linear;

  /* Shadows */
  --shadow-none: none;
  --shadow-subtle: 0 0 4px rgba(0,0,0,0.3);
  --shadow-modal: 0 0 20px rgba(0,0,0,0.5);

  /* Backdrop */
  --backdrop-blur: blur(14px);
  --backdrop-blur-heavy: blur(24px);
  --backdrop-dim: brightness(0.9);
}
```

**Player alignment:** `player/player-ui.ts` should also receive these CSS custom properties so the player UI shares the same token set.

### Phase 3: Systematic Component Replacement

**Priority order** (lowest risk first):

1. **Prompt widths and sizing**, replace hardcoded `250px`, `350px`, `400px` with `Sizing.promptSm`, etc.
2. **Button sizes**, replace hardcoded `26px` with `Sizing.button`
3. **Gaps and padding in UI components**, replace `8px`, `12px`, `16px` with `Gap.md`, `Padding.lg`, etc.
4. **Border radii**, replace `4px`, `8px`, `16px` with `BorderRadius.sm`, etc.
5. **Font sizes**, replace scattered `10px`, `11px`, `13px`, `14px` with `Typography.sizeXs`, etc.
6. **Animation durations**, replace `80ms`, `120ms`, `170ms`, `200ms`, `250ms` with `Animation.durationFast`, etc.
7. **Z-index values**, replace implicit layering with `ZIndex.*` tokens

**Target directories:**
- `editor/ui/base/`
- `editor/ui/buttons/`
- `editor/ui/chips/`
- `editor/ui/containers/`
- `editor/ui/inputs/`
- `editor/ui/labels/`
- `editor/ui/layout/`
- `editor/ui/prompts/`
- `editor/ui/rows/`
- `editor/ui/sliders/`

**Approach per component:**
- Import needed tokens from `style-constants.ts`
- Replace hardcoded `style:` string values with token references
- Use template literal interpolation where dynamic values are needed
- Keep ColorConfig color references unchanged

### Phase 4: Validation

- All 58 themes render correctly (color system untouched)
- No visual regressions in spacing/typography
- Build succeeds (`bun run build` or equivalent)
- Linter passes (`biome check`, `eslint`)

## Files Modified

| File | Change |
|------|--------|
| `editor/ui/style-constants.ts` | Expand with new token categories |
| `editor/rendering/style.ts` | Add matching CSS custom properties |
| `player/player-ui.ts` | Add matching CSS custom properties |
| `editor/ui/base/*.ts` | Import and use tokens |
| `editor/ui/buttons/*.ts` | Import and use tokens |
| `editor/ui/chips/*.ts` | Import and use tokens |
| `editor/ui/containers/*.ts` | Import and use tokens |
| `editor/ui/inputs/*.ts` | Import and use tokens |
| `editor/ui/labels/*.ts` | Import and use tokens |
| `editor/ui/layout/*.ts` | Import and use tokens |
| `editor/ui/prompts/*.ts` | Import and use tokens |
| `editor/ui/rows/*.ts` | Import and use tokens |
| `editor/ui/sliders/*.ts` | Import and use tokens |

## Out of Scope

- Color system refactoring (ColorConfig, themes, channel formulas)
- Converting inline styles to CSS classes (separate future effort)
- Player component styling overhaul (only token alignment, not restructuring)
- Website CSS files (`website/common.css`, `website/index.css`, `website/manual/subpages.css`)

## Progress

### Completed

| Phase | Status | Commits |
|-------|--------|---------|
| Phase 1: Expand style-constants.ts | DONE | `e8bcace8` |
| Phase 2: CSS custom properties in style.ts | DONE | `e8bcace8` |
| Phase 2b: CSS custom properties in player-ui.ts | DONE | `e8bcace8` |
| Phase 3a: Wire prompts/ | DONE | `e8bcace8` |
| Phase 3b: Wire labels/, chips/, inputs/ | DONE | `e8bcace8` |
| Phase 3c: Wire buttons/ | DONE | `e8bcace8` |
| Phase 3d: Wire layout/ (z-index) | DEFERRED | Low value, high risk |
| Phase 4: Validation | DONE | `e8bcace8` |
| Mockup tokens (sizing, icon, opacity, asymmetric radius) | DONE | `c11a1b1a` |

### Remaining Work

**Phase 5: Wire remaining UI components** (~300+ files with hardcoded styles)

| Directory | Estimated Files | Priority |
|-----------|----------------|----------|
| `editor/ui/base/` | ~5 | High, foundational, used everywhere |
| `editor/ui/containers/` | ~5 | High |
| `editor/ui/rows/` | ~5 | High |
| `editor/ui/sliders/` | ~5 | Medium |
| `editor/ui/layout/` | ~3 | Medium |
| `editor/prompts/` | ~30 | High, many hardcoded values |
| `editor/components/` | ~30 | Medium, complex, higher risk |
| `editor/renderers/` | ~20 | Low, mostly dynamic `.style.` manipulation |
| `editor/core/` | ~20 | Low, mostly logic, minimal styling |

**Phase 6: Backdrop blur alignment**
- Mockup uses `blur(12px)`, current token is `blur(14px)`
- Decide: align to mockup or keep existing

**Phase 7: Barrel export cleanup**
- `editor/ui/index.ts` exports `BorderRadius, Gap, Margin, Padding` from style-constants
- Add `Typography, Animation, Sizing, BorderWidth, Spacing, ZIndex, Shadows, Backdrop, Icon, Opacity, AsymmetricRadius` to barrel
