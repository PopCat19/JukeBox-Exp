// Instruments
//
// Purpose: Defines instrument settings, filter configuration, and modulation parameters
//
// This module:
// - Manages instrument properties (type, effects, operators, envelopes)
// - Handles filter control points and legacy filter conversion
// - Supports FM, chip, noise, spectrum, drumset, and mod channel types
// - Provides JSON serialization for all instrument settings

import { FilterCoefficients, FrequencyResponse } from "./filtering";
import { getPlugin } from "./plugins";
import {
	AutomationTarget,
	Chord,
	Config,
	Dictionary,
	DictionaryArray,
	EffectType,
	Envelope,
	EnvelopeType,
	effectsIncludeBitcrusher,
	effectsIncludeChord,
	effectsIncludeChorus,
	effectsIncludeDetune,
	effectsIncludeDistortion,
	effectsIncludeEcho,
	effectsIncludeGranular,
	effectsIncludeInvertWave,
	effectsIncludeNoteFilter,
	effectsIncludeNoteRange,
	effectsIncludePanning,
	effectsIncludePhaser,
	effectsIncludePitchShift,
	effectsIncludeReverb,
	effectsIncludeRingModulation,
	effectsIncludeTransition,
	effectsIncludeVibrato,
	FilterType,
	InstrumentType,
	LFOEnvelopeTypes,
	SustainType,
	Transition,
	toNameMap,
	Unison,
	Vibrato,
} from "./synth-config";
import { centsToDetune, clamp, detuneToCents, fadeInSettingToSeconds, fadeOutSettingToTicks, secondsToFadeInSetting, ticksToFadeOutSetting } from "./util";
import { HarmonicsWave, SpectrumWave } from "./waves";
export class Operator {
	public frequency: number = 4;
	public amplitude: number = 0;
	public waveform: number = 0;
	public pulseWidth: number = 0.5;

	constructor(index: number) {
		this.reset(index);
	}

	public reset(index: number): void {
		this.frequency = 4; // defualt to 1x
		this.amplitude = index <= 1 ? Config.operatorAmplitudeMax : 0;
		this.waveform = 0;
		this.pulseWidth = 5;
	}

	public copy(other: Operator): void {
		this.frequency = other.frequency;
		this.amplitude = other.amplitude;
		this.waveform = other.waveform;
		this.pulseWidth = other.pulseWidth;
	}
}

export class CustomAlgorithm {
	public name: string = "";
	public carrierCount: number = 0;
	public modulatedBy: number[][] = [[], [], [], [], [], []];
	public associatedCarrier: number[] = [];

	constructor() {
		this.fromPreset(1);
	}

	public set(carriers: number, modulation: number[][]) {
		this.reset();
		this.carrierCount = carriers;
		for (let i = 0; i < this.modulatedBy.length; i++) {
			this.modulatedBy[i] = modulation[i];
			if (i < carriers) {
				this.associatedCarrier[i] = i + 1;
			}
			this.name += i + 1;
			for (let j = 0; j < modulation[i].length; j++) {
				this.name += modulation[i][j];
				if (modulation[i][j] > carriers - 1) {
					this.associatedCarrier[modulation[i][j] - 1] = i + 1;
				}
				this.name += ",";
			}
			if (i < carriers) {
				this.name += "|";
			} else {
				this.name += ".";
			}
		}
	}

	public reset(): void {
		this.name = "";
		this.carrierCount = 1;
		this.modulatedBy = [[2, 3, 4, 5, 6], [], [], [], [], []];
		this.associatedCarrier = [1, 1, 1, 1, 1, 1];
	}

	public copy(other: CustomAlgorithm): void {
		this.name = other.name;
		this.carrierCount = other.carrierCount;
		this.modulatedBy = other.modulatedBy;
		this.associatedCarrier = other.associatedCarrier;
	}

	public fromPreset(other: number): void {
		this.reset();
		const preset = Config.algorithms6Op[other];
		this.name = preset.name;
		this.carrierCount = preset.carrierCount;
		for (let i = 0; i < preset.modulatedBy.length; i++) {
			this.modulatedBy[i] = Array.from(preset.modulatedBy[i]);
			this.associatedCarrier[i] = preset.associatedCarrier[i];
		}
	}
}

export class CustomFeedBack {
	// feels redunant
	public name: string = "";
	public indices: number[][] = [[], [], [], [], [], []];

	constructor() {
		this.fromPreset(1);
	}

	public set(inIndices: number[][]) {
		this.reset();
		for (let i = 0; i < this.indices.length; i++) {
			this.indices[i] = inIndices[i];
			for (let j = 0; j < inIndices[i].length; j++) {
				this.name += inIndices[i][j];
				this.name += ",";
			}
			this.name += ".";
		}
	}

	public reset(): void {
		this.reset;
		this.name = "";
		this.indices = [[1], [], [], [], [], []];
	}

	public copy(other: CustomFeedBack): void {
		this.name = other.name;
		this.indices = other.indices;
	}

	public fromPreset(other: number): void {
		this.reset();
		const preset = Config.feedbacks6Op[other];
		for (let i = 0; i < preset.indices.length; i++) {
			this.indices[i] = Array.from(preset.indices[i]);
			for (let j = 0; j < preset.indices[i].length; j++) {
				this.name += preset.indices[i][j];
				this.name += ",";
			}
			this.name += ".";
		}
	}
}

export class FilterControlPoint {
	public freq: number = 0;
	public gain: number = Config.filterGainCenter;
	public type: FilterType = FilterType.peak;

	public set(freqSetting: number, gainSetting: number): void {
		this.freq = freqSetting;
		this.gain = gainSetting;
	}

	public getHz(): number {
		return FilterControlPoint.getHzFromSettingValue(this.freq);
	}

	public static getHzFromSettingValue(value: number): number {
		return Config.filterFreqReferenceHz * Math.pow(2.0, (value - Config.filterFreqReferenceSetting) * Config.filterFreqStep);
	}
	public static getSettingValueFromHz(hz: number): number {
		return Math.log2(hz / Config.filterFreqReferenceHz) / Config.filterFreqStep + Config.filterFreqReferenceSetting;
	}
	public static getRoundedSettingValueFromHz(hz: number): number {
		return Math.max(0, Math.min(Config.filterFreqRange - 1, Math.round(FilterControlPoint.getSettingValueFromHz(hz))));
	}

	public getLinearGain(peakMult: number = 1.0): number {
		const power: number = (this.gain - Config.filterGainCenter) * Config.filterGainStep;
		const neutral: number = this.type === FilterType.peak ? 0.0 : -0.5;
		const interpolatedPower: number = neutral + (power - neutral) * peakMult;
		return Math.pow(2.0, interpolatedPower);
	}
	public static getRoundedSettingValueFromLinearGain(linearGain: number): number {
		return Math.max(0, Math.min(Config.filterGainRange - 1, Math.round(Math.log2(linearGain) / Config.filterGainStep + Config.filterGainCenter)));
	}

	public toCoefficients(filter: FilterCoefficients, sampleRate: number, freqMult: number = 1.0, peakMult: number = 1.0): void {
		const cornerRadiansPerSample: number =
			(2.0 * Math.PI * Math.max(Config.filterFreqMinHz, Math.min(Config.filterFreqMaxHz, freqMult * this.getHz()))) / sampleRate;
		const linearGain: number = this.getLinearGain(peakMult);
		switch (this.type) {
			case FilterType.lowPass:
				filter.lowPass2ndOrderButterworth(cornerRadiansPerSample, linearGain);
				break;
			case FilterType.highPass:
				filter.highPass2ndOrderButterworth(cornerRadiansPerSample, linearGain);
				break;
			case FilterType.peak:
				filter.peak2ndOrder(cornerRadiansPerSample, linearGain, 1.0);
				break;
			default:
				throw new Error();
		}
	}

	public getVolumeCompensationMult(): number {
		const octave: number = (this.freq - Config.filterFreqReferenceSetting) * Config.filterFreqStep;
		const gainPow: number = (this.gain - Config.filterGainCenter) * Config.filterGainStep;
		switch (this.type) {
			case FilterType.lowPass:
				const freqRelativeTo8khz: number = (Math.pow(2.0, octave) * Config.filterFreqReferenceHz) / 8000.0;
				// Reverse the frequency warping from importing legacy simplified filters to imitate how the legacy filter cutoff setting affected volume.
				const warpedFreq: number = (Math.sqrt(1.0 + 4.0 * freqRelativeTo8khz) - 1.0) / 2.0;
				const warpedOctave: number = Math.log2(warpedFreq);
				return Math.pow(
					0.5,
					0.2 * Math.max(0.0, gainPow + 1.0) + Math.min(0.0, Math.max(-3.0, 0.595 * warpedOctave + 0.35 * Math.min(0.0, gainPow + 1.0))),
				);
			case FilterType.highPass:
				return Math.pow(
					0.5,
					0.125 * Math.max(0.0, gainPow + 1.0) +
						Math.min(0.0, 0.3 * (-octave - Math.log2(Config.filterFreqReferenceHz / 125.0)) + 0.2 * Math.min(0.0, gainPow + 1.0)),
				);
			case FilterType.peak:
				const distanceFromCenter: number = octave + Math.log2(Config.filterFreqReferenceHz / 2000.0);
				const freqLoudness: number = Math.pow(1.0 / (1.0 + Math.pow(distanceFromCenter / 3.0, 2.0)), 2.0);
				return Math.pow(0.5, 0.125 * Math.max(0.0, gainPow) + 0.1 * freqLoudness * Math.min(0.0, gainPow));
			default:
				throw new Error();
		}
	}
}

export class FilterSettings {
	public readonly controlPoints: FilterControlPoint[] = [];
	public controlPointCount: number = 0;

	constructor() {
		this.reset();
	}

	reset(): void {
		this.controlPointCount = 0;
	}

	addPoint(type: FilterType, freqSetting: number, gainSetting: number): void {
		let controlPoint: FilterControlPoint;
		if (this.controlPoints.length <= this.controlPointCount) {
			controlPoint = new FilterControlPoint();
			this.controlPoints[this.controlPointCount] = controlPoint;
		} else {
			controlPoint = this.controlPoints[this.controlPointCount];
		}
		this.controlPointCount++;
		controlPoint.type = type;
		controlPoint.set(freqSetting, gainSetting);
	}

	public toJsonObject(): object {
		const filterArray: any[] = [];
		for (let i: number = 0; i < this.controlPointCount; i++) {
			const point: FilterControlPoint = this.controlPoints[i];
			filterArray.push({
				type: Config.filterTypeNames[point.type],
				cutoffHz: Math.round(point.getHz() * 100) / 100,
				linearGain: Math.round(point.getLinearGain() * 10000) / 10000,
			});
		}
		return filterArray;
	}

	public fromJsonObject(filterObject: any): void {
		this.controlPoints.length = 0;
		if (filterObject) {
			for (const pointObject of filterObject) {
				const point: FilterControlPoint = new FilterControlPoint();
				point.type = Config.filterTypeNames.indexOf(pointObject["type"]);
				if (<any>point.type === -1) point.type = FilterType.peak;
				if (pointObject["cutoffHz"] !== undefined) {
					point.freq = FilterControlPoint.getRoundedSettingValueFromHz(pointObject["cutoffHz"]);
				} else {
					point.freq = 0;
				}
				if (pointObject["linearGain"] !== undefined) {
					point.gain = FilterControlPoint.getRoundedSettingValueFromLinearGain(pointObject["linearGain"]);
				} else {
					point.gain = Config.filterGainCenter;
				}
				this.controlPoints.push(point);
			}
		}
		this.controlPointCount = this.controlPoints.length;
	}

	// Returns true if all filter control points match in number and type (but not freq/gain)
	public static filtersCanMorph(filterA: FilterSettings, filterB: FilterSettings): boolean {
		if (filterA.controlPointCount !== filterB.controlPointCount) {
			return false;
		}
		for (let i: number = 0; i < filterA.controlPointCount; i++) {
			if (filterA.controlPoints[i].type !== filterB.controlPoints[i].type) {
				return false;
			}
		}
		return true;
	}

	// Interpolate two FilterSettings, where pos=0 is filterA and pos=1 is filterB
	public static lerpFilters(filterA: FilterSettings, filterB: FilterSettings, pos: number): FilterSettings {
		const lerpedFilter: FilterSettings = new FilterSettings();

		// One setting or another is null, return the other.
		if (filterA == null) {
			return filterA;
		}
		if (filterB == null) {
			return filterB;
		}

		pos = Math.max(0, Math.min(1, pos));

		// Filter control points match in number and type
		if (this.filtersCanMorph(filterA, filterB)) {
			for (let i: number = 0; i < filterA.controlPointCount; i++) {
				lerpedFilter.controlPoints[i] = new FilterControlPoint();
				lerpedFilter.controlPoints[i].type = filterA.controlPoints[i].type;
				lerpedFilter.controlPoints[i].freq = filterA.controlPoints[i].freq + (filterB.controlPoints[i].freq - filterA.controlPoints[i].freq) * pos;
				lerpedFilter.controlPoints[i].gain = filterA.controlPoints[i].gain + (filterB.controlPoints[i].gain - filterA.controlPoints[i].gain) * pos;
			}

			lerpedFilter.controlPointCount = filterA.controlPointCount;

			return lerpedFilter;
		} else {
			// Not allowing morph of unmatching filters for now. It's a hornet's nest of problems, and previous implementation was mostly working but didn't sound very interesting since the shape becomes "mushy" in between
			return pos >= 1 ? filterB : filterA;
		}
	}

