# Define the shared token and theme variable contract

Purpose: Separate shared design tokens from theme values and component-local values.

**Milestone:** Tree-wide css/dom/html restruct  
**Labels:** `refactor`, `css`, `themes`, `shared`  
**Depends on:** #01, #02

## Problem

`shared/styles/design-tokens.ts`, `shared/color-config.ts`, theme modules, and editor CSS expose overlapping variable systems. A caller cannot tell which variables are required or who supplies fallbacks.

## Scope

- Extend the existing `shared/styles/css-var-contract.ts` and its test rather than creating a competing typed contract.
- Define typed categories for shared tokens, required theme variables, optional theme variables, and runtime values.
- Give every required theme variable a canonical fallback.
- Preserve theme-specific selector rules separately from variable maps.
- Deprecate duplicate aliases through one compatibility layer, then remove consumers incrementally.

## Acceptance criteria

- A single typed source lists supported custom properties and their category.
- Every bundled theme satisfies or inherits every required theme variable.
- Theme-specific selectors remain supported without `:root` variable duplication.
- New component CSS consumes tokens or documented local variables, not unexplained raw values.
- Existing custom theme storage remains compatible or has a documented migration.
- The existing `css-var-contract.ts` test covers the new categories and required-variable checks.

## Verification

- Test all registered bundled themes plus PMD and one saved custom theme.
- Fail a test when CSS references an undeclared required variable.

## Risk

Some themes contain selector rules beyond variables. Treating all themes as maps would silently drop visual rules.
