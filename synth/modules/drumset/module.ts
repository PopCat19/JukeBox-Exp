// module.ts
//
// Purpose: Drumset InstrumentModule implementation

import type { InstrumentModule, SynthBuildContext } from "../../socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../socket/serde";
import { SOCKET_VERSION } from "../../socket/version";
import { schema } from "./schema";
import { buildDrumSource } from "./dsp";

const MODULE_ID = "core.drumset";
const MAX_DRUM_VOICES = 32;

const drumsetModule: InstrumentModule = {
	id: MODULE_ID,
	socketVersion: SOCKET_VERSION,
	displayName: "Drumset",
	capabilities: {
		isDrumset: true,
		hasChord: true,
		hasEnvelopes: true,
		hasUnison: true,
		hasNoteFilter: true,
		hasEffects: true,
	},
	schema,

	buildSynthSource(_ctx: SynthBuildContext): string {
		return buildDrumSource(MAX_DRUM_VOICES);
	},

	serialize(_params: Record<string, unknown>, _w: FieldWriter): void {},

	deserialize(_r: FieldReader, _version: number): Record<string, unknown> {
		return {};
	},

	initialize(): Record<string, unknown> {
		return {};
	},
};

export default drumsetModule;
export { MODULE_ID };
