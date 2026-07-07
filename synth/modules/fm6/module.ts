// module.ts
//
// Purpose: FM6 (6-operator) InstrumentModule implementation

import type { InstrumentModule, SynthBuildContext } from "../../socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../socket/serde";
import { SOCKET_VERSION } from "../../socket/version";
import { Config } from "../../synth-config";
import { buildFm6Source } from "./dsp";
import { schema } from "./schema";
import { deserialize, serialize } from "./serde";

const MODULE_ID = "core.fm6";

const fm6Module: InstrumentModule = {
	id: MODULE_ID,
	socketVersion: SOCKET_VERSION,
	displayName: "FM6",
	capabilities: {
		isFm: true,
		isFm6: true,
		hasChord: true,
		hasEnvelopes: true,
		hasUnison: true,
		hasNoteFilter: true,
		hasEffects: true,
	},
	schema,

	buildSynthSource(_ctx: SynthBuildContext): string {
		const alg = Config.algorithms6Op[1];
		const fb = Config.feedbacks6Op[1];
		const instrument = {
			algorithm6Op: 1,
			feedbackType6Op: 1,
			feedbackAmplitude: 0,
			customAlgorithm: alg ?? {
				fromPreset: () => {},
				name: "",
				modulatedBy: [[], [], [], [], [], []],
			},
			customFeedbackType: fb ?? { fromPreset: () => {}, name: "" },
			operators: Array.from({ length: 6 }, () => ({})),
		};
		return buildFm6Source(instrument as any);
	},

	serialize(params: Record<string, unknown>, w: FieldWriter): void {
		serialize(
			{
				algorithm6Op: (params.algorithm6Op as number) ?? 1,
				feedbackType6Op: (params.feedbackType6Op as number) ?? 1,
				feedbackAmplitude: (params.feedbackAmplitude as number) ?? 0,
			},
			w,
		);
	},

	deserialize(r: FieldReader, _version: number): Record<string, unknown> {
		return { ...deserialize(r, _version) };
	},

	initialize(): Record<string, unknown> {
		return { algorithm6Op: 1, feedbackType6Op: 1, feedbackAmplitude: 0 };
	},
};

export default fm6Module;
export { MODULE_ID };
