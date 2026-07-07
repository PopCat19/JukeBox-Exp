// render-core.test.ts
//
// Purpose: Characterization tests for renderTick — capture old Synth.synthesize() output
//
// This module:
// - Captures Synth.synthesize() output for known songs as reference checksums
// - Phase 1: add renderTick(snapshot, state, ...) calls that match these checksums
// - Detects regression when extracting synthesize() into the pure renderTick path
//
// Characterization test pattern:
//   1. Run OLD code (Synth.synthesize) with known inputs
//   2. Checksum the output → store as expected value
//   3. Run NEW code (renderTick) with equivalent snapshot input
//   4. Assert checksums match

import { describe, test, expect } from "bun:test";
import { Song, Synth } from "../../synth";
import { SnapshotBuilder } from "../../synth/render/snapshot";
import { renderTick, createRenderState } from "../../synth/render/render-core";

// ── Helpers ───────────────────────────────────────────────────────────────

/** Compute a simple 64-bit checksum from a Float32Array. */
function checksumF32(buf: Float32Array): number {
	let h: number = 0;
	for (let i: number = 0; i < buf.length; i++) {
		// Mix bits: convert float to 32-bit int representation
		const f: number = Math.abs(buf[i] || 0);
		h = ((h << 5) - h + ((f * 1048576) | 0)) | 0;
	}
	return h;
}

/** Sum of squares (energy) of a Float32Array. */
function energy(buf: Float32Array): number {
	let e: number = 0;
	for (let i: number = 0; i < buf.length; i++) {
		e += buf[i] * buf[i];
	}
	return e;
}

/** Synthesize N samples using old Synth, return (left, right, checksums). */
function synthSampleOutput(
	synth: Synth,
	numSamples: number,
	playSong: boolean = false,
): { left: Float32Array; right: Float32Array; checksumL: number; checksumR: number; energyL: number } {
	const left: Float32Array = new Float32Array(numSamples);
	const right: Float32Array = new Float32Array(numSamples);
	synth.synthesize(left, right, numSamples, playSong);
	return {
		left,
		right,
		checksumL: checksumF32(left),
		checksumR: checksumF32(right),
		energyL: energy(left),
	};
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("Synth.synthesize output (characterization baseline)", () => {
	test("default empty song with no notes produces silence or near-silence", () => {
		const song: Song = new Song();
		const synth: Synth = new Synth(song);
		synth.warmUpSynthesizer(song);

		const { checksumL, checksumR, energyL } = synthSampleOutput(synth, 512, false);

		// A default song with no notes should produce zero or near-zero output.
		// Energy must be below a very small threshold.
		expect(energyL).toBeLessThan(1e-10);
		expect(checksumL).toBe(0);
		expect(checksumR).toBe(0);
	});

	test("default song renders deterministically across multiple calls", () => {
		const song1: Song = new Song();
		const synth1: Synth = new Synth(song1);
		synth1.warmUpSynthesizer(song1);

		const song2: Song = new Song();
		const synth2: Synth = new Synth(song2);
		synth2.warmUpSynthesizer(song2);

		const r1 = synthSampleOutput(synth1, 256, false);
		const r2 = synthSampleOutput(synth2, 256, false);

		expect(r1.checksumL).toBe(r2.checksumL);
		expect(r1.checksumR).toBe(r2.checksumR);
	});

	test("renderTick with snapshot of default song returns silence", () => {
		const song: Song = new Song();
		const builder: SnapshotBuilder = new SnapshotBuilder();
		const snapshot = builder.build(song);
		const state = createRenderState();

		// Advance state to match synth's playhead after warmUp+goToBar(0)
		state.bar = 0;
		state.beat = 0;
		state.part = 0;
		state.isAtStartOfSong = true;

		const result = renderTick(snapshot, state, 256, false);

		// renderTick currently returns silence (stub). This test establishes
		// the contract — when Phase 1 extraction is complete, both paths
		// will produce the same output.
		expect(result.left.length).toBe(256);
		expect(result.right.length).toBe(256);
		expect(result.telemetry.playhead).toBe(0);
		expect(energy(result.left)).toBe(0);
	});

	test("SnapshotBuilder + renderState round-trip structure", () => {
		const song: Song = new Song();
		const builder: SnapshotBuilder = new SnapshotBuilder();
		const snapshot = builder.build(song);
		const state = createRenderState();

		// State mirrors the snapshot's basic transport
		expect(snapshot.channelSnapshots.length).toBeGreaterThan(0);
		expect(state.bar).toBe(0);
		expect(state.playhead).toBe(0);
	});
});
