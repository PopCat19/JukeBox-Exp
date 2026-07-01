# UI framework conclusion

## What the framework is

A thin set of helpers around PMD interaction patterns, living in `editor/ui/`:

| Module | Surface |
|---|---|
| `states.ts` | PMD role and interaction-state token builders (`StateOutline`, `StateForeground`, `StateBackground`), inline rule fragments (`hoverRing`, `hoverRule`, `focusRule`, `inputFocusRule`), and the canonical `interactiveFeedback()` prelude (transition + transparent outline) |
| `surfaces.ts` | Composer for PMD interactive-surface roles: `primarySurface`, `secondarySurface`, `ghostSurface` |
| `interactions.ts` | The three PMD interaction helpers: `hoverReveal`, `focusReveal`, `setActive`, plus `setDisabled` |

The framework encodes PMD's interactive-feedback recipe as typed helpers so call sites read as declarative intent rather than inline `addEventListener` chains. The shared stylesheet is injected once on first helper call (`ensureStyleInjected`) and contains the four PMD-mandated rules: hover outline, hover color swap, focus-visible outline, active fill, disabled dim.

## What the framework explicitly is not

- **Not a component library.** It does not wrap buttons or inputs. Existing button components (`clearButton`, `dropdownButton`, `tabButton`, `toggleButton`, etc.) adopt the helpers as needed but are not part of the framework.
- **Not a CSS-in-JS solution.** It composes inline-style strings plus injected `<style>` rules. The bulk of editor styling lives in `editor/rendering/styles/*.ts` as raw CSS strings.
- **Not a state-management system.** The helpers apply visual state. Business state (hovered pane, focused prompt, drag operations, channel selection) stays in the call sites and is **not** extracted.
- **Not a token-centralization layer for raw CSS vars.** `--primary-text`, `--secondary-text`, `--cta-bg`, etc. are referenced inline via `var(--…)` in 200+ places. The framework does not duplicate them as TS constants. Theme work lives in `shared/pmd-adapter.ts`.

## Phases delivered

1. **Foundation** (10 commits): three new modules, refactored `clearButton` and `dropdownButton` to adopt hover-reveal, barrel exports, contract tests.
2. **Hover feedback composition** (8 commits): added `mode: "color"` to `hoverReveal`, migrated `mute-editor._loopButton` and `channel-volume-visualizer._loopButton`, rewrote both enter handlers as single-branch ternaries reusing a `_updateLoopButton` source of truth.
3. **Behavioral coverage** (1 commit): hand-rolled DOM mock for `interactions.ts`, 19 tests covering classList writes, style custom props, dataset writes, and the one-shot style injection guard.
4. **Disabled state** (9 commits): `setDisabled` helper + 88×24% PMD-disabled rule, migration of 18 native `.disabled = bool` calls across 5 files (`mute-editor.ts`, `export-prompt.ts`, `render-post-sync.ts`, `song-editor.ts`, `instrument-import-prompt.ts`).
5. **Final UI-feedback migration** (2 commits): `instrument-browser-prompt.ts` clearBtn migrates from inline background-swap to `hoverReveal` outline mode with `role: "secondary"`. Locked in by both source-grep and behavioral tests.

## Deferred (deliberately, with rationale)

| Item | Why deferred |
|---|---|
| Stateful hover handlers (`_hoveredPane`, `_hoveredChannel`, `_hoveredPresetIndex`, `mouseInPrompt`, `_onMouseUp` drag release) | These encode business state, not UI feedback. The Phase 2 decision was to leave them untouched. Re-extracting them as a `_hoveredPane` helper would require migrating 26 of 28 mouseenter/mouseleave sites, three files share the pattern (`instrument-browser-prompt`, `clean-channel-prompt`, `add-samples-prompt`), and the abstraction would be application-specific rather than PMD-portable. |
| `--secondary-text` / `--hout` token alignment | PMD specifies one token; the editor carries two with overlapping semantics. Reconciling requires a theme-system pass across 17 `editor/rendering/styles/*.ts` files and 58 themes. High risk for visual regressions; exceeds framework scope. |
| Token centralization (`primaryText`, `ctaBg`, `ctaFg` as TS exports) | Would create a dual source of truth with the CSS variable system. The CSS-layer convention is raw `var(--…)` references; introducing TS wrappers would invite drift. The framework already exposes role tokens via `surfaces.ts` for the inline-style layer. |
| Behavioral tests for the 50 untested `editor/ui/*.ts` widgets | Most are simple template-element factories; their correctness is a DOM render assertion, not a behavioral invariant. Source-grep tests have covered the framework helpers; widget-level coverage is unproven ROI for the harness complexity. |
| Removal of dead `Opacity` token (`editor/ui/style-constants.ts:157`) | Defined but unused as a token. Real cleanup but a one-line chore — appropriate as a follow-up patch, not a phase. |

## Audit methodology for each phase

1. **Map existing duplication.** Don't design until the duplication surface is enumerated.
2. **Count call sites.** Anything under ~3 occurrences is a one-off, not a framework candidate.
3. **Identify the PMD-correct form** (the design system's prescribed pattern), then encode it as a helper.
4. **Migrate call sites in lockstep** so the helper sees real usage.
5. **Add source-grep tests for the helper** and **behavioral tests for cross-cutting helpers** (`interactions.ts`). Source-grep is the default because it survives without a DOM polyfill and matches the codebase's existing convention.

## End state

28 commits ahead of `origin/dev-exp` as of this document. 722 tests passing, all three tsconfigs clean. Every PMD-mandated interaction pattern (hover ring, focus-visible ring, active fill, disabled dim) now has both a helper and at least one production call site demonstrating it. The framework is at a defensible stopping point.

Further framework expansion would require either new PMD research (the `ui-interactions` recipe is now complete against the spec docs) or a deliberate scope expansion into stateful-hover abstraction or token centralization. Both are larger questions than the framework layer alone.
