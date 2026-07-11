# shared/styles/ context

Purpose: Shared design token stylesheets using Constructable Stylesheets API.

## Files

- `css-var-contract.ts`, CSS custom property contract for themes, shared styles, editor, and player
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
