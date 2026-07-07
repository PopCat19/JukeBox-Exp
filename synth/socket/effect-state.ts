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

/** Max state buffer size in float32 samples (256 KiB) */
export const MAX_STATE_BUFFER_SIZE = 65536;

/** Max delay line length in samples (~10 s at 48 kHz) */
export const MAX_DELAY_LINE_LENGTH = 524288;

/** Max delay line count */
export const MAX_DELAY_LINE_COUNT = 64;

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
 * Validate a descriptor and return an error string, or null if valid.
 */
export function validateDescriptor(
	desc: EffectStateDescriptor | undefined,
): string | null {
	if (desc === undefined) return null;
	const { stateBufferSize, delayLineCount, delayLineLength } = desc;

	if (!Number.isFinite(stateBufferSize) || stateBufferSize < 0 || !Number.isInteger(stateBufferSize)) {
		return `stateBufferSize must be a non-negative integer, got ${stateBufferSize}`;
	}
	if (stateBufferSize > MAX_STATE_BUFFER_SIZE) {
		return `stateBufferSize ${stateBufferSize} exceeds max ${MAX_STATE_BUFFER_SIZE}`;
	}

	if (!Number.isFinite(delayLineCount) || delayLineCount < 0 || !Number.isInteger(delayLineCount)) {
		return `delayLineCount must be a non-negative integer, got ${delayLineCount}`;
	}
	if (delayLineCount > MAX_DELAY_LINE_COUNT) {
		return `delayLineCount ${delayLineCount} exceeds max ${MAX_DELAY_LINE_COUNT}`;
	}

	if (!Number.isFinite(delayLineLength) || delayLineLength < 0 || !Number.isInteger(delayLineLength)) {
		return `delayLineLength must be a non-negative integer, got ${delayLineLength}`;
	}
	if (delayLineLength > MAX_DELAY_LINE_LENGTH) {
		return `delayLineLength ${delayLineLength} exceeds max ${MAX_DELAY_LINE_LENGTH}`;
	}

	return null;
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
/**
 * Allocate per-instance state for a module.
 * Returns a zero-initialized EffectInstanceContext.
 * Calls module.initializeState() if present.
 * Throws if the descriptor has invalid values.
 */
export function createEffectInstanceState(
	module: EffectModule,
	sampleRate: number,
	blockSize: number,
	channelCount: number,
): EffectInstanceContext {
	const desc = module.stateDescriptor;
	const err = validateDescriptor(desc);
	if (err) {
		throw new RangeError(`[effect-state] Invalid descriptor for "${module.id}": ${err}`);
	}
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
