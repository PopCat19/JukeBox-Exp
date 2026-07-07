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
import {
	renderTick,
	createRenderState,
	allocTone,
	recycleTone,
	releaseTone,
	freeReleasedTone,
	freeAllTones,
	playTone,
	computeNoteExpression,
} from "../../synth/render/render-core";
import { Tone } from "../../synth/tone";
import { Deque } from "../../synth/deque";
import { Note } from "../../synth/notes";

// ── Helpers ───────────────────────────────────────────────────────────────

/** Compute a simple 32-bit checksum from a Float32Array (int32 mixing, not a real hash). */
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

// ── Tone lifecycle tests ───────────────────────────────────────────────────

describe("tone pool lifecycle", () => {
	test("allocTone from empty pool returns a fresh Tone", () => {
		const pool: Deque<Tone> = new Deque<Tone>();
		const tone: Tone = allocTone(pool);

		expect(tone).toBeInstanceOf(Tone);
		expect(tone.freshlyAllocated).toBe(true);
		// Pool should still be empty (we didn't recycle anything)
		expect(pool.count()).toBe(0);
	});

	test("recycleTone returns tone to pool and allocTone reuses it", () => {
		const pool: Deque<Tone> = new Deque<Tone>();
		const tone1: Tone = allocTone(pool);
		tone1.instrumentIndex = 42;

		recycleTone(pool, tone1);
		expect(pool.count()).toBe(1);

		const tone2: Tone = allocTone(pool);
		expect(tone2).toBe(tone1); // Same object reused
		expect(tone2.freshlyAllocated).toBe(true);
		expect(pool.count()).toBe(0);
	});

	test("allocTone reuses multiple recycled tones in LIFO order", () => {
		const pool: Deque<Tone> = new Deque<Tone>();
		const t1: Tone = allocTone(pool);
		const t2: Tone = allocTone(pool);
		const t3: Tone = allocTone(pool);

		recycleTone(pool, t1);
		recycleTone(pool, t2);
		recycleTone(pool, t3);

		// LIFO: t3 comes back first
		expect(allocTone(pool)).toBe(t3);
		expect(allocTone(pool)).toBe(t2);
		expect(allocTone(pool)).toBe(t1);
		expect(pool.count()).toBe(0);
	});

	test("releaseTone moves tone to released deque and clears flags", () => {
		const released: Deque<Tone> = new Deque<Tone>();
		const tone: Tone = new Tone();
		tone.atNoteStart = true;
		tone.passedEndOfNote = false;

		releaseTone(released, tone);

		expect(released.count()).toBe(1);
		expect(released.get(0)).toBe(tone);
		expect(tone.atNoteStart).toBe(false);
		expect(tone.passedEndOfNote).toBe(true);
	});

	test("freeReleasedTone removes from deque and returns to pool", () => {
		const pool: Deque<Tone> = new Deque<Tone>();
		const released: Deque<Tone> = new Deque<Tone>();
		const tone: Tone = new Tone();

		releaseTone(released, tone);
		expect(released.count()).toBe(1);

		freeReleasedTone(pool, released, 0);

		expect(released.count()).toBe(0);
		// Tone should be in pool now
		expect(pool.count()).toBe(1);
		expect(allocTone(pool)).toBe(tone);
	});

	test("freeAllTones empties all tone deques across channels/instruments", () => {
		const pool: Deque<Tone> = new Deque<Tone>();
		const t1: Tone = new Tone();
		const t2: Tone = new Tone();
		const t3: Tone = new Tone();
		const t4: Tone = new Tone();

		const activeTones: Deque<Tone> = new Deque<Tone>();
		const activeModTones: Deque<Tone> = new Deque<Tone>();
		const releasedTones: Deque<Tone> = new Deque<Tone>();
		const liveInputTones: Deque<Tone> = new Deque<Tone>();

		activeTones.pushBack(t1);
		activeModTones.pushBack(t2);
		releasedTones.pushBack(t3);
		liveInputTones.pushBack(t4);

		const channels = [{
			instruments: [{
				activeTones,
				activeModTones,
				releasedTones,
				liveInputTones,
			}],
		}];

		freeAllTones(pool, channels);

		expect(activeTones.count()).toBe(0);
		expect(activeModTones.count()).toBe(0);
		expect(releasedTones.count()).toBe(0);
		expect(liveInputTones.count()).toBe(0);
		expect(pool.count()).toBe(4);
	});
});

// ── playTone tests ─────────────────────────────────────────────────────────

describe("playTone", () => {
	test("dispatches to synthesizer and clears envelopes", () => {
		let synthCalled = false;
		const fakeSynth = () => {
			synthCalled = true;
		};
		const tone: Tone = new Tone();
		const instrumentState = { envelopeComputer: { clearEnvelopes: () => {} } };

		playTone(fakeSynth, 0, 128, tone, {} as any, instrumentState as any);

		expect(synthCalled).toBe(true);
	});

	test("null synthesizer does not throw", () => {
		const tone: Tone = new Tone();
		const instrumentState = { envelopeComputer: { clearEnvelopes: () => {} } };

		expect(() => playTone(null, 0, 128, tone, {} as any, instrumentState as any)).not.toThrow();
	});

	test("clears tone and instrument envelopes (spies on existing methods)", () => {
		const tone: Tone = new Tone();
		let toneEnvCalled = false;
		tone.envelopeComputer.clearEnvelopes = () => { toneEnvCalled = true; };
		const instrumentState = { envelopeComputer: { clearEnvelopes: () => {} } };
		let instEnvCalled = false;
		instrumentState.envelopeComputer.clearEnvelopes = () => { instEnvCalled = true; };

		playTone(null, 0, 128, tone, {} as any, instrumentState as any);

		expect(toneEnvCalled).toBe(true);
		expect(instEnvCalled).toBe(true);
	});
});

// ── computeNoteExpression tests ────────────────────────────────────────────

describe("computeNoteExpression", () => {
	test("throws for tone with no note", () => {
		const tone: Tone = new Tone();
		tone.note = null;

		expect(() => computeNoteExpression(tone, 0, 0, 0, 2, 24, 0, 100, 50)).toThrow();
	});

	test("returns pin start value for tone at start of note", () => {
		const tone: Tone = new Tone();
		tone.note = new Note(60, 0, 1, 100);
		// Override pins for known values
		tone.note.pins[0] = { interval: 0, time: 0, size: 100 };
		tone.note.pins[1] = { interval: 0, time: 1, size: 200 };

		const result = computeNoteExpression(tone, 0, 0, 0, 2, 24, 100, 100, 50);

		// At tick 0, beat 0, part 0: startPin time=0, so at ratio 0 expression=100
		expect(result.expression).toBe(100);
	});

	test("interpolates pin values for a run starting mid-tick", () => {
		const tone: Tone = new Tone();
		tone.note = new Note(60, 0, 1, 100);
		tone.note.pins[0] = { interval: 0, time: 0, size: 100 };
		tone.note.pins[1] = { interval: 0, time: 1, size: 300 };

		// tickSampleCountdown=50, samplesPerTick=100, runLength=50
		// startRatio=0.5 → partTimeStart=0.25 → tickTimeStart=0.5
		// Pin range: startPinTick=0, endPinTick=2
		// ratioStart = (0.5-0)/2 = 0.25 → expression = 100+200*0.25 = 150
		const result = computeNoteExpression(tone, 0, 0, 0, 2, 24, 50, 100, 50);

		expect(result.expression).toBe(150);
	});
});

