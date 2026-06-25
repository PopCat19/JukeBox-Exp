// dsp-utils
//
// Purpose: Pure DSP utility functions for the synthesis engine — filter application,
// delay line sanitization, and zero-crossing detection
//
// These were extracted from Synth static methods. They are stateless and
// operate entirely through their parameters, making them independently testable.

import type { DynamicBiquadFilter } from "./filtering";
import { epsilon } from "./util";

export function applyFilters(
	sample: number,
	input1: number,
	input2: number,
	filterCount: number,
	filters: DynamicBiquadFilter[],
): number {
	for (let i: number = 0; i < filterCount; i++) {
		const filter: DynamicBiquadFilter = filters[i];
		const output1: number = filter.output1;
		const output2: number = filter.output2;
		const a1: number = filter.a1;
		const a2: number = filter.a2;
		const b0: number = filter.b0;
		const b1: number = filter.b1;
		const b2: number = filter.b2;
		sample = b0 * sample + b1 * input1 + b2 * input2 - a1 * output1 - a2 * output2;
		filter.a1 = a1 + filter.a1Delta;
		filter.a2 = a2 + filter.a2Delta;
		if (filter.useMultiplicativeInputCoefficients) {
			filter.b0 = b0 * filter.b0Delta;
			filter.b1 = b1 * filter.b1Delta;
			filter.b2 = b2 * filter.b2Delta;
		} else {
			filter.b0 = b0 + filter.b0Delta;
			filter.b1 = b1 + filter.b1Delta;
			filter.b2 = b2 + filter.b2Delta;
		}
		filter.output2 = output1;
		filter.output1 = sample;
		input2 = output2;
		input1 = output1;
	}
	return sample;
}

export function sanitizeDelayLine(delayLine: Float32Array, lastIndex: number, mask: number): void {
	while (true) {
		lastIndex--;
		const index: number = lastIndex & mask;
		const sample: number = Math.abs(delayLine[index]);
		if (Number.isFinite(sample) && (sample === 0.0 || sample >= epsilon)) break;
		delayLine[index] = 0.0;
	}
}

export function findRandomZeroCrossing(wave: Float32Array, waveLength: number): number {
	let phase: number = Math.random() * waveLength;
	const phaseMask: number = waveLength - 1;

	let indexPrev: number = phase & phaseMask;
	let wavePrev: number = wave[indexPrev];
	const stride: number = 16;
	for (let attemptsRemaining: number = 128; attemptsRemaining > 0; attemptsRemaining--) {
		const indexNext: number = (indexPrev + stride) & phaseMask;
		const waveNext: number = wave[indexNext];
		if (wavePrev * waveNext <= 0.0) {
			for (let i: number = 0; i < stride; i++) {
				const innerIndexNext: number = (indexPrev + 1) & phaseMask;
				const innerWaveNext: number = wave[innerIndexNext];
				if (wavePrev * innerWaveNext <= 0.0) {
					const slope: number = innerWaveNext - wavePrev;
					phase = indexPrev;
					if (Math.abs(slope) > 0.00000001) {
						phase += -wavePrev / slope;
					}
					phase = Math.max(0, phase) % waveLength;
					break;
				} else {
					indexPrev = innerIndexNext;
					wavePrev = innerWaveNext;
				}
			}
			break;
		} else {
			indexPrev = indexNext;
			wavePrev = waveNext;
		}
	}

	return phase;
}
