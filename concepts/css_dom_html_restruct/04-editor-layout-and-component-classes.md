# Normalize editor layout and component class ownership

Purpose: Move editor layout and reusable component presentation into scoped classes.

**Milestone:** Tree-wide css/dom/html restruct  
**Labels:** `refactor`, `css`, `dom`, `editor`  
**Depends on:** #01, #02, #03

## Problem

The editor uses generated CSS fragments and many imperative-html factories. Static presentation is distributed between class selectors and inline factory styles.

## Scope

- Define editor root and component class boundaries.
- Consolidate static layout presentation from component factories into owned style fragments.
- Keep runtime coordinates, dimensions derived from measurements, and canvas backing-store sizing in TypeScript.
- Remove duplicate layout rules after each migrated component family.

## Acceptance criteria

- Editor-layout, panel, toolbar, row, button, and input surfaces have documented class owners.
- Static inline styles in migrated component families become scoped CSS classes.
- No selector reaches across an unrelated component boundary.
- Runtime geometry remains limited to documented dynamic properties.
- Editor resizing, compact layout, and keyboard navigation preserve current behavior.

## Verification

- Exercise desktop and narrow viewport layouts.
- Test song settings, instrument settings, track controls, and generated parameter panels.

## Risk

Canvas elements use CSS and bitmap dimensions together. Converting those dimensions blindly can desynchronize pointer coordinates.
