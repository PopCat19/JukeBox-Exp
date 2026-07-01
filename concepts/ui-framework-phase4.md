# Phase 4: disabled state composition

## Goal

Add `setDisabled` as a fourth PMD-aligned interaction-state helper, alongside
`hoverReveal`, `focusReveal`, and `setActive`. Close the PMD 88×24% foreground
opacity conformance gap by injecting a shared rule that applies to both
the new `.pmd-disabled` class hook and to native `[disabled]` form controls.
Migrate the 18 native `el.disabled = bool` calls across 5 files to route
through the helper.

## Audit results

PMD spec mentions disabled in three places (`doc/opacity.txt:9`,
`doc/overview.txt:32`, `doc/hierarchy.txt:25`). The treatment is
**foreground at 88×24%** — i.e. opacity 0.24. Current state:

- 4 scattered `:disabled` CSS selectors: 3 use `visibility: hidden` (a
  different concern, hiding buttons that can't be reached), 1 styles
  selected dropdown options.
- 18 native `el.disabled = bool` call sites across 5 files, with no
  shared visual treatment.
- 1 class-based disabled state (`piano.ts:568,571`) using a `.disabled`
  class scoped to that component.

There is no shared CSS rule that applies 88×24% opacity to either
`.pmd-disabled` or native `[disabled]`. Each call site relies on the
parent's normal styling.

## Out of scope

- Replacing `visibility: hidden` patterns for `add-envelope:disabled`,
  `delete-envelope:disabled`, `envelope-settings:disabled` — these
  are intentional hide-the-control semantics, not "show-but-disabled."
- Migrating `piano.ts`'s class-based `.disabled` to `pmd-disabled` —
  piano.ts is tightly coupled to its own scrollstate and the class
  is referenced by piano CSS. Not a general-purpose slot.

## API

```ts
// options reserved for symmetry with hoverReveal/focusReveal
export interface SetDisabledOptions {
  role?: SurfaceRole;
}

export function setDisabled(
  el: DisableableElement,
  disabled: boolean,
  options?: SetDisabledOptions,
): void;

// Disableable covers the HTML form-control elements that natively
// support the `disabled` IDL attribute.
export type DisableableElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLButtonElement
  | HTMLTextAreaElement
  | HTMLOptionElement
  | HTMLFieldSetElement;
```

Behavior:

1. `ensureStyleInjected()` (existing one-shot guard)
2. `el.disabled = disabled`
3. `el.classList.toggle("pmd-disabled", disabled)`
4. If `options.role` provided, write `el.dataset["pmdRole"] = role`

The order matters: setting `el.disabled` first, then the class. The class
exists for programmatic enable/disable (e.g. when the parent uses a
class-only pattern rather than the native attribute), but the disabled
property carries semantic meaning for assistive technology.

## CSS rule (in the injected stylesheet)

```css
.${DISABLED_CLASS}{opacity:0.24;}
.beepboxEditor [disabled]{opacity:0.24;}
```

PMD 88×24% = opacity 0.24 (per `doc/opacity.txt:9`). Two selectors:

- `.pmd-disabled` — the programmatic-only pattern
- `[disabled]` — the native form-control pattern; covers the 18 call
  sites regardless of whether they migrate to `setDisabled`

`cursor: not-allowed` is intentionally NOT added. PMD spec never
mentions it; matching spec over adding bonuses keeps scope narrow.

## Migration map

| File | Calls | Pattern |
|------|-------|---------|
| `editor/components/mute-editor.ts:193-226` | 10 | `dropdown.options[i].disabled = bool` |
| `editor/prompts/export-prompt.ts:129-139` | 4 | `el.disabled = bool` |
| `editor/renderers/render-post-sync.ts:69` | 1 | `refs.addEnvelopeButton.disabled = ...` |
| `editor/prompts/instrument-import-prompt.ts:54` | 1 | `el.disabled = true` |
| `editor/song-editor.ts:3269,3278` | 2 | `option.disabled = true` |

Each migration is `setDisabled(el, bool)` replacing `el.disabled = bool`.

## Tests

Extend `tests/interactions-behavior.test.ts` with a `describe("setDisabled", ...)`
block covering:

- `disabled=true` sets `el.disabled = true` and toggles `pmd-disabled` on
- `disabled=false` sets `el.disabled = false` and toggles `pmd-disabled` off
- `options.role` writes `pmdRole` dataset (idempotent with hoverReveal/focusReveal)
- leaving the helper twice does not stack class additions (toggle semantics)

Source-grep tests in `tests/ui-states.test.ts` should add:

- Confirmation that `interactions.ts` injects `.pmd-disabled{opacity:0.24;}`
- Confirmation that `interactions.ts` injects `.beepboxEditor [disabled]{...}`
- Confirmation that the helper exists and accepts the `DisableableElement` union

## Risks

- **Native `disabled` property on the union type**: TypeScript will object
  if `DisableableElement` is inferred as `HTMLElement`. Verified all 18
  call sites already have local types that resolve to elements with
  `disabled` (HTMLOptionElement, HTMLSelectElement, HTMLButtonElement,
  HTMLInputElement). Union covers all of them.
- **Native `[disabled]` rule scope**: `beepboxEditor [disabled]` is
  broad — matches every disabled descendant, including the piano keys
  that already have a `.disabled` class. Mitigated by piano's existing
  CSS being opaque-on-disabled (piano keys have their own color
  treatment); the new rule sets `opacity` which composes multiplicatively
  with existing color rules, not replace. Net effect on piano:
  opacity 0.24 applied to disabled keys. That is visually right for
  "can't press this key" but a behavior change.
  - Mitigation: piano already adds `.disabled` class via classList, not
    the native attribute. So `beepboxEditor [disabled]` selector won't
    match piano keys because they have no `disabled` attribute. Verified
    by reading `piano.ts:568-571`.
- **One-shot `_styleInjected` guard**: continues to work for the
  expanded stylesheet. Behavioral tests already cover this for the
  existing rule set; the new rules are part of the same `css` string.

## Commit plan

1. `docs(concepts): ui framework phase 4 disabled state composition plan`
2. `feat(ui-interactions): add setDisabled helper and inject 88×24% rule`
3. `test(interactions): cover setDisabled helper and disabled-styling contract`
4. `refactor(mute-editor): route option-disabled toggles through setDisabled`
5. `refactor(export-prompt): route intro/outro disabled toggles through setDisabled`
6. `refactor(render-post-sync): route add-envelope disabled bound through setDisabled`
7. `refactor(song-editor): route autoPlay/layout option-disabled through setDisabled`
8. `refactor(instrument-import-prompt): route strategy-select disabled through setDisabled`
9. `docs(ui-context): note setDisabled helper alongside hover/focus/active`

Goal shape: each commit independently passes tests + typecheck. Steps 4-8
are mechanically similar; their isolation is for bisectability, not for
separate review concern.

## Rollback considerations

- The injected stylesheet gains 2 selectors. Reverting any one migration
  commit reverts exactly its call sites. Reverting step 2 loses the
  styling rule; revert step 2+all migrations together to fully undo.
- No semantic changes to stateful hover/focus/active.
- Visual delta: any element with `disabled=true` now shows at 24% opacity
  where it previously showed at full opacity. If a call site relied on
  full opacity for a "disabled-looking but normal-weight" button, this
  is a behavior change — verify per-migration by re-running the dev
  server and confirming the relevant control.
