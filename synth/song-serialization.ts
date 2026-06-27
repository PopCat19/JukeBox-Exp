// song-serialization.ts
//
// Purpose: URL hash serialization for songs (toBase64String, fromBase64String)
//
// This module:
// - Provides SongLike interface and version constants
// - Re-exports toBase64StringImpl from synth-serialize.ts
// - Re-exports fromBase64StringImpl from synth-deserialize.ts

import type { Channel } from "./channels";
import type { FilterSettings } from "./instruments";
import type { Pattern } from "./notes";
import type { CustomSampleHandler } from "./song-utilities";

export const LATEST_JUKEBOX_VERSION: number = 4;

export interface SongLike {
	title: string;
	scale: number;
	scaleCustom: boolean[];
	key: number;
	octaveCount: number;
	octave: number;
	tempo: number;
	reverb: number;
	beatsPerBar: number;
	barCount: number;
	patternsPerChannel: number;
	rhythm: number;
	layeredInstruments: boolean;
	patternInstruments: boolean;
	loopStart: number;
	loopLength: number;
	pitchChannelCount: number;
	noiseChannelCount: number;
	modChannelCount: number;
	channels: Channel[];
	eqFilter: FilterSettings;
	eqFilterType: boolean;
	eqFilterSimpleCut: number;
	eqFilterSimplePeak: number;
	eqSubFilters: (FilterSettings | null)[];
	limitDecay: number;
	limitRise: number;
	compressionThreshold: number;
	limitThreshold: number;
	compressionRatio: number;
	limitRatio: number;
	masterGain: number;
	customSampleHandler: CustomSampleHandler | null;

	getChannelCount(): number;
	getMaxInstrumentsPerChannel(): number;
	getMaxInstrumentsPerPattern(channelIndex: number): number;
	getChannelIsNoise(channelIndex: number): boolean;
	getChannelIsMod(channelIndex: number): boolean;
	getPattern(channelIndex: number, bar: number): Pattern | null;
	initScalarsOnly(): void;
	initToDefault(andResetChannels?: boolean): void;
	restoreLimiterDefaults(): void;
	toBase64String(): string;
	fromJsonObject(jsonObject: any, jsonFormat?: string): void;
}

export function getNeededBits(maxValue: number): number {
	return 32 - Math.clz32(Math.ceil(maxValue + 1) - 1);
}

export { fromBase64StringImpl } from "./synth-deserialize";
// Serialization delegates
export { toBase64StringImpl } from "./synth-serialize";
