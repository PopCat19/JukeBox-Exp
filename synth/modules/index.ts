// index.ts
//
// Purpose: Barrel — re-exports all migrated InstrumentModule implementations
//
// This module:
// - Provides a single import path for all socket instrument modules
// - Re-exports each module's default export and its MODULE_ID constant
// - NOT an auto-registration file — each module registers through its
//   corresponding plugin in synth/plugins/

import { default as _supersawMod, MODULE_ID as _SUPERSAW_ID } from "./supersaw/module";
import { default as _pulseMod, MODULE_ID as _PULSE_ID } from "./pulse/module";
import { default as _noiseMod, MODULE_ID as _NOISE_ID } from "./noise/module";
import { default as _chipMod, MODULE_ID as _CHIP_ID } from "./chip/module";
import { default as _harmonicsMod, MODULE_ID as _HARMONICS_ID } from "./harmonics/module";
import { default as _spectrumMod, MODULE_ID as _SPECTRUM_ID } from "./spectrum/module";
import { default as _pickedStringMod, MODULE_ID as _PICKED_STRING_ID } from "./picked-string/module";
import { default as _fmMod, MODULE_ID as _FM_ID } from "./fm/module";
import { default as _fm6Mod, MODULE_ID as _FM6_ID } from "./fm6/module";
import { default as _drumsetMod, MODULE_ID as _DRUMSET_ID } from "./drumset/module";
import { default as _modMod, MODULE_ID as _MOD_ID } from "./mod/module";

export const supersawModule = _supersawMod;
export const pulseModule = _pulseMod;
export const noiseModule = _noiseMod;
export const chipModule = _chipMod;
export const harmonicsModule = _harmonicsMod;
export const spectrumModule = _spectrumMod;
export const pickedStringModule = _pickedStringMod;
export const fmModule = _fmMod;
export const fm6Module = _fm6Mod;
export const drumsetModule = _drumsetMod;
export const modModule = _modMod;

export const SUPERSAW_ID = _SUPERSAW_ID;
export const PULSE_ID = _PULSE_ID;
export const NOISE_ID = _NOISE_ID;
export const CHIP_ID = _CHIP_ID;
export const HARMONICS_ID = _HARMONICS_ID;
export const SPECTRUM_ID = _SPECTRUM_ID;
export const PICKED_STRING_ID = _PICKED_STRING_ID;
export const FM_ID = _FM_ID;
export const FM6_ID = _FM6_ID;
export const DRUMSET_ID = _DRUMSET_ID;
export const MOD_ID = _MOD_ID;

export { createPlaceholderModule, isPlaceholderId, unwrapPlaceholderId } from "./placeholder/module";

// Ordered by InstrumentType value — slots match type indices for stable encoding.
// customChipWave (type 9) has no module yet; slot 9 remains blank.
export const CORE_MODULE_IDS: readonly string[] = [
	_CHIP_ID,			// 0  — core.chip
	_FM_ID,				// 1  — core.fm
	_NOISE_ID,			// 2  — core.noise
	_SPECTRUM_ID,		// 3  — core.spectrum
	_DRUMSET_ID,		// 4  — core.drumset
	_HARMONICS_ID,		// 5  — core.harmonics
	_PULSE_ID,			// 6  — core.pulse
	_PICKED_STRING_ID,	// 7  — core.pickedString
	_SUPERSAW_ID,		// 8  — core.supersaw
	// 9  — core.customChipWave (not migrated yet)
	_MOD_ID,			// 10 — core.mod
	_FM6_ID,			// 11 — core.fm6
];
