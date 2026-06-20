// picked-string.ts
//
// Purpose: Picked string (Karplus-Strong) synthesis source string builder
//
// This module:
// - Builds picked-string synthesis source strings with all-pass dispersion and sustain filters

export function buildPickedStringSource(voiceCount: number): string {
	let pickedStringSource: string = "return (synth, bufferIndex, runLength, tone, instrumentState) => {";

	pickedStringSource += `
				const data = synth.tempMonoInstrumentSampleBuffer;
				
				let pickedString# = tone.pickedStrings[#];
				let allPassSample# = +pickedString#.allPassSample;
				let allPassPrevInput# = +pickedString#.allPassPrevInput;
				let sustainFilterSample# = +pickedString#.sustainFilterSample;
				let sustainFilterPrevOutput2# = +pickedString#.sustainFilterPrevOutput2;
				let sustainFilterPrevInput1# = +pickedString#.sustainFilterPrevInput1;
				let sustainFilterPrevInput2# = +pickedString#.sustainFilterPrevInput2;
				let fractionalDelaySample# = +pickedString#.fractionalDelaySample;
				const delayLine# = pickedString#.delayLine;
				const delayBufferMask# = (delayLine#.length - 1) >> 0;
				let delayIndex# = pickedString#.delayIndex|0;
				delayIndex# = (delayIndex# & delayBufferMask#) + delayLine#.length;
				let delayLength# = +pickedString#.prevDelayLength;
				const delayLengthDelta# = +pickedString#.delayLengthDelta;
				let allPassG# = +pickedString#.allPassG;
				let sustainFilterA1# = +pickedString#.sustainFilterA1;
				let sustainFilterA2# = +pickedString#.sustainFilterA2;
				let sustainFilterB0# = +pickedString#.sustainFilterB0;
				let sustainFilterB1# = +pickedString#.sustainFilterB1;
				let sustainFilterB2# = +pickedString#.sustainFilterB2;
				const allPassGDelta# = +pickedString#.allPassGDelta;
				const sustainFilterA1Delta# = +pickedString#.sustainFilterA1Delta;
				const sustainFilterA2Delta# = +pickedString#.sustainFilterA2Delta;
				const sustainFilterB0Delta# = +pickedString#.sustainFilterB0Delta;
				const sustainFilterB1Delta# = +pickedString#.sustainFilterB1Delta;
				const sustainFilterB2Delta# = +pickedString#.sustainFilterB2Delta;
				
				let expression = +tone.expression;
				const expressionDelta = +tone.expressionDelta;
				
				const unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;
                if (instrumentState.unisonVoices == 1 && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) tone.phases[1] = tone.phases[0];
				const delayResetOffset# = pickedString#.delayResetOffset|0;
				
				const filters = tone.noteFilters;
				const filterCount = tone.noteFilterCount|0;
				let initialFilterInput1 = +tone.initialNoteFilterInput1;
				let initialFilterInput2 = +tone.initialNoteFilterInput2;
				const applyFilters = Synth.applyFilters;
				
				const stopIndex = bufferIndex + runLength;
				for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
					const targetSampleTime# = delayIndex# - delayLength#;
					const lowerIndex# = (targetSampleTime# + 0.125) | 0; // Offset to improve stability of all-pass filter.
					const upperIndex# = lowerIndex# + 1;
					const fractionalDelay# = upperIndex# - targetSampleTime#;
					const fractionalDelayG# = (1.0 - fractionalDelay#) / (1.0 + fractionalDelay#); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay
					const prevInput# = delayLine#[lowerIndex# & delayBufferMask#];
					const input# = delayLine#[upperIndex# & delayBufferMask#];
					fractionalDelaySample# = fractionalDelayG# * input# + prevInput# - fractionalDelayG# * fractionalDelaySample#;
					
					allPassSample# = fractionalDelaySample# * allPassG# + allPassPrevInput# - allPassG# * allPassSample#;
					allPassPrevInput# = fractionalDelaySample#;
					
					const sustainFilterPrevOutput1# = sustainFilterSample#;
					sustainFilterSample# = sustainFilterB0# * allPassSample# + sustainFilterB1# * sustainFilterPrevInput1# + sustainFilterB2# * sustainFilterPrevInput2# - sustainFilterA1# * sustainFilterSample# - sustainFilterA2# * sustainFilterPrevOutput2#;
					sustainFilterPrevOutput2# = sustainFilterPrevOutput1#;
					sustainFilterPrevInput2# = sustainFilterPrevInput1#;
					sustainFilterPrevInput1# = allPassSample#;
					
					delayLine#[delayIndex# & delayBufferMask#] += sustainFilterSample#;
					delayLine#[(delayIndex# + delayResetOffset#) & delayBufferMask#] = 0.0;
					delayIndex#++;
					
					const inputSample = (`;

	const sampleList: string[] = [];
	for (let voice: number = 0; voice < voiceCount; voice++) {
		sampleList.push(`fractionalDelaySample${voice}${voice !== 0 ? " * unisonSign" : ""}`);
	}

	pickedStringSource += sampleList.join(" + ");

	pickedStringSource += `) * expression;
					const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
					initialFilterInput2 = initialFilterInput1;
					initialFilterInput1 = inputSample;
					data[sampleIndex] += sample;
					
					expression += expressionDelta;
					delayLength# += delayLengthDelta#;
					allPassG# += allPassGDelta#;
					sustainFilterA1# += sustainFilterA1Delta#;
					sustainFilterA2# += sustainFilterA2Delta#;
					sustainFilterB0# += sustainFilterB0Delta#;
					sustainFilterB1# += sustainFilterB1Delta#;
					sustainFilterB2# += sustainFilterB2Delta#;
				}
				
				// Avoid persistent denormal or NaN values in the delay buffers and filter history.
				const epsilon = (1.0e-24);
				if (!Number.isFinite(allPassSample#) || Math.abs(allPassSample#) < epsilon) allPassSample# = 0.0;
				if (!Number.isFinite(allPassPrevInput#) || Math.abs(allPassPrevInput#) < epsilon) allPassPrevInput# = 0.0;
				if (!Number.isFinite(sustainFilterSample#) || Math.abs(sustainFilterSample#) < epsilon) sustainFilterSample# = 0.0;
				if (!Number.isFinite(sustainFilterPrevOutput2#) || Math.abs(sustainFilterPrevOutput2#) < epsilon) sustainFilterPrevOutput2# = 0.0;
				if (!Number.isFinite(sustainFilterPrevInput1#) || Math.abs(sustainFilterPrevInput1#) < epsilon) sustainFilterPrevInput1# = 0.0;
				if (!Number.isFinite(sustainFilterPrevInput2#) || Math.abs(sustainFilterPrevInput2#) < epsilon) sustainFilterPrevInput2# = 0.0;
				if (!Number.isFinite(fractionalDelaySample#) || Math.abs(fractionalDelaySample#) < epsilon) fractionalDelaySample# = 0.0;
				pickedString#.allPassSample = allPassSample#;
				pickedString#.allPassPrevInput = allPassPrevInput#;
				pickedString#.sustainFilterSample = sustainFilterSample#;
				pickedString#.sustainFilterPrevOutput2 = sustainFilterPrevOutput2#;
				pickedString#.sustainFilterPrevInput1 = sustainFilterPrevInput1#;
				pickedString#.sustainFilterPrevInput2 = sustainFilterPrevInput2#;
				pickedString#.fractionalDelaySample = fractionalDelaySample#;
				pickedString#.delayIndex = delayIndex#;
				pickedString#.prevDelayLength = delayLength#;
				pickedString#.allPassG = allPassG#;
				pickedString#.sustainFilterA1 = sustainFilterA1#;
				pickedString#.sustainFilterA2 = sustainFilterA2#;
				pickedString#.sustainFilterB0 = sustainFilterB0#;
				pickedString#.sustainFilterB1 = sustainFilterB1#;
				pickedString#.sustainFilterB2 = sustainFilterB2#;
				
				tone.expression = expression;
				
				synth.sanitizeFilters(filters);
				tone.initialNoteFilterInput1 = initialFilterInput1;
				tone.initialNoteFilterInput2 = initialFilterInput2;
			}`;

	// Duplicate lines containing "#" for each voice and replace the "#" with the voice index.
	pickedStringSource = pickedStringSource.replace(/^.*#.*$/gm, (line) => {
		const lines: string[] = [];
		for (let voice: number = 0; voice < voiceCount; voice++) {
			lines.push(line.replace(/#/g, String(voice)));
		}
		return lines.join("\n");
	});

	return pickedStringSource;
}
