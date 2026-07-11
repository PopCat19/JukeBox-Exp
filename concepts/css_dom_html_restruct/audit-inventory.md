# CSS DOM HTML ownership audit

Purpose: Baseline inventory of every style source, DOM hook, CSS custom property, and selector owner across the four bounded contexts. Feeds issues #24-#30.

Scope: documentation only. This inventory changes no `editor/`, `player/`, `shared/`, `synth/`, or `website/` source. Line references are the measured baseline at the time of audit; re-confirm before any migration edit.

Milestone: #5, tree-wide css/dom/html restruct. Issue: #23.

## 1. Style source inventory

Every site that puts CSS into a document. "Method" is the injection path. "Slot tag" is the `data-jb-style` identifier when the tagged injector is used; ad-hoc elements have none and are migration targets for #24.

| Source | Context | Method | Slot tag | Lines | Notes |
|---|---|---|---|---|---|
| `shared/styles/inject.ts` | shared | tagged injector helper | n/a | 1-21 | `injectGlobalStyles(doc, id, css)`. Dedupes by `data-jb-style`. The only sanctioned injection path. |
| `editor/rendering/style.ts` | editor | tagged inject | `editor-main` | ~50-255 | Concatenates `:root` vars + `buildIconSymbolsCSS()` + `buildDesignTokensCSS()` + 16 sub-modules. Scrollbar test appends then removes a div on `document.body` at 34-43. |
| `editor/rendering/styles/*.ts` (16 files) | editor | string fragments fed into `editor-main` | (part of `editor-main`) | see `editor/rendering/styles/context.md` | `animations`, `base-widgets`, `editor-layout`, `filter-editors`, `form-inputs`, `icon-buttons`, `icon-symbols`, `prompt-clean-channel`, `prompt-compact-search`, `prompt-keyboard-shortcuts`, `prompt-misc`, `prompt-sample-browser`, `prompt-shell`, `prompt-small`, `responsive`, `shared-ui`. |
| `editor/ui/interactions.ts` | editor | tagged inject | `pmd-interactions` | 37 (inject), 18-22 (class consts) | PMD hover/focus/active/disabled rules. Classes `pmd-hover`, `pmd-hover-color`, `pmd-focus`, `pmd-active`, `pmd-disabled` defined at 18-22. |
| `editor/ui/layout/layout.ts` | editor | ad-hoc `<style>` | none | 534, 538, 545 | `Layout._styleElement`. `HTML.style` appendChild to `document.head`. Bypasses tagged injector. #24 target. |
| `shared/color-config.ts` | shared | ad-hoc `<style>` | none | 1002, 1006, 1015, 1019 | `ColorConfig._styleElement`. `textContent = ""` for PMD path (1015), `textContent = theme` for named themes (1019). Fallback block reads `getComputedStyle` for ~140 vars at 1026-1667. Bypasses tagged injector. #24 target. |
| `shared/pmd-adapter.ts` | shared | inline `setProperty` on `:root` | none | 27, 30, 183 | `root = document.documentElement`; `set` closures call `root.style.setProperty(name, value)`. ~80 UI + channel color vars. Runtime theme path. |
| `shared/themes/*.ts` (58 files) | shared | CSS strings consumed by `ColorConfig._styleElement` | none | per file | Each exports a `:root { --var: value; }` block. Loaded via `shared/themes/index.ts`. |
| `shared/styles/design-tokens.ts` | shared | CSS string fed into `editor-main` and `player-main` | (part of host slot) | 1-122 | `buildDesignTokensCSS()`. ~92 spacing/gap/padding/border/font/z/anim/sizing/icon/opacity/shadow tokens. |
| `player/player-ui.ts` | player | tagged inject | `player-main` | 338 | `injectGlobalStyles(document, "player-main", buildPlayerCSS())`. Calls `buildDesignTokensCSS()`. |
| `editor/core/prompt-popout.ts` | editor | ad-hoc `<style>` in popout doc | `data-popout-style` | 37, 88, 205-239, 255 | `POPOUT_STYLE_ATTR`. Base style at 88. `_cloneStyles` clones source `<style>` nodes at 211 and copies `documentElement` inline vars at 225-239. Sets `--prompt-bg-color`, `--prompt-backdrop-filter` at 103-104, 130-131. |
| `editor/prompts/palette-prompt.ts` | editor | ad-hoc `<style>` | none (id `custom-palette-preview`) | 367 | Custom palette preview. Removed/recreated per prompt. |
| `editor/components/shiggy/types.ts` | editor | ad-hoc `<style>` | none (id `shiggy-css`) | 99 | Shiggy overlay CSS. |
| `website/common.css` | website | static CSS file | n/a | ~80 | Page chrome: body, h1/h2/a, 710px breakpoint. |
| `website/index.css` | website | static CSS file | n/a | 1-40 | `#beepboxEditorContainer`, `#text-content`, `#Hotdog`, `h1`, `a`, `.bsky-column`. |
| `website/manual/subpages.css` | website | static CSS file | n/a | per file | Manual page styling. |
| `website/offline/select2.min.css` | website | static CSS file (vendored) | n/a | 1 | Minified external dep. |
| `website/assets/fonts/google/fonts.css` | website | static CSS file | n/a | per file | Self-hosted Fredoka, Fira Code. |
| Inline `element.style.*` mutations | editor | inline | n/a | ~977 sites | 157 `setProperty`, 12 `cssText`, rest direct `.style.X =`. Hot spots: `song-editor.ts`, `event-listener-setup.ts`, `render-mod-settings.ts`, `channel-row.ts`, prompt factories. See runtime exceptions section. |
| Inline `element.style.*` mutations | player | inline | n/a | ~19 sites | `player-timeline.ts` (12), `player-controls.ts` (7). |
| Inline `style=` in HTML | website | inline | n/a | ~26 in `index.html` | Landing page link cards. `faq.html`, `instructions.html` have 1 each. |
| Inline `<style>` blocks in HTML | website | inline `<style>` element | n/a | `404.html:24`, `website/index_debug.html:22`, `website/offline/index.html:27`, `website/player/index.html:22`, `website/Bluesky.html:27`, `website/macandcheese.html:25`, `website/sample_extractor.html:16`, `website/slarmoosbox_offline_template.html:35`, `website/snake.html:25` | Page-local style blocks in standalone HTML pages. #07 moves these to owned stylesheet classes. |
| External CDN CSS | website | `<link>` to CDN | n/a | `index.html:9`, `index_debug.html:9` | `select2.min.css` from cdnjs. |
| Vendored external CSS | website | `<link>` to local file | n/a | `Bluesky.html:7` (`patch_notes_files/select2.min.css`), `Bluesky.html:26` (`patch_notes_files/css.css`), `slarmoosbox_offline_template.html:8` (`offline_deps/select2.min.css`), `offline/index.html:7` (`select2.min.css`) | Local vendored copies beyond the one in `website/offline/select2.min.css`. |

