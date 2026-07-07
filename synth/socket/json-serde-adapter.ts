// json-serde-adapter.ts
//
// Purpose: JSON-compatible FieldWriter/FieldReader for module serde round-trip
//
// This module:
// - JsonFieldWriter collects module.serialize() calls into a JSON-safe object
// - JsonFieldReader reads the object back for module.deserialize()
// - Blob data is base64-encoded in JSON, decoded on read
// - Used by URL hash and JSON format serialization paths

import type { FieldReader, FieldWriter } from "./serde";

export class JsonFieldWriter implements FieldWriter {
	private _data: Record<string, unknown> = {};

	writeInt(key: string, value: number, _bits?: number): void {
		this._data[key] = value;
	}

	writeFloat(key: string, value: number, _precision?: number): void {
		this._data[key] = value;
	}

	writeBoolean(key: string, value: boolean): void {
		this._data[key] = value;
	}

	writeEnum(key: string, value: number): void {
		this._data[key] = value;
	}

	writeBlob(key: string, data: Uint8Array): void {
		this._data[key] = btoa(String.fromCharCode(...data));
	}

	toJSON(): Record<string, unknown> {
		return this._data;
	}
}

export class JsonFieldReader implements FieldReader {
	constructor(private _data: Record<string, unknown>) {}

	readInt(key: string, defaultValue?: number): number {
		const v = this._data[key];
		return typeof v === "number" ? v : (defaultValue ?? 0);
	}

	readFloat(key: string, defaultValue?: number): number {
		const v = this._data[key];
		return typeof v === "number" ? v : (defaultValue ?? 0);
	}

	readBoolean(key: string, defaultValue?: boolean): boolean {
		const v = this._data[key];
		return typeof v === "boolean" ? v : (defaultValue ?? false);
	}

	readEnum(key: string, defaultValue?: number): number {
		const v = this._data[key];
		return typeof v === "number" ? v : (defaultValue ?? 0);
	}

	readBlob(key: string): Uint8Array | undefined {
		const v = this._data[key];
		if (typeof v === "string") {
			const bin = atob(v);
			const bytes = new Uint8Array(bin.length);
			for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
			return bytes;
		}
		return undefined;
	}

	hasKey(key: string): boolean {
		return key in this._data;
	}
}
