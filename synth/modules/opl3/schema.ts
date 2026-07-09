// schema.ts
//
// Purpose: OPL3 parameter schema — drives UI, changes, and serde
//
// This module:
// - Defines OPL3-specific params: algorithm, feedbackAmplitude

import type { ParamSchema } from "../../socket/param-schema";
import { Config } from "../../synth-config";

export const schema: ParamSchema = {
	params: [
		{
			key: "algorithm",
			label: "Algorithm",
			type: "int",
			defaultValue: 0,
			min: 0,
			max: Math.max(0, Config.algorithmsOpl3.length - 1),
			tip: "Select OPL3 4-op algorithm",
			category: "opl3",
		},
		{
			key: "feedbackAmplitude",
			label: "FB Amount",
			type: "int",
			defaultValue: 0,
			min: 0,
			max: 15,
			tip: "Feedback amplitude for operator 4",
			category: "opl3",
		},
	],
	groups: [{ label: "OPL3", params: ["algorithm", "feedbackAmplitude"] }],
};
