// synth/plugins/fm6.ts
//
// Purpose: 6-operator FM synthesis plugin

import type { Instrument } from "../instruments";
import type { Synth } from "../synth";
import { Config, InstrumentType } from "../synth-config";
import { buildFm6Source } from "../synthesis/fm6";
import { registerPlugin } from "./registry";

const cache: Map<string, Function> = new Map();

function getSynthFunction(instrument: Instrument, synth: typeof Synth): Function {
	const fingerprint: string = instrument.customAlgorithm.name + "_" + instrument.customFeedbackType.name;
	if (!cache.has(fingerprint)) {
		const source: string = buildFm6Source(instrument);
		cache.set(fingerprint, new Function("Config", "Synth", source)(Config, synth));
	}
	return cache.get(fingerprint)!;
}

registerPlugin({
	type: InstrumentType.fm6op,
	name: "FM6",
	displayName: "FM (6-op)",
	editorRows: ["fm", "fm6"],
	initialize: (instrument: Instrument) => {
		instrument.chord = 3;
		instrument.algorithm6Op = 1;
		instrument.feedbackType6Op = 1;
		instrument.customAlgorithm.fromPreset(1);
		instrument.feedbackAmplitude = 0;
		for (let i = 0; i < instrument.operators.length; i++) {
			instrument.operators[i].reset(i);
		}
	},
	getSynthFunction,
	buildSource: (instrument: Instrument) => buildFm6Source(instrument),
});