	public convertLegacySettings(legacyCutoffSetting: number, legacyResonanceSetting: number, legacyEnv: Envelope): void {
		this.reset();

		const legacyFilterCutoffMaxHz: number = 8000; // This was carefully calculated to correspond to no change in response when filtering at 48000 samples per second... when using the legacy simplified low-pass filter.
		const legacyFilterMax: number = 0.95;
		const legacyFilterMaxRadians: number = Math.asin(legacyFilterMax / 2.0) * 2.0;
		const legacyFilterMaxResonance: number = 0.95;
		const legacyFilterCutoffRange: number = 11;
		const legacyFilterResonanceRange: number = 8;

		const resonant: boolean = legacyResonanceSetting > 1;
		const firstOrder: boolean = legacyResonanceSetting === 0;
		const cutoffAtMax: boolean = legacyCutoffSetting === legacyFilterCutoffRange - 1;
		const envDecays: boolean =
			legacyEnv.type === EnvelopeType.flare ||
			legacyEnv.type === EnvelopeType.twang ||
			legacyEnv.type === EnvelopeType.decay ||
			legacyEnv.type === EnvelopeType.noteSize;

		const standardSampleRate: number = 48000;
		const legacyHz: number = legacyFilterCutoffMaxHz * Math.pow(2.0, (legacyCutoffSetting - (legacyFilterCutoffRange - 1)) * 0.5);
		const legacyRadians: number = Math.min(legacyFilterMaxRadians, (2 * Math.PI * legacyHz) / standardSampleRate);

		if (legacyEnv.type === EnvelopeType.none && !resonant && cutoffAtMax) {
			// The response is flat and there's no envelopes, so don't even bother adding any control points.
		} else if (firstOrder) {
			// In general, a 1st order lowpass can be approximated by a 2nd order lowpass
			// with a cutoff ~4 octaves higher (*16) and a gain of 1/16.
			// However, BeepBox's original lowpass filters behaved oddly as they
			// approach the nyquist frequency, so this curved conversion was devised
			// to guess at a perceptually appropriate new cutoff frequency and gain.
			const extraOctaves: number = 3.5;
			const targetRadians: number = legacyRadians * Math.pow(2.0, extraOctaves);
			const curvedRadians: number = targetRadians / (1.0 + targetRadians / Math.PI);
			const curvedHz: number = (standardSampleRate * curvedRadians) / (2.0 * Math.PI);
			const freqSetting: number = FilterControlPoint.getRoundedSettingValueFromHz(curvedHz);
			const finalHz: number = FilterControlPoint.getHzFromSettingValue(freqSetting);
			const finalRadians: number = (2.0 * Math.PI * finalHz) / standardSampleRate;

			const legacyFilter: FilterCoefficients = new FilterCoefficients();
			legacyFilter.lowPass1stOrderSimplified(legacyRadians);
			const response: FrequencyResponse = new FrequencyResponse();
			response.analyze(legacyFilter, finalRadians);
			const legacyFilterGainAtNewRadians: number = response.magnitude();

			let logGain: number = Math.log2(legacyFilterGainAtNewRadians);
			// Bias slightly toward 2^(-extraOctaves):
			logGain = -extraOctaves + (logGain + extraOctaves) * 0.82;
			// Decaying envelopes move the cutoff frequency back into an area where the best approximation of the first order slope requires a lower gain setting.
			if (envDecays) logGain = Math.min(logGain, -1.0);
			const convertedGain: number = Math.pow(2.0, logGain);
			const gainSetting: number = FilterControlPoint.getRoundedSettingValueFromLinearGain(convertedGain);

			this.addPoint(FilterType.lowPass, freqSetting, gainSetting);
		} else {
			const intendedGain: number =
				0.5 / (1.0 - legacyFilterMaxResonance * Math.sqrt(Math.max(0.0, legacyResonanceSetting - 1.0) / (legacyFilterResonanceRange - 2.0)));
			const invertedGain: number = 0.5 / intendedGain;
			const maxRadians: number = (2.0 * Math.PI * legacyFilterCutoffMaxHz) / standardSampleRate;
			const freqRatio: number = legacyRadians / maxRadians;
			const targetRadians: number = legacyRadians * (freqRatio * Math.pow(invertedGain, 0.9) + 1.0);
			const curvedRadians: number = legacyRadians + (targetRadians - legacyRadians) * invertedGain;
			let curvedHz: number;
			if (envDecays) {
				curvedHz = (standardSampleRate * Math.min(curvedRadians, legacyRadians * Math.pow(2, 0.25))) / (2.0 * Math.PI);
			} else {
				curvedHz = (standardSampleRate * curvedRadians) / (2.0 * Math.PI);
			}
			const freqSetting: number = FilterControlPoint.getRoundedSettingValueFromHz(curvedHz);

			let legacyFilterGain: number;
			if (envDecays) {
				legacyFilterGain = intendedGain;
			} else {
				const legacyFilter: FilterCoefficients = new FilterCoefficients();
				legacyFilter.lowPass2ndOrderSimplified(legacyRadians, intendedGain);
				const response: FrequencyResponse = new FrequencyResponse();
				response.analyze(legacyFilter, curvedRadians);
				legacyFilterGain = response.magnitude();
			}
			if (!resonant) legacyFilterGain = Math.min(legacyFilterGain, Math.sqrt(0.5));
			const gainSetting: number = FilterControlPoint.getRoundedSettingValueFromLinearGain(legacyFilterGain);

			this.addPoint(FilterType.lowPass, freqSetting, gainSetting);
		}

		// Added for JummBox - making a 0 point filter does not truncate control points!
		this.controlPoints.length = this.controlPointCount;
	}

	// Similar to above, but purpose-fit for quick conversions in synth calls.
	public convertLegacySettingsForSynth(legacyCutoffSetting: number, legacyResonanceSetting: number, allowFirstOrder: boolean = false): void {
		this.reset();

		const legacyFilterCutoffMaxHz: number = 8000; // This was carefully calculated to correspond to no change in response when filtering at 48000 samples per second... when using the legacy simplified low-pass filter.
		const legacyFilterMax: number = 0.95;
		const legacyFilterMaxRadians: number = Math.asin(legacyFilterMax / 2.0) * 2.0;
		const legacyFilterMaxResonance: number = 0.95;
		const legacyFilterCutoffRange: number = 11;
		const legacyFilterResonanceRange: number = 8;

		const firstOrder: boolean = legacyResonanceSetting === 0 && allowFirstOrder;
		const standardSampleRate: number = 48000;
		const legacyHz: number = legacyFilterCutoffMaxHz * Math.pow(2.0, (legacyCutoffSetting - (legacyFilterCutoffRange - 1)) * 0.5);
		const legacyRadians: number = Math.min(legacyFilterMaxRadians, (2 * Math.PI * legacyHz) / standardSampleRate);

		if (firstOrder) {
			// In general, a 1st order lowpass can be approximated by a 2nd order lowpass
			// with a cutoff ~4 octaves higher (*16) and a gain of 1/16.
			// However, BeepBox's original lowpass filters behaved oddly as they
			// approach the nyquist frequency, so this curved conversion was devised
			// to guess at a perceptually appropriate new cutoff frequency and gain.
			const extraOctaves: number = 3.5;
			const targetRadians: number = legacyRadians * Math.pow(2.0, extraOctaves);
			const curvedRadians: number = targetRadians / (1.0 + targetRadians / Math.PI);
			const curvedHz: number = (standardSampleRate * curvedRadians) / (2.0 * Math.PI);
			const freqSetting: number = FilterControlPoint.getRoundedSettingValueFromHz(curvedHz);
			const finalHz: number = FilterControlPoint.getHzFromSettingValue(freqSetting);
			const finalRadians: number = (2.0 * Math.PI * finalHz) / standardSampleRate;

			const legacyFilter: FilterCoefficients = new FilterCoefficients();
			legacyFilter.lowPass1stOrderSimplified(legacyRadians);
			const response: FrequencyResponse = new FrequencyResponse();
			response.analyze(legacyFilter, finalRadians);
			const legacyFilterGainAtNewRadians: number = response.magnitude();

			let logGain: number = Math.log2(legacyFilterGainAtNewRadians);
			// Bias slightly toward 2^(-extraOctaves):
			logGain = -extraOctaves + (logGain + extraOctaves) * 0.82;
			const convertedGain: number = Math.pow(2.0, logGain);
			const gainSetting: number = FilterControlPoint.getRoundedSettingValueFromLinearGain(convertedGain);

			this.addPoint(FilterType.lowPass, freqSetting, gainSetting);
		} else {
			const intendedGain: number =
				0.5 / (1.0 - legacyFilterMaxResonance * Math.sqrt(Math.max(0.0, legacyResonanceSetting - 1.0) / (legacyFilterResonanceRange - 2.0)));
			const invertedGain: number = 0.5 / intendedGain;
			const maxRadians: number = (2.0 * Math.PI * legacyFilterCutoffMaxHz) / standardSampleRate;
			const freqRatio: number = legacyRadians / maxRadians;
			const targetRadians: number = legacyRadians * (freqRatio * Math.pow(invertedGain, 0.9) + 1.0);
			const curvedRadians: number = legacyRadians + (targetRadians - legacyRadians) * invertedGain;
			let curvedHz: number;

			curvedHz = (standardSampleRate * curvedRadians) / (2.0 * Math.PI);
			const freqSetting: number = FilterControlPoint.getSettingValueFromHz(curvedHz);

			let legacyFilterGain: number;

			const legacyFilter: FilterCoefficients = new FilterCoefficients();
			legacyFilter.lowPass2ndOrderSimplified(legacyRadians, intendedGain);
			const response: FrequencyResponse = new FrequencyResponse();
			response.analyze(legacyFilter, curvedRadians);
			legacyFilterGain = response.magnitude();
			const gainSetting: number = FilterControlPoint.getRoundedSettingValueFromLinearGain(legacyFilterGain);

			this.addPoint(FilterType.lowPass, freqSetting, gainSetting);
		}
	}
}

export class EnvelopeSettings {
	public target: number = 0;
	public index: number = 0;
	public envelope: number = 0;
	// slarmoo's box 1.0
	public pitchEnvelopeStart: number;
	public pitchEnvelopeEnd: number;
	public inverse: boolean;
	// midbox
	public perEnvelopeSpeed: number = Config.envelopes[this.envelope].speed;
	public perEnvelopeLowerBound: number = 0;
	public perEnvelopeUpperBound: number = 1;
	// modulation support
	public tempEnvelopeSpeed: number | null = null;
	public tempEnvelopeLowerBound: number | null = null;
	public tempEnvelopeUpperBound: number | null = null;
	// pseudo random
	public steps: number = 2;
	public seed: number = 2;
	// lfo and random types
	public waveform: number = LFOEnvelopeTypes.sine;
	// moved discrete into here
	public discrete: boolean = false;

	constructor(public isNoiseEnvelope: boolean) {
		this.reset();
	}

	reset(): void {
		this.target = 0;
		this.index = 0;
		this.envelope = 0;
		this.pitchEnvelopeStart = 0;
		this.pitchEnvelopeEnd = this.isNoiseEnvelope ? Config.drumCount - 1 : Config.maxPitch;
		this.inverse = false;
		this.isNoiseEnvelope = false;
		this.perEnvelopeSpeed = Config.envelopes[this.envelope].speed;
		this.perEnvelopeLowerBound = 0;
		this.perEnvelopeUpperBound = 1;
		this.tempEnvelopeSpeed = null;
		this.tempEnvelopeLowerBound = null;
		this.tempEnvelopeUpperBound = null;
		this.steps = 2;
		this.seed = 2;
		this.waveform = LFOEnvelopeTypes.sine;
		this.discrete = false;
	}

	public toJsonObject(): object {
		const envelopeObject: any = {
			target: Config.instrumentAutomationTargets[this.target].name,
			envelope: Config.newEnvelopes[this.envelope].name,
			inverse: this.inverse,
			perEnvelopeSpeed: this.perEnvelopeSpeed,
			perEnvelopeLowerBound: this.perEnvelopeLowerBound,
			perEnvelopeUpperBound: this.perEnvelopeUpperBound,
			discrete: this.discrete,
		};
		if (Config.instrumentAutomationTargets[this.target].maxCount > 1) {
			envelopeObject["index"] = this.index;
		}
		if (Config.newEnvelopes[this.envelope].name === "pitch") {
			envelopeObject["pitchEnvelopeStart"] = this.pitchEnvelopeStart;
			envelopeObject["pitchEnvelopeEnd"] = this.pitchEnvelopeEnd;
		} else if (Config.newEnvelopes[this.envelope].name === "random") {
			envelopeObject["steps"] = this.steps;
			envelopeObject["seed"] = this.seed;
			envelopeObject["waveform"] = this.waveform;
		} else if (Config.newEnvelopes[this.envelope].name === "lfo") {
			envelopeObject["waveform"] = this.waveform;
			envelopeObject["steps"] = this.steps;
		}
		return envelopeObject;
	}

	public fromJsonObject(envelopeObject: any, format: string): void {
		this.reset();

		let target: AutomationTarget = Config.instrumentAutomationTargets.dictionary[envelopeObject["target"]];
		if (target == null) target = Config.instrumentAutomationTargets.dictionary["noteVolume"];
		this.target = target.index;

		let envelope: Envelope = Config.envelopes.dictionary["none"];
		let isTremolo2: boolean = false;
		if (format === "slarmoosbox" || format === "jukebox") {
			if (envelopeObject["envelope"] === "tremolo2") {
				envelope = Config.newEnvelopes[EnvelopeType.lfo];
				isTremolo2 = true;
			} else if (envelopeObject["envelope"] === "tremolo") {
				envelope = Config.newEnvelopes[EnvelopeType.lfo];
				isTremolo2 = false;
			} else {
				envelope = Config.newEnvelopes.dictionary[envelopeObject["envelope"]];
			}
		} else {
			const oldEnvelope: Envelope | undefined = Config.envelopes.dictionary[envelopeObject["envelope"]];
			if (oldEnvelope == null) {
				envelope = Config.newEnvelopes.dictionary["none"];
			} else if (oldEnvelope.type === EnvelopeType.tremolo2) {
				envelope = Config.newEnvelopes[EnvelopeType.lfo];
				isTremolo2 = true;
			} else if (Config.newEnvelopes[Math.max(Config.envelopes.dictionary[envelopeObject["envelope"]].type - 1, 0)].index > EnvelopeType.lfo) {
				envelope = Config.newEnvelopes[Config.envelopes.dictionary[envelopeObject["envelope"]].type - 1];
			} else {
				envelope = Config.newEnvelopes[Config.envelopes.dictionary[envelopeObject["envelope"]].type];
			}
		}

		if (envelope === undefined) {
			const oldEnvelope2: Envelope | undefined = Config.envelopes.dictionary[envelopeObject["envelope"]];
			if (oldEnvelope2 == null) {
				envelope = Config.newEnvelopes.dictionary["none"];
			} else if (oldEnvelope2.type === EnvelopeType.tremolo2) {
				envelope = Config.newEnvelopes[EnvelopeType.lfo];
				isTremolo2 = true;
			} else if (Config.newEnvelopes[Math.max(Config.envelopes.dictionary[envelopeObject["envelope"]].type - 1, 0)].index > EnvelopeType.lfo) {
				envelope = Config.newEnvelopes[Config.envelopes.dictionary[envelopeObject["envelope"]].type - 1];
			} else {
				envelope = Config.newEnvelopes[Config.envelopes.dictionary[envelopeObject["envelope"]].type];
			}
		}
		if (envelope == null) envelope = Config.envelopes.dictionary["none"];
		this.envelope = envelope.index;

		if (envelopeObject["index"] !== undefined) {
			this.index = clamp(0, Config.instrumentAutomationTargets[this.target].maxCount, envelopeObject["index"] | 0);
		} else {
			this.index = 0;
		}

		if (envelopeObject["pitchEnvelopeStart"] !== undefined) {
			this.pitchEnvelopeStart = clamp(0, this.isNoiseEnvelope ? Config.drumCount : Config.maxPitch + 1, envelopeObject["pitchEnvelopeStart"]);
		} else {
			this.pitchEnvelopeStart = 0;
		}

		if (envelopeObject["pitchEnvelopeEnd"] !== undefined) {
			this.pitchEnvelopeEnd = clamp(0, this.isNoiseEnvelope ? Config.drumCount : Config.maxPitch + 1, envelopeObject["pitchEnvelopeEnd"]);
		} else {
			this.pitchEnvelopeEnd = this.isNoiseEnvelope ? Config.drumCount : Config.maxPitch;
		}

		this.inverse = Boolean(envelopeObject["inverse"]);

		if (envelopeObject["perEnvelopeSpeed"] !== undefined) {
			this.perEnvelopeSpeed = envelopeObject["perEnvelopeSpeed"];
		} else {
			const fallbackEnvelope: Envelope | undefined = Config.envelopes.dictionary[envelopeObject["envelope"]];
			this.perEnvelopeSpeed = fallbackEnvelope != null ? fallbackEnvelope.speed : 1.0;
		}

		if (envelopeObject["perEnvelopeLowerBound"] !== undefined) {
			this.perEnvelopeLowerBound = clamp(Config.perEnvelopeBoundMin, Config.perEnvelopeBoundMax + 1, envelopeObject["perEnvelopeLowerBound"]);
		} else {
			this.perEnvelopeLowerBound = 0;
		}

		if (envelopeObject["perEnvelopeUpperBound"] !== undefined) {
			this.perEnvelopeUpperBound = clamp(Config.perEnvelopeBoundMin, Config.perEnvelopeBoundMax + 1, envelopeObject["perEnvelopeUpperBound"]);
		} else {
			this.perEnvelopeUpperBound = 1;
		}

		// convert tremolo2 settings into lfo
		if (isTremolo2) {
			if (this.inverse) {
				this.perEnvelopeUpperBound = Math.floor((this.perEnvelopeUpperBound / 2) * 10) / 10;
				this.perEnvelopeLowerBound = Math.floor((this.perEnvelopeLowerBound / 2) * 10) / 10;
			} else {
				this.perEnvelopeUpperBound = Math.floor((0.5 + (this.perEnvelopeUpperBound - this.perEnvelopeLowerBound) / 2) * 10) / 10;
				this.perEnvelopeLowerBound = 0.5;
			}
		}

		if (envelopeObject["steps"] !== undefined) {
			this.steps = clamp(1, Config.randomEnvelopeStepsMax + 1, envelopeObject["steps"]);
		} else {
			this.steps = 2;
		}

		if (envelopeObject["seed"] !== undefined) {
			this.seed = clamp(1, Config.randomEnvelopeSeedMax + 1, envelopeObject["seed"]);
		} else {
			this.seed = 2;
		}

		if (envelopeObject["waveform"] !== undefined) {
			this.waveform = envelopeObject["waveform"];
		} else {
			this.waveform = LFOEnvelopeTypes.sine;
		}

		if (envelopeObject["discrete"] !== undefined) {
			this.discrete = envelopeObject["discrete"];
		} else {
			this.discrete = false;
		}
	}
}

