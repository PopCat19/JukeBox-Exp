// post-processing.ts
//
// Purpose: Song EQ filter and compressor/limiter post-processing pipeline
//
// This module:
// - Applies song EQ (biquad filters) to the output buffer
// - Applies compressor/limiter to the output buffer
// - Manages filter history and limiter state across synthesize calls

import { applyFilters } from "./dsp-utils";
import { DynamicBiquadFilter } from "./filtering";
import { Config } from "./synth-config";
import { epsilon } from "./util";

/** Per-call parameters for the post-processing pipeline. */
export interface SongPostParams {
	masterGain: number;
	compressionThreshold: number;
	limitThreshold: number;
	compressionRatio: number;
	limitRatio: number;
	limitDecay: number;
	limitRise: number;
}

/** Persistent state for song EQ + compressor/limiter. */
export class PostProcessingState {
	public limit: number = 0.0;
	public songEqFilterVolume: number = 1.0;
	public songEqFilterVolumeDelta: number = 0.0;
	// Pre-allocated — no allocation in audio hot path
	public readonly songEqFiltersL: DynamicBiquadFilter[] = Array.from(
		{ length: Config.filterMaxPoints },
		() => new DynamicBiquadFilter(),
	);
	public readonly songEqFiltersR: DynamicBiquadFilter[] = Array.from(
		{ length: Config.filterMaxPoints },
		() => new DynamicBiquadFilter(),
	);
	public songEqFilterCount: number = 0;
	public initialSongEqFilterInput1L: number = 0.0;
	public initialSongEqFilterInput2L: number = 0.0;
	public initialSongEqFilterInput1R: number = 0.0;
	public initialSongEqFilterInput2R: number = 0.0;

	public resetLimit(): void {
		this.limit = 0.0;
	}

	/**
	 * Apply song EQ and compressor/limiter to a run of output samples.
	 * Mutates outputDataL/outputDataR in place.
	 * Mutates inOutVolumeCap.in/.out with the running volume caps.
	 */
	public processBlock(
		outputDataL: Float32Array,
		outputDataR: Float32Array,
		outputDataLUnfiltered: Float32Array,
		outputDataRUnfiltered: Float32Array,
		bufferIndex: number,
		runEnd: number,
		params: SongPostParams,
		volume: number,
		samplesPerSecond: number,
		inOutVolumeCap: { in: number; out: number },
	): void {
		const limitDecay: number = 1.0 - 0.5 ** (params.limitDecay / samplesPerSecond);
		const limitRise: number = 1.0 - 0.5 ** (params.limitRise / samplesPerSecond);

		for (let i: number = bufferIndex; i < runEnd; i++) {
			// Song EQ
			{
				const filtersL = this.songEqFiltersL;
				const filtersR = this.songEqFiltersR;
				const filterCount = this.songEqFilterCount | 0;
				let initialFilterInput1L = +this.initialSongEqFilterInput1L;
				let initialFilterInput2L = +this.initialSongEqFilterInput2L;
				let initialFilterInput1R = +this.initialSongEqFilterInput1R;
				let initialFilterInput2R = +this.initialSongEqFilterInput2R;
				let eqFilterVolume = +this.songEqFilterVolume;
				const eqFilterVolumeDelta = +this.songEqFilterVolumeDelta;
				const inputSampleL = outputDataL[i];
				let sampleL = inputSampleL;
				sampleL = applyFilters(
					sampleL,
					initialFilterInput1L,
					initialFilterInput2L,
					filterCount,
					filtersL,
				);
				initialFilterInput2L = initialFilterInput1L;
				initialFilterInput1L = inputSampleL;
				sampleL *= eqFilterVolume;
				outputDataL[i] = sampleL;
				const inputSampleR = outputDataR[i];
				let sampleR = inputSampleR;
				sampleR = applyFilters(
					sampleR,
					initialFilterInput1R,
					initialFilterInput2R,
					filterCount,
					filtersR,
				);
				initialFilterInput2R = initialFilterInput1R;
				initialFilterInput1R = inputSampleR;
				sampleR *= eqFilterVolume;
				outputDataR[i] = sampleR;
				eqFilterVolume += eqFilterVolumeDelta;
				this.sanitizeFilters(filtersL);
				if (!(initialFilterInput1L < 100) || !(initialFilterInput2L < 100)) {
					initialFilterInput1L = 0.0;
					initialFilterInput2L = 0.0;
				}
				if (Math.abs(initialFilterInput1L) < epsilon) initialFilterInput1L = 0.0;
				if (Math.abs(initialFilterInput2L) < epsilon) initialFilterInput2L = 0.0;
				this.initialSongEqFilterInput1L = initialFilterInput1L;
				this.initialSongEqFilterInput2L = initialFilterInput2L;
				this.sanitizeFilters(filtersR);
				if (!(initialFilterInput1R < 100) || !(initialFilterInput2R < 100)) {
					initialFilterInput1R = 0.0;
					initialFilterInput2R = 0.0;
				}
				if (Math.abs(initialFilterInput1R) < epsilon) initialFilterInput1R = 0.0;
				if (Math.abs(initialFilterInput2R) < epsilon) initialFilterInput2R = 0.0;
				this.initialSongEqFilterInput1R = initialFilterInput1R;
				this.initialSongEqFilterInput2R = initialFilterInput2R;
			}

			// Compressor/limiter.
			const sampleL =
				(outputDataL[i] + outputDataLUnfiltered[i]) * params.masterGain * params.masterGain;
			const sampleR =
				(outputDataR[i] + outputDataRUnfiltered[i]) * params.masterGain * params.masterGain;
			const absL: number = sampleL < 0.0 ? -sampleL : sampleL;
			const absR: number = sampleR < 0.0 ? -sampleR : sampleR;
			const abs: number = absL > absR ? absL : absR;
			if (abs > inOutVolumeCap.in) inOutVolumeCap.in = abs;
			const limitRange: number =
				+(abs > params.compressionThreshold) + +(abs > params.limitThreshold);
			const limitTarget: number =
				+(limitRange === 0) *
					(((abs + 1 - params.compressionThreshold) * 0.8 + 0.25) *
						params.compressionRatio +
						1.05 * (1 - params.compressionRatio)) +
				+(limitRange === 1) * 1.05 +
				+(limitRange === 2) *
					(1.05 *
						((abs + 1 - params.limitThreshold) * params.limitRatio +
							(1 - params.limitThreshold)));
			this.limit +=
				(limitTarget - this.limit) * (this.limit < limitTarget ? limitRise : limitDecay);
			const limitedVolume =
				volume / (this.limit >= 1 ? this.limit * 1.05 : this.limit * 0.8 + 0.25);
			outputDataL[i] = sampleL * limitedVolume;
			outputDataR[i] = sampleR * limitedVolume;
			const limitedAbs = abs * limitedVolume;
			if (limitedAbs > inOutVolumeCap.out) inOutVolumeCap.out = limitedAbs;
		}
	}

	public sanitizeFilters(filters: DynamicBiquadFilter[]): void {
		let reset: boolean = false;
		for (const filter of filters) {
			const output1: number = Math.abs(filter.output1);
			const output2: number = Math.abs(filter.output2);
			if (!(output1 < 100) || !(output2 < 100)) {
				reset = true;
				break;
			}
			if (output1 < epsilon) filter.output1 = 0.0;
			if (output2 < epsilon) filter.output2 = 0.0;
		}
		if (reset) {
			for (const filter of filters) {
				filter.output1 = 0.0;
				filter.output2 = 0.0;
			}
		}
	}
}
