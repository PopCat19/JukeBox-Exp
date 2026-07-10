# Add CSS and DOM contract regression guards

Purpose: Detect selector, theme-variable, and markup contract breaks during the migration.

**Milestone:** Tree-wide css/dom/html restruct  
**Labels:** `test`, `css`, `dom`  
**Depends on:** #02, #03

## Problem

Type checking does not detect a missing CSS variable, duplicate style slot, orphan selector, or changed DOM hook. Baseline guards must land before the migration issues so regressions are caught during cleanup, not after.

## Scope

Phase 1, baseline guards, land before #04, #05, #06, #07:

- Extend the existing CSS-variable contract test for editor, player, themes, and fallbacks.
- Add DOM smoke checks for editor root, prompt shell, and player root contracts.
- Add static checks for duplicate style-slot identifiers and unscoped selectors where practical.

Phase 2, final coverage, after the migration issues:

- Define manual visual checks for theme switching, responsive layout, prompts, player embeds, and offline pages.
- Remove compatibility selectors only after their consumers have contract coverage.

## Acceptance criteria

- Phase 1 baseline guards pass on the current codebase before any migration begins.
- Tests fail for undeclared required CSS variables and duplicate named style slots.
- Tests cover every bundled theme through the canonical theme contract.
- Editor and player smoke checks assert their published DOM roots and state hooks.
- Phase 2 adds a repeatable manual verification checklist for browser-only behavior.
- Compatibility selectors are removed only after phase 2 coverage confirms their consumers are safe.

## Verification

- Run the new checks with the project test suite and typecheck.
- Intentionally remove a required variable and duplicate a style slot to confirm failures.

## Risk

Static CSS analysis can report intentional browser or runtime values. Classify supported exceptions instead of suppressing broad groups.
