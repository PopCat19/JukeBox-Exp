// Song
//
// Purpose: Manages song data model, fields, and initialization
//
// This module:
// - Stores song metadata (title, tempo, key, scale, channels)
// - Manages per-channel instrument and pattern configuration
// - Delegates serialization to song-serialization.ts via arrow properties

import { Channel } from "./channels";
import { fromJsonObjectImpl, toJsonObjectImpl } from "./formats/json-serialization";
import { FilterSettings, Instrument } from "./instruments";
import { Pattern } from "./notes";
import { fromBase64StringImpl, toBase64StringImpl } from "./song-serialization";
import type { CustomSampleHandler } from "./song-utilities";
import { Config, InstrumentType } from "./synth-config";

export type { CustomSampleHandler } from "./song-utilities";

export class Song {
	// Serialization delegates — arrow properties pass `this` as song
	public toBase64String = (): string => toBase64StringImpl(this as any);
	public fromBase64String = (compressed: string, jsonFormat?: string): void =>
		fromBase64StringImpl(this as any, compressed, jsonFormat);
	public toJsonObject = (
		enableIntro?: boolean,
		loopCount?: number,
		enableOutro?: boolean,
	): object => toJsonObjectImpl(this as any, enableIntro, loopCount, enableOutro);
	public fromJsonObject = (jsonObject: any, jsonFormat?: string): void =>
		fromJsonObjectImpl(this as any, jsonObject, jsonFormat);

	public customSampleHandler: CustomSampleHandler | null = null;

	public title: string;
	public scale: number;
	public scaleCustom: boolean[] = [];
	public key: number;
	public octaveCount: number;
	public octave: number;
	public tempo: number;
	public reverb: number;
	public beatsPerBar: number;
	public barCount: number;
	public patternsPerChannel: number;
	public rhythm: number;
	public layeredInstruments: boolean;
	public patternInstruments: boolean;
	public loopStart: number;
	public loopLength: number;
	public pitchChannelCount: number;
	public noiseChannelCount: number;
	public modChannelCount: number;
	public readonly channels: Channel[] = [];
	public limitDecay: number = 4.0;
	public limitRise: number = 4000.0;
	public compressionThreshold: number = 1.0;
	public limitThreshold: number = 1.0;
	public compressionRatio: number = 1.0;
	public limitRatio: number = 1.0;
	public masterGain: number = 1.0;
	public inVolumeCap: number = 0.0;
	public outVolumeCap: number = 0.0;
	public channelVolumeCaps: number[] = [];
	public eqFilter: FilterSettings = new FilterSettings();
	public eqFilterType: boolean = false;
	public eqFilterSimpleCut: number = Config.filterSimpleCutRange - 1;
	public eqFilterSimplePeak: number = 0;
	public eqSubFilters: (FilterSettings | null)[] = [];
	public tmpEqFilterStart: FilterSettings | null;
	public tmpEqFilterEnd: FilterSettings | null;

	constructor(string?: string, customSampleHandler?: CustomSampleHandler) {
		this.customSampleHandler = customSampleHandler ?? null;
		if (string !== undefined) {
			this.fromBase64String(string);
		} else {
			this.initToDefault(true);
		}
	}

