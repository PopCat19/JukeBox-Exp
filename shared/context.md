# shared/ context

Purpose: Shared kernel — code no single domain owns but multiple domains use.

## Root Files

- `color-config.ts`, Manages color theme definitions and CSS variable resolution for the editor
- `color-utils.ts`, Pure color conversion utilities (hex ↔ HSL ↔ OKLCH) with alpha, gamut clamping, and hex parsing
- `events.ts`, Provides a simple publish-subscribe event system for cross-module communication
- `pmd-adapter.ts`, Maps PMD-generated Base16 palettes to JukeBox-Exp CSS custom properties
- `spectrum.ts`, Renders real-time audio as a smooth bezier-curve spectrum analyzer

## Subdirectories

- `pmd/`, PMD (Palette Meta-Designer) color system utilities
- `themes/`, 58 color theme definitions as CSS variable maps
