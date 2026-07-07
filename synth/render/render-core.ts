// render-core.ts
//
// Purpose: Pure render tick function — takes a SongSnapshot + RenderState, produces audio
//
// This module:
// - Defines RenderState (mutable state owned by the render core)
// - Defines renderTick() signature and RenderResult/RenderTelemetry types
// - Provides renderPostProcessing() — post-processor call reading from SongSnapshot
// - Provides tone pool management — alloc/free/release helpers for Tone lifecycle
// - Provides playTone/playModTone — sample production dispatch (Phase 1: snapshot-based)
// - Phase 1 extracts synthesize() logic into pure, snapshot-based functions
// - No Song reference, no DOM/AudioContext, no mutable imports beyond state

import { Deque } from "../deque";
import { PostProcessingState, type SongPostParams } from "../post-processing";
import { Tone } from "../tone";
import type { SongSnapshot } from "./snapshot";

// ── Stop-fade state ───────────────────────────────────────────────────────

export interface StopFadeState {
	samplesRemaining: number;
	samplesTotal: number;
	cleanupDone: boolean;
}

export function createStopFadeState(): StopFadeState {
	return {
		samplesRemaining: 0,
		samplesTotal: 0,
		cleanupDone: false,
	};
}

// ── RenderState (mutable state owned by render core) ─────────────────────

export interface RenderState {
	playhead: number;
	bar: number;
	beat: number;
	part: number;
	tick: number;
	tickSampleCountdown: number;
	isAtStartOfTick: boolean;
	isAtStartOfSong: boolean;
	playheadNeedsReset: boolean;
	prevBar: number | null;

	// Per-channel audio accumulation ring buffers
	// (initialized from snapshot channel count, sized by sample rate x max tick)
	channelRingBuffers: Float32Array[];
	channelRingPositions: number[];

	// Post-processing state (song EQ, compression, limiting)
	postProc: PostProcessingState;

	// Stop-fade state
	stopFade: StopFadeState;

	// Tone recycling pool (shared across all channels/instruments).
	// Object-reuse pool: freed Tones are pushed back, alloc pops from pool
	// before constructing new Tone instances.
	tonePool: Deque<Tone>;

	// State flags
	renderingSong: boolean;
}

export function createRenderState(): RenderState {
	return {
		playhead: 0,
		bar: 0,
		beat: 0,
		part: 0,
		tick: 0,
		tickSampleCountdown: 0,
		isAtStartOfTick: true,
		isAtStartOfSong: true,
		playheadNeedsReset: false,
		prevBar: null,

		channelRingBuffers: [],
		channelRingPositions: [],

		postProc: new PostProcessingState(),
		stopFade: createStopFadeState(),

		tonePool: new Deque<Tone>(),

		renderingSong: false,
	};
}

// ── RenderTelemetry (reported back from each tick) ────────────────────────

export interface RenderTelemetry {
	readonly playhead: number;
	readonly spectrum: { left: Float32Array; right: Float32Array } | null;
	readonly volumeCaps: readonly number[];
}

// ── RenderResult ──────────────────────────────────────────────────────────

export interface RenderResult {
	readonly left: Float32Array;
	readonly right: Float32Array;
	readonly telemetry: RenderTelemetry;
}

// ── Tone lifecycle helpers ────────────────────────────────────────────────

/**
 * Allocate a Tone from the recycling pool, or construct a new one.
 */
export function allocTone(tonePool: Deque<Tone>): Tone {
	if (tonePool.count() > 0) {
		const tone: Tone = tonePool.popBack();
		tone.freshlyAllocated = true;
		return tone;
	}
	return new Tone();
}

/**
 * Return a Tone to the recycling pool.
 */
export function recycleTone(tonePool: Deque<Tone>, tone: Tone): void {
	tonePool.pushBack(tone);
}

/**
 * Deactivate a tone and move it to the released queue for fade-out.
 */
export function releaseTone(releasedTones: Deque<Tone>, tone: Tone): void {
	releasedTones.pushFront(tone);
	tone.atNoteStart = false;
	tone.passedEndOfNote = true;
}

/**
 * Free a tone from the released queue, recycling it.
 */
export function freeReleasedTone(
	tonePool: Deque<Tone>,
	releasedTones: Deque<Tone>,
	toneIndex: number,
): void {
	recycleTone(tonePool, releasedTones.get(toneIndex));
	releasedTones.remove(toneIndex);
}

/**
 * Free all tones across all channel/instrument deques.
 *
 * Accepts an array of channels, each with an instruments array holding
 * the four tone deques. This mirrors the ChannelState/InstrumentState
 * shape used by Synth.
 *
 * Phase 2: RenderState will own a flat tone-deque array instead.
 */