// Settings that were available to old versions of BeepBox but are no longer available in the
// current version that need to be reinterpreted as a group to determine the best way to
// represent them in the current version.
export interface LegacySettings {
	filterCutoff?: number;
	filterResonance?: number;
	filterEnvelope?: Envelope;
	pulseEnvelope?: Envelope;
	operatorEnvelopes?: Envelope[];
	feedbackEnvelope?: Envelope;
}

export interface HeldMod {
	volume: number;
	channelIndex: number;
	instrumentIndex: number;
	setting: number;
	holdFor: number;
}

export class Instrument {
	public type: InstrumentType = InstrumentType.chip;
	public preset: number = 0;
	public chipWave: number = 2;
	// advloop addition
	public isUsingAdvancedLoopControls: boolean = false;
	public chipWaveLoopStart: number = 0;
	public chipWaveLoopEnd = Config.rawRawChipWaves[this.chipWave].samples.length - 1;
	public chipWaveLoopMode: number = 0; // 0: loop, 1: ping-pong, 2: once, 3: play loop once
	public chipWavePlayBackwards: boolean = false;
	public chipWaveStartOffset: number = 0;
	// advloop addition
	public chipNoise: number = 1;
	public eqFilter: FilterSettings = new FilterSettings();
	public eqFilterType: boolean = false;
	public eqFilterSimpleCut: number = Config.filterSimpleCutRange - 1;
	public eqFilterSimplePeak: number = 0;
	public noteFilter: FilterSettings = new FilterSettings();
	public noteFilterType: boolean = false;
	public noteFilterSimpleCut: number = Config.filterSimpleCutRange - 1;
	public noteFilterSimplePeak: number = 0;
	public eqSubFilters: (FilterSettings | null)[] = [];
	public noteSubFilters: (FilterSettings | null)[] = [];
	public tmpEqFilterStart: FilterSettings | null;
	public tmpEqFilterEnd: FilterSettings | null;
	public tmpNoteFilterStart: FilterSettings | null;
	public tmpNoteFilterEnd: FilterSettings | null;
	public envelopes: EnvelopeSettings[] = [];
	public fadeIn: number = 0;
	public fadeOut: number = Config.fadeOutNeutral;
	public envelopeCount: number = 0;
	public transition: number = Config.transitions.dictionary["normal"].index;
	public pitchShift: number = 0;
	public detune: number = 0;
	public vibrato: number = 0;
	public interval: number = 0;
	public vibratoDepth: number = 0;
	public vibratoSpeed: number = 10;
	public vibratoDelay: number = 0;
	public vibratoType: number = 0;
	public envelopeSpeed: number = 12;
	public unison: number = 0;
	public unisonVoices: number = 1;
	public unisonSpread: number = 0.0;
	public unisonOffset: number = 0.0;
	public unisonExpression: number = 1.4;
	public unisonSign: number = 1.0;
	public unisonInitialized: boolean = true;
	public effects: number = 0;
	public chord: number = 1;
	public volume: number = 0;
	public pan: number = Config.panCenter;
	public panDelay: number = 0;
	public arpeggioSpeed: number = 12;
	public monoChordTone: number = 0;
	public fastTwoNoteArp: boolean = false;
	public legacyTieOver: boolean = false;
	public clicklessTransition: boolean = false;
	public aliases: boolean = false;
	public pulseWidth: number = Config.pulseWidthRange;
	public decimalOffset: number = 0;
	public supersawDynamism: number = Config.supersawDynamismMax;
	public supersawSpread: number = Math.ceil(Config.supersawSpreadMax / 2.0);
	public supersawShape: number = 0;
	public stringSustain: number = 10;
	public stringSustainType: SustainType = SustainType.acoustic;
	public distortion: number = 0;
	public bitcrusherFreq: number = 0;
	public bitcrusherQuantization: number = 0;
	public ringModulation: number = Config.ringModRange >> 1;
	public ringModulationHz: number = Config.ringModHzRange >> 1;
	public ringModWaveformIndex: number = 0;
	public ringModPulseWidth: number = Config.pwmOperatorWaves.length >> 1;
	public ringModHzOffset: number = 200;
	public granular: number = 4;
	public grainSize: number = (Config.grainSizeMax - Config.grainSizeMin) / Config.grainSizeStep;
	public grainAmounts: number = Config.grainAmountsMax;
	public grainRange: number = 40;
	public chorus: number = 0;
	public reverb: number = 0;
	public echoSustain: number = 0;
	public echoDelay: number = 0;
	public phaserFreq: number = 0;
	public phaserMix: number = Config.phaserMixRange - 1;
	public phaserFeedback: number = 0;
	public phaserStages: number = 2;

	public invertWave: boolean = false;

	public algorithm: number = 0;
	public feedbackType: number = 0;
	public algorithm6Op: number = 1;
	public feedbackType6Op: number = 1; // default to not custom
	public customAlgorithm: CustomAlgorithm = new CustomAlgorithm(); // { name: "1←4(2←5 3←6", carrierCount: 3, associatedCarrier: [1, 2, 3, 1, 2, 3], modulatedBy: [[2, 3, 4], [5], [6], [], [], []] };
	public customFeedbackType: CustomFeedBack = new CustomFeedBack(); // { name: "1↔4 2↔5 3↔6", indices: [[3], [5], [6], [1], [2], [3]] };
	public feedbackAmplitude: number = 0;
	public customChipWave: Float32Array = new Float32Array(64);
	public customChipWaveIntegral: Float32Array = new Float32Array(65); // One extra element for wrap-around in chipSynth.
	public readonly operators: Operator[] = [];
	public readonly spectrumWave: SpectrumWave;
	public readonly harmonicsWave: HarmonicsWave = new HarmonicsWave();
	public readonly drumsetEnvelopes: number[] = [];
	public readonly drumsetSpectrumWaves: SpectrumWave[] = [];
	public modChannels: number[] = [];
	public modInstruments: number[] = [];
	public modulators: number[] = [];
	public modFilterTypes: number[] = [];
	public modEnvelopeNumbers: number[] = [];
	public invalidModulators: boolean[] = [];
	public upperNoteLimit: number = Config.maxPitch;
	public lowerNoteLimit: number = 0;

	// Literally just for pitch envelopes.
	public isNoiseInstrument: boolean = false;
	constructor(isNoiseChannel: boolean, isModChannel: boolean) {
		// @jummbus - My screed on how modulator arrays for instruments work, for the benefit of myself in the future, or whoever else.
		//
		// modulators[mod] is the index in Config.modulators to use, with "none" being the first entry.
		//
		// modChannels[mod] gives the index of a channel set for this mod. Two special values:
		//   -2 "none"
		//   -1 "song"
		//   0+ actual channel index
		//
		// modInstruments[mod] gives the index of an instrument within the channel set for this mod. Again, two special values:
		//   [0 ~ channel.instruments.length-1]     channel's instrument index
		//   channel.instruments.length             "all"
		//   channel.instruments.length+1           "active"
		//
		// modFilterTypes[mod] gives some info about the filter type: 0 is morph, 1+ is index in the dot selection array (dot 1 x, dot 1 y, dot 2 x...)
		//   0  filter morph
		//   1+ filter dot target, starting from dot 1 x and then dot 1 y, then repeating x, y for all dots in order. Note: odd values are always "x" targets, even are "y".

		if (isModChannel) {
			for (let mod: number = 0; mod < Config.modCount; mod++) {
				this.modChannels.push(-2);
				this.modInstruments.push(0);
				this.modulators.push(Config.modulators.dictionary["none"].index);
			}
		}

		this.spectrumWave = new SpectrumWave(isNoiseChannel);
		for (let i: number = 0; i < Config.operatorCount + 2; i++) {
			// hopefully won't break everything
			this.operators[i] = new Operator(i);
		}
		for (let i: number = 0; i < Config.drumCount; i++) {
			this.drumsetEnvelopes[i] = Config.envelopes.dictionary["twang 2"].index;
			this.drumsetSpectrumWaves[i] = new SpectrumWave(true);
		}

		for (let i = 0; i < 64; i++) {
			this.customChipWave[i] = 24 - Math.floor(i * (48 / 64));
		}

		let sum: number = 0.0;
		for (let i: number = 0; i < this.customChipWave.length; i++) {
			sum += this.customChipWave[i];
		}
		const average: number = sum / this.customChipWave.length;

		// Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
		let cumulative: number = 0;
		let wavePrev: number = 0;
		for (let i: number = 0; i < this.customChipWave.length; i++) {
			cumulative += wavePrev;
			wavePrev = this.customChipWave[i] - average;
			this.customChipWaveIntegral[i] = cumulative;
		}

		// 65th, last sample is for anti-aliasing
		this.customChipWaveIntegral[64] = 0.0;

		// properly sets the isNoiseInstrument value
		this.isNoiseInstrument = isNoiseChannel;
	}

	public setTypeAndReset(type: InstrumentType, isNoiseChannel: boolean, isModChannel: boolean): void {
		// Mod channels are forced to one type.
		if (isModChannel) type = InstrumentType.mod;
		this.type = type;
		this.preset = type;
		this.volume = 0;
		this.effects = 1 << EffectType.panning; // Panning enabled by default in JB.
		this.chorus = Config.chorusRange - 1;
		this.reverb = 0;
		this.echoSustain = Math.floor((Config.echoSustainRange - 1) * 0.5);
		this.echoDelay = Math.floor((Config.echoDelayRange - 1) * 0.5);
		this.eqFilter.reset();
		this.eqFilterType = false;
		this.eqFilterSimpleCut = Config.filterSimpleCutRange - 1;
		this.eqFilterSimplePeak = 0;
		for (let i: number = 0; i < Config.filterMorphCount; i++) {
			this.eqSubFilters[i] = null;
			this.noteSubFilters[i] = null;
		}
		this.noteFilter.reset();
		this.noteFilterType = false;
		this.noteFilterSimpleCut = Config.filterSimpleCutRange - 1;
		this.noteFilterSimplePeak = 0;
		this.distortion = Math.floor((Config.distortionRange - 1) * 0.75);
		this.bitcrusherFreq = Math.floor((Config.bitcrusherFreqRange - 1) * 0.5);
		this.bitcrusherQuantization = Math.floor((Config.bitcrusherQuantizationRange - 1) * 0.5);

		this.ringModulation = Config.ringModRange >> 1;
		this.ringModulationHz = Config.ringModHzRange >> 1;
		this.ringModWaveformIndex = 0;
		this.ringModPulseWidth = Config.pwmOperatorWaves.length >> 1;
		this.ringModHzOffset = 200;

		this.granular = 4;
		this.grainSize = (Config.grainSizeMax - Config.grainSizeMin) / Config.grainSizeStep;
		this.grainAmounts = Config.grainAmountsMax;
		this.grainRange = 40;

		this.phaserFreq = 0;
		this.phaserFeedback = 0;
		this.phaserStages = 2;
		this.phaserMix = Config.phaserMixRange - 1;

		this.invertWave = false;

		this.pan = Config.panCenter;
		this.panDelay = 0;
		this.pitchShift = Config.pitchShiftCenter;
		this.detune = Config.detuneCenter;
		this.vibrato = 0;
		this.unison = 0;
		this.stringSustain = 10;
		this.stringSustainType = Config.enableAcousticSustain ? SustainType.acoustic : SustainType.bright;
		this.clicklessTransition = false;
		this.arpeggioSpeed = 12;
		this.monoChordTone = 1;
		this.envelopeSpeed = 12;
		this.legacyTieOver = false;
		this.aliases = false;
		this.fadeIn = 0;
		this.fadeOut = Config.fadeOutNeutral;
		this.transition = Config.transitions.dictionary["normal"].index;
		this.envelopeCount = 0;
		this.upperNoteLimit = Config.maxPitch;
		this.lowerNoteLimit = 0;
		this.isNoiseInstrument = isNoiseChannel;

		const plugin = getPlugin(type);
		if (plugin?.initialize) {
			plugin.initialize(this);
		} else {
			this.chord = Config.chords.dictionary["simultaneous"].index;
		}

		// Enable chord if the chord type is not "simultaneous"
		if (this.chord !== Config.chords.dictionary["simultaneous"].index) {
			this.effects = this.effects | (1 << EffectType.chord);
		}
	}