Totals: 5 static CSS files in `website/` (common, index, manual/subpages, offline/select2.min, fonts). 3 tagged slots (`editor-main`, `pmd-interactions`, `player-main`). 5 ad-hoc `<style>` sources bypassing the tagged injector: `Layout._styleElement`, `ColorConfig._styleElement`, `prompt-popout` base, `palette-prompt`, `shiggy-css`. Plus inline `<style>` blocks in 9 standalone HTML pages and 2 CDN `<link>`s.

## 2. DOM hook inventory

Stable hooks a consumer can reach by ID, class, or data attribute. "Owner" creates and owns the markup. "Scope" is the selector root.

| Hook | Kind | Owner (creator) | Consumers | Scope | Collision |
|---|---|---|---|---|---|
| `#beepboxEditorContainer` | id | website (`index.html`) | `editor/main.ts:36-37` mounts `editor.mainLayer` | page root | none |
| `.beepboxEditor` | class | `editor/song-editor.ts:2245` (`mainLayer`) | `editor-main` selectors; `main.ts:41-47` adds `load` class. (`pmd-interactions` and `Layout._styleElement` are separate slots, not under this root) | editor root | none |
| `.promptContainer` | class | `editor/song-editor.ts:1997-1998` | `editor/core/prompt-manager.ts`; styled `editor/rendering/styles/prompt-shell.ts:15,26` | `.beepboxEditor .promptContainer` (scoped) | none |
| `.prompt` | class | `editor/ui/style.ts:98-99` (`promptFrame`, also adds `noSelection`) | `prompt-shell.ts`; prompt factories | `.beepboxEditor .prompt` | none |
| `.noSelection` | class | `editor/ui/style.ts:99` | editor CSS `editor/rendering/style.ts` | `.beepboxEditor .noSelection` | none |
| `.pattern-area`, `.settings-area`, `.editor-song-settings`, `.instrument-settings-area`, `.trackAndMuteContainer`, `.barScrollBar` | class | `editor/song-editor.ts` | `editor/main.ts:42-47` adds `load`; `editor-main` grid | `.beepboxEditor .<class>` | none |
| `#spectrumAll` | id | `editor/song-editor.ts:1713` and `player/player-ui.ts:354` | editor `editor-layout.ts:137` (`.beepboxEditor canvas#spectrumAll`); player bare `#spectrumAll` | editor scoped, player unscoped | yes, ID collision when both on one page. #06 target. |
| `#volumeGrad2` | SVG id | `editor/components/playback-controls.ts:132,150` and `player/player-ui.ts:475,489` | `fill: url('#volumeGrad2')` in both | document-scoped (SVG ids) | yes, duplicate SVG id. #06 target. |
| `#text-content` | id | website (`index.html`) | `editor/rendering/render-layout.ts:121-122` | page root | none |
| `#presetTagsInputBox` | id | editor | `editor/ui/tag-autocomplete.ts:147`, `editor/song.ts:1216` | editor | none |
| `#custom-palette-preview` | id | `editor/prompts/palette-prompt.ts:365,378` | same file | prompt-local | none |
| `#secondImage` | id | `editor/prompts/custom-theme-prompt.ts:223,262` | same file | prompt-local | none |
| `#shiggy-css` | id | `editor/components/shiggy/types.ts:98` | same file | overlay | none |
| `.pm-player-*` | class | `player/player-ui.ts` | player CSS in `player-main` | player elements (appended to `document.body` at 535-536, no root container) | none within player; no namespace root. #06 target. |
| `.sampleLoadingContainer` | class | `player/player-ui.ts:513` (combined with `pm-player-sample-bar-container`) | player | player | none found in editor (scout report of editor use unconfirmed; grep finds player only) |
| `data-popout-style` | attr | `editor/core/prompt-popout.ts:37` | popout style cloning | popout document | none |
| `data-popout` | attr | `editor/core/prompt-popout.ts:132` (set on `container.dataset.popout`), removed at 187, 201 | `editor/rendering/styles/prompt-shell.ts:219-226` (`.beepboxEditor .prompt[data-popout="true"]` hover/focus/shade/popout button rules) | `.prompt` container | none. #05 formalizes alongside state classes. |
| Prompt state classes `entering`, `exiting`, `focused`, `refocus`, `docked` | class | `editor/core/prompt-manager.ts` (294, 377, 386, 419-427, 627-632) and `editor/core/prompt-dock.ts` (149, 199 for `docked`) | prompt-manager, prompt-dock, prompt-shell CSS | `.prompt` container | none. #05 will formalize the contract. |
| `data-pmd-role` | attr | `editor/ui/interactions.ts` (`hoverReveal`) | interactions CSS | per element | none |
| `obtrusive-scrollbars` | class | `editor/rendering/style.ts:39` (on `documentElement`) | `editor-main` scrollbar rules | `documentElement` | none |
| `document.body` appends | root | editor (`dev-inspector`, copy text fields, shiggy overlays, download links), player (`player-ui.ts:535-536`) | various | page body | player has no root container. #06 target. |

