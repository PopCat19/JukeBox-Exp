// spectrum.ts
//
// Purpose: Spectrum synthesis source string builder
//
// This module:
// - Builds spectrum synthesis source strings with band-limited interpolation

import { Config } from "../synth-config";

export function buildSpectrumSource(voiceCount: number): string {
	let spectrumSource: string = "return (synth, bufferIndex, runLength, tone, instrumentState) => {";

	spectrumSource += `
        const data = synth.tempMonoInstrumentSampleBuffer;
        const wave = instrumentState.wave;
        const samplesInPeriod = (1 << 7);

        const unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;
        `;
	for (let i: number = 0; i < voiceCount; i++) {
		spectrumSource += `
                if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) tone.phases[#] = tone.phases[#-1];
                let phaseDelta# = tone.phaseDeltas[#] * samplesInPeriod;
                let phaseDeltaScale# = +tone.phaseDeltaScales[#];
                let noiseSample# = +tone.noiseSamples[#];
                // This is for a "legacy" style simplified 1st order lowpass filter with
                // a cutoff frequency that is relative to the tone's fundamental frequency.
                const pitchRelativefilter# = Math.min(1.0, phaseDelta#);
                `.replaceAll("#", `${i}`);
	}

	spectrumSource += `
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
		spectrumSource += `let phase# = (tone.phases[#] - (tone.phases[#] | 0)) * Config.spectrumNoiseLength;
                `.replaceAll("#", `${i}`);
	}
	spectrumSource += `
            if (tone.phases[0] == 0.0) {
                // Zero phase means the tone was reset, just give noise a random start phase instead.
                phase0 = Synth.findRandomZeroCrossing(wave, Config.spectrumNoiseLength) + phaseDelta0;
            `;
	for (let i: number = 1; i < voiceCount; i++) {
		spectrumSource += `
                if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) {
                    phase# = phase0;
                }
            `.replaceAll("#", `${i}`);
	}
	spectrumSource += `}`;
	for (let i: number = 1; i < voiceCount; i++) {
		spectrumSource += `
                if (tone.phases[#] == 0.0 && !(instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval)) {
                    // Zero phase means the tone was reset, just give noise a random start phase instead.
                phase# = Synth.findRandomZeroCrossing(wave, Config.spectrumNoiseLength) + phaseDelta#;
                }
            `.replaceAll("#", `${i}`);
	}
	spectrumSource += `
        const stopIndex = bufferIndex + runLength;
        for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {`;

	for (let i: number = 0; i < voiceCount; i++) {
		spectrumSource += `
                const phase#Int = phase# | 0;
                const index# = phase#Int & phaseMask;
                let waveSample# = wave[index#]
                const phase#Ratio = phase# - phase#Int;
                waveSample# += (wave[index# + 1] - waveSample#) * phase#Ratio;

                noiseSample# += (waveSample# - noiseSample#) * pitchRelativefilter#;
                `.replaceAll("#", `${i}`);
	}

	const sampleList: string[] = [];
	for (let voice: number = 0; voice < voiceCount; voice++) {
		sampleList.push(`noiseSample${voice}${voice !== 0 ? " * unisonSign" : ""}`);
	}

	spectrumSource += `let inputSample = ${sampleList.join(" + ")};`;

	spectrumSource += `const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
            initialFilterInput2 = initialFilterInput1;
            initialFilterInput1 = inputSample;`;

	for (let i = 0; i < voiceCount; i++) {
		spectrumSource += `phase# += phaseDelta#;
                phaseDelta# *= phaseDeltaScale#;
                `.replaceAll("#", `${i}`);
	}

	spectrumSource += `const output = sample * expression;
            expression += expressionDelta;
            data[sampleIndex] += output;
        }`;

	for (let i: number = 0; i < voiceCount; i++) {
		spectrumSource +=
			`tone.phases[#] = phase# / `.replaceAll("#", `${i}`) +
			Config.spectrumNoiseLength +
			`;
            tone.phaseDeltas[#] = phaseDelta# / samplesInPeriod;
            `.replaceAll("#", `${i}`);
	}

	spectrumSource += "tone.expression = expression;";
	for (let i: number = 0; i < voiceCount; i++) {
		spectrumSource += `tone.noiseSamples[#] = noiseSample#;
             `.replaceAll("#", `${i}`);
	}

	spectrumSource += `
        synth.sanitizeFilters(filters);
        tone.initialNoteFilterInput1 = initialFilterInput1;
        tone.initialNoteFilterInput2 = initialFilterInput2;
    }`;
	return spectrumSource;
}
