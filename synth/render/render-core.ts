// render-core.ts
//
// Purpose: Pure render tick function — takes a SongSnapshot + RenderState, produces audio
//
// This module:
// - Defines RenderState (mutable state owned by the render core)
// - Defines renderTick() signature and RenderResult/RenderTelemetry types
// - Provides renderPostProcessing() — post-processor call reading from SongSnapshot
// - Phase 1 extracts synthesize() logic into pure, snapshot-based functions
// - No Song reference, no DOM/AudioContext, no mutable imports beyond state

import { PostProcessingState, type SongPostParams } from "../post-processing";
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

	// Tone pools
	// (phase 2: tone lifecycle moved here)
	activeTones: number;
	releasedTones: number;

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

		activeTones: 0,
		releasedTones: 0,

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
		state.processBlock(left, right, dummyL, dummyR, bufferIndex, runEnd, params, volume, sampleRate, volCap);
	} else {
		state.processBlock(left, right, leftUnfiltered, rightUnfiltered, bufferIndex, runEnd, params, volume, sampleRate, volCap);
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