	// Returns the ideal new note volume when dragging (max volume for a normal note, a "neutral" value for mod notes based on how they work)
	public getNewNoteVolume = (
		isMod: boolean,
		modChannel?: number,
		modInstrument?: number,
		modCount?: number,
	): number => {
		if (
			!isMod ||
			modChannel === undefined ||
			modInstrument === undefined ||
			modCount === undefined
		) {
			return Config.noteSizeMax;
		} else {
			// Sigh, the way pitches count up and the visual ordering in the UI are flipped.
			modCount = Config.modCount - modCount - 1;

			const instrument: Instrument = this.channels[modChannel].instruments[modInstrument];
			let vol: number | undefined =
				Config.modulators[instrument.modulators[modCount]].newNoteVol;

			const currentIndex: number = instrument.modulators[modCount];
			// For tempo, actually use user defined tempo
			const tempoIndex: number = Config.modulators.dictionary.tempo.index;
			if (currentIndex === tempoIndex)
				vol = this.tempo - Config.modulators[tempoIndex].convertRealFactor;
			// for effects and envelopes, use the user defined value of the selected instrument (or the default value if all or active is selected)
			if (
				!Config.modulators[currentIndex].forSong &&
				instrument.modInstruments[modCount] <
					this.channels[instrument.modChannels[modCount]].instruments.length
			) {
				const chorusIndex: number = Config.modulators.dictionary.chorus.index;
				const reverbIndex: number = Config.modulators.dictionary.reverb.index;
				const panningIndex: number = Config.modulators.dictionary.pan.index;
				const panDelayIndex: number = Config.modulators.dictionary["pan delay"].index;
				const distortionIndex: number = Config.modulators.dictionary.distortion.index;
				const detuneIndex: number = Config.modulators.dictionary.detune.index;
				const vibratoDepthIndex: number =
					Config.modulators.dictionary["vibrato depth"].index;
				const vibratoSpeedIndex: number =
					Config.modulators.dictionary["vibrato speed"].index;
				const vibratoDelayIndex: number =
					Config.modulators.dictionary["vibrato delay"].index;
				const arpSpeedIndex: number = Config.modulators.dictionary["arp speed"].index;
				const bitCrushIndex: number = Config.modulators.dictionary["bit crush"].index;
				const freqCrushIndex: number = Config.modulators.dictionary["freq crush"].index;
				const echoIndex: number = Config.modulators.dictionary.echo.index;
				const echoDelayIndex: number = Config.modulators.dictionary["echo delay"].index;
				const pitchShiftIndex: number = Config.modulators.dictionary["pitch shift"].index;
				const ringModIndex: number = Config.modulators.dictionary["ring modulation"].index;
				const ringModHertzIndex: number =
					Config.modulators.dictionary["ring mod hertz"].index;
				const granularIndex: number = Config.modulators.dictionary.granular.index;
				const grainAmountIndex: number = Config.modulators.dictionary["grain freq"].index;
				const grainSizeIndex: number = Config.modulators.dictionary["grain size"].index;
				const grainRangeIndex: number = Config.modulators.dictionary["grain range"].index;
				const envSpeedIndex: number = Config.modulators.dictionary["envelope speed"].index;
				const perEnvSpeedIndex: number =
					Config.modulators.dictionary["individual envelope speed"].index;
				const perEnvLowerIndex: number =
					Config.modulators.dictionary["individual envelope lower bound"].index;
				const perEnvUpperIndex: number =
					Config.modulators.dictionary["individual envelope upper bound"].index;
				const instrumentIndex: number = instrument.modInstruments[modCount];

				switch (currentIndex) {
					case chorusIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].chorus - Config.modulators[chorusIndex].convertRealFactor;
						break;
					case reverbIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].reverb - Config.modulators[reverbIndex].convertRealFactor;
						break;
					case panningIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].pan - Config.modulators[panningIndex].convertRealFactor;
						break;
					case panDelayIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].panDelay - Config.modulators[panDelayIndex].convertRealFactor;
						break;
					case distortionIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].distortion - Config.modulators[distortionIndex].convertRealFactor;
						break;
					case detuneIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].detune;
						break;
					case vibratoDepthIndex:
						vol = Math.round(
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].vibratoDepth *
								25 -
								Config.modulators[vibratoDepthIndex].convertRealFactor,
						);
						break;
					case vibratoSpeedIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].vibratoSpeed - Config.modulators[vibratoSpeedIndex].convertRealFactor;
						break;
					case vibratoDelayIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].vibratoDelay - Config.modulators[vibratoDelayIndex].convertRealFactor;
						break;
					case arpSpeedIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].arpeggioSpeed - Config.modulators[arpSpeedIndex].convertRealFactor;
						break;
					case bitCrushIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].bitcrusherQuantization -
							Config.modulators[bitCrushIndex].convertRealFactor;
						break;
					case freqCrushIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].bitcrusherFreq - Config.modulators[freqCrushIndex].convertRealFactor;
						break;
					case echoIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].echoSustain - Config.modulators[echoIndex].convertRealFactor;
						break;
					case echoDelayIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].echoDelay - Config.modulators[echoDelayIndex].convertRealFactor;
						break;
					case pitchShiftIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].pitchShift;
						break;
					case ringModIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].ringModulation - Config.modulators[ringModIndex].convertRealFactor;
						break;
					case ringModHertzIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].ringModulationHz -
							Config.modulators[ringModHertzIndex].convertRealFactor;
						break;
					case granularIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].granular - Config.modulators[granularIndex].convertRealFactor;
						break;
					case grainAmountIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].grainAmounts - Config.modulators[grainAmountIndex].convertRealFactor;
						break;
					case grainSizeIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].grainSize - Config.modulators[grainSizeIndex].convertRealFactor;
						break;
					case grainRangeIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].grainRange - Config.modulators[grainRangeIndex].convertRealFactor;
						break;
					case envSpeedIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].envelopeSpeed - Config.modulators[envSpeedIndex].convertRealFactor;
						break;
					case perEnvSpeedIndex:
						vol =
							Config.perEnvelopeSpeedToIndices[
								this.channels[instrument.modChannels[modCount]].instruments[
									instrumentIndex
								].envelopes[instrument.modEnvelopeNumbers[modCount]]
									.perEnvelopeSpeed
							] - Config.modulators[perEnvSpeedIndex].convertRealFactor;
						break;
					case perEnvLowerIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].envelopes[instrument.modEnvelopeNumbers[modCount]]
								.perEnvelopeLowerBound *
								10 -
							Config.modulators[perEnvLowerIndex].convertRealFactor;
						break;
					case perEnvUpperIndex:
						vol =
							this.channels[instrument.modChannels[modCount]].instruments[
								instrumentIndex
							].envelopes[instrument.modEnvelopeNumbers[modCount]]
								.perEnvelopeUpperBound *
								10 -
							Config.modulators[perEnvUpperIndex].convertRealFactor;
						break;
				}
			}

			if (vol !== undefined) {
				return vol;
			} else {
				return Config.noteSizeMax;
			}
		}
	};

	public getVolumeCap = (
		isMod: boolean,
		modChannel?: number,
		modInstrument?: number,
		modCount?: number,
	): number => {
		if (
			!isMod ||
			modChannel === undefined ||
			modInstrument === undefined ||
			modCount === undefined
		) {
			return Config.noteSizeMax;
		} else {
			// Sigh, the way pitches count up and the visual ordering in the UI are flipped.
			modCount = Config.modCount - modCount - 1;

			const instrument: Instrument = this.channels[modChannel].instruments[modInstrument];
			const modulator = Config.modulators[instrument.modulators[modCount]];
			let cap: number | undefined = modulator.maxRawVol;

			if (cap !== undefined) {
				// For filters, cap is dependent on which filter setting is targeted
				if (
					modulator.name === "eq filter" ||
					modulator.name === "note filter" ||
					modulator.name === "song eq"
				) {
					// type 0: number of filter morphs
					// type 1/odd: number of filter x positions
					// type 2/even: number of filter y positions
					cap = Config.filterMorphCount - 1;
					if (
						instrument.modFilterTypes[modCount] > 0 &&
						instrument.modFilterTypes[modCount] % 2
					) {
						cap = Config.filterFreqRange;
					} else if (instrument.modFilterTypes[modCount] > 0) {
						cap = Config.filterGainRange;
					}
				}
				return cap;
			} else {
				return Config.noteSizeMax;
			}
		}
	};

	public getVolumeCapForSetting = (
		isMod: boolean,
		modSetting: number,
		filterType?: number,
	): number => {
		if (!isMod) {
			return Config.noteSizeMax;
		} else {
			let cap: number | undefined = Config.modulators[modSetting].maxRawVol;
			if (cap !== undefined) {
				// For filters, cap is dependent on which filter setting is targeted
				if (
					filterType !== undefined &&
					(Config.modulators[modSetting].name === "eq filter" ||
						Config.modulators[modSetting].name === "note filter" ||
						Config.modulators[modSetting].name === "song eq")
				) {
					// type 0: number of filter morphs
					// type 1/odd: number of filter x positions
					// type 2/even: number of filter y positions
					cap = Config.filterMorphCount - 1;
					if (filterType > 0 && filterType % 2) {
						cap = Config.filterFreqRange;
					} else if (filterType > 0) {
						cap = Config.filterGainRange;
					}
				}

				return cap;
			} else {
				return Config.noteSizeMax;
			}
		}
	};

	public getChannelCount(): number {
		return this.pitchChannelCount + this.noiseChannelCount + this.modChannelCount;
	}

	public getMaxInstrumentsPerChannel(): number {
		return Math.max(
			this.layeredInstruments ? Config.layeredInstrumentCountMax : Config.instrumentCountMin,
			this.patternInstruments ? Config.patternInstrumentCountMax : Config.instrumentCountMin,
		);
	}

	public getMaxInstrumentsPerPattern(channelIndex: number): number {
		return this.getMaxInstrumentsPerPatternForChannel(this.channels[channelIndex]);
	}

	public getMaxInstrumentsPerPatternForChannel(channel: Channel): number {
		return this.layeredInstruments
			? Math.min(Config.layeredInstrumentCountMax, channel.instruments.length)
			: 1;
	}

	public getChannelIsNoise(channelIndex: number): boolean {
		return (
			channelIndex >= this.pitchChannelCount &&
			channelIndex < this.pitchChannelCount + this.noiseChannelCount
		);
	}

	public getChannelIsMod(channelIndex: number): boolean {
		return channelIndex >= this.pitchChannelCount + this.noiseChannelCount;
	}
	public initScalarsOnly(): void {
		this.scale = 0;
		this.scaleCustom = [
			true,
			false,
			false,
			false,
			false,
			false,
			false,
			false,
			false,
			false,
			false,
			false,
		];
		this.key = 0;
		this.octaveCount = 8;
		this.octave = 0;
		this.loopStart = 0;
		this.loopLength = 8;
		this.tempo = 160;
		this.reverb = 0;
		this.beatsPerBar = 8;
		this.barCount = 8;
		this.patternsPerChannel = 32;
		this.rhythm = 1;
		this.layeredInstruments = false;
		this.patternInstruments = true;
		this.eqFilter.reset();
		for (let i: number = 0; i < Config.filterMorphCount - 1; i++) {
			this.eqSubFilters[i] = null;
		}
		const now: Date = new Date();
		this.title = `Untitled-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
		this.customSampleHandler?.setDocumentTitle(this.title);
	}
	public initToDefault(andResetChannels: boolean = true): void {
		this.initScalarsOnly();
		if (andResetChannels) {
			this.pitchChannelCount = 2;
			this.noiseChannelCount = 1;
			this.modChannelCount = 1;
			for (
				let channelIndex: number = 0;
				channelIndex < this.getChannelCount();
				channelIndex++
			) {
				const isNoiseChannel: boolean =
					channelIndex >= this.pitchChannelCount &&
					channelIndex < this.pitchChannelCount + this.noiseChannelCount;
				const isModChannel: boolean =
					channelIndex >= this.pitchChannelCount + this.noiseChannelCount;
				if (this.channels.length <= channelIndex) {
					this.channels[channelIndex] = new Channel();
				}
				const channel: Channel = this.channels[channelIndex];
				channel.octave = Math.max(3 - channelIndex, 0); // [3, 2, 1, 0]; Descending octaves with drums at zero in last channel.

				for (let pattern: number = 0; pattern < this.patternsPerChannel; pattern++) {
					if (channel.patterns.length <= pattern) {
						channel.patterns[pattern] = new Pattern();
					} else {
						channel.patterns[pattern].reset();
					}
				}
				channel.patterns.length = this.patternsPerChannel;

				for (
					let instrument: number = 0;
					instrument < Config.instrumentCountMin;
					instrument++
				) {
					if (channel.instruments.length <= instrument) {
						channel.instruments[instrument] = new Instrument(
							isNoiseChannel,
							isModChannel,
						);
					}
					channel.instruments[instrument].setTypeAndReset(
						isModChannel
							? InstrumentType.mod
							: isNoiseChannel
								? InstrumentType.noise
								: InstrumentType.chip,
						isNoiseChannel,
						isModChannel,
					);
				}
				channel.instruments.length = Config.instrumentCountMin;

				for (let bar: number = 0; bar < this.barCount; bar++) {
					channel.bars[bar] = bar < 1 ? 1 : 0;
				}
				channel.bars.length = this.barCount;
			}
			this.channels.length = this.getChannelCount();
		}
	}
	public getPattern(channelIndex: number, bar: number): Pattern | null {
		if (bar < 0 || bar >= this.barCount) return null;
		const patternIndex: number = this.channels[channelIndex].bars[bar];
		if (patternIndex === 0) return null;
		return this.channels[channelIndex].patterns[patternIndex - 1];
	}

	public getBeatsPerMinute(): number {
		return this.tempo;
	}

	public restoreLimiterDefaults(): void {
		this.compressionRatio = 1.0;
		this.limitRatio = 1.0;
		this.limitRise = 4000.0;
		this.limitDecay = 4.0;
		this.limitThreshold = 1.0;
		this.compressionThreshold = 1.0;
		this.masterGain = 1.0;
	}
}
