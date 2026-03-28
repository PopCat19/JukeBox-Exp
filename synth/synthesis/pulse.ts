// synth/synthesis/pulse.ts
//
// Purpose: Pulse width modulation synthesis source string builder
//
// This module:
// - Builds pulse width synthesis source strings with PolyBLEP anti-aliasing

export function buildPulseWidthSource(voiceCount: number): string {
  let pulseSource: string = "return (synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState) => {";

  pulseSource += `
        const data = synth.tempMonoInstrumentSampleBuffer;

        const unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;

        let expression = +tone.expression;
        const expressionDelta = +tone.expressionDelta;
        `;
  for (let i: number = 0; i < voiceCount; i++) {
    pulseSource += `let phaseDelta# = tone.phaseDeltas[#];
            let phaseDeltaScale# = +tone.phaseDeltaScales[#];

            if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) tone.phases[#] = tone.phases[# - 1];
            `.replaceAll("#", i + "");
  }

  for (let i: number = 0; i < voiceCount; i++) {
    pulseSource += `phase# = (tone.phases[#] - (tone.phases[#] | 0));
            `.replaceAll("#", i + "");
  }

  pulseSource += `let pulseWidth = tone.pulseWidth;
        const pulseWidthDelta = tone.pulseWidthDelta;

        const filters = tone.noteFilters;
        const filterCount = tone.noteFilterCount | 0;
        let initialFilterInput1 = +tone.initialNoteFilterInput1;
        let initialFilterInput2 = +tone.initialNoteFilterInput2;
        const applyFilters = Synth.applyFilters;

        const stopIndex = bufferIndex + roundedSamplesPerTick;
        for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
        `;

  for (let i: number = 0; i < voiceCount; i++) {
    pulseSource += `const sawPhaseA# = phase# - (phase# | 0);
                const sawPhaseB# = (phase# + pulseWidth) - ((phase# + pulseWidth) | 0);
                let pulseWave# = sawPhaseB# - sawPhaseA#;
                if (!instrumentState.aliases) {
                    if (sawPhaseA# < phaseDelta#) {
                        let t = sawPhaseA# / phaseDelta#;
                        pulseWave# += (t + t - t * t - 1) * 0.5;
                    } else if (sawPhaseA# > 1.0 - phaseDelta#) {
                        let t = (sawPhaseA# - 1.0) / phaseDelta#;
                        pulseWave# += (t + t + t * t + 1) * 0.5;
                    }
                    if (sawPhaseB# < phaseDelta#) {
                        let t = sawPhaseB# / phaseDelta#;
                        pulseWave# -= (t + t - t * t - 1) * 0.5;
                    } else if (sawPhaseB# > 1.0 - phaseDelta#) {
                        let t = (sawPhaseB# - 1.0) / phaseDelta#;
                        pulseWave# -= (t + t + t * t + 1) * 0.5;
                    }
                }

                `.replaceAll("#", i + "");
  }
  const sampleList: string[] = [];
  for (let voice: number = 0; voice < voiceCount; voice++) {
    sampleList.push("pulseWave" + voice + (voice != 0 ? " * unisonSign" : ""));
  }

  pulseSource += "let inputSample = " + sampleList.join(" + ") + ";";

  pulseSource +=
    `const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);
            initialFilterInput2 = initialFilterInput1;
            initialFilterInput1 = inputSample;`;

  for (let i = 0; i < voiceCount; i++) {
    pulseSource += `phase# += phaseDelta#;
                phaseDelta# *= phaseDeltaScale#;
                `.replaceAll("#", i + "");
  }

  pulseSource += `pulseWidth += pulseWidthDelta;

            const output = sample * expression;
            expression += expressionDelta;
            data[sampleIndex] += output;
        }`;

  for (let i: number = 0; i < voiceCount; i++) {
    pulseSource += `tone.phases[#] = phase#;
            tone.phaseDeltas[#] = phaseDelta#;
                `.replaceAll("#", i + "");
  }

  pulseSource += `tone.expression = expression;
        tone.pulseWidth = pulseWidth;

        synth.sanitizeFilters(filters);
        tone.initialNoteFilterInput1 = initialFilterInput1;
        tone.initialNoteFilterInput2 = initialFilterInput2;
    }`;
  return pulseSource;
}
