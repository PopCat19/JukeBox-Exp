# shared/styles/ context

Purpose: Shared design token stylesheets using Constructable Stylesheets API.

## Files

- `css-var-contract.ts`, CSS custom property contract for themes, shared styles, editor, and player. Exports category arrays (`themeCoreCssVars`, `channelColorCssVars`, `designTokenCssVars`, `iconSymbolCssVars`, `interactionStateCssVars`, `layoutTokenCssVars`, `promptSurfaceCssVars`), the `cssVariableContract` aggregate, `knownCssVars`/`knownCssVarSet`/`isKnownCssVariable`, `requiredThemeCssVars` (6 vars a theme must satisfy or inherit), `supplementalThemeFallbackCssVars` (11 vars no bundled theme declares but PMD sets at runtime), and `themeCssVarFallbacks` (canonical fallback values for both lists)
- `design-tokens.ts`, Shared design token CSS custom properties and SVG symbols
- `inject.ts`, Tagged global style injection helper that updates existing style nodes instead of duplicating them, plus removal by id

## Named style slots

`injectGlobalStyles` dedupes by `data-jb-style` attribute value and updates in place — it does not move nodes, so cascade order stays stable across re-injection. Each unique id is one named slot in `doc.head`.

Intended cascade order by natural insertion (not enforced by code):

1. Base slots (`editor-main`, `player-main`) hold tokens, base, and component CSS. They inject at module eval.
2. `theme` slot injects on first `setTheme` (in `SongDocument` field init), after base.
3. `layout` slot injects on first `setLayout` (next line in `SongDocument` field init).
4. `pmd-interactions` and `shiggy` are lazy component slots, injected after `SongDocument` init when their owners construct (`Shiggy` at `SongEditor` field init after `doc`; `pmd-interactions` on first interaction helper call).
5. `palette-preview` is a transient runtime override: injects when the palette prompt opens, removes on close via `removeGlobalStyles`.

Runtime PMD inline vars on `documentElement` (`pmd-adapter`) are a documented exception, not a slot.

`removeGlobalStyles` removes the first element matching a given id and returns `true`, or `false` when no match exists.

## Theme variable fallback contract

A theme satisfies a required variable by declaring it or by inheriting the canonical fallback in `themeCssVarFallbacks`. `ColorConfig.setTheme` iterates `themeCssVarFallbacks` and prepends a `:root {}` block for any variable the theme omitted, so non-PMD themes render visible UI for all 17 fallback vars (issues #25, #34). No bundled theme is required to declare the 6 `requiredThemeCssVars` or the 11 `supplementalThemeFallbackCssVars`; the fallback fills the gap.

10 bundled themes contain selector rules beyond `:root {}` (`azur-lane`, `abyssbox-classic`, `abyssbox-light`, `light-classic`, `roe-light`, `todbox-dark-mode`, `jummbox-light`, `shitbox-3`, `brucebox`, `wackybox`). Do not flatten these into pure variable maps during migrations.

Custom themes are stored as raw CSS in `localStorage` under key `customColors`; key `colorTheme` holds the selected theme name. `shared/themes/index.ts` reads `customColors` at module load into `themes["custom"]`. The storage format is raw CSS, unchanged by this contract.
