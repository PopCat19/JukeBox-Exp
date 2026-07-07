// schema.ts
//
// Purpose: Custom chip wave parameter schema — drives UI, changes, and serde
//
// This module:
// - Defines customChipWave-specific params for serialization
// - No wave selector in UI — wave is edited visually via the custom wave editor

import type { ParamSchema } from "../../socket/param-schema";

export const schema: ParamSchema = {
	params: [
		{
			key: "chipWave",
			label: "Wave index",
			type: "int",
			defaultValue: 2,
			min: 0,
			max: 255,
			tip: "Underlying wave index (serialized with custom wave data)",
			category: "chip",
		},
	],
	groups: [],
};
