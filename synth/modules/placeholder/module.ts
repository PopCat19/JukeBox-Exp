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
const OPAQUE_KEY = "_opaqueBytes";

function makeId(originalId: string): string {
	return `${PLACEHOLDER_ID}:${originalId}`;
}

function getOpaque(params: Record<string, unknown>): number[] {
	const raw = params[OPAQUE_KEY];
	if (raw instanceof Uint8Array) return Array.from(raw);
	if (Array.isArray(raw)) return raw as number[];
	return [];
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

		serialize(params: Record<string, unknown>, w: FieldWriter): void {
			const opaque = getOpaque(params);
			if (opaque.length > 0) {
				w.writeBlob(OPAQUE_KEY, new Uint8Array(opaque));
			}
		},

		deserialize(r: FieldReader, _version: number): Record<string, unknown> {
			const blob = r.readBlob(OPAQUE_KEY);
			if (blob) {
				return { [OPAQUE_KEY]: Array.from(blob) };
			}
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
