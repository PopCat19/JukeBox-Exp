// channel-state.ts
//
// Purpose: Per-channel synthesis state container
//
// This module:
// - Groups instrument states by channel
// - Tracks per-channel volume levels

import type { InstrumentState } from "./instrument-state";

export class ChannelState {
	public readonly instruments: InstrumentState[] = [];
	public muted: boolean = false;
	public singleSeamlessInstrument: number | null = null; // Seamless tones from a pattern with a single instrument can be transferred to a different single seamless instrument in the next pattern.
	public volumeCap: number = 0.0;
	// Per-channel audio capture for CVV real FFT spectrum
	public readonly audioRing: Float32Array = new Float32Array(8192);
	public audioRingPos: number = 0;
	// Scratch buffer sized to max output buffer length x2 (L+R interleaved, pre-allocated, no hot-path allocation)
	public readonly audioScratch: Float32Array = new Float32Array(8192);
}
