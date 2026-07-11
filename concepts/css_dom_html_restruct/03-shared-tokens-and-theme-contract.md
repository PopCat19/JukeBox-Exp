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
- Fold issue #34 (non-PMD theme mapping compat) by extending the fallback map to 11 vars no bundled theme declares but PMD sets at runtime.

## Acceptance criteria

- [x] A single typed source lists supported custom properties and their category. (`css-var-contract.ts` exports 7 category arrays, `cssVariableContract`, `knownCssVars`, `CssVarName`, `isKnownCssVariable`.)
- [x] Every bundled theme satisfies or inherits every required theme variable. (The `themeCssVarFallbacks` map is the canonical inheritance mechanism. `ColorConfig.setTheme` prepends fallbacks for any omitted var. 35 of 59 themes omit some required vars; the fallback fills the gap.)
- [x] Theme-specific selectors remain supported without `:root` variable duplication. (10 selector-bearing themes documented in `shared/styles/context.md`; no theme files were flattened.)
- [x] New component CSS consumes tokens or documented local variables, not unexplained raw values. (Enforced by `tests/css-var-contract.test.ts` scanning all `.ts`/`.css`/`.html` in `editor`/`player`/`shared`/`website` for unregistered var refs/decls.)
- [x] Existing custom theme storage remains compatible or has a documented migration. (`localStorage` key `customColors` raw CSS, unchanged; documented in `shared/styles/context.md`.)
- [x] The existing `css-var-contract.ts` test covers the new categories and required-variable checks. (7 tests: registration, theme-file decls, pmd vars, required membership, fallback covers required, fallback covers supplemental #34, fallback values non-empty and keys registered.)

## Decisions

- Fallback is the contract. 35 of 59 bundled themes do not declare all 6 `requiredThemeCssVars`. Rather than edit 35 theme files (visual regression risk, merge-conflict risk), the `ColorConfig` fallback block is the canonical inheritance mechanism. A theme satisfies a var by declaring it or by inheriting the fallback.
- `miscCssVars` deleted. `--ease` moved to `designTokenCssVars`, `--input-box-outline` and `--mute-editor-text-dim` moved to `themeCoreCssVars`. No catch-all category remains.
- #34 folded. 11 bare-ref vars (`--base02-surface`, `--base03-muted`, `--cta-bg`, `--cta-fg`, `--prompt-list-item-bg`, `--prompt-list-item-border`, `--prompt-titlebar-text`, `--scrollbar-color`, `--subtext`, `--tab-inactive-bg`, `--tab-inactive-fg`) were declared by zero bundled themes and only set by PMD at runtime. Non-PMD themes rendered invisible UI. Added to `supplementalThemeFallbackCssVars` with static dark-neutral defaults following the existing fallback aesthetic (`#444`, `#333`, `#999`, `#bbb`, `#000`, `#ccc`).

## Verification

- [x] Test all registered bundled themes plus PMD and one saved custom theme. (`tests/css-var-contract.test.ts` scans all theme files and pmd-adapter; `bun test` 1113 pass.)
- [x] Fail a test when CSS references an undeclared required variable. (Test 1 fails on any unregistered var ref or decl across editor/player/shared/website.)
- Visual confirmation of #34 fix deferred to phase 2 manual checklist (#30).

## Risk

Some themes contain selector rules beyond variables. Treating all themes as maps would silently drop visual rules.
