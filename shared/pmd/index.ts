// index.ts
//
// Purpose: Barrel export for PMD color system
//
// This module:
// - Re-exports Base16 palette generation and types
// - Re-exports PMD variable definitions and helpers

export type { Base16Color, Base16Def, Base16Palette } from "./base16";
export { generatePalette, getBase16Defs } from "./base16";
export type { PMDVariable, PMDVariables } from "./variables";
export {
	AUX_HUE_OFFSET,
	bake,
	composite,
	getAuxHue,
	getComputed,
	getPMD,
	HUE_MAX,
	PMD_DARK,
	PMD_LIGHT,
	stack,
} from "./variables";
