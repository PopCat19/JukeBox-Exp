# UI Foundation Pass — Plan

## Audit verdict

The "too many inline fragments" framing does not match the code. A
design system is already in place and working:

- **Color tokens**: PMD Base16 via `shared/pmd-adapter.ts` →
  CSS custom properties on `:root`. 58 themes in `shared/themes/`.
- **JS-side tokens**: `editor/ui/style-constants.ts` — Spacing, Padding,
  Margin, BorderRadius, Typography, ZIndex, Animation, Sizing, Icon,
  Opacity, AsymmetricRadius, Shadows, Backdrop.
- **Composers**: `editor/ui/style.ts` — `s()`, `flexRow()`, `flexCol()`,
  `formRow()`, `promptFrame()`, `promptPanel()`, property shorthands
  (`w`, `h`, `gap`, `p`, `m`, `bg`, `fg`).
- **Factories**: `editor/ui/base/{container,button,input,label}.ts`.
- **Component variants**: 8 button types, 6 input types, 7 container
  types, 3 chip types, slider, layout, prompt panes.

What's missing is not the framework. What's missing is **two
specific interaction primitives** that the codebase is rebuilding by
hand in at least three places, and **one canonical role/state
composer** that would let the existing variants stop inlining CSS.

## Design language — keep, do not replace

PMD is already the design language. The slider class explicitly cites
PMD ("see project-minimalist-design hue slider"). Fredoka is the
font. `cubic-bezier(0.4, 0, 0.2, 1)` is the easing. 16px radius is
the default. 24px backdrop blur is in PMD spec and in
`Backdrop.blurHeavy`.

Material Design 3 is a non-starter here. MD3's component model
(FAB, Card, Snackbar, NavigationBar, outlined text fields with helper
text) does not map onto a piano-roll sequencer. MD3's tonal palette
system conflicts with PMD's OKLCH lightness tiers. Importing both
would create the duplication the user wants to eliminate.

The right framing is **PMD as the source of truth, with three
interaction primitives and one composer added on top**.

## Real duplication found

1. **Hover-reveal opacity pattern** — repeated in
   `editor/ui/buttons/clear-button.ts` (lines 21-26) and
   `editor/ui/buttons/dropdown-button.ts` (lines 30-36):

   ```ts
   btn.addEventListener("mouseenter", () => { btn.style.opacity = "1"; });
   btn.addEventListener("mouseleave", () => { btn.style.opacity = "0.6"; });
   ```

   Same pattern, different base opacity (0.6 vs 0.7), different
   transition timing source. PMD spec calls for hover state layers
   but has not been tokenized in code.

2. **Inline tier-role CSS** — `tagChip` builds background+color from
   `var(--ui-widget-background)` and an `active` flag with
   `rgba(255,255,255,0.2)`. No token for "surface hint" or
   "interactive surface". The PMD spec calls this `base02 (80×8%)`
   but the JS side has no shorthand.

3. **Form-row label/input composition** — `formRow`,
   `selectRow`, `flexRowCenter`, `flexColumnCenter` all encode
   roughly the same flex-row-with-label layout. Each takes its own
   options bag, none shares a common base. Mild duplication, low
   priority.

4. **One prompt in `prompts/` uses the framework** — `theme-prompt.ts`
   is the only prompt that imports `createDiv` etc. The other 40
   prompt files build DOM via `HTML.div` and inline style strings.
   This is an adoption gap, not a framework gap.

## Scope: foundation only

Per user's choice: tokens + 3-5 primitives, no full migration.

### Deliverables

1. **`editor/ui/states.ts`** (new) — typed interaction state tokens
   for PMD role/state combinations.
   - Hover opacity tiers from PMD spec: idle / dim (0.6) /
     hover (1.0) for non-CTA, idle / muted (0.7) / hover (1.0)
     for CTA surfaces.
   - Active surface fill (88x tier with surface-under text color,
     per PMD `effects.txt` §"Active Fill Text").
   - Focus-visible outline (2px 80×48%, per PMD `effects.txt`).
   - Exported as plain CSS string builders, not as enums —
     matches existing `style.ts` pattern.

