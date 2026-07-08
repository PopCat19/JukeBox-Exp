// worklet.ts
//
// Purpose: AudioWorkletProcessor entry point — runs computeToneSnapshot()
// in the audio rendering thread.
//
// This module:
// - Registers JukeBoxComputeToneProcessor in AudioWorkletGlobalScope
// - Phase 3 scaffold: imports computeToneSnapshot, process() produces silence
// - Phase 4: receives SongSnapshot + per-tick WorkletToneCommand[] via message port,
//   maintains Tone pool, constructs ToneRenderEnv from serialized data,
//   calls computeToneSnapshot() per tone, outputs silence (synth dispatch in Phase 5)
//
// All transitive dependencies are DOM/AudioContext-free at module load time.
// FilterControlPoint and FrequencyResponse are safe to import directly.

// ── Ambient: AudioWorklet-specific (missing from TS 5.4.5 lib.dom.d.ts) ──

interface AudioWorkletProcessorConstructOptions {
	readonly numberOfInputs?: number;
	readonly numberOfOutputs?: number;
	readonly outputChannelCount?: readonly number[];
	readonly parameterData?: Readonly<Record<string, number>>;
	readonly processorOptions?: unknown;
}

declare abstract class AudioWorkletProcessor {
	readonly port: MessagePort;
	constructor(options?: AudioWorkletProcessorConstructOptions);
	abstract process(
		inputs: Float32Array[][],
		outputs: Float32Array[][],
		parameters: Readonly<Record<string, Float32Array>>,
	): boolean;
}

declare function registerProcessor(
	name: string,
	ctor: new (options?: AudioWorkletProcessorConstructOptions) => AudioWorkletProcessor,
): void;

// sampleRate, currentFrame, currentTime are provided by AudioWorkletGlobalScope.
// Not directly referenced here — used implicitly by transitive deps.

// ── Ambient: worklet-scope globals needed by transitive deps at type-check ──

declare var console: {
	log(...data: unknown[]): void;
	warn(...data: unknown[]): void;
	error(...data: unknown[]): void;
	debug(...data: unknown[]): void;
};

interface MessagePort {
	postMessage(message: unknown, transfer?: unknown[]): void;
	close(): void;
	start(): void;
	onmessage: ((this: MessagePort, ev: { data: unknown }) => unknown) | null;
}

// ── Imports ──────────────────────────────────────────────────────────────

import { computeToneSnapshot, type EnvelopeComputerLike, type ToneRenderEnv } from "./compute-tone";
import { Deque } from "../deque";
import { FilterControlPoint } from "../instruments/filter-control-point";
import { FrequencyResponse } from "../filtering";
import { FilterType, InstrumentType, Config } from "../synth-config";
// tempFilterStart/EndCoefficients used by computeToneSnapshot transitive deps.
import { Tone } from "../tone";
import {
	getWorkletSynthFn,
	type WorkletSynthContext,
	type WorkletEffectState,
} from "./worklet-synth";
import {
	MSG_INIT,
	MSG_TICK,
	MSG_STOP,
	MSG_RESET,
	MSG_READY,
	MSG_TICK_COMPLETE,
	type WorkletToneCommand,
	type WorkletInitMessage,
	type WorkletTickMessage,
} from "./worklet-messages";
import type { SongSnapshot } from "./snapshot";

// ── Scratch buffer accessors ──────────────────────────────────────────────
//
// The worklet owns its own scratch FilterControlPoint and FrequencyResponse
// instances. They are reused across computeToneSnapshot calls.

function createTempDrumSetControlPoint(): FilterControlPoint {
	return new FilterControlPoint();
}

function createTempFrequencyResponse(): FrequencyResponse {
	return new FrequencyResponse();
}

// ── EnvelopeComputerLike adapter ─────────────────────────────────────────
//
// A minimal EnvelopeComputerLike implementation that provides the fields
// computeToneSnapshot reads after envelope computation. The main thread
// sends pre-computed envelopeStarts/envelopeEnds; this bridge holds them
// plus the slide/envelope fields that computeToneSnapshot reads.

