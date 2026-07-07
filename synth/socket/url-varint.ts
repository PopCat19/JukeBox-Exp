// url-varint.ts
//
// Purpose: Varint encoding helpers for compact module id storage in song URLs
//
// This module:
// - Encodes/decodes variable-length integers for compact URL bitstream storage
// - Encodes/decodes module id table entries into the URL bitstream
// - Target overhead: ≤ 3 bytes per module-based instrument in the URL
// - Used by synth-serialize.ts and synth-deserialize.ts during URL round-trip

import { ModuleIdTable } from "./id-table";

export const MODULE_TAG = 0x6d; // 'm' — song-level module data tag
export const MODULE_INSTRUMENT_TAG = 0x4d; // 'M' — per-instrument module marker

export function encodeVarint(value: number): number[] {
	if (value < 0) return [0];
	if (value < 64) return [value]; // 0xxxxxx
	if (value < 8192) return [(value >> 6) | 0x40, value & 0x3f]; // 10xxxxxx xxxxxx
	if (value < 2097152) return [(value >> 12) | 0x80, (value >> 6) & 0x3f, value & 0x3f]; // 110xxxxx xxxxxx xxxxxx
	return [0xc0 | ((value >> 18) & 0x3f), (value >> 12) & 0x3f, (value >> 6) & 0x3f, value & 0x3f]; // 1110xxxx 4 bytes
}

export function decodeVarint(data: number[], offset: number): { value: number; consumed: number } {
	if (offset >= data.length) return { value: 0, consumed: 1 };
	const b0 = data[offset];
	if (b0 < 0x40) return { value: b0, consumed: 1 };
	if (b0 < 0x80 && offset + 1 < data.length)
		return { value: ((b0 & 0x3f) << 6) | data[offset + 1], consumed: 2 };
	if (b0 < 0xc0 && offset + 2 < data.length)
		return {
			value: ((b0 & 0x3f) << 12) | (data[offset + 1] << 6) | data[offset + 2],
			consumed: 3,
		};
	if (offset + 3 < data.length)
		return {
			value:
				((b0 & 0x3f) << 18) |
				(data[offset + 1] << 12) |
				(data[offset + 2] << 6) |
				data[offset + 3],
			consumed: 4,
		};
	return { value: 0, consumed: 1 };
}

export function encodeModuleTable(table: ModuleIdTable): number[] {
	const encoded = table.encode();
	const result: number[] = [];
	for (let i = 0; i < encoded.length; i++) {
		result.push(encoded[i]);
	}
	return result;
}

export function encodeModuleInstrument(
	table: ModuleIdTable,
	moduleId: string,
	payload: number[],
): number[] {
	const index = table.getIndex(moduleId);
	const indexBytes = encodeVarint(index);
	const payloadLenBytes = encodeVarint(payload.length);
	return [MODULE_INSTRUMENT_TAG, ...indexBytes, ...payloadLenBytes, ...payload];
}

export interface DecodedModuleInstrument {
	moduleId: string;
	payload: number[];
	consumed: number;
}

export function decodeModuleInstrument(
	table: ModuleIdTable,
	data: number[],
	offset: number,
): DecodedModuleInstrument | null {
	if (offset >= data.length || data[offset] !== MODULE_INSTRUMENT_TAG) return null;
	offset++;

	const { value: index, consumed: indexConsumed } = decodeVarint(data, offset);
	offset += indexConsumed;

	const moduleId = table.getId(index);
	if (!moduleId) return null;

	const { value: payloadLen, consumed: lenConsumed } = decodeVarint(data, offset);
	offset += lenConsumed;

	if (offset + payloadLen > data.length) return null;
	const payload = data.slice(offset, offset + payloadLen);
	offset += payloadLen;

	return { moduleId, payload, consumed: offset };
}
