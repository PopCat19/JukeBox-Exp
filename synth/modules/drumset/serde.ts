// serde.ts

import type { FieldReader, FieldWriter } from "../../socket/serde";

export const DRUMSET_PAYLOAD_VERSION = 1;

export type DrumsetParams = Record<string, never>;

export function serialize(_params: DrumsetParams, _w: FieldWriter): void {}

export function deserialize(_r: FieldReader, _version: number): DrumsetParams {
	return {};
}