class WorkletEnvelopeComputer implements EnvelopeComputerLike {
	public noteTicksStart: number = 0;
	public noteTicksEnd: number = 0;
	public noteSecondsStart: readonly number[] = [];
	public noteSecondsEnd: readonly number[] = [];
	public noteSecondsStartUnscaled: number = 0;
	public noteSecondsEndUnscaled: number = 0;
	public drumsetFilterEnvelopeStart: number = 0;
	public drumsetFilterEnvelopeEnd: number = 0;
	public lowpassCutoffDecayVolumeCompensation: number = 1.0;
	public prevSlideStart: boolean = false;
	public prevSlideEnd: boolean = false;
	public nextSlideStart: boolean = false;
	public nextSlideEnd: boolean = false;
	public prevSlideRatioStart: number = 0;
	public prevSlideRatioEnd: number = 0;
	public nextSlideRatioStart: number = 0;
	public nextSlideRatioEnd: number = 0;

	public reset(): void {
		// No-op for worklet; envelope state comes from tick messages
	}

	public computeDrumsetEnvelopes(
		_instrument: unknown,
		_envelope: { readonly type: number },
		_beatsPerPart: number,
		_partTimeStart: number,
		_partTimeEnd: number,
	): void {
		// Stub — drumset envelope computation crosses instrument boundaries.
		// Phase 5 will implement this.
	}
}

// ── Tone pool ────────────────────────────────────────────────────────────

class WorkletTonePool {
	private readonly _pool: Deque<Tone> = new Deque<Tone>();

	public alloc(): Tone {
		if (this._pool.count() > 0) {
			const tone: Tone = this._pool.popBack();
			tone.freshlyAllocated = true;
			return tone;
		}
		return new Tone();
	}

	public recycle(tone: Tone): void {
		this._pool.pushBack(tone);
	}
}

// ── Worklet state ────────────────────────────────────────────────────────

class WorkletScopeState {
	public readonly tonePool: WorkletTonePool = new WorkletTonePool();
	public readonly envComputer: WorkletEnvelopeComputer = new WorkletEnvelopeComputer();
	public readonly tempDrumSetCp: FilterControlPoint = createTempDrumSetControlPoint();
	public readonly tempFreqResp: FrequencyResponse = createTempFrequencyResponse();

	/** The last SongSnapshot received (maintained for config data like beatsPerBar, sampleRate) */
	public snapshot: SongSnapshot | null = null;

	/** Pending tick data from the main thread, or null if none pending. */
	public pendingTick: WorkletTickMessage | null = null;

	/** Active tones indexed by slot ID — persisted across ticks so state accumulates. */
	public readonly activeTones: Map<number, Tone> = new Map();

	/** Total ticks processed (diagnostic). */
	public tickCount: number = 0;

	/** Whether the worklet is actively processing (false after stop). */
	public running: boolean = true;

	/** Temp buffer for accumulating mono samples within a render quantum (max 128). */
	public readonly tempRenderBuf: Float32Array = new Float32Array(128);

	public reset(): void {
		// Recycle all active tones
		const pool: WorkletTonePool = this.tonePool;
		this.activeTones.forEach((tone: Tone): void => {
			pool.recycle(tone);
		});
		this.activeTones.clear();
		this.pendingTick = null;
		this.snapshot = null;
		this.tickCount = 0;
		this.running = true;
	}
}

// ── ToneRenderEnv construction ───────────────────────────────────────────

/**
 * Build a ToneRenderEnv from a serialized WorkletToneCommand + scratch buffers.
 * The returned env is valid only for the current computeToneSnapshot call.
 */
