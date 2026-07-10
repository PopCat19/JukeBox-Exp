# Make style injection and theme cascade explicit

Purpose: Give editor, player, and theme styles one deterministic injection contract.

**Milestone:** Tree-wide css/dom/html restruct  
**Labels:** `refactor`, `css`, `shared`  
**Depends on:** #01

## Problem

`shared/styles/inject.ts` already provides tagged, deduped injection. Theme updates and popout documents need a clear ordering and copy contract beside it.

## Scope

- Define named style slots and their order: tokens, editor or player base, component styles, theme overrides, runtime overrides.
- Route injected editor and player styles through the tagged injector, including `ColorConfig._styleElement` which currently bypasses named slots.
- Account for the existing `ns` interaction slot injected by `editor/ui/interactions.ts`.
- Replace ad hoc style-element ownership with named slots.
- Make prompt popouts receive the canonical editor style slots.

## Acceptance criteria

- Every injected stylesheet has a unique `data-jb-style` identifier.
- Reinjecting a slot updates it without adding another matching style element.
- Theme replacement preserves the required cascade order.
- A popout has the same editor base and active theme styles as its source document.
- Runtime-only inline styles remain documented exceptions from issue #01.

## Verification

- Change themes repeatedly and inspect the document head for duplicate slots.
- Open, dock, undock, and pop out prompts under at least two themes.

## Risk

Dynamic PMD theme updates and computed color reads depend on the active stylesheet. Test theme switching before removing legacy paths.
