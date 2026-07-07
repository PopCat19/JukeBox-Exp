// serde.ts
//
// Purpose: Spectrum namespaced serialization

import type { FieldReader, FieldWriter } from "../../socket/serde";

export const SPECTRUM_PAYLOAD_VERSION = 1;

export type SpectrumParams = Record<string, never>;

export function serialize(_params: SpectrumParams, _w: FieldWriter): void {}

export function deserialize(_r: FieldReader, _version: number): SpectrumParams {
	return {};
}
