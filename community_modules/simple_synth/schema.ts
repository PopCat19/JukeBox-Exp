// community_modules/simple_synth/schema.ts
//
// Purpose: Parameter schema for the simple_synth community module
//
// This module:
// - Defines a single frequency param with a sensible range
// - Kept minimal on purpose: it is the example for new community authors

import type { ParamSchema } from "../../synth/socket/param-schema";

export const schema: ParamSchema = {
	params: [
		{
			key: "frequency",
			label: "Frequency",
			type: "int",
			defaultValue: 440,
			min: 20,
			max: 20000,
			step: 1,
			units: "Hz",
			tip: "Output sine frequency in Hz",
			category: "osc",
		},
	],
	groups: [{ label: "Oscillator", params: ["frequency"] }],
};
