// module.ts
//
// Purpose: FM InstrumentModule implementation (4-operator)
//
// This module:
// - Implements the S1 socket contract as InstrumentModule
// - Bridges to existing SynthPlugin system via synth/plugins/fm.ts
// - Bridge override handles algorithm-dependent function caching

import type { InstrumentModule, SynthBuildContext } from "../../socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../socket/serde";
import { SOCKET_VERSION } from "../../socket/version";
import { buildFmSource } from "./dsp";
import { schema } from "./schema";
import { deserialize, serialize } from "./serde";

const MODULE_ID = "core.fm";

const fmModule: InstrumentModule = {
	id: MODULE_ID,
	socketVersion: SOCKET_VERSION,
	displayName: "FM",
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
		// Bridge override provides algorithm-dependent caching at runtime.
		// Fallback: minimal instrument stub for the build
		const instrument = {
			algorithm: 0,
			feedbackType: 0,
			feedbackAmplitude: 0,
			operators: Array.from({ length: 4 }, () => ({
				frequency: 0,
				amplitude: 0,
				wave: 0,
				pulseWidth: 0,
			})),
		};
		return buildFmSource(instrument as any);
	},

	serialize(params: Record<string, unknown>, w: FieldWriter): void {
		serialize(
			{
				algorithm: (params.algorithm as number) ?? 0,
				feedbackType: (params.feedbackType as number) ?? 0,
				feedbackAmplitude: (params.feedbackAmplitude as number) ?? 0,
			},
			w,
		);
	},

	deserialize(r: FieldReader, _version: number): Record<string, unknown> {
		return { ...deserialize(r, _version) };
	},

	initialize(): Record<string, unknown> {
		return { algorithm: 0, feedbackType: 0, feedbackAmplitude: 0 };
	},
};

export default fmModule;
export { MODULE_ID };