Player element classes observed: `pm-player-spectrum`, `pm-player-title`, `pm-player-link`, `pm-player-play-btn`, `pm-player-btn-container`, `pm-player-icon-btn`, `pm-player-vol-slider`, `pm-player-vol-icon`, `pm-player-timeline`, `pm-player-playhead`, `pm-player-timeline-container`, `pm-player-viz-container`, `pm-player-sample-bar`, `pm-player-sample-bar-container`, `pm-player-sample-status-row`, `pm-player-vol-bar-wrapper`, `pm-player-control-bar`.

## 3. CSS custom property classification

Builds on `shared/styles/css-var-contract.ts`. Do not duplicate the variable lists here; this section maps contract groups to the four required categories and flags reclassification candidates. Source of truth for membership is the contract file and its test.

Contract groups (confirmed counts):

| Contract group | Members | Category | Notes |
|---|---|---|---|
| `themeCoreCssVars` | 45 | theme | Core UI colors. Every bundled theme supplies these or inherits. |
| `channelColorCssVars` | 167 | theme | Per-channel color vars. Supplied by themes and PMD adapter. |
| `designTokenCssVars` | 92 | layout | Spacing, gap, padding, border, typography, z-index, animation, sizing, icon, opacity, shadow, backdrop. Defined in `design-tokens.ts`. |
| `iconSymbolCssVars` | 55 | component | Icon SVG data-URI custom properties. |
| `interactionStateCssVars` | 7 | runtime state | `--background-color-dim/lit`, `--hover-color-accent/idle`, `--slider-track`, `--text-color-lit`, `--tip-text`. Set per-element at runtime by `interactions.ts`. |
| `layoutTokenCssVars` | 7 | layout | `--button-size`, `--flex-fill/fit/stretch`, `--input-width-sm`, `--pane-gap`, `--settings-area-width`. Defined in `editor-main` `:root` and consumed editor-wide. |
| `promptSurfaceCssVars` | 18 | component | Prompt surface colors and prompt sizing (`--prompt-width-*`, `--prompt-row-height`, `--prompt-bg-color`, `--prompt-backdrop-filter`, CTA, tab, list-item vars). |
| `miscCssVars` | 3 | mixed (classified below) | `--ease` → layout (animation easing token); `--input-box-outline` → component (input surface border); `--mute-editor-text-dim` → theme (theme-supplied text dim value). #03 may move each into its primary group. |