function buildToneRenderEnv(
	_tone: Tone,
	cmd: WorkletToneCommand,
	_envComputer: WorkletEnvelopeComputer,
	tempDrumSetCp: FilterControlPoint,
	tempFreqResp: FrequencyResponse,
	snapshot: SongSnapshot,
	_totalSamplesPerTick: number,
): ToneRenderEnv {
	// ── Instrument type info helpers ──────────────────────────────

	const fmOperatorInstrument = cmd.instrumentType === InstrumentType.fm ||
		cmd.instrumentType === InstrumentType.fm6op
		? {
			type: cmd.instrumentType,
			operators: buildOperatorArray(cmd.fmOperatorCount, cmd.fmOperatorFrequencies, cmd.fmOperatorAmplitudes),
			algorithm: cmd.fmAlgorithm,
			customAlgorithm: {
				carrierCount: cmd.fmCustomCarrierCount,
				associatedCarrier: [...cmd.fmCustomAssociatedCarrier],
				modulatedBy: [] as readonly (readonly number[])[],
				name: "",
			},
			fastTwoNoteArp: cmd.fmFastTwoNoteArp,
			monoChordTone: cmd.fmMonoChordTone,
		}
		: null!; // Won't be accessed in non-FM branch

	const nonFmPitchInst = {
		type: cmd.nonFmType,
		chipNoise: cmd.nonFmChipNoise,
		chipWave: cmd.nonFmChipWave,
		pulseWidth: cmd.nonFmPulseWidth,
		decimalOffset: cmd.nonFmDecimalOffset,
		stringSustain: cmd.nonFmStringSustain,
		stringSustainType: cmd.nonFmStringSustainType,
		fastTwoNoteArp: cmd.nonFmFastTwoNoteArp,
		monoChordTone: cmd.nonFmMonoChordTone,
	};

	// Build note filter control points from command data.
	// If no real points were provided, set count to 0 to avoid
	// out-of-bounds access in computeNoteFilters.
	const hasFilterPoints: boolean = cmd.noteFilterControlPointCount > 0 &&
		cmd.noteFilterControlPointTypes.length > 0;
	const noteFilterCtrlPointCount: number = hasFilterPoints
		? Math.min(cmd.noteFilterControlPointCount, cmd.noteFilterControlPointTypes.length)
		: 0;
	const noteFilterCtrlPoints: Array<{
		type: number;
		gain: number;
		freq: number;
		toCoefficients(filter: any, sampleRate: number, freqMult?: number, peakMult?: number): void;
		getVolumeCompensationMult(): number;
	}> = [];
	for (let pi: number = 0; pi < noteFilterCtrlPointCount; pi++) {
		const pType: number = cmd.noteFilterControlPointTypes[pi];
		const pGain: number = cmd.noteFilterControlPointGains[pi];
		const pFreq: number = cmd.noteFilterControlPointFreqs[pi];
		noteFilterCtrlPoints.push(buildSimpleFilterPoint(pType, pGain, pFreq)!);
	}



	return {
		sampleRate: snapshot.sampleRate,
		tick: cmd.tick,
		bar: cmd.bar,
		beat: cmd.beat,
		part: cmd.part,
		secondsPerPart: cmd.secondsPerPart,
		sampleTime: cmd.sampleTime,
		beatsPerPart: cmd.beatsPerPart,
		ticksIntoBar: cmd.ticksIntoBar,
		currentPart: cmd.currentPart,
		ticksSinceStart: cmd.ticksSinceStart,
		ticksSinceStartOfBar: cmd.ticksSinceStartOfBar,
		arpTime: cmd.arpTime,
		envelopeTime: [...cmd.envelopeTime],
		vibratoTime: cmd.vibratoTime,
		nextVibratoTime: cmd.nextVibratoTime,
		mods: cmd.mods,
		tempDrumSetControlPoint: tempDrumSetCp,
		tempFrequencyResponse: tempFreqResp,
		envelopeStarts: cmd.envelopeStarts,
		envelopeEnds: cmd.envelopeEnds,
		chordExpression: cmd.chordExpression,
		envelopeSpeeds: [...cmd.envelopeSpeeds],
		beatsPerBar: snapshot.beatsPerBar,
		transition: {
			isSeamless: cmd.transitionIsSeamless,
			continues: cmd.transitionContinues,
			slides: cmd.transitionSlides,
			slideTicks: cmd.transitionSlideTicks,
		},
		chord: {
			singleTone: cmd.chordSingleTone,
			arpeggiates: cmd.chordArpeggiates,
			name: cmd.chordName,
			customInterval: cmd.chordCustomInterval,
		},
		toneResetInst: cmd.toneResetInst,
		instrumentType: cmd.instrumentType,
		effectsHasPitchShift: cmd.effectsHasPitchShift,
		effectsHasDetune: cmd.effectsHasDetune,
		effectsHasVibrato: cmd.effectsHasVibrato,
		effectsHasNoteFilter: cmd.effectsHasNoteFilter,
		hasUnison: cmd.hasUnison,
		isModCapable: cmd.isModCapable,
		justIntonationSemitone: cmd.justIntonationSemitone,
		instrumentDetune: cmd.instrumentDetune,
		fadeOutTicks: cmd.fadeOutTicks,
		fadeInSeconds: cmd.fadeInSeconds,
		intervalScale: cmd.intervalScale,
		basePitch: cmd.basePitch,
		baseExpression: cmd.baseExpression,
		expressionReferencePitch: cmd.expressionReferencePitch,
		pitchDamping: cmd.pitchDamping,
		lfoAmplitudeStart: cmd.lfoAmplitudeStart,
		lfoAmplitudeEnd: cmd.lfoAmplitudeEnd,
		simpleFilterStartPoint: buildSimpleFilterPoint(cmd.simpleFilterStartType, cmd.simpleFilterStartGain, cmd.simpleFilterStartFreq),
		simpleFilterEndPoint: buildSimpleFilterPoint(cmd.simpleFilterEndType, cmd.simpleFilterEndGain, cmd.simpleFilterEndFreq),
		drumsetFilterEnvelope: cmd.drumsetFilterEnvelopeType != null ? { type: cmd.drumsetFilterEnvelopeType } : null,
		drumsetLowpassComp: cmd.drumsetLowpassComp,
		drumsetGain: cmd.drumsetGain,
		drumsetFreq: cmd.drumsetFreq,
		arpeggioInterval: cmd.arpeggioInterval,
		arpeggioIndex: cmd.arpeggioIndex,
		carrierCount: cmd.carrierCount,
		fmOperatorInstrument,
		fmInstrumentInfo: {
			feedbackAmplitude: cmd.fmFeedbackAmplitude,
			monoChordTone: cmd.fmMonoChordTone,
		},
		nonFmPitchInstrument: nonFmPitchInst,
		unisonInstrument: {
			unisonVoices: cmd.unisonVoices,
			unisonSpread: cmd.unisonSpread,
			unisonOffset: cmd.unisonOffset,
			unisonExpression: cmd.unisonExpression,
		},
		supersawInstrument: {
			unisonExpression: cmd.unisonExpression,
			unisonVoices: cmd.unisonVoices,
			unisonSpread: cmd.unisonSpread,
			unisonOffset: cmd.unisonOffset,
			supersawDynamism: cmd.supersawDynamism,
			supersawSpread: cmd.supersawSpread,
			supersawShape: cmd.supersawShape,
			decimalOffset: cmd.nonFmDecimalOffset,
			pulseWidth: cmd.nonFmPulseWidth,
		},
		vibratoInstrument: {
			vibrato: cmd.vibrato,
			vibratoDepth: cmd.vibratoDepth,
			vibratoDelay: cmd.vibratoDelay,
		},
		noteFilterInstrument: {
			noteFilterType: cmd.noteFilterType,
			velocityTracking: cmd.velocityTracking,
			noteFilter: {
				controlPointCount: noteFilterCtrlPoints.length,
				controlPoints: noteFilterCtrlPoints,
			},
			tmpNoteFilterStart: null,
			tmpNoteFilterEnd: null,
		},
		stringSustainType: cmd.stringSustainType,
		stringSustainRange: cmd.stringSustainRange,
		unisonVoices: cmd.unisonVoices,
		createPickedString: () => {
			// Phase 5: construct worklet-native PickedStringBridge
			return null!;
		},
		pickedStringUpdate: () => {
			// Phase 5: call PickedString.update from worklet scope
		},
		unisonInitialized: cmd.unisonInitialized,
	};
}

