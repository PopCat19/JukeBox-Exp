# Restructure prompt DOM around state classes

Purpose: Make prompt lifecycle, docking, and positioning legible through stable markup and state classes.

**Milestone:** Tree-wide css/dom/html restruct  
**Labels:** `refactor`, `dom`, `css`, `editor`  
**Depends on:** #02

## Problem

Prompt behavior crosses `prompt-manager`, `prompt-dock`, individual prompt factories, and direct style mutations. Lifecycle states are harder to inspect and reuse than named DOM states.

## Scope

- Define the prompt shell, header, content, dock, and popout DOM contract.
- Represent entering, exiting, focused, docked, undocked, and popout states with classes or data attributes.
- Move static animation and visual state rules into prompt-owned CSS.
- Retain inline coordinates only for measured position and drag state.

## Acceptance criteria

- Prompt states are represented by a documented class or `data-*` attribute contract.
- Focus, dismissal, drag, resize, docking, and popout behavior use that contract.
- Individual prompts share shell markup without selector overrides targeting siblings.
- Prompt transitions work with reduced-motion preferences.
- Existing keyboard focus restoration stays intact.
- Prompt shell CSS stays owned by the prompt layer, independent of editor component class migration.

## Verification

- Open nested prompts, switch focus, drag, dock, undock, pop out, and close them.
- Test at narrow width and after a theme change.

## Risk

Prompt focus and drag order are behavior, not only styling. Preserve event timing while moving presentation rules.
