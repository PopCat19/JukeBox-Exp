// schema.ts
//
// Purpose: Noise parameter schema — drives UI, changes, and serde
//
// This module:
// - Defines noise-specific params with ranges and defaults

import type { ParamSchema } from "../../socket/param-schema";
import { Config } from "../../synth-config";

export const schema: ParamSchema = {
	params: [
		{
			key: "chipNoise",
			label: "Noise",
			type: "int",
			defaultValue: 1,
			min: 0,
			max: Math.max(0, Config.chipNoises.length - 1),
			tip: "Select noise timbre",
			category: "noise",
		},
	],
	groups: [{ label: "Noise", params: ["chipNoise"] }],
};
