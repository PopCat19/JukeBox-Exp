// module.ts
//
// Purpose: Chip wave InstrumentModule implementation
//
// This module:
// - Implements the S1 socket contract as InstrumentModule
// - Bridges to existing SynthPlugin system via synth/plugins/chip.ts

import type { InstrumentModule, SynthBuildContext } from "../../socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../socket/serde";
import { SOCKET_VERSION } from "../../socket/version";
import { buildChipSource } from "./dsp";
import { schema } from "./schema";
import { deserialize, serialize } from "./serde";

const MODULE_ID = "core.chip";
const MAX_CHIP_VOICES = 32;

const chipModule: InstrumentModule = {
	id: MODULE_ID,
	socketVersion: SOCKET_VERSION,
	displayName: "Chip",
	capabilities: {
		hasAliasableWaveform: true,
		hasWaveSelect: true,
		hasLoopControls: true,
		hasChord: true,
		hasEnvelopes: true,
		hasUnison: true,
		hasNoteFilter: true,
		hasEffects: true,
	},
	schema,

	buildSynthSource(_ctx: SynthBuildContext): string {
		return buildChipSource(MAX_CHIP_VOICES);
	},

	serialize(params: Record<string, unknown>, w: FieldWriter): void {
		serialize(
			{
				chipWave: (params.chipWave as number) ?? 0,
				chipNoise: (params.chipNoise as number) ?? 0,
			},
			w,
		);
	},

	deserialize(r: FieldReader, _version: number): Record<string, unknown> {
		return { ...deserialize(r, _version) };
	},

	initialize(): Record<string, unknown> {
		return { chipWave: 0, chipNoise: 0 };
	},
};

export default chipModule;
export { MODULE_ID };
