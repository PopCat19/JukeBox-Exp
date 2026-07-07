// serde.ts
//
// Purpose: Harmonics namespaced serialization
//
// This module:
// - Serializes harmonics params to FieldWriter
// - Deserializes harmonics params from FieldReader

import type { FieldReader, FieldWriter } from "../../socket/serde";

export const HARMONICS_PAYLOAD_VERSION = 1;

export type HarmonicsParams = Record<string, never>;

export function serialize(_params: HarmonicsParams, _w: FieldWriter): void {
	// No custom params to serialize
}

export function deserialize(_r: FieldReader, _version: number): HarmonicsParams {
	return {};
}
