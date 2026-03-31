// synth/synthesis/fm6.ts
//
// Purpose: 6-operator FM synthesis source string builder
//
// This module:
// - Builds FM6 synthesis source strings using custom algorithm/feedback config

import { Instrument } from "../instruments";
import { Config } from "../synth-config";
import { fmSourceTemplate, operatorSourceTemplate } from "./fm";

export function buildFm6Source(instrument: Instrument): string {
	const synthSource: string[] = [];

	for (const line of fmSourceTemplate) {
		if (line.indexOf("// CARRIER OUTPUTS") !== -1) {
			const outputs: string[] = [];
			for (let j: number = 0; j < instrument.customAlgorithm.carrierCount; j++) {
				outputs.push("operator" + j + "Scaled");
			}
			synthSource.push(line.replace("/*operator#Scaled*/", outputs.join(" + ")));
		} else if (line.indexOf("// INSERT OPERATOR COMPUTATION HERE") !== -1) {
			for (let j: number = Config.operatorCount + 2 - 1; j >= 0; j--) {
				for (const operatorLine of operatorSourceTemplate) {
					if (operatorLine.indexOf("/* + operator@Scaled*/") !== -1) {
						let modulators = "";
						for (const modulatorNumber of instrument.customAlgorithm.modulatedBy[j]) {
							modulators += " + operator" + (modulatorNumber - 1) + "Scaled";
						}

						const feedbackIndices: ReadonlyArray<number> = instrument.customFeedbackType.indices[j];
						if (feedbackIndices.length > 0) {
							modulators += " + feedbackMult * (";
							const feedbacks: string[] = [];
							for (const modulatorNumber of feedbackIndices) {
								feedbacks.push("operator" + (modulatorNumber - 1) + "Output");
							}
							modulators += feedbacks.join(" + ") + ")";
						}
						synthSource.push(operatorLine.replace(/\#/g, j + "").replace("/* + operator@Scaled*/", modulators));
					} else {
						synthSource.push(operatorLine.replace(/\#/g, j + ""));
					}
				}
			}
		} else if (line.indexOf("#") !== -1) {
			for (let j = 0; j < Config.operatorCount + 2; j++) {
				synthSource.push(line.replace(/\#/g, j + ""));
			}
		} else {
			synthSource.push(line);
		}
	}

	return "return (synth, bufferIndex, roundedSamplesPerTick, tone, instrument) => {" + synthSource.join("\n") + "}";
}
