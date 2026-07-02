# Changelog

All notable changes to JukeBox-Exp are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) once releases begin.

## [Unreleased]

### Fixed

- Replaced detached `fetch().then()` chain in `startLoadingSample` with
  await + try/catch/finally so the returned `Promise<void>` reflects
  completion instead of resolving before the fetch settles.
- Dropped redundant async wrapper around `Synth.resumeAudioContext`;
  callers now await `_audio.resumeContext` directly.
- Hardened `palette-prompt.ts:extractDefault` regex against future use of
  regex metacharacters in CSS variable names (previously only `-` was
  escaped).
- Switched `innerHTML` clear/assignment to `replaceChildren()` / `textContent`
  in palette-prompt and pattern-editor to avoid XSS surface.

### Changed

- Removed dead commented-out code blocks across synth and editor (filtering,
  presets, notes, song, instrument-state, envelope-computer, picked-string,
  synth, instrument, chip, effects, json-serialization, config-class,
  pattern-editor, track-editor, filter-editor, envelope-editor,
  custom-algorithm-canvas).
- Removed unused dev/runtime dependencies: `@tabler/icons`, `bun-types`,
  `five-server`.

### Refactor

- Dropped `_`-prefixed unused catch bindings in `player-ui.ts`,
  `song-utilities.ts`, `debug-tools.ts` and added rationale comments for
  intentional silent-failure paths (private-browsing localStorage, URL
  validity probing, clipboard JSON parse).

## [0.0.1] - 2026-07-02

Initial experimental fork baseline. Browser-based music sketching tool with
URL-encoded song data, multi-format synthesizer, mod system, and themeable
palette.
