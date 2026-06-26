// supersaw.ts
//
// Purpose: Supersaw synthesis source string builder
//
// This module:
// - Builds supersaw synthesis source strings with PolyBLEP anti-aliasing and comb filtering

export function buildSupersawSource(voiceCount: number): string {
	let supersawSource: string =
		"return (synth, bufferIndex, runLength, tone, instrumentState) => {";

	supersawSource += `
        const data = synth.tempMonoInstrumentSampleBuffer;

        let phaseDelta = tone.phaseDeltas[0];
        const phaseDeltaScale = +tone.phaseDeltaScales[0];
        let expression = +tone.expression;
        const expressionDelta = +tone.expressionDelta;
        `;
	for (let i: number = 0; i < voiceCount; i++) {
		supersawSource += `
                let phase# = tone.phases[#];
                const unisonDetune# = tone.supersawUnisonDetunes[#];
                `.replaceAll("#", `${i}`);
	}

	supersawSource +=
		`
        let dynamism = +tone.supersawDynamism;
        const dynamismDelta = +tone.supersawDynamismDelta;
        let shape = +tone.supersawShape;
        const shapeDelta = +tone.supersawShapeDelta;
        let delayLength = +tone.supersawDelayLength;
        const delayLengthDelta = +tone.supersawDelayLengthDelta;
        const delayLine = tone.supersawDelayLine;
        const delayBufferMask = (delayLine.length - 1) >> 0;
        let delayIndex = tone.supersawDelayIndex | 0;
        delayIndex = (delayIndex & delayBufferMask) + delayLine.length;

        const filters = tone.noteFilters;
        const filterCount = tone.noteFilterCount | 0;
        let initialFilterInput1 = +tone.initialNoteFilterInput1;
        let initialFilterInput2 = +tone.initialNoteFilterInput2;
        const applyFilters = Synth.applyFilters;

        const stopIndex = bufferIndex + runLength;
        for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
            // The phase initially starts at a zero crossing so apply
            // the delta before first sample to get a nonzero value.
            phase0 = (phase0 + phaseDelta) - ((phase0 + phaseDelta) | 0);
            let supersawSample = phase0 - 0.5 * (1.0 + (` +
		voiceCount +
		` - 1.0) * dynamism);
            // This is a PolyBLEP, which smooths out discontinuities at any frequency to reduce aliasing. 
            if (!instrumentState.aliases) {
                if (phase0 < phaseDelta) {
                    let t = phase0 / phaseDelta;
                    supersawSample -= (t + t - t * t - 1) * 0.5;
                } else if (phase0 > 1.0 - phaseDelta) {
                    let t = (phase0 - 1.0) / phaseDelta;
                    supersawSample -= (t + t + t * t + 1) * 0.5;
                }
            }

            if (!instrumentState.aliases) {
            `;

	for (let i: number = 1; i < voiceCount; i++) {
		supersawSource += `
                const detunedPhaseDelta# = phaseDelta * unisonDetune#;
                // The phase initially starts at a zero crossing so apply
                // the delta before first sample to get a nonzero value.
                const aphase# = (phase# + detunedPhaseDelta#) - ((phase# + detunedPhaseDelta#) | 0);
                supersawSample += aphase# * dynamism;

                // This is a PolyBLEP, which smooths out discontinuities at any frequency to reduce aliasing. 
                if (aphase# < detunedPhaseDelta#) {
                    const t = aphase# / detunedPhaseDelta#;
                    supersawSample -= (t + t - t * t - 1) * 0.5 * dynamism;
                } else if (aphase# > 1.0 - detunedPhaseDelta#) {
                    const t = (aphase# - 1.0) / detunedPhaseDelta#;
                    supersawSample -= (t + t + t * t + 1) * 0.5 * dynamism;
                }
                phase# = aphase#;
                `.replaceAll("#", `${i}`);
	}

	supersawSource += `
            } else {
             `;
	for (let i: number = 1; i < voiceCount; i++) {
		supersawSource += `
                const detunedPhaseDelta# = phaseDelta * unisonDetune#;
                // The phase initially starts at a zero crossing so apply
                // the delta before first sample to get a nonzero value.
                phase# = (phase# + detunedPhaseDelta#) - ((phase# + detunedPhaseDelta#) | 0);
                supersawSample += phase# * dynamism;
                `.replaceAll("#", `${i}`);
	}
	supersawSource += `
            }
            delayLine[delayIndex & delayBufferMask] = supersawSample;
            const delaySampleTime = delayIndex - delayLength;
            const lowerIndex = delaySampleTime | 0;
            const upperIndex = lowerIndex + 1;
            const delayRatio = delaySampleTime - lowerIndex;
            const prevDelaySample = delayLine[lowerIndex & delayBufferMask];
            const nextDelaySample = delayLine[upperIndex & delayBufferMask];
            const delaySample = prevDelaySample + (nextDelaySample - prevDelaySample) * delayRatio;
            delayIndex++;

            const inputSample = supersawSample - delaySample * shape;
            const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
            initialFilterInput2 = initialFilterInput1;
            initialFilterInput1 = inputSample;

            phaseDelta *= phaseDeltaScale;
            dynamism += dynamismDelta;
            shape += shapeDelta;
            delayLength += delayLengthDelta;

            const output = sample * expression;
            expression += expressionDelta;

            data[sampleIndex] += output;
        }`;
	for (let i: number = 0; i < voiceCount; i++) {
		supersawSource += `
            tone.phases[#] = phase#;
            `.replaceAll("#", `${i}`);
	}
	supersawSource += `
        tone.phaseDeltas[0] = phaseDelta;
        tone.expression = expression;
        tone.supersawDynamism = dynamism;
        tone.supersawShape = shape;
        tone.supersawDelayLength = delayLength;
        tone.supersawDelayIndex = delayIndex;

        synth.sanitizeFilters(filters);
        tone.initialNoteFilterInput1 = initialFilterInput1;
        tone.initialNoteFilterInput2 = initialFilterInput2;
        }`;
	return supersawSource;
}
