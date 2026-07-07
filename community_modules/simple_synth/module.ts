// community_modules/simple_synth/module.ts
//
// Purpose: Reference community InstrumentModule — minimal sine oscillator
//
// This module:
// - Demonstrates the S1 socket contract from outside the core tree
// - Loaded via synth/socket/external-loader.ts at runtime
// - Useful as a template for new community module authors

import type { InstrumentModule, SynthBuildContext } from "../../synth/socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../synth/socket/serde";
import { SOCKET_VERSION } from "../../synth/socket/version";
import { buildSimpleSynthSource } from "./dsp";
import { deserialize, serialize } from "./serde";
import { schema } from "./schema";

const MODULE_ID = "community.simple.synth";

const simpleSynthModule: InstrumentModule = {
	id: MODULE_ID,
	socketVersion: SOCKET_VERSION,
	displayName: "Simple Sine",
	capabilities: {
		hasChord: false,
		hasEnvelopes: false,
		hasUnison: false,
		hasNoteFilter: false,
		hasEffects: false,
	},
	schema,

	buildSynthSource(_ctx: SynthBuildContext): string {
		return buildSimpleSynthSource();
	},

	serialize(params: Record<string, unknown>, w: FieldWriter): void {
		serialize({ frequency: (params.frequency as number) ?? 440 }, w);
	},

	deserialize(r: FieldReader, _version: number): Record<string, unknown> {
		return { ...deserialize(r, _version) };
	},

	initialize(): Record<string, unknown> {
		return { frequency: 440 };
	},
};

export default simpleSynthModule;
export { MODULE_ID };
