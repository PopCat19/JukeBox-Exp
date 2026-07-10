# Give the embedded player a scoped DOM and CSS boundary

Purpose: Isolate player presentation from editor and page styles while preserving embed behavior.

**Milestone:** Tree-wide css/dom/html restruct  
**Labels:** `refactor`, `css`, `dom`, `player`  
**Depends on:** #02, #03

## Problem

`player/player-ui.ts` constructs its DOM and CSS together. The player needs a stable root and selector namespace for embedding beside arbitrary host pages.

## Scope

- Define a player root container and mount all player elements under it instead of appending directly to `document.body`.
- Make element IDs instance-safe. `spectrumAll` and `volumeGrad2` currently collide when multiple players coexist.
- Split player base layout, controls, responsive rules, and theme consumption into owned CSS sections.
- Ensure player style injection uses its dedicated slot.
- Remove dependencies on global element selectors where a player-scoped selector is required.
- Decide between light-dom scoping and shadow DOM or iframe isolation for host-page containment.

## Acceptance criteria

- All player elements mount under a single player root container, not directly on `document.body`.
- Player-owned selectors are rooted under the player container.
- Element IDs are instance-safe, so multiple players on one page do not collide on `spectrumAll` or `volumeGrad2`.
- Multiple players can coexist without duplicate injected styles.
- Player consumes the shared theme contract without editor-only selectors.
- Keyboard and pointer controls retain their current behavior.
- Host-page containment strategy is documented: light-dom scoping limits the claim to player-owned selectors, or shadow DOM and iframe isolation provide full containment.

## Verification

- Render two players on one page with contrasting host CSS.
- Test default theme, a bundled theme, responsive width, playback, seek, volume, and spectrum display.

## Risk

Light DOM cannot fully isolate from arbitrary host CSS. Full containment needs shadow DOM or an iframe, both of which affect event handling and theme variable inheritance. Some existing consumers can rely on current IDs or `document.body` append order. Audit public embed hooks before changing them.
