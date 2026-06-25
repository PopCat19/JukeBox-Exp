// sample-loader.ts
//
// Purpose: Sample loading infrastructure — state tracking, events, and built-in sample loading
//
// This module:
// - Manages sample loading state, events, and lifecycle (SampleLoadingState, SampleLoadEvents)
// - Provides loadBuiltInSamples for legacy, nintaribox, and mario paintbox sample sets
// - Supports dynamic sample loading (startLoadingSample) and localStorage helpers

import { Config } from "./config-class";
import { centerWave } from "./utils";
import { SampleLoadingStatus } from "./enums";
import type { Dictionary } from "./types";
import { performIntegral } from "./utils";

export function getSampleLoadingStatusName(status: SampleLoadingStatus): string {
	switch (status) {
		case SampleLoadingStatus.loading:
			return "loading";
		case SampleLoadingStatus.loaded:
			return "loaded";
		case SampleLoadingStatus.error:
			return "error";
	}
}

export class SampleLoadingState {
	public statusTable: Dictionary<SampleLoadingStatus>;
	public urlTable: Dictionary<string>;
	public totalSamples: number;
	public samplesLoaded: number;

	constructor() {
		this.statusTable = {};
		this.urlTable = {};
		this.totalSamples = 0;
		this.samplesLoaded = 0;
	}
}

export const sampleLoadingState: SampleLoadingState = new SampleLoadingState();

export class SampleLoadedEvent extends Event {
	public readonly totalSamples: number;
	public readonly samplesLoaded: number;

	constructor(totalSamples: number, samplesLoaded: number) {
		super("sampleloaded");
		this.totalSamples = totalSamples;
		this.samplesLoaded = samplesLoaded;
	}
}

export interface SampleLoadEventMap {
	sampleloaded: SampleLoadedEvent;
}

export class SampleLoadEvents extends EventTarget {}

export const sampleLoadEvents: SampleLoadEvents = new SampleLoadEvents();

export async function startLoadingSample(
	url: string,
	chipWaveIndex: number,
	presetSettings: Dictionary<any>,
	rawLoopOptions: any,
	customSampleRate: number,
): Promise<void> {
	// @TODO: Make parts of the code that expect everything to already be
	// in memory work correctly.
	// It would be easy to only instantiate `SongEditor` and company after
	// everything is loaded, but if dynamic sample loading without a reload
	// is deemed necessary, anything that involves chip waves has to be
	// revisited so as to be able to work with a changing list of chip
	// waves that may or may not be ready to be used.
	const sampleLoaderAudioContext = new AudioContext({ sampleRate: customSampleRate });
	let closedSampleLoaderAudioContext: boolean = false;
	const chipWave = Config.chipWaves[chipWaveIndex];
	const rawChipWave = Config.rawChipWaves[chipWaveIndex];
	const rawRawChipWave = Config.rawRawChipWaves[chipWaveIndex];
	if (OFFLINE) {
		if (url.slice(0, 5) === "file:") {
			const dirname = await getDirname();
			const joined = await pathJoin(dirname, url.slice(5));
			url = joined;
		}
	}
	fetch(url)
		.then((response) => {
			if (!response.ok) {
				// @TODO: Be specific with the error handling.
				sampleLoadingState.statusTable[chipWaveIndex] = SampleLoadingStatus.error;
				return Promise.reject(new Error("Couldn't load sample"));
			}
			return response.arrayBuffer();
		})
		.then((arrayBuffer) => {
			return sampleLoaderAudioContext.decodeAudioData(arrayBuffer);
		})
		.then((audioBuffer) => {
			// @TODO: Downmix.
			const samples = centerWave(Array.from(audioBuffer.getChannelData(0)));
			const integratedSamples = performIntegral(samples);
			chipWave.samples = integratedSamples;
			rawChipWave.samples = samples;
			rawRawChipWave.samples = samples;
			if (rawLoopOptions.isUsingAdvancedLoopControls) {
				presetSettings.chipWaveLoopStart = rawLoopOptions.chipWaveLoopStart != null ? rawLoopOptions.chipWaveLoopStart : 0;
				presetSettings.chipWaveLoopEnd = rawLoopOptions.chipWaveLoopEnd != null ? rawLoopOptions.chipWaveLoopEnd : samples.length - 1;
				presetSettings.chipWaveLoopMode = rawLoopOptions.chipWaveLoopMode != null ? rawLoopOptions.chipWaveLoopMode : 0;
				presetSettings.chipWavePlayBackwards = rawLoopOptions.chipWavePlayBackwards;
				presetSettings.chipWaveStartOffset = rawLoopOptions.chipWaveStartOffset != null ? rawLoopOptions.chipWaveStartOffset : 0;
			}
			sampleLoadingState.samplesLoaded++;
			sampleLoadingState.statusTable[chipWaveIndex] = SampleLoadingStatus.loaded;
			sampleLoadEvents.dispatchEvent(new SampleLoadedEvent(sampleLoadingState.totalSamples, sampleLoadingState.samplesLoaded));
			if (!closedSampleLoaderAudioContext) {
				closedSampleLoaderAudioContext = true;
				sampleLoaderAudioContext.close();
			}
		})
		.catch((error) => {
			// console.error(error);
			sampleLoadingState.statusTable[chipWaveIndex] = SampleLoadingStatus.error;
			alert(`Failed to load ${url}:\n${error}`);
			if (!closedSampleLoaderAudioContext) {
				closedSampleLoaderAudioContext = true;
				sampleLoaderAudioContext.close();
			}
		});
}

