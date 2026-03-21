// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { Algorithm, FilterType, SustainType, InstrumentType, EffectType, Config, effectsIncludeDistortion, LFOEnvelopeTypes, RandomEnvelopeTypes } from "../../synth/SynthConfig";
import { FilterSettings, FilterControlPoint, SpectrumWave, HarmonicsWave, Instrument } from "../../synth";
import { Preset, EditorConfig } from "../EditorConfig";
import { Change, UndoableChange } from "../Change";
import { SongDocument } from "../SongDocument";
import { randomSineWave, randomPulses, randomChipWave, biasedFullyRandom, fullyRandom } from "./util";

export class ChangeCustomizeInstrument extends Change {
    constructor(doc: SongDocument) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.preset != instrument.type) {
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeCustomWave extends Change {
    constructor(doc: SongDocument, newArray: Float32Array) {
        super();
        const oldArray: Float32Array = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].customChipWave;
        let comparisonResult: boolean = true;
        for (let i: number = 0; i < oldArray.length; i++) {
            if (oldArray[i] != newArray[i]) {
                comparisonResult = false;
                i = oldArray.length;
            }
        }
        if (comparisonResult == false) {
            const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
            for (let i: number = 0; i < newArray.length; i++) {
                instrument.customChipWave[i] = newArray[i];
            }

            let sum: number = 0.0;
            for (let i: number = 0; i < instrument.customChipWave.length; i++) {
                sum += instrument.customChipWave[i];
            }
            const average: number = sum / instrument.customChipWave.length;

            // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
            let cumulative: number = 0;
            let wavePrev: number = 0;
            for (let i: number = 0; i < instrument.customChipWave.length; i++) {
                cumulative += wavePrev;
                wavePrev = instrument.customChipWave[i] - average;
                instrument.customChipWaveIntegral[i] = cumulative;
            }

            instrument.customChipWaveIntegral[64] = 0.0;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeCustomAlgorythmorFeedback extends Change {
    constructor(doc: SongDocument, newArray: number[][], carry: number, mode: string) {
        super();
        if (mode == "algorithm") {
            const oldArray: number[][] = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].customAlgorithm.modulatedBy;
            const oldCarriercount: number = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].customAlgorithm.carrierCount;
            var comparisonResult: boolean = true;
            if (carry != oldCarriercount) {
                comparisonResult = false;
            } else {
                for (let i: number = 0; i < oldArray.length; i++) {
                    if (oldArray[i].length != newArray[i].length) {
                        comparisonResult = false;
                        break;
                    } else {
                        for (let j: number = 0; j < oldArray[i].length; j++) {
                            if (oldArray[i][j] != newArray[i][j]) {
                                comparisonResult = false;
                                break;
                            }
                        }
                    }
                }
            }
            if (comparisonResult == false) {
                const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];

                instrument.customAlgorithm.set(carry, newArray);

                instrument.algorithm6Op = 0;
                doc.notifier.changed();
                this._didSomething();
            }
        } else if (mode == "feedback") {
            const oldArray: number[][] = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()].customFeedbackType.indices;
            var comparisonResult: boolean = true;
            for (let i: number = 0; i < oldArray.length; i++) {
                if (oldArray[i].length != newArray[i].length) {
                    comparisonResult = false;
                    break;
                } else {
                    for (let j: number = 0; j < oldArray[i].length; j++) {
                        if (oldArray[i][j] != newArray[i][j]) {
                            comparisonResult = false;
                            break;
                        }
                    }
                }
            }

            if (!comparisonResult) {
                const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];

                instrument.customFeedbackType.set(newArray);

                instrument.feedbackType6Op = 0;
                doc.notifier.changed();
                this._didSomething();
            }
        }
    }
}

