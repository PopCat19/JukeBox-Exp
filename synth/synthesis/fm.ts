// fm.ts
//
// Purpose: FM synthesis source string builder and templates
//
// This module:
// - Provides FM and operator source code templates
// - Builds FM synthesis source strings for new Function() compilation

import type { Instrument } from "../instruments";
import { Config } from "../synth-config";

export const fmSourceTemplate: string[] = (
	`
		const data = synth.tempMonoInstrumentSampleBuffer;
		const sineWave = Config.sineWave;
			
		// 1000 is added to the phase to ensure that it's never negative even when modulated by other waves because negative numbers don't work with the modulus operator very well.
		let operator#Phase       = +((tone.phases[#] - (tone.phases[#] | 0)) + 1000) * ` +
	Config.sineWaveLength +
	`;
		let operator#PhaseDelta  = +tone.phaseDeltas[#] * ` +
	Config.sineWaveLength +
	`;
		let operator#PhaseDeltaScale = +tone.phaseDeltaScales[#];
		let operator#OutputMult  = +tone.operatorExpressions[#];
		const operator#OutputDelta = +tone.operatorExpressionDeltas[#];
		let operator#Output      = +tone.feedbackOutputs[#];
        const operator#Wave      = tone.operatorWaves[#].samples;
		let feedbackMult         = +tone.feedbackMult;
		const feedbackDelta        = +tone.feedbackDelta;
        let expression = +tone.expression;
		const expressionDelta = +tone.expressionDelta;
		
		const filters = tone.noteFilters;
		const filterCount = tone.noteFilterCount|0;
		let initialFilterInput1 = +tone.initialNoteFilterInput1;
		let initialFilterInput2 = +tone.initialNoteFilterInput2;
		const applyFilters = Synth.applyFilters;
		
		const stopIndex = bufferIndex + roundedSamplesPerTick;
		for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
				// INSERT OPERATOR COMPUTATION HERE
				const fmOutput = (/*operator#Scaled*/); // CARRIER OUTPUTS
				
			const inputSample = fmOutput;
			const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
			initialFilterInput2 = initialFilterInput1;
			initialFilterInput1 = inputSample;
				
				feedbackMult += feedbackDelta;
				operator#OutputMult += operator#OutputDelta;
				operator#Phase += operator#PhaseDelta;
			operator#PhaseDelta *= operator#PhaseDeltaScale;
			
			const output = sample * expression;
			expression += expressionDelta;

			data[sampleIndex] += output;
			}
			
			tone.phases[#] = operator#Phase / ` +
	Config.sineWaveLength +
	`;
			tone.phaseDeltas[#] = operator#PhaseDelta / ` +
	Config.sineWaveLength +
	`;
			tone.operatorExpressions[#] = operator#OutputMult;
		    tone.feedbackOutputs[#] = operator#Output;
		    tone.feedbackMult = feedbackMult;
		    tone.expression = expression;
			
		synth.sanitizeFilters(filters);
		tone.initialNoteFilterInput1 = initialFilterInput1;
		tone.initialNoteFilterInput2 = initialFilterInput2;
		`
).split("\n");

export const operatorSourceTemplate: string[] = (
	`
				const operator#PhaseMix = operator#Phase/* + operator@Scaled*/;
				const operator#PhaseInt = operator#PhaseMix|0;
				const operator#Index    = operator#PhaseInt & ` +
	Config.sineWaveMask +
	`;
                const operator#Sample   = operator#Wave[operator#Index];
                operator#Output         = operator#Sample + (operator#Wave[operator#Index + 1] - operator#Sample) * (operator#PhaseMix - operator#PhaseInt);
				const operator#Scaled   = operator#OutputMult * operator#Output;
		`
).split("\n");

export function buildFmSource(instrument: Instrument): string {
	const synthSource: string[] = [];

	for (const line of fmSourceTemplate) {
		if (line.indexOf("// CARRIER OUTPUTS") !== -1) {
			const outputs: string[] = [];
			for (let j: number = 0; j < Config.algorithms[instrument.algorithm].carrierCount; j++) {
				outputs.push(`operator${j}Scaled`);
			}
			synthSource.push(line.replace("/*operator#Scaled*/", outputs.join(" + ")));
		} else if (line.indexOf("// INSERT OPERATOR COMPUTATION HERE") !== -1) {
			for (let j: number = Config.operatorCount - 1; j >= 0; j--) {
				for (const operatorLine of operatorSourceTemplate) {
					if (operatorLine.indexOf("/* + operator@Scaled*/") !== -1) {
						let modulators = "";
						for (const modulatorNumber of Config.algorithms[instrument.algorithm].modulatedBy[j]) {
							modulators += ` + operator${modulatorNumber - 1}Scaled`;
						}

						const feedbackIndices: ReadonlyArray<number> = Config.feedbacks[instrument.feedbackType].indices[j];
						if (feedbackIndices.length > 0) {
							modulators += " + feedbackMult * (";
							const feedbacks: string[] = [];
							for (const modulatorNumber of feedbackIndices) {
								feedbacks.push(`operator${modulatorNumber - 1}Output`);
							}
							modulators += `${feedbacks.join(" + ")})`;
						}
						synthSource.push(operatorLine.replace(/#/g, `${j}`).replace("/* + operator@Scaled*/", modulators));
					} else {
						synthSource.push(operatorLine.replace(/#/g, `${j}`));
					}
				}
			}
		} else if (line.indexOf("#") !== -1) {
			for (let j: number = 0; j < Config.operatorCount; j++) {
				synthSource.push(line.replace(/#/g, `${j}`));
			}
		} else {
			synthSource.push(line);
		}
	}

	return `return (synth, bufferIndex, roundedSamplesPerTick, tone, instrument) => {${synthSource.join("\n")}}`;
}
