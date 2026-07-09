// opl3.ts
//
// Purpose: OPL3 FM synthesis source string builder
//
// This module:
// - Builds OPL3 synthesis source strings using OPL3 4-op algorithms
// - Reuses FM operator source templates with OPL3-specific routing

import type { Instrument } from "../instruments";
import { Config } from "../synth-config";
import { fmSourceTemplate, operatorSourceTemplate } from "./fm";

export function buildOpl3Source(instrument: Instrument): string {
	const synthSource: string[] = [];
	const algoIndex: number = Math.min(
		instrument.opl3Algorithm ?? 0,
		Config.algorithmsOpl3.length - 1,
	);
	const algo = Config.algorithmsOpl3[algoIndex];

	for (const line of fmSourceTemplate) {
		if (line.includes("// CARRIER OUTPUTS")) {
			const outputs: string[] = [];
			for (let j = 0; j < Config.operatorCount; j++) {
				if (algo.associatedCarrier[j] === j + 1) outputs.push(`operator${j}Scaled`);
			}
			if (outputs.length === 0) {
				for (let j = 0; j < algo.carrierCount; j++) outputs.push(`operator${j}Scaled`);
			}
			synthSource.push(line.replace("/*operator#Scaled*/", outputs.join(" + ")));
		} else if (line.includes("// INSERT OPERATOR COMPUTATION HERE")) {
			for (let j = 3; j >= 0; j--) {
				for (const operatorLine of operatorSourceTemplate) {
					if (operatorLine.includes("/* + operator@Scaled*/")) {
						let modulators = "";
						for (const modulatorNumber of algo.modulatedBy[j]) {
							modulators += ` + operator${modulatorNumber - 1}Scaled`;
						}
						// Feedback always on last operator (index 3) for OPL3 style
						if (j === 3) {
							modulators += " + feedbackMult * operator3Output";
						}
						synthSource.push(
							operatorLine
								.replace(/#/g, `${j}`)
								.replace("/* + operator@Scaled*/", modulators),
						);
					} else {
						synthSource.push(operatorLine.replace(/#/g, `${j}`));
					}
				}
			}
		} else if (line.includes("#")) {
			for (let j = 0; j < Config.operatorCount; j++) {
				synthSource.push(line.replace(/#/g, `${j}`));
			}
		} else {
			synthSource.push(line);
		}
	}

	return `return (synth, bufferIndex, roundedSamplesPerTick, tone, instrument) => {${synthSource.join("\n")}}`;
}