function buildOperatorArray(
	count: number,
	frequencies: readonly number[],
	amplitudes: readonly number[],
): ReadonlyArray<{
	readonly frequency: number;
	readonly amplitude: number;
}> {
	const arr: { frequency: number; amplitude: number }[] = [];
	for (let i = 0; i < count; i++) {
		arr.push({
			frequency: i < frequencies.length ? frequencies[i] : 0,
			amplitude: i < amplitudes.length ? amplitudes[i] : 0,
		});
	}
	return arr;
}

function buildSimpleFilterPoint(
	type: number | null,
	gain: number | null,
	freq: number | null,
): { type: number; gain: number; freq: number; toCoefficients(filter: any, sampleRate: number, freqMult?: number, peakMult?: number): void; getVolumeCompensationMult(): number } | null {
	if (type == null || gain == null || freq == null) return null;
	return {
		type,
		gain,
		freq,
		toCoefficients(
			filter: any,
			sampleRate: number,
			freqMult: number = 1.0,
			peakMult: number = 1.0,
		): void {
			const cornerRadiansPerSample: number =
				(2.0 * Math.PI * Math.max(Config.filterFreqMinHz,
					Math.min(Config.filterFreqMaxHz,
						freqMult * FilterControlPoint.getHzFromSettingValue(this.freq)))) /
				sampleRate;
			const power: number = (this.gain - Config.filterGainCenter) * Config.filterGainStep;
			const neutral: number = this.type === FilterType.peak ? 0.0 : -0.5;
			const interpolatedPower: number = neutral + (power - neutral) * peakMult;
			const linearGain: number = 2.0 ** interpolatedPower;
			switch (this.type) {
				case FilterType.lowPass:
					filter.lowPass2ndOrderButterworth(cornerRadiansPerSample, linearGain);
					break;
				case FilterType.highPass:
					filter.highPass2ndOrderButterworth(cornerRadiansPerSample, linearGain);
					break;
				case FilterType.peak:
					filter.peak2ndOrder(cornerRadiansPerSample, linearGain, 1.0);
					break;
			}
		},
		getVolumeCompensationMult(): number {
			const octave: number =
				(this.freq - Config.filterFreqReferenceSetting) * Config.filterFreqStep;
			const gainPow: number = (this.gain - Config.filterGainCenter) * Config.filterGainStep;
			switch (this.type) {
				case FilterType.lowPass: {
					const freqRelativeTo8khz: number =
						(2.0 ** octave * Config.filterFreqReferenceHz) / 8000.0;
					const warpedFreq: number = (Math.sqrt(1.0 + 4.0 * freqRelativeTo8khz) - 1.0) / 2.0;
					return 0.5 **
						(0.2 * Math.max(0.0, gainPow + 1.0) +
							Math.min(0.0, Math.max(-3.0, 0.595 * Math.log2(warpedFreq) + 0.35 * Math.min(0.0, gainPow + 1.0))));
				}
				case FilterType.highPass:
					return 0.5 **
						(0.125 * Math.max(0.0, gainPow + 1.0) +
							Math.min(0.0, 0.3 * (-octave - Math.log2(Config.filterFreqReferenceHz / 125.0)) +
								0.2 * Math.min(0.0, gainPow + 1.0)));
				case FilterType.peak: {
					const distanceFromCenter: number =
						octave + Math.log2(Config.filterFreqReferenceHz / 2000.0);
					const freqLoudness: number =
						(1.0 / (1.0 + (distanceFromCenter / 3.0) ** 2.0)) ** 2.0;
					return 0.5 **
						(0.125 * Math.max(0.0, gainPow) + 0.1 * freqLoudness * Math.min(0.0, gainPow));
				}
				default:
					return 1.0;
			}
		},
	};
}

