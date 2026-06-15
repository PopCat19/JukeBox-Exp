# Context

- `custom-algorithm.ts`, Defines FM synthesis operator routing algorithms for custom operator configurations
- `custom-feedback.ts`, Defines FM feedback routing for custom operator feedback loops
- `envelope-settings.ts`, Defines envelope configuration for instrument automation targets
- `filter-control-point.ts`, Manages a single filter control point with frequency, gain, and filter type
- `filter-settings.ts`, Manages a collection of filter control points for instrument filter configuration
- `index.ts`, Barrel re-export organizing instrument data structures by dependency layer
- `instrument.ts`, Defines instrument settings, DSP configuration, and serialization for all channel types
- `operator.ts`, Defines an FM operator with frequency, amplitude, waveform, and pulse width