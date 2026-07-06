// serde.ts
//
// Purpose: Namespaced serialization contract for module payloads
//
// This module:
// - Defines FieldWriter/FieldReader interfaces for module-owned payloads
// - Defines the container format constants (moduleId + payloadVersion + length + payload)
// - Host owns container, module owns payload
// - Unknown moduleId → opaque preserve, round-trip losslessly

export interface FieldWriter {
	writeInt(key: string, value: number, bits?: number): void;
	writeFloat(key: string, value: number, precision?: number): void;
	writeBoolean(key: string, value: boolean): void;
	writeEnum(key: string, value: number): void;
	writeBlob(key: string, data: Uint8Array): void;
}

export interface FieldReader {
	readInt(key: string, defaultValue?: number): number;
	readFloat(key: string, defaultValue?: number): number;
	readBoolean(key: string, defaultValue?: boolean): boolean;
	readEnum(key: string, defaultValue?: number): number;
	readBlob(key: string): Uint8Array | undefined;
	hasKey(key: string): boolean;
}

export interface OpaquePayload {
	readonly payloadVersion: number;
	readonly raw: Uint8Array;
}

export const CONTAINER_OVERHEAD_BYTES = 3;

const MAX_ID_BYTES = 255;
const MAX_PAYLOAD_BYTES = 65535;

export function serializeContainer(
	moduleId: string,
	payloadVersion: number,
	payload: Uint8Array,
): Uint8Array {
	const encoder = new TextEncoder();
	const idBytes = encoder.encode(moduleId);

	if (idBytes.length > MAX_ID_BYTES) {
		throw new RangeError(
			`Module id too long: ${idBytes.length} bytes (max ${MAX_ID_BYTES})`,
		);
	}
	if (payload.length > MAX_PAYLOAD_BYTES) {
		throw new RangeError(
			`Payload too large: ${payload.length} bytes (max ${MAX_PAYLOAD_BYTES})`,
		);
	}

	const result = new Uint8Array(1 + idBytes.length + 1 + 2 + payload.length);
	let offset = 0;
	result[offset++] = idBytes.length;
	result.set(idBytes, offset);
	offset += idBytes.length;
	result[offset++] = payloadVersion;
	result[offset++] = (payload.length >> 8) & 0xff;
	result[offset++] = payload.length & 0xff;
	result.set(payload, offset);
	return result;
}

export function deserializeContainer(data: Uint8Array): {
	moduleId: string;
	payloadVersion: number;
	payload: Uint8Array;
} {
	if (data.length < 4) {
		throw new RangeError(
			`Container too short: ${data.length} bytes (minimum 4)`,
		);
	}
	let offset = 0;
	const idLen = data[offset++];
	if (idLen === 0 || offset + idLen > data.length) {
		throw new RangeError(
			`Invalid id length: ${idLen}, data length: ${data.length}`,
		);
	}
	const moduleId = new TextDecoder().decode(data.slice(offset, offset + idLen));
	offset += idLen;
	if (offset + 3 > data.length) {
		throw new RangeError(
			`Container truncated at version/length header`,
		);
	}
	const payloadVersion = data[offset++];
	const payloadLen = (data[offset++] << 8) | data[offset++];
	if (offset + payloadLen > data.length) {
		throw new RangeError(
			`Payload length ${payloadLen} exceeds container data ${data.length - offset}`,
		);
	}
	const payload = data.slice(offset, offset + payloadLen);
	return { moduleId, payloadVersion, payload };
}