// ── Processor class ───────────────────────────────────────────────────────

class JukeBoxComputeToneProcessor extends AudioWorkletProcessor {
	private readonly _state: WorkletScopeState = new WorkletScopeState();
	private _debug: boolean = false;

	constructor(_options?: AudioWorkletProcessorConstructOptions) {
		super();
		this.port.onmessage = this._onMessage.bind(this);
	}

	// ── Message handler ────────────────────────────────────────────────

	private _onMessage(event: { data: unknown }): void {
		const msg: Record<string, unknown> = event.data as Record<string, unknown>;
		if (msg == null) return;

		switch (msg.type) {
			case MSG_INIT:
				this._handleInit(msg as unknown as WorkletInitMessage);
				break;
			case MSG_TICK:
				this._handleTick(msg as unknown as WorkletTickMessage);
				break;
			case MSG_STOP:
				this._handleStop();
				break;
			case MSG_RESET:
				this._handleReset();
				break;
		}
	}

	private _handleInit(msg: WorkletInitMessage): void {
		// Reset FIRST so previous state is cleared, THEN set snapshot
		this._state.reset();
		this._state.snapshot = msg.snapshot;
		this._state.running = true;
		this._debug = false;
		this.port.postMessage({ type: MSG_READY });
		if (this._debug) console.log("[Worklet] init complete");
	}

