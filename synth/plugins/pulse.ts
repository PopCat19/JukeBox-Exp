// pulse.ts
//
// Purpose: Pulse width modulation synthesis plugin — compiled-function + per-voice cache
//
// This module:
// - Embeds private-scale build/compile/cache per unison voice
// - Registers via plugin registry on module load

import type { Instrument } from "../instruments";
import { Synth } from "../synth";
import { Config, InstrumentType } from "../synth-config";
import { InstrumentState } from "../instrument-state";
import type { Tone } from "../tone";
import { buildPulseWidthSource } from "../synthesis/pulse";
import { registerPlugin } from "./registry";

const functionCache: Function[] = [];

function pulseWidthSynth(synth: Synth, bufferIndex: number, roundedSamplesPerTick: number, tone: Tone, instrumentState: InstrumentState): void {
	const voiceCount: number = Math.max(2, instrumentState.unisonVoices);
	let fn: Function = functionCache[instrumentState.unisonVoices];
	if (fn === undefined) {
		const source: string = buildPulseWidthSource(voiceCount);
		fn = new Function("Config", "Synth", source)(Config, Synth);
		functionCache[instrumentState.unisonVoices] = fn;
	}
	fn(synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState);
}

registerPlugin({
	type: InstrumentType.pwm,
	name: "Pulse Width",
	displayName: "pulse width",
	editorRows: ["pulseWidth"],
	initialize: (instrument: Instrument) => {
		instrument.chord = Config.chords.dictionary.arpeggio.index;
		instrument.pulseWidth = Config.pulseWidthRange;
		instrument.decimalOffset = 0;
	},
	getSynthFunction: (_instrument: Instrument, _synth: typeof Synth) => pulseWidthSynth,
	buildSource: (_instrument: Instrument, voiceCount?: number) => buildPulseWidthSource(voiceCount ?? 0),
});