2. **`editor/ui/interactions.ts`** (new) — three primitives that
   match PMD's interaction language:
   - `hoverReveal(el, options?)` — replaces the duplicated
     mouseenter/mouseleave opacity wiring in `clear-button` and
     `dropdown-button`.
   - `focusReveal(el, options?)` — adds :focus-visible outline via
     a transparent-default + 80×48% on focus pattern.
   - `setActive(el, active)` — toggle the PMD "active fill" pattern
     (88x surface + surface-under text), used by tab buttons,
     list items, and tag chips.

3. **`editor/ui/surfaces.ts`** (new) — single composer for the
   "interactive surface" role:
   - `interactiveSurface(role: "primary" | "secondary" | "ghost",
     state: "idle" | "hover" | "active" | "disabled")` →
   returns the CSS string for the canonical PMD surface at that
   role/state. This is the unit `tagChip`, `dropdownButton`,
   `clearButton` are all rebuilding.

4. **Refactor `clear-button.ts` and `dropdown-button.ts`** to use
   the new helpers. This is the proof that the primitives survive
   real usage and that the duplication actually goes away.

5. **Update `editor/ui/index.ts`** to export the new modules.

6. **Update `editor/ui/context.md`** to reflect the actual file
   layout (currently still describes the old flat structure).

7. **Add `tests/ui-states.test.ts`** — concrete assertions on
   each helper's output for one role/state pair, so future
   changes don't silently regress.

### Out of scope (explicit)

- Migrating the 40 non-adopting prompts. That's a separate
  adoption pass.
- Replacing PMD with MD3. PMD is the design language.
- Touching canvas-rendered surfaces (piano-roll, pattern editor).
  The token layer reaches them via CSS variables already; the
  factory primitives don't apply to canvas.
- `editor/ui/layout/layout.ts` — the 7-variant grid CSS string
  table. Real duplication risk, but the table is read at runtime
  by `Layout.setLayout()` and refactoring it would require
  rewriting all 7 variants. Not foundation work.
- `editor/ui/sliders/slider.ts` — already well-structured, uses
  the right tokens. Reference implementation for how the rest of
  the codebase should look.

## Risks I'm flagging up front

- **Risk 1**: `interactiveSurface()` becomes a god-function. If
  prompts need more than the 4 roles × 4 states (16 combos), it
  grows fast. Mitigation: ship with the 4×4 matrix that covers
  what `clearButton`, `dropdownButton`, `tagChip` actually use,
  no more. Add a state later if a fifth role shows up in real
  code.
- **Risk 2**: PMD's "no shadows, depth via lightness" rule means
  hover feedback on PMD surfaces should be lightness/opacity
  changes, not outline rings. I'm including `focusReveal` for
  keyboard accessibility (PMD does specify the 80×48% focus
  outline) but `hoverReveal` should not add an outline — that's
  a violation of PMD's design rules.
- **Risk 3**: `setActive` for tab/list/chip elements changes the
  surface tier to 88x. Per PMD, the active text uses the surface
  *beneath* the fill, skipping alpha-composited layers. That
  means the text color depends on the parent — and a generic
  primitive can't always know the parent. Mitigation:
  `setActive(el, active, options?)` with optional
  `textColor` override; default to the convention
  `var(--cta-fg, var(--inverted-text))`.

## Verification

Before declaring done:

```bash
bun test                     # all tests, including new ui-states.test.ts
bun run typecheck:all        # editor + synth + player separately
```

I will not start the refactor of `clear-button.ts` /
`dropdown-button.ts` until the primitives exist and pass tests.
That order lets each step be rolled back independently.

## Estimated size

- `states.ts`: ~60 lines
- `interactions.ts`: ~80 lines
- `surfaces.ts`: ~50 lines
- Refactors of `clear-button.ts`, `dropdown-button.ts`: ~10 lines
  deleted each
- `index.ts` updates: ~6 lines
- `context.md` update: rewrite of one file
- Tests: ~80 lines

Total: ~300 lines added, ~20 removed. Net +280, no new
dependencies, no breaking changes to existing call sites.
