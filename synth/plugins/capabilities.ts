// synth/plugins/capabilities.ts
//
// Purpose: Per-instrument-type capability flags
//
// This module:
// - Exposes InstrumentCapabilities interface + getter
// - Registers built-in type capabilities at module load
// - External plugins call registerCapabilities() for their own types

import { InstrumentType } from "../SynthConfig";

export interface InstrumentCapabilities {
    isFm: boolean;
    isFm6: boolean;
    isNoise: boolean;
    isMod: boolean;
    isDrumset: boolean;
    hasWaveSelect: boolean;
    hasSpectrum: boolean;
    hasHarmonics: boolean;
    hasLoopControls: boolean;
    hasStringSustain: boolean;
    hasSupersaw: boolean;
    hasPulseWidth: boolean;
    hasEnvelopes: boolean;
    hasUnison: boolean;
    hasNoteFilter: boolean;
    hasEffects: boolean;
    hasChord: boolean;
    hasAliasableWaveform: boolean;
    hasCustomWaveEditor: boolean;
}

const defaultCapabilities: InstrumentCapabilities = {
    isFm: false, isFm6: false, isNoise: false, isMod: false, isDrumset: false,
    hasWaveSelect: false, hasSpectrum: false, hasHarmonics: false,
    hasLoopControls: false, hasStringSustain: false, hasSupersaw: false,
    hasPulseWidth: false, hasEnvelopes: true, hasUnison: true,
    hasNoteFilter: true, hasEffects: true, hasChord: true,
    hasAliasableWaveform: false, hasCustomWaveEditor: false,
};

const _caps = new Map<number, InstrumentCapabilities>();

export function registerCapabilities(type: number, caps: Partial<InstrumentCapabilities>): void {
    _caps.set(type, { ...defaultCapabilities, ...caps });
}

export function getCapabilities(type: number): InstrumentCapabilities {
    return _caps.get(type) ?? defaultCapabilities;
}

registerCapabilities(InstrumentType.fm, { isFm: true });
registerCapabilities(InstrumentType.fm6op, { isFm: true, isFm6: true });
registerCapabilities(InstrumentType.chip, { hasWaveSelect: true, hasLoopControls: true, hasAliasableWaveform: true });
registerCapabilities(InstrumentType.customChipWave, { hasWaveSelect: true, hasAliasableWaveform: true, hasCustomWaveEditor: true });
registerCapabilities(InstrumentType.harmonics, { hasHarmonics: true });
registerCapabilities(InstrumentType.spectrum, { hasSpectrum: true });
registerCapabilities(InstrumentType.noise, { isNoise: true });
registerCapabilities(InstrumentType.drumset, { isDrumset: true });
registerCapabilities(InstrumentType.pickedString, { hasStringSustain: true, hasHarmonics: true });
registerCapabilities(InstrumentType.supersaw, { hasSupersaw: true, hasPulseWidth: true, hasAliasableWaveform: true });
registerCapabilities(InstrumentType.pwm, { hasPulseWidth: true, hasAliasableWaveform: true });
registerCapabilities(InstrumentType.mod, {
    isMod: true, hasEnvelopes: false, hasUnison: false,
    hasNoteFilter: false, hasEffects: false, hasChord: false,
});
