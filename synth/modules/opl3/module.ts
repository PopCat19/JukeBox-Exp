// module.ts
//
// Purpose: OPL3 InstrumentModule implementation (4-operator, OPL3-style)
//
// This module:
// - Implements the S1 socket contract as InstrumentModule
// - Bridges to existing SynthPlugin system via synth/plugins/opl3.ts
// - Bridge override handles algorithm-dependent function caching

import type { InstrumentModule, SynthBuildContext } from "../../socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../socket/serde";
import { SOCKET_VERSION } from "../../socket/version";
import { buildOpl3Source } from "./dsp";
import { schema } from "./schema";
import { deserialize, serialize } from "./serde";

const MODULE_ID = "core.opl3";

const opl3Module: InstrumentModule = {
	id: MODULE_ID,
	socketVersion: SOCKET_VERSION,
	displayName: "OPL3",
	capabilities: {
		isFm: true,
		hasChord: true,
		hasEnvelopes: true,
		hasUnison: true,
		hasNoteFilter: true,
		hasEffects: true,
	},
	schema,

	buildSynthSource(_ctx: SynthBuildContext): string {
		const instrument = {
			opl3Algorithm: 0,
			feedbackAmplitude: 0,
			operators: Array.from({ length: 4 }, () => ({
				frequency: 0,
				amplitude: 0,
				wave: 0,
				pulseWidth: 0,
			})),
		};
		return buildOpl3Source(instrument as any);
	},

	serialize(params: Record<string, unknown>, w: FieldWriter): void {
		serialize(
			{
				algorithm: (params.opl3Algorithm as number) ?? (params.algorithm as number) ?? 0,
				feedbackAmplitude: (params.feedbackAmplitude as number) ?? 0,
			},
			w,
		);
	},

	deserialize(r: FieldReader, _version: number): Record<string, unknown> {
		const params = deserialize(r, _version);
		return { opl3Algorithm: params.algorithm, feedbackAmplitude: params.feedbackAmplitude };
	},

	initialize(): Record<string, unknown> {
		return { opl3Algorithm: 0, feedbackAmplitude: 0 };
	},
};

export default opl3Module;
export { MODULE_ID };
