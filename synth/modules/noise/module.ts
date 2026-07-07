// module.ts
//
// Purpose: Noise InstrumentModule implementation
//
// This module:
// - Implements the S1 socket contract as InstrumentModule
// - Bridges to existing SynthPlugin system via synth/plugins/noise.ts

import type { InstrumentModule, SynthBuildContext } from "../../socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../socket/serde";
import { SOCKET_VERSION } from "../../socket/version";
import { schema } from "./schema";
import { buildNoiseSource } from "./dsp";
import { deserialize, serialize } from "./serde";

const MODULE_ID = "core.noise";
const MAX_NOISE_VOICES = 32;

const noiseModule: InstrumentModule = {
	id: MODULE_ID,
	socketVersion: SOCKET_VERSION,
	displayName: "Noise",
	capabilities: {
		hasChord: true,
		hasEnvelopes: true,
		hasUnison: true,
		hasNoteFilter: true,
		hasEffects: true,
	},
	schema,

	buildSynthSource(_ctx: SynthBuildContext): string {
		return buildNoiseSource(MAX_NOISE_VOICES);
	},

	serialize(params: Record<string, unknown>, w: FieldWriter): void {
		serialize({ chipNoise: (params.chipNoise as number) ?? 1 }, w);
	},

	deserialize(r: FieldReader, _version: number): Record<string, unknown> {
		return { ...deserialize(r, _version) };
	},

	initialize(): Record<string, unknown> {
		return { chipNoise: 1 };
	},
};

export default noiseModule;
export { MODULE_ID };
