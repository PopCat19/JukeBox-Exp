// synth.ts
//
// Purpose: Core synthesis engine — audio playback, rendering, and modulation
//
// This module:
// - Manages audio context, playback, and script-processor callbacks
// - Computes per-tick synthesis (FM, chip, spectrum, noise, harmonics, picked string)
// - Handles modulator value computation and filter interpolation
// - Manages tone allocation and channel/instrument state synchronization

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { AudioBackend, type AudioBackendHost } from "./audio-backend";
import { ChannelState } from "./channel-state";
import type { Channel } from "./channels";
import { Deque } from "./deque";
import { applyFilters, findRandomZeroCrossing, sanitizeDelayLine } from "./dsp-utils";
import { EnvelopeComputer } from "./envelope-computer";
import { DynamicBiquadFilter, type FilterCoefficients, FrequencyResponse } from "./filtering";
import { InstrumentState } from "./instrument-state";
import { FilterControlPoint, FilterSettings, type HeldMod, Instrument } from "./instruments";
import { SynthModState } from "./mod-state";
import type { Note, NotePin, Pattern } from "./notes";
import { PickedString } from "./picked-string";
import { getPlugin } from "./plugins";
import { PostProcessingState } from "./post-processing";
import { computeBasePitchAndExpression, computeSlides, computeToneIntervalAndFade } from "./render/compute-tone";
import {
	allocTone,
	freeAllTones,
	recycleTone,
	freeReleasedTone as renderFreeReleasedTone,
	getSamplesPerTick as renderGetSamplesPerTick,
	playTone as renderPlayTone,
	releaseTone as renderReleaseTone,
} from "./render/render-core";
import { SnapshotBuilder } from "./render/snapshot";
import { getInstrumentCapability } from "./socket/capability-lookup";
import { Song } from "./song";
import type { Chord, Envelope, Transition } from "./synth-config";
import {
	Config,
	EnvelopeComputeIndex,
	effectsIncludeDetune,
	effectsIncludeNoteFilter,
	effectsIncludeNoteRange,
	effectsIncludePitchShift,
	effectsIncludeVibrato,
	FilterType,
	getArpeggioPitchIndex,
	getPulseWidthRatio,
	InstrumentType,
} from "./synth-config";
import { effectsSynth } from "./synth-effects";
import {
	adjacentNotesHaveMatchingPitches,
	computeChordExpression,
	getLFOAmplitude,
	operatorAmplitudeCurve,
	volumeMultToInstrumentVolume,
	volumeMultToNoteSize,
} from "./synth-math";
import {
	instrumentVolumeToVolumeMult,
	noteSizeToVolumeMult,
	tempFilterEndCoefficients,
	tempFilterStartCoefficients,
} from "./synth-shared";
import { Tone } from "./tone";
import { clamp, detuneToCents, epsilon, fittingPowerOfTwo, getOperatorWave, wrap } from "./util";

declare global {
	interface Window {
		// biome-ignore lint/suspicious/noExplicitAny: browser API type missing
		AudioContext: any;
		// biome-ignore lint/suspicious/noExplicitAny: browser API type missing
		webkitAudioContext: any;
	}
}

/**
 * Query an instrument's capability flag, falling back to the legacy
 * getCapabilities() when no socket module id is set or the module
 * doesn't declare the flag.
 */

export class Synth {
	private _songChannelCount: number = 0;
	private _instrumentCounts: number[] = [];
	private _cachedHasTempoMods: boolean = false;
	private _cachedHasNextBarMods: boolean = false;

	private syncSongState(): void {
		const channelCount: number = this.song!.getChannelCount();
		// Fast path: skip full sync when structure is unchanged during playback.
		// Only muted toggles are checked (O(ch), no allocations).
		if (
			this._songChannelCount === channelCount &&
			this._instrumentCounts.length >= channelCount
		) {
			let unchanged: boolean = true;
			for (let i: number = 0; i < channelCount; i++) {
				if (this._instrumentCounts[i] !== this.song!.channels[i].instruments.length) {
					unchanged = false;
					break;
				}
			}
			if (unchanged) {
				// Still need to catch mute toggles
				for (let i: number = 0; i < channelCount; i++) {
					const channel: Channel = this.song!.channels[i];
					const channelState: ChannelState = this.channels[i];
					if (channelState.muted !== channel.muted) {
						channelState.muted = channel.muted;
						if (channelState.muted) {
							for (const inst of channelState.instruments) {
								inst.resetAllEffects();
							}
						}
					}
				}
				return;
			}
		}
		this._songChannelCount = channelCount;
		this._instrumentCounts.length = channelCount;

		for (let i: number = this.channels.length; i < channelCount; i++) {
			this.channels[i] = new ChannelState();
		}
		this.channels.length = channelCount;
		for (let i: number = 0; i < channelCount; i++) {
			const channel: Channel = this.song!.channels[i];
			const channelState: ChannelState = this.channels[i];
			for (
				let j: number = channelState.instruments.length;
				j < channel.instruments.length;
				j++
			) {
				channelState.instruments[j] = new InstrumentState();
			}
			channelState.instruments.length = channel.instruments.length;
			this._instrumentCounts[i] = channel.instruments.length;

			if (channelState.muted !== channel.muted) {
				channelState.muted = channel.muted;
				if (channelState.muted) {
					for (const instrumentState of channelState.instruments) {
						instrumentState.resetAllEffects();
					}
				}
			}
		}
	}

	public initModFilters(song: Song | null): void {
		this.modState.initModFilters(song);
	}
	public warmUpSynthesizer(song: Song | null): void {
		this._dbg("warmUpSynthesizer called, song:", !!song);
		// Don't bother to generate the drum waves unless the song actually
		// uses them, since they may require a lot of computation.
		if (song != null) {
			this.syncSongState();
			const samplesPerTick: number = this.getSamplesPerTick();
			for (
				let channelIndex: number = 0;
				channelIndex < song.getChannelCount();
				channelIndex++
			) {
				for (
					let instrumentIndex: number = 0;
					instrumentIndex < song.channels[channelIndex].instruments.length;
					instrumentIndex++
				) {
					const instrument: Instrument =
						song.channels[channelIndex].instruments[instrumentIndex];
					const instrumentState: InstrumentState =
						this.channels[channelIndex].instruments[instrumentIndex];
					Synth.getInstrumentSynthFunction(instrument);
					instrumentState.vibratoTime = 0;
					instrumentState.nextVibratoTime = 0;
					for (
						let envelopeIndex: number = 0;
						envelopeIndex < Config.maxEnvelopeCount + 1;
						envelopeIndex++
					) {
						instrumentState.envelopeTime[envelopeIndex] = 0;
					}
					instrumentState.arpTime = 0;
					instrumentState.updateWaves(instrument, this.samplesPerSecond);
					instrumentState.allocateNecessaryBuffers(this, instrument, samplesPerTick);
				}
			}
		}
		// JummBox needs to run synth functions for at least one sample (for JIT purposes)
		// before starting audio callbacks to avoid skipping the initial output.
		// NOTE: Do NOT toggle isPlayingSong here. It is set to true in play() after this returns.
		// Setting it to true temporarily creates a race condition: audio callbacks on the audio
		// thread can read isPlayingSong=true and call synthesize() with playSong=true, which
		// advances beat/part before playback officially starts.
		//
		// The dummy synthesize advances the transport by one sample (decrements
		// tickSampleCountdown, recomputes playheadInternal). That mutation is
		// incidental to warmup, so snapshot the transport first and restore it
		// afterward, making the warmup a true no-op on transport state.
		const _tBar = this.bar;
		const _tBeat = this.beat;
		const _tPart = this.part;
		const _tTick = this.tick;
		const _tCountdown = this.tickSampleCountdown;
		const _tAtStart = this.isAtStartOfTick;
		const _tPlayhead = this.playheadInternal;
		const _tPrevBar = this.prevBar;
		const _tNeedsReset = this._playheadNeedsReset;
		const dummyArray = new Float32Array(1);
		this.synthesize(dummyArray, dummyArray, 1, true);
		this.bar = _tBar;
		this.beat = _tBeat;
		this.part = _tPart;
		this.tick = _tTick;
		this.tickSampleCountdown = _tCountdown;
		this.isAtStartOfTick = _tAtStart;
		this.playheadInternal = _tPlayhead;
		this.prevBar = _tPrevBar;
		this._playheadNeedsReset = _tNeedsReset;
	}

	public computeLatestModValues(): void {
		this.modState.computeLatestModValues(this.song, this.bar, this.beat, this.part);
	}

	// Detects if a modulator is set, but not valid for the current effects/instrument type/filter type
	// Note, setting 'none' or the intermediary steps when clicking to add a mod, like an unset channel/unset instrument, counts as valid.
	// TODO: This kind of check is mirrored in SongEditor.ts' whenUpdated. Creates a lot of redundancy for adding new mods. Can be moved into new properties for mods, to avoid this later.

	public determineInvalidModulators(instrument: Instrument): void {
		this.modState.determineInvalidModulators(this.song, instrument);
	}

	private static operatorAmplitudeCurve(amplitude: number): number {
		return operatorAmplitudeCurve(amplitude);
	}

	public samplesPerSecond: number = Config.defaultSampleRate;
	public panningDelayBufferSize: number;
	public panningDelayBufferMask: number;
	public chorusDelayBufferSize: number;
	public chorusDelayBufferMask: number;
	// TODO: reverb

	public song: Song | null = null;
	public preferLowerLatency: boolean = false; // enable when recording performances from keyboard or MIDI. Takes effect next time you activate audio.
	public anticipatePoorPerformance: boolean = false; // enable on mobile devices to reduce audio stutter glitches. Takes effect next time you activate audio.
	public liveInputDuration: number = 0;
	public liveBassInputDuration: number = 0;
	public liveInputStarted: boolean = false;
	public liveBassInputStarted: boolean = false;
	public liveInputPitches: number[] = [];
	public liveInputVelocities: number[] = [];
	public liveBassInputPitches: number[] = [];
	public liveBassInputVelocities: number[] = [];
	public liveInputChannel: number = 0;
	public liveBassInputChannel: number = 0;
	public liveInputInstruments: number[] = [];
	public liveBassInputInstruments: number[] = [];
	public loopRepeatCount: number = -1;
	public volume: number = 1.0;
	public oscRefreshEventTimer: number = 0;
	public spectrumEnabled: boolean = true;
	public onSpectrumUpdate?: (left: Float32Array, right: Float32Array) => void;
	public onSpectrumReset?: () => void;
	public totalSamplesRendered: number = 0;
	// _lastSpectrumUpdateTime and SPECTRUM_UPDATE_INTERVAL_MS moved to AudioBackend
	public enableMetronome: boolean = false;
	public countInMetronome: boolean = false;
	public renderingSong: boolean = false;
	public readonly snapshotBuilder: SnapshotBuilder = new SnapshotBuilder();
	public heldMods: HeldMod[] = [];
	private wantToSkip: boolean = false;
	private playheadInternal: number = 0.0;
	private bar: number = 0;
	private prevBar: number | null = null;
	private nextBar: number | null = null;
	private beat: number = 0;
	private part: number = 0;
	private tick: number = 0;
	public isAtStartOfTick: boolean = true;
	public isAtEndOfTick: boolean = true;
	public tickSampleCountdown: number = 0;
	private _playheadNeedsReset: boolean = false;
	// Set true by play() so the first audible synthesize output prepends
	// ~1ms of silence. The pre-roll absorbs browser AudioContext startup
	// latency so beat 0's attack is not truncated. Consumed (cleared) by
	// the first real synthesize call after isPlayingSong becomes true;
	// gated on isPlayingSong so the JIT warm-up synthesize (which runs
	// with playSong=true but isPlayingSong=false) does not eat the
	// lead-in.
	private _needsLeadIn: boolean = false;
	public modState: SynthModState = new SynthModState();
	public isPlayingSong: boolean = false;
	private isRecording: boolean = false;
	public liveInputEndTime: number = 0.0;

	public static readonly tempFilterStartCoefficients: FilterCoefficients =
		tempFilterStartCoefficients;
	public static readonly tempFilterEndCoefficients: FilterCoefficients =
		tempFilterEndCoefficients;
	private tempDrumSetControlPoint: FilterControlPoint = new FilterControlPoint();
	public tempFrequencyResponse: FrequencyResponse = new FrequencyResponse();
	public loopBarStart: number = -1;
	public loopBarEnd: number = -1;

	private _stopFadeSamplesRemaining: number = 0;
	private _stopFadeSamplesTotal: number = 0;
	private _stopFadeCleanupDone: boolean = false;
	private static readonly STOP_FADE_DURATION_MS: number = 800;
	private _fadeoutPlayheadSnapshot: number = 0;

	public readonly channels: ChannelState[] = [];
	private readonly tonePool: Deque<Tone> = new Deque<Tone>();
	private readonly tempMatchedPitchTones: Array<Tone | null> = Array(Config.maxChordSize).fill(
		null,
	);

	private startedMetronome: boolean = false;
	private metronomeSamplesRemaining: number = -1;
	private metronomeAmplitude: number = 0.0;
	private metronomePrevAmplitude: number = 0.0;
	private metronomeFilter: number = 0.0;
	private _postProc: PostProcessingState = new PostProcessingState();

	private tempMonoInstrumentSampleBuffer: Float32Array | null = null;
	public outputDataLUnfiltered: Float32Array | null = null;
	public outputDataRUnfiltered: Float32Array | null = null;
	private readonly _reusableFilteredPitches: number[] = [];
	private readonly _reusableFilteredPitchesAndVelocities: number[] = [];

	private _fillFilteredPitches(source: number[], lower: number, upper: number): number[] {
		const out: number[] = this._reusableFilteredPitches;
		out.length = 0;
		for (let i: number = 0; i < source.length; i++) {
			if (source[i] >= lower && source[i] <= upper) out.push(source[i]);
		}
		return out;
	}

	private _fillFilteredPitchesAndVelocities(
		sourcePitches: number[],
		sourceVelocities: number[],
		lowerPitch: number,
		upperPitch: number,
		lowerVel: number,
		upperVel: number,
	): number[] {
		const out: number[] = this._reusableFilteredPitchesAndVelocities;
		out.length = 0;
		for (let i: number = 0; i < sourcePitches.length; i++) {
			const pitch: number = sourcePitches[i];
			if (pitch < lowerPitch || pitch > upperPitch) continue;
			const vel: number = i < sourceVelocities.length ? sourceVelocities[i] : 64;
			if (vel < lowerVel || vel > upperVel) continue;
			out.push(pitch);
		}
		return out;
	}

	// Redundant with inferred type but kept for self-documenting field declaration

	private _audio: AudioBackend = new AudioBackend();
	private _logSynthCallCount: number = 0;
	private _stutterCount: number = 0;
	private _lastStutterLogMs: number = 0;
	// _logNeedDataCount moved to AudioBackend

	private static _debugSynthEnabled(): boolean {
		try {
			if (typeof window === "undefined") return false;
			// biome-ignore lint/suspicious/noExplicitAny: dynamic property access
			const w = window as any;
			if (w.debugSynth === "1" || w.debugSynth === "true") return true;
			if (window.localStorage) {
				const v = window.localStorage.getItem("debugSynth");
				if (v === "1" || v === "true") return true;
			}
		} catch {
			/* ignore */
		}
		return false;
	}

	private _dbg(...args: unknown[]): void {
		if (Synth._debugSynthEnabled()) console.log("[Synth]", ...args);
	}

	private _dbgWarn(...args: unknown[]): void {
		if (Synth._debugSynthEnabled()) console.warn("[Synth]", ...args);
	}

	/** Snapshot the transport state for diagnosing playhead drift.
	 *  Logs the producer head (`playheadInternal`) and the SAB queue depth
	 *  so the audible head (producer minus queued bars) can be compared to
	 *  what the user actually hears. The queue depth is the gap between the
	 *  render head and the worklet reader; that gap is exactly the offset
	 *  `get playhead()` subtracts. */
	private _debugTransport(label: string): void {
		const queued: number = this._audio.getQueuedSampleCount();
		const samplesPerBar: number = this.song == null ? 0 : this.getSamplesPerBar();
		const queuedBars: number = samplesPerBar > 0 ? queued / samplesPerBar : 0;
		this._dbg(
			`[transport ${label}] render=${this.playheadInternal.toFixed(4)} bar=${this.bar} beat=${this.beat}.${this.part}.${this.tick} cd=${this.tickSampleCountdown.toFixed(1)} queuedSamples=${queued} queuedBars=${queuedBars.toFixed(4)} audible=${(this.playheadInternal - queuedBars).toFixed(4)}`,
		);
	}

	public get playing(): boolean {
		return this.isPlayingSong;
	}

	public get currentBar(): number {
		return this.bar;
	}

	public get fadingOut(): boolean {
		return this._stopFadeSamplesRemaining > 0;
	}

	public get recording(): boolean {
		return this.isRecording;
	}

	public get playhead(): number {
		// `playheadInternal` is the producer/render head: it tracks how far
		// `synthesize()` has generated, which runs ahead of what the user
		// actually hears by the depth of the SAB ring buffer (pre-rendered
		// audio queued between the writer and the worklet reader). The
		// visible/audible position the user perceives is the reader head, so
		// subtract the queued audio (in song bars) from the render head.
		// Clamp at 0: the initial `_doActivate` fill is silent
		// (playSong=false, contributes no song-bars to playheadInternal), so
		// during the silent-prebuffer window the raw subtraction can go
		// negative before the reader reaches the first real-audio slot.
		// During fadeout the ring buffer keeps filling with tail audio while
		// playheadInternal is frozen, so queuedBars oscillates and the raw
		// subtraction causes the playhead to jitter. Return the snapshot
		// taken when fadeout began so the playhead stays stationary.
		if (this._stopFadeSamplesRemaining > 0) return this._fadeoutPlayheadSnapshot;
		if (this.song == null) return this.playheadInternal;
		const queuedSamples: number = this._audio.getQueuedSampleCount();
		if (queuedSamples <= 0) return this.playheadInternal;
		const samplesPerBar: number = this.getSamplesPerBar();
		if (samplesPerBar <= 0) return this.playheadInternal;
		const queuedBars: number = queuedSamples / samplesPerBar;
		return Math.max(0, this.playheadInternal - queuedBars);
	}

	public set playhead(value: number) {
		if (this.song != null) {
			this.playheadInternal = Math.max(0, Math.min(this.song.barCount, value));
			let remainder: number = this.playheadInternal;
			this.bar = Math.floor(remainder);
			remainder = this.song.beatsPerBar * (remainder - this.bar);
			this.beat = Math.floor(remainder);
			remainder = Config.partsPerBeat * (remainder - this.beat);
			this.part = Math.floor(remainder);
			remainder = Config.ticksPerPart * (remainder - this.part);
			this.tick = Math.floor(remainder);
			this.tickSampleCountdown = 0;
			this.isAtStartOfTick = true;
			this.prevBar = null;
		}
	}

	public getSamplesPerBar(): number {
		if (this.song == null) throw new Error();
		return (
			this.getSamplesPerTick() *
			Config.ticksPerPart *
			Config.partsPerBeat *
			this.song.beatsPerBar
		);
	}

	// Full post-limiter master gain factor that the per-channel audio ring omits:
	// masterGain^2 (song) and the volume knob + limiter (limitedVolume). The
	// channel-volume visualizer multiplies the per-channel ring by this so its
	// meters/spectrum reflect the channel's level at the output bus, matching what
	// is heard, instead of the pre-master mix-bus level the ring captures.
	// Clamped to avoid the limiter's startup spike (limit starts at 0, which
	// would otherwise yield volume/0.25 for the first buffer).
	public getMasterScale(): number {
		const song = this.song;
		if (song == null) return 1;
		const limit = this._postProc.limit < 0.1 ? 0.1 : this._postProc.limit;
		const limitedVolume = this.volume / (limit >= 1 ? limit * 1.05 : limit * 0.8 + 0.25);
		return Math.min(8, song.masterGain * song.masterGain * limitedVolume);
	}

	public getTicksIntoBar(): number {
		return (this.beat * Config.partsPerBeat + this.part) * Config.ticksPerPart + this.tick;
	}
	public getCurrentPart(): number {
		return this.beat * Config.partsPerBeat + this.part;
	}

	// Returns the total samples in the song
	public getTotalSamples(enableIntro: boolean, enableOutro: boolean, loop: number): number {
		if (this.song == null) {
			return -1;
		}

		// Compute the window to be checked (start bar to end bar)
		const startBar: number = enableIntro ? 0 : this.song.loopStart;
		const endBar: number = enableOutro
			? this.song.barCount
			: this.song.loopStart + this.song.loopLength;
		return this._getTotalSamplesCore(startBar, endBar, loop, enableIntro, enableOutro);
	}

	// Mod-aware sample count from bar 0 up to (not including) the given bar.
	// Used to seed totalSamplesRendered on play and navigation so the elapsed
	// counter stays accurate and continuous across tempo mods and next-bar skips.
	// Mirrors getTotalSamples with startBar=0, no loop, full song window.
	public getSamplesUpToBar(bar: number): number {
		if (this.song == null) return 0;
		const clampedBar: number = Math.max(0, Math.min(bar, this.song.barCount));
		return this._getTotalSamplesCore(0, clampedBar, 0, true, true);
	}

