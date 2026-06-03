// noise.ts
//
// Purpose: Noise synthesis source string builder
//
// This module:
// - Builds noise synthesis source strings with pitch-relative filtering

import { Config } from "../synth-config";

export function buildNoiseSource(voiceCount: number): string {
	let noiseSource: string = "return (synth, bufferIndex, runLength, tone, instrumentState) => {";

	noiseSource += `
        const data = synth.tempMonoInstrumentSampleBuffer;
        const wave = instrumentState.wave;

        const unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;
        `;
	for (let i: number = 0; i < voiceCount; i++) {
		noiseSource += `
            let phaseDelta# = tone.phaseDeltas[#];
            let phaseDeltaScale# = +tone.phaseDeltaScales[#];
            let noiseSample# = +tone.noiseSamples[#];
            // This is for a "legacy" style simplified 1st order lowpass filter with
            // a cutoff frequency that is relative to the tone's fundamental frequency.
            const pitchRelativefilter# = Math.min(1.0, phaseDelta# * instrumentState.noisePitchFilterMult);
            
            if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) tone.phases[#] = tone.phases[#-1];
            `.replaceAll("#", i + "");
	}

	noiseSource += `
        let expression = +tone.expression;
        const expressionDelta = +tone.expressionDelta;

        const filters = tone.noteFilters;
        const filterCount = tone.noteFilterCount | 0;
        let initialFilterInput1 = +tone.initialNoteFilterInput1;
        let initialFilterInput2 = +tone.initialNoteFilterInput2;
        const applyFilters = Synth.applyFilters;

        const phaseMask = Config.spectrumNoiseLength - 1;

        `;
	for (let i: number = 0; i < voiceCount; i++) {
		noiseSource += `let phase# = (tone.phases[#] - (tone.phases[#] | 0)) * Config.chipNoiseLength;
                `.replaceAll("#", i + "");
	}
	noiseSource += "let test = true;";
	for (let i: number = 0; i < voiceCount; i++) {
		noiseSource += `
            if (tone.phases[#] == 0.0) {
                // Zero phase means the tone was reset, just give noise a random start phase instead.
                phase# = Math.random() * Config.chipNoiseLength;
                if (@ <= # && test && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) {`
			.replaceAll("#", i + "")
			.replaceAll("@", voiceCount + "")
			.replaceAll("~", voiceCount + 2 + "");
		for (let j: number = i + 1; j < voiceCount + 2; j++) {
			noiseSource += "phase~ = phase#;".replaceAll("#", i + "").replaceAll("~", j + "");
		}
		noiseSource += `
                    test = false;
                }
            }`;
	}

	noiseSource += `
        const stopIndex = bufferIndex + runLength;
        for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
            `;

	for (let i: number = 0; i < voiceCount; i++) {
		noiseSource += `
                let waveSample# = wave[phase# & phaseMask];

                noiseSample# += (waveSample# - noiseSample#) * pitchRelativefilter#;
                `.replaceAll("#", i + "");
	}

	const sampleList: string[] = [];
	for (let voice: number = 0; voice < voiceCount; voice++) {
		sampleList.push("noiseSample" + voice + (voice !== 0 ? " * unisonSign" : ""));
	}

	noiseSource += "let inputSample = " + sampleList.join(" + ") + ";";

	noiseSource += `const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
            initialFilterInput2 = initialFilterInput1;
            initialFilterInput1 = inputSample;`;

	for (let i = 0; i < voiceCount; i++) {
		noiseSource += `phase# += phaseDelta#;
                phaseDelta# *= phaseDeltaScale#;
                `.replaceAll("#", i + "");
	}

	noiseSource += `const output = sample * expression;
            expression += expressionDelta;
            data[sampleIndex] += output;
        }`;

	for (let i: number = 0; i < voiceCount; i++) {
		noiseSource +=
			`tone.phases[#] = phase# / `.replaceAll("#", i + "") +
			Config.chipNoiseLength +
			`;
            tone.phaseDeltas[#] = phaseDelta#;
            `.replaceAll("#", i + "");
	}

	noiseSource += "tone.expression = expression;";
	for (let i: number = 0; i < voiceCount; i++) {
		noiseSource += `tone.noiseSamples[#] = noiseSample#;
             `.replaceAll("#", i + "");
	}

	noiseSource += `
        synth.sanitizeFilters(filters);
        tone.initialNoteFilterInput1 = initialFilterInput1;
        tone.initialNoteFilterInput2 = initialFilterInput2;
    }`;
	return noiseSource;
}