	// (only) difference for JummBox: Returns whether or not the note filter was chosen for filter conversion.
	public convertLegacySettings(legacySettings: LegacySettings, forceSimpleFilter: boolean): void {
		let legacyCutoffSetting: number | undefined = legacySettings.filterCutoff;
		let legacyResonanceSetting: number | undefined = legacySettings.filterResonance;
		let legacyFilterEnv: Envelope | undefined = legacySettings.filterEnvelope;
		let legacyPulseEnv: Envelope | undefined = legacySettings.pulseEnvelope;
		let legacyOperatorEnvelopes: Envelope[] | undefined = legacySettings.operatorEnvelopes;
		let legacyFeedbackEnv: Envelope | undefined = legacySettings.feedbackEnvelope;

		// legacy defaults:
		if (legacyCutoffSetting === undefined) legacyCutoffSetting = this.type === InstrumentType.chip ? 6 : 10;
		if (legacyResonanceSetting === undefined) legacyResonanceSetting = 0;
		if (legacyFilterEnv === undefined) legacyFilterEnv = Config.envelopes.dictionary["none"];
		if (legacyPulseEnv === undefined) {
			legacyPulseEnv = Config.envelopes.dictionary[this.type === InstrumentType.pwm ? "twang 2" : "none"];
		}
		if (legacyOperatorEnvelopes === undefined) {
			legacyOperatorEnvelopes = [
				Config.envelopes.dictionary[this.type === InstrumentType.fm ? "note size" : "none"],
				Config.envelopes.dictionary["none"],
				Config.envelopes.dictionary["none"],
				Config.envelopes.dictionary["none"],
			];
		}
		if (legacyFeedbackEnv === undefined) legacyFeedbackEnv = Config.envelopes.dictionary["none"];

		// The "punch" envelope is special: it goes *above* the chosen cutoff. But if the cutoff was already at the max, it couldn't go any higher... except in the current version of BeepBox I raised the max cutoff so it *can* but then it sounds different, so to preserve the original sound let's just remove the punch envelope.
		const legacyFilterCutoffRange: number = 11;
		const cutoffAtMax: boolean = legacyCutoffSetting === legacyFilterCutoffRange - 1;
		if (cutoffAtMax && legacyFilterEnv.type === EnvelopeType.punch) {
			legacyFilterEnv = Config.envelopes.dictionary["none"];
		}

		const carrierCount: number = Config.algorithms[this.algorithm].carrierCount;
		let noCarriersControlledByNoteSize: boolean = true;
		let allCarriersControlledByNoteSize: boolean = true;
		let noteSizeControlsSomethingElse: boolean = legacyFilterEnv.type === EnvelopeType.noteSize || legacyPulseEnv.type === EnvelopeType.noteSize;
		if (this.type === InstrumentType.fm || this.type === InstrumentType.fm6op) {
			noteSizeControlsSomethingElse = noteSizeControlsSomethingElse || legacyFeedbackEnv.type === EnvelopeType.noteSize;
			for (let i: number = 0; i < legacyOperatorEnvelopes.length; i++) {
				if (i < carrierCount) {
					if (legacyOperatorEnvelopes[i].type !== EnvelopeType.noteSize) {
						allCarriersControlledByNoteSize = false;
					} else {
						noCarriersControlledByNoteSize = false;
					}
				} else {
					noteSizeControlsSomethingElse = noteSizeControlsSomethingElse || legacyOperatorEnvelopes[i].type === EnvelopeType.noteSize;
				}
			}
		}

		this.envelopeCount = 0;

		if (this.type === InstrumentType.fm || this.type === InstrumentType.fm6op) {
			if (allCarriersControlledByNoteSize && noteSizeControlsSomethingElse) {
				this.addEnvelope(Config.instrumentAutomationTargets.dictionary["noteVolume"].index, 0, Config.envelopes.dictionary["note size"].index, false);
			} else if (noCarriersControlledByNoteSize && !noteSizeControlsSomethingElse) {
				this.addEnvelope(Config.instrumentAutomationTargets.dictionary["none"].index, 0, Config.envelopes.dictionary["note size"].index, false);
			}
		}

		if (legacyFilterEnv.type === EnvelopeType.none) {
			this.noteFilter.reset();
			this.noteFilterType = false;
			this.eqFilter.convertLegacySettings(legacyCutoffSetting, legacyResonanceSetting, legacyFilterEnv);
			this.effects &= ~(1 << EffectType.noteFilter);
			if (forceSimpleFilter || this.eqFilterType) {
				this.eqFilterType = true;
				this.eqFilterSimpleCut = legacyCutoffSetting;
				this.eqFilterSimplePeak = legacyResonanceSetting;
			}
		} else {
			this.eqFilter.reset();

			this.eqFilterType = false;
			this.noteFilterType = false;
			this.noteFilter.convertLegacySettings(legacyCutoffSetting, legacyResonanceSetting, legacyFilterEnv);
			this.effects |= 1 << EffectType.noteFilter;
			this.addEnvelope(Config.instrumentAutomationTargets.dictionary["noteFilterAllFreqs"].index, 0, legacyFilterEnv.index, false);
			if (forceSimpleFilter || this.noteFilterType) {
				this.noteFilterType = true;
				this.noteFilterSimpleCut = legacyCutoffSetting;
				this.noteFilterSimplePeak = legacyResonanceSetting;
			}
		}

		if (legacyPulseEnv.type !== EnvelopeType.none) {
			this.addEnvelope(Config.instrumentAutomationTargets.dictionary["pulseWidth"].index, 0, legacyPulseEnv.index, false);
		}

		for (let i: number = 0; i < legacyOperatorEnvelopes.length; i++) {
			if (i < carrierCount && allCarriersControlledByNoteSize) continue;
			if (legacyOperatorEnvelopes[i].type !== EnvelopeType.none) {
				this.addEnvelope(Config.instrumentAutomationTargets.dictionary["operatorAmplitude"].index, i, legacyOperatorEnvelopes[i].index, false);
			}
		}

		if (legacyFeedbackEnv.type !== EnvelopeType.none) {
			this.addEnvelope(Config.instrumentAutomationTargets.dictionary["feedbackAmplitude"].index, 0, legacyFeedbackEnv.index, false);
		}
	}

	public toJsonObject(): object {
		const instrumentObject: any = {
			type: Config.instrumentTypeNames[this.type],
			volume: this.volume,
			eqFilter: this.eqFilter.toJsonObject(),
			eqFilterType: this.eqFilterType,
			eqSimpleCut: this.eqFilterSimpleCut,
			eqSimplePeak: this.eqFilterSimplePeak,
			envelopeSpeed: this.envelopeSpeed,
		};

		if (this.preset !== this.type) {
			instrumentObject["preset"] = this.preset;
		}

		for (let i: number = 0; i < Config.filterMorphCount; i++) {
			if (this.eqSubFilters[i] != null) {
				instrumentObject["eqSubFilters" + i] = this.eqSubFilters[i]!.toJsonObject();
			}
		}

		const effects: string[] = [];
		for (const effect of Config.effectOrder) {
			if (this.effects & (1 << effect)) {
				effects.push(Config.effectNames[effect]);
			}
		}
		instrumentObject["effects"] = effects;

		if (effectsIncludeTransition(this.effects)) {
			instrumentObject["transition"] = Config.transitions[this.transition].name;
			instrumentObject["clicklessTransition"] = this.clicklessTransition;
		}
		if (effectsIncludeChord(this.effects)) {
			instrumentObject["chord"] = this.getChord().name;
			instrumentObject["fastTwoNoteArp"] = this.fastTwoNoteArp;
			instrumentObject["arpeggioSpeed"] = this.arpeggioSpeed;
			instrumentObject["monoChordTone"] = this.monoChordTone;
		}
		if (effectsIncludePitchShift(this.effects)) {
			instrumentObject["pitchShiftSemitones"] = this.pitchShift;
		}
		if (effectsIncludeDetune(this.effects)) {
			instrumentObject["detuneCents"] = detuneToCents(this.detune);
		}
		if (effectsIncludeVibrato(this.effects)) {
			if (this.vibrato === -1) {
				this.vibrato = 5;
			}
			if (this.vibrato !== 5) {
				instrumentObject["vibrato"] = Config.vibratos[this.vibrato].name;
			} else {
				instrumentObject["vibrato"] = "custom";
			}
			instrumentObject["vibratoDepth"] = this.vibratoDepth;
			instrumentObject["vibratoDelay"] = this.vibratoDelay;
			instrumentObject["vibratoSpeed"] = this.vibratoSpeed;
			instrumentObject["vibratoType"] = this.vibratoType;
		}
		if (effectsIncludeNoteFilter(this.effects)) {
			instrumentObject["noteFilterType"] = this.noteFilterType;
			instrumentObject["noteSimpleCut"] = this.noteFilterSimpleCut;
			instrumentObject["noteSimplePeak"] = this.noteFilterSimplePeak;
			instrumentObject["noteFilter"] = this.noteFilter.toJsonObject();

			for (let i: number = 0; i < Config.filterMorphCount; i++) {
				if (this.noteSubFilters[i] != null) {
					instrumentObject["noteSubFilters" + i] = this.noteSubFilters[i]!.toJsonObject();
				}
			}
		}
		if (effectsIncludeGranular(this.effects)) {
			instrumentObject["granular"] = this.granular;
			instrumentObject["grainSize"] = this.grainSize;
			instrumentObject["grainAmounts"] = this.grainAmounts;
			instrumentObject["grainRange"] = this.grainRange;
		}
		if (effectsIncludeRingModulation(this.effects)) {
			instrumentObject["ringMod"] = Math.round((100 * this.ringModulation) / (Config.ringModRange - 1));
			instrumentObject["ringModHz"] = Math.round((100 * this.ringModulationHz) / (Config.ringModHzRange - 1));
			instrumentObject["ringModWaveformIndex"] = this.ringModWaveformIndex;
			instrumentObject["ringModPulseWidth"] = Math.round((100 * this.ringModPulseWidth) / (Config.pulseWidthRange - 1));
			instrumentObject["ringModHzOffset"] = Math.round((100 * this.ringModHzOffset) / Config.rmHzOffsetMax);
		}
		if (effectsIncludePhaser(this.effects)) {
			instrumentObject["phaserMix"] = Math.round((100 * this.phaserMix) / (Config.phaserMixRange - 1));
			instrumentObject["phaserFreq"] = Math.round((100 * this.phaserFreq) / (Config.phaserFreqRange - 1));
			instrumentObject["phaserFeedback"] = Math.round((100 * this.phaserFeedback) / (Config.phaserFeedbackRange - 1));
			instrumentObject["phaserStages"] = Math.round((100 * this.phaserStages) / (Config.phaserMaxStages - 1));
		}
		if (effectsIncludeDistortion(this.effects)) {
			instrumentObject["distortion"] = Math.round((100 * this.distortion) / (Config.distortionRange - 1));
			instrumentObject["aliases"] = this.aliases;
		}
		if (effectsIncludeBitcrusher(this.effects)) {
			instrumentObject["bitcrusherOctave"] = (Config.bitcrusherFreqRange - 1 - this.bitcrusherFreq) * Config.bitcrusherOctaveStep;
			instrumentObject["bitcrusherQuantization"] = Math.round((100 * this.bitcrusherQuantization) / (Config.bitcrusherQuantizationRange - 1));
		}
		if (effectsIncludeInvertWave(this.effects)) {
			instrumentObject["invertWave"] = this.invertWave;
		}
		if (effectsIncludePanning(this.effects)) {
			instrumentObject["pan"] = Math.round((100 * (this.pan - Config.panCenter)) / Config.panCenter);
			instrumentObject["panDelay"] = this.panDelay;
		}
		if (effectsIncludeChorus(this.effects)) {
			instrumentObject["chorus"] = Math.round((100 * this.chorus) / (Config.chorusRange - 1));
		}
		if (effectsIncludeEcho(this.effects)) {
			instrumentObject["echoSustain"] = Math.round((100 * this.echoSustain) / (Config.echoSustainRange - 1));
			instrumentObject["echoDelayBeats"] =
				Math.round((1000 * (this.echoDelay + 1) * Config.echoDelayStepTicks) / (Config.ticksPerPart * Config.partsPerBeat)) / 1000;
		}
		if (effectsIncludeReverb(this.effects)) {
			instrumentObject["reverb"] = Math.round((100 * this.reverb) / (Config.reverbRange - 1));
		}
		if (effectsIncludeNoteRange(this.effects)) {
			instrumentObject["upperNoteLimit"] = this.upperNoteLimit;
			instrumentObject["lowerNoteLimit"] = this.lowerNoteLimit;
		}

		if (this.type !== InstrumentType.drumset) {
			instrumentObject["fadeInSeconds"] = Math.round(10000 * fadeInSettingToSeconds(this.fadeIn)) / 10000;
			instrumentObject["fadeOutTicks"] = fadeOutSettingToTicks(this.fadeOut);
		}

		if (this.type === InstrumentType.harmonics || this.type === InstrumentType.pickedString) {
			instrumentObject["harmonics"] = [];
			for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
				instrumentObject["harmonics"][i] = Math.round((100 * this.harmonicsWave.harmonics[i]) / Config.harmonicsMax);
			}
		}