Total: 394 known custom properties.

Required theme variables (`requiredThemeCssVars`, 6): `--editor-background`, `--primary-text`, `--secondary-text`, `--ui-widget-background`, `--indicator-primary`, `--indicator-secondary`. Every bundled theme must satisfy these. Enforced by `tests/css-var-contract.test.ts`.

Definition sites beyond the contract catalog:

- `editor/rendering/style.ts` `:root` block: `--padding-*`, `--gap-*`, `--prompt-width-*`, `--prompt-row-height`, `--flex-*`, `--pane-gap`, `--hout`, `--ease`, `--button-size`, `--settings-area-width`, `--border-radius-medium/large`. Several overlap `layoutTokenCssVars` and `designTokenCssVars`; the contract is the dedup authority.
- `shared/pmd-adapter.ts`: sets ~80 UI and channel vars on `document.documentElement.style` at runtime (PMD theme path).
- `shared/color-config.ts` fallback block: appends `:root` fallbacks for ~140 vars when a theme omits them (1026-1667).

Variable naming: plain `--kebab-case`. No `--jb-*` or `--custom-*` prefix convention exists. #03 decides the final prefix policy.

## 4. Duplicate selectors and candidate unused declarations

Dynamic markup makes static proof unsound. Findings below are static candidates. Each unused candidate is marked needs rendered-DOM confirmation and lists the runtime path to check.

### 4.1 Confirmed duplicate selectors and ID collisions

| Item | Sites | Severity | Resolution |
|---|---|---|---|
| `#spectrumAll` | `editor/song-editor.ts:1713`, `player/player-ui.ts:354` | high | Editor scopes via `.beepboxEditor canvas#spectrumAll` (`editor-layout.ts:137`); player uses bare `#spectrumAll`. Two players, or a player beside an editor, collide. #06 makes player IDs instance-safe. |
| `#volumeGrad2` | `editor/components/playback-controls.ts:132,150`, `player/player-ui.ts:475,489` | high | SVG ids are document-scoped. `url('#volumeGrad2')` resolves to the first def. #06 resolves. |
| `.sampleLoadingContainer` | `player/player-ui.ts:513` (paired with `pm-player-sample-bar-container`) | low | Only player use found. If editor ever uses it, it is an unscoped shared class. Confirm in rendered editor. |

### 4.2 Candidate unused declarations

Static scan: 311 class selectors defined across `editor/rendering/styles/*.ts`. Cross-referencing against `class:` and `className` string literals in `editor/` leaves a residue of candidates. This residue is unreliable because:

- State classes (`entering`, `exiting`, `focused`, `refocus`, `docked`, `active`, `disabled`, `muted`, `collapsed`, `dimmed`) are added via `classList.add` at runtime, not `class:` attributes, so they false-positive as unused.
- Generated prompt and settings markup constructs class names dynamically.
- Some selectors are overridden by specificity, not unused.

