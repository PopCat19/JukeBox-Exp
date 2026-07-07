// module.ts
//
// Purpose: Harmonics InstrumentModule implementation
//
// This module:
// - Implements the S1 socket contract as InstrumentModule
// - Bridges to existing SynthPlugin system via synth/plugins/harmonics.ts

import type { InstrumentModule, SynthBuildContext } from "../../socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../socket/serde";
import { SOCKET_VERSION } from "../../socket/version";
import { buildHarmonicsSource } from "./dsp";
import { schema } from "./schema";
import type { HarmonicsParams } from "./serde";
import { deserialize, serialize } from "./serde";

const MODULE_ID = "core.harmonics";
const MAX_HARMONICS_VOICES = 32;

const harmonicsModule: InstrumentModule = {
	id: MODULE_ID,
	socketVersion: SOCKET_VERSION,
	displayName: "Harmonics",
	capabilities: {
		hasHarmonics: true,
		hasChord: true,
		hasEnvelopes: true,
		hasUnison: true,
		hasNoteFilter: true,
		hasEffects: true,
	},
	schema,

	buildSynthSource(_ctx: SynthBuildContext): string {
		return buildHarmonicsSource(MAX_HARMONICS_VOICES);
	},

	serialize(params: Record<string, unknown>, w: FieldWriter): void {
		serialize(params as unknown as HarmonicsParams, w);
	},

	deserialize(r: FieldReader, _version: number): Record<string, unknown> {
		return { ...deserialize(r, _version) };
	},

	initialize(): Record<string, unknown> {
		return {};
	},
};

export default harmonicsModule;
export { MODULE_ID };