	private _getTotalSamplesCore(
		startBar: number,
		endBar: number,
		loop: number,
		enableIntro: boolean,
		enableOutro: boolean,
	): number {
		if (this.song == null) {
			return -1;
		}
		// Empty or inverted window with no looping renders zero samples.
		// Without this guard the tempo-mod branch below runs its loop once
		// for startBar===endBar (it checks the exit condition after
		// processing a bar), returning ~one bar of samples instead of 0.
		// That made getSamplesUpToBar(0) nonzero for mod songs, so
		// goToBar(0) / play() from bar 0 seeded totalSamplesRendered to
		// ~1 bar and the elapsed counter never reset on import.
		if (loop === 0 && endBar <= startBar) {
			return 0;
		}
		const hasTempoMods: boolean = this._cachedHasTempoMods;
		const hasNextBarMods: boolean = this._cachedHasNextBarMods;
		let prevTempo: number = this.song.tempo;

		// If intro is not zero length, determine what the "entry" tempo is going into the start part, by looking at mods that came before...
		if (startBar > 0) {
			let latestTempoPin: number | null = null;
			let latestTempoValue: number = 0;

			for (let bar: number = startBar - 1; bar >= 0; bar--) {
				for (
					let channel: number = this.song.getChannelCount() - 1;
					channel >= this.song.pitchChannelCount + this.song.noiseChannelCount;
					channel--
				) {
					const pattern = this.song.getPattern(channel, bar);

					if (pattern != null) {
						const instrumentIdx: number = pattern.instruments[0];
						const instrument: Instrument =
							this.song.channels[channel].instruments[instrumentIdx];

						const partsInBar: number = this.modState.findPartsInBar(this.song, bar);

						for (const note of pattern.notes) {
							if (
								instrument.modulators[Config.modCount - 1 - note.pitches[0]] ===
								Config.modulators.dictionary.tempo.index
							) {
								if (
									note.start < partsInBar &&
									(latestTempoPin == null || note.end > latestTempoPin)
								) {
									if (note.end <= partsInBar) {
										latestTempoPin = note.end;
										latestTempoValue = note.pins[note.pins.length - 1].size;
									} else {
										latestTempoPin = partsInBar;
										// Find the pin where bar change happens, and compute where pin volume would be at that time
										for (let pinIdx = 0; pinIdx < note.pins.length; pinIdx++) {
											if (note.pins[pinIdx].time + note.start > partsInBar) {
												const transitionLength: number =
													note.pins[pinIdx].time -
													note.pins[pinIdx - 1].time;
												const toNextBarLength: number =
													partsInBar -
													note.start -
													note.pins[pinIdx - 1].time;
												const deltaVolume: number =
													note.pins[pinIdx].size -
													note.pins[pinIdx - 1].size;

												latestTempoValue = Math.round(
													note.pins[pinIdx - 1].size +
														(deltaVolume * toNextBarLength) /
															transitionLength,
												);
												pinIdx = note.pins.length;
											}
										}
									}
								}
							}
						}
					}
				}

				// Done once you process a pattern where tempo mods happened, since the search happens backward
				if (latestTempoPin != null) {
					prevTempo =
						latestTempoValue + Config.modulators.dictionary.tempo.convertRealFactor;
					bar = -1;
				}
			}
		}

		if (hasTempoMods || hasNextBarMods) {
			// Run from start bar to end bar and observe looping, computing average tempo across each bar
			let bar: number = startBar;
			let ended: boolean = false;
			let totalSamples: number = 0;

			while (!ended) {
				// Compute the subsection of the pattern that will play
				let partsInBar: number = Config.partsPerBeat * this.song.beatsPerBar;
				let currentPart: number = 0;

				if (hasNextBarMods) {
					partsInBar = this.modState.findPartsInBar(this.song, bar);
				}

				// Compute average tempo in this tick window, or use last tempo if nothing happened
				if (hasTempoMods) {
					let foundMod: boolean = false;
					for (
						let channel: number = this.song.getChannelCount() - 1;
						channel >= this.song.pitchChannelCount + this.song.noiseChannelCount;
						channel--
					) {
						if (!foundMod) {
							const pattern: Pattern | null = this.song.getPattern(channel, bar);
							if (pattern != null) {
								const instrument: Instrument =
									this.song.channels[channel].instruments[pattern.instruments[0]];
								for (let mod: number = 0; mod < Config.modCount; mod++) {
									if (
										!foundMod &&
										instrument.modulators[mod] ===
											Config.modulators.dictionary.tempo.index &&
										pattern.notes.find(
											(n) => n.pitches[0] === Config.modCount - 1 - mod,
										)
									) {
										// Only the first tempo mod instrument for this bar will be checked (well, the first with a note in this bar).
										foundMod = true;
										// Sort a copy to avoid mutating the source pattern
										const sortedNotes = pattern.notes
											.slice()
											.sort((a, b) =>
												a.start === b.start
													? a.pitches[0] - b.pitches[0]
													: a.start - b.start,
											);
										for (const note of sortedNotes) {
											if (note.pitches[0] === Config.modCount - 1 - mod) {
												// Compute samples up to this note
												totalSamples +=
													Math.min(
														partsInBar - currentPart,
														note.start - currentPart,
													) *
													Config.ticksPerPart *
													this.getSamplesPerTickSpecificBPM(prevTempo);

												if (note.start < partsInBar) {
													for (
														let pinIdx: number = 1;
														pinIdx < note.pins.length;
														pinIdx++
													) {
														// Compute samples up to this pin
														if (
															note.pins[pinIdx - 1].time +
																note.start <=
															partsInBar
														) {
															const tickLength: number =
																Config.ticksPerPart *
																Math.min(
																	partsInBar -
																		(note.start +
																			note.pins[pinIdx - 1]
																				.time),
																	note.pins[pinIdx].time -
																		note.pins[pinIdx - 1].time,
																);
															const prevPinTempo: number =
																note.pins[pinIdx - 1].size +
																Config.modulators.dictionary.tempo
																	.convertRealFactor;
															let currPinTempo: number =
																note.pins[pinIdx].size +
																Config.modulators.dictionary.tempo
																	.convertRealFactor;
															if (
																note.pins[pinIdx].time +
																	note.start >
																partsInBar
															) {
																// Compute an intermediary tempo since bar changed over mid-pin. Maybe I'm deep in "what if" territory now!
																currPinTempo =
																	note.pins[pinIdx - 1].size +
																	((note.pins[pinIdx].size -
																		note.pins[pinIdx - 1]
																			.size) *
																		(partsInBar -
																			(note.start +
																				note.pins[
																					pinIdx - 1
																				].time))) /
																		(note.pins[pinIdx].time -
																			note.pins[pinIdx - 1]
																				.time) +
																	Config.modulators.dictionary
																		.tempo.convertRealFactor;
															}
															const bpmScalar: number =
																(Config.partsPerBeat *
																	Config.ticksPerPart) /
																60;

															if (currPinTempo !== prevPinTempo) {
																// Definite integral of SamplesPerTick w/r/t beats to find total samples from start point to end point for a variable tempo
																// The starting formula is
																// SamplesPerTick = SamplesPerSec / ((PartsPerBeat * TicksPerPart) / SecPerMin) * BeatsPerMin )
																//
																// This is an expression of samples per tick "instantaneously", and it can be multiplied by a number of ticks to get a sample count.
																// But this isn't the full story. BeatsPerMin, e.g. tempo, changes throughout the interval so it has to be expressed in terms of ticks, "t"
																// ( Also from now on PartsPerBeat, TicksPerPart, and SecPerMin are combined into one scalar, called "BPMScalar" )
																// Substituting BPM for a step variable that moves with respect to the current tick, we get
																// SamplesPerTick = SamplesPerSec / (BPMScalar * ( (EndTempo - StartTempo / TickLength) * t + StartTempo ) )
																//
																// Integrating from 0 to TickLength with respect to t:
																//   Samples = - SamplesPerSec * TickLength * ( log( BPMScalar * EndTempo * TickLength ) - log( BPMScalar * StartTempo * TickLength ) ) / BPMScalar * ( StartTempo - EndTempo )

																totalSamples +=
																	(-this.samplesPerSecond *
																		tickLength *
																		(Math.log(
																			bpmScalar *
																				currPinTempo *
																				tickLength,
																		) -
																			Math.log(
																				bpmScalar *
																					prevPinTempo *
																					tickLength,
																			))) /
																	(bpmScalar *
																		(prevPinTempo -
																			currPinTempo));
															} else {
																// No tempo change between the two pins.
																totalSamples +=
																	tickLength *
																	this.getSamplesPerTickSpecificBPM(
																		currPinTempo,
																	);
															}
															prevTempo = currPinTempo;
														}
														currentPart = Math.min(
															note.start + note.pins[pinIdx].time,
															partsInBar,
														);
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}

				// Compute samples for the rest of the bar
				totalSamples +=
					(partsInBar - currentPart) *
					Config.ticksPerPart *
					this.getSamplesPerTickSpecificBPM(prevTempo);

				bar++;
				if (loop !== 0 && bar === this.song.loopStart + this.song.loopLength) {
					bar = this.song.loopStart;
					if (loop > 0) loop--;
				}
				if (bar >= endBar) {
					ended = true;
				}
			}

			return Math.ceil(totalSamples);
		} else {
			// No tempo or next bar mods... phew! Just calculate normally.
			// Count bars actually traversed in the window: for looped playback this
			// matches getTotalBars (intro + loop*(loop+1) + outro); for an unlooped
			// slice (e.g. getSamplesUpToBar) it is just endBar - startBar.
			const barCount: number =
				loop === 0 ? endBar - startBar : this.getTotalBars(enableIntro, enableOutro, loop);
			return this.getSamplesPerBar() * barCount;
		}
	}

	public getTotalBars(
		enableIntro: boolean,
		enableOutro: boolean,
		useLoopCount: number = this.loopRepeatCount,
	): number {
		if (this.song == null) throw new Error();
		let bars: number = this.song.loopLength * (useLoopCount + 1);
		if (enableIntro) bars += this.song.loopStart;
		if (enableOutro) bars += this.song.barCount - (this.song.loopStart + this.song.loopLength);
		return bars;
	}

	constructor(song: Song | string | null = null) {
		this.computeDelayBufferSizes();
		if (song != null) this.setSong(song);
	}

	public setSong(song: Song | string): void {
		if (typeof song === "string") {
			this.song = new Song(song);
		} else if (song instanceof Song) {
			this.song = song;
		}
		this.prevBar = null;
		this._cacheSongModFlags();
	}

	/** Bump editSequence — call after every editor change that mutates the song. */
	public incrementEditSequence(): void {
		this.snapshotBuilder.incrementEditSequence();
	}

	/** Scan song mod channels once to cache tempo/next-bar mod presence. */
	private _cacheSongModFlags(): void {
		this._cachedHasTempoMods = false;
		this._cachedHasNextBarMods = false;
		if (this.song == null) return;
		for (
			let channel: number = this.song.getChannelCount() - 1;
			channel >= this.song.pitchChannelCount + this.song.noiseChannelCount;
			channel--
		) {
			for (let bar: number = 0; bar < this.song.barCount; bar++) {
				const pattern: Pattern | null = this.song.getPattern(channel, bar);
				if (pattern == null) continue;
				const instrument: Instrument =
					this.song.channels[channel].instruments[pattern.instruments[0]];
				for (let mod: number = 0; mod < Config.modCount; mod++) {
					if (instrument.modulators[mod] === Config.modulators.dictionary.tempo.index) {
						this._cachedHasTempoMods = true;
					}
					if (
						instrument.modulators[mod] ===
						Config.modulators.dictionary["next bar"].index
					) {
						this._cachedHasNextBarMods = true;
					}
				}
			}
		}
	}

	private computeDelayBufferSizes(): void {
		this.panningDelayBufferSize = fittingPowerOfTwo(
			this.samplesPerSecond * Config.panDelaySecondsMax,
		);
		this.panningDelayBufferMask = this.panningDelayBufferSize - 1;
		this.chorusDelayBufferSize = fittingPowerOfTwo(
			this.samplesPerSecond * Config.chorusMaxDelay,
		);
		this.chorusDelayBufferMask = this.chorusDelayBufferSize - 1;
	}

	private _toAudioHost(): AudioBackendHost {
		return {
			synthesize: (l, r, len, play) => {
				this.synthesize(l, r, len, play);
			},
			isPlayingSong: () => this.isPlayingSong,
			isFadingOut: () => this._stopFadeSamplesRemaining > 0,
			liveInputEndTime: () => this.liveInputEndTime,
			spectrumEnabled: this.spectrumEnabled,
			onSpectrumUpdate: this.onSpectrumUpdate,
			onSpectrumReset: this.onSpectrumReset,
			anticipatePoorPerformance: this.anticipatePoorPerformance,
			preferLowerLatency: this.preferLowerLatency,
		};
	}

	private activateAudio(): Promise<void> {
		if (this.isPlayingSong && this._audio.context) {
			this.samplesPerSecond = this._audio.context.sampleRate;
		}
		return this._audio.activate(this._toAudioHost());
	}

	private deactivateAudio(): void {
		this._audio.deactivate();
	}

	private _startSpectrumDecay(): void {
		this._audio.startSpectrumDecay(this._toAudioHost());
	}

	private _primeWorklet(): void {
		this._audio.fillAllFreeSlots(this._toAudioHost());
	}

	public async maintainLiveInput(): Promise<void> {
		if (this._audio.isActive) {
			if (this.liveInputPitches.length > 0 || this.liveBassInputPitches.length > 0) {
				this.liveInputEndTime = performance.now() + 10000.0;
			}
			return;
		}
		this._dbg("maintainLiveInput: activating audio");
		await this.activateAudio();
		if (!this._audio.isActive) {
			this._dbgWarn(
				"maintainLiveInput: audio not active after activateAudio, forcing re-activation",
			);
			await this.activateAudio();
		}
		await this._audio.resumeContext();
		this.liveInputEndTime = performance.now() + 10000.0;
	}

	public async play(): Promise<void> {
		this._dbg(
			"play() called, isPlayingSong:",
			this.isPlayingSong,
			"fadeRemaining:",
			this._stopFadeSamplesRemaining,
		);
		this._audio.cancelSpectrumDecay();

		// Cancel any pending stop fade and clean up immediately
		// Also reset the song-end flag so it doesn't leak across
		// play sessions and cause an unwanted bar reset on the
		// next manual pause.
		if (this._stopFadeSamplesRemaining > 0) {
			this._stopFadeSamplesRemaining = 0;
			this.freeAllTones();
		}

		if (this.isPlayingSong) return;
		this.modState.initModFilters(this.song);
		this.modState.computeLatestModValues(this.song, this.bar, this.beat, this.part);
		await this.activateAudio();
		if (!this._audio.isActive) {
			this._dbgWarn("play: audio not active after activateAudio, forcing re-activation");
			await this.activateAudio();
		}
		await this._audio.resumeContext();
		this.warmUpSynthesizer(this.song);
		this._needsLeadIn = true;
		this.isPlayingSong = true;
		if (this._audio.context) {
			this.samplesPerSecond = this._audio.context.sampleRate;
		}
		this.totalSamplesRendered = this.getSamplesUpToBar(this.bar);
		this._dbg("isPlayingSong set to true, playhead:", this.playheadInternal, "bar:", this.bar);
		this._debugTransport("pre-prime");
		this._primeWorklet();
		this._debugTransport("post-prime");
	}

	public pause(): void {
		this._dbg("pause() called, isPlayingSong:", this.isPlayingSong);
		if (!this.isPlayingSong) return;
		this.isPlayingSong = false;
		this.isRecording = false;
		this.preferLowerLatency = false;
		this._fadeoutPlayheadSnapshot = this.playhead;
		this._dbg("Pausing with fade, playhead:", this.playheadInternal, "bar:", this.bar);

		// Start spectrum decay loop so it fades smoothly instead of freezing
		this._startSpectrumDecay();

		// Move active tones to released state so they ring out naturally
		// via the existing fadeOutTicks system. The master gain ramp in
		// synthesize() smooths the transition to silence.
		for (const channelState of this.channels) {
			for (const instrumentState of channelState.instruments) {
				while (instrumentState.activeTones.count() > 0) {
					this.releaseTone(instrumentState, instrumentState.activeTones.popBack());
				}
				while (instrumentState.activeModTones.count() > 0) {
					this.releaseTone(instrumentState, instrumentState.activeModTones.popBack());
				}
				while (instrumentState.liveInputTones.count() > 0) {
					this.releaseTone(instrumentState, instrumentState.liveInputTones.popBack());
				}
			}
		}

		this._stopFadeSamplesTotal = Math.round(
			Synth.STOP_FADE_DURATION_MS * 0.001 * this.samplesPerSecond,
		);
		this._stopFadeSamplesRemaining = this._stopFadeSamplesTotal;
		this._stopFadeCleanupDone = false;

		// Debug: count active tones at fade start
		if (AudioBackend._debugSynthEnabled()) {
			let activeCount = 0;
			let releasedCount = 0;
			for (const channelState of this.channels) {
				for (const instrumentState of channelState.instruments) {
					activeCount += instrumentState.activeTones.count();
					releasedCount += instrumentState.releasedTones.count();
				}
			}
			this._dbg(
				"Fade start: fadeSamples=",
				this._stopFadeSamplesTotal,
				"activeTones=",
				activeCount,
				"releasedTones=",
				releasedCount,
			);
		}

		// Don't free tones, clear mods, or reset effects — let the fade
		// ramp in synthesize() handle cleanup on completion.
	}

	public async startRecording(): Promise<void> {
		this._dbg("startRecording() called");
		this.preferLowerLatency = true;
		this.isRecording = true;
		await this.play();
	}

	public resetEffects(): void {
		// During stop fade: don't reset the limiter — setting limit=0 causes
		// a 4x volume spike (limitedVolume = volume / (0*0.8+0.25)) on the next
		// processBlock call.
		if (this._stopFadeSamplesRemaining <= 0) {
			this._postProc.resetLimit();
		}
		if (this._stopFadeSamplesRemaining <= 0) {
			this.freeAllTones();
		}
		// During stop fade: skip effect reset so reverb/echo delay buffers
		// drain naturally through the gain ramp instead of clicking.
		if (this._stopFadeSamplesRemaining <= 0 && this.song != null) {
			for (const channelState of this.channels) {
				for (const instrumentState of channelState.instruments) {
					instrumentState.resetAllEffects();
				}
			}
		}
	}

	public setModValue(
		volumeStart: number,
		volumeEnd: number,
		channelIndex: number,
		instrumentIndex: number,
		setting: number,
	): number {
		return this.modState.setModValue(
			volumeStart,
			volumeEnd,
			channelIndex,
			instrumentIndex,
			setting,
		);
	}

	public getModValue(
		setting: number,
		channel?: number | null,
		instrument?: number | null,
		nextVal?: boolean,
	): number {
		return this.modState.getModValue(setting, channel, instrument, nextVal);
	}

	// Checks if any mod is active for the given channel/instrument OR if any mod is active for the song scope. Could split the logic if needed later.

	public isAnyModActive(channel: number, instrument: number): boolean {
		return this.modState.isAnyModActive(channel, instrument);
	}

	public unsetMod(setting: number, channel?: number, instrument?: number) {
		this.modState.unset(setting, channel, instrument);
	}

	public isFilterModActive(
		forNoteFilter: boolean,
		channelIdx: number,
		instrumentIdx: number,
		forSong?: boolean,
	) {
		const instrument: Instrument = this.song!.channels[channelIdx].instruments[instrumentIdx];

		if (forNoteFilter) {
			if (instrument.noteFilterType) {
				return false;
			}
			if (instrument.tmpNoteFilterEnd != null) {
				return true;
			}
		} else {
			if (forSong) {
				if (this?.song?.tmpEqFilterEnd != null) {
					return true;
				}
			} else {
				if (instrument.eqFilterType) {
					return false;
				}
				if (instrument.tmpEqFilterEnd != null) {
					return true;
				}
			}
		}

		return false;
	}

	public isModActive(setting: number, channel?: number, instrument?: number): boolean {
		return this.modState.isModActive(setting, channel, instrument);
	}

	// Force a modulator to be held at the given volumeStart for a brief duration.

	public forceHoldMods(
		volumeStart: number,
		channelIndex: number,
		instrumentIndex: number,
		setting: number,
	): void {
		this.modState.forceHoldMods(volumeStart, channelIndex, instrumentIndex, setting);
	}

	public snapToStart(): void {
		this._dbg("snapToStart");
		this.bar = 0;
		this.resetEffects();
		this.snapToBar();
	}

	public goToBar(bar: number): void {
		this._dbg("goToBar:", bar);
		this.bar = bar;
		this.resetEffects();
		this.playheadInternal = this.bar;
		// During fadeout the playhead getter returns a snapshot so the
		// display stays stationary; update the snapshot so goToBar jumps
		// the visible playhead to the new position.
		if (this._stopFadeSamplesRemaining > 0) {
			this._fadeoutPlayheadSnapshot = this.playheadInternal;
		}
		// Use the mod-aware sample count so the elapsed counter is accurate for
		// songs with tempo mods or next-bar skip mods, not just a flat per-bar
		// estimate.
		this.totalSamplesRendered = this.getSamplesUpToBar(bar);
		// Reset sub-bar state so the new bar starts at beat 0. Without
		// this, jumping to a bar leaves beat/part/tick from the old bar
		// and the first audio of the new bar renders from that stale
		// position (e.g. beat 2 of the new bar instead of beat 0).
		// snapToBar() does the same reset; goToBar was inconsistent.
		this.beat = 0;
		this.part = 0;
		this.tick = 0;
		this.tickSampleCountdown = 0;
		this._playheadNeedsReset = true;
	}

	public snapToBar(): void {
		this._dbg("snapToBar, bar:", this.bar);
		this.playheadInternal = this.bar;
		this.beat = 0;
		this.part = 0;
		this.tick = 0;
		this.tickSampleCountdown = 0;
		this._playheadNeedsReset = true;
	}

	public jumpIntoLoop(): void {
		if (!this.song) return;
		if (
			this.bar < this.song.loopStart ||
			this.bar >= this.song.loopStart + this.song.loopLength
		) {
			const oldBar: number = this.bar;
			this.bar = this.song.loopStart;
			this.playheadInternal += this.bar - oldBar;

			if (this.playing) {
				this.modState.computeLatestModValues(this.song, this.bar, this.beat, this.part);
			}
		}
	}

	public goToNextBar(): void {
		if (!this.song) return;
		this.prevBar = this.bar;
		const oldBar: number = this.bar;
		this.bar++;
		if (this.bar >= this.song.barCount) {
			this.bar = 0;
		}
		this._dbg("goToNextBar:", oldBar, "to", this.bar);
		this.playheadInternal += this.bar - oldBar;
		this.totalSamplesRendered = this.getSamplesUpToBar(this.bar);
		// Fresh sub-bar state for the new bar so the first audio is beat 0,
		// not the stale beat/tick carried from the old bar.
		this.beat = 0;
		this.part = 0;
		this.tick = 0;
		this.tickSampleCountdown = 0;
		this._playheadNeedsReset = true;
		if (this.playing) {
			this.modState.computeLatestModValues(this.song, this.bar, this.beat, this.part);
		}
	}

	public goToPrevBar(): void {
		if (!this.song) return;
		this.prevBar = null;
		const oldBar: number = this.bar;
		this.bar--;
		if (this.bar < 0 || this.bar >= this.song.barCount) {
			this.bar = this.song.barCount - 1;
		}
		this._dbg("goToPrevBar:", oldBar, "to", this.bar);
		this.playheadInternal += this.bar - oldBar;
		this.totalSamplesRendered = this.getSamplesUpToBar(this.bar);
		// Fresh sub-bar state for the new bar (see goToNextBar).
		this.beat = 0;
		this.part = 0;
		this.tick = 0;
		this.tickSampleCountdown = 0;
		this._playheadNeedsReset = true;
		if (this.playing) {
			this.modState.computeLatestModValues(this.song, this.bar, this.beat, this.part);
		}
	}

	private getNextBar(): number {
		let nextBar: number = this.bar + 1;
		if (this.isRecording) {
			if (nextBar >= this.song!.barCount) {
				nextBar = this.song!.barCount - 1;
			}
		} else if (this.bar === this.loopBarEnd && !this.renderingSong) {
			nextBar = this.loopBarStart;
		} else if (
			this.loopRepeatCount !== 0 &&
			nextBar === Math.max(this.loopBarEnd + 1, this.song!.loopStart + this.song!.loopLength)
		) {
			nextBar = this.song!.loopStart;
		}
		return nextBar;
	}

	public skipBar(): void {
		if (!this.song) return;
		const samplesPerTick: number = this.getSamplesPerTick();
		this.prevBar = this.bar; // Bugfix by LeoV
		if (this.loopBarEnd !== this.bar) {
			this.bar++;
		} else {
			this.bar = this.loopBarStart;
		}
		this.beat = 0;
		this.part = 0;
		this.tick = 0;
		this.tickSampleCountdown = samplesPerTick;
		this.isAtStartOfTick = true;

		if (
			this.loopRepeatCount !== 0 &&
			this.bar === Math.max(this.song.loopStart + this.song.loopLength, this.loopBarEnd)
		) {
			this.bar = this.song.loopStart;
			if (this.loopBarStart !== -1) {
				this.bar = this.loopBarStart;
			}
			if (this.loopRepeatCount > 0) this.loopRepeatCount--;
		}
	}

	private computeSongState(samplesPerTick: number): void {
		if (this.song == null) return;

		const roundedSamplesPerTick: number = Math.ceil(samplesPerTick);
		const samplesPerSecond: number = this.samplesPerSecond;

		let eqFilterVolume: number = 1.0; // this.envelopeComputer.lowpassCutoffDecayVolumeCompensation;
		if (this.song.eqFilterType) {
			// Simple EQ filter (old style). For analysis, using random filters from normal style since they are N/A in this context.
			const eqFilterSettingsStart: FilterSettings = this.song.eqFilter;
			if (this.song.eqSubFilters[1] == null) {
				this.song.eqSubFilters[1] = new FilterSettings();
			}
			const eqFilterSettingsEnd: FilterSettings = this.song.eqSubFilters[1];

			// Change location based on slider values
			const startSimpleFreq: number = this.song.eqFilterSimpleCut;
			const startSimpleGain: number = this.song.eqFilterSimplePeak;
			const endSimpleFreq: number = this.song.eqFilterSimpleCut;
			const endSimpleGain: number = this.song.eqFilterSimplePeak;

			const filterChanges: boolean = false;

			let startPoint: FilterControlPoint;

			if (filterChanges) {
				eqFilterSettingsStart.convertLegacySettingsForSynth(
					startSimpleFreq,
					startSimpleGain,
				);
				eqFilterSettingsEnd.convertLegacySettingsForSynth(endSimpleFreq, endSimpleGain);

				startPoint = eqFilterSettingsStart.controlPoints[0];
				const endPoint: FilterControlPoint = eqFilterSettingsEnd.controlPoints[0];

				startPoint.toCoefficients(tempFilterStartCoefficients, samplesPerSecond, 1.0, 1.0);
				endPoint.toCoefficients(tempFilterEndCoefficients, samplesPerSecond, 1.0, 1.0);

				this._postProc.songEqFiltersL[0].loadCoefficientsWithGradient(
					tempFilterStartCoefficients,
					tempFilterEndCoefficients,
					1.0 / roundedSamplesPerTick,
					startPoint.type === FilterType.lowPass,
				);
				this._postProc.songEqFiltersR[0].loadCoefficientsWithGradient(
					tempFilterStartCoefficients,
					tempFilterEndCoefficients,
					1.0 / roundedSamplesPerTick,
					startPoint.type === FilterType.lowPass,
				);
			} else {
				eqFilterSettingsStart.convertLegacySettingsForSynth(
					startSimpleFreq,
					startSimpleGain,
					true,
				);

				startPoint = eqFilterSettingsStart.controlPoints[0];

				startPoint.toCoefficients(tempFilterStartCoefficients, samplesPerSecond, 1.0, 1.0);

				this._postProc.songEqFiltersL[0].loadCoefficientsWithGradient(
					tempFilterStartCoefficients,
					tempFilterStartCoefficients,
					1.0 / roundedSamplesPerTick,
					startPoint.type === FilterType.lowPass,
				);
				this._postProc.songEqFiltersR[0].loadCoefficientsWithGradient(
					tempFilterStartCoefficients,
					tempFilterStartCoefficients,
					1.0 / roundedSamplesPerTick,
					startPoint.type === FilterType.lowPass,
				);
			}

			eqFilterVolume *= startPoint.getVolumeCompensationMult();

			this._postProc.songEqFilterCount = 1;
			eqFilterVolume = Math.min(3.0, eqFilterVolume);
		} else {
			const eqFilterSettings: FilterSettings =
				this.song.tmpEqFilterStart != null
					? this.song.tmpEqFilterStart
					: this.song.eqFilter;
			for (let i: number = 0; i < eqFilterSettings.controlPointCount; i++) {
				let startPoint: FilterControlPoint = eqFilterSettings.controlPoints[i];
				const endPoint: FilterControlPoint =
					this.song.tmpEqFilterEnd != null &&
					this.song.tmpEqFilterEnd.controlPoints[i] != null
						? this.song.tmpEqFilterEnd.controlPoints[i]
						: eqFilterSettings.controlPoints[i];

				// If switching dot type, do it all at once and do not try to interpolate since no valid interpolation exists.
				if (startPoint.type !== endPoint.type) {
					startPoint = endPoint;
				}

				startPoint.toCoefficients(
					tempFilterStartCoefficients,
					samplesPerSecond,
					/*eqAllFreqsEnvelopeStart * eqFreqEnvelopeStart*/ 1.0,
					/*eqPeakEnvelopeStart*/ 1.0,
				);
				endPoint.toCoefficients(
					tempFilterEndCoefficients,
					samplesPerSecond,
					/*eqAllFreqsEnvelopeEnd   * eqFreqEnvelopeEnd*/ 1.0,
					/*eqPeakEnvelopeEnd*/ 1.0,
				);
				this._postProc.songEqFiltersL[i].loadCoefficientsWithGradient(
					tempFilterStartCoefficients,
					tempFilterEndCoefficients,
					1.0 / roundedSamplesPerTick,
					startPoint.type === FilterType.lowPass,
				);
				this._postProc.songEqFiltersR[i].loadCoefficientsWithGradient(
					tempFilterStartCoefficients,
					tempFilterEndCoefficients,
					1.0 / roundedSamplesPerTick,
					startPoint.type === FilterType.lowPass,
				);
				eqFilterVolume *= startPoint.getVolumeCompensationMult();
			}
			this._postProc.songEqFilterCount = eqFilterSettings.controlPointCount;
			eqFilterVolume = Math.min(3.0, eqFilterVolume);
		}

		const eqFilterVolumeStart: number = eqFilterVolume;
		const eqFilterVolumeEnd: number = eqFilterVolume;

		this._postProc.songEqFilterVolume = eqFilterVolumeStart;
		this._postProc.songEqFilterVolumeDelta =
			(eqFilterVolumeEnd - eqFilterVolumeStart) / roundedSamplesPerTick;
	}

	public synthesize(
		outputDataL: Float32Array,
		outputDataR: Float32Array,
		outputBufferLength: number,
		playSong: boolean = true,
	): void {
		const _synthStartTime: number = performance.now();
		const _bufferBudgetMs: number = (outputBufferLength / this.samplesPerSecond) * 1000;
		this._logSynthCallCount++;
		if (this._logSynthCallCount <= 5 || this._logSynthCallCount % 200 === 0) {
			this._dbg(
				"synthesize #" +
					this._logSynthCallCount +
					", bufferLength: " +
					outputBufferLength +
					", playSong: " +
					playSong +
					", isPlayingSong: " +
					this.isPlayingSong +
					", playhead: " +
					this.playheadInternal.toFixed(4) +
					", bar: " +
					this.bar +
					", beat: " +
					this.beat +
					", tick: " +
					this.tick +
					", tickCountdown: " +
					this.tickSampleCountdown.toFixed(2),
			);
		}

		if (this.song == null) {
			this._dbgWarn("synthesize: song is null, filling silence and deactivating");
			outputDataL.fill(0.0);
			outputDataR.fill(0.0);
			this.deactivateAudio();
			return;
		}

		// clear the unfiltered (not affected by song eq) output
		if (
			this.outputDataLUnfiltered == null ||
			this.outputDataLUnfiltered.length < outputBufferLength
		) {
			this.outputDataLUnfiltered = new Float32Array(outputBufferLength);
			this.outputDataRUnfiltered = new Float32Array(outputBufferLength);
		} else {
			this.outputDataLUnfiltered.fill(0.0);
			this.outputDataRUnfiltered!.fill(0.0);
		}

		const song: Song = this.song;
		this.song.inVolumeCap = 0.0; // Reset volume cap for this run
		this.song.outVolumeCap = 0.0;
		// Reset per-channel volume caps
		for (let i = 0; i < this.channels.length; i++) {
			this.channels[i].volumeCap = 0.0;
		}

		let samplesPerTick: number = this.getSamplesPerTick();
		const ended: boolean = false;

		// Check the bounds of the playhead:
		if (this.tickSampleCountdown <= 0 || this.tickSampleCountdown > samplesPerTick) {
			this.tickSampleCountdown = samplesPerTick;
			this.isAtStartOfTick = true;
		}
		if (this._playheadNeedsReset && playSong) {
			this.playheadInternal = this.bar;
			this._playheadNeedsReset = false;
		}
		if (playSong) {
			if (this.beat >= song.beatsPerBar) {
				this.beat = 0;
				this.part = 0;
				this.tick = 0;
				this.tickSampleCountdown = samplesPerTick;
				this.isAtStartOfTick = true;

				this.prevBar = this.bar;
				this.bar = this.getNextBar();
				if (this.bar <= this.prevBar && this.loopRepeatCount > 0) this.loopRepeatCount--;
				// Loop wrap (bar jumped back to loopBarStart): re-seed the elapsed
				// counter to the loop-start offset so the timer reflects the current
				// position instead of accumulating across loops.
				if (this.bar <= this.prevBar)
					this.totalSamplesRendered = this.getSamplesUpToBar(this.bar);
			}
			if (this.bar >= song.barCount) {
				if (this.loopRepeatCount !== -1) {
					this._dbg(
						"Song ended (bar >= barCount), pausing. loopRepeatCount:",
						this.loopRepeatCount,
					);
					// Don't set ended=true — the while loop below must continue
					// to apply the stop fade gain ramp. pause() sets _stopFadeSamplesRemaining
					// and the fade logic at the bottom of the loop handles the transition.
					// If we exit the loop early, this entire buffer is zeroed, creating
					// a discontinuity from the last full-gain tick.
					this.pause();
				} else {
					// Infinite end-wrap (no user loop points, loopRepeatCount === -1):
					// reset elapsed to 0 for the new pass.
					this.bar = 0;
					this.totalSamplesRendered = this.getSamplesUpToBar(0);
				}
			}
		}

		this.syncSongState();

		if (
			this.tempMonoInstrumentSampleBuffer == null ||
			this.tempMonoInstrumentSampleBuffer.length < outputBufferLength
		) {
			this.tempMonoInstrumentSampleBuffer = new Float32Array(outputBufferLength);
		}

		// Post processing parameters:
		const volume: number = +this.volume;
		const songParams = {
			masterGain: this.song.masterGain,
			compressionThreshold: this.song.compressionThreshold,
			limitThreshold: this.song.limitThreshold,
			compressionRatio: this.song.compressionRatio,
			limitRatio: this.song.limitRatio,
			limitDecay: this.song.limitDecay,
			limitRise: this.song.limitRise,
		};
		const skippedBars: number[] = [];
		let firstSkippedBufferIndex = -1;

		let bufferIndex: number = 0;
		while (bufferIndex < outputBufferLength && !ended) {
			this.nextBar = this.getNextBar();
			if (this.nextBar >= song.barCount) this.nextBar = null;

			const samplesLeftInBuffer: number = outputBufferLength - bufferIndex;
			const samplesLeftInTick: number = Math.ceil(this.tickSampleCountdown);
			const runLength: number = Math.min(samplesLeftInTick, samplesLeftInBuffer);
			const runEnd: number = bufferIndex + runLength;

			// Handle mod synth
			if (this.isPlayingSong || this.renderingSong) {
				// First modulation pass. Determines active tones.
				// Runs everything but Dot X/Y mods, to let them always come after morph.
				for (
					let channelIndex: number = song.pitchChannelCount + song.noiseChannelCount;
					channelIndex < song.getChannelCount();
					channelIndex++
				) {
					const channel: Channel = song.channels[channelIndex];
					const channelState: ChannelState = this.channels[channelIndex];

					this.determineCurrentActiveTones(song, channelIndex, samplesPerTick, playSong);
					for (
						let instrumentIndex: number = 0;
						instrumentIndex < channel.instruments.length;
						instrumentIndex++
					) {
						const instrumentState: InstrumentState =
							channelState.instruments[instrumentIndex];
						for (let i: number = 0; i < instrumentState.activeModTones.count(); i++) {
							const tone: Tone = instrumentState.activeModTones.get(i);
							const channel: Channel = song.channels[channelIndex];
							const instrument: Instrument =
								channel.instruments[tone.instrumentIndex];
							const mod: number = Config.modCount - 1 - tone.pitches[0];

							if (
								(instrument.modulators[mod] ===
									Config.modulators.dictionary["note filter"].index ||
									instrument.modulators[mod] ===
										Config.modulators.dictionary["eq filter"].index ||
									instrument.modulators[mod] ===
										Config.modulators.dictionary["song eq"].index) &&
								instrument.modFilterTypes[mod] != null &&
								instrument.modFilterTypes[mod] > 0
							) {
								continue;
							}
							this.playModTone(
								song,
								channelIndex,
								samplesPerTick,
								bufferIndex,
								runLength,
								tone,
								false,
								false,
							);
						}
					}
				}

				// Second modulation pass.
				// Only for Dot X/Y mods.
				for (
					let channelIndex: number = song.pitchChannelCount + song.noiseChannelCount;
					channelIndex < song.getChannelCount();
					channelIndex++
				) {
					const channel: Channel = song.channels[channelIndex];
					const channelState: ChannelState = this.channels[channelIndex];

					for (
						let instrumentIndex: number = 0;
						instrumentIndex < channel.instruments.length;
						instrumentIndex++
					) {
						const instrumentState: InstrumentState =
							channelState.instruments[instrumentIndex];
						for (let i: number = 0; i < instrumentState.activeModTones.count(); i++) {
							const tone: Tone = instrumentState.activeModTones.get(i);
							const channel: Channel = song.channels[channelIndex];
							const instrument: Instrument =
								channel.instruments[tone.instrumentIndex];
							const mod: number = Config.modCount - 1 - tone.pitches[0];

							if (
								(instrument.modulators[mod] ===
									Config.modulators.dictionary["note filter"].index ||
									instrument.modulators[mod] ===
										Config.modulators.dictionary["eq filter"].index ||
									instrument.modulators[mod] ===
										Config.modulators.dictionary["song eq"].index) &&
								instrument.modFilterTypes[mod] != null &&
								instrument.modFilterTypes[mod] > 0
							) {
								this.playModTone(
									song,
									channelIndex,
									samplesPerTick,
									bufferIndex,
									runLength,
									tone,
									false,
									false,
								);
							}
						}
					}
				}
			}

			// Handle next bar mods if they were set
			if (this.wantToSkip) {
				// Skipped back to a previously visited bar without generating new samples — infinite skip detected.
				// In this case processing will return before the designated number of samples are processed. In other words, silence will be generated.
				const barVisited: boolean = skippedBars.includes(this.bar);
				if (barVisited && bufferIndex === firstSkippedBufferIndex) {
					this._dbgWarn(
						"Infinite skip detected, pausing. bar:",
						this.bar,
						"bufferIndex:",
						bufferIndex,
					);
					this.pause();
					return;
				}
				if (firstSkippedBufferIndex === -1) {
					firstSkippedBufferIndex = bufferIndex;
				}
				if (!barVisited) {
					skippedBars.push(this.bar);
				}
				this.wantToSkip = false;
				this.skipBar();
				continue;
			}

			this.computeSongState(samplesPerTick);

			if (
				!this.isPlayingSong &&
				(this.liveInputPitches.length > 0 || this.liveBassInputPitches.length > 0)
			) {
				// set up modulation for live input tones
				this.modState.computeLatestModValues(this.song, this.bar, this.beat, this.part);
			}

			for (
				let channelIndex: number = 0;
				channelIndex < song.pitchChannelCount + song.noiseChannelCount;
				channelIndex++
			) {
				const channel: Channel = song.channels[channelIndex];
				const channelState: ChannelState = this.channels[channelIndex];

				// Snapshot output before this channel contributes (use pre-allocated scratch, L+R interleaved)
				const scratch = channelState.audioScratch;
				for (let i = bufferIndex, si = 0; i < runEnd; i++, si += 2) {
					scratch[si] = outputDataL[i] + (this.outputDataLUnfiltered?.[i] ?? 0);
					scratch[si + 1] = outputDataR[i] + (this.outputDataRUnfiltered?.[i] ?? 0);
				}

				// Track per-channel volume by measuring before/after this channel's contribution
				let channelPeakBefore: number = 0;
				for (let i = bufferIndex; i < runEnd; i++) {
					const absL = Math.abs(outputDataL[i] + (this.outputDataLUnfiltered?.[i] ?? 0));
					const absR = Math.abs(outputDataR[i] + (this.outputDataRUnfiltered?.[i] ?? 0));
					if (absL > channelPeakBefore) channelPeakBefore = absL;
					if (absR > channelPeakBefore) channelPeakBefore = absR;
				}

				if (this.isAtStartOfTick) {
					this.determineCurrentActiveTones(
						song,
						channelIndex,
						samplesPerTick,
						playSong && !this.countInMetronome,
					);
					this.determineLiveInputTones(song, channelIndex, samplesPerTick);
				}
				for (
					let instrumentIndex: number = 0;
					instrumentIndex < channel.instruments.length;
					instrumentIndex++
				) {
					const instrument: Instrument = channel.instruments[instrumentIndex];
					const instrumentState: InstrumentState =
						channelState.instruments[instrumentIndex];

					if (this.isAtStartOfTick) {
						let tonesPlayedInThisInstrument: number =
							instrumentState.activeTones.count() +
							instrumentState.liveInputTones.count();

						for (let i: number = 0; i < instrumentState.releasedTones.count(); i++) {
							const tone: Tone = instrumentState.releasedTones.get(i);
							if (tone.ticksSinceReleased >= Math.abs(instrument.getFadeOutTicks())) {
								this.freeReleasedTone(instrumentState, i);
								i--;
								continue;
							}
							const shouldFadeOutFast: boolean =
								tonesPlayedInThisInstrument >= Config.maximumTonesPerChannel;
							this.computeTone(
								song,
								channelIndex,
								samplesPerTick,
								tone,
								true,
								shouldFadeOutFast,
							);
							tonesPlayedInThisInstrument++;
						}

						if (instrumentState.awake) {
							if (!instrumentState.computed) {
								instrumentState.compute(
									this,
									instrument,
									samplesPerTick,
									Math.ceil(samplesPerTick),
									null,
									channelIndex,
									instrumentIndex,
								);
							}

							instrumentState.computed = false;
							instrumentState.envelopeComputer.clearEnvelopes();
						}
					}

					for (let i: number = 0; i < instrumentState.activeTones.count(); i++) {
						const tone: Tone = instrumentState.activeTones.get(i);
						this.playTone(channelIndex, bufferIndex, runLength, tone);
					}

					for (let i: number = 0; i < instrumentState.liveInputTones.count(); i++) {
						const tone: Tone = instrumentState.liveInputTones.get(i);
						this.playTone(channelIndex, bufferIndex, runLength, tone);
					}

					for (let i: number = 0; i < instrumentState.releasedTones.count(); i++) {
						const tone: Tone = instrumentState.releasedTones.get(i);
						this.playTone(channelIndex, bufferIndex, runLength, tone);
					}

					if (instrumentState.awake) {
						effectsSynth(
							this,
							outputDataL,
							outputDataR,
							bufferIndex,
							runLength,
							instrumentState,
						);
					}

					// Update LFO time for instruments (used to be deterministic based on bar position but now vibrato/arp speed messes that up!)

					const tickSampleCountdown: number = this.tickSampleCountdown;
					const startRatio: number = 1.0 - tickSampleCountdown / samplesPerTick;
					const endRatio: number =
						1.0 - (tickSampleCountdown - runLength) / samplesPerTick;
					const ticksIntoBar: number =
						(this.beat * Config.partsPerBeat + this.part) * Config.ticksPerPart +
						this.tick;
					const partTimeTickStart: number = ticksIntoBar / Config.ticksPerPart;
					const partTimeTickEnd: number = (ticksIntoBar + 1) / Config.ticksPerPart;
					const partTimeStart: number =
						partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
					const partTimeEnd: number =
						partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
					let useVibratoSpeed: number = instrument.vibratoSpeed;

					instrumentState.vibratoTime = instrumentState.nextVibratoTime;

					// envelopeable vibrato speed?

					if (
						this.isModActive(
							Config.modulators.dictionary["vibrato speed"].index,
							channelIndex,
							instrumentIndex,
						)
					) {
						useVibratoSpeed = this.modState.getModValue(
							Config.modulators.dictionary["vibrato speed"].index,
							channelIndex,
							instrumentIndex,
						);
					}

					if (useVibratoSpeed === 0) {
						instrumentState.vibratoTime = 0;
						instrumentState.nextVibratoTime = 0;
					} else {
						instrumentState.nextVibratoTime +=
							useVibratoSpeed * 0.1 * (partTimeEnd - partTimeStart);
					}
				}

				// Track per-channel volume by measuring after this channel's contribution
				for (let i = bufferIndex; i < runEnd; i++) {
					const absL = Math.abs(outputDataL[i] + (this.outputDataLUnfiltered?.[i] ?? 0));
					const absR = Math.abs(outputDataR[i] + (this.outputDataRUnfiltered?.[i] ?? 0));
					const diffL = Math.max(0, absL - channelPeakBefore);
					const diffR = Math.max(0, absR - channelPeakBefore);
					const peak = Math.max(diffL, diffR);
					if (peak > channelState.volumeCap) {
						channelState.volumeCap = peak;
					}
				}

				// Diff snapshotted vs current output to isolate this channel's audio (L+R interleaved)
				const ring = channelState.audioRing;
				for (let i = bufferIndex, si = 0; i < runEnd; i++, si += 2) {
					const currentL = outputDataL[i] + (this.outputDataLUnfiltered?.[i] ?? 0);
					const currentR = outputDataR[i] + (this.outputDataRUnfiltered?.[i] ?? 0);
					const diffL = currentL - scratch[si];
					const diffR = currentR - scratch[si + 1];
					ring[channelState.audioRingPos] = (diffL + diffR) * 0.5;
					channelState.audioRingPos = (channelState.audioRingPos + 1) & 8191;
				}
			}

			if (this.enableMetronome || this.countInMetronome) {
				if (this.part === 0) {
					if (!this.startedMetronome) {
						const midBeat: boolean =
							song.beatsPerBar > 4 &&
							song.beatsPerBar % 2 === 0 &&
							this.beat === song.beatsPerBar / 2;
						const periods: number = this.beat === 0 ? 8 : midBeat ? 6 : 4;
						const hz: number = this.beat === 0 ? 1600 : midBeat ? 1200 : 800;
						const amplitude: number = this.beat === 0 ? 0.06 : midBeat ? 0.05 : 0.04;
						const samplesPerPeriod: number = this.samplesPerSecond / hz;
						const radiansPerSample: number = (Math.PI * 2.0) / samplesPerPeriod;
						this.metronomeSamplesRemaining = Math.floor(samplesPerPeriod * periods);
						this.metronomeFilter = 2.0 * Math.cos(radiansPerSample);
						this.metronomeAmplitude = amplitude * Math.sin(radiansPerSample);
						this.metronomePrevAmplitude = 0.0;

						this.startedMetronome = true;
					}
					if (this.metronomeSamplesRemaining > 0) {
						const stopIndex: number = Math.min(
							runEnd,
							bufferIndex + this.metronomeSamplesRemaining,
						);
						this.metronomeSamplesRemaining -= stopIndex - bufferIndex;
						for (let i: number = bufferIndex; i < stopIndex; i++) {
							this.outputDataLUnfiltered[i] += this.metronomeAmplitude;
							this.outputDataRUnfiltered![i] += this.metronomeAmplitude;
							const tempAmplitude: number =
								this.metronomeFilter * this.metronomeAmplitude -
								this.metronomePrevAmplitude;
							this.metronomePrevAmplitude = this.metronomeAmplitude;
							this.metronomeAmplitude = tempAmplitude;
						}
					}
				} else {
					this.startedMetronome = false;
				}
			}

			// Post processing:
			const volCap = { in: this.song.inVolumeCap, out: this.song.outVolumeCap };
			this._postProc.processBlock(
				outputDataL,
				outputDataR,
				this.outputDataLUnfiltered,
				this.outputDataRUnfiltered!,
				bufferIndex,
				runEnd,
				songParams,
				volume,
				this.samplesPerSecond,
				volCap,
			);
			this.song.inVolumeCap = volCap.in;
			this.song.outVolumeCap = volCap.out;

			// Stop-fade gain ramp: after post-processing, apply a cubic
			// ease-out curve from 1.0 to 0. Scale outVolumeCap so peak
			// meters track the fade instead of freezing.
			if (this._stopFadeSamplesRemaining > 0) {
				const total = this._stopFadeSamplesTotal;
				let lastGain: number = 1;
				let i = bufferIndex;
				for (; i < runEnd && this._stopFadeSamplesRemaining > 0; i++) {
					const t: number = this._stopFadeSamplesRemaining / total;
					const gain: number = 1 - (1 - t) * (1 - t) * (1 - t);
					lastGain = gain;
					outputDataL[i] *= gain;
					outputDataR[i] *= gain;
					this._stopFadeSamplesRemaining--;
				}
				// Scale outVolumeCap so peak meters follow the fade
				this.song.outVolumeCap *= lastGain;
				// Zero remaining samples if fade ended mid-buffer
				for (; i < runEnd; i++) {
					outputDataL[i] = 0;
					outputDataR[i] = 0;
				}
				// Cleanup once per fade
				if (this._stopFadeSamplesRemaining <= 0 && !this._stopFadeCleanupDone) {
					this._stopFadeCleanupDone = true;
					this.freeAllTones();
					if (this.song != null) {
						for (const channelState of this.channels) {
							for (const instrumentState of channelState.instruments) {
								instrumentState.resetAllEffects();
							}
						}
					}
					// Zero unfiltered buffers so stale reverb/echo delay data
					// doesn't spike on the next processBlock call (which
					// combines outputL + outputLUnfiltered * masterGain^2).
					if (this.outputDataLUnfiltered != null) {
						this.outputDataLUnfiltered.fill(0);
						this.outputDataRUnfiltered!.fill(0);
					}
					this.modState.values = [];
					this.modState.nextValues = [];
					this.modState.heldMods = [];
					if (this.song != null) {
						this.song.inVolumeCap = 0.0;
						this.song.outVolumeCap = 0.0;
						this.song.tmpEqFilterStart = null;
						this.song.tmpEqFilterEnd = null;
						for (
							let channelIndex: number = 0;
							channelIndex <
							this.song.pitchChannelCount + this.song.noiseChannelCount;
							channelIndex++
						) {
							this.modState.insValues[channelIndex] = [];
							this.modState.nextInsValues[channelIndex] = [];
						}
					}
					this._dbg(
						"Stop fade complete, tones freed, effects reset, unfiltered buffers cleared",
					);
					// Song-end pause: snap to last bar index. Manual pause
					// (Space, pause button) leaves bar at the current position.
					if (this.song != null && this.bar >= this.song.barCount) {
						this.bar = this.song.barCount - 1;
						this.totalSamplesRendered = this.getSamplesUpToBar(this.bar);
						this.snapToBar();
					}
				}
			}

			bufferIndex += runLength;
			if (playSong) {
				this.totalSamplesRendered += runLength;
			}

			this.isAtStartOfTick = false;
			this.tickSampleCountdown -= runLength;
			if (this.tickSampleCountdown <= 0) {
				this.isAtStartOfTick = true;

				// Track how long tones have been released, and free them if there are too many.
				// Also reset awake InstrumentStates that didn't have any Tones during this tick.
				for (const channelState of this.channels) {
					for (const instrumentState of channelState.instruments) {
						if (instrumentState.releasedTones.count() > 0) {
							for (
								let i: number = 0;
								i < instrumentState.releasedTones.count();
								i++
							) {
								const tone: Tone = instrumentState.releasedTones.get(i);
								// During stop fade: don't free released tones so effects
								if (tone.isOnLastTick) {
									this.freeReleasedTone(instrumentState, i);
									i--;
								} else {
									tone.ticksSinceReleased++;
								}
							}
						}
						if (instrumentState.deactivateAfterThisTick) {
							instrumentState.deactivate();
						}
						instrumentState.tonesAddedInThisTick = false;
					}
				}
				const ticksIntoBar: number = this.getTicksIntoBar();
				const tickTimeStart: number = ticksIntoBar;
				const secondsPerTick: number = samplesPerTick / this.samplesPerSecond;
				const currentPart: number = this.getCurrentPart();
				for (
					let channel: number = 0;
					channel < this.song.pitchChannelCount + this.song.noiseChannelCount;
					channel++
				) {
					for (
						let instrumentIdx: number = 0;
						instrumentIdx < this.song.channels[channel].instruments.length;
						instrumentIdx++
					) {
						const instrument: Instrument =
							this.song.channels[channel].instruments[instrumentIdx];
						const instrumentState: InstrumentState =
							this.channels[channel].instruments[instrumentIdx];

						// Update envelope time, which is used to calculate tone-based envelopes' position position
						const envelopeComputer: EnvelopeComputer = instrumentState.envelopeComputer;
						const envelopeSpeeds: number[] = [];
						for (let i: number = 0; i < Config.maxEnvelopeCount; i++) {
							envelopeSpeeds[i] = 0;
						}
						for (
							let envelopeIndex: number = 0;
							envelopeIndex < instrument.envelopeCount;
							envelopeIndex++
						) {
							let useEnvelopeSpeed: number = instrument.envelopeSpeed;
							let perEnvelopeSpeed: number =
								instrument.envelopes[envelopeIndex].perEnvelopeSpeed;
							if (
								this.isModActive(
									Config.modulators.dictionary["individual envelope speed"].index,
									channel,
									instrumentIdx,
								) &&
								instrument.envelopes[envelopeIndex].tempEnvelopeSpeed != null
							) {
								perEnvelopeSpeed =
									instrument.envelopes[envelopeIndex].tempEnvelopeSpeed!;
							}
							if (
								this.isModActive(
									Config.modulators.dictionary["envelope speed"].index,
									channel,
									instrumentIdx,
								)
							) {
								useEnvelopeSpeed = Math.max(
									0,
									Math.min(
										Config.arpSpeedScale.length - 1,
										this.modState.getModValue(
											Config.modulators.dictionary["envelope speed"].index,
											channel,
											instrumentIdx,
											false,
										),
									),
								);
								if (Number.isInteger(useEnvelopeSpeed)) {
									instrumentState.envelopeTime[envelopeIndex] +=
										Config.arpSpeedScale[useEnvelopeSpeed] * perEnvelopeSpeed;
								} else {
									// Linear interpolate envelope values
									instrumentState.envelopeTime[envelopeIndex] +=
										((1 - (useEnvelopeSpeed % 1)) *
											Config.arpSpeedScale[Math.floor(useEnvelopeSpeed)] +
											(useEnvelopeSpeed % 1) *
												Config.arpSpeedScale[Math.ceil(useEnvelopeSpeed)]) *
										perEnvelopeSpeed;
								}
							} else {
								instrumentState.envelopeTime[envelopeIndex] +=
									Config.arpSpeedScale[useEnvelopeSpeed] * perEnvelopeSpeed;
							}
						}

						// Arp speed calculated separately from envelopes; run compute envelopes for arp.
						// This uses the instrumentState envelopeComputer, but is effectively per tone to the user given that arpeggios cause only one tone to play at a time
						if (instrumentState.activeTones.count() > 0) {
							const tone: Tone = instrumentState.activeTones.get(0);
							envelopeComputer.computeEnvelopes(
								instrument,
								currentPart,
								instrumentState.envelopeTime,
								tickTimeStart,
								secondsPerTick,
								tone,
								envelopeSpeeds,
								instrumentState,
								this,
								channel,
								instrumentIdx,
								false,
							);
						}

						const envelopeStarts: number[] = envelopeComputer.envelopeStarts;

						// Update arpeggio time, which is used to calculate arpeggio position

						const arpEnvelopeStart: number =
							envelopeStarts[EnvelopeComputeIndex.arpeggioSpeed]; // only discrete for now
						let useArpeggioSpeed: number = instrument.arpeggioSpeed;
						if (
							this.isModActive(
								Config.modulators.dictionary["arp speed"].index,
								channel,
								instrumentIdx,
							)
						) {
							useArpeggioSpeed = clamp(
								0,
								Config.arpSpeedScale.length,
								arpEnvelopeStart *
									this.modState.getModValue(
										Config.modulators.dictionary["arp speed"].index,
										channel,
										instrumentIdx,
										false,
									),
							);
							if (Number.isInteger(useArpeggioSpeed)) {
								instrumentState.arpTime += Config.arpSpeedScale[useArpeggioSpeed];
							} else {
								// Linear interpolate arpeggio values
								instrumentState.arpTime +=
									(1 - (useArpeggioSpeed % 1)) *
										Config.arpSpeedScale[Math.floor(useArpeggioSpeed)] +
									(useArpeggioSpeed % 1) *
										Config.arpSpeedScale[Math.ceil(useArpeggioSpeed)];
							}
						} else {
							useArpeggioSpeed = clamp(
								0,
								Config.arpSpeedScale.length,
								arpEnvelopeStart * useArpeggioSpeed,
							);
							if (Number.isInteger(useArpeggioSpeed)) {
								instrumentState.arpTime += Config.arpSpeedScale[useArpeggioSpeed];
							} else {
								// Linear interpolate arpeggio values
								instrumentState.arpTime +=
									(1 - (useArpeggioSpeed % 1)) *
										Config.arpSpeedScale[Math.floor(useArpeggioSpeed)] +
									(useArpeggioSpeed % 1) *
										Config.arpSpeedScale[Math.ceil(useArpeggioSpeed)];
							}
						}
						envelopeComputer.clearEnvelopes();
					}
				}

				// Update next-used filters after each run
				for (
					let channel: number = 0;
					channel < this.song.pitchChannelCount + this.song.noiseChannelCount;
					channel++
				) {
					for (
						let instrumentIdx: number = 0;
						instrumentIdx < this.song.channels[channel].instruments.length;
						instrumentIdx++
					) {
						const instrument: Instrument =
							this.song.channels[channel].instruments[instrumentIdx];
						if (instrument.tmpEqFilterEnd != null) {
							instrument.tmpEqFilterStart = instrument.tmpEqFilterEnd;
						} else {
							instrument.tmpEqFilterStart = instrument.eqFilter;
						}
						if (instrument.tmpNoteFilterEnd != null) {
							instrument.tmpNoteFilterStart = instrument.tmpNoteFilterEnd;
						} else {
							instrument.tmpNoteFilterStart = instrument.noteFilter;
						}
					}
				}
				if (song.tmpEqFilterEnd != null) {
					song.tmpEqFilterStart = song.tmpEqFilterEnd;
				} else {
					song.tmpEqFilterStart = song.eqFilter;
				}

				this.tick++;
				this.tickSampleCountdown += samplesPerTick;
				if (this.tick === Config.ticksPerPart) {
					this.tick = 0;
					this.part++;
					this.liveInputDuration--;
					this.liveBassInputDuration--;
					// Decrement held modulator counters after each run
					for (let i: number = 0; i < this.modState.heldMods.length; i++) {
						this.modState.heldMods[i].holdFor--;
						if (this.modState.heldMods[i].holdFor <= 0) {
							this.modState.heldMods.splice(i, 1);
						}
					}

					if (this.part === Config.partsPerBeat) {
						this.part = 0;

						if (playSong) {
							this.beat++;
							if (this.beat === song.beatsPerBar) {
								// bar changed, reset for next bar:
								this.beat = 0;

								if (this.countInMetronome) {
									this.countInMetronome = false;
								} else {
									this.prevBar = this.bar;
									this.bar = this.getNextBar();
									if (this.bar <= this.prevBar && this.loopRepeatCount > 0)
										this.loopRepeatCount--;
									// Loop wrap (bar jumped back to loopBarStart): re-seed the elapsed
									// counter to the loop-start offset so the timer reflects the
									// current position instead of accumulating across loops.
									if (this.bar <= this.prevBar)
										this.totalSamplesRendered = this.getSamplesUpToBar(
											this.bar,
										);

									if (this.bar >= song.barCount) {
										if (this.loopRepeatCount !== -1) {
											this._dbg(
												"Song ended (inside render loop), pausing. loopRepeatCount:",
												this.loopRepeatCount,
											);
											// Don't set ended=true — the while loop must continue
											// so the stop fade gain ramp applies to this buffer.
											// pause() sets _stopFadeSamplesRemaining and the fade
											// logic at the bottom handles the transition.
											// If we exit the loop early, this entire buffer is zeroed,
											// creating a discontinuity from the last full-gain tick.
											this.pause();
										} else {
											// Infinite end-wrap (no user loop points, loopRepeatCount === -1):
											// reset elapsed to 0 for the new pass.
											this.bar = 0;
											this.totalSamplesRendered = this.getSamplesUpToBar(0);
										}
									}
								}
							}
						}
					}
				}
			}

			// Update mod values so that next values copy to current values
			for (let setting: number = 0; setting < Config.modulators.length; setting++) {
				if (this.modState.nextValues != null && this.modState.nextValues[setting] != null) {
					this.modState.values[setting] = this.modState.nextValues[setting];
				}
			}

			// Set samples per tick if song tempo mods changed it
			if (this.isModActive(Config.modulators.dictionary.tempo.index)) {
				samplesPerTick = this.getSamplesPerTick();
				this.tickSampleCountdown = Math.min(this.tickSampleCountdown, samplesPerTick);
			}

			// Bound LFO times to be within their period (to keep values from getting large)
			// This modulo math probably doesn't have to happen every LFO tick.
			for (
				let channelIndex: number = 0;
				channelIndex < this.song.pitchChannelCount + this.song.noiseChannelCount;
				channelIndex++
			) {
				for (
					let instrumentIndex = 0;
					instrumentIndex < this.channels[channelIndex].instruments.length;
					instrumentIndex++
				) {
					const instrumentState: InstrumentState =
						this.channels[channelIndex].instruments[instrumentIndex];
					const instrument: Instrument =
						this.song.channels[channelIndex].instruments[instrumentIndex];
					instrumentState.nextVibratoTime =
						instrumentState.nextVibratoTime %
						(Config.vibratoTypes[instrument.vibratoType].period /
							((Config.ticksPerPart * samplesPerTick) / this.samplesPerSecond));
					instrumentState.arpTime =
						instrumentState.arpTime % (2520 * Config.ticksPerArpeggio); // 2520 = LCM of 4, 5, 6, 7, 8, 9 (arp sizes)
					for (
						let envelopeIndex: number = 0;
						envelopeIndex < instrument.envelopeCount;
						envelopeIndex++
					) {
						instrumentState.envelopeTime[envelopeIndex] =
							instrumentState.envelopeTime[envelopeIndex] %
							(Config.partsPerBeat * Config.ticksPerPart * this.song.beatsPerBar);
					}
				}
			}

			const maxInstrumentsPerChannel = this.song.getMaxInstrumentsPerChannel();
			for (let setting: number = 0; setting < Config.modulators.length; setting++) {
				for (
					let channel: number = 0;
					channel < this.song.pitchChannelCount + this.song.noiseChannelCount;
					channel++
				) {
					for (
						let instrument: number = 0;
						instrument < maxInstrumentsPerChannel;
						instrument++
					) {
						if (
							this.modState.nextInsValues != null &&
							this.modState.nextInsValues[channel] != null &&
							this.modState.nextInsValues[channel][instrument] != null &&
							this.modState.nextInsValues[channel][instrument][setting] != null
						) {
							this.modState.insValues[channel][instrument][setting] =
								this.modState.nextInsValues[channel][instrument][setting];
						}
					}
				}
			}
		}

		// 1ms lead-in: zero the first ~1ms of the first audible buffer so
		// browser AudioContext startup latency does not truncate the
		// attack of beat 0. Internal playhead/tick state advances
		// normally — only the output samples are silenced. The unfiltered
		// buffers are zeroed too so the masterGain^2 mix in the worklet
		// does not leak the attack back in.
		if (this._needsLeadIn && this.isPlayingSong && playSong) {
			const leadInSamples: number = Math.ceil(this.samplesPerSecond * 0.001);
			const leadInEnd: number = Math.min(leadInSamples, outputBufferLength);
			for (let li: number = 0; li < leadInEnd; li++) {
				outputDataL[li] = 0;
				outputDataR[li] = 0;
				if (this.outputDataLUnfiltered != null) {
					this.outputDataLUnfiltered[li] = 0;
				}
				if (this.outputDataRUnfiltered != null) {
					this.outputDataRUnfiltered![li] = 0;
				}
			}
			this._needsLeadIn = false;
		}

		// Optimization: Avoid persistent reverb values in the float denormal range.
		if (!Number.isFinite(this._postProc.limit) || Math.abs(this._postProc.limit) < epsilon)
			this._postProc.limit = 0.0;

		if (playSong && !this.countInMetronome) {
			this.playheadInternal =
				(((this.tick + 1.0 - this.tickSampleCountdown / samplesPerTick) / 2.0 + this.part) /
					Config.partsPerBeat +
					this.beat) /
					song.beatsPerBar +
				this.bar;
		}

		const _synthElapsed: number = performance.now() - _synthStartTime;
		if (_synthElapsed > _bufferBudgetMs * 0.9) {
			this._stutterCount++;
			const now: number = performance.now();
			if (now - this._lastStutterLogMs > 1000) {
				this._lastStutterLogMs = now;
				console.warn(
					"[Synth] Audio stutter #" +
						this._stutterCount +
						", bar=" +
						this.bar +
						", elapsed=" +
						_synthElapsed.toFixed(1) +
						"ms, budget=" +
						_bufferBudgetMs.toFixed(1) +
						"ms",
				);
			}
		}
	}

	private freeTone(tone: Tone): void {
		recycleTone(this.tonePool, tone);
	}

	private newTone(): Tone {
		return allocTone(this.tonePool);
	}

	private releaseTone(instrumentState: InstrumentState, tone: Tone): void {
		renderReleaseTone(instrumentState.releasedTones, tone);
	}

	private freeReleasedTone(instrumentState: InstrumentState, toneIndex: number): void {
		renderFreeReleasedTone(this.tonePool, instrumentState.releasedTones, toneIndex);
	}

	public freeAllTones(): void {
		freeAllTones(this.tonePool, this.channels);
	}

	private determineLiveInputTones(
		song: Song,
		channelIndex: number,
		samplesPerTick: number,
	): void {
		const channel: Channel = song.channels[channelIndex];
		const channelState: ChannelState = this.channels[channelIndex];
		const pitches: number[] = this.liveInputPitches;
		const velocities: number[] = this.liveInputVelocities;
		const bassPitches: number[] = this.liveBassInputPitches;
		const bassVelocities: number[] = this.liveBassInputVelocities;

		for (
			let instrumentIndex: number = 0;
			instrumentIndex < channel.instruments.length;
			instrumentIndex++
		) {
			const instrumentState: InstrumentState = channelState.instruments[instrumentIndex];
			const toneList: Deque<Tone> = instrumentState.liveInputTones;
			let toneCount: number = 0;
			const instrument: Instrument = channel.instruments[instrumentIndex];
			let filteredPitches = pitches;
			if (effectsIncludeNoteRange(instrument.effects)) {
				filteredPitches = this._fillFilteredPitchesAndVelocities(
					pitches,
					velocities,
					instrument.lowerNoteLimit,
					instrument.upperNoteLimit,
					instrument.lowerVelocityLimit,
					instrument.upperVelocityLimit,
				);
				// Snapshot before bass filter overwrites the reusable buffer
				filteredPitches = filteredPitches.slice();
			}
			let filteredBassPitches: number[] = bassPitches;
			if (effectsIncludeNoteRange(instrument.effects)) {
				filteredBassPitches = this._fillFilteredPitchesAndVelocities(
					bassPitches,
					bassVelocities,
					instrument.lowerNoteLimit,
					instrument.upperNoteLimit,
					instrument.lowerVelocityLimit,
					instrument.upperVelocityLimit,
				);
			}
			if (
				this.liveInputDuration > 0 &&
				channelIndex === this.liveInputChannel &&
				pitches.length > 0 &&
				this.liveInputInstruments.indexOf(instrumentIndex) !== -1
			) {
				const instrument: Instrument = channel.instruments[instrumentIndex];

				if (instrument.getChord().singleTone) {
					let tone: Tone;
					if (toneList.count() <= toneCount) {
						tone = this.newTone();
						toneList.pushBack(tone);
					} else if (!instrument.getTransition().isSeamless && this.liveInputStarted) {
						this.releaseTone(instrumentState, toneList.get(toneCount));
						tone = this.newTone();
						toneList.set(toneCount, tone);
					} else {
						tone = toneList.get(toneCount);
					}
					toneCount++;

					for (let i: number = 0; i < filteredPitches.length; i++) {
						tone.pitches[i] = filteredPitches[i];
					}
					tone.pitchCount = filteredPitches.length;
					tone.chordSize = 1;
					tone.instrumentIndex = instrumentIndex;
					tone.note = tone.prevNote = tone.nextNote = null;
					tone.atNoteStart = this.liveInputStarted;
					tone.forceContinueAtStart = false;
					tone.forceContinueAtEnd = false;
					this.computeTone(song, channelIndex, samplesPerTick, tone, false, false);
				} else {
					this.moveTonesIntoOrderedTempMatchedList(toneList, filteredPitches);

					for (let i: number = 0; i < filteredPitches.length; i++) {
						let tone: Tone;
						if (this.tempMatchedPitchTones[toneCount] != null) {
							tone = this.tempMatchedPitchTones[toneCount]!;
							this.tempMatchedPitchTones[toneCount] = null;
							if (tone.pitchCount !== 1 || tone.pitches[0] !== filteredPitches[i]) {
								this.releaseTone(instrumentState, tone);
								tone = this.newTone();
							}
							toneList.pushBack(tone);
						} else {
							tone = this.newTone();
							toneList.pushBack(tone);
						}
						toneCount++;

						tone.pitches[0] = filteredPitches[i];
						tone.pitchCount = 1;
						tone.chordSize = filteredPitches.length;
						tone.instrumentIndex = instrumentIndex;
						tone.note = tone.prevNote = tone.nextNote = null;
						tone.atNoteStart = this.liveInputStarted;
						tone.forceContinueAtStart = false;
						tone.forceContinueAtEnd = false;
						this.computeTone(song, channelIndex, samplesPerTick, tone, false, false);
					}
				}
			}

			if (
				this.liveBassInputDuration > 0 &&
				channelIndex === this.liveBassInputChannel &&
				filteredBassPitches.length > 0 &&
				this.liveBassInputInstruments.indexOf(instrumentIndex) !== -1
			) {
				const instrument: Instrument = channel.instruments[instrumentIndex];

				if (instrument.getChord().singleTone) {
					let tone: Tone;
					if (toneList.count() <= toneCount) {
						tone = this.newTone();
						toneList.pushBack(tone);
					} else if (!instrument.getTransition().isSeamless && this.liveInputStarted) {
						this.releaseTone(instrumentState, toneList.get(toneCount));
						tone = this.newTone();
						toneList.set(toneCount, tone);
					} else {
						tone = toneList.get(toneCount);
					}
					toneCount++;

					for (let i: number = 0; i < filteredBassPitches.length; i++) {
						tone.pitches[i] = filteredBassPitches[i];
					}
					tone.pitchCount = filteredBassPitches.length;
					tone.chordSize = 1;
					tone.instrumentIndex = instrumentIndex;
					tone.note = tone.prevNote = tone.nextNote = null;
					tone.atNoteStart = this.liveBassInputStarted;
					tone.forceContinueAtStart = false;
					tone.forceContinueAtEnd = false;
					this.computeTone(song, channelIndex, samplesPerTick, tone, false, false);
				} else {
					this.moveTonesIntoOrderedTempMatchedList(toneList, filteredBassPitches);

					for (let i: number = 0; i < filteredBassPitches.length; i++) {
						let tone: Tone;
						if (this.tempMatchedPitchTones[toneCount] != null) {
							tone = this.tempMatchedPitchTones[toneCount]!;
							this.tempMatchedPitchTones[toneCount] = null;
							if (
								tone.pitchCount !== 1 ||
								tone.pitches[0] !== filteredBassPitches[i]
							) {
								this.releaseTone(instrumentState, tone);
								tone = this.newTone();
							}
							toneList.pushBack(tone);
						} else {
							tone = this.newTone();
							toneList.pushBack(tone);
						}
						toneCount++;

						tone.pitches[0] = filteredBassPitches[i];
						tone.pitchCount = 1;
						tone.chordSize = filteredBassPitches.length;
						tone.instrumentIndex = instrumentIndex;
						tone.note = tone.prevNote = tone.nextNote = null;
						tone.atNoteStart = this.liveBassInputStarted;
						tone.forceContinueAtStart = false;
						tone.forceContinueAtEnd = false;
						this.computeTone(song, channelIndex, samplesPerTick, tone, false, false);
					}
				}
			}

			while (toneList.count() > toneCount) {
				this.releaseTone(instrumentState, toneList.popBack());
			}

			this.clearTempMatchedPitchTones(toneCount, instrumentState);
		}

		this.liveInputStarted = false;
		this.liveBassInputStarted = false;
	}

	// Returns the chord type of the instrument in the adjacent pattern if it is compatible for a
	// seamless transition across patterns, otherwise returns null.
	private adjacentPatternHasCompatibleInstrumentTransition(
		song: Song,
		channel: Channel,
		pattern: Pattern,
		otherPattern: Pattern,
		instrumentIndex: number,
		transition: Transition,
		chord: Chord,
		_note: Note,
		_otherNote: Note,
		forceContinue: boolean,
	): Chord | null {
		if (song.patternInstruments && otherPattern.instruments.indexOf(instrumentIndex) === -1) {
			// The adjacent pattern does not contain the same instrument as the current pattern.

			if (pattern.instruments.length > 1 || otherPattern.instruments.length > 1) {
				// The current or adjacent pattern contains more than one instrument, don't bother
				// trying to connect them.
				return null;
			}
			// Otherwise, the two patterns each contain one instrument, but not the same instrument.
			// Try to connect them.
			const otherInstrument: Instrument = channel.instruments[otherPattern.instruments[0]];

			if (forceContinue) {
				// Even non-seamless instruments can be connected across patterns if forced.
				return otherInstrument.getChord();
			}

			// Otherwise, check that both instruments are seamless across patterns.
			const otherTransition: Transition = otherInstrument.getTransition();
			if (
				transition.includeAdjacentPatterns &&
				otherTransition.includeAdjacentPatterns &&
				otherTransition.slides === transition.slides
			) {
				return otherInstrument.getChord();
			} else {
				return null;
			}
		} else {
			// If both patterns contain the same instrument, check that it is seamless across patterns.
			return forceContinue || transition.includeAdjacentPatterns ? chord : null;
		}
	}

	public static adjacentNotesHaveMatchingPitches(firstNote: Note, secondNote: Note): boolean {
		return adjacentNotesHaveMatchingPitches(firstNote, secondNote);
	}

	private moveTonesIntoOrderedTempMatchedList(
		toneList: Deque<Tone>,
		notePitches: number[],
	): void {
		// The tones are about to seamlessly transition to a new note. The pitches
		// from the old note may or may not match any of the pitches in the new
		// note, and not necessarily in order, but if any do match, they'll sound
		// better if those tones continue to have the same pitch. Attempt to find
		// the right spot for each old tone in the new chord if possible.

		for (let i: number = 0; i < toneList.count(); i++) {
			const tone: Tone = toneList.get(i);
			const pitch: number = tone.pitches[0] + tone.lastInterval;
			for (let j: number = 0; j < notePitches.length; j++) {
				if (notePitches[j] === pitch) {
					this.tempMatchedPitchTones[j] = tone;
					toneList.remove(i);
					i--;
					break;
				}
			}
		}

		// Any tones that didn't get matched should just fill in the gaps.
		while (toneList.count() > 0) {
			const tone: Tone = toneList.popFront();
			for (let j: number = 0; j < this.tempMatchedPitchTones.length; j++) {
				if (this.tempMatchedPitchTones[j] == null) {
					this.tempMatchedPitchTones[j] = tone;
					break;
				}
			}
		}
	}

	private determineCurrentActiveTones(
		song: Song,
		channelIndex: number,
		samplesPerTick: number,
		playSong: boolean,
	): void {
		const channel: Channel = song.channels[channelIndex];
		const channelState: ChannelState = this.channels[channelIndex];
		const pattern: Pattern | null = song.getPattern(channelIndex, this.bar);
		const currentPart: number = this.getCurrentPart();
		const currentTick: number = this.tick + Config.ticksPerPart * currentPart;

		if (playSong && song.getChannelIsMod(channelIndex)) {
			// For mod channels, notes aren't strictly arranged chronologically. Also, each pitch value could play or not play at a given time. So... a bit more computation involved!
			// The same transition logic should apply though, even though it isn't really used by mod channels.
			const notes: (Note | null)[] = [];
			const prevNotes: (Note | null)[] = [];
			const nextNotes: (Note | null)[] = [];
			let fillCount: number = Config.modCount;
			while (fillCount--) {
				notes.push(null);
				prevNotes.push(null);
				nextNotes.push(null);
			}

			if (pattern != null && !channel.muted) {
				for (let i: number = 0; i < pattern.notes.length; i++) {
					if (pattern.notes[i].end <= currentPart) {
						// Actually need to check which note starts closer to the start of this note.
						if (
							prevNotes[pattern.notes[i].pitches[0]] == null ||
							pattern.notes[i].end >
								(prevNotes[pattern.notes[i].pitches[0]] as Note).start
						) {
							prevNotes[pattern.notes[i].pitches[0]] = pattern.notes[i];
						}
					} else if (
						pattern.notes[i].start <= currentPart &&
						pattern.notes[i].end > currentPart
					) {
						notes[pattern.notes[i].pitches[0]] = pattern.notes[i];
					} else if (pattern.notes[i].start > currentPart) {
						// Actually need to check which note starts closer to the end of this note.
						if (
							nextNotes[pattern.notes[i].pitches[0]] == null ||
							pattern.notes[i].start <
								(nextNotes[pattern.notes[i].pitches[0]] as Note).start
						) {
							nextNotes[pattern.notes[i].pitches[0]] = pattern.notes[i];
						}
					}
				}
			}

			let modToneCount: number = 0;
			const newInstrumentIndex: number =
				song.patternInstruments && pattern != null ? pattern.instruments[0] : 0;
			const instrumentState: InstrumentState = channelState.instruments[newInstrumentIndex];
			const toneList: Deque<Tone> = instrumentState.activeModTones;
			for (let mod: number = 0; mod < Config.modCount; mod++) {
				if (notes[mod] != null) {
					if (
						prevNotes[mod] != null &&
						(prevNotes[mod] as Note).end !== (notes[mod] as Note).start
					) {
						prevNotes[mod] = null;
					}
					if (
						nextNotes[mod] != null &&
						(nextNotes[mod] as Note).start !== (notes[mod] as Note).end
					) {
						nextNotes[mod] = null;
					}
				}

				if (
					channelState.singleSeamlessInstrument != null &&
					channelState.singleSeamlessInstrument !== newInstrumentIndex &&
					channelState.singleSeamlessInstrument < channelState.instruments.length
				) {
					const sourceInstrumentState: InstrumentState =
						channelState.instruments[channelState.singleSeamlessInstrument];
					const destInstrumentState: InstrumentState =
						channelState.instruments[newInstrumentIndex];
					while (sourceInstrumentState.activeModTones.count() > 0) {
						destInstrumentState.activeModTones.pushFront(
							sourceInstrumentState.activeModTones.popBack(),
						);
					}
				}
				channelState.singleSeamlessInstrument = newInstrumentIndex;

				if (notes[mod] != null) {
					const prevNoteForThisInstrument: Note | null = prevNotes[mod];
					const nextNoteForThisInstrument: Note | null = nextNotes[mod];

					const forceContinueAtStart: boolean = false;
					const forceContinueAtEnd: boolean = false;
					const atNoteStart: boolean =
						Config.ticksPerPart * notes[mod]!.start === currentTick &&
						this.isAtStartOfTick;
					let tone: Tone;
					if (toneList.count() <= modToneCount) {
						tone = this.newTone();
						toneList.pushBack(tone);
					} else if (atNoteStart && prevNoteForThisInstrument == null) {
						const oldTone: Tone = toneList.get(modToneCount);
						if (oldTone.isOnLastTick) {
							this.freeTone(oldTone);
						} else {
							this.releaseTone(instrumentState, oldTone);
						}
						tone = this.newTone();
						toneList.set(modToneCount, tone);
					} else {
						tone = toneList.get(modToneCount);
					}
					modToneCount++;

					for (let i: number = 0; i < notes[mod]!.pitches.length; i++) {
						tone.pitches[i] = notes[mod]!.pitches[i];
					}
					tone.pitchCount = notes[mod]!.pitches.length;

					tone.chordSize = 1;
					tone.instrumentIndex = newInstrumentIndex;
					tone.note = notes[mod];
					tone.noteStartPart = notes[mod]!.start;
					tone.noteEndPart = notes[mod]!.end;
					tone.noteStartBar = this.bar;
					tone.prevNote = prevNoteForThisInstrument;
					tone.nextNote = nextNoteForThisInstrument;
					tone.prevNotePitchIndex = 0;
					tone.nextNotePitchIndex = 0;
					tone.atNoteStart = atNoteStart;
					tone.passedEndOfNote = false;
					tone.forceContinueAtStart = forceContinueAtStart;
					tone.forceContinueAtEnd = forceContinueAtEnd;
				}
			}
			// Automatically free or release seamless tones if there's no new note to take over.
			while (toneList.count() > modToneCount) {
				const tone: Tone = toneList.popBack();
				const channel: Channel = song.channels[channelIndex];
				if (tone.instrumentIndex < channel.instruments.length && !tone.isOnLastTick) {
					const instrumentState: InstrumentState =
						this.channels[channelIndex].instruments[tone.instrumentIndex];
					this.releaseTone(instrumentState, tone);
				} else {
					this.freeTone(tone);
				}
			}
		} else if (!song.getChannelIsMod(channelIndex)) {
			let note: Note | null = null;
			let prevNote: Note | null = null;
			let nextNote: Note | null = null;

			if (
				playSong &&
				pattern != null &&
				!channel.muted &&
				(!this.isRecording || this.liveInputChannel !== channelIndex)
			) {
				for (let i: number = 0; i < pattern.notes.length; i++) {
					if (pattern.notes[i].end <= currentPart) {
						prevNote = pattern.notes[i];
					} else if (
						pattern.notes[i].start <= currentPart &&
						pattern.notes[i].end > currentPart
					) {
						note = pattern.notes[i];
					} else if (pattern.notes[i].start > currentPart) {
						nextNote = pattern.notes[i];
						break;
					}
				}

				if (note != null) {
					if (prevNote != null && prevNote.end !== note.start) prevNote = null;
					if (nextNote != null && nextNote.start !== note.end) nextNote = null;
				}
			}

			// Seamless tones from a pattern with a single instrument can be transferred to a different single seamless instrument in the next pattern.
			if (
				pattern != null &&
				(!song.layeredInstruments ||
					channel.instruments.length === 1 ||
					(song.patternInstruments && pattern.instruments.length === 1))
			) {
				const newInstrumentIndex: number = song.patternInstruments
					? pattern.instruments[0]
					: 0;
				if (
					channelState.singleSeamlessInstrument != null &&
					channelState.singleSeamlessInstrument !== newInstrumentIndex &&
					channelState.singleSeamlessInstrument < channelState.instruments.length
				) {
					const sourceInstrumentState: InstrumentState =
						channelState.instruments[channelState.singleSeamlessInstrument];
					const destInstrumentState: InstrumentState =
						channelState.instruments[newInstrumentIndex];
					while (sourceInstrumentState.activeTones.count() > 0) {
						destInstrumentState.activeTones.pushFront(
							sourceInstrumentState.activeTones.popBack(),
						);
					}
				}
				channelState.singleSeamlessInstrument = newInstrumentIndex;
			} else {
				channelState.singleSeamlessInstrument = null;
			}

			for (
				let instrumentIndex: number = 0;
				instrumentIndex < channel.instruments.length;
				instrumentIndex++
			) {
				const instrumentState: InstrumentState = channelState.instruments[instrumentIndex];
				const toneList: Deque<Tone> = instrumentState.activeTones;
				let toneCount: number = 0;
				if (
					note != null &&
					(!song.patternInstruments ||
						pattern!.instruments.indexOf(instrumentIndex) !== -1)
				) {
					const instrument: Instrument = channel.instruments[instrumentIndex];
					let prevNoteForThisInstrument: Note | null = prevNote;
					let nextNoteForThisInstrument: Note | null = nextNote;

					const partsPerBar: number = Config.partsPerBeat * song.beatsPerBar;
					const transition: Transition = instrument.getTransition();
					const chord: Chord = instrument.getChord();
					let forceContinueAtStart: boolean = false;
					let forceContinueAtEnd: boolean = false;
					let tonesInPrevNote: number = 0;
					let tonesInNextNote: number = 0;
					// prevBar may be null when starting mid-song; detect continue-prev from effective previous bar.
					// Determine effective previous bar for continue detection.
					const effectivePrevBar: number | null =
						this.prevBar != null ? this.prevBar : this.bar > 0 ? this.bar - 1 : null;
					if (note.start === 0) {
						// If the beginning of the note coincides with the beginning of the pattern,
						const prevPattern: Pattern | null =
							effectivePrevBar == null
								? null
								: song.getPattern(channelIndex, effectivePrevBar);
						if (prevPattern != null) {
							const lastNote: Note | null =
								prevPattern.notes.length <= 0
									? null
									: prevPattern.notes[prevPattern.notes.length - 1];
							if (lastNote != null && lastNote.end === partsPerBar) {
								const patternForcesContinueAtStart: boolean =
									note.continuesLastPattern &&
									Synth.adjacentNotesHaveMatchingPitches(lastNote, note);
								const chordOfCompatibleInstrument: Chord | null =
									this.adjacentPatternHasCompatibleInstrumentTransition(
										song,
										channel,
										pattern!,
										prevPattern,
										instrumentIndex,
										transition,
										chord,
										note,
										lastNote,
										patternForcesContinueAtStart,
									);
								if (chordOfCompatibleInstrument != null) {
									prevNoteForThisInstrument = lastNote;
									const prevPitchesForThisInstrument: number[] =
										prevNoteForThisInstrument.pitches;
									tonesInPrevNote = chordOfCompatibleInstrument.singleTone
										? 1
										: prevPitchesForThisInstrument.length;
									forceContinueAtStart = patternForcesContinueAtStart;
								}
							}
						}
					} else if (prevNoteForThisInstrument != null) {
						const prevPitchesForThisInstrument: number[] =
							prevNoteForThisInstrument.pitches;
						tonesInPrevNote = chord.singleTone
							? 1
							: prevPitchesForThisInstrument.length;
					}
					if (note.end === partsPerBar) {
						// If the end of the note coincides with the end of the pattern, look for an
						// adjacent note at the beginning of the next pattern.
						const nextPattern: Pattern | null =
							this.nextBar == null
								? null
								: song.getPattern(channelIndex, this.nextBar);
						if (nextPattern != null) {
							const firstNote: Note | null =
								nextPattern.notes.length <= 0 ? null : nextPattern.notes[0];
							if (firstNote != null && firstNote.start === 0) {
								const nextPatternForcesContinueAtStart: boolean =
									firstNote.continuesLastPattern &&
									Synth.adjacentNotesHaveMatchingPitches(note, firstNote);
								const chordOfCompatibleInstrument: Chord | null =
									this.adjacentPatternHasCompatibleInstrumentTransition(
										song,
										channel,
										pattern!,
										nextPattern,
										instrumentIndex,
										transition,
										chord,
										note,
										firstNote,
										nextPatternForcesContinueAtStart,
									);
								if (chordOfCompatibleInstrument != null) {
									nextNoteForThisInstrument = firstNote;
									tonesInNextNote = chordOfCompatibleInstrument.singleTone
										? 1
										: nextNoteForThisInstrument.pitches.length;
									forceContinueAtEnd = nextPatternForcesContinueAtStart;
								}
							}
						}
					} else if (nextNoteForThisInstrument != null) {
						tonesInNextNote = chord.singleTone
							? 1
							: nextNoteForThisInstrument.pitches.length;
					}

					let filteredPitches: number[] = note.pitches;
					if (effectsIncludeNoteRange(instrument.effects)) {
						filteredPitches = this._fillFilteredPitches(
							note.pitches,
							instrument.lowerNoteLimit,
							instrument.upperNoteLimit,
						);
						if (filteredPitches.length > 0) {
							const vel: number = note.velocity;
							if (
								vel < instrument.lowerVelocityLimit ||
								vel > instrument.upperVelocityLimit
							) {
								filteredPitches = [];
							}
						}
					}
					if (chord.singleTone && !(filteredPitches.length <= 0)) {
						const atNoteStart: boolean =
							Config.ticksPerPart * note.start === currentTick;
						let tone: Tone;
						if (toneList.count() <= toneCount) {
							tone = this.newTone();
							toneList.pushBack(tone);
						} else if (
							atNoteStart &&
							((!(transition.isSeamless || instrument.clicklessTransition) &&
								!forceContinueAtStart) ||
								prevNoteForThisInstrument == null)
						) {
							const oldTone: Tone = toneList.get(toneCount);
							if (oldTone.isOnLastTick) {
								this.freeTone(oldTone);
							} else {
								this.releaseTone(instrumentState, oldTone);
							}
							tone = this.newTone();
							toneList.set(toneCount, tone);
						} else {
							tone = toneList.get(toneCount);
						}
						toneCount++;

						for (let i: number = 0; i < filteredPitches.length; i++) {
							tone.pitches[i] = filteredPitches[i];
						}
						tone.pitchCount = filteredPitches.length;
						tone.chordSize = 1;
						tone.instrumentIndex = instrumentIndex;
						tone.note = note;
						tone.noteStartPart = note.start;
						tone.noteEndPart = note.end;
						let originBar = this.bar;
						if (forceContinueAtStart && prevNoteForThisInstrument != null) {
							// When starting mid-song, prevBar may not be set (it's only set during playback transitions).
							// In that case, start searching from bar - 1, or 0 if already at bar 0.
							let searchBar =
								this.prevBar != null ? this.prevBar : Math.max(0, this.bar - 1);
							let searchNote: Note = note;
							while (searchBar != null && searchBar >= 0) {
								const prevPattern = song.getPattern(channelIndex, searchBar);
								if (prevPattern == null) break;
								const lastNoteInPrev =
									prevPattern.notes[prevPattern.notes.length - 1];
								if (lastNoteInPrev == null || lastNoteInPrev.end < partsPerBar)
									break;
								if (
									!searchNote.continuesLastPattern ||
									!Synth.adjacentNotesHaveMatchingPitches(
										lastNoteInPrev,
										searchNote,
									)
								)
									break;
								originBar = searchBar;
								searchNote = lastNoteInPrev;
								searchBar = searchBar - 1;
							}
						}
						tone.noteStartBar = originBar;
						tone.prevNote = prevNoteForThisInstrument;
						tone.nextNote = nextNoteForThisInstrument;
						tone.prevNotePitchIndex = 0;
						tone.nextNotePitchIndex = 0;
						tone.atNoteStart = atNoteStart;
						tone.passedEndOfNote = false;
						tone.forceContinueAtStart = forceContinueAtStart;
						tone.forceContinueAtEnd = forceContinueAtEnd;
						this.computeTone(song, channelIndex, samplesPerTick, tone, false, false);
					} else {
						const transition: Transition = instrument.getTransition();

						if (
							((transition.isSeamless &&
								!transition.slides &&
								chord.strumParts === 0) ||
								forceContinueAtStart) &&
							Config.ticksPerPart * note.start === currentTick &&
							prevNoteForThisInstrument != null
						) {
							this.moveTonesIntoOrderedTempMatchedList(toneList, filteredPitches);
						}

						let strumOffsetParts: number = 0;
						for (let i: number = 0; i < filteredPitches.length; i++) {
							let prevNoteForThisTone: Note | null =
								tonesInPrevNote > i ? prevNoteForThisInstrument : null;
							let noteForThisTone: Note = note;
							let pitchesForThisTone: number[] = filteredPitches;
							let nextNoteForThisTone: Note | null =
								tonesInNextNote > i ? nextNoteForThisInstrument : null;
							let noteStartPart: number = noteForThisTone.start + strumOffsetParts;
							let passedEndOfNote: boolean = false;

							// Strumming may mean that a note's actual start time may be after the
							// note's displayed start time. If the note start hasn't been reached yet,
							// carry over the previous tone if available and seamless, otherwise skip
							// the new tone until it is ready to start.
							if (noteStartPart > currentPart) {
								if (
									toneList.count() > i &&
									(transition.isSeamless || forceContinueAtStart) &&
									prevNoteForThisTone != null
								) {
									// Continue the previous note's chord until the current one takes over.
									nextNoteForThisTone = noteForThisTone;
									noteForThisTone = prevNoteForThisTone;
									pitchesForThisTone = noteForThisTone.pitches;
									if (effectsIncludeNoteRange(instrument.effects)) {
										pitchesForThisTone = this._fillFilteredPitches(
											pitchesForThisTone,
											instrument.lowerNoteLimit,
											instrument.upperNoteLimit,
										);
										if (pitchesForThisTone.length > 0) {
											const vel: number = noteForThisTone.velocity;
											if (
												vel < instrument.lowerVelocityLimit ||
												vel > instrument.upperVelocityLimit
											) {
												pitchesForThisTone = [];
											}
										}
									}
									prevNoteForThisTone = null;
									noteStartPart = noteForThisTone.start + strumOffsetParts;
									passedEndOfNote = true;
								} else {
									// This and the rest of the tones in the chord shouldn't start yet.
									break;
								}
							}

							let noteEndPart: number = noteForThisTone.end;
							if (
								(transition.isSeamless || forceContinueAtStart) &&
								nextNoteForThisTone != null
							) {
								noteEndPart = Math.min(
									Config.partsPerBeat * this.song!.beatsPerBar,
									noteEndPart + strumOffsetParts,
								);
							}
							if (
								(!transition.continues && !forceContinueAtStart) ||
								prevNoteForThisTone == null
							) {
								strumOffsetParts += chord.strumParts;
							}

							const atNoteStart: boolean =
								Config.ticksPerPart * noteStartPart === currentTick;
							let tone: Tone;
							if (this.tempMatchedPitchTones[toneCount] != null) {
								tone = this.tempMatchedPitchTones[toneCount]!;
								this.tempMatchedPitchTones[toneCount] = null;
								toneList.pushBack(tone);
							} else if (toneList.count() <= toneCount) {
								tone = this.newTone();
								toneList.pushBack(tone);
							} else if (
								atNoteStart &&
								((!transition.isSeamless && !forceContinueAtStart) ||
									prevNoteForThisTone == null)
							) {
								const oldTone: Tone = toneList.get(toneCount);
								if (oldTone.isOnLastTick) {
									this.freeTone(oldTone);
								} else {
									this.releaseTone(instrumentState, oldTone);
								}
								tone = this.newTone();
								toneList.set(toneCount, tone);
							} else {
								tone = toneList.get(toneCount);
							}
							toneCount++;

							tone.pitches[0] = noteForThisTone.pitches[i];
							tone.pitchCount = 1;
							tone.chordSize = noteForThisTone.pitches.length;
							tone.instrumentIndex = instrumentIndex;
							tone.note = noteForThisTone;
							tone.noteStartPart = noteStartPart;
							tone.noteEndPart = noteEndPart;
							let originBar = this.bar;
							if (forceContinueAtStart && prevNoteForThisTone != null) {
								// When starting mid-song, prevBar may not be set (it's only set during playback transitions).
								// In that case, start searching from bar - 1, or 0 if already at bar 0.
								let searchBar =
									this.prevBar != null ? this.prevBar : Math.max(0, this.bar - 1);
								let searchNote: Note = noteForThisTone;
								while (searchBar != null && searchBar >= 0) {
									const prevPattern = song.getPattern(channelIndex, searchBar);
									if (prevPattern == null) break;
									const lastNoteInPrev =
										prevPattern.notes[prevPattern.notes.length - 1];
									if (lastNoteInPrev == null || lastNoteInPrev.end < partsPerBar)
										break;
									if (
										!searchNote.continuesLastPattern ||
										!Synth.adjacentNotesHaveMatchingPitches(
											lastNoteInPrev,
											searchNote,
										)
									)
										break;
									originBar = searchBar;
									searchNote = lastNoteInPrev;
									searchBar = searchBar - 1;
								}
							}
							tone.noteStartBar = originBar;
							tone.prevNote = prevNoteForThisTone;
							tone.nextNote = nextNoteForThisTone;
							tone.prevNotePitchIndex = i;
							tone.nextNotePitchIndex = i;
							tone.atNoteStart = atNoteStart;
							tone.passedEndOfNote = passedEndOfNote;
							tone.forceContinueAtStart =
								forceContinueAtStart && prevNoteForThisTone != null;
							tone.forceContinueAtEnd =
								forceContinueAtEnd && nextNoteForThisTone != null;
							this.computeTone(
								song,
								channelIndex,
								samplesPerTick,
								tone,
								false,
								false,
							);
						}
					}
					if (
						(transition.continues && toneList.count() <= 0) ||
						note.pitches.length <= 0
					) {
						instrumentState.envelopeComputer.reset(); // stop computing effects envelopes
					}
				}
				// Automatically free or release seamless tones if there's no new note to take over.
				while (toneList.count() > toneCount) {
					const tone: Tone = toneList.popBack();
					const channel: Channel = song.channels[channelIndex];
					if (tone.instrumentIndex < channel.instruments.length && !tone.isOnLastTick) {
						const instrumentState: InstrumentState =
							channelState.instruments[tone.instrumentIndex];
						this.releaseTone(instrumentState, tone);
					} else {
						this.freeTone(tone);
					}
				}

				this.clearTempMatchedPitchTones(toneCount, instrumentState);
			}
		}
	}

	private clearTempMatchedPitchTones(toneCount: number, instrumentState: InstrumentState): void {
		for (let i: number = toneCount; i < this.tempMatchedPitchTones.length; i++) {
			const oldTone: Tone | null = this.tempMatchedPitchTones[i];
			if (oldTone != null) {
				if (oldTone.isOnLastTick) {
					this.freeTone(oldTone);
				} else {
					this.releaseTone(instrumentState, oldTone);
				}
				this.tempMatchedPitchTones[i] = null;
			}
		}
	}

	private playTone(
		channelIndex: number,
		bufferIndex: number,
		runLength: number,
		tone: Tone,
	): void {
		const channelState: ChannelState = this.channels[channelIndex];
		const instrumentState: InstrumentState = channelState.instruments[tone.instrumentIndex];

		renderPlayTone(
			instrumentState.synthesizer,
			bufferIndex,
			runLength,
			tone,
			this,
			instrumentState,
		);
	}

	// Computes mod note position at the start and end of the window and "plays" the mod tone, setting appropriate mod data.
	private playModTone(
		song: Song,
		channelIndex: number,
		samplesPerTick: number,
		bufferIndex: number,
		roundedSamplesPerTick: number,
		tone: Tone,
		_released: boolean,
		_shouldFadeOutFast: boolean,
	): void {
		const channel: Channel = song.channels[channelIndex];
		const instrument: Instrument = channel.instruments[tone.instrumentIndex];

		if (tone.note != null) {
			const ticksIntoBar: number = this.getTicksIntoBar();
			const partTimeTickStart: number = ticksIntoBar / Config.ticksPerPart;
			const partTimeTickEnd: number = (ticksIntoBar + 1) / Config.ticksPerPart;
			const tickSampleCountdown: number = this.tickSampleCountdown;
			const startRatio: number = 1.0 - tickSampleCountdown / samplesPerTick;
			const endRatio: number =
				1.0 - (tickSampleCountdown - roundedSamplesPerTick) / samplesPerTick;
			const partTimeStart: number =
				partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
			const partTimeEnd: number =
				partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
			const tickTimeStart: number = Config.ticksPerPart * partTimeStart;
			const tickTimeEnd: number = Config.ticksPerPart * partTimeEnd;
			const endPinIndex: number = tone.note.getEndPinIndex(this.getCurrentPart());
			const startPin: NotePin = tone.note.pins[endPinIndex - 1];
			const endPin: NotePin = tone.note.pins[endPinIndex];
			const startPinTick: number = (tone.note.start + startPin.time) * Config.ticksPerPart;
			const endPinTick: number = (tone.note.start + endPin.time) * Config.ticksPerPart;
			const ratioStart: number = (tickTimeStart - startPinTick) / (endPinTick - startPinTick);
			const ratioEnd: number = (tickTimeEnd - startPinTick) / (endPinTick - startPinTick);
			tone.expression = startPin.size + (endPin.size - startPin.size) * ratioStart;
			tone.expressionDelta =
				startPin.size + (endPin.size - startPin.size) * ratioEnd - tone.expression;

			Synth.getInstrumentSynthFunction(instrument)(
				this,
				bufferIndex,
				roundedSamplesPerTick,
				tone,
				instrument,
			);
		}
	}

	private static computeChordExpression(chordSize: number): number {
		return computeChordExpression(chordSize);
	}

	private computeTone(
		song: Song,
		channelIndex: number,
		samplesPerTick: number,
		tone: Tone,
		released: boolean,
		shouldFadeOutFast: boolean,
	): void {
		const roundedSamplesPerTick: number = Math.ceil(samplesPerTick);
		const channel: Channel = song.channels[channelIndex];
		const channelState: ChannelState = this.channels[channelIndex];
		const instrument: Instrument = channel.instruments[tone.instrumentIndex];
		const instrumentState: InstrumentState = channelState.instruments[tone.instrumentIndex];
		instrumentState.awake = true;
		instrumentState.tonesAddedInThisTick = true;
		if (!instrumentState.computed) {
			instrumentState.compute(
				this,
				instrument,
				samplesPerTick,
				roundedSamplesPerTick,
				tone,
				channelIndex,
				tone.instrumentIndex,
			);
		}
		const transition: Transition = instrument.getTransition();
		const chord: Chord = instrument.getChord();
		const chordExpression: number = chord.singleTone
			? 1.0
			: Synth.computeChordExpression(tone.chordSize);
		const { basePitch, baseExpression, expressionReferencePitch, pitchDamping, intervalScale } =
			computeBasePitchAndExpression(channelIndex, instrument, {
				key: song.key,
				octave: song.octave,
				pitchChannelCount: song.pitchChannelCount,
				noiseChannelCount: song.noiseChannelCount,
			});
		const secondsPerPart: number =
			(Config.ticksPerPart * samplesPerTick) / this.samplesPerSecond;
		const sampleTime: number = 1.0 / this.samplesPerSecond;
		const beatsPerPart: number = 1.0 / Config.partsPerBeat;
		const ticksIntoBar: number = this.getTicksIntoBar();
		const partTimeStart: number = ticksIntoBar / Config.ticksPerPart;
		const partTimeEnd: number = (ticksIntoBar + 1.0) / Config.ticksPerPart;
		const currentPart: number = this.getCurrentPart();

		let specialIntervalMult: number = 1.0;
		tone.specialIntervalExpressionMult = 1.0;

		let toneIsOnLastTick: boolean = shouldFadeOutFast;
		let intervalStart: number = 0.0;
		let intervalEnd: number = 0.0;
		let fadeExpressionStart: number = 1.0;
		let fadeExpressionEnd: number = 1.0;
		let chordExpressionStart: number = chordExpression;
		let chordExpressionEnd: number = chordExpression;

		let customSampleNeedsPhaseRestore: boolean = false;
		let customSamplePartsPassed: number = 0;
		let customSampleFirstOffset: number = 0;
		if (
			(tone.atNoteStart && !transition.isSeamless && !tone.forceContinueAtStart) ||
			tone.freshlyAllocated
		) {
			tone.reset();
			instrumentState.envelopeComputer.reset();
			// advloop addition
			if (instrument.type === InstrumentType.chip && instrument.isUsingAdvancedLoopControls) {
				const chipWaveLength =
					Config.rawRawChipWaves[instrument.chipWave].samples.length - 1;
				const firstOffset = instrument.chipWaveStartOffset / chipWaveLength;
				// @TODO: Keep lastOffset as 1.0 without wrap-back to 0 in loopableChipSynth.
				const lastOffset = 0.999999999999999;
				for (let i = 0; i < Config.maxPitchOrOperatorCount; i++) {
					tone.phases[i] = instrument.chipWavePlayBackwards
						? Math.max(0, Math.min(lastOffset, firstOffset))
						: Math.max(0, firstOffset);
					tone.directions[i] = instrument.chipWavePlayBackwards ? -1 : 1;
					tone.chipWaveCompletions[i] = 0;
					tone.chipWavePrevWaves[i] = 0;
					tone.chipWaveCompletionsLastWave[i] = 0;
				}
			}
			// advloop addition

			// Phase offset for custom sampled chips resuming mid-note (INSIDE reset block so it takes effect immediately)
			const isCustomChip =
				instrument.type === InstrumentType.chip &&
				Config.chipWaves[instrument.chipWave]?.isCustomSampled;
			if (isCustomChip && tone.note != null) {
				const partsPerBar = Config.partsPerBeat * song.beatsPerBar;
				const currentPartInBar = this.beat * Config.partsPerBeat + this.part;
				const currentAbsolutePart = this.bar * partsPerBar + currentPartInBar;
				const noteStartAbsolutePart =
					tone.forceContinueAtStart && tone.noteStartBar !== this.bar
						? tone.noteStartBar * partsPerBar + tone.noteStartPart
						: this.bar * partsPerBar + tone.noteStartPart;
				const partsPassed = currentAbsolutePart - noteStartAbsolutePart;
				if (partsPassed > 0) {
					const chipWaveLength =
						Config.rawRawChipWaves[instrument.chipWave].samples.length - 1;
					customSampleNeedsPhaseRestore = true;
					customSamplePartsPassed = partsPassed;
					customSampleFirstOffset = instrument.chipWaveStartOffset / chipWaveLength;
				}
			}
		}
		tone.freshlyAllocated = false;

		for (let i: number = 0; i < Config.maxPitchOrOperatorCount; i++) {
			tone.phaseDeltas[i] = 0.0;
			tone.phaseDeltaScales[i] = 0.0;
			tone.operatorExpressions[i] = 0.0;
			tone.operatorExpressionDeltas[i] = 0.0;
		}
		tone.expression = 0.0;
		tone.expressionDelta = 0.0;
		for (
			let i: number = 0;
			i < (instrument.type === InstrumentType.fm6op ? 6 : Config.operatorCount);
			i++
		) {
			tone.operatorWaves[i] = getOperatorWave(
				instrument.operators[i].waveform,
				instrument.operators[i].pulseWidth,
			);
		}

		const intervalFadeResult = computeToneIntervalAndFade(
			released,
			shouldFadeOutFast,
			tone,
			currentPart,
			this.tick,
			transition.isSeamless,
			instrument.getFadeOutTicks(),
		);
		intervalStart = intervalFadeResult.intervalStart;
		intervalEnd = intervalFadeResult.intervalEnd;
		fadeExpressionStart = intervalFadeResult.fadeExpressionStart;
		fadeExpressionEnd = intervalFadeResult.fadeExpressionEnd;
		toneIsOnLastTick = intervalFadeResult.toneIsOnLastTick;

		// Side effects that require mutable tone:
		if (released) {
			// No tone mutations for released tones (reads only)
		} else if (tone.note == null) {
			tone.lastInterval = 0;
			tone.ticksSinceReleased = 0;
			tone.liveInputSamplesHeld += roundedSamplesPerTick;
		} else {
			tone.ticksSinceReleased = 0;
			tone.lastInterval = intervalEnd;
		}
		tone.isOnLastTick = toneIsOnLastTick;

		const tmpNoteFilter: FilterSettings = instrument.noteFilter;
		let startPoint: FilterControlPoint;
		let endPoint: FilterControlPoint;

		if (instrument.noteFilterType) {
			// Simple EQ filter (old style). For analysis, using random filters from normal style since they are N/A in this context.
			const noteFilterSettingsStart: FilterSettings = instrument.noteFilter;
			if (instrument.noteSubFilters[1] == null) {
				instrument.noteSubFilters[1] = new FilterSettings();
			}
			const noteFilterSettingsEnd: FilterSettings = instrument.noteSubFilters[1];

			// Change location based on slider values
			let startSimpleFreq: number = instrument.noteFilterSimpleCut;
			let startSimpleGain: number = instrument.noteFilterSimplePeak;
			let endSimpleFreq: number = instrument.noteFilterSimpleCut;
			let endSimpleGain: number = instrument.noteFilterSimplePeak;
			let filterChanges: boolean = false;

			if (
				this.isModActive(
					Config.modulators.dictionary["note filt cut"].index,
					channelIndex,
					tone.instrumentIndex,
				)
			) {
				startSimpleFreq = this.modState.getModValue(
					Config.modulators.dictionary["note filt cut"].index,
					channelIndex,
					tone.instrumentIndex,
					false,
				);
				endSimpleFreq = this.modState.getModValue(
					Config.modulators.dictionary["note filt cut"].index,
					channelIndex,
					tone.instrumentIndex,
					true,
				);
				filterChanges = true;
			}
			if (
				this.isModActive(
					Config.modulators.dictionary["note filt peak"].index,
					channelIndex,
					tone.instrumentIndex,
				)
			) {
				startSimpleGain = this.modState.getModValue(
					Config.modulators.dictionary["note filt peak"].index,
					channelIndex,
					tone.instrumentIndex,
					false,
				);
				endSimpleGain = this.modState.getModValue(
					Config.modulators.dictionary["note filt peak"].index,
					channelIndex,
					tone.instrumentIndex,
					true,
				);
				filterChanges = true;
			}

			noteFilterSettingsStart.convertLegacySettingsForSynth(
				startSimpleFreq,
				startSimpleGain,
				!filterChanges,
			);
			noteFilterSettingsEnd.convertLegacySettingsForSynth(
				endSimpleFreq,
				endSimpleGain,
				!filterChanges,
			);

			startPoint = noteFilterSettingsStart.controlPoints[0];
			endPoint = noteFilterSettingsEnd.controlPoints[0];

			// Temporarily override so that envelope computer uses appropriate computed note filter
			instrument.noteFilter = noteFilterSettingsStart;
			instrument.tmpNoteFilterStart = noteFilterSettingsStart;
		}

		// Compute envelopes *after* resetting the tone, otherwise the envelope computer gets reset too!
		const envelopeComputer: EnvelopeComputer = tone.envelopeComputer;
		const envelopeSpeeds: number[] = [];
		for (let i: number = 0; i < Config.maxEnvelopeCount; i++) {
			envelopeSpeeds[i] = 0;
		}
		for (
			let envelopeIndex: number = 0;
			envelopeIndex < instrument.envelopeCount;
			envelopeIndex++
		) {
			let perEnvelopeSpeed: number = instrument.envelopes[envelopeIndex].perEnvelopeSpeed;
			if (
				this.isModActive(
					Config.modulators.dictionary["individual envelope speed"].index,
					channelIndex,
					tone.instrumentIndex,
				) &&
				instrument.envelopes[envelopeIndex].tempEnvelopeSpeed != null
			) {
				perEnvelopeSpeed = instrument.envelopes[envelopeIndex].tempEnvelopeSpeed!;
			}
			let useEnvelopeSpeed: number =
				Config.arpSpeedScale[instrument.envelopeSpeed] * perEnvelopeSpeed;
			if (
				this.isModActive(
					Config.modulators.dictionary["envelope speed"].index,
					channelIndex,
					tone.instrumentIndex,
				)
			) {
				useEnvelopeSpeed = Math.max(
					0,
					Math.min(
						Config.arpSpeedScale.length - 1,
						this.modState.getModValue(
							Config.modulators.dictionary["envelope speed"].index,
							channelIndex,
							tone.instrumentIndex,
							false,
						),
					),
				);
				if (Number.isInteger(useEnvelopeSpeed)) {
					useEnvelopeSpeed = Config.arpSpeedScale[useEnvelopeSpeed] * perEnvelopeSpeed;
				} else {
					// Linear interpolate envelope values
					useEnvelopeSpeed =
						(1 - (useEnvelopeSpeed % 1)) *
							Config.arpSpeedScale[Math.floor(useEnvelopeSpeed)] +
						(useEnvelopeSpeed % 1) *
							Config.arpSpeedScale[Math.ceil(useEnvelopeSpeed)] *
							perEnvelopeSpeed;
				}
			}
			envelopeSpeeds[envelopeIndex] = useEnvelopeSpeed;
		}
		// the perTone envelopeComputer
		envelopeComputer.computeEnvelopes(
			instrument,
			currentPart,
			instrumentState.envelopeTime,
			Config.ticksPerPart * partTimeStart,
			samplesPerTick / this.samplesPerSecond,
			tone,
			envelopeSpeeds,
			instrumentState,
			this,
			channelIndex,
			tone.instrumentIndex,
			true,
		);
		const envelopeStarts: number[] = tone.envelopeComputer.envelopeStarts;
		const envelopeEnds: number[] = tone.envelopeComputer.envelopeEnds;
		instrument.noteFilter = tmpNoteFilter;
		if (transition.continues && (tone.prevNote == null || tone.note == null)) {
			instrumentState.envelopeComputer.reset();
		}

		{
			const slideResult = computeSlides(
				tone,
				transition.slides,
				chord.singleTone,
				envelopeComputer,
				intervalStart,
				intervalEnd,
				chordExpressionStart,
				chordExpressionEnd,
			);
			intervalStart = slideResult.intervalStart;
			intervalEnd = slideResult.intervalEnd;
			chordExpressionStart = slideResult.chordExpressionStart;
			chordExpressionEnd = slideResult.chordExpressionEnd;
		}

		if (effectsIncludePitchShift(instrument.effects)) {
			let pitchShift: number =
				Config.justIntonationSemitones[instrument.pitchShift] / intervalScale;
			let pitchShiftScalarStart: number = 1.0;
			let pitchShiftScalarEnd: number = 1.0;
			if (
				this.isModActive(
					Config.modulators.dictionary["pitch shift"].index,
					channelIndex,
					tone.instrumentIndex,
				)
			) {
				pitchShift =
					Config.justIntonationSemitones[Config.justIntonationSemitones.length - 1];
				pitchShiftScalarStart =
					this.modState.getModValue(
						Config.modulators.dictionary["pitch shift"].index,
						channelIndex,
						tone.instrumentIndex,
						false,
					) / Config.pitchShiftCenter;
				pitchShiftScalarEnd =
					this.modState.getModValue(
						Config.modulators.dictionary["pitch shift"].index,
						channelIndex,
						tone.instrumentIndex,
						true,
					) / Config.pitchShiftCenter;
			}
			const envelopeStart: number = envelopeStarts[EnvelopeComputeIndex.pitchShift];
			const envelopeEnd: number = envelopeEnds[EnvelopeComputeIndex.pitchShift];
			intervalStart += pitchShift * envelopeStart * pitchShiftScalarStart;
			intervalEnd += pitchShift * envelopeEnd * pitchShiftScalarEnd;
		}
		if (
			effectsIncludeDetune(instrument.effects) ||
			this.isModActive(
				Config.modulators.dictionary["song detune"].index,
				channelIndex,
				tone.instrumentIndex,
			)
		) {
			const envelopeStart: number = envelopeStarts[EnvelopeComputeIndex.detune];
			const envelopeEnd: number = envelopeEnds[EnvelopeComputeIndex.detune];
			let modDetuneStart: number = instrument.detune;
			let modDetuneEnd: number = instrument.detune;
			if (
				this.isModActive(
					Config.modulators.dictionary.detune.index,
					channelIndex,
					tone.instrumentIndex,
				)
			) {
				modDetuneStart =
					this.modState.getModValue(
						Config.modulators.dictionary.detune.index,
						channelIndex,
						tone.instrumentIndex,
						false,
					) + Config.detuneCenter;
				modDetuneEnd =
					this.modState.getModValue(
						Config.modulators.dictionary.detune.index,
						channelIndex,
						tone.instrumentIndex,
						true,
					) + Config.detuneCenter;
			}
			if (
				this.isModActive(
					Config.modulators.dictionary["song detune"].index,
					channelIndex,
					tone.instrumentIndex,
				)
			) {
				modDetuneStart +=
					4 *
					this.modState.getModValue(
						Config.modulators.dictionary["song detune"].index,
						channelIndex,
						tone.instrumentIndex,
						false,
					);
				modDetuneEnd +=
					4 *
					this.modState.getModValue(
						Config.modulators.dictionary["song detune"].index,
						channelIndex,
						tone.instrumentIndex,
						true,
					);
			}
			intervalStart +=
				(detuneToCents(modDetuneStart) * envelopeStart * Config.pitchesPerOctave) /
				(12.0 * 100.0);
			intervalEnd +=
				(detuneToCents(modDetuneEnd) * envelopeEnd * Config.pitchesPerOctave) /
				(12.0 * 100.0);
			// //envelopes should not affect song detune
		}

		if (effectsIncludeVibrato(instrument.effects)) {
			let delayTicks: number;
			let vibratoAmplitudeStart: number;
			let vibratoAmplitudeEnd: number;
			// Custom vibrato
			if (instrument.vibrato === Config.vibratos.length) {
				delayTicks = instrument.vibratoDelay * 2; // Delay was changed from parts to ticks in BB v9
				// Special case: if vibrato delay is max, NEVER vibrato.
				if (
					instrument.vibratoDelay ===
					Config.modulators.dictionary["vibrato delay"].maxRawVol
				) {
					delayTicks = Number.POSITIVE_INFINITY;
				}
				vibratoAmplitudeStart = instrument.vibratoDepth;
				vibratoAmplitudeEnd = vibratoAmplitudeStart;
			} else {
				delayTicks = Config.vibratos[instrument.vibrato].delayTicks;
				vibratoAmplitudeStart = Config.vibratos[instrument.vibrato].amplitude;
				vibratoAmplitudeEnd = vibratoAmplitudeStart;
			}

			if (
				this.isModActive(
					Config.modulators.dictionary["vibrato delay"].index,
					channelIndex,
					tone.instrumentIndex,
				)
			) {
				delayTicks =
					this.modState.getModValue(
						Config.modulators.dictionary["vibrato delay"].index,
						channelIndex,
						tone.instrumentIndex,
						false,
					) * 2; // Delay was changed from parts to ticks in BB v9
				if (delayTicks === Config.modulators.dictionary["vibrato delay"].maxRawVol * 2) {
					delayTicks = Number.POSITIVE_INFINITY;
				}
			}

			if (
				this.isModActive(
					Config.modulators.dictionary["vibrato depth"].index,
					channelIndex,
					tone.instrumentIndex,
				)
			) {
				vibratoAmplitudeStart =
					this.modState.getModValue(
						Config.modulators.dictionary["vibrato depth"].index,
						channelIndex,
						tone.instrumentIndex,
						false,
					) / 25;
				vibratoAmplitudeEnd =
					this.modState.getModValue(
						Config.modulators.dictionary["vibrato depth"].index,
						channelIndex,
						tone.instrumentIndex,
						true,
					) / 25;
			}

			// To maintain pitch continuity, (mostly for picked string which retriggers impulse
			// otherwise) remember the vibrato at the end of this run and reuse it at the start
			// of the next run if available.
			let vibratoStart: number;
			if (tone.prevVibrato != null) {
				vibratoStart = tone.prevVibrato;
			} else {
				const vibratoLfoStart: number = Synth.getLFOAmplitude(
					instrument,
					secondsPerPart * instrumentState.vibratoTime,
				);
				const vibratoDepthEnvelopeStart: number =
					envelopeStarts[EnvelopeComputeIndex.vibratoDepth];
				vibratoStart = vibratoAmplitudeStart * vibratoLfoStart * vibratoDepthEnvelopeStart;
				if (delayTicks > 0.0) {
					const ticksUntilVibratoStart: number =
						delayTicks - envelopeComputer.noteTicksStart;
					vibratoStart *= Math.max(
						0.0,
						Math.min(1.0, 1.0 - ticksUntilVibratoStart / 2.0),
					);
				}
			}

			const vibratoLfoEnd: number = Synth.getLFOAmplitude(
				instrument,
				secondsPerPart * instrumentState.nextVibratoTime,
			);
			const vibratoDepthEnvelopeEnd: number = envelopeEnds[EnvelopeComputeIndex.vibratoDepth];
			if (!getInstrumentCapability(instrument, "isMod")) {
				let vibratoEnd: number =
					vibratoAmplitudeEnd * vibratoLfoEnd * vibratoDepthEnvelopeEnd;
				if (delayTicks > 0.0) {
					const ticksUntilVibratoEnd: number = delayTicks - envelopeComputer.noteTicksEnd;
					vibratoEnd *= Math.max(0.0, Math.min(1.0, 1.0 - ticksUntilVibratoEnd / 2.0));
				}

				tone.prevVibrato = vibratoEnd;

				intervalStart += vibratoStart;
				intervalEnd += vibratoEnd;
			}
		}

		if ((!transition.isSeamless && !tone.forceContinueAtStart) || tone.prevNote == null) {
			// Fade in the beginning of the note.
			const fadeInSeconds: number = instrument.getFadeInSeconds();
			if (fadeInSeconds > 0.0) {
				fadeExpressionStart *= Math.min(
					1.0,
					envelopeComputer.noteSecondsStartUnscaled / fadeInSeconds,
				);
				fadeExpressionEnd *= Math.min(
					1.0,
					envelopeComputer.noteSecondsEndUnscaled / fadeInSeconds,
				);
			}
		}

		if (instrument.type === InstrumentType.drumset && tone.drumsetPitch == null) {
			// It's possible that the note will change while the user is editing it,
			// but the tone's pitches don't get updated because the tone has already
			// ended and is fading out. To avoid an array index out of bounds error, clamp the pitch.
			tone.drumsetPitch = tone.pitches[0];
			if (tone.note != null) tone.drumsetPitch += tone.note.pickMainInterval();
			tone.drumsetPitch = Math.max(0, Math.min(Config.drumCount - 1, tone.drumsetPitch));
		}

		let noteFilterExpression: number = envelopeComputer.lowpassCutoffDecayVolumeCompensation;
		if (!effectsIncludeNoteFilter(instrument.effects)) {
			tone.noteFilterCount = 0;
		} else {
			// Velocity→brightness tracking: scale note filter cutoff by velocity
			// (gated under noteRange effect via velocityTracking field, no new effect bit)
			let velBrightnessMult: number = 1.0;
			if (instrument.velocityTracking > 0 && tone.note != null) {
				const velNorm: number = tone.note.velocity / 127;
				// Maps velocity [1,127] → multiplier [0.5, 1.5] × velocityTracking amount
				velBrightnessMult = 1.0 + instrument.velocityTracking * (velNorm - 0.5);
			}

			const noteAllFreqsEnvelopeStart: number =
				envelopeStarts[EnvelopeComputeIndex.noteFilterAllFreqs] * velBrightnessMult;
			const noteAllFreqsEnvelopeEnd: number =
				envelopeEnds[EnvelopeComputeIndex.noteFilterAllFreqs] * velBrightnessMult;

			// Simple note filter
			if (instrument.noteFilterType) {
				const noteFreqEnvelopeStart: number =
					envelopeStarts[EnvelopeComputeIndex.noteFilterFreq0];
				const noteFreqEnvelopeEnd: number =
					envelopeEnds[EnvelopeComputeIndex.noteFilterFreq0];
				const notePeakEnvelopeStart: number =
					envelopeStarts[EnvelopeComputeIndex.noteFilterGain0];
				const notePeakEnvelopeEnd: number =
					envelopeEnds[EnvelopeComputeIndex.noteFilterGain0];

				startPoint!.toCoefficients(
					tempFilterStartCoefficients,
					this.samplesPerSecond,
					noteAllFreqsEnvelopeStart * noteFreqEnvelopeStart,
					notePeakEnvelopeStart,
				);
				endPoint!.toCoefficients(
					tempFilterEndCoefficients,
					this.samplesPerSecond,
					noteAllFreqsEnvelopeEnd * noteFreqEnvelopeEnd,
					notePeakEnvelopeEnd,
				);

				tone.noteFilters[0].loadCoefficientsWithGradient(
					tempFilterStartCoefficients,
					tempFilterEndCoefficients,
					1.0 / roundedSamplesPerTick,
					startPoint!.type === FilterType.lowPass,
				);
				noteFilterExpression *= startPoint!.getVolumeCompensationMult();

				tone.noteFilterCount = 1;
			} else {
				const noteFilterSettings: FilterSettings =
					instrument.tmpNoteFilterStart != null
						? instrument.tmpNoteFilterStart
						: instrument.noteFilter;

				for (let i: number = 0; i < noteFilterSettings.controlPointCount; i++) {
					const noteFreqEnvelopeStart: number =
						envelopeStarts[EnvelopeComputeIndex.noteFilterFreq0 + i];
					const noteFreqEnvelopeEnd: number =
						envelopeEnds[EnvelopeComputeIndex.noteFilterFreq0 + i];
					const notePeakEnvelopeStart: number =
						envelopeStarts[EnvelopeComputeIndex.noteFilterGain0 + i];
					const notePeakEnvelopeEnd: number =
						envelopeEnds[EnvelopeComputeIndex.noteFilterGain0 + i];
					let startPoint: FilterControlPoint = noteFilterSettings.controlPoints[i];
					const endPoint: FilterControlPoint =
						instrument.tmpNoteFilterEnd != null &&
						instrument.tmpNoteFilterEnd.controlPoints[i] != null
							? instrument.tmpNoteFilterEnd.controlPoints[i]
							: noteFilterSettings.controlPoints[i];

					// If switching dot type, do it all at once and do not try to interpolate since no valid interpolation exists.
					if (startPoint.type !== endPoint.type) {
						startPoint = endPoint;
					}

					startPoint.toCoefficients(
						tempFilterStartCoefficients,
						this.samplesPerSecond,
						noteAllFreqsEnvelopeStart * noteFreqEnvelopeStart,
						notePeakEnvelopeStart,
					);
					endPoint.toCoefficients(
						tempFilterEndCoefficients,
						this.samplesPerSecond,
						noteAllFreqsEnvelopeEnd * noteFreqEnvelopeEnd,
						notePeakEnvelopeEnd,
					);
					tone.noteFilters[i].loadCoefficientsWithGradient(
						tempFilterStartCoefficients,
						tempFilterEndCoefficients,
						1.0 / roundedSamplesPerTick,
						startPoint.type === FilterType.lowPass,
					);
					noteFilterExpression *= startPoint.getVolumeCompensationMult();
				}
				tone.noteFilterCount = noteFilterSettings.controlPointCount;
			}
		}

		if (instrument.type === InstrumentType.drumset) {
			const drumsetEnvelopeComputer: EnvelopeComputer = tone.envelopeComputer;

			const drumsetFilterEnvelope: Envelope = instrument.getDrumsetEnvelope(
				tone.drumsetPitch!,
			);

			// If the drumset lowpass cutoff decays, compensate by increasing expression.
			noteFilterExpression *=
				EnvelopeComputer.getLowpassCutoffDecayVolumeCompensation(drumsetFilterEnvelope);

			drumsetEnvelopeComputer.computeDrumsetEnvelopes(
				instrument,
				drumsetFilterEnvelope,
				beatsPerPart,
				partTimeStart,
				partTimeEnd,
			);

			const drumsetFilterEnvelopeStart = drumsetEnvelopeComputer.drumsetFilterEnvelopeStart;
			const drumsetFilterEnvelopeEnd = drumsetEnvelopeComputer.drumsetFilterEnvelopeEnd;

			const point: FilterControlPoint = this.tempDrumSetControlPoint;
			point.type = FilterType.lowPass;
			point.gain = FilterControlPoint.getRoundedSettingValueFromLinearGain(0.5);
			point.freq = FilterControlPoint.getRoundedSettingValueFromHz(8000.0);
			// Drumset envelopes warped to imitate the legacy simplified 2nd order lowpass at ~48000Hz.
			point.toCoefficients(
				tempFilterStartCoefficients,
				this.samplesPerSecond,
				drumsetFilterEnvelopeStart * (1.0 + drumsetFilterEnvelopeStart),
				1.0,
			);
			point.toCoefficients(
				tempFilterEndCoefficients,
				this.samplesPerSecond,
				drumsetFilterEnvelopeEnd * (1.0 + drumsetFilterEnvelopeEnd),
				1.0,
			);
			tone.noteFilters[tone.noteFilterCount].loadCoefficientsWithGradient(
				tempFilterStartCoefficients,
				tempFilterEndCoefficients,
				1.0 / roundedSamplesPerTick,
				true,
			);
			tone.noteFilterCount++;
		}

		noteFilterExpression = Math.min(3.0, noteFilterExpression);

		if (instrument.type === InstrumentType.fm || instrument.type === InstrumentType.fm6op) {
			// phase modulation!

			let sineExpressionBoost: number = 1.0;
			let totalCarrierExpression: number = 0.0;

			let arpeggioInterval: number = 0;
			const arpeggiates: boolean = chord.arpeggiates;
			const isMono: boolean = chord.name === "monophonic";
			if (tone.pitchCount > 1 && arpeggiates) {
				const arpeggio: number = Math.floor(
					instrumentState.arpTime / Config.ticksPerArpeggio,
				);
				arpeggioInterval =
					tone.pitches[
						getArpeggioPitchIndex(tone.pitchCount, instrument.fastTwoNoteArp, arpeggio)
					] - tone.pitches[0];
			}

			const carrierCount: number =
				instrument.type === InstrumentType.fm6op
					? instrument.customAlgorithm.carrierCount
					: Config.algorithms[instrument.algorithm].carrierCount;
			for (
				let i: number = 0;
				i < (instrument.type === InstrumentType.fm6op ? 6 : Config.operatorCount);
				i++
			) {
				const associatedCarrierIndex: number =
					instrument.type === InstrumentType.fm6op
						? instrument.customAlgorithm.associatedCarrier[i] - 1
						: Config.algorithms[instrument.algorithm].associatedCarrier[i] - 1;
				const pitch: number =
					tone.pitches[
						arpeggiates
							? 0
							: isMono
								? instrument.monoChordTone
								: i < tone.pitchCount
									? i
									: associatedCarrierIndex < tone.pitchCount
										? associatedCarrierIndex
										: 0
					];
				const freqMult = Config.operatorFrequencies[instrument.operators[i].frequency].mult;
				const interval =
					Config.operatorCarrierInterval[associatedCarrierIndex] + arpeggioInterval;
				const pitchStart: number =
					basePitch + (pitch + intervalStart) * intervalScale + interval;
				const pitchEnd: number =
					basePitch + (pitch + intervalEnd) * intervalScale + interval;
				const baseFreqStart: number = Instrument.frequencyFromPitch(pitchStart);
				const baseFreqEnd: number = Instrument.frequencyFromPitch(pitchEnd);
				const hzOffset: number =
					Config.operatorFrequencies[instrument.operators[i].frequency].hzOffset;
				const targetFreqStart: number = freqMult * baseFreqStart + hzOffset;
				const targetFreqEnd: number = freqMult * baseFreqEnd + hzOffset;

				const freqEnvelopeStart: number =
					envelopeStarts[EnvelopeComputeIndex.operatorFrequency0 + i];
				const freqEnvelopeEnd: number =
					envelopeEnds[EnvelopeComputeIndex.operatorFrequency0 + i];
				let freqStart: number;
				let freqEnd: number;
				if (freqEnvelopeStart !== 1.0 || freqEnvelopeEnd !== 1.0) {
					freqStart =
						2.0 ** (Math.log2(targetFreqStart / baseFreqStart) * freqEnvelopeStart) *
						baseFreqStart;
					freqEnd =
						2.0 ** (Math.log2(targetFreqEnd / baseFreqEnd) * freqEnvelopeEnd) *
						baseFreqEnd;
				} else {
					freqStart = targetFreqStart;
					freqEnd = targetFreqEnd;
				}
				tone.phaseDeltas[i] = freqStart * sampleTime;
				tone.phaseDeltaScales[i] = (freqEnd / freqStart) ** (1.0 / roundedSamplesPerTick);

				let amplitudeStart: number = instrument.operators[i].amplitude;
				let amplitudeEnd: number = instrument.operators[i].amplitude;
				if (i < 4) {
					if (
						this.isModActive(
							Config.modulators.dictionary["fm slider 1"].index + i,
							channelIndex,
							tone.instrumentIndex,
						)
					) {
						amplitudeStart *=
							this.modState.getModValue(
								Config.modulators.dictionary["fm slider 1"].index + i,
								channelIndex,
								tone.instrumentIndex,
								false,
							) / 15.0;
						amplitudeEnd *=
							this.modState.getModValue(
								Config.modulators.dictionary["fm slider 1"].index + i,
								channelIndex,
								tone.instrumentIndex,
								true,
							) / 15.0;
					}
				} else {
					if (
						this.isModActive(
							Config.modulators.dictionary["fm slider 5"].index + i - 4,
							channelIndex,
							tone.instrumentIndex,
						)
					) {
						amplitudeStart *=
							this.modState.getModValue(
								Config.modulators.dictionary["fm slider 5"].index + i - 4,
								channelIndex,
								tone.instrumentIndex,
								false,
							) / 15.0;
						amplitudeEnd *=
							this.modState.getModValue(
								Config.modulators.dictionary["fm slider 5"].index + i - 4,
								channelIndex,
								tone.instrumentIndex,
								true,
							) / 15.0;
					}
				}

				const amplitudeCurveStart: number = Synth.operatorAmplitudeCurve(amplitudeStart);
				const amplitudeCurveEnd: number = Synth.operatorAmplitudeCurve(amplitudeEnd);
				const amplitudeMultStart: number =
					amplitudeCurveStart *
					Config.operatorFrequencies[instrument.operators[i].frequency].amplitudeSign;
				const amplitudeMultEnd: number =
					amplitudeCurveEnd *
					Config.operatorFrequencies[instrument.operators[i].frequency].amplitudeSign;

				let expressionStart: number = amplitudeMultStart;
				let expressionEnd: number = amplitudeMultEnd;

				if (i < carrierCount) {
					// carrier
					let pitchExpressionStart: number;
					if (tone.prevPitchExpressions[i] != null) {
						pitchExpressionStart = tone.prevPitchExpressions[i]!;
					} else {
						pitchExpressionStart =
							2.0 ** (-(pitchStart - expressionReferencePitch) / pitchDamping);
					}
					const pitchExpressionEnd: number =
						2.0 ** (-(pitchEnd - expressionReferencePitch) / pitchDamping);
					tone.prevPitchExpressions[i] = pitchExpressionEnd;
					expressionStart *= pitchExpressionStart;
					expressionEnd *= pitchExpressionEnd;

					totalCarrierExpression += amplitudeCurveEnd;
				} else {
					// modulator
					expressionStart *= Config.sineWaveLength * 1.5;
					expressionEnd *= Config.sineWaveLength * 1.5;

					sineExpressionBoost *=
						1.0 - Math.min(1.0, instrument.operators[i].amplitude / 15);
				}

				expressionStart *= envelopeStarts[EnvelopeComputeIndex.operatorAmplitude0 + i];
				expressionEnd *= envelopeEnds[EnvelopeComputeIndex.operatorAmplitude0 + i];

				// Check for mod-related volume delta
				// @jummbus - This amplification is also applied to modulator FM operators which distorts the sound.
				// The fix is to apply this only to carriers, but as this is a legacy bug and it can cause some interesting sounds, it's left in.
				// You can use the mix volume modulator instead to avoid this effect.

				if (
					this.isModActive(
						Config.modulators.dictionary["note volume"].index,
						channelIndex,
						tone.instrumentIndex,
					)
				) {
					// Linear falloff below 0, normal volume formula above 0. Seems to work best for scaling since the normal volume mult formula has a big gap from -25 to -24.
					const startVal: number = this.modState.getModValue(
						Config.modulators.dictionary["note volume"].index,
						channelIndex,
						tone.instrumentIndex,
						false,
					);
					const endVal: number = this.modState.getModValue(
						Config.modulators.dictionary["note volume"].index,
						channelIndex,
						tone.instrumentIndex,
						true,
					);
					expressionStart *=
						startVal <= 0
							? (startVal + Config.volumeRange / 2) / (Config.volumeRange / 2)
							: instrumentVolumeToVolumeMult(startVal);
					expressionEnd *=
						endVal <= 0
							? (endVal + Config.volumeRange / 2) / (Config.volumeRange / 2)
							: instrumentVolumeToVolumeMult(endVal);
				}

				tone.operatorExpressions[i] = expressionStart;
				tone.operatorExpressionDeltas[i] =
					(expressionEnd - expressionStart) / roundedSamplesPerTick;
			}

			sineExpressionBoost *=
				(2.0 ** (2.0 - (1.4 * instrument.feedbackAmplitude) / 15.0) - 1.0) / 3.0;
			sineExpressionBoost *=
				1.0 - Math.min(1.0, Math.max(0.0, totalCarrierExpression - 1) / 2.0);
			sineExpressionBoost = 1.0 + sineExpressionBoost * 3.0;
			let expressionStart: number =
				baseExpression *
				sineExpressionBoost *
				noteFilterExpression *
				fadeExpressionStart *
				chordExpressionStart *
				envelopeStarts[EnvelopeComputeIndex.noteVolume];
			let expressionEnd: number =
				baseExpression *
				sineExpressionBoost *
				noteFilterExpression *
				fadeExpressionEnd *
				chordExpressionEnd *
				envelopeEnds[EnvelopeComputeIndex.noteVolume];
			if (isMono && tone.pitchCount <= instrument.monoChordTone) {
				// silence if tone doesn't exist
				expressionStart = 0;
				expressionEnd = 0;
			}
			tone.expression = expressionStart;
			tone.expressionDelta = (expressionEnd - expressionStart) / roundedSamplesPerTick;

			let useFeedbackAmplitudeStart: number = instrument.feedbackAmplitude;
			let useFeedbackAmplitudeEnd: number = instrument.feedbackAmplitude;
			if (
				this.isModActive(
					Config.modulators.dictionary["fm feedback"].index,
					channelIndex,
					tone.instrumentIndex,
				)
			) {
				useFeedbackAmplitudeStart *=
					this.modState.getModValue(
						Config.modulators.dictionary["fm feedback"].index,
						channelIndex,
						tone.instrumentIndex,
						false,
					) / 15.0;
				useFeedbackAmplitudeEnd *=
					this.modState.getModValue(
						Config.modulators.dictionary["fm feedback"].index,
						channelIndex,
						tone.instrumentIndex,
						true,
					) / 15.0;
			}

			const feedbackAmplitudeStart: number =
				(Config.sineWaveLength * 0.3 * useFeedbackAmplitudeStart) / 15.0;
			const feedbackAmplitudeEnd: number =
				(Config.sineWaveLength * 0.3 * useFeedbackAmplitudeEnd) / 15.0;

			const feedbackStart: number =
				feedbackAmplitudeStart * envelopeStarts[EnvelopeComputeIndex.feedbackAmplitude];
			const feedbackEnd: number =
				feedbackAmplitudeEnd * envelopeEnds[EnvelopeComputeIndex.feedbackAmplitude];
			tone.feedbackMult = feedbackStart;
			tone.feedbackDelta = (feedbackEnd - feedbackStart) / roundedSamplesPerTick;
		} else {
			const freqEndRatio: number =
				2.0 ** (((intervalEnd - intervalStart) * intervalScale) / 12.0);
			const basePhaseDeltaScale: number = freqEndRatio ** (1.0 / roundedSamplesPerTick);
			const isMono: boolean = chord.name === "monophonic";

			let pitch: number = tone.pitches[0];
			if (tone.pitchCount > 1 && (chord.arpeggiates || chord.customInterval || isMono)) {
				const arpeggio: number = Math.floor(
					instrumentState.arpTime / Config.ticksPerArpeggio,
				);
				if (chord.customInterval) {
					const intervalOffset: number =
						tone.pitches[
							1 +
								getArpeggioPitchIndex(
									tone.pitchCount - 1,
									instrument.fastTwoNoteArp,
									arpeggio,
								)
						] - tone.pitches[0];
					specialIntervalMult = 2.0 ** (intervalOffset / 12.0);
					tone.specialIntervalExpressionMult = 2.0 ** (-intervalOffset / pitchDamping);
				} else if (chord.arpeggiates) {
					pitch =
						tone.pitches[
							getArpeggioPitchIndex(
								tone.pitchCount,
								instrument.fastTwoNoteArp,
								arpeggio,
							)
						];
				} else {
					pitch = tone.pitches[instrument.monoChordTone];
				}
			}

			const startPitch: number = basePitch + (pitch + intervalStart) * intervalScale;
			const endPitch: number = basePitch + (pitch + intervalEnd) * intervalScale;
			let pitchExpressionStart: number;
			// TODO: use the second element of prevPitchExpressions for the unison voice, compute a separate expression delta for it.
			if (tone.prevPitchExpressions[0] != null) {
				pitchExpressionStart = tone.prevPitchExpressions[0]!;
			} else {
				pitchExpressionStart =
					2.0 ** (-(startPitch - expressionReferencePitch) / pitchDamping);
			}
			const pitchExpressionEnd: number =
				2.0 ** (-(endPitch - expressionReferencePitch) / pitchDamping);
			tone.prevPitchExpressions[0] = pitchExpressionEnd;
			let settingsExpressionMult: number = baseExpression * noteFilterExpression;

			if (instrument.type === InstrumentType.noise) {
				settingsExpressionMult *= Config.chipNoises[instrument.chipNoise].expression;
			}
			if (instrument.type === InstrumentType.chip) {
				settingsExpressionMult *= Config.chipWaves[instrument.chipWave].expression;
			}
			if (instrument.type === InstrumentType.pwm) {
				const basePulseWidth: number = getPulseWidthRatio(instrument.pulseWidth);

				// Check for PWM mods to this instrument
				let pulseWidthModStart: number = basePulseWidth;
				let pulseWidthModEnd: number = basePulseWidth;
				if (
					this.isModActive(
						Config.modulators.dictionary["pulse width"].index,
						channelIndex,
						tone.instrumentIndex,
					)
				) {
					pulseWidthModStart =
						this.modState.getModValue(
							Config.modulators.dictionary["pulse width"].index,
							channelIndex,
							tone.instrumentIndex,
							false,
						) /
						(Config.pulseWidthRange * 2);
					pulseWidthModEnd =
						this.modState.getModValue(
							Config.modulators.dictionary["pulse width"].index,
							channelIndex,
							tone.instrumentIndex,
							true,
						) /
						(Config.pulseWidthRange * 2);
				}

				const pulseWidthStart: number =
					pulseWidthModStart * envelopeStarts[EnvelopeComputeIndex.pulseWidth];
				const pulseWidthEnd: number =
					pulseWidthModEnd * envelopeEnds[EnvelopeComputeIndex.pulseWidth];
				tone.pulseWidth = pulseWidthStart;
				tone.pulseWidthDelta = (pulseWidthEnd - pulseWidthStart) / roundedSamplesPerTick;

				// decimal offset mods
				let decimalOffsetModStart: number = instrument.decimalOffset;
				if (
					this.isModActive(
						Config.modulators.dictionary["decimal offset"].index,
						channelIndex,
						tone.instrumentIndex,
					)
				) {
					decimalOffsetModStart = this.modState.getModValue(
						Config.modulators.dictionary["decimal offset"].index,
						channelIndex,
						tone.instrumentIndex,
						false,
					);
				}

				const decimalOffsetStart: number =
					decimalOffsetModStart * envelopeStarts[EnvelopeComputeIndex.decimalOffset];
				tone.decimalOffset = decimalOffsetStart;

				tone.pulseWidth -= tone.decimalOffset / 10000;
			}
			if (instrument.type === InstrumentType.pickedString) {
				// Check for sustain mods
				let useSustainStart: number = instrument.stringSustain;
				let useSustainEnd: number = instrument.stringSustain;
				if (
					this.isModActive(
						Config.modulators.dictionary.sustain.index,
						channelIndex,
						tone.instrumentIndex,
					)
				) {
					useSustainStart = this.modState.getModValue(
						Config.modulators.dictionary.sustain.index,
						channelIndex,
						tone.instrumentIndex,
						false,
					);
					useSustainEnd = this.modState.getModValue(
						Config.modulators.dictionary.sustain.index,
						channelIndex,
						tone.instrumentIndex,
						true,
					);
				}

				tone.stringSustainStart = useSustainStart;
				tone.stringSustainEnd = useSustainEnd;

				// Increase expression to compensate for string decay.
				settingsExpressionMult *=
					2.0 ** (0.7 * (1.0 - useSustainStart / (Config.stringSustainRange - 1)));
			}

			const startFreq: number = Instrument.frequencyFromPitch(startPitch);
			if (getInstrumentCapability(instrument, "hasUnison")) {
				const unisonVoices: number = instrument.unisonVoices;
				const unisonSpread: number = instrument.unisonSpread;
				const unisonOffset: number = instrument.unisonOffset;
				const unisonExpression: number = instrument.unisonExpression;
				const voiceCountExpression: number =
					instrument.type === InstrumentType.pickedString ? 1 : unisonVoices / 2.0;
				settingsExpressionMult *= unisonExpression * voiceCountExpression;
				const unisonEnvelopeStart = envelopeStarts[EnvelopeComputeIndex.unison];
				const unisonEnvelopeEnd = envelopeEnds[EnvelopeComputeIndex.unison];
				const unisonStartA: number =
					2.0 ** (((unisonOffset + unisonSpread) * unisonEnvelopeStart) / 12.0);
				const unisonEndA: number =
					2.0 ** (((unisonOffset + unisonSpread) * unisonEnvelopeEnd) / 12.0);
				tone.phaseDeltas[0] = startFreq * sampleTime * unisonStartA;
				tone.phaseDeltaScales[0] =
					basePhaseDeltaScale *
					(unisonEndA / unisonStartA) ** (1.0 / roundedSamplesPerTick);
				const divisor = unisonVoices === 1 ? 1 : unisonVoices - 1;
				for (let i: number = 1; i <= unisonVoices; i++) {
					const unisonStart: number =
						2.0 **
							(((unisonOffset + unisonSpread - (2 * i * unisonSpread) / divisor) *
								unisonEnvelopeStart) /
								12.0) *
						specialIntervalMult;
					const unisonEnd: number =
						2.0 **
							(((unisonOffset + unisonSpread - (2 * i * unisonSpread) / divisor) *
								unisonEnvelopeEnd) /
								12.0) *
						specialIntervalMult;
					tone.phaseDeltas[i] = startFreq * sampleTime * unisonStart;
					tone.phaseDeltaScales[i] =
						basePhaseDeltaScale *
						(unisonEnd / unisonStart) ** (1.0 / roundedSamplesPerTick);
				}
				for (let i: number = unisonVoices + 1; i < Config.unisonVoicesMax; i++) {
					if (i === 2) {
						const unisonBStart: number =
							2.0 ** (((unisonOffset - unisonSpread) * unisonEnvelopeStart) / 12.0) *
							specialIntervalMult;
						const unisonBEnd: number =
							2.0 ** (((unisonOffset - unisonSpread) * unisonEnvelopeEnd) / 12.0) *
							specialIntervalMult;
						tone.phaseDeltas[i] = startFreq * sampleTime * unisonBStart;
						tone.phaseDeltaScales[i] =
							basePhaseDeltaScale *
							(unisonBEnd / unisonBStart) ** (1.0 / roundedSamplesPerTick);
					} else {
						tone.phaseDeltas[i] = tone.phaseDeltas[0];
						tone.phaseDeltaScales[i] = tone.phaseDeltaScales[0];
					}
				}
			} else if (instrument.type === InstrumentType.supersaw) {
				const unisonVoices: number = instrument.unisonVoices;
				const unisonSpread: number = instrument.unisonSpread;
				const unisonOffset: number = instrument.unisonOffset;
				const unisonEnvelopeStart = envelopeStarts[EnvelopeComputeIndex.unison];
				const unisonEnvelopeEnd = envelopeEnds[EnvelopeComputeIndex.unison];

				const unisonStartA: number =
					2.0 ** (((unisonOffset + unisonSpread) * unisonEnvelopeStart) / 12.0);
				const unisonEndA: number =
					2.0 ** (((unisonOffset + unisonSpread) * unisonEnvelopeEnd) / 12.0);
				tone.phaseDeltas[0] = startFreq * sampleTime * unisonStartA;
				tone.phaseDeltaScales[0] =
					basePhaseDeltaScale *
					(unisonEndA / unisonStartA) ** (1.0 / roundedSamplesPerTick);

				const divisor = unisonVoices === 1 ? 1 : unisonVoices - 1;
				for (let voice: number = 1; voice < unisonVoices; voice++) {
					const unisonStart: number =
						2.0 **
							(((unisonOffset + unisonSpread - (2 * voice * unisonSpread) / divisor) *
								unisonEnvelopeStart) /
								12.0) *
						specialIntervalMult;
					const unisonEnd: number =
						2.0 **
							(((unisonOffset + unisonSpread - (2 * voice * unisonSpread) / divisor) *
								unisonEnvelopeEnd) /
								12.0) *
						specialIntervalMult;
					tone.phaseDeltas[voice] = startFreq * sampleTime * unisonStart;
					tone.phaseDeltaScales[voice] =
						basePhaseDeltaScale *
						(unisonEnd / unisonStart) ** (1.0 / roundedSamplesPerTick);
				}
			} else {
				tone.phaseDeltas[0] = startFreq * sampleTime;
				tone.phaseDeltaScales[0] = basePhaseDeltaScale;
			}
			if (customSampleNeedsPhaseRestore) {
				const _el = customSamplePartsPassed * Config.ticksPerPart * samplesPerTick;
				for (let i = 0; i < Config.maxPitchOrOperatorCount; i++) {
					if (tone.phaseDeltas[i] > 0) {
						tone.phases[i] =
							(customSampleFirstOffset + _el * tone.phaseDeltas[i]) % 1.0;
					}
				}
			}
			// TODO: make expressionStart and expressionEnd variables earlier and modify those
			// instead of these supersawExpression variables.
			let supersawExpressionStart: number = 1.0;
			let supersawExpressionEnd: number = 1.0;
			if (instrument.type === InstrumentType.supersaw) {
				supersawExpressionStart =
					(instrument.unisonExpression * instrument.unisonVoices) / 1.4;
				supersawExpressionEnd =
					(instrument.unisonExpression * instrument.unisonVoices) / 1.4;
				const minFirstVoiceAmplitude: number = 1.0 / Math.sqrt(Config.supersawVoiceCount);

				// Dynamism mods
				let useDynamismStart: number =
					instrument.supersawDynamism / Config.supersawDynamismMax;
				let useDynamismEnd: number =
					instrument.supersawDynamism / Config.supersawDynamismMax;
				if (
					this.isModActive(
						Config.modulators.dictionary.dynamism.index,
						channelIndex,
						tone.instrumentIndex,
					)
				) {
					useDynamismStart =
						this.modState.getModValue(
							Config.modulators.dictionary.dynamism.index,
							channelIndex,
							tone.instrumentIndex,
							false,
						) / Config.supersawDynamismMax;
					useDynamismEnd =
						this.modState.getModValue(
							Config.modulators.dictionary.dynamism.index,
							channelIndex,
							tone.instrumentIndex,
							true,
						) / Config.supersawDynamismMax;
				}

				const curvedDynamismStart: number =
					1.0 -
					Math.max(
						0.0,
						1.0 -
							useDynamismStart *
								envelopeStarts[EnvelopeComputeIndex.supersawDynamism],
					) **
						0.2;
				const curvedDynamismEnd: number =
					1.0 -
					Math.max(
						0.0,
						1.0 - useDynamismEnd * envelopeEnds[EnvelopeComputeIndex.supersawDynamism],
					) **
						0.2;
				const firstVoiceAmplitudeStart: number =
					2.0 ** (Math.log2(minFirstVoiceAmplitude) * curvedDynamismStart);
				const firstVoiceAmplitudeEnd: number =
					2.0 ** (Math.log2(minFirstVoiceAmplitude) * curvedDynamismEnd);

				const dynamismStart: number = Math.sqrt(
					(1.0 / firstVoiceAmplitudeStart ** 2.0 - 1.0) /
						(Config.supersawVoiceCount - 1.0),
				);
				const dynamismEnd: number = Math.sqrt(
					(1.0 / firstVoiceAmplitudeEnd ** 2.0 - 1.0) / (Config.supersawVoiceCount - 1.0),
				);
				tone.supersawDynamism = dynamismStart;
				tone.supersawDynamismDelta = (dynamismEnd - dynamismStart) / roundedSamplesPerTick;

				const initializeSupersaw: boolean = tone.supersawDelayIndex === -1;
				if (initializeSupersaw || !instrumentState.unisonInitialized) {
					// Goal: generate sawtooth phases such that the combined initial amplitude
					// cancel out to minimize pop. Algorithm: generate sorted phases, iterate over
					// their sawtooth drop points to find a combined zero crossing, then offset the
					// phases so they start there.

					// Generate random phases in ascending order by adding positive randomly
					// sized gaps between adjacent phases. For a proper distribution of random
					// events, the gaps sizes should be an "exponential distribution", which is
					// just: -Math.log(Math.random()). At the end, normalize the phases to a 0-1
					// range by dividing by the final value of the accumulator.
					const voiceCount: number = false
						? Config.supersawVoiceCount * Config.unisonVoicesMax
						: Config.supersawVoiceCount;

					let accumulator: number = 0.0;
					for (let i: number = 0; i < voiceCount; i++) {
						tone.phases[i] = accumulator;
						accumulator += -Math.log(Math.random());
					}

					const amplitudeSum: number = 1.0 + (voiceCount - 1.0) * dynamismStart;
					const slope: number = amplitudeSum;

					// Find the initial amplitude of the sum of sawtooths with the normalized
					// set of phases.
					let sample: number = 0.0;
					for (let i: number = 0; i < voiceCount; i++) {
						const amplitude: number = i === 0 ? 1.0 : dynamismStart;
						const normalizedPhase: number = tone.phases[i] / accumulator;
						tone.phases[i] = normalizedPhase;
						sample += (normalizedPhase - 0.5) * amplitude;
					}

					// Find the phase of the zero crossing of the sum of the sawtooths. You can
					// use a constant slope and the distance between sawtooth drops to determine if
					// the zero crossing occurs between them. Note that a small phase means that
					// the corresponding drop for that wave is far away, and a big phase means the
					// drop is nearby, so to iterate forward through the drops we iterate backward
					// through the phases.
					let zeroCrossingPhase: number = 1.0;
					let prevDrop: number = 0.0;
					for (let i: number = voiceCount - 1; i >= 0; i--) {
						const nextDrop: number = 1.0 - tone.phases[i];
						const phaseDelta: number = nextDrop - prevDrop;
						if (sample < 0.0) {
							const distanceToZeroCrossing: number = -sample / slope;
							if (distanceToZeroCrossing < phaseDelta) {
								zeroCrossingPhase = prevDrop + distanceToZeroCrossing;
								break;
							}
						}
						const amplitude: number = i === 0 ? 1.0 : dynamismStart;
						sample += phaseDelta * slope - amplitude;
						prevDrop = nextDrop;
					}
					for (let i: number = 0; i < voiceCount; i++) {
						tone.phases[i] += zeroCrossingPhase;
					}

					// Randomize the (initially sorted) order of the phases (aside from the
					// first one) so that they don't correlate to the detunes that are also
					// based on index.
					for (let i: number = 1; i < voiceCount - 1; i++) {
						const swappedIndex: number =
							i + Math.floor(Math.random() * (voiceCount - i));
						const temp: number = tone.phases[i];
						tone.phases[i] = tone.phases[swappedIndex];
						tone.phases[swappedIndex] = temp;
					}
					instrumentState.unisonInitialized = true;
				}

				const baseSpreadSlider: number =
					instrument.supersawSpread / Config.supersawSpreadMax;
				// Spread mods
				let useSpreadStart: number = baseSpreadSlider;
				let useSpreadEnd: number = baseSpreadSlider;
				if (
					this.isModActive(
						Config.modulators.dictionary.spread.index,
						channelIndex,
						tone.instrumentIndex,
					)
				) {
					useSpreadStart =
						this.modState.getModValue(
							Config.modulators.dictionary.spread.index,
							channelIndex,
							tone.instrumentIndex,
							false,
						) / Config.supersawSpreadMax;
					useSpreadEnd =
						this.modState.getModValue(
							Config.modulators.dictionary.spread.index,
							channelIndex,
							tone.instrumentIndex,
							true,
						) / Config.supersawSpreadMax;
				}

				// clamp the spread values to prevent negative ones polluting the output
				useSpreadStart = Math.max(0, useSpreadStart);
				useSpreadEnd = Math.max(0, useSpreadEnd);

				const spreadSliderStart: number =
					useSpreadStart * envelopeStarts[EnvelopeComputeIndex.supersawSpread];
				const spreadSliderEnd: number =
					useSpreadEnd * envelopeEnds[EnvelopeComputeIndex.supersawSpread];
				// Just use the average detune for the current tick in the below loop.
				const averageSpreadSlider: number = (spreadSliderStart + spreadSliderEnd) * 0.5;
				const curvedSpread: number =
					(1.0 - Math.sqrt(Math.max(0.0, 1.0 - averageSpreadSlider))) ** 1.75;
				for (let i = 0; i < Config.supersawVoiceCount; i++) {
					// Spread out the detunes around the center;
					const offset: number =
						i === 0
							? 0.0
							: ((((i + 1) >> 1) - 0.5 + 0.025 * ((i & 2) - 1)) /
									(Config.supersawVoiceCount >> 1)) **
									1.1 *
								((i & 1) * 2 - 1);
					tone.supersawUnisonDetunes[i] = 2.0 ** ((curvedSpread * offset) / 12.0);
				}

				const baseShape: number = instrument.supersawShape / Config.supersawShapeMax;
				// Saw shape mods
				let useShapeStart: number =
					baseShape * envelopeStarts[EnvelopeComputeIndex.supersawShape];
				let useShapeEnd: number =
					baseShape * envelopeEnds[EnvelopeComputeIndex.supersawShape];
				if (
					this.isModActive(
						Config.modulators.dictionary["saw shape"].index,
						channelIndex,
						tone.instrumentIndex,
					)
				) {
					useShapeStart =
						this.modState.getModValue(
							Config.modulators.dictionary["saw shape"].index,
							channelIndex,
							tone.instrumentIndex,
							false,
						) / Config.supersawShapeMax;
					useShapeEnd =
						this.modState.getModValue(
							Config.modulators.dictionary["saw shape"].index,
							channelIndex,
							tone.instrumentIndex,
							true,
						) / Config.supersawShapeMax;
				}

				const shapeStart: number =
					useShapeStart * envelopeStarts[EnvelopeComputeIndex.supersawShape];
				const shapeEnd: number =
					useShapeEnd * envelopeEnds[EnvelopeComputeIndex.supersawShape];
				tone.supersawShape = shapeStart;
				tone.supersawShapeDelta = (shapeEnd - shapeStart) / roundedSamplesPerTick;

				// decimal offset mods
				let decimalOffsetModStart: number = instrument.decimalOffset;
				if (
					this.isModActive(
						Config.modulators.dictionary["decimal offset"].index,
						channelIndex,
						tone.instrumentIndex,
					)
				) {
					decimalOffsetModStart = this.modState.getModValue(
						Config.modulators.dictionary["decimal offset"].index,
						channelIndex,
						tone.instrumentIndex,
						false,
					);
				}

				const decimalOffsetStart: number =
					decimalOffsetModStart * envelopeStarts[EnvelopeComputeIndex.decimalOffset];
				// ...is including tone.decimalOffset still necessary?
				tone.decimalOffset = decimalOffsetStart;

				const basePulseWidth: number = getPulseWidthRatio(instrument.pulseWidth);

				// Check for PWM mods to this instrument
				let pulseWidthModStart: number = basePulseWidth;
				let pulseWidthModEnd: number = basePulseWidth;
				if (
					this.isModActive(
						Config.modulators.dictionary["pulse width"].index,
						channelIndex,
						tone.instrumentIndex,
					)
				) {
					pulseWidthModStart =
						this.modState.getModValue(
							Config.modulators.dictionary["pulse width"].index,
							channelIndex,
							tone.instrumentIndex,
							false,
						) /
						(Config.pulseWidthRange * 2);
					pulseWidthModEnd =
						this.modState.getModValue(
							Config.modulators.dictionary["pulse width"].index,
							channelIndex,
							tone.instrumentIndex,
							true,
						) /
						(Config.pulseWidthRange * 2);
				}

				let pulseWidthStart: number =
					pulseWidthModStart * envelopeStarts[EnvelopeComputeIndex.pulseWidth];
				let pulseWidthEnd: number =
					pulseWidthModEnd * envelopeEnds[EnvelopeComputeIndex.pulseWidth];
				pulseWidthStart -= decimalOffsetStart / 10000;
				pulseWidthEnd -= decimalOffsetStart / 10000;
				const phaseDeltaStart: number =
					tone.supersawPrevPhaseDelta != null
						? tone.supersawPrevPhaseDelta
						: startFreq * sampleTime;
				const phaseDeltaEnd: number = startFreq * sampleTime * freqEndRatio;
				tone.supersawPrevPhaseDelta = phaseDeltaEnd;
				const delayLengthStart = pulseWidthStart / phaseDeltaStart;
				const delayLengthEnd = pulseWidthEnd / phaseDeltaEnd;
				tone.supersawDelayLength = delayLengthStart;
				tone.supersawDelayLengthDelta =
					(delayLengthEnd - delayLengthStart) / roundedSamplesPerTick;
				const minBufferLength: number =
					Math.ceil(Math.max(delayLengthStart, delayLengthEnd)) + 2;

				if (
					tone.supersawDelayLine == null ||
					tone.supersawDelayLine.length <= minBufferLength
				) {
					// The delay line buffer will get reused for other tones so might as well
					// start off with a buffer size that is big enough for most notes.
					const likelyMaximumLength: number = Math.ceil(
						(0.5 * this.samplesPerSecond) / Instrument.frequencyFromPitch(24),
					);
					const newDelayLine: Float32Array = new Float32Array(
						fittingPowerOfTwo(Math.max(likelyMaximumLength, minBufferLength)),
					);
					if (!initializeSupersaw && tone.supersawDelayLine != null) {
						// If the tone has already started but the buffer needs to be reallocated,
						// transfer the old data to the new buffer.
						const oldDelayBufferMask: number = (tone.supersawDelayLine.length - 1) >> 0;
						const startCopyingFromIndex: number = tone.supersawDelayIndex;
						for (let i: number = 0; i < tone.supersawDelayLine.length; i++) {
							newDelayLine[i] =
								tone.supersawDelayLine[
									(startCopyingFromIndex + i) & oldDelayBufferMask
								];
						}
					}
					tone.supersawDelayLine = newDelayLine;
					tone.supersawDelayIndex = tone.supersawDelayLine.length;
				} else if (initializeSupersaw) {
					tone.supersawDelayLine.fill(0.0);
					tone.supersawDelayIndex = tone.supersawDelayLine.length;
				}

				const pulseExpressionRatio: number =
					Config.pwmBaseExpression / Config.supersawBaseExpression;
				supersawExpressionStart *=
					(1.0 + (pulseExpressionRatio - 1.0) * shapeStart) /
					Math.sqrt(
						1.0 + (Config.supersawVoiceCount - 1.0) * dynamismStart * dynamismStart,
					);
				supersawExpressionEnd *=
					(1.0 + (pulseExpressionRatio - 1.0) * shapeEnd) /
					Math.sqrt(1.0 + (Config.supersawVoiceCount - 1.0) * dynamismEnd * dynamismEnd);
			}

			let expressionStart: number =
				settingsExpressionMult *
				fadeExpressionStart *
				chordExpressionStart *
				pitchExpressionStart *
				envelopeStarts[EnvelopeComputeIndex.noteVolume] *
				supersawExpressionStart;
			let expressionEnd: number =
				settingsExpressionMult *
				fadeExpressionEnd *
				chordExpressionEnd *
				pitchExpressionEnd *
				envelopeEnds[EnvelopeComputeIndex.noteVolume] *
				supersawExpressionEnd;

			// Check for mod-related volume delta
			if (
				this.isModActive(
					Config.modulators.dictionary["note volume"].index,
					channelIndex,
					tone.instrumentIndex,
				)
			) {
				// Linear falloff below 0, normal volume formula above 0. Seems to work best for scaling since the normal volume mult formula has a big gap from -25 to -24.
				const startVal: number = this.modState.getModValue(
					Config.modulators.dictionary["note volume"].index,
					channelIndex,
					tone.instrumentIndex,
					false,
				);
				const endVal: number = this.modState.getModValue(
					Config.modulators.dictionary["note volume"].index,
					channelIndex,
					tone.instrumentIndex,
					true,
				);
				expressionStart *=
					startVal <= 0
						? (startVal + Config.volumeRange / 2) / (Config.volumeRange / 2)
						: instrumentVolumeToVolumeMult(startVal);
				expressionEnd *=
					endVal <= 0
						? (endVal + Config.volumeRange / 2) / (Config.volumeRange / 2)
						: instrumentVolumeToVolumeMult(endVal);
			}
			if (isMono && tone.pitchCount <= instrument.monoChordTone) {
				// silence if tone doesn't exist
				expressionStart = 0;
				expressionEnd = 0;
				instrumentState.awake = false;
			}

			tone.expression = expressionStart;
			tone.expressionDelta = (expressionEnd - expressionStart) / roundedSamplesPerTick;

			if (instrument.type === InstrumentType.pickedString) {
				let stringDecayStart: number;
				if (tone.prevStringDecay != null) {
					stringDecayStart = tone.prevStringDecay;
				} else {
					const sustainEnvelopeStart: number =
						tone.envelopeComputer.envelopeStarts[EnvelopeComputeIndex.stringSustain];
					stringDecayStart =
						1.0 -
						Math.min(
							1.0,
							(sustainEnvelopeStart * tone.stringSustainStart) /
								(Config.stringSustainRange - 1),
						);
				}
				const sustainEnvelopeEnd: number =
					tone.envelopeComputer.envelopeEnds[EnvelopeComputeIndex.stringSustain];
				const stringDecayEnd: number =
					1.0 -
					Math.min(
						1.0,
						(sustainEnvelopeEnd * tone.stringSustainEnd) /
							(Config.stringSustainRange - 1),
					);
				tone.prevStringDecay = stringDecayEnd;

				const unisonVoices: number = instrument.unisonVoices;
				for (let i: number = tone.pickedStrings.length; i < unisonVoices; i++) {
					tone.pickedStrings[i] = new PickedString();
				}

				if (tone.atNoteStart && !transition.continues && !tone.forceContinueAtStart) {
					for (const pickedString of tone.pickedStrings) {
						// Force the picked string to retrigger the attack impulse at the start of the note.
						pickedString.delayIndex = -1;
					}
				}

				for (let i: number = 0; i < unisonVoices; i++) {
					tone.pickedStrings[i].update(
						this,
						instrumentState,
						tone,
						i,
						roundedSamplesPerTick,
						stringDecayStart,
						stringDecayEnd,
						instrument.stringSustainType,
					);
				}
			}
		}
	}

	public static getLFOAmplitude(instrument: Instrument, secondsIntoBar: number): number {
		return getLFOAmplitude(instrument, secondsIntoBar);
	}
	static wrap(x: number, b: number): number {
		return wrap(x, b);
	}
	// biome-ignore lint/complexity/noBannedTypes: callback return type
	public static getInstrumentSynthFunction(instrument: Instrument): Function {
		const plugin = getPlugin(instrument.type);
		if (plugin) {
			return plugin.getSynthFunction(instrument, Synth);
		}
		throw new Error(`Unrecognized instrument type: ${instrument.type}`);
	}

	// Public bridge for mod plugin — modSynth needs private Synth state
	public static runModSynth(
		synth: Synth,
		bufferIndex: number,
		roundedSamplesPerTick: number,
		tone: Tone,
		instrument: Instrument,
	): void {
		Synth.modSynth(synth, bufferIndex, roundedSamplesPerTick, tone, instrument);
	}

	private static modSynth(
		synth: Synth,
		_stereoBufferIndex: number,
		roundedSamplesPerTick: number,
		tone: Tone,
		instrument: Instrument,
	): void {
		// Note: present modulator value is tone.expressionStarts[0].

		if (!synth.song) return;

		const mod: number = Config.modCount - 1 - tone.pitches[0];

		// Flagged as invalid because unused by current settings, skip
		if (instrument.invalidModulators[mod]) return;

		const setting: number = instrument.modulators[mod];

		// Generate list of used instruments
		let usedInstruments: number[] = [];
		if (Config.modulators[instrument.modulators[mod]].forSong) {
			// Instrument doesn't matter for song, just push a random index to run the modsynth once
			usedInstruments.push(0);
		} else {
			// All
			if (
				instrument.modInstruments[mod] ===
				synth.song.channels[instrument.modChannels[mod]].instruments.length
			) {
				for (
					let i: number = 0;
					i < synth.song.channels[instrument.modChannels[mod]].instruments.length;
					i++
				) {
					usedInstruments.push(i);
				}
			} // Active
			else if (
				instrument.modInstruments[mod] >
				synth.song.channels[instrument.modChannels[mod]].instruments.length
			) {
				if (synth.song.getPattern(instrument.modChannels[mod], synth.bar) != null) {
					usedInstruments = synth.song.getPattern(
						instrument.modChannels[mod],
						synth.bar,
					)!.instruments;
				}
			} else {
				usedInstruments.push(instrument.modInstruments[mod]);
			}
		}

		for (
			let instrumentIndex: number = 0;
			instrumentIndex < usedInstruments.length;
			instrumentIndex++
		) {
			synth.setModValue(
				tone.expression,
				tone.expression + tone.expressionDelta,
				instrument.modChannels[mod],
				usedInstruments[instrumentIndex],
				setting,
			);

			// If mods are being held (for smoother playback while recording mods), use those values instead.
			for (let i: number = 0; i < synth.heldMods.length; i++) {
				if (Config.modulators[instrument.modulators[mod]].forSong) {
					if (synth.heldMods[i].setting === setting) {
						synth.setModValue(
							synth.heldMods[i].volume,
							synth.heldMods[i].volume,
							instrument.modChannels[mod],
							usedInstruments[instrumentIndex],
							setting,
						);
					}
				} else if (
					synth.heldMods[i].channelIndex === instrument.modChannels[mod] &&
					synth.heldMods[i].instrumentIndex === usedInstruments[instrumentIndex] &&
					synth.heldMods[i].setting === setting
				) {
					synth.setModValue(
						synth.heldMods[i].volume,
						synth.heldMods[i].volume,
						instrument.modChannels[mod],
						usedInstruments[instrumentIndex],
						setting,
					);
				}
			}

			// Reset arps, but only at the start of the note
			if (
				setting === Config.modulators.dictionary["reset arp"].index &&
				synth.tick === 0 &&
				tone.noteStartPart === synth.beat * Config.partsPerBeat + synth.part
			) {
				synth.channels[instrument.modChannels[mod]].instruments[
					usedInstruments[instrumentIndex]
				].arpTime = 0;
			} // Reset envelope, but only at the start of the note
			else if (
				setting === Config.modulators.dictionary["reset envelope"].index &&
				synth.tick === 0 &&
				tone.noteStartPart === synth.beat * Config.partsPerBeat + synth.part
			) {
				const envelopeTarget = instrument.modEnvelopeNumbers[mod];
				const tgtInstrumentState: InstrumentState =
					synth.channels[instrument.modChannels[mod]].instruments[
						usedInstruments[instrumentIndex]
					];
				const tgtInstrument: Instrument =
					synth.song.channels[instrument.modChannels[mod]].instruments[
						usedInstruments[instrumentIndex]
					];

				if (tgtInstrument.envelopeCount > envelopeTarget) {
					tgtInstrumentState.envelopeTime[envelopeTarget] = 0;
				}
			} // Denote next bar skip
			else if (setting === Config.modulators.dictionary["next bar"].index) {
				synth.wantToSkip = true;
			} // do song eq filter first
			else if (setting === Config.modulators.dictionary["song eq"].index) {
				const tgtSong = synth.song;

				const dotTarget = instrument.modFilterTypes[mod] | 0;

				if (dotTarget === 0) {
					// Morph. Figure out the target filter's X/Y coords for this point. If no point exists with this index, or point types don't match, do lerp-out for this point and lerp-in of a new point
					let pinIdx: number = 0;
					const currentPart: number = synth.getTicksIntoBar() / Config.ticksPerPart;
					while (tone.note!.start + tone.note!.pins[pinIdx].time <= currentPart) pinIdx++;
					// 0 to 1 based on distance to next morph
					const lerpEndRatio: number =
						(currentPart -
							tone.note!.start +
							(roundedSamplesPerTick /
								(synth.getSamplesPerTick() * Config.ticksPerPart)) *
								Config.ticksPerPart -
							tone.note!.pins[pinIdx - 1].time) /
						(tone.note!.pins[pinIdx].time - tone.note!.pins[pinIdx - 1].time);

					// Compute the new settings to go to.
					if (
						tgtSong.eqSubFilters[tone.note!.pins[pinIdx - 1].size] != null ||
						tgtSong.eqSubFilters[tone.note!.pins[pinIdx].size] != null
					) {
						tgtSong.tmpEqFilterEnd = FilterSettings.lerpFilters(
							tgtSong.eqSubFilters[tone.note!.pins[pinIdx - 1].size]!,
							tgtSong.eqSubFilters[tone.note!.pins[pinIdx].size]!,
							lerpEndRatio,
						);
					} else {
						// No mutation will occur to the filter object so we can safely return it without copying
						tgtSong.tmpEqFilterEnd = tgtSong.eqFilter;
					}
				} // Target (1 is dot 1 X, 2 is dot 1 Y, etc.)
				else {
					// Since we are directly manipulating the filter, make sure it is a new one and not an actual one of the instrument's filters
					for (let i: number = 0; i < Config.filterMorphCount; i++) {
						if (
							tgtSong.tmpEqFilterEnd === tgtSong.eqSubFilters[i] &&
							tgtSong.tmpEqFilterEnd != null
						) {
							tgtSong.tmpEqFilterEnd = new FilterSettings();
							tgtSong.tmpEqFilterEnd.fromJsonObject(
								tgtSong.eqSubFilters[i]!.toJsonObject(),
							);
						}
					}
					if (tgtSong.tmpEqFilterEnd == null) {
						tgtSong.tmpEqFilterEnd = new FilterSettings();
						tgtSong.tmpEqFilterEnd.fromJsonObject(tgtSong.eqFilter.toJsonObject());
					}

					if (
						tgtSong.tmpEqFilterEnd.controlPointCount > Math.floor((dotTarget - 1) / 2)
					) {
						if (dotTarget % 2) {
							// X
							tgtSong.tmpEqFilterEnd.controlPoints[
								Math.floor((dotTarget - 1) / 2)
							].freq = tone.expression + tone.expressionDelta;
						} else {
							// Y
							tgtSong.tmpEqFilterEnd.controlPoints[
								Math.floor((dotTarget - 1) / 2)
							].gain = tone.expression + tone.expressionDelta;
						}
					}
				}
			} // Extra info for eq filter target needs to be set as well
			else if (setting === Config.modulators.dictionary["eq filter"].index) {
				const tgtInstrument =
					synth.song.channels[instrument.modChannels[mod]].instruments[
						usedInstruments[instrumentIndex]
					];

				if (!tgtInstrument.eqFilterType) {
					const dotTarget = instrument.modFilterTypes[mod] | 0;

					if (dotTarget === 0) {
						// Morph. Figure out the target filter's X/Y coords for this point. If no point exists with this index, or point types don't match, do lerp-out for this point and lerp-in of a new point
						let pinIdx: number = 0;
						const currentPart: number = synth.getTicksIntoBar() / Config.ticksPerPart;
						while (tone.note!.start + tone.note!.pins[pinIdx].time <= currentPart)
							pinIdx++;
						// 0 to 1 based on distance to next morph
						const lerpEndRatio: number =
							(currentPart -
								tone.note!.start +
								(roundedSamplesPerTick /
									(synth.getSamplesPerTick() * Config.ticksPerPart)) *
									Config.ticksPerPart -
								tone.note!.pins[pinIdx - 1].time) /
							(tone.note!.pins[pinIdx].time - tone.note!.pins[pinIdx - 1].time);

						// Compute the new settings to go to.
						if (
							tgtInstrument.eqSubFilters[tone.note!.pins[pinIdx - 1].size] != null ||
							tgtInstrument.eqSubFilters[tone.note!.pins[pinIdx].size] != null
						) {
							tgtInstrument.tmpEqFilterEnd = FilterSettings.lerpFilters(
								tgtInstrument.eqSubFilters[tone.note!.pins[pinIdx - 1].size]!,
								tgtInstrument.eqSubFilters[tone.note!.pins[pinIdx].size]!,
								lerpEndRatio,
							);
						} else {
							// No mutation will occur to the filter object so we can safely return it without copying
							tgtInstrument.tmpEqFilterEnd = tgtInstrument.eqFilter;
						}
					} // Target (1 is dot 1 X, 2 is dot 1 Y, etc.)
					else {
						// Since we are directly manipulating the filter, make sure it is a new one and not an actual one of the instrument's filters
						for (let i: number = 0; i < Config.filterMorphCount; i++) {
							if (
								tgtInstrument.tmpEqFilterEnd === tgtInstrument.eqSubFilters[i] &&
								tgtInstrument.tmpEqFilterEnd != null
							) {
								tgtInstrument.tmpEqFilterEnd = new FilterSettings();
								tgtInstrument.tmpEqFilterEnd.fromJsonObject(
									tgtInstrument.eqSubFilters[i]!.toJsonObject(),
								);
							}
						}
						if (tgtInstrument.tmpEqFilterEnd == null) {
							tgtInstrument.tmpEqFilterEnd = new FilterSettings();
							tgtInstrument.tmpEqFilterEnd.fromJsonObject(
								tgtInstrument.eqFilter.toJsonObject(),
							);
						}

						if (
							tgtInstrument.tmpEqFilterEnd.controlPointCount >
							Math.floor((dotTarget - 1) / 2)
						) {
							if (dotTarget % 2) {
								// X
								tgtInstrument.tmpEqFilterEnd.controlPoints[
									Math.floor((dotTarget - 1) / 2)
								].freq = tone.expression + tone.expressionDelta;
							} else {
								// Y
								tgtInstrument.tmpEqFilterEnd.controlPoints[
									Math.floor((dotTarget - 1) / 2)
								].gain = tone.expression + tone.expressionDelta;
							}
						}
					}
				}
			} // Extra info for note filter target needs to be set as well
			else if (setting === Config.modulators.dictionary["note filter"].index) {
				const tgtInstrument =
					synth.song.channels[instrument.modChannels[mod]].instruments[
						usedInstruments[instrumentIndex]
					];

				if (!tgtInstrument.noteFilterType) {
					const dotTarget = instrument.modFilterTypes[mod] | 0;

					if (dotTarget === 0) {
						// Morph. Figure out the target filter's X/Y coords for this point. If no point exists with this index, or point types don't match, do lerp-out for this point and lerp-in of a new point
						let pinIdx: number = 0;
						const currentPart: number = synth.getTicksIntoBar() / Config.ticksPerPart;
						while (tone.note!.start + tone.note!.pins[pinIdx].time <= currentPart)
							pinIdx++;
						// 0 to 1 based on distance to next morph
						const lerpEndRatio: number =
							(currentPart -
								tone.note!.start +
								(roundedSamplesPerTick /
									(synth.getSamplesPerTick() * Config.ticksPerPart)) *
									Config.ticksPerPart -
								tone.note!.pins[pinIdx - 1].time) /
							(tone.note!.pins[pinIdx].time - tone.note!.pins[pinIdx - 1].time);

						// Compute the new settings to go to.
						if (
							tgtInstrument.noteSubFilters[tone.note!.pins[pinIdx - 1].size] !=
								null ||
							tgtInstrument.noteSubFilters[tone.note!.pins[pinIdx].size] != null
						) {
							tgtInstrument.tmpNoteFilterEnd = FilterSettings.lerpFilters(
								tgtInstrument.noteSubFilters[tone.note!.pins[pinIdx - 1].size]!,
								tgtInstrument.noteSubFilters[tone.note!.pins[pinIdx].size]!,
								lerpEndRatio,
							);
						} else {
							// No mutation will occur to the filter object so we can safely return it without copying
							tgtInstrument.tmpNoteFilterEnd = tgtInstrument.noteFilter;
						}
					} // Target (1 is dot 1 X, 2 is dot 1 Y, etc.)
					else {
						// Since we are directly manipulating the filter, make sure it is a new one and not an actual one of the instrument's filters

						for (let i: number = 0; i < Config.filterMorphCount; i++) {
							if (
								tgtInstrument.tmpNoteFilterEnd ===
									tgtInstrument.noteSubFilters[i] &&
								tgtInstrument.tmpNoteFilterEnd != null
							) {
								tgtInstrument.tmpNoteFilterEnd = new FilterSettings();
								tgtInstrument.tmpNoteFilterEnd.fromJsonObject(
									tgtInstrument.noteSubFilters[i]!.toJsonObject(),
								);
							}
						}
						if (tgtInstrument.tmpNoteFilterEnd == null) {
							tgtInstrument.tmpNoteFilterEnd = new FilterSettings();
							tgtInstrument.tmpNoteFilterEnd.fromJsonObject(
								tgtInstrument.noteFilter.toJsonObject(),
							);
						}

						if (
							tgtInstrument.tmpNoteFilterEnd.controlPointCount >
							Math.floor((dotTarget - 1) / 2)
						) {
							if (dotTarget % 2) {
								// X
								tgtInstrument.tmpNoteFilterEnd.controlPoints[
									Math.floor((dotTarget - 1) / 2)
								].freq = tone.expression + tone.expressionDelta;
							} else {
								// Y
								tgtInstrument.tmpNoteFilterEnd.controlPoints[
									Math.floor((dotTarget - 1) / 2)
								].gain = tone.expression + tone.expressionDelta;
							}
						}
					}
				}
			} else if (
				setting === Config.modulators.dictionary["individual envelope speed"].index
			) {
				const tgtInstrument =
					synth.song.channels[instrument.modChannels[mod]].instruments[
						usedInstruments[instrumentIndex]
					];
				const envelopeTarget = instrument.modEnvelopeNumbers[mod];

				let speed: number = tone.expression + tone.expressionDelta;
				if (tgtInstrument.envelopeCount > envelopeTarget) {
					if (Number.isInteger(speed)) {
						tgtInstrument.envelopes[envelopeTarget].tempEnvelopeSpeed =
							Config.perEnvelopeSpeedIndices[speed];
					} else {
						// linear interpolation
						speed =
							(1 - (speed % 1)) * Config.perEnvelopeSpeedIndices[Math.floor(speed)] +
							(speed % 1) * Config.perEnvelopeSpeedIndices[Math.ceil(speed)];
						tgtInstrument.envelopes[envelopeTarget].tempEnvelopeSpeed = speed;
					}
				}
			} else if (
				setting === Config.modulators.dictionary["individual envelope lower bound"].index
			) {
				const tgtInstrument =
					synth.song.channels[instrument.modChannels[mod]].instruments[
						usedInstruments[instrumentIndex]
					];
				const envelopeTarget = instrument.modEnvelopeNumbers[mod];

				const bound: number = tone.expression + tone.expressionDelta;
				if (tgtInstrument.envelopeCount > envelopeTarget) {
					tgtInstrument.envelopes[envelopeTarget].tempEnvelopeLowerBound = bound / 10;
				}
			} else if (
				setting === Config.modulators.dictionary["individual envelope upper bound"].index
			) {
				const tgtInstrument =
					synth.song.channels[instrument.modChannels[mod]].instruments[
						usedInstruments[instrumentIndex]
					];
				const envelopeTarget = instrument.modEnvelopeNumbers[mod];

				const bound: number = tone.expression + tone.expressionDelta;
				if (tgtInstrument.envelopeCount > envelopeTarget) {
					tgtInstrument.envelopes[envelopeTarget].tempEnvelopeUpperBound = bound / 10;
				}
			}
		}
	}

	public static findRandomZeroCrossing(wave: Float32Array, waveLength: number): number {
		return findRandomZeroCrossing(wave, waveLength);
	}

	public static instrumentVolumeToVolumeMult(instrumentVolume: number): number {
		return instrumentVolumeToVolumeMult(instrumentVolume);
	}
	public static volumeMultToInstrumentVolume(volumeMult: number): number {
		return volumeMultToInstrumentVolume(volumeMult);
	}
	public static noteSizeToVolumeMult(size: number): number {
		return noteSizeToVolumeMult(size);
	}
	public static volumeMultToNoteSize(volumeMult: number): number {
		return volumeMultToNoteSize(volumeMult);
	}

	public getSamplesPerTick(): number {
		if (this.song == null) return 0;
		let beatsPerMinute: number = this.song.getBeatsPerMinute();
		if (this.isModActive(Config.modulators.dictionary.tempo.index)) {
			beatsPerMinute = this.modState.getModValue(Config.modulators.dictionary.tempo.index);
		}
		return this.getSamplesPerTickSpecificBPM(beatsPerMinute);
	}

	private getSamplesPerTickSpecificBPM(beatsPerMinute: number): number {
		return renderGetSamplesPerTick(
			this.samplesPerSecond,
			beatsPerMinute,
			Config.ticksPerPart,
			Config.partsPerBeat,
		);
	}

	public sanitizeFilters(filters: DynamicBiquadFilter[]): void {
		this._postProc.sanitizeFilters(filters);
	}

	public static sanitizeDelayLine(
		delayLine: Float32Array,
		lastIndex: number,
		mask: number,
	): void {
		sanitizeDelayLine(delayLine, lastIndex, mask);
	}

	public static applyFilters(
		sample: number,
		input1: number,
		input2: number,
		filterCount: number,
		filters: DynamicBiquadFilter[],
	): number {
		return applyFilters(sample, input1, input2, filterCount, filters);
	}

	public computeTicksSinceStart(ofBar: boolean = false) {
		const beatsPerBar = this.song?.beatsPerBar ? this.song?.beatsPerBar : 8;
		if (ofBar) {
			return Config.ticksPerPart * Config.partsPerBeat * beatsPerBar * this.bar;
		} else {
			return (
				this.tick +
				Config.ticksPerPart *
					(this.part + Config.partsPerBeat * (this.beat + beatsPerBar * this.bar))
			);
		}
	}
}

export type { Chord, Dictionary, DictionaryArray, Envelope, Transition } from "./synth-config";
// When compiling synth.ts as a standalone module named "beepbox", expose these classes as members to JavaScript:
export { Config, EnvelopeType, FilterType, InstrumentType } from "./synth-config";
