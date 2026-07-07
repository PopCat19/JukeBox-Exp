// module.ts
//
// Purpose: Modulator channel InstrumentModule implementation
//
// This module:
// - Special instrument with no DSP code generation
// - Runtime delegates to Synth.runModSynth via bridge override

import type { InstrumentModule, SynthBuildContext } from "../../socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../socket/serde";
import { SOCKET_VERSION } from "../../socket/version";
import { schema } from "./schema";

const MODULE_ID = "core.mod";

const modModule: InstrumentModule = {
	id: MODULE_ID,
	socketVersion: SOCKET_VERSION,
	displayName: "Mod",
	capabilities: {
		isMod: true,
		hasEnvelopes: false,
		hasUnison: false,
		hasNoteFilter: false,
		hasEffects: false,
		hasChord: false,
	},
	schema,

	buildSynthSource(_ctx: SynthBuildContext): string {
		return "return (synth, bufferIndex, runLength, tone, instrumentState) => {}";
	},

	serialize(_params: Record<string, unknown>, _w: FieldWriter): void {},

	deserialize(_r: FieldReader, _version: number): Record<string, unknown> {
		return {};
	},

	initialize(): Record<string, unknown> {
		return {};
	},
};

export default modModule;
export { MODULE_ID };
