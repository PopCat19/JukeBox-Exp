// effect-state.ts
//
// Purpose: Per-instance state model for S2 EffectModule — declares and allocates
//          runtime state needed by effect DSP (delay lines, filter state, accumulators)
//
// This module:
// - EffectStateDescriptor: what the module declares it needs
// - EffectInstanceContext: what the host allocates and passes at runtime
// - createEffectInstanceState: factory that allocates from descriptor
// - resetEffectInstanceState: clear state between songs or on panic
//
// Why this exists:
// - Instruments get per-voice state from the synth engine (voice allocation, envelopes)
// - Effects need per-instance buffers that persist across blocks (delay lines, filter state)
// - The host owns allocation; the module owns initialization
// - Stateless effects (distortion, panning) declare zero state

import type { EffectModule } from "./effect-module";

/**
 * What a module declares it needs for per-instance runtime state.
 * Set to undefined or omit to declare stateless.
 */
export interface EffectStateDescriptor {
	/**
	 * Size of the general-purpose state buffer in float32 samples.
	 * Used for filter biquad state, phase accumulators, LFO phase, etc.
	 */
	readonly stateBufferSize: number;
	/**
	 * Number of delay-line-style buffers needed.
	 * Each delay line is zero-initialized and persists across blocks.
	 */
	readonly delayLineCount: number;
	/**
	 * Length of each delay line in samples.
	 * All delay lines share the same length in this model.
	 * If an effect needs mixed lengths, encode as multiple entries or
	 * use the general state buffer for short ones.
	 */
	readonly delayLineLength: number;
}

/**
 * Runtime state container allocated by the host for one effect instance.
 * Passed to EffectModule.initializeState() and accessible in generated DSP code.
 */
export interface EffectInstanceContext {
	/** The module this state belongs to */
	readonly module: EffectModule;
	/** Host audio parameters */
	readonly sampleRate: number;
	readonly blockSize: number;
	readonly channelCount: number;
	/**
	 * General-purpose state buffer, zero-initialized.
	 * Module maps its own fields onto this array via named offsets.
	 * Size matches EffectStateDescriptor.stateBufferSize.
	 */
	readonly stateBuffer: Float32Array;
	/**
	 * Delay-line buffers, each zero-initialized.
	 * Count and length match EffectStateDescriptor.
	 */
	readonly delayLines: readonly Float32Array[];
}

/**
 * Allocate per-instance state for a module.
 * Returns a zero-initialized EffectInstanceContext.
 * Calls module.initializeState() if present.
 */
export function createEffectInstanceState(
	module: EffectModule,
	sampleRate: number,
	blockSize: number,
	channelCount: number,
): EffectInstanceContext {
	const desc = module.stateDescriptor;
	const stateBuffer = new Float32Array(desc?.stateBufferSize ?? 0);
	const delayLines: Float32Array[] = [];
	if (desc) {
		for (let i = 0; i < desc.delayLineCount; i++) {
			delayLines.push(new Float32Array(desc.delayLineLength));
		}
	}
	const ctx: EffectInstanceContext = {
		module,
		sampleRate,
		blockSize,
		channelCount,
		stateBuffer,
		delayLines,
	};
	module.initializeState?.(ctx);
	return ctx;
}

/**
 * Reset all state buffers to zero.
 * Useful when clearing state between songs or after a panic.
 * Does NOT call initializeState again — only zeroes memory.
 */
export function resetEffectInstanceState(ctx: EffectInstanceContext): void {
	ctx.stateBuffer.fill(0);
	for (const dl of ctx.delayLines) {
		dl.fill(0);
	}
}
