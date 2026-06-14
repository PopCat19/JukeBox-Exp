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
}
