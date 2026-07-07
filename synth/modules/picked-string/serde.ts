// serde.ts

import type { FieldReader, FieldWriter } from "../../socket/serde";

export const PICKED_STRING_PAYLOAD_VERSION = 1;

export type PickedStringParams = Record<string, never>;

export function serialize(_params: PickedStringParams, _w: FieldWriter): void {}

export function deserialize(_r: FieldReader, _version: number): PickedStringParams {
	return {};
}
