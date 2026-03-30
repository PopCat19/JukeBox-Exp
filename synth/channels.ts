// Channels
//
// Purpose: Defines the Channel class for grouping instruments, patterns, and bars
//
// This module:
// - Stores per-channel instrument and pattern arrays
// - Tracks mute state and channel naming

import type { Instrument } from "./instruments";
import type { Pattern } from "./notes";

export class Channel {
	public octave: number = 0;
	public readonly instruments: Instrument[] = [];
	public readonly patterns: Pattern[] = [];
	public readonly bars: number[] = [];
	public muted: boolean = false;
	public name: string = "";
}
