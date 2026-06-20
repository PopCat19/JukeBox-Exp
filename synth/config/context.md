# synth/config/ context

Purpose: Synth configuration layer — types, enums, registry, sample loading, and the Config class.

## Files

- `index.ts`, Barrel re-export for synth/config/ — single import point for all config modules
- `config-class.ts`, Config class with all static configuration data, sample loading, and Config-dependent utilities
- `enums.ts`, All enumerations used across the synth config layer (FilterType, EffectType, etc.)
- `instrument-registry.ts`, Dynamic instrument type registration replacing the old const enum
- `sample-loader.ts`, Sample loading infrastructure — state tracking, events, and built-in sample loading
- `types.ts`, Core type definitions shared across the synth config layer
- `utils.ts`, Pure utility functions with no dependency on the Config class
