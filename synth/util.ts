// Util
//
// Purpose: Provides shared math and conversion utilities for the synth engine
//
// This module:
// - Implements range clamping, parsing, and legacy key conversion
// - Provides fade timing and detune conversion functions

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { Config } from "./SynthConfig";

export const epsilon: number = (1.0e-24); // For detecting and avoiding float denormals, which have poor performance.

export function clamp(min: number, max: number, val: number): number {
    max = max - 1;
    if (val <= max) {
        if (val >= min) return val;
        else return min;
    } else {
        return max;
    }
}

export function validateRange(min: number, max: number, val: number): number {
    if (min <= val && val <= max) return val;
    throw new Error(`Value ${val} not in range [${min}, ${max}]`);
}

export function parseFloatWithDefault<T>(s: string, defaultValue: T): number | T {
    let result: number | T = parseFloat(s);
    if (Number.isNaN(result)) result = defaultValue;
    return result;
}

export function parseIntWithDefault<T>(s: string, defaultValue: T): number | T {
    let result: number | T = parseInt(s);
    if (Number.isNaN(result)) result = defaultValue;
    return result;
}

export function convertLegacyKeyToKeyAndOctave(rawKeyIndex: number): [number, number] {
    let key: number = clamp(0, Config.keys.length, rawKeyIndex);
    let octave: number = 0;
    // This conversion code depends on C through B being
    // available as keys, of course.
    if (rawKeyIndex === 12) {
        // { name: "C+", isWhiteKey: false, basePitch: 24 }
        key = 0;
        octave = 1;
    } else if (rawKeyIndex === 13) {
        // { name: "G- (actually F#-)", isWhiteKey: false, basePitch: 6 }
        key = 6;
        octave = -1;
    } else if (rawKeyIndex === 14) {
        // { name: "C-", isWhiteKey: true, basePitch: 0 }
        key = 0;
        octave = -1;
    } else if (rawKeyIndex === 15) {
        // { name: "oh no (F-)", isWhiteKey: true, basePitch: 5 }
        key = 5;
        octave = -1;
    }
    return [key, octave];
}

// Extracted from Synth class to break circular dependency with Instrument.
export function fittingPowerOfTwo(x: number): number {
    return 1 << (32 - Math.clz32(Math.ceil(x) - 1));
}

export function detuneToCents(detune: number): number {
    return detune - Config.detuneCenter;
}

export function centsToDetune(cents: number): number {
    return cents + Config.detuneCenter;
}

export function fadeInSettingToSeconds(setting: number): number {
    return 0.0125 * (0.95 * setting + 0.05 * setting * setting);
}

export function secondsToFadeInSetting(seconds: number): number {
    return clamp(0, Config.fadeInRange, Math.round((-0.95 + Math.sqrt(0.9025 + 0.2 * seconds / 0.0125)) / 0.1));
}

export function fadeOutSettingToTicks(setting: number): number {
    return Config.fadeOutTicks[setting];
}

export function ticksToFadeOutSetting(ticks: number): number {
    let lower: number = Config.fadeOutTicks[0];
    if (ticks <= lower) return 0;
    for (let i: number = 1; i < Config.fadeOutTicks.length; i++) {
        const upper: number = Config.fadeOutTicks[i];
        if (ticks <= upper) return (ticks < (lower + upper) / 2) ? i - 1 : i;
        lower = upper;
    }
    return Config.fadeOutTicks.length - 1;
}

export function getOperatorWave(waveform: number, pulseWidth: number) {
    if (waveform != 2) {
        return Config.operatorWaves[waveform];
    }
    else {
        return Config.pwmOperatorWaves[pulseWidth];
    }
}
