// pulse.ts
//
// Purpose: Pulse width modulation synthesis plugin — bridges from socket InstrumentModule
//
// This module:
// - Bridges pulseModule as a SynthPlugin for backward compat
// - Preserves per-unison-voice function caching

import { InstrumentState } from "../instrument-state";
import type { Instrument } from "../instruments";
import { Synth } from "../synth";
import { Config, InstrumentType } from "../synth-config";
import { buildPulseWidthSource } from "../synthesis/pulse";
import type { Tone } from "../tone";
import { registerModuleAsPlugin } from "../socket/bridge";
import pulseModule from "../modules/pulse/module";

const functionCache: Function[] = [];

function pulseWidthSynth(
	synth: Synth,
	bufferIndex: number,
	roundedSamplesPerTick: number,
	tone: Tone,
	instrumentState: InstrumentState,
): void {
	const voiceCount: number = Math.max(2, instrumentState.unisonVoices);
	let fn: Function = functionCache[instrumentState.unisonVoices];
	if (fn === undefined) {
		const source: string = buildPulseWidthSource(voiceCount);
		fn = new Function("Config", "Synth", source)(Config, Synth);
		functionCache[instrumentState.unisonVoices] = fn;
	}
	fn(synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState);
}

registerModuleAsPlugin(pulseModule, InstrumentType.pwm, ["pulseWidth"], {
	getSynthFunction: (_instrument: Instrument, _synth: typeof Synth) => pulseWidthSynth,
	initialize: (instrument: Instrument) => {
		instrument.chord = Config.chords.dictionary.arpeggio.index;
		instrument.pulseWidth = Config.pulseWidthRange;
		instrument.decimalOffset = 0;
	},
});
