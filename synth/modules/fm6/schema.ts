// schema.ts
//
// Purpose: FM6 parameter schema

import type { ParamSchema } from "../../socket/param-schema";
import { Config } from "../../synth-config";

export const schema: ParamSchema = {
	params: [
		{
			key: "algorithm6Op",
			label: "Algorithm",
			type: "int",
			defaultValue: 1,
			min: 0,
			max: Math.max(0, Config.algorithms6Op.length - 1),
			tip: "Select 6-op FM algorithm",
			category: "fm6",
		},
		{
			key: "feedbackType6Op",
			label: "Feedback",
			type: "int",
			defaultValue: 1,
			min: 0,
			max: Math.max(0, Config.feedbacks6Op.length - 1),
			tip: "Select 6-op feedback type",
			category: "fm6",
		},
		{
			key: "feedbackAmplitude",
			label: "FB Amplitude",
			type: "int",
			defaultValue: 0,
			min: 0,
			max: 7,
			tip: "Feedback amplitude",
			category: "fm6",
		},
	],
	groups: [{ label: "FM6", params: ["algorithm6Op", "feedbackType6Op", "feedbackAmplitude"] }],
};
