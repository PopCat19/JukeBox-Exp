// module.ts
//
// Purpose: Placeholder InstrumentModule for unknown/unresolved module IDs
//
// This module:
// - Returns a zero-output synth source for any unresolved module ID
// - Preserves opaque payload for lossless round-trip
// - Rendered as grayed instrument in the editor

import type { InstrumentModule, SynthBuildContext } from "../../socket/instrument-module";
import type { FieldReader, FieldWriter } from "../../socket/serde";
import { SOCKET_VERSION } from "../../socket/version";

const PLACEHOLDER_ID = "core.placeholder";

function makeId(originalId: string): string {
	return `${PLACEHOLDER_ID}:${originalId}`;
}

export function createPlaceholderModule(originalId: string): InstrumentModule {
	const stampedId = makeId(originalId);
	return {
		id: stampedId,
		socketVersion: SOCKET_VERSION,
		displayName: `[${originalId}]`,
		capabilities: {},
		schema: { params: [] },

		buildSynthSource(_ctx: SynthBuildContext): string {
			return "return (synth, bufferIndex, runLength, tone, instrumentState) => {}";
		},

		serialize(_params: Record<string, unknown>, _w: FieldWriter): void {
			// Placeholder has nothing to serialize beyond the opaque payload
		},

		deserialize(_r: FieldReader, _version: number): Record<string, unknown> {
			return {};
		},
	};
}

export function isPlaceholderId(id: string): boolean {
	return id.startsWith(`${PLACEHOLDER_ID}:`);
}

export function unwrapPlaceholderId(id: string): string | null {
	if (!isPlaceholderId(id)) return null;
	return id.slice(PLACEHOLDER_ID.length + 1);
}