	private _handleTick(msg: WorkletTickMessage): void {
		if (!this._state.running) return;
		this._state.pendingTick = msg;
	}

	private _handleStop(): void {
		this._state.running = false;
	}

	private _handleReset(): void {
		this._state.reset();
	}

	// ── process() — main audio rendering hook ──────────────────────────

	process(
		_inputs: Float32Array[][],
		outputs: Float32Array[][],
		_parameters: Record<string, Float32Array>,
	): boolean {
		if (!this._state.running) return false;

		const output: Float32Array[] | undefined = outputs[0];
		if (output == null) return true;

		const numSamples: number = output.length > 0 ? output[0].length : 0;
		if (numSamples === 0) return true;

		// Zero output buffers
		for (let ch = 0; ch < output.length; ch++) {
			output[ch].fill(0.0);
		}

		// Process pending tick
		const tick: WorkletTickMessage | null = this._state.pendingTick;
		if (tick == null) return true;

		this._state.pendingTick = null;
		this._state.tickCount++;

		const snapshot: SongSnapshot | null = this._state.snapshot;
		if (snapshot == null) return true;

		const samplesPerTick: number = tick.samplesPerTick;
		const toneCount: number = tick.tones.length;
		const sampleTime: number = 1.0 / snapshot.sampleRate;

		// Build set of tone slot IDs for this tick (for recycling unused slots)
		const usedSlots: Set<number> = new Set();

		for (let ti = 0; ti < toneCount; ti++) {
			const cmd: WorkletToneCommand = tick.tones[ti];
			usedSlots.add(cmd.toneSlotId);

			// Get or create tone for this slot
			let tone: Tone;
			if (this._state.activeTones.has(cmd.toneSlotId)) {
				tone = this._state.activeTones.get(cmd.toneSlotId)!;
				tone.freshlyAllocated = false;
			} else {
				tone = this._state.tonePool.alloc();
				this._state.activeTones.set(cmd.toneSlotId, tone);
			}

			// Set tone identity fields from command
			tone.instrumentIndex = cmd.instrumentIndex;
			tone.pitchCount = cmd.pitchCount;
			tone.chordSize = cmd.chordSize;
			tone.atNoteStart = cmd.atNoteStart;
			tone.drumsetPitch = cmd.drumsetPitch;

			// Populate envelope computer fields from command data
			const ec: WorkletEnvelopeComputer = this._state.envComputer;
			ec.noteTicksStart = 0;
			ec.noteTicksEnd = 1.0;
			ec.noteSecondsStart = [];
			ec.noteSecondsEnd = [];
			ec.noteSecondsStartUnscaled = 0;
			ec.noteSecondsEndUnscaled = sampleTime;
			ec.lowpassCutoffDecayVolumeCompensation =
				cmd.lowpassCutoffDecayVolumeCompensation;
			ec.drumsetFilterEnvelopeStart = 0;
			ec.drumsetFilterEnvelopeEnd = 0;
			ec.prevSlideStart = false;
			ec.prevSlideEnd = false;
			ec.nextSlideStart = false;
			ec.nextSlideEnd = false;
			ec.prevSlideRatioStart = 0;
			ec.prevSlideRatioEnd = 0;
			ec.nextSlideRatioStart = 0;
			ec.nextSlideRatioEnd = 0;

			// Skip instrument types without a worklet-native synth function.
			// Avoids crashing computeToneSnapshot on stub createPickedString
			// (null entries in tone.pickedStrings) and similar Phase 5 gaps.
			const synthFn = getWorkletSynthFn(cmd.instrumentType);
			if (synthFn == null) continue;

			// Build ToneRenderEnv from command + scratch buffers
			const env: ToneRenderEnv = buildToneRenderEnv(
				tone,
				cmd,
				ec,
				this._state.tempDrumSetCp,
				this._state.tempFreqResp,
				snapshot,
				samplesPerTick,
			);

			// Call computeToneSnapshot
			const result = computeToneSnapshot(
				snapshot,
				samplesPerTick,
				tone,
				false, // released — main thread determines this
				false, // shouldFadeOutFast
				env,
				ec,
			);

			// If tone is silent after snapshot, skip rendering
			if (!result.awake) continue;

			// ── Phase 5: render samples via worklet-native synth dispatch ──

			// Build the effect state for this tone from serialized command data
			const drumsetWaves: readonly Float32Array[] = cmd.drumsetWaves;
			const effectState: WorkletEffectState = {
				wave: cmd.waveBuffer,
				volumeScale: cmd.volumeScale,
				aliases: cmd.aliases,
				unisonVoices: cmd.unisonVoices,
				unisonSign: cmd.unisonSign,
				unisonSpread: cmd.unisonSpread,
				unisonOffset: cmd.unisonOffset,
				chordCustomInterval: cmd.chordCustomInterval,
				noisePitchFilterMult: cmd.noisePitchFilterMult,
				chipWaveLoopStart: 0,
				chipWaveLoopEnd: 0,
				chipWaveLoopMode: 0,
				chipWavePlayBackwards: false,
				isUsingAdvancedLoopControls: false,
				drumsetWaveCache: new Map(),
				getDrumsetWave: (pitch: number | null): Float32Array | null => {
					if (pitch == null) return null;
					return pitch < drumsetWaves.length ? drumsetWaves[pitch] : null;
				},
				drumsetIndexReferenceDelta: (_pitch: number | null): number => 1,
				spectrumNoiseLength: Config.spectrumNoiseLength,
			};

			const synthCtx: WorkletSynthContext = {
				effectState,
				filters: tone.noteFilters,
				filterCount: tone.noteFilterCount,
				sampleRate: snapshot.sampleRate,
				sineWave: Config.sineWave,
				sineWaveLength: Config.sineWaveLength,
				sineWaveMask: Config.sineWaveMask,
				chipNoiseLength: Config.chipNoiseLength,
				spectrumNoiseLength: Config.spectrumNoiseLength,
				fmAlgorithm: cmd.fmAlgorithm,
			};

			// Zero the temp buffer, render into it, then accumulate to output
			const tempBuf: Float32Array = this._state.tempRenderBuf;
			tempBuf.fill(0.0);
			synthFn(tone, synthCtx, tempBuf, 0, numSamples);

			// Accumulate temp buffer to output channels (panning TBD in Phase 6)
			for (let si = 0; si < numSamples; si++) {
				const sample: number = tempBuf[si];
				if (output.length > 0) output[0][si] += sample;
				if (output.length > 1) output[1][si] += sample;
			}
		}

		// Recycle tones for slots no longer in use
		if (this._state.activeTones.size > toneCount) {
			const toRemove: number[] = [];
			this._state.activeTones.forEach((_val: Tone, slotId: number): void => {
				if (!usedSlots.has(slotId)) {
					toRemove.push(slotId);
				}
			});
			for (let ri: number = 0; ri < toRemove.length; ri++) {
				const tone: Tone = this._state.activeTones.get(toRemove[ri])!;
				this._state.tonePool.recycle(tone);
				this._state.activeTones.delete(toRemove[ri]);
			}
		}

		// Signal completion to main thread
		this.port.postMessage({
			type: MSG_TICK_COMPLETE,
			tick: tick.tick,
			toneCount,
		});

		return true;
	}
}

registerProcessor("jukebox-compute-tone-processor", JukeBoxComputeToneProcessor);
