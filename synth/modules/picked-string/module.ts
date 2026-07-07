// module.ts
//
// Purpose: Picked-string InstrumentModule implementation

import type { InstrumentModule, SynthBuildContext } from "../../socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../socket/serde";
import { SOCKET_VERSION } from "../../socket/version";
import { buildPickedStringSource } from "./dsp";
import { schema } from "./schema";
import type { PickedStringParams } from "./serde";
import { deserialize, serialize } from "./serde";

const MODULE_ID = "core.pickedString";
const MAX_PS_VOICES = 3;

const pickedStringModule: InstrumentModule = {
	id: MODULE_ID,
	socketVersion: SOCKET_VERSION,
	displayName: "Picked String",
	capabilities: {
		hasHarmonics: true,
		hasStringSustain: true,
		hasChord: true,
		hasEnvelopes: true,
		hasUnison: true,
		hasNoteFilter: true,
		hasEffects: true,
	},
	schema,

	buildSynthSource(_ctx: SynthBuildContext): string {
		return buildPickedStringSource(MAX_PS_VOICES);
	},

	serialize(params: Record<string, unknown>, w: FieldWriter): void {
		serialize(params as unknown as PickedStringParams, w);
	},

	deserialize(r: FieldReader, _version: number): Record<string, unknown> {
		return { ...deserialize(r, _version) };
	},

	initialize(): Record<string, unknown> {
		return {};
	},
};

export default pickedStringModule;
export { MODULE_ID };