export function getLocalStorageItem<T>(key: string, defaultValue: T): T | string {
	let value: T | string | null = localStorage.getItem(key);
	if (value == null || value === "null" || value === "undefined") {
		value = defaultValue;
	}
	return value;
}

// @HACK: This just assumes these exist, regardless of whether they actually do
// or not.
declare global {
	const OFFLINE: boolean; // for UB offline
	const getDirname: () => Promise<string>; // for UB offline
	const pathJoin: (...parts: string[]) => Promise<string>; // for UB offline
	const kicksample: number[];
	const snaresample: number[];
	const pianosample: number[];
	const WOWsample: number[];
	const overdrivesample: number[];
	const trumpetsample: number[];
	const saxophonesample: number[];
	const orchhitsample: number[];
	const detatchedviolinsample: number[];
	const synthsample: number[];
	const sonic3snaresample: number[];
	const comeonsample: number[];
	const choirsample: number[];
	const overdrivensample: number[];
	const flutesample: number[];
	const legatoviolinsample: number[];
	const tremoloviolinsample: number[];
	const amenbreaksample: number[];
	const pizzicatoviolinsample: number[];
	const timallengruntsample: number[];
	const tubasample: number[];
	const loopingcymbalsample: number[];
	const kickdrumsample: number[];
	const snaredrumsample: number[];
	const closedhihatsample: number[];
	const foothihatsample: number[];
	const openhihatsample: number[];
	const crashsample: number[];
	const pianoC4sample: number[];
	const liverpadsample: number[];
	const marimbasample: number[];
	const susdotwavsample: number[];
	const wackyboxttssample: number[];
	const peppersteak1: number[];
	const peppersteak2: number[];
	const vinyl: number[];
	const slapbass: number[];
	const hdeboverdrive: number[];
	const sunsoftbass: number[];
	const masculinechoir: number[];
	const femininechoir: number[];
	const southtololoche: number[];
	const harp: number[];
	const panflute: number[];
	const krumhorn: number[];
	const timpani: number[];
	const crowdhey: number[];
	const warioland4brass: number[];
	const warioland4organ: number[];
	const warioland4daow: number[];
	const warioland4hourchime: number[];
	const warioland4tick: number[];
	const kirbykick: number[];
	const kirbysnare: number[];
	const kirbybongo: number[];
	const kirbyclick: number[];
	const funkkick: number[];
	const funksnare: number[];
	const funksnareleft: number[];
	const funksnareright: number[];
	const funktomhigh: number[];
	const funktomlow: number[];
	const funkhihatclosed: number[];
	const funkhihathalfopen: number[];
	const funkhihatopen: number[];
	const funkhihatopentip: number[];
	const funkhihatfoot: number[];
	const funkcrash: number[];
	const funkcrashtip: number[];
	const funkride: number[];
	const chronoperc1finalsample: number[];
	const synthkickfmsample: number[];
	const woodclicksample: number[];
	const acousticsnaresample: number[];
	const catpaintboxsample: number[];
	const gameboypaintboxsample: number[];
	const mariopaintboxsample: number[];
	const drumpaintboxsample: number[];
	const yoshipaintboxsample: number[];
	const starpaintboxsample: number[];
	const fireflowerpaintboxsample: number[];
	const dogpaintbox: number[];
	const oinkpaintbox: number[];
	const swanpaintboxsample: number[];
	const facepaintboxsample: number[];
}

