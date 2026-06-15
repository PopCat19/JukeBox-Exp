# Maintainability Audit Report

**Date:** 2026-04-07
**Previous Score:** 5.6/10 (2026-04-01)
**Current Score:** 5.2/10

## Executive Summary

The codebase has a solid architectural foundation (clean synth/editor/player/shared separation) and strong tooling (TypeScript strict mode passes, CI configured). However, deep structural issues persist: god-class patterns, near-zero test coverage, and systematic code duplication across the editor change system. The codebase is functional but accumulating technical debt faster than it's being paid down.

## Health Checks

| Check | Status |
|-------|--------|
| TypeScript typecheck (all 3 configs) | ✅ Pass |
| Test suite (65 tests, 2 files) | ✅ All pass |
| Biome linter | ⚠️ Cannot run in NixOS env |
| CI (GitHub Actions) | ✅ Lint + typecheck on push/PR |

## Critical Issues

### 1. God Classes (Score: 3/10)

| Class | File | Lines | Members | Responsibilities |
|-------|------|------:|--------:|-----------------|
| `Synth` | `synth/synth.ts` | 4,635 | 126 | Audio synthesis, playback, modulation, navigation, filtering |
| `SongEditor` | `editor/song-editor.ts` | 4,093 | 577 | UI layout, input, editing, playback, prompts |
| `PatternEditor` | `editor/components/pattern-editor.ts` | 3,533 | 134 | Pattern rendering, input handling, editing |
| `InstrumentState` | `synth/instrument-state.ts` | 1,291 | 160 | DSP state, filter computation, envelope management |
| `Instrument` | `synth/instruments.ts` | ~800 | 179 | Serialization, filters, envelopes, capabilities |

**Worst offender:** `SongEditor` with 577 members and 6 interface implementations. This class handles UI layout, input handling, song editing, playback control, and prompt management.

**Longest function:** `Synth.computeTone()` at `synth/synth.ts:2804` spans 1,165 lines with 1,736 lines at 5+ indentation levels.

### 2. Test Coverage Crisis (Score: 2/10)

- **2 test files** covering ~2% of modules (335 total .ts files)
- **0 tests** for: song serialization (4,533 lines), note operations, instrument state, filtering, plugin registry, player, shared utilities
- **No test fixtures, mocks, or shared test utilities exist**

| Untested Critical Path | Risk | Lines |
|----------------------|------|------:|
| `synth/song-serialization.ts` | Data corruption | 4,533 |
| `synth/synth.ts` (core engine) | Audio correctness | 4,635 |
| `editor/changes/notes.ts` | User data loss | ~520 |
| `synth/instrument-state.ts` | Audio output | 1,291 |
| `synth/filtering.ts` | Filter math errors | 359 |

### 3. Systematic Code Duplication (Score: 4/10)

| Pattern | Occurrences | Location |
|---------|-------------|----------|
| "Get instrument" boilerplate | 75+ | `editor/changes/**/*.ts` |
| `instrument.preset = instrument.type` | 56 | `editor/changes/**/*.ts` |
| `doc.notifier.changed()` + `this._didSomething()` | 160+ | `editor/changes/**/*.ts` |
| Slider Change class template | 30+ | `editor/changes/sliders.ts` |
| `effectsInclude*` bitmask functions | 18 functions, 259 calls | `synth/synth-config.ts:5381-5459` |
| `getStaticSynthFunction` wrapper | 8 plugins | `synth/plugins/*.ts` |
| Unison/Vibrato custom-setter clones | 9 classes | `editor/changes/instruments/` |

**Highest-impact fix:** `SongDocument` should expose `getCurrentInstrumentObj()` to eliminate 75+ instances of:
```ts
const instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
```

## High Priority Issues

### 4. Large File Violations (Score: 5/10)

Files exceeding 2,000 lines (non-config):

| File | Lines | Issue |
|------|------:|-------|
| `synth/synth.ts` | 4,635 | Single class, mixed responsibilities |
| `synth/synth-config.ts` | 5,459 | 77 exports, contains enums + utils + data |
| `editor/song-editor.ts` | 4,093 | God class |
| `editor/components/pattern-editor.ts` | 3,533 | Monolithic component |
| `synth/instruments.ts` | 2,530 | 7 classes in one file |
| `synth/song-serialization.ts` | 4,533 | Encoding + decoding + format detection |

Preset data files (10 files, 21K+ lines each) are expected to be large and are not a concern.

### 5. Technical Debt Markers (Score: 5/10)

**39 TODO/FIXME/HACK comments** across the codebase:

| Severity | Count | Examples |
|----------|------:|----------|
| `@HACK` | 1 | `synth/synth-config.ts:541` - assumes existence without validation |
| `@TODO` | 12 | `synth/synth-config.ts:36` - writable dictionary pattern |
| `TODO` | 22 | `synth/synth.ts:404` - redundant validation between synth/editor |
| `FIXME` | 4 | Various |

