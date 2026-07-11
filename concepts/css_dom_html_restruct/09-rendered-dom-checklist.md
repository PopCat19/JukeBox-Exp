# Rendered-DOM confirmation checklist

Purpose: Repeatable manual browser verification for css/dom/html contracts. Issue #30 phase 2.

**Milestone:** Tree-wide css/dom/html restruct
**Labels:** `test`, `css`, `dom`
**Depends on:** #08 (guards), audit §8

## Scope

Static guards (bun:test) prove structure: CSS variable registration, style slot uniqueness, DOM hook literals, editor selector scoping, website HTML contract. They cannot prove rendered behavior. This checklist covers the paths audit §8 requires a human to confirm against a live browser.

No candidate unused declaration (audit §4.2) may be removed based on this checklist alone. Removal requires a separate follow-up issue with focused per-selector evidence.

## Prerequisites

- `bun run build` succeeds
- `bun run build:offline` succeeds
- `bun test` passes (1148+ tests)
- `bun run typecheck:all` clean
- Dev server: `bun run dev` (COOP/COEP headers for SharedArrayBuffer)

## Editor paths

Open the editor at `http://localhost:3000/` (or the dev server URL). Exercise each path at desktop width (>= 711px) and narrow width (< 710px). Record: PASS/FAIL, browser, viewport width, any visual regression.

### Settings and controls

| # | Path | Width | Expected |
|---|------|-------|----------|
| E1 | Song settings panel open | desktop + narrow | Settings render, no overflow |
| E2 | Instrument settings panel open | desktop + narrow | Settings render, no overflow |
| E3 | Track controls (mute, solo, channel select) | desktop + narrow | Controls respond, no overlap |
| E4 | Mod settings open | desktop + narrow | Mod sliders and targets render |

### Prompts

Open each prompt type. Confirm: prompt appears, title visible, close works, no layout break.

| # | Prompt type | Width | Expected |
|---|-------------|-------|----------|
| E5 | Export prompt | desktop | Renders, export button works |
| E6 | Custom theme / palette prompt | desktop | Color preview renders |
| E7 | Add samples prompt | desktop | Sample browser renders |
| E8 | Keyboard shortcuts prompt | desktop | Shortcut list renders |
| E9 | Clean channel prompt | desktop | Renders |
| E10 | Compact search prompt | desktop | Search input renders |
| E11 | Copy/paste instrument flow | desktop | Copy then paste works |

### Theme switching

| # | Path | Expected |
|---|------|----------|
| E12 | Switch through 5+ named themes | All themes apply, no missing variables (invisible UI) |
| E13 | PMD theme path | PMD colors apply, no missing variables |

## Player paths

### Single instance

| # | Path | Expected |
|---|------|----------|
| P1 | Player embed standalone | Player renders, play/pause works, timeline updates |
| P2 | Player volume slider | Slider responds, volume changes |

### Multi-instance beside editor

| # | Path | Expected |
|---|------|----------|
| P3 | Two players on one page | No `#spectrumAll` collision, no `#volumeGrad2` collision |
| P4 | Player beside editor | No ID collision, both function independently |

## Website paths

| # | URL | Expected |
|---|-----|----------|
| W1 | `/` (index) | Landing page renders, editor embed loads |
| W2 | `/manual/introduction.html` | Manual page renders, nav present |
| W3 | `/manual/faq.html` | FAQ renders, nav present |
| W4 | `/manual/keybinds.html` | Keybinds render, nav present |
| W5 | `/manual/patch_notes.html` | Patch notes render, nav present |
| W6 | `/offline/index.html` | Offline page loads, plays without network |
| W7 | `/player/index.html` | Player embed loads, plays |
| W8 | `/sample_extractor.html` | Tool loads, functions |
| W9 | `/snake.html` | Game loads |
| W10 | `/synth_example.html` | Example renders |
| W11 | `/Bluesky.html` | Page renders |
| W12 | `/macandcheese.html` | Page renders |
| W13 | `/404.html` (any invalid URL) | 404 page renders |

## Keyboard navigation

| # | Path | Expected |
|---|------|----------|
| K1 | Tab through editor controls | Focus visible, logical order |
| K2 | Tab through website nav | Focus visible, logical order |
| K3 | Enter/Space activates buttons | Buttons respond |
| K4 | Escape closes prompts | Prompts dismiss |

## HTML validator

Run each migrated page through the W3C validator (<https://validator.w3.org/> or local vnu).

| # | Page | Result |
|---|------|--------|
| V1 | `website/index.html` | |
| V2 | `website/manual/introduction.html` | |
| V3 | `website/manual/faq.html` | |
| V4 | `website/offline/index.html` | |
| V5 | `website/player/index.html` | |

## Candidate unused declarations (audit §4.2)

This checklist does NOT authorize removal. Record observations here for a future cleanup issue. For each candidate, open the relevant editor path and note whether the class appears on any rendered element.

Candidates to observe: `ccpPaneContainer`, `instrumentCopyPasteRow`, `copy-instrument`, `customize-instrument`, `envelope-settings`, `exportButton`, `editor-right-side-top`, `editor-right-side-bottom`, `keySeparator`, `labelRow`, `muteButtonSelectBox`, `invalidSetting`, `chipEditorContainer`, `dropdown-open`, `modActive`, `modMute`, `modSlider`, `modTarget`.

| Candidate | Path exercised | Observed on element? |
|-----------|----------------|---------------------|
| | | |

## Completion

When all paths pass, record:

- Date:
- Browser(s):
- Dev server commit:
- Result: PASS / FAIL (with notes)

This checklist is a prerequisite for closing milestone #5. It does not replace the bun:test guards.