export function freeAllTones(
	tonePool: Deque<Tone>,
	channels: ReadonlyArray<{
		readonly instruments: ReadonlyArray<{
			readonly activeTones: Deque<Tone>;
			readonly activeModTones: Deque<Tone>;
			readonly releasedTones: Deque<Tone>;
			readonly liveInputTones: Deque<Tone>;
		}>;
	}>,
): void {
	for (const channelState of channels) {
		for (const instrumentState of channelState.instruments) {
			while (instrumentState.activeTones.count() > 0) {
				recycleTone(tonePool, instrumentState.activeTones.popBack());
			}
			while (instrumentState.activeModTones.count() > 0) {
				recycleTone(tonePool, instrumentState.activeModTones.popBack());
			}
			while (instrumentState.releasedTones.count() > 0) {
				recycleTone(tonePool, instrumentState.releasedTones.popBack());
			}
			while (instrumentState.liveInputTones.count() > 0) {
				recycleTone(tonePool, instrumentState.liveInputTones.popBack());
			}
		}
	}
}

/**
 * Play a tone: dispatch to the instrument's synthesizer function and
 * clear envelope state.
 *
 * Phase 1: the synthesizer function is a plugin-generated closure tied
 * to Synth internals. Phase 2 replaces the host/state types with the
 * worklet's own scope types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function playTone(
	synthesizer: Function | null,
	bufferIndex: number,
	runLength: number,
	tone: Tone,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	host: any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	instrumentState: any,
): void {
	if (synthesizer != null) {
		synthesizer(host, bufferIndex, runLength, tone, instrumentState);
	}
	tone.envelopeComputer.clearEnvelopes();
	instrumentState.envelopeComputer.clearEnvelopes();
}

/**
 * Compute the note-pin expression range for the current tick position.
 *
 * Returns { expression, expressionDelta } for a tone's active note at
 * the given bar/beat/part/tick within the tick's sample run.
 */
export function computeNoteExpression(
	tone: Tone,
	tick: number,
	beat: number,
	part: number,
	ticksPerPart: number,
	partsPerBeat: number,
	tickSampleCountdown: number,
	samplesPerTick: number,
	runLength: number,
): { expression: number; expressionDelta: number } {
	const note: NonNullable<Tone["note"]> = tone.note!;
	const ticksIntoBar: number = (beat * partsPerBeat + part) * ticksPerPart + tick;
	const partTimeTickStart: number = ticksIntoBar / ticksPerPart;
	const partTimeTickEnd: number = (ticksIntoBar + 1) / ticksPerPart;
	const startRatio: number = 1.0 - tickSampleCountdown / samplesPerTick;
	const endRatio: number = 1.0 - (tickSampleCountdown - runLength) / samplesPerTick;
	const partTimeStart: number =
		partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
	const partTimeEnd: number =
		partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
	const tickTimeStart: number = ticksPerPart * partTimeStart;
	const tickTimeEnd: number = ticksPerPart * partTimeEnd;
	const currentPart: number = beat * partsPerBeat + part;
	const endPinIndex: number = note.getEndPinIndex(currentPart);
	const startPin: number | undefined = tone.note?.pins[endPinIndex - 1]?.size;
	const endPin: number | undefined = tone.note?.pins[endPinIndex]?.size;
	const startPinTime: number | undefined = tone.note?.pins[endPinIndex - 1]?.time;
	const endPinTime: number | undefined = tone.note?.pins[endPinIndex]?.time;

	if (startPin == null || endPin == null || startPinTime == null || endPinTime == null) {
		return { expression: 0, expressionDelta: 0 };
	}

	const startPinTick: number = (note.start + startPinTime) * ticksPerPart;
	const endPinTick: number = (note.start + endPinTime) * ticksPerPart;
	const pinRange: number = endPinTick - startPinTick;

	if (pinRange <= 0) {
		return { expression: startPin, expressionDelta: 0 };
	}

	const ratioStart: number = (tickTimeStart - startPinTick) / pinRange;
	const ratioEnd: number = (tickTimeEnd - startPinTick) / pinRange;

	const exprStart: number = startPin + (endPin - startPin) * ratioStart;
	const exprEnd: number = startPin + (endPin - startPin) * ratioEnd;

	return {
		expression: exprStart,
		expressionDelta: exprEnd - exprStart,
	};
}

