# UI Framework Phase 2: Hover Feedback Composition

## Context

Phase 1 (10 commits, ahead of `origin/dev-exp`) delivered `states.ts`,
`surfaces.ts`, and `interactions.ts`, and refactored `clear-button.ts` and
`dropdown-button.ts` to consume `hoverReveal`. Phase 1's contract test
suite (19 tests) locks in token values, surface CSS, and shared `<style>`
injection.

A targeted audit of remaining hand-rolled hover logic (run while planning
phase 2) identified two distinct categories of duplication:

1. **Color-swap pair** — `mute-editor.ts:627-641` and
   `channel-volume-visualizer-prompt.ts:543-558` swap
   `style.color` between `var(--cta-fg)` and
   `var(--primary-text)` / `var(--tab-inactive-fg)` based on
   hover state, with two if-branches over `loopRepeatCount`. The
   two implementations are character-for-character identical except for
   the receiving element variable name. ~16 lines × 2 = 32 lines of
   literal duplication.

2. **Background-swap pair** — `instrument-browser-prompt.ts` swap
   `style.background` between `var(--ui-widget-focus, #555)` and
   `var(--ui-widget-background)`. Single occurrence, listed for
   future migration only.

The remainder of hand-rolled `mouseenter`/`mouseleave` listeners in the
codebase are *stateful* (record `_lastInteraction`, track
`_hoveredChannel`, drive `petting` animation, focus-stealing for keyboard
accessibility). They are out of scope for phase 2 — they encode business
logic, not UI feedback.

## Discovered architectural reality

The CSS stylesheet layer (in `editor/rendering/styles/`) already uses the
PMD outline pattern with established variable names:

- `--secondary-text` — declared in 58 themes, used as hover outline in
  the injected JS rule
- `--hout` — hover-outline token in `animations.ts:54` and
  `base-widgets.ts:107`, falls back to `--primary-text` (no theme
  defines it yet)
- `--refocus` — referenced conceptually in the prompt-refocus animation
  but no theme defines it

`hoverReveal` already uses `var(--secondary-text, currentColor)` as the
hover outline color (via the `StateOutline.hover` constant in
`states.ts`). The CSS stylesheets use `var(--hout, var(--primary-text))`.
**These two are inconsistent**: the same visual token (hover outline)
maps to two different CSS variables depending on whether the consumer
is a static CSS rule or a JS helper consumer.

## Phase 2 goal

Introduce a `mode` option to `hoverReveal` that lets the same helper
serve both decorative contexts (default `outline` mode, uses
`--secondary-text`) and dense mixer contexts (`color` mode, swaps the
foreground color directly). Migrate the two color-swap duplications to
the new mode.

## Deliverables

1. **Add `mode: "outline" | "color"` option to `hoverReveal`** in
   `interactions.ts`. Default `"outline"` (preserves phase-1 behavior
   for `clear-button.ts` and `dropdown-button.ts`). The `color` mode
   injects an additional `.pmd-hover-color` rule that swaps `color`
   between a foreground and accent pair when hovered.

2. **Add `HoverColorOptions`** extending `HoverRevealOptions` with
   `idleColor` and `accentColor` strings. Both default to
   `var(--primary-text)` and `var(--cta-fg)` respectively (matching the
   current `mute-editor.ts` / `channel-volume-visualizer-prompt.ts`
   defaults).

3. **Refactor `mute-editor.ts:_onLoopMouseEnter` /
   `_onLoopMouseLeave`** to a single `hoverReveal(this._loopButton,
   { mode: "color", ... })` call. The loop-active branch
   (`loopRepeatCount === -1`) becomes a separate `setActive(...)` call
   since that's the active-fill pattern, not hover feedback.

4. **Refactor `channel-volume-visualizer-prompt.ts`** with the same
   treatment. Update the test for `channel-volume-visualizer-prompt` if
   one exists; otherwise document the absence.

