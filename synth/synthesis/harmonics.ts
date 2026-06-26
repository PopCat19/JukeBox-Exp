// harmonics.ts
//
// Purpose: Harmonics synthesis source string builder
//
// This module:
// - Builds harmonics synthesis source strings with band-limited waveform rendering

export function buildHarmonicsSource(voiceCount: number): string {
	let harmonicsSource: string =
		"return (synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState) => {";

	harmonicsSource += `
        const data = synth.tempMonoInstrumentSampleBuffer;
        const wave = instrumentState.wave;
        const waveLength = wave.length - 1; // The first sample is duplicated at the end, don't double-count it.

        const unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;
        let expression = +tone.expression;
        const expressionDelta = +tone.expressionDelta;
         `;
	for (let i: number = 0; i < voiceCount; i++) {
		harmonicsSource += `let phaseDelta# = tone.phaseDeltas[#] * waveLength;
            let phaseDeltaScale# = +tone.phaseDeltaScales[#];

            if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) tone.phases[#] = tone.phases[# - 1];
            `.replaceAll("#", `${i}`);
	}

	for (let i: number = 0; i < voiceCount; i++) {
		harmonicsSource += `let phase# = (tone.phases[#] - (tone.phases[#] | 0)) * waveLength;
            `.replaceAll("#", `${i}`);
	}

	harmonicsSource += `const filters = tone.noteFilters;
        const filterCount = tone.noteFilterCount | 0;
        let initialFilterInput1 = +tone.initialNoteFilterInput1;
        let initialFilterInput2 = +tone.initialNoteFilterInput2;
        const applyFilters = Synth.applyFilters;
        `;

	for (let i: number = 0; i < voiceCount; i++) {
		harmonicsSource += `const phase#Int = phase# | 0;
            const index# = phase#Int % waveLength;
            prevWaveIntegral# = +wave[index#]
            const phase#Ratio = phase# - phase#Int;
            prevWaveIntegral# += (wave[index# + 1] - prevWaveIntegral#) * phase#Ratio;
            `.replaceAll("#", `${i}`);
	}

	harmonicsSource += `const stopIndex = bufferIndex + roundedSamplesPerTick;
        for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
        `;
	for (let i: number = 0; i < voiceCount; i++) {
		harmonicsSource += `
                        phase# += phaseDelta#;
                        const phase#Int = phase# | 0;
                        const index# = phase#Int % waveLength;
                        let nextWaveIntegral# = wave[index#]
                        const phase#Ratio = phase# - phase#Int;
                        nextWaveIntegral# += (wave[index# + 1] - nextWaveIntegral#) * phase#Ratio;
                        const wave# = (nextWaveIntegral# - prevWaveIntegral#) / phaseDelta#;
                        prevWaveIntegral# = nextWaveIntegral#;
                        let inputSample# = wave#;
                        `.replaceAll("#", `${i}`);
	}
	const sampleList: string[] = [];
	for (let voice: number = 0; voice < voiceCount; voice++) {
		sampleList.push(`inputSample${voice}${voice !== 0 ? " * unisonSign" : ""}`);
	}

	harmonicsSource += `inputSample = ${sampleList.join(" + ")};`;

	harmonicsSource += `const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
            initialFilterInput2 = initialFilterInput1;
            initialFilterInput1 = inputSample;`;

	for (let i = 0; i < voiceCount; i++) {
		harmonicsSource += `
                phaseDelta# *= phaseDeltaScale#;
                `.replaceAll("#", `${i}`);
	}

	harmonicsSource += `const output = sample * expression;
            expression += expressionDelta;
            data[sampleIndex] += output;
        }
            `;

	for (let i: number = 0; i < voiceCount; i++) {
		harmonicsSource += `tone.phases[#] = phase# / waveLength;
            tone.phaseDeltas[#] = phaseDelta# / waveLength;
            `.replaceAll("#", `${i}`);
	}

	harmonicsSource += "tone.expression = expression;";

	harmonicsSource += `
        synth.sanitizeFilters(filters);
        tone.initialNoteFilterInput1 = initialFilterInput1;
        tone.initialNoteFilterInput2 = initialFilterInput2;
    }`;
	return harmonicsSource;
}