**Deprecated code kept alive:**
- `tremolo2` enum value (`synth/synth-config.ts:72`) - kept for compatibility
- Multiple deprecated song tag handlers in `song-serialization.ts`
- Commented-out code blocks in `synth.ts:2027-2041`, `track-editor.ts:107-111`, `instruments.ts:1993-2007`

### 6. Configuration & Tooling Gaps (Score: 6/10)

**Biome config issues:**
- `noExplicitAny: "off"` weakens type safety
- `recommended: false` disables many useful rules
- No `noUnusedImports` enforcement at CI level (only warn)

**ESLint overlap:** Both Biome and ESLint are configured. ESLint `@typescript-eslint/no-explicit-any` is also disabled. Running two linters adds CI time without benefit, consider consolidating to Biome.

**tsconfig:** `target: "es6"` is conservative. The browser targets for this app likely support ES2020+.

## Medium Priority Issues

### 7. Plugin Architecture Duplication (Score: 5/10)

8 of 10 synth plugins share identical boilerplate:

```ts
// This pattern appears in: noise, supersaw, pulse, picked-string, spectrum, harmonics, drumset, mod
getSynthFunction(synth: Synth): Function {
    return synth.getStaticSynthFunction(InstrumentType.xxx)!;
}
```

**Fix:** A default implementation in the plugin base interface would eliminate 8 duplicate methods.

The `cache-then-compile` pattern in `synth.ts:4021-4188` is also duplicated in `plugins/fm.ts:15-24` and `plugins/fm6.ts:11-19`.

### 8. Dependency Hygiene (Score: 7/10)

- `@types/jquery` and `@types/select2` are in `dependencies` but should be `devDependencies` (type-only)
- jQuery usage is primarily for select2 integration (60 usages). Most simple DOM operations could use native APIs, but select2 requires jQuery
- `js-xxhash` is used in exactly 1 file (`synth/envelope-computer.ts:9`)
- No unused runtime dependencies found

### 9. Documentation Alignment (Score: 7/10)

- `context.md` files exist in 15/17 directories (missing: `editor/components/shiggy/`, `editor/config/preset_category/`)
- Previous audit (2026-04-01) recommended splitting `synth.ts`, not yet done
- `conventions/` directory is well-structured with AGENTS.md, DEVELOPMENT.md
- File headers: ~70% compliance (57 theme files missing headers)

## Positive Aspects

| Area | Assessment |
|------|-----------|
| Architecture | Clean module separation (synth/editor/player/shared) |
| TypeScript | Strict mode enabled, all configs pass |
| Naming | Consistent snake_case dirs, kebab-case files |
| Build | Fast esbuild pipeline, parallel targets |
| CI | GitHub Actions with lint + typecheck |
| Circular imports | None detected |
| Dependency structure | Clean directional flow (editor → synth → shared) |

## Recommended Action Plan

### Sprint 1: Stop the Bleeding
1. **Add `getCurrentInstrumentObj()` to SongDocument**, eliminates 75+ duplicate lines
2. **Extract 18 `effectsInclude*` into generic `hasEffect()`**, reduces 18 functions to 1
3. **Remove all commented-out code blocks**, ~50 lines across 6 files
4. **Move `@types/*` to devDependencies**

### Sprint 2: Test Critical Paths
1. **`synth/song-serialization.ts` round-trip tests**, highest risk, 4,533 untested lines
2. **`synth/filtering.ts` coefficient tests**, mathematical correctness
3. **`synth/notes.ts` + `editor/changes/notes.ts` tests**, user data integrity
4. **Create shared test fixtures** (mock SongDocument, sample instruments)

### Sprint 3: Decompose God Classes
1. **Split `Synth.computeTone()` (1,165 lines)** into tone computation strategies
2. **Extract `SongEditor` interfaces** into separate handler classes
3. **Split `synth/instruments.ts`** (7 classes) into per-type files

### Sprint 4: Duplication Elimination
1. **Generic slider change factory**, replaces 30+ boilerplate classes
2. **Plugin base with default `getSynthFunction`**, eliminates 8 duplicate methods
3. **Consolidate linters**, choose Biome or ESLint, not both
4. **Address 39 TODO/HACK markers**, resolve or convert to tracked issues

## Comparison with Previous Audit (2026-04-01)

| Metric | Previous | Current | Trend |
|--------|----------|---------|-------|
| Overall Score | 5.6 | 5.2 | ↓  Declining |
| Test Coverage | ~2% | ~2% | →  Unchanged |
| God Classes | 6 | 5 | ↑  Slight improvement |
| Duplication Hotspots | 12 | 10 | ↑  Slight improvement |
| TODO/FIXME Count | ~30 | 39 | ↓  More debt |
| TypeScript Health | Pass | Pass | →  Stable |

**Verdict:** Incremental improvements in duplication are offset by growing TODO debt and no progress on test coverage or god-class decomposition. The codebase is stable but not improving fast enough to sustain long-term maintainability.