5. **Update `tests/ui-states.test.ts`** to cover the new `mode` option.
   Add contract assertions:
   - `hoverReveal(el)` does not require `mode` (default applies)
   - `hoverReveal(el, { mode: "color", idleColor, accentColor })`
     sets the color-swap rule path
   - Migration source-greps for both target files assert no
     `mouseenter`/`mouseleave` listeners on the loop button remain

6. **Update `editor/ui/context.md`** if the public surface of
   `interactions.ts` changes materially (additions of new option
   types count).

## What phase 2 deliberately does NOT do

- Migrate the 30+ CSS-rule `:hover` selectors in `editor/rendering/`.
  Those are declarative and work correctly.
- Touch the stateful hover listeners (mute-editor's
  `_hoveredChannel` tracking, instrument-browser's `_lastInteraction`,
  prompt-focus-controller's focus-stealing, shiggy's petting animation).
  Each encodes business state, not UI feedback.
- Add the `color` mode as a default. Default stays `outline` so
  phase-1 consumers keep their behavior.
- Realign `--secondary-text` / `--hout` token names. The simpler path
  is to thread the eventual alignment through a future phase 3; doing
  it now means touching 30+ stylesheet files.
- Replace `setActive` with a new helper. `setActive` already exists
  for the active-fill case; the loop-active branch in
  `mute-editor.ts` is the same pattern, just driven by hover-state
  toggling, not by clicking.

## Risks

**Risk 1**: Color-mode hover leaves the outline ring as an inert
2px transparent border, taking up 2px of layout on each side.
Mitigation: in color mode, the helper omits the outline from the
idle `interactiveFeedback()` rule. The base button size stays
unchanged.

**Risk 2**: `mute-editor._loopButton` is currently styled with inline
`background` and `color` set by `_updateLoopButton` on every
`loopRepeatCount` change. If `hoverReveal(color mode)` also writes
`el.style.color`, the inline style conflicts with `_updateLoopButton`.
Mitigation: the color mode overrides write `color` only on hover and
clear the inline `color` on leave, restoring the inline value
`_updateLoopButton` set last. A regression test asserts
`loopButton.style.color === ""` after a leave event.

**Risk 3**: PMD spec says hover feedback uses outline, not color.
Color mode is a deliberate departure used only where outline doesn't
read (dense 24px row buttons in a mixer). Document this clearly in
the function's docstring as a "non-conformant but necessary" mode.

## Estimated diff

- `editor/ui/interactions.ts`: +25 lines (new option types, new
  injected rule for `.pmd-hover-color:hover`)
- `editor/ui/states.ts`: 0 changes
- `editor/ui/surfaces.ts`: 0 changes
- `editor/components/mute-editor.ts`: −16 lines
- `editor/prompts/channel-volume-visualizer-prompt.ts`: −16 lines
- `tests/ui-states.test.ts`: +18 lines (4 new contract tests)
- `editor/ui/context.md`: +2 lines (option note)
- Net: +30 lines added, −32 removed, no new files, no new
  dependencies

## Commit order

1. `feat(ui-interactions): add color hover mode for dense row contexts`
2. `refactor(mute-editor): route loop button hover through hoverReveal`
3. `refactor(channel-volume-visualizer): route loop button hover through hoverReveal`
4. `test(ui-states): cover color mode and migration source-greps`
5. `docs(ui-context): note color hover mode option`

## Acceptance

- `bun test tests/ui-states.test.ts`: 19 existing + 4 new = 23 pass
- `bun test`: full suite passes with the two refactors
- `bun run typecheck:all`: clean
- Both target files have no `mouseenter`/`mouseleave` listeners for
  the loop button (verified via the new source-grep tests)
- `mute-editor._loopButton.style.color` is `""` after a
  mouseleave event (verified manually or via future DOM test if one
  is added in phase 3)

## Phase 3 candidates (deferred)

- Align `--secondary-text` / `--hout` token names across CSS rules
  and JS helpers
- Migrate `instrument-browser-prompt.ts` background-swap duplicate
- Add a `tooltip(el, content)` helper for the `tipSpan` consumers
  that currently inline the same DOM fragment
- Consider an HTML test layer (happy-dom, MIT-licensed) to enable
  behavioral tests for the interaction helpers
