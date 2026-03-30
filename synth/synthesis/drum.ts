// synth/synthesis/drum.ts
//
// Purpose: Drumset synthesis source string builder
//
// This module:
// - Builds drumset synthesis source strings with per-drum wave lookup

import { Config } from "../synth-config";

export function buildDrumSource(voiceCount: number): string {
	let drumSource: string = "return (synth, bufferIndex, runLength, tone, instrumentState) => {";

	drumSource += `
        const data = synth.tempMonoInstrumentSampleBuffer;
        let wave = instrumentState.getDrumsetWave(tone.drumsetPitch);
        const referenceDelta = InstrumentState.drumsetIndexReferenceDelta(tone.drumsetPitch);
        const unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;
        `;
	for (let i: number = 0; i < voiceCount; i++) {
		drumSource += `let phaseDelta# = tone.phaseDeltas[#] / referenceDelta;
            let phaseDeltaScale# = +tone.phaseDeltaScales[#];
            if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) tone.phases[#] = tone.phases[# - 1];
            `.replaceAll("#", i + "");
	}

	drumSource += `let expression = +tone.expression;
        const expressionDelta = +tone.expressionDelta;

        const filters = tone.noteFilters;
        const filterCount = tone.noteFilterCount | 0;
        let initialFilterInput1 = +tone.initialNoteFilterInput1;
        let initialFilterInput2 = +tone.initialNoteFilterInput2;
        const applyFilters = Synth.applyFilters;`;

	for (let i: number = 0; i < voiceCount; i++) {
		drumSource += `let phase# = (tone.phases[#] - (tone.phases[#] | 0)) * Config.spectrumNoiseLength;
            `.replaceAll("#", i + "");
	}
	drumSource += `
        if (tone.phases[0] == 0.0) {
            // Zero phase means the tone was reset, just give noise a random start phase instead.
            phase0 = Synth.findRandomZeroCrossing(wave, Config.spectrumNoiseLength) + phaseDelta0;
        `;
	for (let i: number = 1; i < voiceCount; i++) {
		drumSource += `
            if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) {
                phase# = phase0;
            }
        `.replaceAll("#", i + "");
	}
	drumSource += `}`;
	for (let i: number = 1; i < voiceCount; i++) {
		drumSource += `
            if (tone.phases[#] == 0.0 && !(instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval)) {
                // Zero phase means the tone was reset, just give noise a random start phase instead.
            phase# = Synth.findRandomZeroCrossing(wave, Config.spectrumNoiseLength) + phaseDelta#;
            }
        `.replaceAll("#", i + "");
	}

	drumSource += `const phaseMask = Config.spectrumNoiseLength - 1;

        const stopIndex = bufferIndex + runLength;
        for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
        `;
	for (let i: number = 0; i < voiceCount; i++) {
		drumSource += `
                const phase#Int = phase# | 0;
                const index# = phase#Int & phaseMask;
                let noiseSample# = wave[index#]
                const phase#Ratio = phase# - phase#Int;
                noiseSample# += (wave[index# + 1] - noiseSample#) * phase#Ratio;
                `.replaceAll("#", i + "");
	}

	const sampleList: string[] = [];
	for (let voice: number = 0; voice < voiceCount; voice++) {
		sampleList.push("noiseSample" + voice + (voice != 0 ? " * unisonSign" : ""));
	}

	drumSource += "let inputSample = " + sampleList.join(" + ") + ";";

	drumSource += `const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
            initialFilterInput2 = initialFilterInput1;
            initialFilterInput1 = inputSample;`;

	for (let i = 0; i < voiceCount; i++) {
		drumSource += `phase# += phaseDelta#;
                phaseDelta# *= phaseDeltaScale#;
                `.replaceAll("#", i + "");
	}

	drumSource += `const output = sample * expression;
            expression += expressionDelta;
            data[sampleIndex] += output;
        }`;

	for (let i: number = 0; i < voiceCount; i++) {
		drumSource +=
			`tone.phases[#] = phase# / `.replaceAll("#", i + "") +
			Config.spectrumNoiseLength +
			`;
            tone.phaseDeltas[#] = phaseDelta# * referenceDelta;
            `.replaceAll("#", i + "");
	}

	drumSource += `tone.expression = expression;
        synth.sanitizeFilters(filters);
        tone.initialNoteFilterInput1 = initialFilterInput1;
        tone.initialNoteFilterInput2 = initialFilterInput2;
    }`;
	return drumSource;
}
