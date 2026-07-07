// serde.ts

import type { FieldReader, FieldWriter } from "../../socket/serde";

export const MOD_PAYLOAD_VERSION = 1;

export type ModParams = Record<string, never>;

export function serialize(_params: ModParams, _w: FieldWriter): void {}

export function deserialize(_r: FieldReader, _version: number): ModParams {
	return {};
}
