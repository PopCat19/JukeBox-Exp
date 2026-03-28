// Rendering - Index
//
// Purpose: Barrel re-export of editor rendering modules
//
// This module:
// - Re-exports color config, themes, styles, and custom canvas renderers

export { ColorConfig } from "../rendering/color-config";
export { CustomAlgorythmCanvas } from "../rendering/custom-algorythm-canvas";
export { CustomChipCanvas } from "../rendering/custom-chip-canvas";
export { themes } from "../rendering/themes/index";
// Note: style.ts is imported for side effects only (CSS injection), no exports.
