// id-table.ts
//
// Purpose: Per-song module id interning table — maps namespaced IDs ↔ small integers
//
// This module:
// - Maintains a bidirectional id → index mapping for URL compactness
// - First 16 slots reserved for built-in core IDs (no varint overhead)
// - Varint-encoded for song URL serialization
// - Provided by the host per instrument, shared across all modules in a song

export const ID_TABLE_RESERVED = 16;
export const ID_TABLE_MAX_ENTRIES = 256;

export class ModuleIdTable {
	private _idToIndex: Map<string, number> = new Map();
	private _indexToId: string[] = [];

	/** Set this at boot time to auto-populate reserved slots on every new table */
	static defaultReservedIds: readonly string[] = [];

	constructor() {
		for (let i = 0; i < ID_TABLE_RESERVED; i++) {
			this._indexToId.push("");
		}
		// Auto-populate reserved slots from static list set at boot
		const ids = ModuleIdTable.defaultReservedIds;
		for (let i = 0; i < ids.length && i < ID_TABLE_RESERVED; i++) {
			const id = ids[i];
			if (id) {
				this._idToIndex.set(id, i);
				this._indexToId[i] = id;
			}
		}
	}

	reserve(index: number, id: string): void {
		if (index >= ID_TABLE_RESERVED) {
			throw new RangeError(`Cannot reserve index ${index}: must be < ${ID_TABLE_RESERVED}`);
		}
		this._idToIndex.set(id, index);
		this._indexToId[index] = id;
	}

	getIndex(id: string): number {
		const existing = this._idToIndex.get(id);
		if (existing !== undefined) return existing;
		if (this._indexToId.length >= ID_TABLE_MAX_ENTRIES) {
			throw new RangeError(`Id table full (max ${ID_TABLE_MAX_ENTRIES})`);
		}
		const index = this._indexToId.length;
		this._idToIndex.set(id, index);
		this._indexToId.push(id);
		return index;
	}

	getId(index: number): string | undefined {
		if (index < 0 || index >= this._indexToId.length) return undefined;
		const id = this._indexToId[index];
		return id || undefined;
	}

	get size(): number {
		return this._indexToId.length;
	}

	/** Encode the table as a compact byte sequence for URL embedding */
	encode(): Uint8Array {
		const entries = this._indexToId.slice(ID_TABLE_RESERVED).filter(Boolean);
		const encoder = new TextEncoder();
		const idBytes = entries.map((id) => encoder.encode(id));
		const totalLen = idBytes.reduce((sum, b) => sum + 1 + b.length, 0);
		const result = new Uint8Array(totalLen);
		let offset = 0;
		for (let i = 0; i < idBytes.length; i++) {
			const bytes = idBytes[i];
			if (bytes.length > 255) {
				throw new RangeError(`Id too long: ${bytes.length} bytes (max 255)`);
			}
			result[offset++] = bytes.length;
			result.set(bytes, offset);
			offset += bytes.length;
		}
		return result;
	}

	/** Decode a table from a byte sequence previously returned by encode() */
	decode(data: Uint8Array): void {
		let offset = 0;
		while (offset < data.length) {
			if (offset + 1 > data.length) {
				throw new RangeError(
					`Truncated id table: expected length byte at offset ${offset}`,
				);
			}
			const len = data[offset++];
			if (len === 0) {
				throw new RangeError(`Invalid zero-length id at offset ${offset - 1}`);
			}
			if (offset + len > data.length) {
				throw new RangeError(
					`Truncated id table: expected ${len} bytes for id at offset ${offset}`,
				);
			}
			const id = new TextDecoder().decode(data.slice(offset, offset + len));
			offset += len;
			this.getIndex(id);
		}
	}

	/** Clear the table, keeping reserved slots */
	clear(): void {
		this._idToIndex.clear();
		this._indexToId = [];
		for (let i = 0; i < ID_TABLE_RESERVED; i++) {
			this._indexToId.push("");
		}
	}
}
