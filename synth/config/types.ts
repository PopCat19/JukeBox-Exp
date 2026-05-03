// types.ts
//
// Purpose: Core type definitions shared across the synth config layer
//
// This module:
// - Defines Dictionary and DictionaryArray generic containers
// - Defines BeepBoxOption base interface and all option sub-interfaces

/*!
Copyright (c) 2012-2022 John Nesky and contributing authors

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import type { EffectType, EnvelopeComputeIndex, EnvelopeType } from "./enums";
import type { InstrumentType } from "./instrument-registry";

export interface Dictionary<T> {
	[K: string]: T;
}

// @TODO: Not ideal to make this writable like this.
// export interface DictionaryArray<T> extends ReadonlyArray<T> {
export interface DictionaryArray<T> extends Array<T> {
	dictionary: Dictionary<T>;
}

export interface BeepBoxOption {
	readonly index: number;
	readonly name: string;
}

export interface Scale extends BeepBoxOption {
	readonly flags: ReadonlyArray<boolean>;
	readonly realName: string;
}

export interface Key extends BeepBoxOption {
	readonly isWhiteKey: boolean;
	readonly basePitch: number;
}

export interface Rhythm extends BeepBoxOption {
	readonly stepsPerBeat: number;
	readonly roundUpThresholds: number[] | null;
}

export interface ChipWave extends BeepBoxOption {
	readonly expression: number;
	samples: Float32Array;
	isPercussion?: boolean;
	isCustomSampled?: boolean;
	isSampled?: boolean;
	extraSampleDetune?: number;
	rootKey?: number;
	sampleRate?: number;
}

export interface OperatorWave extends BeepBoxOption {
	samples: Float32Array;
}

export interface ChipNoise extends BeepBoxOption {
	readonly expression: number;
	readonly basePitch: number;
	readonly pitchFilterMult: number;
	readonly isSoft: boolean;
	samples: Float32Array | null;
}

export interface Transition extends BeepBoxOption {
	readonly isSeamless: boolean;
	readonly continues: boolean;
	readonly slides: boolean;
	readonly slideTicks: number;
	readonly includeAdjacentPatterns: boolean;
}

export interface Vibrato extends BeepBoxOption {
	readonly amplitude: number;
	readonly type: number;
	readonly delayTicks: number;
}

export interface VibratoType extends BeepBoxOption {
	readonly periodsSeconds: number[];
	readonly period: number;
}

export interface Unison extends BeepBoxOption {
	readonly voices: number;
	readonly spread: number;
	readonly offset: number;
	readonly expression: number;
	readonly sign: number;
}

export interface Modulator extends BeepBoxOption {
	readonly name: string; // name that shows up in song editor UI
	readonly pianoName: string; // short name that shows up in mod piano UI
	readonly maxRawVol: number; // raw
	readonly newNoteVol: number; // raw
	readonly forSong: boolean; // true - setting is song scope
	convertRealFactor: number; // offset that needs to be applied to get a "real" number display of value, for UI purposes
	readonly associatedEffect: EffectType; // effect that should be enabled for this modulator to work properly. If unused, set to EffectType.length.
	readonly promptName: string; // long-as-needed name that shows up in tip prompt
	readonly promptDesc: string[]; // paragraph(s) describing how to use this mod
	invertSliderIndicator?: boolean; // for whether or not you want to invert the slider indicator
	readonly maxIndex: number;
}

export interface Chord extends BeepBoxOption {
	readonly customInterval: boolean;
	readonly arpeggiates: boolean;
	readonly strumParts: number;
	readonly singleTone: boolean;
}

export interface Algorithm extends BeepBoxOption {
	readonly carrierCount: number;
	readonly associatedCarrier: ReadonlyArray<number>;
	readonly modulatedBy: ReadonlyArray<ReadonlyArray<number>>;
}

export interface OperatorFrequency extends BeepBoxOption {
	readonly mult: number;
	readonly hzOffset: number;
	readonly amplitudeSign: number;
}

export interface Feedback extends BeepBoxOption {
	readonly indices: ReadonlyArray<ReadonlyArray<number>>;
}

export interface Envelope extends BeepBoxOption {
	readonly type: EnvelopeType;
	readonly speed: number;
}

export interface AutomationTarget extends BeepBoxOption {
	readonly computeIndex: EnvelopeComputeIndex /*| InstrumentAutomationIndex*/ | null;
	readonly displayName: string;
	readonly perNote: boolean; // Whether to compute envelopes on a per-note basis.
	readonly interleave: boolean; // Whether to interleave this target with the next one in the menu (e.g. filter frequency and gain).
	readonly isFilter: boolean; // Filters are special because the maxCount depends on other instrument settings.
	// readonly range: number | null; // set if automation is allowed.
	readonly maxCount: number;
	readonly effect: EffectType | null;
	readonly compatibleInstruments: InstrumentType[] | null;
}
