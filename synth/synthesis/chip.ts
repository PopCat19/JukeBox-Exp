// synth/synthesis/chip.ts
//
// Purpose: Chip and loopable chip synthesis source string builders
//
// This module:
// - Builds chip wave synthesis source strings with advanced loop controls
// - Builds loopable chip synthesis source strings with declicking

import { effectsIncludeDistortion } from "../synth-config";
void effectsIncludeDistortion; // Used in generated source string at runtime

export function buildLoopableChipSource(voiceCount: number): string {
    let chipSource: string = "return (synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState) => {";


    chipSource += `
            const aliases = (effectsIncludeDistortion(instrumentState.effects) && instrumentState.aliases);
            // const aliases = false;
            const data = synth.tempMonoInstrumentSampleBuffer;
            const wave = instrumentState.wave;
            const volumeScale = instrumentState.volumeScale;
            const waveLength = (aliases && instrumentState.type == 8) ? wave.length : wave.length - 1;

            let chipWaveLoopEnd = Math.max(0, Math.min(waveLength, instrumentState.chipWaveLoopEnd));
            let chipWaveLoopStart = Math.max(0, Math.min(chipWaveLoopEnd - 1, instrumentState.chipWaveLoopStart));
            `
    // @TODO: This is where to set things up for the release loop mode.
    // const ticksSinceReleased = tone.ticksSinceReleased;
    // if (ticksSinceReleased > 0) {
    //     chipWaveLoopStart = 0;
    //     chipWaveLoopEnd = waveLength - 1;
    // }
    chipSource += `
            let chipWaveLoopLength = chipWaveLoopEnd - chipWaveLoopStart;
            if (chipWaveLoopLength < 2) {
                chipWaveLoopStart = 0;
                chipWaveLoopEnd = waveLength;
                chipWaveLoopLength = waveLength;
            }
            const chipWaveLoopMode = instrumentState.chipWaveLoopMode;
            const chipWavePlayBackwards = instrumentState.chipWavePlayBackwards;
            const unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;
            if(instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) {
            `
    for (let i: number = 1; i < voiceCount; i++) {
        chipSource += `
                if (instrumentState.unisonVoices <= #)
                    tone.phases[#] = tone.phases[#-1];
                `.replaceAll("#", i + "");
    }
    chipSource += `
            }`
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                let phaseDelta# = tone.phaseDeltas[#] * waveLength;
                let direction# = tone.directions[#];
                let chipWaveCompletion# = tone.chipWaveCompletions[#];

                `.replaceAll("#", i + "");
    }

    chipSource += `
            if (chipWaveLoopMode === 3 || chipWaveLoopMode === 2 || chipWaveLoopMode === 0) {
                // If playing once or looping, we force the correct direction,
                // since it shouldn't really change. This is mostly so that if
                // the mode is changed midway through playback, it won't get
                // stuck on the wrong direction.
                if (!chipWavePlayBackwards) {`
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                        direction# = 1;
                        `.replaceAll("#", i + "");
    }
    chipSource += `} else {`
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                        direction# = -1;
                        `.replaceAll("#", i + "");
    }
    chipSource += `
                }
            }
            if (chipWaveLoopMode === 0 || chipWaveLoopMode === 1) {`
    // If looping or ping-ponging, we clear the completion status,
    // as it's not relevant anymore. This is mostly so that if the
    // mode is changed midway through playback, it won't get stuck
    // on zero volume.
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                    chipWaveCompletion# = 0;
                    `.replaceAll("#", i + "");
    }
    chipSource += `    
            }
            
            const chipWaveCompletionFadeLength = 1000;
            let expression = +tone.expression;
            const expressionDelta = +tone.expressionDelta;
            `
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                let lastWave# = tone.chipWaveCompletionsLastWave[#];
                const phaseDeltaScale# = +tone.phaseDeltaScales[#];
                let phase# = Synth.wrap(tone.phases[#], 1) * waveLength;
                let prevWaveIntegral# = 0;

                `.replaceAll("#", i + "");
    }
    chipSource += `
            if (!aliases) {
            `
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                    const phase#Int = Math.floor(phase#);
                    const index# = Synth.wrap(phase#Int, waveLength);
                    const phaseRatio# = phase# - phase#Int;
                    prevWaveIntegral# = +wave[index#];
                    prevWaveIntegral# += (wave[Synth.wrap(index# + 1, waveLength)] - prevWaveIntegral#) * phaseRatio#;
                    `.replaceAll("#", i + "");
    }
    chipSource += `
            }
            const filters = tone.noteFilters;
            const filterCount = tone.noteFilterCount | 0;
            let initialFilterInput1 = +tone.initialNoteFilterInput1;
            let initialFilterInput2 = +tone.initialNoteFilterInput2;
            const applyFilters = Synth.applyFilters;
            const stopIndex = bufferIndex + roundedSamplesPerTick;
            `
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                let prevWave# = tone.chipWavePrevWaves[#];

                `.replaceAll("#", i + "");
    }
    chipSource += `
            for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
                let wrapped = 0;
            `
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                    if (chipWaveCompletion# > 0 && chipWaveCompletion# < chipWaveCompletionFadeLength) {
                        chipWaveCompletion#++;
                    }
                    phase# += phaseDelta# * direction#;

                    `.replaceAll("#", i + "");
    }
    chipSource += `
                if (chipWaveLoopMode === 2) {
                `
    // once
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                        if (direction# === 1) {
                            if (phase# > waveLength) {
                                if (chipWaveCompletion# <= 0) {
                                    lastWave# = prevWave#;
                                    chipWaveCompletion#++;
                                }
                                wrapped = #;
                            }
                        } else if (direction# === -1) {
                            if (phase# < 0) {
                                if (chipWaveCompletion# <= 0) {
                                    lastWave# = prevWave#;
                                    chipWaveCompletion#++;
                                }
                                wrapped = 1;
                            }
                        }

                        `.replaceAll("#", i + "");
    }
    chipSource += `
                } else if (chipWaveLoopMode === 3) {
                `
    // loop once
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                        if (direction# === 1) {
                            if (phase# > chipWaveLoopEnd) {
                                if (chipWaveCompletion# <= 0) {
                                    lastWave# = prevWave#;
                                    chipWaveCompletion#++;
                                }
                                wrapped = 1;
                            }
                        } else if (direction# === -1) {
                            if (phase# < chipWaveLoopStart) {
                                if (chipWaveCompletion# <= 0) {
                                    lastWave# = prevWave#;
                                    chipWaveCompletion#++;
                                }
                                wrapped = 1;
                            }
                        }

                        `.replaceAll("#", i + "");
    }
    chipSource += `
                } else if (chipWaveLoopMode === 0) {
                `
    // loop
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                        if (direction# === 1) {
                            if (phase# > chipWaveLoopEnd) {
                                phase# = chipWaveLoopStart + Synth.wrap(phase# - chipWaveLoopEnd, chipWaveLoopLength);
                                // phase# = chipWaveLoopStart;
                                wrapped = 1;
                            }
                        } else if (direction# === -1) {
                            if (phase# < chipWaveLoopStart) {
                                phase# = chipWaveLoopEnd - Synth.wrap(chipWaveLoopStart - phase#, chipWaveLoopLength);
                                // phase# = chipWaveLoopEnd;
                                wrapped = 1;
                            }
                        }

                        `.replaceAll("#", i + "");
    }
    chipSource += `    
                } else if (chipWaveLoopMode === 1) {
                `
    // ping-pong
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                        if (direction# === 1) {
                            if (phase# > chipWaveLoopEnd) {
                                phase# = chipWaveLoopEnd - Synth.wrap(phase# - chipWaveLoopEnd, chipWaveLoopLength);
                                // phase# = chipWaveLoopEnd;
                                direction# = -1;
                                wrapped = 1;
                            }
                        } else if (direction# === -1) {
                            if (phase# < chipWaveLoopStart) {
                                phase# = chipWaveLoopStart + Synth.wrap(chipWaveLoopStart - phase#, chipWaveLoopLength);
                                // phase# = chipWaveLoopStart;
                                direction# = 1;
                                wrapped = 1;
                            }
                        }

                        `.replaceAll("#", i + "");
    }
    chipSource += `    
                }
                `
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                    let wave# = 0;
                    `.replaceAll("#", i + "");
    }
    chipSource += `    
                let inputSample = 0;
                if (aliases) {
                    inputSample = 0;
                `
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                        wave# = wave[Synth.wrap(Math.floor(phase#), waveLength)];
                        prevWave# = wave#;
                        const completionFade# = chipWaveCompletion# > 0 ? ((chipWaveCompletionFadeLength - Math.min(chipWaveCompletion#, chipWaveCompletionFadeLength)) / chipWaveCompletionFadeLength) : 1;
                        
                        if (chipWaveCompletion# > 0) {
                            inputSample += lastWave# * completionFade#;
                        } else {
                            inputSample += wave#;
                        }
                        `.replaceAll("#", i + "");
    }
    chipSource += `   
                } else {
                `
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                        const phase#Int = Math.floor(phase#);
                        const index# = Synth.wrap(phase#Int, waveLength);
                        let nextWaveIntegral# = wave[index#];
                        const phaseRatio# = phase# - phase#Int;
                        nextWaveIntegral# += (wave[Synth.wrap(index# + 1, waveLength)] - nextWaveIntegral#) * phaseRatio#;
                        `.replaceAll("#", i + "");
    }

    chipSource += `
                    if (!(chipWaveLoopMode === 0 && chipWaveLoopStart === 0 && chipWaveLoopEnd === waveLength) && wrapped !== 0) {
                    `
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                            let pwi# = 0;
                            const phase#_ = Math.max(0, phase# - phaseDelta# * direction#);
                            const phase#Int = Math.floor(phase#_);
                            const index# = Synth.wrap(phase#Int, waveLength);
                            pwi# = wave[index#];
                            pwi# += (wave[Synth.wrap(index# + 1, waveLength)] - pwi#) * (phase#_ - phase#Int) * direction#;
                            prevWaveIntegral# = pwi#;
                            `.replaceAll("#", i + "");
    }
    chipSource += `    
                    }
                    if (chipWaveLoopMode === 1 && wrapped !== 0) {
                    `
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                            wave# = prevWave#;
                            `.replaceAll("#", i + "");
    }
    chipSource += `
                    } else {
                    `
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                            wave# = (nextWaveIntegral# - prevWaveIntegral#) / (phaseDelta# * direction#);
                            `.replaceAll("#", i + "");
    }
    chipSource += `
                    }
                    `
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                        prevWave# = wave#;
                        prevWaveIntegral# = nextWaveIntegral#;
                        const completionFade# = chipWaveCompletion# > 0 ? ((chipWaveCompletionFadeLength - Math.min(chipWaveCompletion#, chipWaveCompletionFadeLength)) / chipWaveCompletionFadeLength) : 1;
                        if (chipWaveCompletion# > 0) {
                            inputSample += lastWave# * completionFade#;
                        } else {
                            inputSample += wave#;
                        }
                        `.replaceAll("#", i + "");
    }
    chipSource += `
                }
                const sample = applyFilters(inputSample * volumeScale, initialFilterInput1, initialFilterInput2, filterCount, filters);
                initialFilterInput2 = initialFilterInput1;
                initialFilterInput1 = inputSample * volumeScale;
                const output = sample * expression;
                expression += expressionDelta;
                data[sampleIndex] += output;
                `
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                    phaseDelta# *= phaseDeltaScale#;
                    `.replaceAll("#", i + "");
    }
    chipSource += `
            }
            `
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `
                tone.phases[#] = phase# / waveLength;
                tone.phaseDeltas[#] = phaseDelta# / waveLength;
                tone.directions[#] = direction#;
                tone.chipWaveCompletions[#] = chipWaveCompletion#;
                tone.chipWavePrevWaves[#] = prevWave#;
                tone.chipWaveCompletionsLastWave[#] = lastWave#;
                
                `.replaceAll("#", i + "");
    }

    chipSource += `
            tone.expression = expression;
            synth.sanitizeFilters(filters);
            tone.initialNoteFilterInput1 = initialFilterInput1;
            tone.initialNoteFilterInput2 = initialFilterInput2;
        }`
    return chipSource;
}

