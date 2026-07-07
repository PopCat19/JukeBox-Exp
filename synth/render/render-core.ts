// core.ts
//
// Purpose: Pure render tick function — takes a SongSnapshot + RenderState, produces audio
//
// This module:
// - Defines RenderState (mutable state owned by the render core)
// - Defines renderTick() signature and RenderResult/RenderTelemetry types
// - Phase 1 will extract synthesize() logic into this pure function
// - No Song reference, no DOM/AudioContext, no mutable imports beyond state

import type { SongSnapshot } from "./snapshot";

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
	prevBar: number | null;

	// Per-channel audio accumulation ring buffers
	// (initialized from snapshot channel count, sized by sample rate × max tick)
	channelRingBuffers: Float32Array[];
	channelRingPositions: number[];

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
		prevBar: null,

		channelRingBuffers: [],
		channelRingPositions: [],

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

// ── RenderTick (pure function stub — Phase 1 extraction target) ──────────

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
