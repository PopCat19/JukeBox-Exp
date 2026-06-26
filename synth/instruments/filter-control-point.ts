// FilterControlPoint
//
// Purpose: Manages a single filter control point with frequency, gain, and filter type
//
// This module:
// - Converts filter settings to Hz and back from setting values
// - Computes linear gain and volume compensation for each filter type
// - Generates FilterCoefficients for low-pass, high-pass, and peak filter types

import type { FilterCoefficients } from "../filtering";
import { Config, FilterType } from "../synth-config";

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
		return (
			Config.filterFreqReferenceHz *
			2.0 ** ((value - Config.filterFreqReferenceSetting) * Config.filterFreqStep)
		);
	}
	public static getSettingValueFromHz(hz: number): number {
		return (
			Math.log2(hz / Config.filterFreqReferenceHz) / Config.filterFreqStep +
			Config.filterFreqReferenceSetting
		);
	}
	public static getRoundedSettingValueFromHz(hz: number): number {
		return Math.max(
			0,
			Math.min(
				Config.filterFreqRange - 1,
				Math.round(FilterControlPoint.getSettingValueFromHz(hz)),
			),
		);
	}

	public getLinearGain(peakMult: number = 1.0): number {
		const power: number = (this.gain - Config.filterGainCenter) * Config.filterGainStep;
		const neutral: number = this.type === FilterType.peak ? 0.0 : -0.5;
		const interpolatedPower: number = neutral + (power - neutral) * peakMult;
		return 2.0 ** interpolatedPower;
	}
	public static getRoundedSettingValueFromLinearGain(linearGain: number): number {
		return Math.max(
			0,
			Math.min(
				Config.filterGainRange - 1,
				Math.round(Math.log2(linearGain) / Config.filterGainStep + Config.filterGainCenter),
			),
		);
	}

	public toCoefficients(
		filter: FilterCoefficients,
		sampleRate: number,
		freqMult: number = 1.0,
		peakMult: number = 1.0,
	): void {
		const cornerRadiansPerSample: number =
			(2.0 *
				Math.PI *
				Math.max(
					Config.filterFreqMinHz,
					Math.min(Config.filterFreqMaxHz, freqMult * this.getHz()),
				)) /
			sampleRate;
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
		const octave: number =
			(this.freq - Config.filterFreqReferenceSetting) * Config.filterFreqStep;
		const gainPow: number = (this.gain - Config.filterGainCenter) * Config.filterGainStep;
		switch (this.type) {
			case FilterType.lowPass: {
				const freqRelativeTo8khz: number =
					(2.0 ** octave * Config.filterFreqReferenceHz) / 8000.0;
				// Reverse the frequency warping from importing legacy simplified filters to imitate how the legacy filter cutoff setting affected volume.
				const warpedFreq: number = (Math.sqrt(1.0 + 4.0 * freqRelativeTo8khz) - 1.0) / 2.0;
				const warpedOctave: number = Math.log2(warpedFreq);
				return (
					0.5 **
					(0.2 * Math.max(0.0, gainPow + 1.0) +
						Math.min(
							0.0,
							Math.max(
								-3.0,
								0.595 * warpedOctave + 0.35 * Math.min(0.0, gainPow + 1.0),
							),
						))
				);
			}
			case FilterType.highPass:
				return (
					0.5 **
					(0.125 * Math.max(0.0, gainPow + 1.0) +
						Math.min(
							0.0,
							0.3 * (-octave - Math.log2(Config.filterFreqReferenceHz / 125.0)) +
								0.2 * Math.min(0.0, gainPow + 1.0),
						))
				);
			case FilterType.peak: {
				const distanceFromCenter: number =
					octave + Math.log2(Config.filterFreqReferenceHz / 2000.0);
				const freqLoudness: number =
					(1.0 / (1.0 + (distanceFromCenter / 3.0) ** 2.0)) ** 2.0;
				return (
					0.5 **
					(0.125 * Math.max(0.0, gainPow) + 0.1 * freqLoudness * Math.min(0.0, gainPow))
				);
			}
			default:
				throw new Error();
		}
	}
}