function loadScript(url: string): Promise<void> {
	const result: Promise<void> = new Promise((resolve, _reject) => {
		if (!Config.willReloadForCustomSamples) {
			const script = document.createElement("script");
			script.src = url;
			document.head.appendChild(script);
			script.addEventListener("load", (_event) => {
				resolve();
			});
		} else {
			// There's not really any errors that show up if the loading for
			// this script is stopped early, but it won't really do anything
			// particularly useful either in that case.
		}
	});
	return result;
}

export function loadBuiltInSamples(set: number): void {
	const defaultIndex: number = 0;
	const defaultIntegratedSamples: Float32Array = Config.chipWaves[defaultIndex].samples;
	const defaultSamples: Float32Array = Config.rawRawChipWaves[defaultIndex].samples;

	if (set === 0) {
		// Create chip waves with the wrong sound.
		const chipWaves = [
			{ name: "paandorasbox kick", expression: 4.0, isSampled: true, isPercussion: true, extraSampleDetune: 0 },
			{ name: "paandorasbox snare", expression: 3.0, isSampled: true, isPercussion: true, extraSampleDetune: 0 },
			{ name: "paandorasbox piano1", expression: 3.0, isSampled: true, isPercussion: false, extraSampleDetune: 2 },
			{ name: "paandorasbox WOW", expression: 1.0, isSampled: true, isPercussion: false, extraSampleDetune: 0 },
			{ name: "paandorasbox overdrive", expression: 1.0, isSampled: true, isPercussion: false, extraSampleDetune: -2 },
			{ name: "paandorasbox trumpet", expression: 3.0, isSampled: true, isPercussion: false, extraSampleDetune: 1.2 },
			{ name: "paandorasbox saxophone", expression: 2.0, isSampled: true, isPercussion: false, extraSampleDetune: -5 },
			{
				name: "paandorasbox orchestrahit",
				expression: 2.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: 4.2,
			},
			{
				name: "paandorasbox detatched violin",
				expression: 2.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: 4.2,
			},
			{ name: "paandorasbox synth", expression: 2.0, isSampled: true, isPercussion: false, extraSampleDetune: -0.8 },
			{ name: "paandorasbox sonic3snare", expression: 2.0, isSampled: true, isPercussion: true, extraSampleDetune: 0 },
			{ name: "paandorasbox come on", expression: 2.0, isSampled: true, isPercussion: false, extraSampleDetune: 0 },
			{ name: "paandorasbox choir", expression: 2.0, isSampled: true, isPercussion: false, extraSampleDetune: -3 },
			{
				name: "paandorasbox overdriveguitar",
				expression: 2.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -6.2,
			},
			{ name: "paandorasbox flute", expression: 2.0, isSampled: true, isPercussion: false, extraSampleDetune: -6 },
			{
				name: "paandorasbox legato violin",
				expression: 2.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -28,
			},
			{
				name: "paandorasbox tremolo violin",
				expression: 2.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -33,
			},
			{ name: "paandorasbox amen break", expression: 1.0, isSampled: true, isPercussion: true, extraSampleDetune: -55 },
			{
				name: "paandorasbox pizzicato violin",
				expression: 2.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -11,
			},
			{
				name: "paandorasbox tim allen grunt",
				expression: 2.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -20,
			},
			{ name: "paandorasbox tuba", expression: 2.0, isSampled: true, isPercussion: false, extraSampleDetune: 44 },
			{
				name: "paandorasbox loopingcymbal",
				expression: 2.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -17,
			},
			{
				name: "paandorasbox standardkick",
				expression: 2.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -7,
			},
			{
				name: "paandorasbox standardsnare",
				expression: 2.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: 0,
			},
			{ name: "paandorasbox closedhihat", expression: 2.0, isSampled: true, isPercussion: true, extraSampleDetune: 5 },
			{ name: "paandorasbox foothihat", expression: 2.0, isSampled: true, isPercussion: true, extraSampleDetune: 4 },
			{ name: "paandorasbox openhihat", expression: 2.0, isSampled: true, isPercussion: true, extraSampleDetune: -31 },
			{
				name: "paandorasbox crashcymbal",
				expression: 2.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -43,
			},
			{ name: "paandorasbox pianoC4", expression: 2.0, isSampled: true, isPercussion: false, extraSampleDetune: -42.5 },
			{
				name: "paandorasbox liver pad",
				expression: 2.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -22.5,
			},
			{ name: "paandorasbox marimba", expression: 2.0, isSampled: true, isPercussion: false, extraSampleDetune: -15.5 },
			{
				name: "paandorasbox susdotwav",
				expression: 2.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -24.5,
			},
			{
				name: "paandorasbox wackyboxtts",
				expression: 2.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -17.5,
			},
			{
				name: "paandorasbox peppersteak_1",
				expression: 2.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -42.2,
			},
			{
				name: "paandorasbox peppersteak_2",
				expression: 2.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -47,
			},
			{
				name: "paandorasbox vinyl_noise",
				expression: 2.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -50,
			},
			{
				name: "paandorasbeta slap bass",
				expression: 1.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -56,
			},
			{
				name: "paandorasbeta HD EB overdrive guitar",
				expression: 1.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -60,
			},
			{
				name: "paandorasbeta sunsoft bass",
				expression: 1.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -18.5,
			},
			{
				name: "paandorasbeta masculine choir",
				expression: 1.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -50,
			},
			{
				name: "paandorasbeta feminine choir",
				expression: 1.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -60.5,
			},
			{
				name: "paandorasbeta tololoche",
				expression: 1.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -29.5,
			},
			{ name: "paandorasbeta harp", expression: 1.0, isSampled: true, isPercussion: false, extraSampleDetune: -54 },
			{
				name: "paandorasbeta pan flute",
				expression: 1.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -58,
			},
			{ name: "paandorasbeta krumhorn", expression: 1.0, isSampled: true, isPercussion: false, extraSampleDetune: -46 },
			{ name: "paandorasbeta timpani", expression: 1.0, isSampled: true, isPercussion: false, extraSampleDetune: -50 },
			{ name: "paandorasbeta crowd hey", expression: 1.0, isSampled: true, isPercussion: true, extraSampleDetune: -29 },
			{
				name: "paandorasbeta wario land 4 brass",
				expression: 1.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -68,
			},
			{
				name: "paandorasbeta wario land 4 rock organ",
				expression: 1.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -63,
			},
			{
				name: "paandorasbeta wario land 4 DAOW",
				expression: 1.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -35,
			},
			{
				name: "paandorasbeta wario land 4 hour chime",
				expression: 1.0,
				isSampled: true,
				isPercussion: false,
				extraSampleDetune: -47.5,
			},
			{
				name: "paandorasbeta wario land 4 tick",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -12.5,
			},
			{
				name: "paandorasbeta kirby kick",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -46.5,
			},
			{
				name: "paandorasbeta kirby snare",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -46.5,
			},
			{
				name: "paandorasbeta kirby bongo",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -46.5,
			},
			{
				name: "paandorasbeta kirby click",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -46.5,
			},
			{
				name: "paandorasbeta sonor kick",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -28.5,
			},
			{
				name: "paandorasbeta sonor snare",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -28.5,
			},
			{
				name: "paandorasbeta sonor snare (left hand)",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -22.5,
			},
			{
				name: "paandorasbeta sonor snare (right hand)",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -22.5,
			},
			{
				name: "paandorasbeta sonor high tom",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -41.5,
			},
			{
				name: "paandorasbeta sonor low tom",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -41.5,
			},
			{
				name: "paandorasbeta sonor hihat (closed)",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -17,
			},
			{
				name: "paandorasbeta sonor hihat (half opened)",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -21,
			},
			{
				name: "paandorasbeta sonor hihat (open)",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -54.5,
			},
			{
				name: "paandorasbeta sonor hihat (open tip)",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -43.5,
			},
			{
				name: "paandorasbeta sonor hihat (pedal)",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -28,
			},
			{
				name: "paandorasbeta sonor crash",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -51,
			},
			{
				name: "paandorasbeta sonor crash (tip)",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -50.5,
			},
			{
				name: "paandorasbeta sonor ride",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: -46,
			},
		];

		sampleLoadingState.totalSamples += chipWaves.length;

		// This assumes that Config.rawRawChipWaves and Config.chipWaves have
		// the same number of elements.
		const startIndex: number = Config.rawRawChipWaves.length;
		for (const chipWave of chipWaves) {
			const chipWaveIndex: number = Config.rawRawChipWaves.length;
			const rawChipWave = {
				index: chipWaveIndex,
				name: chipWave.name,
				expression: chipWave.expression,
				isSampled: chipWave.isSampled,
				isPercussion: chipWave.isPercussion,
				extraSampleDetune: chipWave.extraSampleDetune,
				samples: defaultSamples,
			};
			const rawRawChipWave = {
				index: chipWaveIndex,
				name: chipWave.name,
				expression: chipWave.expression,
				isSampled: chipWave.isSampled,
				isPercussion: chipWave.isPercussion,
				extraSampleDetune: chipWave.extraSampleDetune,
				samples: defaultSamples,
			};
			const integratedChipWave = {
				index: chipWaveIndex,
				name: chipWave.name,
				expression: chipWave.expression,
				isSampled: chipWave.isSampled,
				isPercussion: chipWave.isPercussion,
				extraSampleDetune: chipWave.extraSampleDetune,
				samples: defaultIntegratedSamples,
			};
			Config.rawRawChipWaves[chipWaveIndex] = rawRawChipWave;
			Config.rawRawChipWaves.dictionary[chipWave.name] = rawRawChipWave;
			Config.rawChipWaves[chipWaveIndex] = rawChipWave;
			Config.rawChipWaves.dictionary[chipWave.name] = rawChipWave;
			Config.chipWaves[chipWaveIndex] = integratedChipWave;
			Config.chipWaves.dictionary[chipWave.name] = rawChipWave;
			sampleLoadingState.statusTable[chipWaveIndex] = SampleLoadingStatus.loading;
			sampleLoadingState.urlTable[chipWaveIndex] = "legacySamples";
		}

		loadScript("samples/samples.js")
			.then(() => loadScript("samples/samples2.js"))
			.then(() => loadScript("samples/samples3.js"))
			.then(() => loadScript("samples/drumsamples.js"))
			.then(() => loadScript("samples/wario_samples.js"))
			.then(() => loadScript("samples/kirby_samples.js"))
			.then(() => {
				// Now put the right sounds in there after everything
				// got loaded.
				const chipWaveSamples: Float32Array[] = [
					centerWave(kicksample),
					centerWave(snaresample),
					centerWave(pianosample),
					centerWave(WOWsample),
					centerWave(overdrivesample),
					centerWave(trumpetsample),
					centerWave(saxophonesample),
					centerWave(orchhitsample),
					centerWave(detatchedviolinsample),
					centerWave(synthsample),
					centerWave(sonic3snaresample),
					centerWave(comeonsample),
					centerWave(choirsample),
					centerWave(overdrivensample),
					centerWave(flutesample),
					centerWave(legatoviolinsample),
					centerWave(tremoloviolinsample),
					centerWave(amenbreaksample),
					centerWave(pizzicatoviolinsample),
					centerWave(timallengruntsample),
					centerWave(tubasample),
					centerWave(loopingcymbalsample),
					centerWave(kickdrumsample),
					centerWave(snaredrumsample),
					centerWave(closedhihatsample),
					centerWave(foothihatsample),
					centerWave(openhihatsample),
					centerWave(crashsample),
					centerWave(pianoC4sample),
					centerWave(liverpadsample),
					centerWave(marimbasample),
					centerWave(susdotwavsample),
					centerWave(wackyboxttssample),
					centerWave(peppersteak1),
					centerWave(peppersteak2),
					centerWave(vinyl),
					centerWave(slapbass),
					centerWave(hdeboverdrive),
					centerWave(sunsoftbass),
					centerWave(masculinechoir),
					centerWave(femininechoir),
					centerWave(southtololoche),
					centerWave(harp),
					centerWave(panflute),
					centerWave(krumhorn),
					centerWave(timpani),
					centerWave(crowdhey),
					centerWave(warioland4brass),
					centerWave(warioland4organ),
					centerWave(warioland4daow),
					centerWave(warioland4hourchime),
					centerWave(warioland4tick),
					centerWave(kirbykick),
					centerWave(kirbysnare),
					centerWave(kirbybongo),
					centerWave(kirbyclick),
					centerWave(funkkick),
					centerWave(funksnare),
					centerWave(funksnareleft),
					centerWave(funksnareright),
					centerWave(funktomhigh),
					centerWave(funktomlow),
					centerWave(funkhihatclosed),
					centerWave(funkhihathalfopen),
					centerWave(funkhihatopen),
					centerWave(funkhihatopentip),
					centerWave(funkhihatfoot),
					centerWave(funkcrash),
					centerWave(funkcrashtip),
					centerWave(funkride),
				];
				let chipWaveIndexOffset: number = 0;
				for (const chipWaveSample of chipWaveSamples) {
					const chipWaveIndex: number = startIndex + chipWaveIndexOffset;
					Config.rawChipWaves[chipWaveIndex].samples = chipWaveSample;
					Config.rawRawChipWaves[chipWaveIndex].samples = chipWaveSample;
					Config.chipWaves[chipWaveIndex].samples = performIntegral(chipWaveSample);
					sampleLoadingState.statusTable[chipWaveIndex] = SampleLoadingStatus.loaded;
					sampleLoadingState.samplesLoaded++;
					sampleLoadEvents.dispatchEvent(new SampleLoadedEvent(sampleLoadingState.totalSamples, sampleLoadingState.samplesLoaded));
					chipWaveIndexOffset++;
				}
			});
		// EditorConfig.presetCategories[EditorConfig.presetCategories.length] = {name: "Legacy Sample Presets", presets:  { name: "Earthbound O. Guitar", midiProgram: 80, settings: { "type": "chip", "eqFilter": [], "effects": [], "transition": "normal", "fadeInSeconds": 0, "fadeOutTicks": -1, "chord": "arpeggio", "wave": "paandorasbox overdrive", "unison": "none",
	} else if (set === 1) {
		const chipWaves: { name: string; expression: number; isSampled: boolean; isPercussion: boolean; extraSampleDetune: number }[] = [
			{
				name: "nintaribox chronoperc1 final",
				expression: 1.0,
				isSampled: true,
				isPercussion: true,
				extraSampleDetune: 0,
			},
			{ name: "nintaribox synth kick fm", expression: 1.0, isSampled: true, isPercussion: true, extraSampleDetune: 0 },
			{ name: "nintaribox wood click", expression: 1.0, isSampled: true, isPercussion: true, extraSampleDetune: 0 },
			{ name: "nintaribox acoustic snare", expression: 1.0, isSampled: true, isPercussion: true, extraSampleDetune: 0 },
		];

		sampleLoadingState.totalSamples += chipWaves.length;

		const startIndex: number = Config.rawRawChipWaves.length;
		for (const chipWave of chipWaves) {
			const chipWaveIndex: number = Config.rawRawChipWaves.length;
			const rawChipWave = {
				index: chipWaveIndex,
				name: chipWave.name,
				expression: chipWave.expression,
				isSampled: chipWave.isSampled,
				isPercussion: chipWave.isPercussion,
				extraSampleDetune: chipWave.extraSampleDetune,
				samples: defaultSamples,
			};
			const rawRawChipWave = {
				index: chipWaveIndex,
				name: chipWave.name,
				expression: chipWave.expression,
				isSampled: chipWave.isSampled,
				isPercussion: chipWave.isPercussion,
				extraSampleDetune: chipWave.extraSampleDetune,
				samples: defaultSamples,
			};
			const integratedChipWave = {
				index: chipWaveIndex,
				name: chipWave.name,
				expression: chipWave.expression,
				isSampled: chipWave.isSampled,
				isPercussion: chipWave.isPercussion,
				extraSampleDetune: chipWave.extraSampleDetune,
				samples: defaultIntegratedSamples,
			};
			Config.rawRawChipWaves[chipWaveIndex] = rawRawChipWave;
			Config.rawRawChipWaves.dictionary[chipWave.name] = rawRawChipWave;
			Config.rawChipWaves[chipWaveIndex] = rawChipWave;
			Config.rawChipWaves.dictionary[chipWave.name] = rawChipWave;
			Config.chipWaves[chipWaveIndex] = integratedChipWave;
			Config.chipWaves.dictionary[chipWave.name] = rawChipWave;
			sampleLoadingState.statusTable[chipWaveIndex] = SampleLoadingStatus.loading;
			sampleLoadingState.urlTable[chipWaveIndex] = "nintariboxSamples";
		}

		loadScript("samples/nintaribox_samples.js").then(() => {
			const chipWaveSamples: Float32Array[] = [
				centerWave(chronoperc1finalsample),
				centerWave(synthkickfmsample),
				centerWave(woodclicksample),
				centerWave(acousticsnaresample),
			];
			let chipWaveIndexOffset: number = 0;
			for (const chipWaveSample of chipWaveSamples) {
				const chipWaveIndex: number = startIndex + chipWaveIndexOffset;
				Config.rawChipWaves[chipWaveIndex].samples = chipWaveSample;
				Config.rawRawChipWaves[chipWaveIndex].samples = chipWaveSample;
				Config.chipWaves[chipWaveIndex].samples = performIntegral(chipWaveSample);
				sampleLoadingState.statusTable[chipWaveIndex] = SampleLoadingStatus.loaded;
				sampleLoadingState.samplesLoaded++;
				sampleLoadEvents.dispatchEvent(new SampleLoadedEvent(sampleLoadingState.totalSamples, sampleLoadingState.samplesLoaded));
				chipWaveIndexOffset++;
			}
		});
	} else if (set === 2) {
		const chipWaves: { name: string; expression: number; isSampled: boolean; isPercussion: boolean; extraSampleDetune: number }[] = [
			{ name: "cat", expression: 1.0, isSampled: true, isPercussion: false, extraSampleDetune: 0 },
			{ name: "gameboy", expression: 1.0, isSampled: true, isPercussion: false, extraSampleDetune: 0 },
			{ name: "mario", expression: 1.0, isSampled: true, isPercussion: false, extraSampleDetune: 0 },
			{ name: "drum (paintbox)", expression: 1.0, isSampled: true, isPercussion: true, extraSampleDetune: 0 },
			{ name: "yoshi", expression: 1.0, isSampled: true, isPercussion: false, extraSampleDetune: 0 },
			{ name: "star (paintbox)", expression: 1.0, isSampled: true, isPercussion: false, extraSampleDetune: 0 },
			{ name: "fire flower", expression: 1.0, isSampled: true, isPercussion: false, extraSampleDetune: 0 },
			{ name: "dog", expression: 1.0, isSampled: true, isPercussion: false, extraSampleDetune: 0 },
			{ name: "oink", expression: 1.0, isSampled: true, isPercussion: false, extraSampleDetune: 0 },
			{ name: "swan", expression: 1.0, isSampled: true, isPercussion: false, extraSampleDetune: 0 },
			{ name: "face", expression: 1.0, isSampled: true, isPercussion: false, extraSampleDetune: 0 },
		];

		sampleLoadingState.totalSamples += chipWaves.length;

		const startIndex: number = Config.rawRawChipWaves.length;
		for (const chipWave of chipWaves) {
			const chipWaveIndex: number = Config.rawRawChipWaves.length;
			const rawChipWave = {
				index: chipWaveIndex,
				name: chipWave.name,
				expression: chipWave.expression,
				isSampled: chipWave.isSampled,
				isPercussion: chipWave.isPercussion,
				extraSampleDetune: chipWave.extraSampleDetune,
				samples: defaultSamples,
			};
			const rawRawChipWave = {
				index: chipWaveIndex,
				name: chipWave.name,
				expression: chipWave.expression,
				isSampled: chipWave.isSampled,
				isPercussion: chipWave.isPercussion,
				extraSampleDetune: chipWave.extraSampleDetune,
				samples: defaultSamples,
			};
			const integratedChipWave = {
				index: chipWaveIndex,
				name: chipWave.name,
				expression: chipWave.expression,
				isSampled: chipWave.isSampled,
				isPercussion: chipWave.isPercussion,
				extraSampleDetune: chipWave.extraSampleDetune,
				samples: defaultIntegratedSamples,
			};
			Config.rawRawChipWaves[chipWaveIndex] = rawRawChipWave;
			Config.rawRawChipWaves.dictionary[chipWave.name] = rawRawChipWave;
			Config.rawChipWaves[chipWaveIndex] = rawChipWave;
			Config.rawChipWaves.dictionary[chipWave.name] = rawChipWave;
			Config.chipWaves[chipWaveIndex] = integratedChipWave;
			Config.chipWaves.dictionary[chipWave.name] = rawChipWave;
			sampleLoadingState.statusTable[chipWaveIndex] = SampleLoadingStatus.loading;
			sampleLoadingState.urlTable[chipWaveIndex] = "marioPaintboxSamples";
		}

		loadScript("samples/mario_paintbox_samples.js").then(() => {
			// Now put the right sounds in there after everything
			// got loaded.
			const chipWaveSamples: Float32Array[] = [
				centerWave(catpaintboxsample),
				centerWave(gameboypaintboxsample),
				centerWave(mariopaintboxsample),
				centerWave(drumpaintboxsample),
				centerWave(yoshipaintboxsample),
				centerWave(starpaintboxsample),
				centerWave(fireflowerpaintboxsample),
				centerWave(dogpaintbox),
				centerWave(oinkpaintbox),
				centerWave(swanpaintboxsample),
				centerWave(facepaintboxsample),
			];
			let chipWaveIndexOffset: number = 0;
			for (const chipWaveSample of chipWaveSamples) {
				const chipWaveIndex: number = startIndex + chipWaveIndexOffset;
				Config.rawChipWaves[chipWaveIndex].samples = chipWaveSample;
				Config.rawRawChipWaves[chipWaveIndex].samples = chipWaveSample;
				Config.chipWaves[chipWaveIndex].samples = performIntegral(chipWaveSample);
				sampleLoadingState.statusTable[chipWaveIndex] = SampleLoadingStatus.loaded;
				sampleLoadingState.samplesLoaded++;
				sampleLoadEvents.dispatchEvent(new SampleLoadedEvent(sampleLoadingState.totalSamples, sampleLoadingState.samplesLoaded));
				chipWaveIndexOffset++;
			}
		});
	} else {
		console.log("invalid set of built-in samples");
	}
}
