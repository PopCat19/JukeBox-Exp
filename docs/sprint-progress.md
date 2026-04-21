# Maintainability Audit — Sprint Progress

**Initial Score:** 5.6/10 (2026-04-01)
**After Sprint 1-2:** 5.2/10 (2026-04-07)
**Post Sprint 1-3:** Improved (unretested)

## Completed Work

### Sprint 1: Stop the Bleeding ✅

| Target | Result |
|--------|--------|
| Add `getCurrentInstrumentObj()` | Replaced 141 inline patterns across 31 files |
| Extract `effectsInclude*` into `hasEffect()` | 18 wrappers → 1 generic + 18 thin delegates |
| Remove commented-out code blocks | ~50 lines removed from 4 files |
| Move `@types/*` to devDependencies | package.json updated |
| `tremolo2` enum | Kept (still used), improved comment |

**Commit:** `4db48752`

### Sprint 2: Test Critical Paths ✅

| Target | Result |
|--------|--------|
| `filtering.test.ts` | 30 tests for Butterworth coefficients, FrequencyResponse, warp functions |
| `notes.test.ts` | 19 tests for Note clone, Pattern serialization, Song structure |
| `song-document-integration.test.ts` | 11 tests for effects round-trip, hasEffect integration |
| `test-helpers.ts` | Shared fixtures for future tests |

**Commit:** `ce1d1692`

### Sprint 2 Consolidation: Prune YAGNI Tests ✅

Pruned 41 tests that tested constructor assignments, default values, array indexing, or duplicated coverage. Kept high-signal tests:
- Filter pole stability (NaN explosion prevention)
- Warp round-trip + monotonicity (tuning correctness)
- Note.clone() independence (shallow-copy bug class)
- Pattern serialization (deserialization drift)
- Effects bitmask round-trip (bitwise bugs)

**Commit:** `5c665683`

### Sprint 3: Decompose God Classes ✅ (partial)

| Target | Result |
|--------|--------|
| Split `synth/instruments.ts` | 2536 lines → 8 focused files under `synth/instruments/` |
| `computeTone()` extraction | **Deferred** — 1861 lines, 92 `this.` references, core audio path, high risk |
| `SongEditor` handler extraction | **Deferred** — 8 interfaces, 3704 lines, UI tightly coupled to DOM |

**Commit:** `a11ea1c0`

### Sprint 4: Duplication Elimination ⚠️ (analyzed, mostly low-value)

| Target | Assessment | Decision |
|--------|------------|----------|
| ~~`effectsInclude*`~~ | Completed Sprint 1 | ✅ Done |
| ~~`getCurrentInstrumentObj()`~~ | Completed Sprint 1 | ✅ Done |
| Plugin `getSynthFunction` default | 8 plugins × 3 lines = 24 lines | Skip — minimal duplication |
| Slider change factory | 38 classes × 11 lines = 417 lines | Skip — named commands > hidden abstraction |
| Linter consolidation | ESLint 735 errors: 600+ are intentional `== null` checks | Skip — Biome correctly ignores with `ignoreNull: true` |
| TODO/HACK markers | 36 remaining | Track as issues |

## Files Changed

| File | Before | After | Change |
|------|--------|-------|--------|
| `synth/instruments.ts` | 2536 lines | Deleted | Split into 8 files |
| `synth/instruments/operator.ts` | — | 34 lines | New |
| `synth/instruments/custom-algorithm.ts` | — | 70 lines | New |
| `synth/instruments/custom-feedback.ts` | — | 56 lines | New |
| `synth/instruments/filter-control-point.ts` | — | 93 lines | New |
| `synth/instruments/filter-settings.ts` | — | 269 lines | New |
| `synth/instruments/envelope-settings.ts` | — | 217 lines | New |
| `synth/instruments/instrument.ts` | — | 1787 lines | New (main class) |
| `synth/instruments/index.ts` | — | 17 lines | New (barrel) |
| `tests/filtering.test.ts` | — | 276 lines | New |
| `tests/notes.test.ts` | — | 88 lines | New |
| `tests/song-document-integration.test.ts` | — | 65 lines | New |
| `tests/test-helpers.ts` | — | 26 lines | New |

## Recommendations

### High Priority (address later)

1. **Test coverage for `synth/synth.ts`** — 4689 lines, core audio engine, 0 direct tests
2. **Test coverage for `synth/song-serialization.ts`** — 4533 lines, data integrity critical
3. **Split `Synth.computeTone()`** — AFTER comprehensive audio tests

### Medium Priority (track as issues)

1. TODO/HACK markers → GitHub issues for actionable ones
2. `SongEditor` interface extraction — would require browser testing infra

### Low Priority (accept)

1. Plugin `getSynthFunction` "duplication" — 24 lines, explicit > abstracted
2. Slider change classes — named commands provide discoverability
3. Linter consolidation — Biome + ESLint overlap is marginal