export class ChangePreset extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.preset;
        if (oldValue != newValue) {
            const preset1: Preset | null = EditorConfig.instrumentToPreset(newValue);
            const preset: Preset | null = preset1 ?? EditorConfig.valueToPreset(newValue);
            if (preset != null) {
                if (preset.customType != undefined) {
                    instrument.type = preset.customType;
                    if (!Config.instrumentTypeHasSpecialInterval[instrument.type] && Config.chords[instrument.chord].customInterval) {
                        instrument.chord = 0;
                    }
                    instrument.clearInvalidEnvelopeTargets();
                } else if (preset.settings != undefined) {
                    const tempVolume: number = instrument.volume;
                    const tempPan: number = instrument.pan;
                    const tempPanDelay = instrument.panDelay;
                    //const usesPanning: boolean = effectsIncludePanning(instrument.effects);
                    instrument.fromJsonObject(preset.settings, doc.song.getChannelIsNoise(doc.channel), doc.song.getChannelIsMod(doc.channel), doc.song.rhythm == 0 || doc.song.rhythm == 2, doc.song.rhythm >= 2);
                    instrument.volume = tempVolume;
                    instrument.pan = tempPan;
                    instrument.panDelay = tempPanDelay;
                    //@jummbus - Disable this check, pan will be on by default.
                    //if (usesPanning && instrument.pan != Config.panCenter) {
                    instrument.effects = (instrument.effects | (1 << EffectType.panning));
                    //}
                }
            }
            instrument.preset = newValue;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeRandomGeneratedInstrument extends Change {
    constructor(doc: SongDocument, usesCurrentInstrumentType: boolean) {
        super();

        interface ItemWeight<T> {
            readonly item: T;
            readonly weight: number;
        }
        function selectWeightedRandom<T>(entries: ReadonlyArray<ItemWeight<T>>): T {
            let total: number = 0;
            for (const entry of entries) {
                total += entry.weight;
            }
            let random: number = Math.random() * total;
            for (const entry of entries) {
                random -= entry.weight;
                if (random <= 0.0) return entry.item;
            }
            return entries[(Math.random() * entries.length) | 0].item;
        }
        function selectCurvedDistribution(min: number, max: number, peak: number, width: number): number {
            const entries: Array<ItemWeight<number>> = [];
            for (let i: number = min; i <= max; i++) {
                entries.push({ item: i, weight: 1.0 / (Math.pow((i - peak) / width, 2.0) + 1.0) });
            }
            return selectWeightedRandom(entries);
        }

        class PotentialFilterPoint {
            constructor(
                public readonly chance: number,
                public readonly type: FilterType,
                public readonly minFreq: number,
                public readonly maxFreq: number,
                public readonly centerHz: number,
                public readonly centerGain: number,
            ) { };
        }
        function applyFilterPoints(filter: FilterSettings, potentialPoints: ReadonlyArray<PotentialFilterPoint>): void {
            filter.reset();
            const usedFreqs: number[] = [];
            for (const potentialPoint of potentialPoints) {
                if (Math.random() > potentialPoint.chance) continue;
                const point: FilterControlPoint = new FilterControlPoint();
                point.type = potentialPoint.type;
                point.freq = selectCurvedDistribution(potentialPoint.minFreq, potentialPoint.maxFreq, FilterControlPoint.getRoundedSettingValueFromHz(potentialPoint.centerHz), 1.0 / Config.filterFreqStep);
                point.gain = selectCurvedDistribution(0, Config.filterGainRange - 1, Config.filterGainCenter + potentialPoint.centerGain, 2.0 / Config.filterGainStep);
                if (point.type == FilterType.peak && point.gain == Config.filterGainCenter) continue; // skip pointless points. :P
                if (usedFreqs.includes(point.freq)) continue;
                usedFreqs.push(point.freq);
                filter.controlPoints[filter.controlPointCount] = point;
                filter.controlPointCount++;
            }
        }

        const isNoise: boolean = doc.song.getChannelIsNoise(doc.channel);
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.effects = 1 << EffectType.panning; // disable all existing effects except panning, which should always be on.
        instrument.aliases = false;
        instrument.envelopeCount = 0;

        const midFreq: number = FilterControlPoint.getRoundedSettingValueFromHz(700.0);
        const maxFreq: number = Config.filterFreqRange - 1;
        applyFilterPoints(instrument.eqFilter, [
            new PotentialFilterPoint(0.8, FilterType.lowPass, midFreq, maxFreq, 4000.0, -1),
            new PotentialFilterPoint(0.4, FilterType.highPass, 0, midFreq - 1, 250.0, -1),
            new PotentialFilterPoint(0.5, FilterType.peak, 0, maxFreq, 2000.0, 0),
            new PotentialFilterPoint(0.4, FilterType.peak, 0, maxFreq, 1400.0, 0),
            new PotentialFilterPoint(0.3, FilterType.peak, 0, maxFreq, 1000.0, 0),
            new PotentialFilterPoint(0.2, FilterType.peak, 0, maxFreq, 500.0, 0),
        ]);

        if (isNoise) {
            const type: InstrumentType = usesCurrentInstrumentType ? instrument.type :
            selectWeightedRandom([
                { item: InstrumentType.noise, weight: 3 },
                { item: InstrumentType.spectrum, weight: 3 },
                { item: InstrumentType.drumset, weight: 1 },
            ]);
            instrument.preset = instrument.type = type;

            if (type != InstrumentType.drumset) { // Drumset doesn't use fade.
                instrument.fadeIn = (Math.random() < 0.8) ? 0 : selectCurvedDistribution(0, Config.fadeInRange - 1, 0, 2);
                instrument.fadeOut = selectCurvedDistribution(0, Config.fadeOutTicks.length - 1, Config.fadeOutNeutral, 2);
            }

            if (Math.random() < 0.1) {
                instrument.effects |= 1 << EffectType.transition;
                instrument.transition = Config.transitions.dictionary[selectWeightedRandom([
                    { item: "normal", weight: 30 },
                    { item: "interrupt", weight: 1 },
                    { item: "slide", weight: 2 },
                ])].index;
            }
            if (Math.random() < 0.2) {
                instrument.effects |= 1 << EffectType.chord;
                instrument.chord = Config.chords.dictionary[selectWeightedRandom([
                    { item: "strum", weight: 2 },
                    { item: "arpeggio", weight: 1 },
                ])].index;
            }
            if (Math.random() < 0.1) {
                instrument.pitchShift = selectCurvedDistribution(0, Config.pitchShiftRange - 1, Config.pitchShiftCenter, 2);
                if (instrument.pitchShift != Config.pitchShiftCenter) {
                    instrument.effects |= 1 << EffectType.pitchShift;
                    instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["pitchShift"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 1 },
                        { item: "random", weight: 2},
                        { item: "flare", weight: 2 },
                        { item: "twang", weight: 16 },
                        { item: "swell", weight: 2 },
                        { item: "lfo", weight: 1 },
                        { item: "decay", weight: 4 },
                        { item: "blip", weight: 8},
                        { item: "fall", weight: 2 },
                    ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 50, 13)]);
                }
            }
            if (Math.random() < 0.1) {
                instrument.effects |= 1 << EffectType.vibrato;
                instrument.vibrato = selectCurvedDistribution(0, Config.echoSustainRange - 1, Config.echoSustainRange >> 1, 2);
                instrument.vibrato = Config.vibratos.dictionary[selectWeightedRandom([
                    { item: "light", weight: 2 },
                    { item: "delayed", weight: 2 },
                    { item: "heavy", weight: 1 },
                    { item: "shaky", weight: 2 },
                ])].index;
            }
            if (Math.random() < 0.8) {
                instrument.effects |= 1 << EffectType.noteFilter;
                applyFilterPoints(instrument.noteFilter, [
                    new PotentialFilterPoint(1.0, FilterType.lowPass, midFreq, maxFreq, 8000.0, -1),
                ]);
                instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["noteFilterAllFreqs"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 2 },
                    { item: "pitch", weight: 2 },
                    { item: "punch", weight: 4 },
                    { item: "flare", weight: 4 },
                    { item: "twang", weight: 16 },
                    { item: "swell", weight: 4 },
                    { item: "lfo", weight: 8 },
                    { item: "decay", weight: 8 },
                    { item: "wibble", weight: 4 },
                    { item: "linear", weight: 4 },
                    { item: "fall", weight: 4 },
                ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 30, 30)]);
            }
            if (Math.random() < 0.1) {
                instrument.effects |= 1 << EffectType.distortion;
                instrument.distortion = selectCurvedDistribution(1, Config.distortionRange - 1, Config.distortionRange - 1, 2);
            }
            if (Math.random() < 0.1) {
                instrument.effects |= 1 << EffectType.bitcrusher;
                instrument.bitcrusherFreq = selectCurvedDistribution(0, Config.bitcrusherFreqRange - 1, Config.bitcrusherFreqRange >> 1, 2);
                instrument.bitcrusherQuantization = selectCurvedDistribution(0, Config.bitcrusherQuantizationRange - 1, Config.bitcrusherQuantizationRange >> 1, 2);
            }
            if (Math.random() < 0.1) {
                instrument.effects |= 1 << EffectType.chorus;
                instrument.chorus = selectCurvedDistribution(1, Config.chorusRange - 1, Config.chorusRange - 1, 1);
            }
            if (Math.random() < 0.1) {
                instrument.echoSustain = selectCurvedDistribution(0, Config.echoSustainRange - 1, Config.echoSustainRange >> 1, 2);
                instrument.echoDelay = selectCurvedDistribution(0, Config.echoDelayRange - 1, Config.echoDelayRange >> 1, 2);
                if (instrument.echoSustain != 0 || instrument.echoDelay != 0) {
                    instrument.effects |= 1 << EffectType.echo;
                }
            }
            if (Math.random() < 0.5) {
                instrument.effects |= 1 << EffectType.reverb;
                instrument.reverb = selectCurvedDistribution(1, Config.reverbRange - 1, 1, 1);
            }

            // Configure this to whatever you'd like.
            if (type == InstrumentType.noise || type == InstrumentType.spectrum) {
                instrument.unison = Config.unisons.dictionary[selectWeightedRandom([
                    { item: "none", weight: 100 },
                    { item: "shimmer", weight: 10 },
                    { item: "hum", weight: 8 },
                    { item: "honky tonk", weight: 6 },
                    { item: "dissonant", weight: 2 },
                    { item: "fifth", weight: 4 },
                    { item: "octave", weight: 5 },
                    { item: "bowed", weight: 4 },
                    { item: "piano", weight: 10 },
                    { item: "warbled", weight: 5 },
                    { item: "hecking gosh", weight: 3 },
                    { item: "spinner", weight: 6 },
                    { item: "detune", weight: 4 },
                    { item: "rising", weight: 2 },
                    { item: "vibrate", weight: 3 },
                    { item: "bass", weight: 2 },
                    { item: "recurve", weight: 3 },
                    { item: "inject", weight: 2 },
                    { item: "FART", weight: 1 },
                    { item: "augmented", weight: 1 },
                    { item: "diminished", weight: 1 },
                    { item: "chorus", weight: 2 },
                    { item: "block", weight: 1 },
                    { item: "bow", weight: 2 },
                    // { item: "custom", weight: 10 },
                ])].index;

                if (instrument.unison != Config.unisons.dictionary["none"].index && Math.random() > 0.4)
                    instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["unison"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 2 },
                        { item: "pitch", weight: 2 },
                        { item: "twang", weight: 6 },
                        { item: "swell", weight: 1 },
                        { item: "decay", weight: 6 },
                        { item: "wibble", weight: 4 },
                        { item: "linear", weight: 6 },
                        { item: "rise", weight: 2 },
                        { item: "fall", weight: 2 },
                    ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 57, 6)]);
            }

            function normalize(harmonics: number[]): void {
                let max: number = 0;
                for (const value of harmonics) {
                    if (value > max) max = value;
                }
                for (let i: number = 0; i < harmonics.length; i++) {
                    harmonics[i] = Config.harmonicsMax * harmonics[i] / max;
                }
            }
            switch (type) {
                case InstrumentType.noise: {
                    instrument.chipNoise = (Math.random() * Config.chipNoises.length) | 0;
                } break;
                case InstrumentType.spectrum: {
                    const spectrumGenerators: Function[] = [
                        (): number[] => {
                            const spectrum: number[] = [];
                            for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
                                spectrum[i] = (Math.random() < 0.5) ? Math.random() : 0.0;
                            }
                            return spectrum;
                        },
                        (): number[] => {
                            let current: number = 1.0;
                            const spectrum: number[] = [current];
                            for (let i = 1; i < Config.spectrumControlPoints; i++) {
                                current *= Math.pow(2, Math.random() - 0.52);
                                spectrum[i] = current;
                            }
                            return spectrum;
                        },
                        (): number[] => {
                            let current: number = 1.0;
                            const spectrum: number[] = [current];
                            for (let i = 1; i < Config.spectrumControlPoints; i++) {
                                current *= Math.pow(2, Math.random() - 0.52);
                                spectrum[i] = current * Math.random();
                            }
                            return spectrum;
                        },
                    ];
                    const generator = spectrumGenerators[(Math.random() * spectrumGenerators.length) | 0];
                    const spectrum: number[] = generator();
                    normalize(spectrum);
                    for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
                        instrument.spectrumWave.spectrum[i] = Math.round(spectrum[i]);
                    }
                    instrument.spectrumWave.markCustomWaveDirty();
                } break;
                case InstrumentType.drumset: {
                    for (let i: number = 0; i < Config.drumCount; i++) {
                        // Might wanna do this Random*Config.____.length thing for all envelope/unison randomization?
                        instrument.drumsetEnvelopes[i] = Math.floor(Math.random() * Config.envelopes.length);
                        const spectrum: number[] = [];
                        const randomFactor: number = Math.floor(Math.random() * 3)
                        for (let j = 0; j < Config.spectrumControlPoints; j++) {
                            if (randomFactor == 0 || randomFactor == 3) spectrum[j] = Math.pow(Math.random(), 3) * 0.25;
                            else if (randomFactor == 1) spectrum[j] = Math.pow(Math.random(), ((i / 8) + 1));
                            else if (randomFactor == 2) spectrum[j] = (Math.pow(Math.random(), 2)) * ((i / 3) + 1);
                            else spectrum[j] = Math.pow(Math.random(), 3) * 0.25;
                        }
                        normalize(spectrum);
                        for (let j: number = 0; j < Config.spectrumControlPoints; j++) {
                            instrument.drumsetSpectrumWaves[i].spectrum[j] = Math.round(spectrum[j]);
                        }
                        instrument.drumsetSpectrumWaves[i].markCustomWaveDirty();
                    }
                } break;
                default: throw new Error("Unhandled noise instrument type in random generator.");
            }
        } else {
            const type: InstrumentType = usesCurrentInstrumentType ? instrument.type :
            selectWeightedRandom([
                { item: InstrumentType.chip, weight: 2 },
                // { item: InstrumentType.noise, weight: 1 },
                { item: InstrumentType.pwm, weight: 2 },
                { item: InstrumentType.supersaw, weight: 2 },
                { item: InstrumentType.customChipWave, weight: 2 },
                { item: InstrumentType.harmonics, weight: 2 },
                { item: InstrumentType.pickedString, weight: 2 },
                { item: InstrumentType.spectrum, weight: 2 },
                { item: InstrumentType.fm, weight: 2 },
                { item: InstrumentType.fm6op, weight: 2 },
            ]);
            instrument.preset = instrument.type = type;

            instrument.fadeIn = (Math.random() < 0.5) ? 0 : selectCurvedDistribution(0, Config.fadeInRange - 1, 0, 2);
            instrument.fadeOut = selectCurvedDistribution(0, Config.fadeOutTicks.length - 1, Config.fadeOutNeutral, 2);
            if (type == InstrumentType.chip || type == InstrumentType.harmonics || type == InstrumentType.pickedString || type == InstrumentType.customChipWave || type == InstrumentType.pwm || type == InstrumentType.spectrum) { // TODO: add noise
                instrument.unison = Config.unisons.dictionary[selectWeightedRandom([
                    { item: "none", weight: 100 },
                    { item: "shimmer", weight: 10 },
                    { item: "hum", weight: 8 },
                    { item: "honky tonk", weight: 6 },
                    { item: "dissonant", weight: 2 },
                    { item: "fifth", weight: 4 },
                    { item: "octave", weight: 5 },
                    { item: "bowed", weight: 4 },
                    { item: "piano", weight: 10 },
                    { item: "warbled", weight: 5 },
                    { item: "hecking gosh", weight: 3 },
                    { item: "spinner", weight: 6 },
                    { item: "detune", weight: 4 },
                    { item: "rising", weight: 2 },
                    { item: "vibrate", weight: 3 },
                    { item: "bass", weight: 2 },
                    { item: "recurve", weight: 3 },
                    { item: "inject", weight: 2 },
                    { item: "FART", weight: 1 },
                    { item: "augmented", weight: 1 },
                    { item: "diminished", weight: 1 },
                    { item: "chorus", weight: 2 },
                    { item: "block", weight: 1 },
                    { item: "bow", weight: 2 },
                    // { item: "custom", weight: 10 },
                ])].index;
                /* randomly generated unisons don't work correctly - instead of trying to fix them, just ignore it

                if (instrument.unison == Config.unisons.length) {
                    instrument.unisonVoices = 2;
                    instrument.unisonSpread = Math.floor(Math.random() * 12000 - 6000) / 1000;
                    instrument.unisonOffset = Math.floor(Math.random() * 12000 - 6000) / 1000;
                    instrument.unisonExpression = 1;
                    instrument.unisonSign = Math.floor(Math.random() * 2000 - 1000) / 1000;
                } else {  */
                instrument.unisonVoices = Config.unisons[instrument.unison].voices;
                instrument.unisonSpread = Config.unisons[instrument.unison].spread;
                instrument.unisonOffset = Config.unisons[instrument.unison].offset;
                instrument.unisonExpression = Config.unisons[instrument.unison].expression;
                instrument.unisonSign = Config.unisons[instrument.unison].sign;
                //  } 
            }

            if (Math.random() < 0.1) {
                instrument.effects |= 1 << EffectType.transition;
                instrument.transition = Config.transitions.dictionary[selectWeightedRandom([
                    { item: "interrupt", weight: 1 },
                    { item: "slide", weight: 2 },
                    { item: "continue", weight: 1 },
                ])].index;
            }
            if (Math.random() < 0.2) {
                instrument.effects |= 1 << EffectType.chord;
                instrument.chord = Config.chords.dictionary[selectWeightedRandom([
                    { item: "strum", weight: 2 },
                    { item: "arpeggio", weight: 1 },
                ])].index;
            }
            if (Math.random() < 0.05) {
                instrument.pitchShift = selectCurvedDistribution(0, Config.pitchShiftRange - 1, Config.pitchShiftCenter, 1);
                if (instrument.pitchShift != Config.pitchShiftCenter) {
                    instrument.effects |= 1 << EffectType.pitchShift;
                    instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["pitchShift"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 2 },
                        { item: "pitch", weight: 2 },
                        { item: "random", weight: 3},
                        { item: "flare", weight: 4 },
                        { item: "twang", weight: 20 },
                        { item: "decay", weight: 6 },
                        { item: "linear", weight: 1 },
                        { item: "blip", weight: 10 },
                        { item: "fall", weight: 2 },
                    ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 50, 13)]);
                }
            }
            if (Math.random() < 0.25) {
                instrument.effects |= 1 << EffectType.vibrato;
                instrument.vibrato = selectCurvedDistribution(0, Config.echoSustainRange - 1, Config.echoSustainRange >> 1, 2);
                instrument.vibrato = Config.vibratos.dictionary[selectWeightedRandom([
                    { item: "light", weight: 2 },
                    { item: "delayed", weight: 2 },
                    { item: "heavy", weight: 1 },
                    { item: "shaky", weight: 2 },
                ])].index;
            }
            if (Math.random() < 0.1) {
                instrument.effects |= 1 << EffectType.distortion;
                instrument.distortion = selectCurvedDistribution(1, Config.distortionRange - 1, Config.distortionRange - 1, 2);
                if (Math.random() < 0.3) {
                    let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                    let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                    if (envelopeLowerBound >= envelopeUpperBound) {
                        envelopeLowerBound = 0;
                        envelopeUpperBound = 1;
                    }
                    instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["distortion"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 3 },
                        { item: "pitch", weight: 4 },
                        { item: "random", weight: 1 },
                        { item: "punch", weight: 2 },
                        { item: "flare", weight: 3 },
                        { item: "twang", weight: 10 },
                        { item: "swell", weight: 8 },
                        { item: "lfo", weight: 7 },
                        { item: "decay", weight: 5 },
                        { item: "wibble", weight: 5 },
                        { item: "linear", weight: 4 },
                        { item: "rise", weight: 8 },
                        { item: "fall", weight: 2 },
                    ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 45, 20)], envelopeLowerBound, envelopeUpperBound, selectCurvedDistribution(2, 16, 2, 6), selectCurvedDistribution(1, 63, 32, 31),
                        selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 2 }, { item: LFOEnvelopeTypes.triangle, weight: 5 }]));
                }
            }
            if (effectsIncludeDistortion(instrument.effects) && Math.random() < 0.8) {
                instrument.effects |= 1 << EffectType.noteFilter;
                applyFilterPoints(instrument.noteFilter, [
                    new PotentialFilterPoint(1.0, FilterType.lowPass, midFreq, maxFreq, 2000.0, -1),
                    new PotentialFilterPoint(0.9, FilterType.highPass, 0, midFreq - 1, 500.0, -1),
                    new PotentialFilterPoint(0.4, FilterType.peak, 0, maxFreq, 1400.0, 0),
                ]);
            } else if (Math.random() < 0.5) {
                instrument.effects |= 1 << EffectType.noteFilter;
                applyFilterPoints(instrument.noteFilter, [
                    new PotentialFilterPoint(1.0, FilterType.lowPass, midFreq, maxFreq, 8000.0, -1),
                ]);
                let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                if (envelopeLowerBound >= envelopeUpperBound) {
                    envelopeLowerBound = 0;
                    envelopeUpperBound = 1;
                }
                instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["noteFilterAllFreqs"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                    { item: "note size", weight: 2 },
                    { item: "pitch", weight: 2 },
                    { item: "punch", weight: 6 },
                    { item: "flare", weight: 3 },
                    { item: "twang", weight: 7 },
                    { item: "swell", weight: 8 },
                    { item: "lfo", weight: 12 },
                    { item: "decay", weight: 3 },
                    { item: "wibble", weight: 5 },
                    { item: "linear", weight: 4 },
                    { item: "rise", weight: 8},
                    { item: "fall", weight: 2 },
                ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 30, 30)], envelopeLowerBound, envelopeUpperBound, 2, 2,
                    selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 8 }, { item: LFOEnvelopeTypes.triangle, weight: 4 }, { item: LFOEnvelopeTypes.sawtooth, weight: 2 }, { item: LFOEnvelopeTypes.square, weight: 1}]));
            }
            if (Math.random() < 0.1) {
                instrument.effects |= 1 << EffectType.bitcrusher;
                instrument.bitcrusherFreq = selectCurvedDistribution(0, Config.bitcrusherFreqRange - 1, 0, 2);
                instrument.bitcrusherQuantization = selectCurvedDistribution(0, Config.bitcrusherQuantizationRange - 1, Config.bitcrusherQuantizationRange >> 1, 2);
                let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                if (envelopeLowerBound >= envelopeUpperBound) {
                    envelopeLowerBound = 0;
                    envelopeUpperBound = 1;
                }
                if (Math.random() < 0.3) {
                    instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["bitcrusherFrequency"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 4 },
                        { item: "pitch", weight: 3 },
                        { item: "random", weight: 12 },
                        { item: "flare", weight: 3 },
                        { item: "twang", weight: 7 },
                        { item: "swell", weight: 4 },
                        { item: "lfo", weight: 12 },
                        { item: "decay", weight: 2 },
                        { item: "wibble", weight: 1 },
                        { item: "linear", weight: 6 },
                        { item: "rise", weight: 5 },
                        { item: "blip", weight: 12 },
                        { item: "fall", weight: 2 },
                    ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 20, 34)], envelopeLowerBound, envelopeUpperBound, selectCurvedDistribution(2, 16, 2, 6), selectCurvedDistribution(1, 63, 32, 31),
                        selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 3 }, { item: LFOEnvelopeTypes.triangle, weight: 1 }]));
                }
                if (Math.random() < 0.5) {
                    instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["bitcrusherQuantization"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 8 },
                        { item: "pitch", weight: 3 },
                        { item: "random", weight: 12 },
                        { item: "flare", weight: 3 },
                        { item: "twang", weight: 7 },
                        { item: "swell", weight: 4 },
                        { item: "lfo", weight: 12 },
                        { item: "decay", weight: 2 },
                        { item: "wibble", weight: 1 },
                        { item: "linear", weight: 6 },
                        { item: "rise", weight: 5 },
                        { item: "blip", weight: 12 },
                        { item: "fall", weight: 2 },
                    ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 20, 34)], envelopeLowerBound, envelopeUpperBound, selectCurvedDistribution(2, 16, 2, 6), selectCurvedDistribution(1, 63, 32, 31),
                        selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 3 }, { item: LFOEnvelopeTypes.triangle, weight: 1 }]));
                } else if (type == InstrumentType.spectrum) {
                    instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["noteVolume"].index, 0, Config.newEnvelopes.dictionary["note size"].index, true);
                    instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["bitcrusherQuantization"].index, 0, Config.newEnvelopes.dictionary["note size"].index, true);
                 }
            }
            if (Math.random() < 0.1) {
                instrument.effects |= 1 << EffectType.chorus;
                instrument.chorus = selectCurvedDistribution(1, Config.chorusRange - 1, Config.chorusRange - 1, 1);
                if (Math.random() < 0.1) {
                    let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                    let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                    if (envelopeLowerBound >= envelopeUpperBound) {
                        envelopeLowerBound = 0;
                        envelopeUpperBound = 1;
                    }
                    instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["chorus"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 3 },
                        { item: "pitch", weight: 4 },
                        { item: "random", weight: 1 },
                        { item: "punch", weight: 2 },
                        { item: "flare", weight: 3 },
                        { item: "twang", weight: 10 },
                        { item: "swell", weight: 8 },
                        { item: "lfo", weight: 7 },
                        { item: "decay", weight: 5 },
                        { item: "wibble", weight: 5 },
                        { item: "linear", weight: 4 },
                        { item: "rise", weight: 8 },
                        { item: "fall", weight: 2 },
                    ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 45, 20)], envelopeLowerBound, envelopeUpperBound, selectCurvedDistribution(2, 16, 2, 6), selectCurvedDistribution(1, 63, 32, 31),
                        selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 2 }, { item: LFOEnvelopeTypes.triangle, weight: 5 }]));
                }
            }
            if (Math.random() < 0.1) {
                instrument.echoSustain = selectCurvedDistribution(0, Config.echoSustainRange - 1, Config.echoSustainRange >> 1, 2);
                instrument.echoDelay = selectCurvedDistribution(0, Config.echoDelayRange - 1, Config.echoDelayRange >> 1, 2);
                if (instrument.echoSustain != 0 || instrument.echoDelay != 0) {
                    instrument.effects |= 1 << EffectType.echo;
                    if (Math.random() < 0.04) {
                        let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                        let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                        if (envelopeLowerBound >= envelopeUpperBound) {
                            envelopeLowerBound = 0;
                            envelopeUpperBound = 1;
                        }
                        instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["echoDelay"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                            { item: "note size", weight: 4 },
                            { item: "pitch", weight: 8 },
                            { item: "random", weight: 7 },
                            { item: "twang", weight: 3 },
                            { item: "swell", weight: 3 },
                            { item: "lfo", weight: 4 },
                            { item: "decay", weight: 1 },
                            { item: "wibble", weight: 1 },
                            { item: "linear", weight: 2 },
                            { item: "rise", weight: 1 },
                            { item: "fall", weight: 2 },
                        ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 45, 20)], envelopeLowerBound, envelopeUpperBound, selectCurvedDistribution(2, 16, 2, 6), selectCurvedDistribution(1, 63, 32, 31),
                            selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 8 }, { item: LFOEnvelopeTypes.triangle, weight: 3 }]));
                    }
                }
            }
            if (Math.random() < 0.07) {
                instrument.ringModulation = selectCurvedDistribution(1, Config.ringModRange - 1, Config.ringModRange / 2, Config.ringModRange / 2);
                instrument.ringModulationHz = selectCurvedDistribution(1, Config.ringModHzRange - 1, Config.ringModHzRange / 2, Config.ringModHzRange / 2);
                if (instrument.ringModulation != 0 || instrument.ringModulationHz != 0) {
                    instrument.effects |= 1 << EffectType.ringModulation;
                    instrument.ringModWaveformIndex = 0;

                    if (Math.random() < 0.1) {
                        let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                        let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                        if (envelopeLowerBound >= envelopeUpperBound) {
                            envelopeLowerBound = 0;
                            envelopeUpperBound = 1;
                        }
                        instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["ringModulation"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                            { item: "note size", weight: 4 },
                            { item: "pitch", weight: 8 },
                            { item: "random", weight: 7 },
                            { item: "punch", weight: 1 },
                            { item: "flare", weight: 1 },
                            { item: "twang", weight: 8 },
                            { item: "swell", weight: 6 },
                            { item: "lfo", weight: 6 },
                            { item: "decay", weight: 4 },
                            { item: "wibble", weight: 2 },
                            { item: "linear", weight: 4 },
                            { item: "rise", weight: 3 },
                            { item: "fall", weight: 4 },
                        ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 25, 20)], envelopeLowerBound, envelopeUpperBound, selectCurvedDistribution(2, 16, 2, 6), selectCurvedDistribution(1, 63, 32, 31),
                            selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 8 }, { item: LFOEnvelopeTypes.triangle, weight: 3 }]));
                    }

                    if (Math.random() < 0.3) {
                        let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                        let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                        if (envelopeLowerBound >= envelopeUpperBound) {
                            envelopeLowerBound = 0;
                            envelopeUpperBound = 1;
                        }
                        instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["ringModulationHz"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                            { item: "note size", weight: 4 },
                            { item: "pitch", weight: 8 },
                            { item: "random", weight: 7 },
                            { item: "punch", weight: 1 },
                            { item: "flare", weight: 4 },
                            { item: "twang", weight: 8 },
                            { item: "swell", weight: 6 },
                            { item: "lfo", weight: 6 },
                            { item: "decay", weight: 4 },
                            { item: "wibble", weight: 2 },
                            { item: "linear", weight: 4 },
                            { item: "rise", weight: 3 },
                            { item: "fall", weight: 4 },
                        ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 25, 20)], envelopeLowerBound, envelopeUpperBound, selectCurvedDistribution(2, 16, 2, 6), selectCurvedDistribution(1, 63, 32, 31),
                            selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 8 }, { item: LFOEnvelopeTypes.triangle, weight: 3 }, { item: LFOEnvelopeTypes.square, weight: 1 }]));
                    }
                }
            }
            if (Math.random() < 0.5) {
                instrument.effects |= 1 << EffectType.reverb;
                instrument.reverb = selectCurvedDistribution(1, Config.reverbRange - 1, 1, 1);
                if (Math.random() < 0.03) {
                    let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                    let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                    if (envelopeLowerBound >= envelopeUpperBound) {
                        envelopeLowerBound = 0;
                        envelopeUpperBound = 1;
                    }
                    instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["reverb"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 3 },
                        { item: "pitch", weight: 4 },
                        { item: "random", weight: 1 },
                        { item: "punch", weight: 2 },
                        { item: "flare", weight: 3 },
                        { item: "twang", weight: 10 },
                        { item: "swell", weight: 8 },
                        { item: "lfo", weight: 7 },
                        { item: "decay", weight: 5 },
                        { item: "wibble", weight: 5 },
                        { item: "linear", weight: 4 },
                        { item: "rise", weight: 8 },
                        { item: "fall", weight: 2 },
                    ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 45, 20)], envelopeLowerBound, envelopeUpperBound, selectCurvedDistribution(2, 16, 2, 6), selectCurvedDistribution(1, 63, 32, 31),
                        selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 2 }, { item: LFOEnvelopeTypes.triangle, weight: 5 }]));
                }
            }
            if (Math.random() < 0.1) {
                instrument.effects |= 1 << EffectType.granular;
                instrument.granular = selectCurvedDistribution(1, Config.granularRange - 1, Config.granularRange / 2, Config.granularRange / 3);
                instrument.grainAmounts = selectCurvedDistribution(1, Config.grainAmountsMax - 1, Config.grainAmountsMax-2, 3);
                instrument.grainSize = selectCurvedDistribution(Config.grainSizeMin / Config.grainSizeStep, Config.grainSizeMax / Config.grainSizeStep, Config.grainSizeMax / Config.grainSizeStep, Config.grainSizeMax / Config.grainSizeStep / 2);
                instrument.grainRange = selectCurvedDistribution(0, Config.grainRangeMax / Config.grainSizeStep, Config.grainRangeMax / Config.grainSizeStep / 2, Config.grainSizeMax / Config.grainSizeStep / 2);
                
                if (Math.random() < 0.2) {
                    let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                    let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                    if (envelopeLowerBound >= envelopeUpperBound) {
                        envelopeLowerBound = 0;
                        envelopeUpperBound = 1;
                    }
                    instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["granular"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 10 },
                        { item: "pitch", weight: 8 },
                        { item: "random", weight: 2 },
                        { item: "twang", weight: 8 },
                        { item: "swell", weight: 6 },
                        { item: "lfo", weight: 4 },
                        { item: "decay", weight: 4 },
                        { item: "wibble", weight: 2 },
                        { item: "linear", weight: 4 },
                        { item: "rise", weight: 3 },
                        { item: "fall", weight: 4 },
                    ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 25, 20)], envelopeLowerBound, envelopeUpperBound, selectCurvedDistribution(2, 16, 2, 6), selectCurvedDistribution(1, 63, 32, 31),
                        selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 8 }, { item: LFOEnvelopeTypes.triangle, weight: 3 }, { item: LFOEnvelopeTypes.square, weight: 1 }]));
                }

                if (Math.random() < 0.3) {
                    let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                    let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                    if (envelopeLowerBound >= envelopeUpperBound) {
                        envelopeLowerBound = 0;
                        envelopeUpperBound = 1;
                    }
                    instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["grainFreq"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 10 },
                        { item: "pitch", weight: 8 },
                        { item: "random", weight: 7 },
                        { item: "flare", weight: 1 },
                        { item: "twang", weight: 8 },
                        { item: "swell", weight: 6 },
                        { item: "lfo", weight: 6 },
                        { item: "decay", weight: 4 },
                        { item: "wibble", weight: 3 },
                        { item: "linear", weight: 4 },
                        { item: "rise", weight: 3 },
                        { item: "fall", weight: 4 },
                    ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 25, 20)], envelopeLowerBound, envelopeUpperBound, selectCurvedDistribution(2, 16, 2, 6), selectCurvedDistribution(1, 63, 32, 31),
                        selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 8 }, { item: LFOEnvelopeTypes.triangle, weight: 3 }, { item: LFOEnvelopeTypes.square, weight: 1 }]));
                }

                if (Math.random() < 0.3) {
                    let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                    let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                    if (envelopeLowerBound >= envelopeUpperBound) {
                        envelopeLowerBound = 0;
                        envelopeUpperBound = 1;
                    }
                    instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["grainSize"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 10 },
                        { item: "pitch", weight: 8 },
                        { item: "random", weight: 7 },
                        { item: "punch", weight: 1 },
                        { item: "flare", weight: 1 },
                        { item: "twang", weight: 5 },
                        { item: "swell", weight: 8 },
                        { item: "lfo", weight: 6 },
                        { item: "decay", weight: 3 },
                        { item: "wibble", weight: 2 },
                        { item: "linear", weight: 4 },
                        { item: "rise", weight: 6 },
                        { item: "fall", weight: 4 },
                    ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 25, 20)], envelopeLowerBound, envelopeUpperBound, selectCurvedDistribution(2, 16, 2, 6), selectCurvedDistribution(1, 63, 32, 31),
                        selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 8 }, { item: LFOEnvelopeTypes.triangle, weight: 3 }, { item: LFOEnvelopeTypes.square, weight: 1 }]));
                }

                if (Math.random() < 0.05) {
                    let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                    let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                    if (envelopeLowerBound >= envelopeUpperBound) {
                        envelopeLowerBound = 0;
                        envelopeUpperBound = 1;
                    }
                    instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["grainRange"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                        { item: "note size", weight: 10 },
                        { item: "pitch", weight: 8 },
                        { item: "random", weight: 7 },
                        { item: "punch", weight: 1 },
                        { item: "flare", weight: 1 },
                        { item: "twang", weight: 8 },
                        { item: "swell", weight: 6 },
                        { item: "lfo", weight: 6 },
                        { item: "decay", weight: 4 },
                        { item: "wibble", weight: 2 },
                        { item: "linear", weight: 4 },
                        { item: "rise", weight: 3 },
                        { item: "fall", weight: 4 },
                    ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 25, 20)], envelopeLowerBound, envelopeUpperBound, selectCurvedDistribution(2, 16, 2, 6), selectCurvedDistribution(1, 63, 32, 31),
                        selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 8 }, { item: LFOEnvelopeTypes.triangle, weight: 3 }, { item: LFOEnvelopeTypes.square, weight: 1 }]));
                }
            }
            if (Math.random() < 0.2) {
                let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                if (envelopeLowerBound >= envelopeUpperBound) {
                    envelopeLowerBound = 0;
                    envelopeUpperBound = 1;
                }
                instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["noteVolume"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                    { item: "pitch", weight: 1 },
                    { item: "random", weight: 4},
                    { item: "punch", weight: 6 },
                    { item: "flare", weight: 3 },
                    { item: "twang", weight: 13 },
                    { item: "swell", weight: 7 },
                    { item: "lfo", weight: 2 },
                    { item: "decay", weight: 4 },
                    { item: "wibble", weight: 3 },
                    { item: "linear", weight: 4 },
                    { item: "rise", weight: 4 },
                    { item: "fall", weight: 3 },
                ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 40, 20)], envelopeLowerBound, envelopeUpperBound, selectCurvedDistribution(2, 16, 2, 6), selectCurvedDistribution(1, 63, 32, 31),
                    selectWeightedRandom([{ item: RandomEnvelopeTypes.time, weight: 8 }, { item: RandomEnvelopeTypes.pitch, weight: 2 }]));
            }
            function normalize(harmonics: number[]): void {
                let max: number = 0;
                for (const value of harmonics) {
                    if (value > max) max = value;
                }
                for (let i: number = 0; i < harmonics.length; i++) {
                    harmonics[i] = Config.harmonicsMax * harmonics[i] / max;
                }
            }
            switch (type) {
                case InstrumentType.chip: {
                    instrument.chipWave = (Math.random() * Config.chipWaves.length) | 0;
                    // advloop addition
                    instrument.isUsingAdvancedLoopControls = false;
                    instrument.chipWaveLoopStart = 0;
                    instrument.chipWaveLoopEnd = Config.rawRawChipWaves[instrument.chipWave].samples.length - 1;
                    instrument.chipWaveLoopMode = 0;
                    instrument.chipWavePlayBackwards = false;
                    instrument.chipWaveStartOffset = 0;
                    // advloop addition
                } break;
                case InstrumentType.pwm:
                case InstrumentType.supersaw: {
                    if (type == InstrumentType.supersaw) {
                        instrument.supersawDynamism = selectCurvedDistribution(0, Config.supersawDynamismMax, Config.supersawDynamismMax, 2);
                        instrument.supersawSpread = selectCurvedDistribution(0, Config.supersawSpreadMax, Math.ceil(Config.supersawSpreadMax / 3), 4);
                        instrument.supersawShape = selectCurvedDistribution(0, Config.supersawShapeMax, 0, 4);
                    }
                    instrument.pulseWidth = selectCurvedDistribution(0, Config.pulseWidthRange - 1, Config.pulseWidthRange - 1, 2);
                    instrument.decimalOffset = 0;

                    if (Math.random() < 0.6) {
                        instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["pulseWidth"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                            { item: "note size", weight: 2 },
                            { item: "pitch", weight: 1 },
                            { item: "random", weight: 3 },
                            { item: "punch", weight: 6 },
                            { item: "flare", weight: 3 },
                            { item: "twang", weight: 6 },
                            { item: "swell", weight: 8 },
                            { item: "lfo", weight: 6 },
                            { item: "decay", weight: 2 },
                            { item: "wibble", weight: 6 },
                            { item: "linear", weight: 3 },
                            { item: "rise", weight: 5 },
                            { item: "blip", weight: 10 },
                            { item: "fall", weight: 4 },
                        ])].index, false, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]),
                            Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 40, 20)],
                            selectWeightedRandom([
                                { item: 0, weight: 8 },
                                { item: 0.1, weight: 4 },
                                { item: 0.2, weight: 3 },
                                { item: 0.3, weight: 1 },
                                { item: 0.4, weight: 2 },
                                { item: 0.5, weight: 6 },
                            ]), selectWeightedRandom([
                                { item: 0.6, weight: 1 },
                                { item: 0.7, weight: 2 },
                                { item: 0.8, weight: 3 },
                                { item: 0.9, weight: 5 },
                                { item: 1, weight: 8 }]), selectCurvedDistribution(2, 16, 2, 6), selectCurvedDistribution(1, 63, 32, 31),
                            selectWeightedRandom([{ item: RandomEnvelopeTypes.time, weight: 8 }, { item: RandomEnvelopeTypes.pitch, weight: 2 }]));                        
                    }
                } break;
                case InstrumentType.pickedString:
                case InstrumentType.harmonics: {
                    if (type == InstrumentType.pickedString) {
                        instrument.stringSustain = (Math.random() * Config.stringSustainRange) | 0;
                    }

                    const harmonicGenerators: Function[] = [
                        (): number[] => {
                            const harmonics: number[] = [];
                            for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
                                harmonics[i] = (Math.random() < 0.4) ? Math.random() : 0.0;
                            }
                            harmonics[(Math.random() * 8) | 0] = Math.pow(Math.random(), 0.25);
                            return harmonics;
                        },
                        (): number[] => {
                            let current: number = 1.0;
                            const harmonics: number[] = [current];
                            for (let i = 1; i < Config.harmonicsControlPoints; i++) {
                                current *= Math.pow(2, Math.random() - 0.55);
                                harmonics[i] = current;
                            }
                            return harmonics;
                        },
                        (): number[] => {
                            let current: number = 1.0;
                            const harmonics: number[] = [current];
                            for (let i = 1; i < Config.harmonicsControlPoints; i++) {
                                current *= Math.pow(2, Math.random() - 0.55);
                                harmonics[i] = current * Math.random();
                            }
                            return harmonics;
                        },
                    ];
                    const generator = harmonicGenerators[(Math.random() * harmonicGenerators.length) | 0];
                    const harmonics: number[] = generator();
                    normalize(harmonics);
                    for (let i: number = 0; i < Config.harmonicsControlPoints; i++) {
                        instrument.harmonicsWave.harmonics[i] = Math.round(harmonics[i]);
                    }
                    instrument.harmonicsWave.markCustomWaveDirty();
                } break;
                case InstrumentType.spectrum: {
                    const spectrum: number[] = [];
                    for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
                        const isHarmonic: boolean = i == 0 || i == 7 || i == 11 || i == 14 || i == 16 || i == 18 || i == 21;
                        if (isHarmonic) {
                            spectrum[i] = Math.pow(Math.random(), 0.25);
                        } else {
                            spectrum[i] = Math.pow(Math.random(), 3) * 0.5;
                        }
                    }
                    normalize(spectrum);
                    for (let i: number = 0; i < Config.spectrumControlPoints; i++) {
                        instrument.spectrumWave.spectrum[i] = Math.round(spectrum[i]);
                    }
                    instrument.spectrumWave.markCustomWaveDirty();
                } break;
                case InstrumentType.fm6op:
                case InstrumentType.fm: {
                    if (type == InstrumentType.fm) {
                        instrument.algorithm = (Math.random() * Config.algorithms.length) | 0;
                        instrument.feedbackType = (Math.random() * Config.feedbacks.length) | 0;
                    } else {
                        instrument.algorithm6Op = (Math.random() * (Config.algorithms6Op.length - 1) + 1) | 0;
                        instrument.customAlgorithm.fromPreset(instrument.algorithm6Op);
                        instrument.feedbackType6Op = (Math.random() * (Config.feedbacks6Op.length - 1) + 1) | 0;
                        instrument.customFeedbackType.fromPreset(instrument.feedbackType6Op);
                    }
                    const algorithm: Algorithm = type == InstrumentType.fm ? Config.algorithms[instrument.algorithm] : Config.algorithms6Op[instrument.algorithm6Op];
                    for (let i: number = 0; i < algorithm.carrierCount; i++) {
                        instrument.operators[i].frequency = selectCurvedDistribution(0, Config.operatorFrequencies.length - 1, 0, 3);
                        instrument.operators[i].amplitude = selectCurvedDistribution(0, Config.operatorAmplitudeMax, Config.operatorAmplitudeMax - 1, 2);
                        instrument.operators[i].waveform = Config.operatorWaves.dictionary[selectWeightedRandom([
                            { item: "sine", weight: 10 },
                            { item: "triangle", weight: 6 },
                            { item: "pulse width", weight: 6 },
                            { item: "sawtooth", weight: 3 },
                            { item: "ramp", weight: 3 },
                            { item: "trapezoid", weight: 4 },
				            { item: "quasi-sine", weight: 2 },
                            { item: "half-sine", weight: 3 },
                            { item: "white noise", weight: 1 },
                            { item: "absine", weight: 3 },
                            { item: "sharksine", weight: 3 },
                            { item: "fastsine", weight: 3 },
                            { item: "camelsine", weight: 5 },
                        ])].index;
                        if (instrument.operators[i].waveform == 2/*"pulse width"*/) {
                            instrument.operators[i].pulseWidth = selectWeightedRandom([
                                { item: 0, weight: 3 },
                                { item: 1, weight: 5 },
                                { item: 2, weight: 7 },
                                { item: 3, weight: 10 },
                                { item: 4, weight: 15 },
                                { item: 5, weight: 25 }, // 50%
                                { item: 6, weight: 15 },
                                { item: 7, weight: 10 },
                                { item: 8, weight: 7 },
                                { item: 9, weight: 5 },
                                { item: 9, weight: 3 },
                            ]);
                        }
                    }
                    for (let i: number = algorithm.carrierCount; i < Config.operatorCount + (type == InstrumentType.fm6op ? 2 : 0); i++) {
                        instrument.operators[i].frequency = selectCurvedDistribution(3, Config.operatorFrequencies.length - 1, 0, 3);
                        instrument.operators[i].amplitude = (Math.pow(Math.random(), 2) * Config.operatorAmplitudeMax) | 0;
                        if (instrument.envelopeCount < Config.maxEnvelopeCount && Math.random() < 0.4) {
                            let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                            let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                            if (envelopeLowerBound >= envelopeUpperBound) {
                                envelopeLowerBound = 0;
                                envelopeUpperBound = 1;
                            }
                            instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["operatorAmplitude"].index, i, Config.newEnvelopes.dictionary[selectWeightedRandom([
                                { item: "punch", weight: 2 },
                                { item: "pitch", weight: 1 },
                                { item: "flare", weight: 3 },
                                { item: "twang", weight: 4 },
                                { item: "swell", weight: 4 },
                                { item: "lfo", weight: 6 },
                                { item: "decay", weight: 2 },
                                { item: "wibble", weight: 5 },
                                { item: "linear", weight: 3 },
                                { item: "rise", weight: 5 },
                                { item: "fall", weight: 2 },
                            ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 30, 30)], envelopeLowerBound, envelopeUpperBound, 2, 2,
                                selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 8 }, { item: LFOEnvelopeTypes.triangle, weight: 4 }, { item: LFOEnvelopeTypes.sawtooth, weight: 2 }, { item: LFOEnvelopeTypes.square, weight: 1 }]));
                        }
                        if (instrument.envelopeCount < Config.maxEnvelopeCount && Math.random() < 0.15) {
                            let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                            let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                            if (envelopeLowerBound >= envelopeUpperBound) {
                                envelopeLowerBound = 0;
                                envelopeUpperBound = 1;
                            }
                            instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["operatorFrequency"].index, i, Config.newEnvelopes.dictionary[selectWeightedRandom([
                                { item: "punch", weight: 2 },
                                { item: "pitch", weight: 1 },
                                { item: "flare", weight: 3 },
                                { item: "twang", weight: 10 },
                                { item: "swell", weight: 5 },
                                { item: "lfo", weight: 6 },
                                { item: "decay", weight: 2 },
                                { item: "wibble", weight: 5 },
                                { item: "linear", weight: 3 },
                                { item: "rise", weight: 5 },
                                { item: "fall", weight: 2 },
                            ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 30, 30)], envelopeLowerBound, envelopeUpperBound, 2, 2,
                                selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 8 }, { item: LFOEnvelopeTypes.triangle, weight: 4 }, { item: LFOEnvelopeTypes.sawtooth, weight: 4 }, { item: LFOEnvelopeTypes.square, weight: 1 }]));
                        }
                        instrument.operators[i].waveform = Config.operatorWaves.dictionary[selectWeightedRandom([
                            { item: "sine", weight: 10 },
                            { item: "triangle", weight: 6 },
                            { item: "pulse width", weight: 6 },
                            { item: "sawtooth", weight: 3 },
                            { item: "ramp", weight: 3 },
                            { item: "trapezoid", weight: 4 },
				            { item: "quasi-sine", weight: 2 },
                        ])].index;
                        if (instrument.operators[i].waveform == 2) {
                            instrument.operators[i].pulseWidth = selectWeightedRandom([
                                { item: 0, weight: 3 },
                                { item: 1, weight: 5 },
                                { item: 2, weight: 7 },
                                { item: 3, weight: 10 },
                                { item: 4, weight: 15 },
                                { item: 5, weight: 25 }, // 50%
                                { item: 6, weight: 15 },
                                { item: 7, weight: 10 },
                                { item: 8, weight: 7 },
                                { item: 9, weight: 5 },
                                { item: 9, weight: 3 },
                            ]);
                        }
                    }
                    instrument.feedbackAmplitude = (Math.pow(Math.random(), 3) * Config.operatorAmplitudeMax) | 0;
                    if (instrument.envelopeCount < Config.maxEnvelopeCount && Math.random() < 0.4) {
                        let envelopeLowerBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                        let envelopeUpperBound = selectCurvedDistribution(0, 20, 8, 5) / 10;
                        if (envelopeLowerBound >= envelopeUpperBound) {
                            envelopeLowerBound = 0;
                            envelopeUpperBound = 1;
                        }
                        instrument.addEnvelope(Config.instrumentAutomationTargets.dictionary["feedbackAmplitude"].index, 0, Config.newEnvelopes.dictionary[selectWeightedRandom([
                            { item: "note size", weight: 4 },
                            { item: "punch", weight: 2 },
                            { item: "pitch", weight: 1 },
                            { item: "flare", weight: 2 },
                            { item: "twang", weight: 2 },
                            { item: "swell", weight: 4 },
                            { item: "lfo", weight: 3 },
                            { item: "decay", weight: 3 },
                            { item: "wibble", weight: 3 },
                            { item: "linear", weight: 2 },
                            { item: "rise", weight: 3 },
                            { item: "fall", weight: 3 },
                        ])].index, true, 0, -1, selectWeightedRandom([{ item: false, weight: 8 }, { item: true, weight: 1 }]), Config.perEnvelopeSpeedIndices[selectCurvedDistribution(1, 63, 30, 30)], envelopeLowerBound, envelopeUpperBound, 2, 2,
                            selectWeightedRandom([{ item: LFOEnvelopeTypes.sine, weight: 8 }, { item: LFOEnvelopeTypes.triangle, weight: 4 }, { item: LFOEnvelopeTypes.sawtooth, weight: 2 }, { item: LFOEnvelopeTypes.square, weight: 1 }]));
                    }
                } break;
                case InstrumentType.customChipWave: {
                    // The custom chip randomizing is a little different. It uses a random algorithm
                    // (seen as the functions below) to give the waveform unique shapes other than messy
                    // custom chip sounds. 
                    const randomGeneratedArray: Float32Array = new Float32Array(64);
                    const randomGeneratedArrayIntegral: Float32Array = new Float32Array(65);
                    const algorithmFunction: (wave: Float32Array) => void = selectWeightedRandom([
                        { item: randomSineWave, weight: 4 },
                        { item: randomPulses, weight: 4 },
                        { item: randomChipWave, weight: 3 },
                        { item: biasedFullyRandom, weight: 2 },
                        { item: fullyRandom, weight: 1 },
                    ]);
                    algorithmFunction(randomGeneratedArray);

                    let sum: number = 0.0;
                    for (let i: number = 0; i < randomGeneratedArray.length; i++) sum += randomGeneratedArray[i];
                    const average: number = sum / randomGeneratedArray.length;
                    let cumulative: number = 0;
                    let wavePrev: number = 0;
                    for (let i: number = 0; i < randomGeneratedArray.length; i++) {
                        cumulative += wavePrev;
                        wavePrev = randomGeneratedArray[i] - average;
                        randomGeneratedArrayIntegral[i] = cumulative;
                    }
                    randomGeneratedArrayIntegral[64] = 0.0;

                    instrument.customChipWave = randomGeneratedArray;
                    instrument.customChipWaveIntegral = randomGeneratedArrayIntegral;
                } break;
               // case InstrumentType.noise: {
                //     instrument.chipNoise = selectWeightedRandom([
                //         { item: 0, weight: 1 }, // retro
                //         { item: 1, weight: 1 }, // white
                //         { item: 2, weight: 6 }, // clang
                //         { item: 3, weight: 6 }, // buzz
                //         { item: 4, weight: 1 }, // hollow
                //         { item: 7, weight: 4 }, // cutter
                //         { item: 8, weight: 4 }, // metallic
                //         { item: 9, weight: 1 }, // static
                //         { item: 10, weight: 1 }, // 1-bit white
                //         { item: 11, weight: 5 }, // 1-bit metallic
                //     ]);
                // } break;
                default: throw new Error("Unhandled pitched instrument type in random generator.");
            }
        }
        
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeTransition extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.transition;
        if (oldValue != newValue) {
            this._didSomething();
            instrument.transition = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
        }
    }
}

