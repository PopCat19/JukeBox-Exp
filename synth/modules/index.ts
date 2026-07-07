// index.ts
//
// Purpose: Barrel — re-exports all migrated InstrumentModule implementations
//
// This module:
// - Provides a single import path for all socket instrument modules
// - Re-exports each module's default export and its MODULE_ID constant
// - NOT an auto-registration file — each module registers through its
//   corresponding plugin in synth/plugins/

import { MODULE_ID as _CHIP_ID, default as _chipMod } from "./chip/module";
import { MODULE_ID as _DRUMSET_ID, default as _drumsetMod } from "./drumset/module";
import { MODULE_ID as _FM_ID, default as _fmMod } from "./fm/module";
import { MODULE_ID as _FM6_ID, default as _fm6Mod } from "./fm6/module";
import { MODULE_ID as _HARMONICS_ID, default as _harmonicsMod } from "./harmonics/module";
import { MODULE_ID as _MOD_ID, default as _modMod } from "./mod/module";
import { MODULE_ID as _NOISE_ID, default as _noiseMod } from "./noise/module";
import {
	MODULE_ID as _PICKED_STRING_ID,
	default as _pickedStringMod,
} from "./picked-string/module";
import { MODULE_ID as _PULSE_ID, default as _pulseMod } from "./pulse/module";
import { MODULE_ID as _SPECTRUM_ID, default as _spectrumMod } from "./spectrum/module";
import { MODULE_ID as _SUPERSAW_ID, default as _supersawMod } from "./supersaw/module";

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

import {
	MODULE_ID as _CUSTOM_CHIP_WAVE_ID,
	default as _customChipWaveMod,
} from "./custom-chip-wave/module";
export const customChipWaveModule = _customChipWaveMod;
export const CUSTOM_CHIP_WAVE_ID = _CUSTOM_CHIP_WAVE_ID;

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

export {
	createPlaceholderModule,
	isPlaceholderId,
	unwrapPlaceholderId,
} from "./placeholder/module";

// Ordered by InstrumentType value — slots match type indices for stable encoding.
// customChipWave (type 9) is now core.customChipWave.
export const CORE_MODULE_IDS: readonly string[] = [
	_CHIP_ID, // 0  — core.chip
	_FM_ID, // 1  — core.fm
	_NOISE_ID, // 2  — core.noise
	_SPECTRUM_ID, // 3  — core.spectrum
	_DRUMSET_ID, // 4  — core.drumset
	_HARMONICS_ID, // 5  — core.harmonics
	_PULSE_ID, // 6  — core.pulse
	_PICKED_STRING_ID, // 7  — core.pickedString
	_SUPERSAW_ID, // 8  — core.supersaw
	_CUSTOM_CHIP_WAVE_ID, // 9  — core.customChipWave
	_MOD_ID, // 10 — core.mod
	_FM6_ID, // 11 — core.fm6
];