Do not remove any declaration from this list without a rendered-DOM confirmation.

Candidate residue to verify (sample, not exhaustive):

- `ccpPaneContainer`, `instrumentCopyPasteRow`, `copy-instrument`, `customize-instrument`, `envelope-settings`, `exportButton`, `editor-right-side-top`, `editor-right-side-bottom`, `keySeparator`, `labelRow`, `muteButtonSelectBox`, `invalidSetting`, `chipEditorContainer`, `dropdown-open`, `modActive`, `modMute`, `modSlider`, `modTarget`.

Rendered-DOM confirmation path: open the editor at desktop and narrow widths, open song settings, instrument settings, track controls, each prompt type, mod settings, and the copy/paste flow. For each candidate, confirm no element carries the class. #08 phase 2 adds a repeatable checklist.

### 4.3 Duplicate selector strings across style modules

Not exhaustively measured. The 16 sub-modules concatenated into `editor-main` can define the same selector in more than one module; later definitions win by source order. A full duplicate-selector pass should run against rendered DOM after #24 injects named slots, so order is explicit. Flag this as a #08 guard target.

## 5. Target class naming and selector-scoping rules

Rules to enforce before and during #26-#29 migrations. Preserve existing conventions; make them explicit.

Editor:

- Root scope: `.beepboxEditor`. All editor selectors root under it. Exception: `:root` custom properties and `html`/`.obtrusive-scrollbars` scrollbar rules in `editor-main`, which are page-level by necessity.
- Component classes: kebab-case, no shared prefix beyond the root scope (for example `.pattern-area`, `.settings-area`, `.prompt-shell`). New component classes keep one concern and one owner.
- Prompt state classes: `entering`, `exiting`, `focused`, `refocus`, `docked`, plus the `data-popout` attribute. #05 formalizes the set. Do not invent ad-hoc state classes.
- Interaction classes: `pmd-hover`, `pmd-hover-color`, `pmd-focus`, `pmd-active`, `pmd-disabled`. Owned by `editor/ui/interactions.ts`. No other module defines these.
- Bare classes without the root scope are disallowed in new CSS. `promptContainer` is scoped as `.beepboxEditor .promptContainer` and stays that way.

Player:

- Class prefix: `pm-player-*`. All player-owned selectors root under the future player root container (#06). Until #06 lands, treat `document.body` append as the implicit, unscoped root and avoid bare tag selectors.
- IDs: instance-safe after #06. No bare `#spectrumAll` or `#volumeGrad2` in player selectors.

Shared:

- `shared/styles/inject.ts` is the only style injection path. New style sources use `injectGlobalStyles` with a unique `data-jb-style` id. Ad-hoc `<style>` creation is a #24 migration target, not a new pattern.
- `shared/styles/design-tokens.ts` and `shared/styles/css-var-contract.ts` are the only token and variable authorities. New CSS consumes tokens or documented component-local vars, not raw values.
- Theme files (`shared/themes/*.ts`) define `:root` variable maps. Theme-specific selector rules stay separate and documented (#03 risk).

Website:

- `#beepboxEditorContainer` and `#text-content` are the page-level hooks the editor mounts into. Owned by website. Editor consumes them read-only.
- Manual and landing pages move to semantic landmarks (`header`, `main`, `nav`, `footer`) under #07. Static inline `style` and inline handlers are removed.

Selector scoping:

- No selector reaches across an unrelated component boundary.
- No editor selector matches player elements, and vice versa.
- `document.body` and `document.documentElement` selectors are page-level and owned by the page or the shared injector, never by a component.

## 6. Runtime geometry exceptions

Inline styles that are dynamic by necessity and stay in TypeScript after migrations. Documented so #04 and #06 do not convert them blindly.

- Canvas CSS and bitmap sizing: `editor/components/pattern-editor.ts:377` sets `canvas.style.cssText` coupled to canvas `width`/`height` attributes. CSS pixel size and backing-store size must stay synchronized or pointer coordinates desync. `editor-layout.ts:128` scopes `.beepboxEditor canvas`. Keep canvas dimension assignment in TS.
- Prompt position and drag: `editor/core/prompt-manager.ts`, `prompt-dock.ts:122-123` reads `c.style.left/top`; `prompt-dock.ts:249` and prompt factories set measured coordinates via `style.setProperty` and inline `style`. Keep measured position inline. Static animation and visual state move to classes under #05.
- Dock divider padding: `prompt-dock.ts` adjusts `.beepboxEditor` padding to pin docked prompts. Measured, keep inline.
- Player timeline and controls: `player/player-timeline.ts` (12 inline sites) and `player-controls.ts` (7 inline sites) set width, opacity, left, background, color from playback state. Runtime, keep inline.
- PMD theme vars: `shared/pmd-adapter.ts` sets ~80 vars on `document.documentElement.style` at runtime. Not a style element; #03 governs the contract, #24 does not fold these into a slot.
- `ColorConfig` fallback block: `shared/color-config.ts:1026-1667` reads `getComputedStyle` and appends fallback `:root` rules. Runtime theme resolution, stays in TS until #03 provides canonical fallbacks.

## 7. Cross-context ownership matrix

| Concern | editor | player | shared | website | synth |
|---|---|---|---|---|---|
| Static CSS files | none | none | none | 5 files | none |
| Tagged style slots | `editor-main`, `pmd-interactions` | `player-main` | `inject.ts` (helper) | none | none |
| Ad-hoc `<style>` | `layout.ts`, `prompt-popout.ts`, `palette-prompt.ts`, `shiggy/types.ts` | none | `color-config.ts` | none | none |
| Theme CSS | consumes | consumes (via `player-main`) | owns (`color-config.ts`, `themes/`, `pmd-adapter.ts`) | none | none |
| Design tokens | consumes | consumes | owns (`design-tokens.ts`) | none | none |
| Var contract | consumes | consumes | owns (`css-var-contract.ts`) | none | none |
| DOM root | `.beepboxEditor` under `#beepboxEditorContainer` | `document.body` (no container) | none | `#beepboxEditorContainer`, `#text-content` | none |
| Inline style mutations | ~977 sites | ~19 sites | 2 sites (`pmd-adapter.ts`) | ~26 `style=` in `index.html`, inline `<style>` in 9 pages, 2 CDN `<link>`s, vendored `<link>`s | none |
| Canvas/geometry | owns (pattern editor, spectrum) | owns (spectrum, timeline) | none | none | none |
| Prompt lifecycle | owns (`prompt-manager`, `prompt-dock`, `prompt-popout`) | none | none | none | none |
| DOM or CSS | yes | yes | helpers and theme only | yes | none |

`synth/` has no DOM or CSS. It is audio-only and out of scope for this milestone except where worklet config touches theme reads.

## 8. Acceptance criteria status

- [x] Every style source identified with owning bounded context. Section 1 covers static CSS files, tagged slots, ad-hoc `<style>` elements, inline `style=` and `<style>` blocks in HTML, CDN and vendored `<link>`s, and runtime `setProperty` paths.
- [x] Each stable DOM hook names owner and consumer. Section 2, including `data-popout`.
- [x] Each CSS custom property classified. Section 3 maps all 394 known properties to theme, layout, component, or runtime state. `miscCssVars` members classified individually; #03 may regroup them.
- [~] Duplicate selectors marked. Section 4.1 lists confirmed collisions. Sections 4.2 and 4.3 are static candidates.
- [~] Candidate unused declarations marked, not statically proven. Section 4.2 lists candidates with the rendered-DOM confirmation path.
- [x] Target class naming and selector-scoping rules written. Section 5.
- [x] Runtime geometry exceptions documented. Section 6.

### Rendered-DOM confirmation status

This audit is static. It was produced by grep and source reads, not a browser session. The issue requires candidate unused declarations and duplicate selectors to be confirmed against rendered editor and player DOM because dynamic markup makes static proof unsound. That confirmation was not performed here: no browser harness ran in this session. Sections 4.2 and 4.3 therefore mark findings as candidates only and name the runtime paths a reviewer must exercise before removing anything. Required browser confirmation: editor at desktop and narrow widths with song settings, instrument settings, track controls, each prompt type, mod settings, and the copy/paste flow open; player single-instance and multi-instance beside an editor. This confirmation is a #08 phase 2 manual step and a prerequisite to any removal in #26-#29. No candidate unused declaration may be removed on static evidence alone.

Baseline guards: `tests/css-var-contract.test.ts` and `tests/style-inject.test.ts` are the existing regression guards. #08 phase 1 extends them before migration.
