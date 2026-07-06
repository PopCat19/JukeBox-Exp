// url-varint.test.ts
//
// Purpose: Contract tests for URL varint encoding helpers
//
// This module:
// - Verifies encodeVarint / decodeVarint round-trip for various sizes
// - Verifies encodeModuleTable
// - Verifies encodeModuleInstrument / decodeModuleInstrument

import { describe, test, expect } from "bun:test";
import { ModuleIdTable } from "../synth/socket/id-table";
import {
	encodeVarint,
	decodeVarint,
	MODULE_INSTRUMENT_TAG,
	encodeModuleTable,
	encodeModuleInstrument,
	decodeModuleInstrument,
} from "../synth/socket/url-varint";

// ─── Varint ──────────────────────────────────────────────────────────────────

describe("varint encoding", () => {
	test("encodes 0 as single byte", () => {
		expect(encodeVarint(0)).toEqual([0]);
	});

	test("encodes small value < 64 as single byte", () => {
		expect(encodeVarint(42)).toEqual([42]);
	});

	test("encodes value 63 as single byte", () => {
		expect(encodeVarint(63)).toEqual([63]);
	});

	test("encodes value 64 as two bytes", () => {
		const encoded = encodeVarint(64);
		expect(encoded.length).toBe(2);
	});

	test("encodes value 8191 as two bytes", () => {
		const encoded = encodeVarint(8191);
		expect(encoded.length).toBe(2);
	});

	test("encodes value 8192 as three bytes", () => {
		const encoded = encodeVarint(8192);
		expect(encoded.length).toBe(3);
	});

	test("encodes value 2097152 as 4 bytes (hits top range)", () => {
		const encoded = encodeVarint(2097152);
		expect(encoded.length).toBe(4);
	});

	test("encodes negative value as single zero byte", () => {
		expect(encodeVarint(-1)).toEqual([0]);
	});
});

describe("varint decode", () => {
	test("decodes single byte value", () => {
		const { value, consumed } = decodeVarint([42, 0, 0], 0);
		expect(value).toBe(42);
		expect(consumed).toBe(1);
	});

	test("decodes two-byte value", () => {
		const encoded = encodeVarint(1000);
		const { value, consumed } = decodeVarint(encoded, 0);
		expect(value).toBe(1000);
		expect(consumed).toBe(encoded.length);
	});

	test("decodes three-byte value", () => {
		const encoded = encodeVarint(10000);
		const { value, consumed } = decodeVarint(encoded, 0);
		expect(value).toBe(10000);
		expect(consumed).toBe(encoded.length);
	});

	test("decode at non-zero offset", () => {
		const data = [0, 0, 42, 0];
		const { value } = decodeVarint(data, 2);
		expect(value).toBe(42);
	});

	test("decode past end returns zero", () => {
		const { value } = decodeVarint([], 5);
		expect(value).toBe(0);
	});

	test("round-trip for values 0..200", () => {
		for (let v = 0; v <= 200; v++) {
			const encoded = encodeVarint(v);
			const { value, consumed } = decodeVarint(encoded, 0);
			expect(value).toBe(v);
			expect(consumed).toBe(encoded.length);
		}
	});
});

// ─── Module instrument encoding ──────────────────────────────────────────────

describe("module instrument encoding", () => {
	test("encodeModuleInstrument produces tag + varint index", () => {
		const table = new ModuleIdTable();
		const result = encodeModuleInstrument(table, "core.supersaw", [1, 2, 3]);
		expect(result[0]).toBe(MODULE_INSTRUMENT_TAG);
		// Tag + varint for index 16 + 3 payload bytes
		expect(result.length).toBe(5);
	});

	test("decodeModuleInstrument reads encoded data", () => {
		const table = new ModuleIdTable();
		const encoded = encodeModuleInstrument(table, "core.supersaw", [10, 20, 30]);
		const decoded = decodeModuleInstrument(table, encoded, 0);
		expect(decoded).not.toBeNull();
		if (decoded) {
			expect(decoded.moduleId).toBe("core.supersaw");
			expect(decoded.payload).toEqual([10, 20, 30]);
		}
	});

	test("decodeModuleInstrument returns null for non-matching tag", () => {
		const table = new ModuleIdTable();
		const result = decodeModuleInstrument(table, [0x00, 1, 2], 0);
		expect(result).toBeNull();
	});

	test("round-trip through encode/decode preserves id and payload", () => {
		const table = new ModuleIdTable();
		table.getIndex("core.fm");
		table.getIndex("core.supersaw");
		const id = "core.supersaw";
		const payload = [255, 128, 64, 32];

		const encoded = encodeModuleInstrument(table, id, payload);
		const decoded = decodeModuleInstrument(table, encoded, 0);

		expect(decoded).not.toBeNull();
		if (decoded) {
			expect(decoded.moduleId).toBe(id);
			expect(decoded.payload).toEqual(payload);
		}
	});
});

// ─── Module table encoding ───────────────────────────────────────────────────

describe("module table encoding", () => {
	test("encodeModuleTable returns array of bytes", () => {
		const table = new ModuleIdTable();
		table.getIndex("core.supersaw");
		const encoded = encodeModuleTable(table);
		expect(Array.isArray(encoded)).toBeTrue();
		expect(encoded.length).toBeGreaterThan(0);
	});
});
