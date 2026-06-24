// supersaw.ts
//
// Purpose: Supersaw synthesis plugin — compiled-function + per-voice cache
//
// This module:
// - Embeds private-scale build/compile/cache per unison voice
// - Registers via plugin registry on module load

import type { Instrument } from "../instruments";
import { Synth } from "../synth";
import { Config, InstrumentType } from "../synth-config";
import { InstrumentState } from "../instrument-state";
import type { Tone } from "../tone";
import { buildSupersawSource } from "../synthesis/supersaw";
import { registerPlugin } from "./registry";

const functionCache: Function[] = Array(1).fill(undefined);

function supersawSynth(synth: Synth, bufferIndex: number, runLength: number, tone: Tone, instrumentState: InstrumentState): void {
	const voiceCount: number = Config.supersawVoiceCount | 0;
	let fn: Function = functionCache[0];
	if (fn === undefined) {
		const source: string = buildSupersawSource(voiceCount);
		fn = new Function("Config", "Synth", source)(Config, Synth);
		functionCache[0] = fn;
	}
	fn(synth, bufferIndex, runLength, tone, instrumentState);
}

registerPlugin({
	type: InstrumentType.supersaw,
	name: "Supersaw",
	displayName: "supersaw",
	editorRows: ["supersaw", "pulseWidth"],
	initialize: (instrument: Instrument) => {
		instrument.chord = Config.chords.dictionary.arpeggio.index;
		instrument.supersawDynamism = Config.supersawDynamismMax;
		instrument.supersawSpread = Math.ceil(Config.supersawSpreadMax / 2.0);
		instrument.supersawShape = 0;
		instrument.pulseWidth = Config.pulseWidthRange - 1;
		instrument.decimalOffset = 0;
	},
	getSynthFunction: (_instrument: Instrument, _synth: typeof Synth) => supersawSynth,
	buildSource: (_instrument: Instrument, voiceCount?: number) => buildSupersawSource(voiceCount ?? 0),
});
