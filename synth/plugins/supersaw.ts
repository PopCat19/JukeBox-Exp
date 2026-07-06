// supersaw.ts
//
// Purpose: Supersaw plugin registration via InstrumentModule bridge
//
// This module:
// - Imports the InstrumentModule from synth/modules/supersaw/
// - Registers it via the socket bridge to both old and new registries
// - Keeps cached function compilation for performance

import { Synth } from "../synth";
import { Config, InstrumentType } from "../synth-config";
import { buildSupersawSource } from "../synthesis/supersaw";
import type { Instrument } from "../instruments";
import supersawModule from "../modules/supersaw/module";
import { registerModuleAsPlugin } from "../socket/bridge";

const functionCache: Function[] = Array(1).fill(undefined);

function supersawSynth(
	synth: Synth,
	bufferIndex: number,
	runLength: number,
	tone: any,
	instrumentState: any,
): void {
	const voiceCount: number = Config.supersawVoiceCount | 0;
	let fn: Function = functionCache[0];
	if (fn === undefined) {
		const source: string = buildSupersawSource(voiceCount);
		fn = new Function("Config", "Synth", source)(Config, Synth);
		functionCache[0] = fn;
	}
	fn(synth, bufferIndex, runLength, tone, instrumentState);
}

function bridgedGetSynthFunction(_instrument: Instrument, _synth: typeof Synth): Function {
	return supersawSynth;
}

// Register via bridge: new socket registry + old plugin registry
registerModuleAsPlugin(supersawModule, InstrumentType.supersaw, [
	"supersaw",
	"pulseWidth",
], {
	getSynthFunction: bridgedGetSynthFunction,
});
