// schema.ts
//
// Purpose: FM parameter schema — drives UI, changes, and serde
//
// This module:
// - Defines FM-specific params: algorithm, feedbackType, feedbackAmplitude

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
			max: Math.max(0, Config.algorithms.length - 1),
			tip: "Select FM algorithm",
			category: "fm",
		},
		{
			key: "feedbackType",
			label: "Feedback",
			type: "int",
			defaultValue: 0,
			min: 0,
			max: Math.max(0, Config.feedbacks.length - 1),
			tip: "Select feedback type",
			category: "fm",
		},
		{
			key: "feedbackAmplitude",
			label: "FB Amplitude",
			type: "int",
			defaultValue: 0,
			min: 0,
			max: 7,
			tip: "Feedback amplitude",
			category: "fm",
		},
	],
	groups: [{ label: "FM", params: ["algorithm", "feedbackType", "feedbackAmplitude"] }],
};