export function buildChipSource(voiceCount: number): string {
    let chipSource: string = "return (synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState) => {";


    chipSource += `
        const aliases = (effectsIncludeDistortion(instrumentState.effects) && instrumentState.aliases);
        const data = synth.tempMonoInstrumentSampleBuffer;
        const wave = instrumentState.wave;
        const volumeScale = instrumentState.volumeScale;

        const waveLength = (aliases && instrumentState.type == 8) ? wave.length : wave.length - 1;

        const unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;
        let expression = +tone.expression;
        const expressionDelta = +tone.expressionDelta;
        `
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `let phaseDelta# = tone.phaseDeltas[#] * waveLength;
            let phaseDeltaScale# = +tone.phaseDeltaScales[#];

            if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) tone.phases[#] = tone.phases[# - 1];
            `.replaceAll("#", i + "");
    }

    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `let phase# = (tone.phases[#] - (tone.phases[#] | 0)) * waveLength;
            let prevWaveIntegral# = 0.0;
            `.replaceAll("#", i + "");
    }

    chipSource += `const filters = tone.noteFilters;
        const filterCount = tone.noteFilterCount | 0;
        let initialFilterInput1 = +tone.initialNoteFilterInput1;
        let initialFilterInput2 = +tone.initialNoteFilterInput2;
        const applyFilters = Synth.applyFilters;

        if (!aliases) {
        `
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `const phase#Int = phase# | 0;
                const index# = phase#Int % waveLength;
                prevWaveIntegral# = +wave[index#]
                const phase#Ratio = phase# - phase#Int;
                prevWaveIntegral# += (wave[index# + 1] - prevWaveIntegral#) * phase#Ratio;
                `.replaceAll("#", i + "");
    }
    chipSource += `
        } 

        const stopIndex = bufferIndex + roundedSamplesPerTick;
        for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {
        let inputSample = 0;
            if (aliases) {
                `;
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `phase# += phaseDelta#;

                    const inputSample# = wave[(0 | phase#) % waveLength];
                    `.replaceAll("#", i + "");
    }
    const sampleListA: string[] = [];
    for (let voice: number = 0; voice < voiceCount; voice++) {
        sampleListA.push("inputSample" + voice + (voice != 0 ? " * unisonSign" : ""));
    }

    chipSource += "inputSample = " + sampleListA.join(" + ") + ";";
    chipSource += `} else {
                    `;
    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `phase# += phaseDelta#;

                     
                        const phase#Int = phase# | 0;
                        const index# = phase#Int % waveLength;
                        let nextWaveIntegral# = wave[index#]
                        const phase#Ratio = phase# - phase#Int;
                        nextWaveIntegral# += (wave[index# + 1] - nextWaveIntegral#) * phase#Ratio;
                        const wave# = (nextWaveIntegral# - prevWaveIntegral#) / phaseDelta#;
                        prevWaveIntegral# = nextWaveIntegral#;
                        let inputSample# = wave#;
                        `.replaceAll("#", i + "");
    }
    const sampleListB: string[] = [];
    for (let voice: number = 0; voice < voiceCount; voice++) {
        sampleListB.push("inputSample" + voice + (voice != 0 ? " * unisonSign" : ""));
    }

    chipSource += "inputSample = " + sampleListB.join(" + ") + ";";
    chipSource += `}
        `;


    chipSource += `const sample = applyFilters(inputSample * volumeScale, initialFilterInput1, initialFilterInput2, filterCount, filters);
            initialFilterInput2 = initialFilterInput1;
            initialFilterInput1 = inputSample * volumeScale;`;

    for (let i = 0; i < voiceCount; i++) {
        chipSource += `
                phaseDelta# *= phaseDeltaScale#;
                `.replaceAll("#", i + "");
    }

    chipSource += `const output = sample * expression;
            expression += expressionDelta;
            data[sampleIndex] += output;
        }
            `

    for (let i: number = 0; i < voiceCount; i++) {
        chipSource += `tone.phases[#] = phase# / waveLength;
            tone.phaseDeltas[#] = phaseDelta# / waveLength;
            `.replaceAll("#", i + "");
    }

    chipSource += "tone.expression = expression;";

    chipSource += `
        synth.sanitizeFilters(filters);
        tone.initialNoteFilterInput1 = initialFilterInput1;
        tone.initialNoteFilterInput2 = initialFilterInput2;
    }`;
    return chipSource;
}