export class ChangeToggleEffects extends Change {
    constructor(doc: SongDocument, toggleFlag: number, useInstrument: Instrument | null) {
        super();
        let instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (useInstrument != null)
            instrument = useInstrument;
        const oldValue: number = instrument.effects;
        const wasSelected: boolean = ((oldValue & (1 << toggleFlag)) != 0);
        const newValue: number = wasSelected ? (oldValue & (~(1 << toggleFlag))) : (oldValue | (1 << toggleFlag));
        instrument.effects = newValue;
        // As a special case, toggling the panning effect doesn't remove the preset.
        if (toggleFlag != EffectType.panning) instrument.preset = instrument.type;
        // Remove AA when distortion is turned off.
        if (toggleFlag == EffectType.distortion && wasSelected)
            instrument.aliases = false;
        if (wasSelected) instrument.clearInvalidEnvelopeTargets();
        this._didSomething();
        doc.notifier.changed();
    }
}

export class ChangeUnison extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.unison;
        if (oldValue != newValue) {
            instrument.unison = newValue;
            instrument.unisonVoices = Config.unisons[instrument.unison].voices;
            instrument.unisonSpread = Config.unisons[instrument.unison].spread;
            instrument.unisonOffset = Config.unisons[instrument.unison].offset;
            instrument.unisonExpression = Config.unisons[instrument.unison].expression;
            instrument.unisonSign = Config.unisons[instrument.unison].sign;
            instrument.preset = instrument.type;
            
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeUnisonVoices extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const prevUnison: number = instrument.unison;
        if (oldValue != newValue || prevUnison != Config.unisons.length) {
            instrument.unisonVoices = newValue;
            instrument.unison = Config.unisons.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeUnisonSpread extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const prevUnison: number = instrument.unison;
        if (oldValue != newValue || prevUnison != Config.unisons.length) {
            instrument.unisonSpread = newValue;
            instrument.unison = Config.unisons.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeUnisonOffset extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const prevUnison: number = instrument.unison;
        if (oldValue != newValue || prevUnison != Config.unisons.length) {
            instrument.unisonOffset = newValue;
            instrument.unison = Config.unisons.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeUnisonExpression extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const prevUnison: number = instrument.unison;
        if (oldValue != newValue || prevUnison != Config.unisons.length) {
            instrument.unisonExpression = newValue;
            instrument.unison = Config.unisons.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeUnisonSign extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const prevUnison: number = instrument.unison;
        if (oldValue != newValue || prevUnison != Config.unisons.length) {
            instrument.unisonSign = newValue;
            instrument.unison = Config.unisons.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeChord extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.chord;
        if (oldValue != newValue) {
            this._didSomething();
            instrument.chord = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
        }
    }
}

export class ChangeVibrato extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.vibrato;
        if (oldValue != newValue) {
            instrument.vibrato = newValue;
            instrument.vibratoDepth = Config.vibratos[instrument.vibrato].amplitude;
            instrument.vibratoDelay = Config.vibratos[instrument.vibrato].delayTicks / 2;
            instrument.vibratoSpeed = 10; // default
            instrument.vibratoType = Config.vibratos[instrument.vibrato].type;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeVibratoDepth extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const prevVibrato: number = instrument.vibrato;
        doc.synth.unsetMod(Config.modulators.dictionary["vibrato depth"].index, doc.channel, doc.getCurrentInstrument());

        doc.notifier.changed();
        if (oldValue != newValue || prevVibrato != Config.vibratos.length) {
            instrument.vibratoDepth = newValue / 25;
            instrument.vibrato = Config.vibratos.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeEnvelopeSpeed extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        doc.synth.unsetMod(Config.modulators.dictionary["envelope speed"].index, doc.channel, doc.getCurrentInstrument());

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.envelopeSpeed = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeVibratoSpeed extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const prevVibrato: number = instrument.vibrato;
        doc.synth.unsetMod(Config.modulators.dictionary["vibrato speed"].index, doc.channel, doc.getCurrentInstrument());

        doc.notifier.changed();
        if (oldValue != newValue || prevVibrato != Config.vibratos.length) {
            instrument.vibratoSpeed = newValue;
            instrument.vibrato = Config.vibratos.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeVibratoDelay extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const prevVibrato: number = instrument.vibrato;
        doc.synth.unsetMod(Config.modulators.dictionary["vibrato delay"].index, doc.channel, doc.getCurrentInstrument());

        doc.notifier.changed();
        if (oldValue != newValue || prevVibrato != Config.vibratos.length) {
            instrument.vibratoDelay = newValue;
            instrument.vibrato = Config.vibratos.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeVibratoType extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.vibratoType;
        const prevVibrato: number = instrument.vibrato;

        doc.notifier.changed();
        if (oldValue != newValue || prevVibrato != Config.vibratos.length) {
            instrument.vibratoType = newValue;
            instrument.vibrato = Config.vibratos.length; // Custom
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeArpeggioSpeed extends Change {
    constructor(doc: SongDocument, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.arpeggioSpeed = newValue;
        doc.synth.unsetMod(Config.modulators.dictionary["arp speed"].index, doc.channel, doc.getCurrentInstrument());

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeFastTwoNoteArp extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.fastTwoNoteArp;

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.fastTwoNoteArp = newValue;
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeMonophonicTone extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.monoChordTone;

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.monoChordTone = newValue;
            this._didSomething();
        }
    }
}

export class ChangeClicklessTransition extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.clicklessTransition;

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.clicklessTransition = newValue;
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeAliasing extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.aliases;

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.aliases = newValue;
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeInvertWave extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.invertWave;

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.invertWave = newValue;
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeSpectrum extends Change {
    constructor(doc: SongDocument, instrument: Instrument, spectrumWave: SpectrumWave) {
        super();
        spectrumWave.markCustomWaveDirty();
        instrument.preset = instrument.type;
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeHarmonics extends Change {
    constructor(doc: SongDocument, instrument: Instrument, harmonicsWave: HarmonicsWave) {
        super();
        harmonicsWave.markCustomWaveDirty();
        instrument.preset = instrument.type;
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeDrumsetEnvelope extends Change {
    constructor(doc: SongDocument, drumIndex: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.drumsetEnvelopes[drumIndex];
        if (oldValue != newValue) {
            instrument.drumsetEnvelopes[drumIndex] = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeStringSustainType extends Change {
    constructor(doc: SongDocument, newValue: SustainType) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: SustainType = instrument.stringSustainType;
        if (oldValue != newValue) {
            instrument.stringSustainType = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeFadeInOut extends UndoableChange {
    private _doc: SongDocument;
    private _instrument: Instrument;
    private _instrumentPrevPreset: number;
    private _instrumentNextPreset: number;
    private _oldFadeIn: number;
    private _oldFadeOut: number;
    private _newFadeIn: number;
    private _newFadeOut: number;
    constructor(doc: SongDocument, fadeIn: number, fadeOut: number) {
        super(false);
        this._doc = doc;
        this._instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
        this._instrumentNextPreset = this._instrument.type;
        this._instrumentPrevPreset = this._instrument.preset;
        this._oldFadeIn = this._instrument.fadeIn;
        this._oldFadeOut = this._instrument.fadeOut;
        this._newFadeIn = fadeIn;
        this._newFadeOut = fadeOut;
        this._didSomething();
        this.redo();
    }

    protected _doForwards(): void {
        this._instrument.fadeIn = this._newFadeIn;
        this._instrument.fadeOut = this._newFadeOut;
        this._instrument.preset = this._instrumentNextPreset;
        this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        this._instrument.fadeIn = this._oldFadeIn;
        this._instrument.fadeOut = this._oldFadeOut;
        this._instrument.preset = this._instrumentPrevPreset;
        this._doc.notifier.changed();
    }
}

export class ChangeAlgorithm extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.algorithm;
        if (oldValue != newValue) {
            instrument.algorithm = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeFeedbackType extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.feedbackType;
        if (oldValue != newValue) {
            instrument.feedbackType = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class Change6OpAlgorithm extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.algorithm6Op;
        if (oldValue != newValue) {
            instrument.algorithm6Op = newValue;
            if (newValue != 0) {
                instrument.customAlgorithm.fromPreset(newValue);
            }
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class Change6OpFeedbackType extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.feedbackType6Op;
        if (oldValue != newValue) {
            instrument.feedbackType6Op = newValue;
            if (newValue != 0) {
                instrument.customFeedbackType.fromPreset(newValue);
            }
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeOperatorWaveform extends Change {
    constructor(doc: SongDocument, operatorIndex: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.operators[operatorIndex].waveform;
        if (oldValue != newValue) {
            instrument.operators[operatorIndex].waveform = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeOperatorPulseWidth extends Change {
    constructor(doc: SongDocument, operatorIndex: number, oldValue: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.operators[operatorIndex].pulseWidth = newValue;
        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeOperatorFrequency extends Change {
    constructor(doc: SongDocument, operatorIndex: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.operators[operatorIndex].frequency;
        if (oldValue != newValue) {
            instrument.operators[operatorIndex].frequency = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeChipWave extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.chipWave != newValue) {
            instrument.chipWave = newValue;
            // advloop addition
            instrument.isUsingAdvancedLoopControls = false;
            instrument.chipWaveLoopStart = 0;
            instrument.chipWaveLoopEnd = Config.rawRawChipWaves[instrument.chipWave].samples.length - 1;
            instrument.chipWaveLoopMode = 0;
            instrument.chipWavePlayBackwards = false;
            instrument.chipWaveStartOffset = 0;
            // advloop addition
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeChipWaveUseAdvancedLoopControls extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.isUsingAdvancedLoopControls != newValue) {
            instrument.isUsingAdvancedLoopControls = newValue;
            instrument.chipWaveLoopStart = 0;
            instrument.chipWaveLoopEnd = Config.rawRawChipWaves[instrument.chipWave].samples.length - 1;
            instrument.chipWaveLoopMode = 0;
            instrument.chipWavePlayBackwards = false;
            instrument.chipWaveStartOffset = 0;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeChipWaveLoopMode extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.chipWaveLoopMode != newValue) {
            instrument.isUsingAdvancedLoopControls = true;
            instrument.chipWaveLoopMode = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeChipWaveLoopStart extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.chipWaveLoopStart != newValue) {
            instrument.isUsingAdvancedLoopControls = true;
            instrument.chipWaveLoopStart = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeChipWaveLoopEnd extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.chipWaveLoopEnd != newValue) {
            instrument.isUsingAdvancedLoopControls = true;
            instrument.chipWaveLoopEnd = newValue;
            instrument.chipWaveLoopStart = Math.max(0, Math.min(newValue - 1, instrument.chipWaveLoopStart));
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeChipWaveStartOffset extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.chipWaveStartOffset != newValue) {
            instrument.isUsingAdvancedLoopControls = true;
            instrument.chipWaveStartOffset = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeChipWavePlayBackwards extends Change {
    constructor(doc: SongDocument, newValue: boolean) {
        super();
        const instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.chipWavePlayBackwards != newValue) {
            instrument.isUsingAdvancedLoopControls = true;
            instrument.chipWavePlayBackwards = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}
// advloop addition

export class ChangeNoiseWave extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.chipNoise != newValue) {
            instrument.chipNoise = newValue;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeAddEnvelope extends Change {
    constructor(doc: SongDocument) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.addEnvelope(0, 0, 0, true, 0, instrument.isNoiseInstrument ? Config.drumCount : Config.maxPitch, false, 1, 0);
        instrument.preset = instrument.type;
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeRemoveEnvelope extends Change {
    constructor(doc: SongDocument, index: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.envelopeCount--;
        for (let i: number = index; i < instrument.envelopeCount; i++) {
            instrument.envelopes[i].target = instrument.envelopes[i + 1].target;
            instrument.envelopes[i].index = instrument.envelopes[i + 1].index;
            instrument.envelopes[i].envelope = instrument.envelopes[i + 1].envelope;
            instrument.envelopes[i].pitchEnvelopeStart = instrument.envelopes[i + 1].pitchEnvelopeStart;
            instrument.envelopes[i].pitchEnvelopeEnd = instrument.envelopes[i + 1].pitchEnvelopeEnd;
            instrument.envelopes[i].inverse = instrument.envelopes[i + 1].inverse;
            instrument.envelopes[i].perEnvelopeSpeed = instrument.envelopes[i + 1].perEnvelopeSpeed;
            instrument.envelopes[i].perEnvelopeLowerBound = instrument.envelopes[i + 1].perEnvelopeLowerBound;
            instrument.envelopes[i].perEnvelopeUpperBound = instrument.envelopes[i + 1].perEnvelopeUpperBound;
            instrument.envelopes[i].steps = instrument.envelopes[i + 1].steps;
            instrument.envelopes[i].seed = instrument.envelopes[i + 1].seed;
            instrument.envelopes[i].waveform = instrument.envelopes[i + 1].waveform;
            instrument.envelopes[i].discrete = instrument.envelopes[i + 1].discrete;
        }
        // TODO: Shift any envelopes that were targeting other envelope indices after the removed one.
        instrument.preset = instrument.type;
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeSetEnvelopeTarget extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, target: number, targetIndex: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldTarget: number = instrument.envelopes[envelopeIndex].target;
        const oldIndex: number = instrument.envelopes[envelopeIndex].index;
        if (oldTarget != target || oldIndex != targetIndex) {
            instrument.envelopes[envelopeIndex].target = target;
            instrument.envelopes[envelopeIndex].index = targetIndex;
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeSetEnvelopeType extends Change {
    constructor(doc: SongDocument, envelopeIndex: number, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: number = instrument.envelopes[envelopeIndex].envelope;
        if (oldValue != newValue) {
            instrument.envelopes[envelopeIndex].envelope = newValue;
            instrument.preset = instrument.type;
            if (oldValue == Config.newEnvelopes.dictionary["none"].index) {
                instrument.envelopes[envelopeIndex].perEnvelopeSpeed = Config.newEnvelopes[newValue].speed;
            }
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeEnvelopePitchStart extends Change {
    constructor(doc: SongDocument, startNote: number, index: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldStartNote: number = instrument.envelopes[index].pitchEnvelopeStart;
        instrument.envelopes[index].pitchEnvelopeStart = startNote;
        if (oldStartNote != startNote) {
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeEnvelopePitchEnd extends Change {
    constructor(doc: SongDocument, endNote: number, index: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldEndNote: number = instrument.envelopes[index].pitchEnvelopeEnd;
        instrument.envelopes[index].pitchEnvelopeEnd = endNote;
        if (oldEndNote != endNote) {
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeEnvelopeInverse extends Change {
    constructor(doc: SongDocument, value: boolean, index: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue: boolean = instrument.envelopes[index].inverse;
        instrument.envelopes[index].inverse = value;
        if (oldValue != value) {
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeDiscreteEnvelope extends Change {
    constructor(doc: SongDocument, newValue: boolean, index: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldValue = instrument.envelopes[index].discrete;

        doc.notifier.changed();
        if (oldValue != newValue) {
            instrument.envelopes[index].discrete = newValue;
            instrument.preset = instrument.type;
            this._didSomething();
        }
    }
}

export class ChangeRandomEnvelopeSteps extends Change {
    constructor(doc: SongDocument, steps: number, index: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldSteps: number = instrument.envelopes[index].steps;
        steps = steps > Config.randomEnvelopeStepsMax ? Config.randomEnvelopeStepsMax : steps < 1 ? 2 : Math.floor(steps);
        instrument.envelopes[index].steps = steps;
        if (oldSteps != steps) {
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class ChangeRandomEnvelopeSeed extends Change {
    constructor(doc: SongDocument, seed: number, index: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldSeed: number = instrument.envelopes[index].seed;
        seed = seed > Config.randomEnvelopeSeedMax ? Config.randomEnvelopeSeedMax : seed < 1 ? 2 : Math.floor(seed);
        instrument.envelopes[index].seed = seed;
        if (oldSeed != seed) {
            //changing the seed does not change the preset
            doc.notifier.changed();
            this._didSomething();
        }
    }
}

export class PasteEnvelope extends Change {
    constructor(doc: SongDocument, envelope: any, index: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        instrument.envelopes[index].fromJsonObject(envelope, "slarmoosbox");
        
        
        instrument.preset = instrument.type;
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeSetEnvelopeWaveform extends Change {
    constructor(doc: SongDocument, waveform: any, index: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        const oldWaveform: number = instrument.envelopes[index].waveform;
        waveform = parseInt(waveform + ""); //make sure waveform isn't a string
        instrument.envelopes[index].waveform = waveform;
        if (oldWaveform != waveform) {
            instrument.preset = instrument.type;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}
export class ChangeRingModChipWave extends Change {
    constructor(doc: SongDocument, newValue: number) {
        super();
        const instrument: Instrument = doc.song.channels[doc.channel].instruments[doc.getCurrentInstrument()];
        if (instrument.ringModWaveformIndex != newValue) {
            instrument.ringModWaveformIndex = newValue;
            doc.notifier.changed();
            this._didSomething();
        }
    }
}