/**
 * Play a modulator tone: compute expression from note pins, then dispatch
 * to the instrument's synthesizer function.
 *
 * Reads tick timing from RenderState + samplesPerTick rather than Synth
 * instance methods. Reads instrument data from SongSnapshot.
 *
 * Phase 2: the tone's note field will be replaced with a NoteSnapshot
 * reference so no mutable Note is needed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function playModTone(
	snapshot: SongSnapshot,
	_channelIndex: number,
	samplesPerTick: number,
	bufferIndex: number,
	runLength: number,
	tone: Tone,
	state: RenderState,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	host: any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	instrumentState: any,
): void {
	if (tone.note == null) return;

	// Instrument data from snapshot (used in Phase 2 for synth func dispatch)
	// const chSnapshot: ChannelSnapshot = snapshot.channelSnapshots[channelIndex];
	// const instSnapshot: InstrumentSnapshot =
	// 	chSnapshot.instruments[tone.instrumentIndex];

	// Compute expression from note pins at current playhead position
	const { expression, expressionDelta } = computeNoteExpression(
		tone,
		state.tick,
		state.beat,
		state.part,
		snapshot.ticksPerPart,
		snapshot.partsPerBeat,
		state.tickSampleCountdown,
		samplesPerTick,
		runLength,
	);
	tone.expression = expression;
	tone.expressionDelta = expressionDelta;

	// Phase 2: resolve synth function from snapshot instrument type
	// instead of calling getInstrumentSynthFunction on mutable Instrument.
	// For now we pass through the existing instrumentState.synthesizer.
	if (instrumentState.synthesizer != null) {
		instrumentState.synthesizer(host, bufferIndex, runLength, tone, instrumentState);
	}
}

// ── Snapshot → SongPostParams ─────────────────────────────────────────────

export function songParamsFromSnapshot(snapshot: SongSnapshot): SongPostParams {
	return {
		masterGain: snapshot.masterGain,
		compressionThreshold: snapshot.compressionThreshold,
		limitThreshold: snapshot.limitThreshold,
		compressionRatio: snapshot.compressionRatio,
		limitRatio: snapshot.limitRatio,
		limitDecay: snapshot.limitDecay,
		limitRise: snapshot.limitRise,
	};
}

// ── renderPostProcessing ──────────────────────────────────────────────────

export interface VolumeCapTracker {
	in: number;
	out: number;
}

/**
 * Apply song EQ + compressor/limiter to a range of output samples.
 * Reads params from SongSnapshot. Mutates output buffers in place.
 */
export function renderPostProcessing(
	left: Float32Array,
	right: Float32Array,
	leftUnfiltered: Float32Array | null,
	rightUnfiltered: Float32Array | null,
	bufferIndex: number,
	runEnd: number,
	params: SongPostParams,
	volume: number,
	sampleRate: number,
	volCap: VolumeCapTracker,
	state: PostProcessingState,
): void {
	if (leftUnfiltered == null || rightUnfiltered == null) {
		// SAFETY: Allocates temporary silence buffers. The coordinator path
		// always provides real unfiltered buffers — this fallback exists for
		// test isolation where unfiltered buffers may not be wired. Replace
		// with a guard assert once the coordinator is the only caller.
		const dummyL: Float32Array = new Float32Array(left.length);
		const dummyR: Float32Array = new Float32Array(right.length);
		state.processBlock(
			left,
			right,
			dummyL,
			dummyR,
			bufferIndex,
			runEnd,
			params,
			volume,
			sampleRate,
			volCap,
		);
	} else {
		state.processBlock(
			left,
			right,
			leftUnfiltered,
			rightUnfiltered,
			bufferIndex,
			runEnd,
			params,
			volume,
			sampleRate,
			volCap,
		);
	}
}

// ── renderStopFade ────────────────────────────────────────────────────────

/**
 * Apply cubic ease-out stop-fade to a range of output samples.
 * Mutates output buffers in place. Updates stopFade.samplesRemaining.
 *
 * Caller must:
 * 1. Scale outVolumeCap by the returned gain for peak-meter tracking.
 * 2. Zero remaining unfiltered buffers when fade completes.
 * 3. Set stopFade.cleanupDone = true after freeing tones/effects.
 *
 * The tone/effect cleanup (freeAllTones, resetAllEffects, clear mods)
 * stays in the coordinator because it touches Synth internals not yet
 * ported to render-core. When the coordinator detects
 * stopFade.samplesRemaining <= 0 && !stopFade.cleanupDone, it runs the
 * cleanup and sets cleanupDone = true.
 */
export function renderStopFade(
	left: Float32Array,
	right: Float32Array,
	bufferIndex: number,
	runEnd: number,
	stopFade: StopFadeState,
): number {
	// Returns the last applied gain (for volume cap scaling)
	let lastGain: number = 1;
	let i: number = bufferIndex;
	for (; i < runEnd && stopFade.samplesRemaining > 0; i++) {
		const t: number = stopFade.samplesRemaining / stopFade.samplesTotal;
		const gain: number = 1 - (1 - t) * (1 - t) * (1 - t);
		lastGain = gain;
		left[i] *= gain;
		right[i] *= gain;
		stopFade.samplesRemaining--;
	}
	// Zero remaining samples if fade ended mid-buffer
	for (; i < runEnd; i++) {
		left[i] = 0;
		right[i] = 0;
	}
	return lastGain;
}

// ── RenderTick (stub — Phase 1 extraction target) ─────────────────────────

/**
 * Produce one tick of audio from a SongSnapshot.
 *
 * Phase 1: extract synth.ts:synthesize() body here, reading from snapshot
 *           instead of mutable Song. No external side effects.
 *
 * Phase 2: runs inside AudioWorklet (no DOM, no AudioContext).
 */
export function renderTick(
	_snapshot: SongSnapshot,
	_state: RenderState,
	_outputBufferLength: number,
	_playSong: boolean,
): RenderResult {
	// Placeholder: returns silence until Phase 1 extraction
	const left: Float32Array = new Float32Array(_outputBufferLength);
	const right: Float32Array = new Float32Array(_outputBufferLength);

	const telemetry: RenderTelemetry = {
		playhead: _state.playhead,
		spectrum: null,
		volumeCaps: [],
	};

	return { left, right, telemetry };
}
