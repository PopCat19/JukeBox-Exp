# Audit CSS, DOM, and HTML ownership

Purpose: Establish the measured baseline and target contracts for the restructure.

**Milestone:** Tree-wide css/dom/html restruct  
**Labels:** `refactor`, `css`, `dom`, `html`  
**Depends on:** none

## Problem

Style rules enter through static CSS, generated editor CSS, theme CSS, and inline DOM mutations. Component markup has no written class, attribute, or CSS-variable contract.

## Scope

- Inventory style injection, inline `style` use, `cssText`, and `style.setProperty` calls.
- Inventory DOM roots, stable IDs, generated markup, and selector ownership.
- Define ownership for editor, player, shared theme, and website CSS.
- Publish the allowed exceptions for runtime geometry and canvas sizing.

## Acceptance criteria

- A checked-in inventory identifies every style source and its owning bounded context.
- Each stable DOM hook names its owner and consumer.
- Each CSS custom property is classified as theme, layout, component, or runtime state.
- The inventory marks duplicate selectors and candidate unused declarations. Dynamic markup makes static proof unsound, so candidates are confirmed against rendered editor and player DOM.
- The target class naming and selector-scoping rules are written before migrations start.

## Verification

- Review the inventory against `editor/`, `player/`, `shared/`, and `website/`.
- Confirm runtime canvas positioning remains an explicit exception.
- Confirm candidate unused declarations against rendered DOM before removal.

## Risk

An incomplete inventory turns later issues into selector-breaking changes. Search results must be sampled against rendered editor and player DOM.