		if (this.type === InstrumentType.noise) {
			instrumentObject["wave"] = Config.chipNoises[this.chipNoise].name;
			instrumentObject["unison"] = this.unison === Config.unisons.length ? "custom" : Config.unisons[this.unison].name;
			if (this.unison === Config.unisons.length) {
				instrumentObject["unisonVoices"] = this.unisonVoices;
				instrumentObject["unisonSpread"] = this.unisonSpread;
				instrumentObject["unisonOffset"] = this.unisonOffset;
				instrumentObject["unisonExpression"] = this.unisonExpression;
				instrumentObject["unisonSign"] = this.unisonSign;
			}
		} else if (this.type === InstrumentType.spectrum) {
			instrumentObject["spectrum"] = [];
			for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
				instrumentObject["spectrum"][i] = Math.round((100 * this.spectrumWave.spectrum[i]) / Config.spectrumMax);
			}
			instrumentObject["unison"] = this.unison === Config.unisons.length ? "custom" : Config.unisons[this.unison].name;
			if (this.unison === Config.unisons.length) {
				instrumentObject["unisonVoices"] = this.unisonVoices;
				instrumentObject["unisonSpread"] = this.unisonSpread;
				instrumentObject["unisonOffset"] = this.unisonOffset;
				instrumentObject["unisonExpression"] = this.unisonExpression;
				instrumentObject["unisonSign"] = this.unisonSign;
			}
		} else if (this.type === InstrumentType.drumset) {
			instrumentObject["drums"] = [];
			instrumentObject["unison"] = this.unison === Config.unisons.length ? "custom" : Config.unisons[this.unison].name;
			if (this.unison === Config.unisons.length) {
				instrumentObject["unisonVoices"] = this.unisonVoices;
				instrumentObject["unisonSpread"] = this.unisonSpread;
				instrumentObject["unisonOffset"] = this.unisonOffset;
				instrumentObject["unisonExpression"] = this.unisonExpression;
				instrumentObject["unisonSign"] = this.unisonSign;
			}
			for (let j: number = 0; j < Config.drumCount; j++) {
				const spectrum: number[] = [];
				for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
					spectrum[i] = Math.round((100 * this.drumsetSpectrumWaves[j].spectrum[i]) / Config.spectrumMax);
				}
				instrumentObject["drums"][j] = {
					filterEnvelope: this.getDrumsetEnvelope(j).name,
					spectrum: spectrum,
				};
			}
		} else if (this.type === InstrumentType.chip) {
			instrumentObject["wave"] = Config.chipWaves[this.chipWave].name;
			// should this unison pushing code be turned into a function..?
			instrumentObject["unison"] = this.unison === Config.unisons.length ? "custom" : Config.unisons[this.unison].name;
			// these don't need to be pushed if custom unisons aren't being used
			if (this.unison === Config.unisons.length) {
				instrumentObject["unisonVoices"] = this.unisonVoices;
				instrumentObject["unisonSpread"] = this.unisonSpread;
				instrumentObject["unisonOffset"] = this.unisonOffset;
				instrumentObject["unisonExpression"] = this.unisonExpression;
				instrumentObject["unisonSign"] = this.unisonSign;
			}

			// advloop addition
			instrumentObject["isUsingAdvancedLoopControls"] = this.isUsingAdvancedLoopControls;
			instrumentObject["chipWaveLoopStart"] = this.chipWaveLoopStart;
			instrumentObject["chipWaveLoopEnd"] = this.chipWaveLoopEnd;
			instrumentObject["chipWaveLoopMode"] = this.chipWaveLoopMode;
			instrumentObject["chipWavePlayBackwards"] = this.chipWavePlayBackwards;
			instrumentObject["chipWaveStartOffset"] = this.chipWaveStartOffset;
			// advloop addition
		} else if (this.type === InstrumentType.pwm) {
			instrumentObject["pulseWidth"] = this.pulseWidth;
			instrumentObject["decimalOffset"] = this.decimalOffset;
			instrumentObject["unison"] = this.unison === Config.unisons.length ? "custom" : Config.unisons[this.unison].name;
			if (this.unison === Config.unisons.length) {
				instrumentObject["unisonVoices"] = this.unisonVoices;
				instrumentObject["unisonSpread"] = this.unisonSpread;
				instrumentObject["unisonOffset"] = this.unisonOffset;
				instrumentObject["unisonExpression"] = this.unisonExpression;
				instrumentObject["unisonSign"] = this.unisonSign;
			}
		} else if (this.type === InstrumentType.supersaw) {
			instrumentObject["pulseWidth"] = this.pulseWidth;
			instrumentObject["decimalOffset"] = this.decimalOffset;
			instrumentObject["dynamism"] = Math.round((100 * this.supersawDynamism) / Config.supersawDynamismMax);
			instrumentObject["spread"] = Math.round((100 * this.supersawSpread) / Config.supersawSpreadMax);
			instrumentObject["shape"] = Math.round((100 * this.supersawShape) / Config.supersawShapeMax);
			if (this.unison === Config.unisons.length) {
				instrumentObject["unisonVoices"] = this.unisonVoices;
				instrumentObject["unisonSpread"] = this.unisonSpread;
				instrumentObject["unisonOffset"] = this.unisonOffset;
				instrumentObject["unisonExpression"] = this.unisonExpression;
				instrumentObject["unisonSign"] = this.unisonSign;
			}
		} else if (this.type === InstrumentType.pickedString) {
			instrumentObject["unison"] = this.unison === Config.unisons.length ? "custom" : Config.unisons[this.unison].name;
			if (this.unison === Config.unisons.length) {
				instrumentObject["unisonVoices"] = this.unisonVoices;
				instrumentObject["unisonSpread"] = this.unisonSpread;
				instrumentObject["unisonOffset"] = this.unisonOffset;
				instrumentObject["unisonExpression"] = this.unisonExpression;
				instrumentObject["unisonSign"] = this.unisonSign;
			}
			instrumentObject["stringSustain"] = Math.round((100 * this.stringSustain) / (Config.stringSustainRange - 1));
			if (Config.enableAcousticSustain) {
				instrumentObject["stringSustainType"] = Config.sustainTypeNames[this.stringSustainType];
			}
		} else if (this.type === InstrumentType.harmonics) {
			instrumentObject["unison"] = this.unison === Config.unisons.length ? "custom" : Config.unisons[this.unison].name;
			if (this.unison === Config.unisons.length) {
				instrumentObject["unisonVoices"] = this.unisonVoices;
				instrumentObject["unisonSpread"] = this.unisonSpread;
				instrumentObject["unisonOffset"] = this.unisonOffset;
				instrumentObject["unisonExpression"] = this.unisonExpression;
				instrumentObject["unisonSign"] = this.unisonSign;
			}
		} else if (this.type === InstrumentType.fm || this.type === InstrumentType.fm6op) {
			const operatorArray: object[] = [];
			for (const operator of this.operators) {
				operatorArray.push({
					frequency: Config.operatorFrequencies[operator.frequency].name,
					amplitude: operator.amplitude,
					waveform: Config.operatorWaves[operator.waveform].name,
					pulseWidth: operator.pulseWidth,
				});
			}
			if (this.type === InstrumentType.fm) {
				instrumentObject["algorithm"] = Config.algorithms[this.algorithm].name;
				instrumentObject["feedbackType"] = Config.feedbacks[this.feedbackType].name;
				instrumentObject["feedbackAmplitude"] = this.feedbackAmplitude;
				instrumentObject["operators"] = operatorArray;
			} else {
				instrumentObject["algorithm"] = Config.algorithms6Op[this.algorithm6Op].name;
				instrumentObject["feedbackType"] = Config.feedbacks6Op[this.feedbackType6Op].name;
				instrumentObject["feedbackAmplitude"] = this.feedbackAmplitude;
				if (this.algorithm6Op === 0) {
					const customAlgorithm: any = {};
					customAlgorithm["mods"] = this.customAlgorithm.modulatedBy;
					customAlgorithm["carrierCount"] = this.customAlgorithm.carrierCount;
					instrumentObject["customAlgorithm"] = customAlgorithm;
				}
				if (this.feedbackType6Op === 0) {
					const customFeedback: any = {};
					customFeedback["mods"] = this.customFeedbackType.indices;
					instrumentObject["customFeedback"] = customFeedback;
				}

				instrumentObject["operators"] = operatorArray;
			}
		} else if (this.type === InstrumentType.customChipWave) {
			instrumentObject["wave"] = Config.chipWaves[this.chipWave].name;
			instrumentObject["unison"] = this.unison === Config.unisons.length ? "custom" : Config.unisons[this.unison].name;
			if (this.unison === Config.unisons.length) {
				instrumentObject["unisonVoices"] = this.unisonVoices;
				instrumentObject["unisonSpread"] = this.unisonSpread;
				instrumentObject["unisonOffset"] = this.unisonOffset;
				instrumentObject["unisonExpression"] = this.unisonExpression;
				instrumentObject["unisonSign"] = this.unisonSign;
			}
			instrumentObject["customChipWave"] = new Float64Array(64);
			instrumentObject["customChipWaveIntegral"] = new Float64Array(65);
			for (let i: number = 0; i < this.customChipWave.length; i++) {
				instrumentObject["customChipWave"][i] = this.customChipWave[i];
				// Meh, waste of space and can be inaccurate. It will be recalc'ed when instrument loads.
				// instrumentObject["customChipWaveIntegral"][i] = this.customChipWaveIntegral[i];
			}
		} else if (this.type === InstrumentType.mod) {
			instrumentObject["modChannels"] = [];
			instrumentObject["modInstruments"] = [];
			instrumentObject["modSettings"] = [];
			instrumentObject["modFilterTypes"] = [];
			instrumentObject["modEnvelopeNumbers"] = [];
			for (let mod: number = 0; mod < Config.modCount; mod++) {
				instrumentObject["modChannels"][mod] = this.modChannels[mod];
				instrumentObject["modInstruments"][mod] = this.modInstruments[mod];
				instrumentObject["modSettings"][mod] = this.modulators[mod];
				instrumentObject["modFilterTypes"][mod] = this.modFilterTypes[mod];
				instrumentObject["modEnvelopeNumbers"][mod] = this.modEnvelopeNumbers[mod];
			}
		} else {
			// Plugin types — serialize via plugin hook
		}

		const plugin = getPlugin(this.type);
		if (plugin?.serialize) {
			plugin.serialize(this, instrumentObject);
		}

		const envelopes: any[] = [];
		for (let i = 0; i < this.envelopeCount; i++) {
			envelopes.push(this.envelopes[i].toJsonObject());
		}
		instrumentObject["envelopes"] = envelopes;

		return instrumentObject;
	}

	public fromJsonObject(
		instrumentObject: any,
		isNoiseChannel: boolean,
		isModChannel: boolean,
		useSlowerRhythm: boolean,
		useFastTwoNoteArp: boolean,
		legacyGlobalReverb: number = 0,
		jsonFormat: string = Config.jsonFormat,
	): void {
		if (instrumentObject === undefined) instrumentObject = {};

		const format: string = jsonFormat.toLowerCase();

		let type: InstrumentType = Config.instrumentTypeNames.indexOf(instrumentObject["type"]);
		// SynthBox support
		if (format === "synthbox" && instrumentObject["type"] === "FM") {
			type = Config.instrumentTypeNames.indexOf("FM6op");
		}
		if (<any>type === -1) {
			type = isModChannel ? InstrumentType.mod : isNoiseChannel ? InstrumentType.noise : InstrumentType.chip;
		}
		this.setTypeAndReset(type, isNoiseChannel, isModChannel);

		this.effects &= ~(1 << EffectType.panning);

		if (instrumentObject["preset"] !== undefined) {
			this.preset = instrumentObject["preset"] >>> 0;
		}

		if (instrumentObject["volume"] !== undefined) {
			if (
				format === "jummbox" ||
				format === "midbox" ||
				format === "synthbox" ||
				format === "goldbox" ||
				format === "paandorasbox" ||
				format === "ultrabox" ||
				format === "slarmoosbox" ||
				format === "jukebox"
			) {
				this.volume = clamp(-Config.volumeRange / 2, Config.volumeRange / 2 + 1, instrumentObject["volume"] | 0);
			} else {
				this.volume = Math.round((-clamp(0, 8, Math.round(5 - (instrumentObject["volume"] | 0) / 20)) * 25.0) / 7.0);
			}
		} else {
			this.volume = 0;
		}

		// These can probably be condensed with ternary operators
		this.envelopeSpeed =
			instrumentObject["envelopeSpeed"] !== undefined
				? clamp(0, Config.modulators.dictionary["envelope speed"].maxRawVol + 1, instrumentObject["envelopeSpeed"] | 0)
				: 12;

		if (Array.isArray(instrumentObject["effects"])) {
			let effects: number = 0;
			for (let i: number = 0; i < instrumentObject["effects"].length; i++) {
				effects = effects | (1 << Config.effectNames.indexOf(instrumentObject["effects"][i]));
			}
			this.effects = effects & ((1 << EffectType.length) - 1);
		} else {
			// The index of these names is reinterpreted as a bitfield, which relies on reverb and chorus being the first effects!
			const legacyEffectsNames: string[] = ["none", "reverb", "chorus", "chorus & reverb"];
			this.effects = legacyEffectsNames.indexOf(instrumentObject["effects"]);
			if (this.effects === -1) this.effects = this.type === InstrumentType.noise ? 0 : 1;
		}

		this.transition = Config.transitions.dictionary["normal"].index; // default value.
		const transitionProperty: any = instrumentObject["transition"] || instrumentObject["envelope"]; // the transition property used to be called envelope, so check that too.
		if (transitionProperty !== undefined) {
			let transition: Transition | undefined = Config.transitions.dictionary[transitionProperty];
			if (instrumentObject["fadeInSeconds"] === undefined || instrumentObject["fadeOutTicks"] === undefined) {
				const legacySettings = (<any>{
					binary: { transition: "interrupt", fadeInSeconds: 0.0, fadeOutTicks: -1 },
					seamless: { transition: "interrupt", fadeInSeconds: 0.0, fadeOutTicks: -1 },
					sudden: { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: -3 },
					hard: { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: -3 },
					smooth: { transition: "normal", fadeInSeconds: 0.025, fadeOutTicks: -3 },
					soft: { transition: "normal", fadeInSeconds: 0.025, fadeOutTicks: -3 },
					// Note that the old slide transition has the same name as a new slide transition that is different.
					// Only apply legacy settings if the instrument JSON was created before, based on the presence
					// of the fade in/out fields.
					slide: { transition: "slide in pattern", fadeInSeconds: 0.025, fadeOutTicks: -3 },
					"cross fade": { transition: "normal", fadeInSeconds: 0.04, fadeOutTicks: 6 },
					"hard fade": { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: 48 },
					"medium fade": { transition: "normal", fadeInSeconds: 0.0125, fadeOutTicks: 72 },
					"soft fade": { transition: "normal", fadeInSeconds: 0.06, fadeOutTicks: 96 },
				})[transitionProperty];
				if (legacySettings !== undefined) {
					transition = Config.transitions.dictionary[legacySettings.transition];
					// These may be overridden below.
					this.fadeIn = secondsToFadeInSetting(legacySettings.fadeInSeconds);
					this.fadeOut = ticksToFadeOutSetting(legacySettings.fadeOutTicks);
				}
			}
			if (transition !== undefined) this.transition = transition.index;

			if (this.transition !== Config.transitions.dictionary["normal"].index) {
				// Enable transition if it was used.
				this.effects = this.effects | (1 << EffectType.transition);
			}
		}

		// Overrides legacy settings in transition above.
		if (instrumentObject["fadeInSeconds"] !== undefined) {
			this.fadeIn = secondsToFadeInSetting(+instrumentObject["fadeInSeconds"]);
		}
		if (instrumentObject["fadeOutTicks"] !== undefined) {
			this.fadeOut = ticksToFadeOutSetting(+instrumentObject["fadeOutTicks"]);
		}

		{
			// Note that the chord setting may be overridden by instrumentObject["chorus"] below.
			const chordProperty: any = instrumentObject["chord"];
			const legacyChordNames: Dictionary<string> = { harmony: "simultaneous" };
			const chord: Chord | undefined = Config.chords.dictionary[legacyChordNames[chordProperty]] || Config.chords.dictionary[chordProperty];
			if (chord !== undefined) {
				this.chord = chord.index;
			}
			// Chord already set by plugin initialize in setTypeAndReset.
			// Only override if JSON explicitly specifies a chord value.
		}

		this.unison = Config.unisons.dictionary["none"].index; // default value.
		const unisonProperty: any = instrumentObject["unison"] || instrumentObject["interval"] || instrumentObject["chorus"]; // The unison property has gone by various names in the past.
		if (unisonProperty !== undefined) {
			const legacyChorusNames: Dictionary<string> = {
				union: "none",
				fifths: "fifth",
				octaves: "octave",
				error: "voiced",
			};
			const unison: Unison | undefined = Config.unisons.dictionary[legacyChorusNames[unisonProperty]] || Config.unisons.dictionary[unisonProperty];
			if (unison !== undefined) this.unison = unison.index;
			if (unisonProperty === "custom") this.unison = Config.unisons.length;
		}
		// clamp these???
		this.unisonVoices = instrumentObject["unisonVoices"] === undefined ? Config.unisons[this.unison].voices : instrumentObject["unisonVoices"];
		this.unisonSpread = instrumentObject["unisonSpread"] === undefined ? Config.unisons[this.unison].spread : instrumentObject["unisonSpread"];
		this.unisonOffset = instrumentObject["unisonOffset"] === undefined ? Config.unisons[this.unison].offset : instrumentObject["unisonOffset"];
		this.unisonExpression =
			instrumentObject["unisonExpression"] === undefined ? Config.unisons[this.unison].expression : instrumentObject["unisonExpression"];
		this.unisonSign = instrumentObject["unisonSign"] === undefined ? Config.unisons[this.unison].sign : instrumentObject["unisonSign"];

		if (instrumentObject["chorus"] === "custom harmony") {
			// The original chorus setting had an option that now maps to two different settings. Override those if necessary.
			this.unison = Config.unisons.dictionary["hum"].index;
			this.chord = Config.chords.dictionary["custom interval"].index;
		}
		if (this.chord !== Config.chords.dictionary["simultaneous"].index && !Array.isArray(instrumentObject["effects"])) {
			// Enable chord if it was used.
			this.effects = this.effects | (1 << EffectType.chord);
		}

		if (instrumentObject["pitchShiftSemitones"] !== undefined) {
			this.pitchShift = clamp(0, Config.pitchShiftRange, Math.round(+instrumentObject["pitchShiftSemitones"]));
		}
		// modbox pitch shift, known in that mod as "octave offset"
		if (instrumentObject["octoff"] !== undefined) {
			const potentialPitchShift: string = instrumentObject["octoff"];
			this.effects = this.effects | (1 << EffectType.pitchShift);

			if (potentialPitchShift === "+1 (octave)" || potentialPitchShift === "+2 (2 octaves)") {
				this.pitchShift = 24;
			} else if (potentialPitchShift === "+1/2 (fifth)" || potentialPitchShift === "+1 1/2 (octave and fifth)") {
				this.pitchShift = 18;
			} else if (potentialPitchShift === "-1 (octave)" || potentialPitchShift === "-2 (2 octaves") {
				// this typo is in modbox
				this.pitchShift = 0;
			} else if (potentialPitchShift === "-1/2 (fifth)" || potentialPitchShift === "-1 1/2 (octave and fifth)") {
				this.pitchShift = 6;
			} else {
				this.pitchShift = 12;
			}
		}
		if (instrumentObject["detuneCents"] !== undefined) {
			this.detune = clamp(Config.detuneMin, Config.detuneMax + 1, Math.round(centsToDetune(+instrumentObject["detuneCents"])));
		}

		this.vibrato = Config.vibratos.dictionary["none"].index; // default value.
		const vibratoProperty: any = instrumentObject["vibrato"] || instrumentObject["effect"]; // The vibrato property was previously called "effect", not to be confused with the current "effects".
		if (vibratoProperty !== undefined) {
			const legacyVibratoNames: Dictionary<string> = {
				"vibrato light": "light",
				"vibrato delayed": "delayed",
				"vibrato heavy": "heavy",
			};
			const vibrato: Vibrato | undefined = Config.vibratos.dictionary[legacyVibratoNames[unisonProperty]] || Config.vibratos.dictionary[vibratoProperty];
			if (vibrato !== undefined) {
				this.vibrato = vibrato.index;
			} else if (vibratoProperty === "custom") {
				this.vibrato = Config.vibratos.length; // custom
			}

			if (this.vibrato === Config.vibratos.length) {
				this.vibratoDepth = instrumentObject["vibratoDepth"];
				this.vibratoSpeed = instrumentObject["vibratoSpeed"];
				this.vibratoDelay = instrumentObject["vibratoDelay"];
				this.vibratoType = instrumentObject["vibratoType"];
			} else {
				// Set defaults for the vibrato profile
				this.vibratoDepth = Config.vibratos[this.vibrato].amplitude;
				this.vibratoDelay = Config.vibratos[this.vibrato].delayTicks / 2;
				this.vibratoSpeed = 10; // default;
				this.vibratoType = Config.vibratos[this.vibrato].type;
			}

			// Old songs may have a vibrato effect without explicitly enabling it.
			if (vibrato !== Config.vibratos.dictionary["none"]) {
				this.effects = this.effects | (1 << EffectType.vibrato);
			}
		}

		if (instrumentObject["pan"] !== undefined) {
			this.pan = clamp(0, Config.panMax + 1, Math.round(Config.panCenter + ((instrumentObject["pan"] | 0) * Config.panCenter) / 100));
		} else if (instrumentObject["ipan"] !== undefined) {
			// support for modbox fixed
			this.pan = clamp(0, Config.panMax + 1, Config.panCenter + instrumentObject["ipan"] * -50);
		} else {
			this.pan = Config.panCenter;
		}

		// Old songs may have a panning effect without explicitly enabling it.
		if (this.pan !== Config.panCenter) {
			this.effects = this.effects | (1 << EffectType.panning);
		}

		if (instrumentObject["panDelay"] !== undefined) {
			this.panDelay = instrumentObject["panDelay"] | 0;
		} else {
			this.panDelay = 0;
		}

		if (instrumentObject["detune"] !== undefined) {
			this.detune = clamp(Config.detuneMin, Config.detuneMax + 1, instrumentObject["detune"] | 0);
		} else if (instrumentObject["detuneCents"] === undefined) {
			this.detune = Config.detuneCenter;
		}

		if (instrumentObject["ringMod"] !== undefined) {
			this.ringModulation = clamp(0, Config.ringModRange, Math.round(((Config.ringModRange - 1) * (instrumentObject["ringMod"] | 0)) / 100));
		}
		if (instrumentObject["ringModHz"] !== undefined) {
			this.ringModulationHz = clamp(0, Config.ringModHzRange, Math.round(((Config.ringModHzRange - 1) * (instrumentObject["ringModHz"] | 0)) / 100));
		}
		if (instrumentObject["ringModWaveformIndex"] !== undefined) {
			this.ringModWaveformIndex = clamp(0, Config.operatorWaves.length, instrumentObject["ringModWaveformIndex"]);
		}
		if (instrumentObject["ringModPulseWidth"] !== undefined) {
			this.ringModPulseWidth = clamp(
				0,
				Config.pulseWidthRange,
				Math.round(((Config.pulseWidthRange - 1) * (instrumentObject["ringModPulseWidth"] | 0)) / 100),
			);
		}
		if (instrumentObject["ringModHzOffset"] !== undefined) {
			this.ringModHzOffset = clamp(0, Config.rmHzOffsetMax, Math.round(((Config.rmHzOffsetMax - 1) * (instrumentObject["ringModHzOffset"] | 0)) / 100));
		}

		if (instrumentObject["granular"] !== undefined) {
			this.granular = instrumentObject["granular"];
		}
		if (instrumentObject["grainSize"] !== undefined) {
			this.grainSize = instrumentObject["grainSize"];
		}
		if (instrumentObject["grainAmounts"] !== undefined) {
			this.grainAmounts = instrumentObject["grainAmounts"];
		}
		if (instrumentObject["grainRange"] !== undefined) {
			this.grainRange = clamp(0, Config.grainRangeMax / Config.grainSizeStep + 1, instrumentObject["grainRange"]);
		}

		if (instrumentObject["phaserMix"] !== undefined) {
			this.phaserMix = clamp(0, Config.phaserMixRange, Math.round(((Config.phaserMixRange - 1) * (instrumentObject["phaserMix"] | 0)) / 100));
		}
		if (instrumentObject["phaserFreq"] !== undefined) {
			this.phaserFreq = clamp(0, Config.phaserFreqRange, Math.round(((Config.phaserFreqRange - 1) * (instrumentObject["phaserFreq"] | 0)) / 100));
		}
		if (instrumentObject["phaserFeedback"] !== undefined) {
			this.phaserFeedback = clamp(
				0,
				Config.phaserFeedbackRange,
				Math.round(((Config.phaserFeedbackRange - 1) * (instrumentObject["phaserFeedback"] | 0)) / 100),
			);
		}
		if (instrumentObject["phaserStages"] !== undefined) {
			this.phaserStages = clamp(0, Config.phaserMaxStages, Math.round(((Config.phaserMaxStages - 1) * (instrumentObject["phaserStages"] | 0)) / 100));
		}

		if (instrumentObject["distortion"] !== undefined) {
			this.distortion = clamp(0, Config.distortionRange, Math.round(((Config.distortionRange - 1) * (instrumentObject["distortion"] | 0)) / 100));
		}

		if (instrumentObject["bitcrusherOctave"] !== undefined) {
			this.bitcrusherFreq = Config.bitcrusherFreqRange - 1 - +instrumentObject["bitcrusherOctave"] / Config.bitcrusherOctaveStep;
		}
		if (instrumentObject["bitcrusherQuantization"] !== undefined) {
			this.bitcrusherQuantization = clamp(
				0,
				Config.bitcrusherQuantizationRange,
				Math.round(((Config.bitcrusherQuantizationRange - 1) * (instrumentObject["bitcrusherQuantization"] | 0)) / 100),
			);
		}

		if (instrumentObject["echoSustain"] !== undefined) {
			this.echoSustain = clamp(0, Config.echoSustainRange, Math.round(((Config.echoSustainRange - 1) * (instrumentObject["echoSustain"] | 0)) / 100));
		}
		if (instrumentObject["echoDelayBeats"] !== undefined) {
			this.echoDelay = clamp(
				0,
				Config.echoDelayRange,
				Math.round((+instrumentObject["echoDelayBeats"] * (Config.ticksPerPart * Config.partsPerBeat)) / Config.echoDelayStepTicks - 1.0),
			);
		}

		if (!isNaN(instrumentObject["chorus"])) {
			this.chorus = clamp(0, Config.chorusRange, Math.round(((Config.chorusRange - 1) * (instrumentObject["chorus"] | 0)) / 100));
		}

		if (instrumentObject["reverb"] !== undefined) {
			this.reverb = clamp(0, Config.reverbRange, Math.round(((Config.reverbRange - 1) * (instrumentObject["reverb"] | 0)) / 100));
		} else {
			this.reverb = legacyGlobalReverb;
		}

		if (instrumentObject["invertWave"] !== undefined) {
			this.invertWave = instrumentObject["invertWave"];
		}

		if (instrumentObject["upperNoteLimit"] !== undefined) {
			this.upperNoteLimit = instrumentObject["upperNoteLimit"];
		}
		if (instrumentObject["lowerNoteLimit"] !== undefined) {
			this.lowerNoteLimit = instrumentObject["lowerNoteLimit"];
		}

		if (instrumentObject["pulseWidth"] !== undefined) {
			this.pulseWidth = clamp(1, Config.pulseWidthRange + 1, Math.round(instrumentObject["pulseWidth"]));
		} else {
			this.pulseWidth = Config.pulseWidthRange;
		}

		if (instrumentObject["decimalOffset"] !== undefined) {
			this.decimalOffset = clamp(0, 99 + 1, Math.round(instrumentObject["decimalOffset"]));
		} else {
			this.decimalOffset = 0;
		}

		if (instrumentObject["dynamism"] !== undefined) {
			this.supersawDynamism = clamp(
				0,
				Config.supersawDynamismMax + 1,
				Math.round((Config.supersawDynamismMax * (instrumentObject["dynamism"] | 0)) / 100),
			);
		} else {
			this.supersawDynamism = Config.supersawDynamismMax;
		}
		if (instrumentObject["spread"] !== undefined) {
			this.supersawSpread = clamp(0, Config.supersawSpreadMax + 1, Math.round((Config.supersawSpreadMax * (instrumentObject["spread"] | 0)) / 100));
		} else {
			this.supersawSpread = Math.ceil(Config.supersawSpreadMax / 2.0);
		}
		if (instrumentObject["shape"] !== undefined) {
			this.supersawShape = clamp(0, Config.supersawShapeMax + 1, Math.round((Config.supersawShapeMax * (instrumentObject["shape"] | 0)) / 100));
		} else {
			this.supersawShape = 0;
		}

		if (instrumentObject["harmonics"] !== undefined) {
			for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
				this.harmonicsWave.harmonics[i] = Math.max(
					0,
					Math.min(Config.harmonicsMax, Math.round((Config.harmonicsMax * +instrumentObject["harmonics"][i]) / 100)),
				);
			}
			this.harmonicsWave.markCustomWaveDirty();
		} else {
			this.harmonicsWave.reset();
		}

		if (instrumentObject["spectrum"] !== undefined) {
			for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
				this.spectrumWave.spectrum[i] = Math.max(
					0,
					Math.min(Config.spectrumMax, Math.round((Config.spectrumMax * +instrumentObject["spectrum"][i]) / 100)),
				);
				this.spectrumWave.markCustomWaveDirty();
			}
		} else {
			this.spectrumWave.reset(isNoiseChannel);
		}

		if (instrumentObject["stringSustain"] !== undefined) {
			this.stringSustain = clamp(
				0,
				Config.stringSustainRange,
				Math.round(((Config.stringSustainRange - 1) * (instrumentObject["stringSustain"] | 0)) / 100),
			);
		} else {
			this.stringSustain = 10;
		}
		this.stringSustainType = Config.enableAcousticSustain ? Config.sustainTypeNames.indexOf(instrumentObject["stringSustainType"]) : SustainType.bright;
		if (<any>this.stringSustainType === -1) this.stringSustainType = SustainType.bright;

		if (this.type === InstrumentType.noise) {
			this.chipNoise = Config.chipNoises.findIndex((wave) => wave.name === instrumentObject["wave"]);
			if (instrumentObject["wave"] === "pink noise") {
				this.chipNoise = Config.chipNoises.findIndex((wave) => wave.name === "pink");
			}
			if (instrumentObject["wave"] === "brownian noise") {
				this.chipNoise = Config.chipNoises.findIndex((wave) => wave.name === "brownian");
			}
			if (this.chipNoise === -1) this.chipNoise = 1;
		}

		const legacyEnvelopeNames: Dictionary<string> = {
			custom: "note size",
			steady: "none",
			"pluck 1": "twang 1",
			"pluck 2": "twang 2",
			"pluck 3": "twang 3",
		};
		const getEnvelope = (name: any): Envelope | undefined => {
			if (legacyEnvelopeNames[name] !== undefined) return Config.envelopes.dictionary[legacyEnvelopeNames[name]];
			else {
				return Config.envelopes.dictionary[name];
			}
		};

		if (this.type === InstrumentType.drumset) {
			if (instrumentObject["drums"] !== undefined) {
				for (let j: number = 0; j < Config.drumCount; j++) {
					const drum: any = instrumentObject["drums"][j];
					if (drum === undefined) continue;

					this.drumsetEnvelopes[j] = Config.envelopes.dictionary["twang 2"].index; // default value.
					if (drum["filterEnvelope"] !== undefined) {
						const envelope: Envelope | undefined = getEnvelope(drum["filterEnvelope"]);
						if (envelope !== undefined) this.drumsetEnvelopes[j] = envelope.index;
					}
					if (drum["spectrum"] !== undefined) {
						for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
							this.drumsetSpectrumWaves[j].spectrum[i] = Math.max(
								0,
								Math.min(Config.spectrumMax, Math.round((Config.spectrumMax * +drum["spectrum"][i]) / 100)),
							);
						}
					}
					this.drumsetSpectrumWaves[j].markCustomWaveDirty();
				}
			}
		}

		if (this.type === InstrumentType.chip) {
			const legacyWaveNames: Dictionary<number> = {
				triangle: 1,
				square: 2,
				"pulse wide": 3,
				"pulse narrow": 4,
				sawtooth: 5,
				"double saw": 6,
				"double pulse": 7,
				spiky: 8,
				plateau: 0,
			};
			const modboxWaveNames: Dictionary<number> = {
				"10% pulse": 22,
				"sunsoft bass": 23,
				"loud pulse": 24,
				sax: 25,
				guitar: 26,
				"atari bass": 28,
				"atari pulse": 29,
				"1% pulse": 30,
				"curved sawtooth": 31,
				viola: 32,
				brass: 33,
				"acoustic bass": 34,
				lyre: 35,
				"ramp pulse": 36,
				piccolo: 37,
				squaretooth: 38,
				flatline: 39,
				"pnryshk a (u5)": 40,
				"pnryshk b (riff)": 41,
			};
			const sandboxWaveNames: Dictionary<number> = {
				"shrill lute": 42,
				"shrill bass": 44,
				"nes pulse": 45,
				"saw bass": 46,
				euphonium: 47,
				"shrill pulse": 48,
				"r-sawtooth": 49,
				recorder: 50,
				"narrow saw": 51,
				"deep square": 52,
				"ring pulse": 53,
				"double sine": 54,
				contrabass: 55,
				"double bass": 56,
			};
			const zefboxWaveNames: Dictionary<number> = {
				"semi-square": 63,
				"deep square": 64,
				squaretal: 40,
				"saw wide": 65,
				"saw narrow ": 66,
				"deep sawtooth": 67,
				sawtal: 68,
				pulse: 69,
				"triple pulse": 70,
				"high pulse": 71,
				"deep pulse": 72,
			};
			const miscWaveNames: Dictionary<number> = {
				test1: 56,
				"pokey 4bit lfsr": 57,
				"pokey 5step bass": 58,
				"isolated spiky": 59,
				"unnamed 1": 60,
				"unnamed 2": 61,
				"guitar string": 75,
				intense: 76,
				"buzz wave": 77,
				"pokey square": 57,
				"pokey bass": 58,
				"banana wave": 83,
				"test 1": 84,
				"test 2": 84,
				"real snare": 85,
				"earthbound o. guitar": 86,
			};
			const paandorasboxWaveNames: Dictionary<number> = {
				kick: 87,
				snare: 88,
				piano1: 89,
				WOW: 90,
				overdrive: 91,
				trumpet: 92,
				saxophone: 93,
				orchestrahit: 94,
				"detached violin": 95,
				synth: 96,
				sonic3snare: 97,
				"come on": 98,
				choir: 99,
				overdriveguitar: 100,
				flute: 101,
				"legato violin": 102,
				"tremolo violin": 103,
				"amen break": 104,
				"pizzicato violin": 105,
				"tim allen grunt": 106,
				tuba: 107,
				loopingcymbal: 108,
				standardkick: 109,
				standardsnare: 110,
				closedhihat: 111,
				foothihat: 112,
				openhihat: 113,
				crashcymbal: 114,
				pianoC4: 115,
				"liver pad": 116,
				marimba: 117,
				susdotwav: 118,
				wackyboxtts: 119,
			};
			// const paandorasbetaWaveNames = {"contrabass": 55, "double bass": 56 };
			// this.chipWave = legacyWaveNames[instrumentObject["wave"]] != undefined ? legacyWaveNames[instrumentObject["wave"]] : Config.chipWaves.findIndex(wave => wave.name == instrumentObject["wave"]);
			this.chipWave = -1;
			const rawName: string = instrumentObject["wave"];
			for (const table of [legacyWaveNames, modboxWaveNames, sandboxWaveNames, zefboxWaveNames, miscWaveNames, paandorasboxWaveNames]) {
				if (this.chipWave === -1 && table[rawName] !== undefined && Config.chipWaves[table[rawName]] !== undefined) {
					this.chipWave = table[rawName];
					break;
				}
			}
			if (this.chipWave === -1) {
				const potentialChipWaveIndex: number = Config.chipWaves.findIndex((wave) => wave.name === rawName);
				if (potentialChipWaveIndex !== -1) this.chipWave = potentialChipWaveIndex;
			}
			// this.chipWave = legacyWaveNames[instrumentObject["wave"]] != undefined ? legacyWaveNames[instrumentObject["wave"]] : modboxWaveNames[instrumentObject["wave"]] != undefined ? modboxWaveNames[instrumentObject["wave"]] : sandboxWaveNames[instrumentObject["wave"]] != undefined ? sandboxWaveNames[instrumentObject["wave"]] : zefboxWaveNames[instrumentObject["wave"]] != undefined ? zefboxWaveNames[instrumentObject["wave"]] : miscWaveNames[instrumentObject["wave"]] != undefined ? miscWaveNames[instrumentObject["wave"]] : paandorasboxWaveNames[instrumentObject["wave"]] != undefined ? paandorasboxWaveNames[instrumentObject["wave"]] : Config.chipWaves.findIndex(wave => wave.name == instrumentObject["wave"]);
			if (this.chipWave === -1) this.chipWave = 1;
		}

		if (this.type === InstrumentType.fm || this.type === InstrumentType.fm6op) {
			if (this.type === InstrumentType.fm) {
				this.algorithm = Config.algorithms.findIndex((algorithm) => algorithm.name === instrumentObject["algorithm"]);
				if (this.algorithm === -1) this.algorithm = 0;
				this.feedbackType = Config.feedbacks.findIndex((feedback) => feedback.name === instrumentObject["feedbackType"]);
				if (this.feedbackType === -1) this.feedbackType = 0;
			} else {
				this.algorithm6Op = Config.algorithms6Op.findIndex((algorithm6Op) => algorithm6Op.name === instrumentObject["algorithm"]);
				if (this.algorithm6Op === -1) this.algorithm6Op = 1;
				if (this.algorithm6Op === 0) {
					this.customAlgorithm.set(instrumentObject["customAlgorithm"]["carrierCount"], instrumentObject["customAlgorithm"]["mods"]);
				} else {
					this.customAlgorithm.fromPreset(this.algorithm6Op);
				}
				this.feedbackType6Op = Config.feedbacks6Op.findIndex((feedback6Op) => feedback6Op.name === instrumentObject["feedbackType"]);
				// SynthBox feedback support
				if (this.feedbackType6Op === -1) {
					// These are all of the SynthBox feedback presets that aren't present in Gold/UltraBox
					const synthboxLegacyFeedbacks: DictionaryArray<any> = toNameMap([
						{ name: "2⟲ 3⟲", indices: [[], [2], [3], [], [], []] },
						{ name: "3⟲ 4⟲", indices: [[], [], [3], [4], [], []] },
						{ name: "4⟲ 5⟲", indices: [[], [], [], [4], [5], []] },
						{ name: "5⟲ 6⟲", indices: [[], [], [], [], [5], [6]] },
						{ name: "1⟲ 6⟲", indices: [[1], [], [], [], [], [6]] },
						{ name: "1⟲ 3⟲", indices: [[1], [], [3], [], [], []] },
						{ name: "1⟲ 4⟲", indices: [[1], [], [], [4], [], []] },
						{ name: "1⟲ 5⟲", indices: [[1], [], [], [], [5], []] },
						{ name: "4⟲ 6⟲", indices: [[], [], [], [4], [], [6]] },
						{ name: "2⟲ 6⟲", indices: [[], [2], [], [], [], [6]] },
						{ name: "3⟲ 6⟲", indices: [[], [], [3], [], [], [6]] },
						{ name: "4⟲ 5⟲ 6⟲", indices: [[], [], [], [4], [5], [6]] },
						{ name: "1⟲ 3⟲ 6⟲", indices: [[1], [], [3], [], [], [6]] },
						{ name: "2→5", indices: [[], [], [], [], [2], []] },
						{ name: "2→6", indices: [[], [], [], [], [], [2]] },
						{ name: "3→5", indices: [[], [], [], [], [3], []] },
						{ name: "3→6", indices: [[], [], [], [], [], [3]] },
						{ name: "4→6", indices: [[], [], [], [], [], [4]] },
						{ name: "5→6", indices: [[], [], [], [], [], [5]] },
						{ name: "1→3→4", indices: [[], [], [1], [], [3], []] },
						{ name: "2→5→6", indices: [[], [], [], [], [2], [5]] },
						{ name: "2→4→6", indices: [[], [], [], [2], [], [4]] },
						{ name: "4→5→6", indices: [[], [], [], [], [4], [5]] },
						{ name: "3→4→5→6", indices: [[], [], [], [3], [4], [5]] },
						{ name: "2→3→4→5→6", indices: [[], [1], [2], [3], [4], [5]] },
						{ name: "1→2→3→4→5→6", indices: [[], [1], [2], [3], [4], [5]] },
					]);

					const synthboxFeedbackType =
						synthboxLegacyFeedbacks[synthboxLegacyFeedbacks.findIndex((feedback) => feedback.name === instrumentObject["feedbackType"])]!.indices;

					if (synthboxFeedbackType !== undefined) {
						this.feedbackType6Op = 0;
						this.customFeedbackType.set(synthboxFeedbackType);
					} else {
						// if the feedback type STILL can't be resolved, default to the first non-custom option
						this.feedbackType6Op = 1;
					}
				}

				if (this.feedbackType6Op === 0 && instrumentObject["customFeedback"] !== undefined) {
					this.customFeedbackType.set(instrumentObject["customFeedback"]["mods"]);
				} else {
					this.customFeedbackType.fromPreset(this.feedbackType6Op);
				}
			}
			if (instrumentObject["feedbackAmplitude"] !== undefined) {
				this.feedbackAmplitude = clamp(0, Config.operatorAmplitudeMax + 1, instrumentObject["feedbackAmplitude"] | 0);
			} else {
				this.feedbackAmplitude = 0;
			}

			for (let j: number = 0; j < Config.operatorCount + (this.type === InstrumentType.fm6op ? 2 : 0); j++) {
				const operator: Operator = this.operators[j];
				let operatorObject: any = undefined;
				if (instrumentObject["operators"] !== undefined) operatorObject = instrumentObject["operators"][j];
				if (operatorObject === undefined) operatorObject = {};

				operator.frequency = Config.operatorFrequencies.findIndex((freq) => freq.name === operatorObject["frequency"]);
				if (operator.frequency === -1) operator.frequency = 0;
				if (operatorObject["amplitude"] !== undefined) {
					operator.amplitude = clamp(0, Config.operatorAmplitudeMax + 1, operatorObject["amplitude"] | 0);
				} else {
					operator.amplitude = 0;
				}
				if (operatorObject["waveform"] !== undefined) {
					// If the json is from GB, we override the last two waves to be sine to account for a bug
					if (format === "goldbox" && j > 3) {
						operator.waveform = 0;
						continue;
					}

					operator.waveform = Config.operatorWaves.findIndex((wave) => wave.name === operatorObject["waveform"]);
					if (operator.waveform === -1) {
						// GoldBox compatibility
						if (operatorObject["waveform"] === "square") {
							operator.waveform = Config.operatorWaves.dictionary["pulse width"].index;
							operator.pulseWidth = 5;
						} else if (operatorObject["waveform"] === "rounded") {
							operator.waveform = Config.operatorWaves.dictionary["quasi-sine"].index;
						} else {
							operator.waveform = 0;
						}
					}
				} else {
					operator.waveform = 0;
				}
				if (operatorObject["pulseWidth"] !== undefined) {
					operator.pulseWidth = operatorObject["pulseWidth"] | 0;
				} else {
					operator.pulseWidth = 5;
				}
			}
		} else if (this.type === InstrumentType.customChipWave) {
			if (instrumentObject["customChipWave"]) {
				for (let i: number = 0; i < 64; i++) {
					this.customChipWave[i] = instrumentObject["customChipWave"][i];
				}

				let sum: number = 0.0;
				for (let i: number = 0; i < this.customChipWave.length; i++) {
					sum += this.customChipWave[i];
				}
				const average: number = sum / this.customChipWave.length;

				// Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
				let cumulative: number = 0;
				let wavePrev: number = 0;
				for (let i: number = 0; i < this.customChipWave.length; i++) {
					cumulative += wavePrev;
					wavePrev = this.customChipWave[i] - average;
					this.customChipWaveIntegral[i] = cumulative;
				}

				// 65th, last sample is for anti-aliasing
				this.customChipWaveIntegral[64] = 0.0;
			}
		} else if (this.type === InstrumentType.mod) {
			if (instrumentObject["modChannels"] !== undefined) {
				for (let mod: number = 0; mod < Config.modCount; mod++) {
					this.modChannels[mod] = instrumentObject["modChannels"][mod];
					this.modInstruments[mod] = instrumentObject["modInstruments"][mod];
					this.modulators[mod] = instrumentObject["modSettings"][mod];
					// Due to an oversight, this isn't included in JSONs prior to JB 2.6.
					if (instrumentObject["modFilterTypes"] !== undefined) {
						this.modFilterTypes[mod] = instrumentObject["modFilterTypes"][mod];
					}
					if (instrumentObject["modEnvelopeNumbers"] !== undefined) {
						this.modEnvelopeNumbers[mod] = instrumentObject["modEnvelopeNumbers"][mod];
					}
				}
			}
		}

		if (this.type !== InstrumentType.mod) {
			// Arpeggio speed
			if (this.chord === Config.chords.dictionary["arpeggio"].index && instrumentObject["arpeggioSpeed"] !== undefined) {
				this.arpeggioSpeed = instrumentObject["arpeggioSpeed"];
			} else {
				this.arpeggioSpeed = useSlowerRhythm ? 9 : 12; // Decide whether to import arps as x3/4 speed
			}
			if (this.chord === Config.chords.dictionary["monophonic"].index && instrumentObject["monoChordTone"] !== undefined) {
				this.monoChordTone = instrumentObject["monoChordTone"];
			}

			if (instrumentObject["fastTwoNoteArp"] !== undefined) {
				this.fastTwoNoteArp = instrumentObject["fastTwoNoteArp"];
			} else {
				this.fastTwoNoteArp = useFastTwoNoteArp;
			}

			if (instrumentObject["clicklessTransition"] !== undefined) {
				this.clicklessTransition = instrumentObject["clicklessTransition"];
			} else {
				this.clicklessTransition = false;
			}

			if (instrumentObject["aliases"] !== undefined) {
				this.aliases = instrumentObject["aliases"];
			} else {
				// modbox had no anti-aliasing, so enable it for everything if that mode is selected
				if (format === "modbox") {
					this.effects = this.effects | (1 << EffectType.distortion);
					this.aliases = true;
					this.distortion = 0;
				} else {
					this.aliases = false;
				}
			}

			if (instrumentObject["noteFilterType"] !== undefined) {
				this.noteFilterType = instrumentObject["noteFilterType"];
			}
			if (instrumentObject["noteSimpleCut"] !== undefined) {
				this.noteFilterSimpleCut = instrumentObject["noteSimpleCut"];
			}
			if (instrumentObject["noteSimplePeak"] !== undefined) {
				this.noteFilterSimplePeak = instrumentObject["noteSimplePeak"];
			}
			if (instrumentObject["noteFilter"] !== undefined) {
				this.noteFilter.fromJsonObject(instrumentObject["noteFilter"]);
			} else {
				this.noteFilter.reset();
			}
			for (let i: number = 0; i < Config.filterMorphCount; i++) {
				if (Array.isArray(instrumentObject["noteSubFilters" + i])) {
					this.noteSubFilters[i] = new FilterSettings();
					this.noteSubFilters[i]!.fromJsonObject(instrumentObject["noteSubFilters" + i]);
				}
			}
			if (instrumentObject["eqFilterType"] !== undefined) {
				this.eqFilterType = instrumentObject["eqFilterType"];
			}
			if (instrumentObject["eqSimpleCut"] !== undefined) {
				this.eqFilterSimpleCut = instrumentObject["eqSimpleCut"];
			}
			if (instrumentObject["eqSimplePeak"] !== undefined) {
				this.eqFilterSimplePeak = instrumentObject["eqSimplePeak"];
			}
			if (Array.isArray(instrumentObject["eqFilter"])) {
				this.eqFilter.fromJsonObject(instrumentObject["eqFilter"]);
			} else {
				this.eqFilter.reset();

				const legacySettings: LegacySettings = {};

				// Try converting from legacy filter settings.
				const filterCutoffMaxHz: number = 8000;
				const filterCutoffRange: number = 11;
				const filterResonanceRange: number = 8;
				if (instrumentObject["filterCutoffHz"] !== undefined) {
					legacySettings.filterCutoff = clamp(
						0,
						filterCutoffRange,
						Math.round(filterCutoffRange - 1 + (2.0 * Math.log((instrumentObject["filterCutoffHz"] | 0) / filterCutoffMaxHz)) / Math.LN2),
					);
				} else {
					legacySettings.filterCutoff = this.type === InstrumentType.chip ? 6 : 10;
				}
				if (instrumentObject["filterResonance"] !== undefined) {
					legacySettings.filterResonance = clamp(
						0,
						filterResonanceRange,
						Math.round(((filterResonanceRange - 1) * (instrumentObject["filterResonance"] | 0)) / 100),
					);
				} else {
					legacySettings.filterResonance = 0;
				}

				legacySettings.filterEnvelope = getEnvelope(instrumentObject["filterEnvelope"]);
				legacySettings.pulseEnvelope = getEnvelope(instrumentObject["pulseEnvelope"]);
				legacySettings.feedbackEnvelope = getEnvelope(instrumentObject["feedbackEnvelope"]);
				if (Array.isArray(instrumentObject["operators"])) {
					legacySettings.operatorEnvelopes = [];
					for (let j: number = 0; j < Config.operatorCount + (this.type === InstrumentType.fm6op ? 2 : 0); j++) {
						let envelope: Envelope | undefined;
						if (instrumentObject["operators"][j] !== undefined) {
							envelope = getEnvelope(instrumentObject["operators"][j]["envelope"]);
						}
						legacySettings.operatorEnvelopes[j] = envelope !== undefined ? envelope : Config.envelopes.dictionary["none"];
					}
				}

				// Try converting from even older legacy filter settings.
				if (instrumentObject["filter"] !== undefined) {
					const legacyToCutoff: number[] = [10, 6, 3, 0, 8, 5, 2];
					const legacyToEnvelope: string[] = ["none", "none", "none", "none", "decay 1", "decay 2", "decay 3"];
					const filterNames: string[] = ["none", "bright", "medium", "soft", "decay bright", "decay medium", "decay soft"];
					const oldFilterNames: Dictionary<number> = {
						"sustain sharp": 1,
						"sustain medium": 2,
						"sustain soft": 3,
						"decay sharp": 4,
					};
					let legacyFilter: number =
						oldFilterNames[instrumentObject["filter"]] !== undefined
							? oldFilterNames[instrumentObject["filter"]]
							: filterNames.indexOf(instrumentObject["filter"]);
					if (legacyFilter === -1) legacyFilter = 0;
					legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
					legacySettings.filterEnvelope = getEnvelope(legacyToEnvelope[legacyFilter]);
					legacySettings.filterResonance = 0;
				}

				this.convertLegacySettings(legacySettings, true);
			}

			for (let i: number = 0; i < Config.filterMorphCount; i++) {
				if (Array.isArray(instrumentObject["eqSubFilters" + i])) {
					this.eqSubFilters[i] = new FilterSettings();
					this.eqSubFilters[i]!.fromJsonObject(instrumentObject["eqSubFilters" + i]);
				}
			}

			if (Array.isArray(instrumentObject["envelopes"])) {
				const envelopeArray: any[] = instrumentObject["envelopes"];
				for (let i = 0; i < envelopeArray.length; i++) {
					if (this.envelopeCount >= Config.maxEnvelopeCount) break;
					const tempEnvelope: EnvelopeSettings = new EnvelopeSettings(this.isNoiseInstrument);
					tempEnvelope.fromJsonObject(envelopeArray[i], format);
					// old pitch envelope detection
					let pitchEnvelopeStart: number;
					if (instrumentObject["pitchEnvelopeStart"] !== undefined && instrumentObject["pitchEnvelopeStart"] != null) {
						// make sure is not null bc for some reason it can be
						pitchEnvelopeStart = instrumentObject["pitchEnvelopeStart"];
					} else if (instrumentObject["pitchEnvelopeStart" + i] !== undefined && instrumentObject["pitchEnvelopeStart" + i] !== undefined) {
						pitchEnvelopeStart = instrumentObject["pitchEnvelopeStart" + i];
					} else {
						pitchEnvelopeStart = tempEnvelope.pitchEnvelopeStart;
					}
					let pitchEnvelopeEnd: number;
					if (instrumentObject["pitchEnvelopeEnd"] !== undefined && instrumentObject["pitchEnvelopeEnd"] != null) {
						pitchEnvelopeEnd = instrumentObject["pitchEnvelopeEnd"];
					} else if (instrumentObject["pitchEnvelopeEnd" + i] !== undefined && instrumentObject["pitchEnvelopeEnd" + i] != null) {
						pitchEnvelopeEnd = instrumentObject["pitchEnvelopeEnd" + i];
					} else {
						pitchEnvelopeEnd = tempEnvelope.pitchEnvelopeEnd;
					}
					let envelopeInverse: boolean;
					if (instrumentObject["envelopeInverse" + i] !== undefined && instrumentObject["envelopeInverse" + i] != null) {
						envelopeInverse = instrumentObject["envelopeInverse" + i];
					} else if (
						instrumentObject["pitchEnvelopeInverse"] !== undefined &&
						instrumentObject["pitchEnvelopeInverse"] != null &&
						Config.envelopes[tempEnvelope.envelope].name === "pitch"
					) {
						// assign only if a pitch envelope
						envelopeInverse = instrumentObject["pitchEnvelopeInverse"];
					} else {
						envelopeInverse = tempEnvelope.inverse;
					}
					let discreteEnvelope: boolean;
					if (instrumentObject["discreteEnvelope"] !== undefined) {
						discreteEnvelope = instrumentObject["discreteEnvelope"];
					} else {
						discreteEnvelope = tempEnvelope.discrete;
					}
					this.addEnvelope(
						tempEnvelope.target,
						tempEnvelope.index,
						tempEnvelope.envelope,
						true,
						pitchEnvelopeStart,
						pitchEnvelopeEnd,
						envelopeInverse,
						tempEnvelope.perEnvelopeSpeed,
						tempEnvelope.perEnvelopeLowerBound,
						tempEnvelope.perEnvelopeUpperBound,
						tempEnvelope.steps,
						tempEnvelope.seed,
						tempEnvelope.waveform,
						discreteEnvelope,
					);
				}
			}
		}
		// advloop addition
		if (type === 0) {
			if (instrumentObject["isUsingAdvancedLoopControls"] !== undefined) {
				this.isUsingAdvancedLoopControls = instrumentObject["isUsingAdvancedLoopControls"];
				this.chipWaveLoopStart = instrumentObject["chipWaveLoopStart"];
				this.chipWaveLoopEnd = instrumentObject["chipWaveLoopEnd"];
				this.chipWaveLoopMode = instrumentObject["chipWaveLoopMode"];
				this.chipWavePlayBackwards = instrumentObject["chipWavePlayBackwards"];
				this.chipWaveStartOffset = instrumentObject["chipWaveStartOffset"];
			} else {
				this.isUsingAdvancedLoopControls = false;
				this.chipWaveLoopStart = 0;
				this.chipWaveLoopEnd = Config.rawRawChipWaves[this.chipWave].samples.length - 1;
				this.chipWaveLoopMode = 0;
				this.chipWavePlayBackwards = false;
				this.chipWaveStartOffset = 0;
			}
		}

		const plugin = getPlugin(this.type);
		if (plugin?.deserialize) {
			plugin.deserialize(this, instrumentObject);
		}
	}
	// advloop addition

	public getLargestControlPointCount(forNoteFilter: boolean) {
		let largest: number;
		if (forNoteFilter) {
			largest = this.noteFilter.controlPointCount;
			for (let i: number = 0; i < Config.filterMorphCount; i++) {
				if (this.noteSubFilters[i] != null && this.noteSubFilters[i]!.controlPointCount > largest) {
					largest = this.noteSubFilters[i]!.controlPointCount;
				}
			}
		} else {
			largest = this.eqFilter.controlPointCount;
			for (let i: number = 0; i < Config.filterMorphCount; i++) {
				if (this.eqSubFilters[i] != null && this.eqSubFilters[i]!.controlPointCount > largest) {
					largest = this.eqSubFilters[i]!.controlPointCount;
				}
			}
		}
		return largest;
	}

	public static frequencyFromPitch(pitch: number): number {
		return 440.0 * Math.pow(2.0, (pitch - 69.0) / Config.pitchesPerOctave);
	}

	public addEnvelope(
		target: number,
		index: number,
		envelope: number,
		newEnvelopes: boolean,
		start: number = 0,
		end: number = -1,
		inverse: boolean = false,
		perEnvelopeSpeed: number = -1,
		perEnvelopeLowerBound: number = 0,
		perEnvelopeUpperBound: number = 1,
		steps: number = 2,
		seed: number = 2,
		waveform: number = LFOEnvelopeTypes.sine,
		discrete: boolean = false,
	): void {
		end = end !== -1 ? end : this.isNoiseInstrument ? Config.drumCount - 1 : Config.maxPitch; // find default if none is given
		perEnvelopeSpeed = perEnvelopeSpeed !== -1 ? perEnvelopeSpeed : newEnvelopes ? 1 : Config.envelopes[envelope].speed; // find default if none is given
		let makeEmpty: boolean = false;
		if (!this.supportsEnvelopeTarget(target, index)) makeEmpty = true;
		if (this.envelopeCount >= Config.maxEnvelopeCount) throw new Error();
		while (this.envelopes.length <= this.envelopeCount) {
			this.envelopes[this.envelopes.length] = new EnvelopeSettings(this.isNoiseInstrument);
		}
		const envelopeSettings: EnvelopeSettings = this.envelopes[this.envelopeCount];
		envelopeSettings.target = makeEmpty ? Config.instrumentAutomationTargets.dictionary["none"].index : target;
		envelopeSettings.index = makeEmpty ? 0 : index;
		if (!newEnvelopes) {
			envelopeSettings.envelope = clamp(0, Config.newEnvelopes.length, Config.envelopes[envelope].type);
		} else {
			envelopeSettings.envelope = envelope;
		}
		envelopeSettings.pitchEnvelopeStart = start;
		envelopeSettings.pitchEnvelopeEnd = end;
		envelopeSettings.inverse = inverse;
		envelopeSettings.perEnvelopeSpeed = perEnvelopeSpeed;
		envelopeSettings.perEnvelopeLowerBound = perEnvelopeLowerBound;
		envelopeSettings.perEnvelopeUpperBound = perEnvelopeUpperBound;
		envelopeSettings.steps = steps;
		envelopeSettings.seed = seed;
		envelopeSettings.waveform = waveform;
		envelopeSettings.discrete = discrete;
		this.envelopeCount++;
	}

	public supportsEnvelopeTarget(target: number, index: number): boolean {
		const automationTarget: AutomationTarget = Config.instrumentAutomationTargets[target];
		if (automationTarget.computeIndex == null && automationTarget.name !== "none") {
			return false;
		}
		if (index >= automationTarget.maxCount) {
			return false;
		}
		if (automationTarget.compatibleInstruments != null && automationTarget.compatibleInstruments.indexOf(this.type) === -1) {
			return false;
		}
		if (automationTarget.effect != null && (this.effects & (1 << automationTarget.effect)) === 0) {
			return false;
		}
		if (automationTarget.name === "arpeggioSpeed") {
			return effectsIncludeChord(this.effects) && this.chord === Config.chords.dictionary["arpeggio"].index;
		}
		if (automationTarget.isFilter) {
			// if (automationTarget.perNote) {
			let useControlPointCount: number = this.noteFilter.controlPointCount;
			if (this.noteFilterType) {
				useControlPointCount = 1;
			}
			if (index >= useControlPointCount) return false;
			// } else {
			// 	if (index >= this.eqFilter.controlPointCount)   return false;
			// }
		}
		if (automationTarget.name === "operatorFrequency" || automationTarget.name === "operatorAmplitude") {
			if (index >= 4 + (this.type === InstrumentType.fm6op ? 2 : 0)) return false;
		}
		return true;
	}

	public clearInvalidEnvelopeTargets(): void {
		for (let envelopeIndex: number = 0; envelopeIndex < this.envelopeCount; envelopeIndex++) {
			const target: number = this.envelopes[envelopeIndex].target;
			const index: number = this.envelopes[envelopeIndex].index;
			if (!this.supportsEnvelopeTarget(target, index)) {
				this.envelopes[envelopeIndex].target = Config.instrumentAutomationTargets.dictionary["none"].index;
				this.envelopes[envelopeIndex].index = 0;
			}
		}
	}

	public getTransition(): Transition {
		return effectsIncludeTransition(this.effects)
			? Config.transitions[this.transition]
			: this.type === InstrumentType.mod
				? Config.transitions.dictionary["interrupt"]
				: Config.transitions.dictionary["normal"];
	}

	public getFadeInSeconds(): number {
		return this.type === InstrumentType.drumset ? 0.0 : fadeInSettingToSeconds(this.fadeIn);
	}

	public getFadeOutTicks(): number {
		return this.type === InstrumentType.drumset ? Config.drumsetFadeOutTicks : fadeOutSettingToTicks(this.fadeOut);
	}

	public getChord(): Chord {
		return effectsIncludeChord(this.effects) ? Config.chords[this.chord] : Config.chords.dictionary["simultaneous"];
	}

	public getDrumsetEnvelope(pitch: number): Envelope {
		if (this.type !== InstrumentType.drumset) throw new Error("Can't getDrumsetEnvelope() for non-drumset.");
		return Config.envelopes[this.drumsetEnvelopes[pitch]];
	}
}
