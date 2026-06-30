// audio-ring-buffer.ts
//
// Purpose: SharedArrayBuffer ring buffer for lock-free main→worklet audio handoff
//
// This module:
// - Owns a SharedArrayBuffer with N buffer slots
// - Exposes producer (main thread) and consumer (worklet) access
// - Uses Atomics for lock-free head coordination
//
// SAB layout:
//   [0] writeHead (Int32) — last slot index the producer has fully written
//   [1] readHead  (Int32) — last slot index the consumer has fully consumed
//   [2..] data (Float32) — numSlots × (slotLength × 2) for interleaved L/R

export class AudioRingBuffer {
	public readonly sab: SharedArrayBuffer;
	public readonly numSlots: number;
	public readonly slotLength: number;

	private static readonly HEADER_INTS = 2;
	private static readonly HEADER_BYTES = AudioRingBuffer.HEADER_INTS * 4;

	private readonly _view: Int32Array;
	private readonly _data: Float32Array;
	private readonly _slotStride: number;

	constructor(numSlots: number, slotLength: number) {
		this.numSlots = numSlots;
		this.slotLength = slotLength;
		this._slotStride = slotLength * 2;
		const totalFloats = numSlots * this._slotStride;
		this.sab = new SharedArrayBuffer(
			AudioRingBuffer.HEADER_BYTES +
				totalFloats * Float32Array.BYTES_PER_ELEMENT,
		);
		this._view = new Int32Array(this.sab, 0, AudioRingBuffer.HEADER_INTS);
		this._data = new Float32Array(
			this.sab,
			AudioRingBuffer.HEADER_BYTES,
			totalFloats,
		);
		// No slots published yet
		this._view[0] = -1;
		this._view[1] = -1;
	}

	// ── Producer (main thread) ──

	public publishWriteHead(index: number): void {
		Atomics.store(this._view, 0, index);
	}

	public loadReadHead(): number {
		return Atomics.load(this._view, 1);
	}

	public writeSlot(slot: number, left: Float32Array, right: Float32Array): void {
		const offset = (slot % this.numSlots) * this._slotStride;
		this._data.set(left, offset);
		this._data.set(right, offset + this.slotLength);
	}

	// ── Consumer (worklet) ──

	public loadWriteHead(): number {
		return Atomics.load(this._view, 0);
	}

	public publishReadHead(index: number): void {
		Atomics.store(this._view, 1, index);
	}

	public readSlot(
		slot: number,
		offset: number,
		length: number,
		outL: Float32Array,
		outR: Float32Array,
		writePos: number,
	): void {
		const slotBase = (slot % this.numSlots) * this._slotStride;
		const srcL = this._data.subarray(
			slotBase + offset,
			slotBase + offset + length,
		);
		const srcR = this._data.subarray(
			slotBase + this.slotLength + offset,
			slotBase + this.slotLength + offset + length,
		);
		outL.set(srcL, writePos);
		outR.set(srcR, writePos);
	}
}
