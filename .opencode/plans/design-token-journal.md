# Design Token System - Change Journal

**Purpose:** Track all changes, decisions, and potential regressions during the design token system implementation.

## Session Log

### 2026-04-04: Phase 1 - Expand style-constants.ts

**Changes:**
- Rewrote `editor/ui/style-constants.ts` with expanded token categories
- Added: Spacing, Gap (rem-based), Padding, Margin, BorderRadius, BorderWidth, Typography, ZIndex, Animation, Sizing, Shadows, Backdrop
- Kept backward-compatible aliases: `Gap.normal` → `Gap.md`, `Gap.large` → `Gap.lg`, etc.

**Rationale:**
- PMD-inspired rem-based scale (0.125, 0.25, 0.5, 0.75, 1, 1.5, 2rem)
- Existing px values preserved as named tokens for easy migration
- Zero imports before this change, now ready for component wiring

**Potential Regressions:**
- None expected, file had zero imports, so no existing code depends on it
- Backward aliases ensure any future code using old names still works

### 2026-04-04: Phase 2 - CSS Custom Properties in style.ts

**Changes:**
- Added new CSS custom properties to `:root {}` block in `editor/rendering/style.ts`
- Categories: spacing, gap, padding, border, typography, z-index, animation, shadows, backdrop
- All existing CSS custom properties preserved unchanged

**Potential Regressions:**
- None expected, only additions, no modifications to existing properties
- Existing `--gap-sm`, `--gap-md`, `--gap-lg`, `--gap-xl` kept as-is (px values)
- New `--gap-xs` through `--gap-xl` (rem values) added alongside

### 2026-04-04: Phase 2b - CSS Custom Properties in player-ui.ts

**Changes:**
- Added matching CSS custom properties to player UI style injection (wrapped in `:root {}` block)
- Same token set as editor: spacing, gap, padding, border, typography, z-index, animation, shadows, backdrop

**Potential Regressions:**
- None expected, only additions, no modifications to existing player CSS

### 2026-04-04: Phase 3 - Component Wiring

**Files modified (12 files, 26 individual token replacements):**

| File | Tokens Used | Replacements |
|------|-------------|--------------|
| `prompts/pane-container.ts` | `Sizing.promptLg`, `BorderRadius.md` | 2 |
| `prompts/input-row.ts` | `Gap.normal` | 1 |
| `prompts/instructions.ts` | `Typography.sizeSm`, `Margin.normal` | 2 |
| `prompts/info-banner.ts` | `Typography.sizeSm`, `Padding.xs`, `Padding.md`, `BorderRadius.md` | 4 |
| `labels/section-label.ts` | `Typography.sizeXs`, `Margin.xs` | 2 |
| `chips/tag-chip.ts` | `BorderRadius.sm`, `Typography.sizeSm`, `Margin.md`, `Padding.xs`, `Padding.md` | 5 |
| `chips/tag-suggestion-item.ts` | `Typography.sizeMd`, `Padding.xs`, `Padding.md` | 2 |
| `chips/tag-list-item.ts` | `Typography.sizeXs` | 2 |
| `inputs/search-input.ts` | `Typography.sizeLg` | 1 |
| `buttons/clear-button.ts` | `Typography.sizeLg`, `Margin.md`, `Animation.durationFast` | 3 |
| `buttons/dropdown-button.ts` | `Typography.sizeXs`, `Animation.durationFast` | 2 |

**Deferred:**
- `layout.ts` z-index replacements, inside large CSS template literals, marginal benefit, higher risk

**Potential Regressions:**
- `tag-chip.ts`: padding changed from `1px 6px` to `Padding.xs Padding.md` (0.125rem 0.5rem = 2px 8px), slightly wider horizontal padding
- `tag-suggestion-item.ts`: padding changed from `3px 8px` to `Padding.xs Padding.md` (0.125rem 0.5rem = 2px 8px), 1px less vertical padding
- `dropdown-button.ts`: font-size changed from `8px` to `Typography.sizeXs` (0.625rem = 10px), slightly larger text
- `clear-button.ts`: padding changed from `0 4px` to `0 ${Margin.md}` (0 0.5rem = 0 8px), wider padding
- `clear-button.ts`: transition changed from `0.1s` to `Animation.durationFast` (80ms), slightly faster

### 2026-04-04: Phase 4 - Validation

**Results:**
- Build: PASS (`bun run build`, all 4 targets built)
- Lint: PASS (`biome check --write`, 14 files checked, no fixes needed)
- Color system: UNTOUCHED (58 themes, ColorConfig, channel formulas all preserved)

### 2026-04-04: Mockup-Informed Token Additions

**Source:** PMD status bar mockup (Figma export)

**New TypeScript tokens added to `style-constants.ts`:**

| Category | Tokens | Source |
|----------|--------|--------|
| `Sizing` | `widgetSm: "24px"`, `widgetMd: "28px"`, `widgetLg: "32px"` | Widget heights from mockup |
| `Icon` | `sm: "16px"`, `md: "20px"`, `lg: "24px"` | Icon sizes from mockup |
| `Opacity` | `surface: "0.08"`, `dim: "0.24"`, `secondary: "0.48"`, `muted: "0.8"`, `full: "1"` | Opacity hierarchy from mockup |
| `AsymmetricRadius` | `left: "1rem 0.5rem 0.5rem 1rem"`, `right: "0.5rem 1rem 1rem 0.5rem"` | Pill grouping pattern |

**New CSS custom properties added to `style.ts` and `player-ui.ts`:**
- `--sizing-widget-sm`, `--sizing-widget-md`, `--sizing-widget-lg`
- `--icon-sm`, `--icon-md`, `--icon-lg`
- `--opacity-surface`, `--opacity-dim`, `--opacity-secondary`, `--opacity-muted`, `--opacity-full`
- `--radius-left`, `--radius-right`

**Potential Regressions:**
- None, only additions, no modifications to existing tokens or component code

### 2026-04-04: Slider-Row and Barrel Export Updates

**Changes:**
- `editor/ui/rows/slider-row.ts`: replaced hardcoded `margin-top: -3px` with `Margin.xs`
- `editor/ui/index.ts`: expanded barrel export to include all 15 token categories

**Potential Regressions:**
- `slider-row.ts`: margin changed from `-3px` to `-${Margin.xs}` (-0.125rem = -2px), 1px less negative margin

### 2026-04-04: Diminishing Returns Assessment

After evaluating the remaining ~300 files:

**High-ROI targets (already done):**
- UI component factories (prompts/, chips/, buttons/, labels/, inputs/, rows/)
- These are the reusable building blocks, fixing them propagates consistency

**Low-ROI targets (deferred):**
- `editor/components/*.ts`, large files (200-800+ lines) with deeply coupled pixel values
  - `piano.ts`: font-size tied to `translate()` transforms, replacing would break positioning
  - `instrument-settings-panel.ts`: scattered `padding: 2px 0`, `padding: 3px 0`, marginal benefit
  - Most component files use CSS classes for styling, not inline `style:` attributes
- `editor/rendering/style.ts`: 2241-line CSS injection, existing CSS custom properties already cover spacing
- `editor/ui/containers/`: all parameterized, no hardcoded values to replace
- `editor/ui/base/`: pure factory functions, no hardcoded values to replace

**Assessment:**
The token library is built and proven. The remaining work is mechanical, replacing `8px` with `Gap.md` across hundreds of files. The foundation is solid; future work can wire tokens incrementally as components are touched.
