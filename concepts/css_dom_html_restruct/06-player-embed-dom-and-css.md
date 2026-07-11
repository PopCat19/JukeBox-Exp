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

## Decisions

- Containment strategy: light-DOM scoping. One `.pm-player` root div per instance holds every player-owned element. All player selectors root under `.pm-player`. The `:root` design-token block stays page-level (audit section 5: `:root` custom properties are page-level by necessity). This limits the containment claim to player-owned selectors; a host page can still override `.pm-player` descendants by specificity and override player CSS vars at `:root`. Shadow DOM and iframe were rejected: both change event handling and theme-variable inheritance, exceeding the boundary scope.
- Instance-safe IDs: the `spectrumAll` canvas id is removed (class-only selection; `spectrumCanvas` takes the canvas element directly, no id lookup). The `volumeGrad2` SVG id is generated per instance as `volumeGrad2-<n>` from a module-level monotonic counter in `player/player-ui.ts`, referenced in both the `linearGradient` id and the `outVolumeBar` fill. A counter is used instead of a random suffix because random ids can collide; a counter cannot.
- Style injection stays on the `player-main` tagged slot via `injectGlobalStyles`. Repeated calls update the existing `<style>` in place; no duplicate styles for coexisting instances.
- Out of scope, deferred to a separate player runtime issue: module-level timeline render and cache state (`player/player-timeline.ts`: `timelineWidth`, `noteFlashElementsPerBar`, `currentNoteFlashBar`, `cachedVizWidth`), global `spectrumUpdate` fan-out through the `events` singleton in `shared/spectrum.ts`, and verification of independently rendered simultaneous playback. Light-DOM rooting and instance-safe IDs do not prove functional coexistence of two playing instances; that is a runtime architecture concern, not a DOM/CSS boundary concern.
- The 19 audited inline style sites in `player/player-timeline.ts` (12) and `player/player-controls.ts` (7) stay inline (audit section 6 runtime geometry exceptions). They are runtime-determined: timeline geometry from measurement, note opacity and sample-load progress from playback state, zoom and embed-mode visibility from toggle state. CSS classes cannot reproduce them.

## Risk

Light DOM cannot fully isolate from arbitrary host CSS. Full containment needs shadow DOM or an iframe, both of which affect event handling and theme variable inheritance. Some existing consumers can rely on current IDs or `document.body` append order. Audit public embed hooks before changing them.
