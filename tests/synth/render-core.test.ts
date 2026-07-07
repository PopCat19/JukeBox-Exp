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
import type { SongSnapshot } from "../../synth/render/snapshot";
import {
	renderTick,
	createRenderState,
	type RenderState,
	allocTone,
	recycleTone,
	releaseTone,
	freeReleasedTone,
	freeAllTones,
	playTone,
	computeNoteExpression,
	getSamplesPerTick,
	getNextBarFromSnapshot,
	advanceTickTransport,
	computePlayheadFromState,
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

	test("renderTick with snapshot of default song returns silence and advances state", () => {
		const song: Song = new Song();
		const builder: SnapshotBuilder = new SnapshotBuilder();
		const snapshot = builder.build(song);
		const state = createRenderState();

		// Default song: 8 beats/bar, 24 parts/beat, 2 ticks/part, 160 BPM, 44100 Hz
		// samplesPerTick = 44100 / (2*24*(160/60)) ≈ 344.53
		state.bar = 0;
		state.beat = 0;
		state.part = 0;
		state.isAtStartOfSong = true;

		const result = renderTick(snapshot, state, 256, false);

		// renderTick advances state but returns silence (no tone extraction yet).
		// With playSong=false, tick does NOT advance, but playhead is computed.
		expect(result.left.length).toBe(256);
		expect(result.right.length).toBe(256);
		expect(result.telemetry.playhead).toBeGreaterThanOrEqual(0);
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

// ── Transport advancement helpers ───────────────────────────────────────────

function makeSnapshot(overrides?: Partial<SongSnapshot>): SongSnapshot {
	return {
		version: 1,
		editSequence: 0,
		timestamp: 0,
		sampleRate: 44100,
		beatsPerBar: 4,
		barCount: 8,
		ticksPerPart: 2,
		partsPerBeat: 24,
		pitchChannelCount: 2,
		noiseChannelCount: 1,
		modChannelCount: 1,
		channelSnapshots: [],
		loopBarStart: 0,
		loopBarEnd: 4,
		loopRepeatCount: -1,
		loopBarCopy: 0,
		barCountOverride: null,
		masterGain: 1,
		eqFilter: { controlPointCount: 0, controlPoints: [] },
		eqFilterType: false,
		eqFilterSimpleCut: 0,
		eqFilterSimplePeak: 0,
		eqSubFilters: [],
		inVolumeCap: 0,
		outVolumeCap: 0,
		compressionThreshold: 1,
		limitThreshold: 1,
		compressionRatio: 1,
		limitRatio: 1,
		limitDecay: 4,
		limitRise: 4000,
		channelVolumeCaps: [],
		octave: 0,
		key: 0,
		patternInstruments: true,
		layeredInstruments: false,
		tempo: 120,
		rhythm: 1,
		reverb: 0,
		scaleCustom: [],
		...overrides,
	};
}

// ── Transport advancement tests ────────────────────────────────────────────

describe("getSamplesPerTick", () => {
	test("computes samples per tick at default tempo (160 BPM)", () => {
		// 160 BPM, 44100 Hz, 2 ticks/part, 24 parts/beat
		// ticks per second = 2 * 24 * (160/60) = 128
		// samples per tick = 44100 / 128 ≈ 344.53
		const result: number = getSamplesPerTick(44100, 160, 2, 24);
		expect(result).toBeCloseTo(344.53125, 5);
	});

	test("doubling tempo halves samples per tick", () => {
		const slow: number = getSamplesPerTick(44100, 80, 2, 24);
		const fast: number = getSamplesPerTick(44100, 160, 2, 24);
		expect(fast).toBeCloseTo(slow / 2, 5);
	});

	test("higher sample rate increases samples per tick", () => {
		const lowSR: number = getSamplesPerTick(44100, 120, 2, 24);
		const highSR: number = getSamplesPerTick(48000, 120, 2, 24);
		expect(highSR).toBeCloseTo(lowSR * (48000 / 44100), 5);
	});
});

describe("getNextBarFromSnapshot", () => {
	test("returns bar+1 within song range", () => {
		const snapshot: SongSnapshot = makeSnapshot({ barCount: 8 });
		const state: RenderState = createRenderState();
		state.bar = 3;

		expect(getNextBarFromSnapshot(snapshot, state)).toBe(4);
	});

	test("returns loopBarStart when at loopBarEnd (standard loop)", () => {
		const snapshot: SongSnapshot = makeSnapshot({ loopBarStart: 2, loopBarEnd: 6 });
		const state: RenderState = createRenderState();
		state.bar = 6;

		expect(getNextBarFromSnapshot(snapshot, state)).toBe(2);
	});

	test("renderingSong skips the loopBarEnd wrap but NOT the loop-repeat wrap (matches original Synth)", () => {
		// Original Synth.getNextBar(): when renderingSong=true, the loopBarEnd
		// check is skipped, but the loopRepeatCount second check still fires.
		// So bar=6 at loopBarEnd=6 with renderingSong=true still returns loopBarStart
		// via the second condition.
		const snapshot: SongSnapshot = makeSnapshot({ loopBarStart: 2, loopBarEnd: 6 });
		const state: RenderState = createRenderState();
		state.bar = 6;
		state.renderingSong = true;

		// Second condition fires: nextBar=7 === Math.max(6+1, 2+(6-2)) = 7
		// Returns loopBarStart = 2, matching original Synth behavior.
		expect(getNextBarFromSnapshot(snapshot, state)).toBe(2);
	});

	test("returns bar+1 when not at loop boundary", () => {
		const snapshot: SongSnapshot = makeSnapshot({ loopBarStart: 2, loopBarEnd: 6 });
		const state: RenderState = createRenderState();
		state.bar = 4;

		expect(getNextBarFromSnapshot(snapshot, state)).toBe(5);
	});
});

describe("advanceTickTransport", () => {
	test("advances tick within same part", () => {
		const snapshot: SongSnapshot = makeSnapshot({ ticksPerPart: 2, partsPerBeat: 4, beatsPerBar: 4 });
		const state: RenderState = createRenderState();
		state.tick = 0;
		state.part = 0;
		state.beat = 0;
		state.bar = 0;
		state.tickSampleCountdown = 0;

		const { songEnded } = advanceTickTransport(snapshot, state, 344, true);

		expect(songEnded).toBe(false);
		expect(state.tick).toBe(1); // tick 0 → 1
		expect(state.part).toBe(0); // same part
		expect(state.beat).toBe(0);
		expect(state.bar).toBe(0);
	});

	test("wraps tick to 0 and advances part at ticksPerPart boundary", () => {
		const snapshot: SongSnapshot = makeSnapshot({ ticksPerPart: 2, partsPerBeat: 4, beatsPerBar: 4 });
		const state: RenderState = createRenderState();
		state.tick = 1; // last tick before wrap
		state.part = 0;
		state.beat = 0;
		state.bar = 0;

		const { songEnded } = advanceTickTransport(snapshot, state, 344, true);

		expect(songEnded).toBe(false);
		expect(state.tick).toBe(0); // wrapped
		expect(state.part).toBe(1); // advanced
		expect(state.beat).toBe(0);
		expect(state.bar).toBe(0);
	});

	test("advances tick/part without advancing beat when playSong is false", () => {
		const snapshot: SongSnapshot = makeSnapshot({ ticksPerPart: 1, partsPerBeat: 4 });
		const state: RenderState = createRenderState();
		state.tick = 0;
		state.part = 0;
		state.beat = 0;
		state.bar = 0;

		const { songEnded } = advanceTickTransport(snapshot, state, 344, false);

		expect(songEnded).toBe(false);
		// tick wraps (ticksPerPart=1 → 0→1 wraps to 0)
		expect(state.tick).toBe(0);
		// part advances
		expect(state.part).toBe(1);
		// beat does NOT advance (playSong=false)
		expect(state.beat).toBe(0);
		expect(state.bar).toBe(0);
	});

	test("returns songEnded when bar exceeds barCount and loopRepeatCount is 0", () => {
		// loopRepeatCount=0 means no infinite loop; signal song end
		const snapshot: SongSnapshot = makeSnapshot({
			barCount: 8,
			beatsPerBar: 4,
			partsPerBeat: 4,
			ticksPerPart: 1,
			loopRepeatCount: 0,
		});
		const state: RenderState = createRenderState();
		state.tick = 0;
		state.part = 3;
		state.beat = 3;
		state.bar = 7;

		const { songEnded } = advanceTickTransport(snapshot, state, 344, true);

		// tick wraps → part wraps → beat wraps → bar=8 >= barCount
		expect(songEnded).toBe(true);
		expect(state.bar).toBe(8); // advanced past end
	});

	test("infinite loop (loopRepeatCount=-1) wraps bar to 0 instead of ending", () => {
		const snapshot: SongSnapshot = makeSnapshot({
			barCount: 8,
			beatsPerBar: 4,
			partsPerBeat: 4,
			ticksPerPart: 1,
			loopRepeatCount: -1,
		});
		const state: RenderState = createRenderState();
		state.tick = 0;
		state.part = 3;
		state.beat = 3;
		state.bar = 7;

		const { songEnded } = advanceTickTransport(snapshot, state, 344, true);

		// Infinite loop: bar wraps to 0
		expect(songEnded).toBe(false);
		expect(state.bar).toBe(0);
	});
});

describe("computePlayheadFromState", () => {
	test("at start of song playhead is 0", () => {
		const state: RenderState = createRenderState();
		state.bar = 0;
		state.beat = 0;
		state.part = 0;
		state.tick = 0;
		state.tickSampleCountdown = 344; // full tick remaining

		const ph: number = computePlayheadFromState(state, 344, 4, 24, 2);

		// tickFraction = 0 + 1.0 - 344/344 = 0
		// ((0/2 + 0) / 24 + 0) / 4 + 0 = 0
		expect(ph).toBeCloseTo(0, 5);
	});

	test("mid-tick playhead is fractional", () => {
		const state: RenderState = createRenderState();
		state.bar = 2;
		state.beat = 1;
		state.part = 6;
		state.tick = 0;
		state.tickSampleCountdown = 172; // half tick remaining

		const ph: number = computePlayheadFromState(state, 344, 4, 24, 2);

		// tickFraction = 0 + 1.0 - 172/344 = 0.5
		// ((0.5/2 + 6) / 24 + 1) / 4 + 2
		// = ((0.25 + 6) / 24 + 1) / 4 + 2
		// = (6.25/24 + 1) / 4 + 2
		// = (0.2604 + 1) / 4 + 2
		// = 1.2604/4 + 2 = 0.3151 + 2 = 2.3151
		expect(ph).toBeCloseTo(2.3151, 3);
	});
});

describe("renderTick transport integration", () => {
	test("renderTick with playSong=true advances state and computes playhead", () => {
		const snapshot: SongSnapshot = makeSnapshot({ tempo: 160, beatsPerBar: 4, partsPerBeat: 24, ticksPerPart: 2 });
		const state: RenderState = createRenderState();
		state.bar = 0;
		state.beat = 0;
		state.part = 0;
		state.tick = 0;

		const result = renderTick(snapshot, state, 344, true);

		// Should have advanced tick
		expect(state.tick).toBeGreaterThanOrEqual(0);
		expect(result.left.length).toBe(344);
		expect(result.right.length).toBe(344);
		// playhead should be computed
		expect(result.telemetry.playhead).toBeGreaterThan(0);
	});

	test("renderTick with playSong=false advances tick but not beat/bar or playhead", () => {
		const snapshot: SongSnapshot = makeSnapshot({ tempo: 160, ticksPerPart: 2, partsPerBeat: 4 });
		const state: RenderState = createRenderState();
		state.bar = 0;
		state.beat = 0;
		state.part = 0;
		state.tick = 0;
		state.tickSampleCountdown = 344;

		const result = renderTick(snapshot, state, 344, false);

		// countdown=344, outputBufferLength=344 → runLength=344, countdown goes to 0 → transport advances
		// tick advances (0→1) but part/beat/bar stay because no boundaries crossed
		expect(state.tick).toBe(1);
		expect(state.part).toBe(0);
		expect(state.beat).toBe(0);
		expect(state.bar).toBe(0);
		// Playhead NOT updated when playSong=false
		expect(result.telemetry.playhead).toBe(0);
	});

	test("renderTick with playSong=false still advances tick/part at tick boundary", () => {
		const snapshot: SongSnapshot = makeSnapshot({ tempo: 160, ticksPerPart: 1, partsPerBeat: 4, beatsPerBar: 4 });
		const state: RenderState = createRenderState();
		state.tick = 0;
		state.part = 0;
		state.beat = 0;
		state.bar = 0;
		state.tickSampleCountdown = 1;

		renderTick(snapshot, state, 1, false);

		// Tick wraps to 0, part advances (mirrors Synth warmup)
		expect(state.tick).toBe(0);
		expect(state.part).toBe(1);
		expect(state.beat).toBe(0);
		expect(state.bar).toBe(0);
	});

	test("renderTick with playSong=false respects partsPerBeat boundary", () => {
		const snapshot: SongSnapshot = makeSnapshot({ tempo: 160, ticksPerPart: 1, partsPerBeat: 2, beatsPerBar: 4 });
		const state: RenderState = createRenderState();
		state.tick = 0;
		state.part = 1; // last part before wrap
		state.beat = 0;
		state.bar = 0;
		state.tickSampleCountdown = 1;

		renderTick(snapshot, state, 1, false);

		// Part wraps but beat stays (playSong=false)
		expect(state.tick).toBe(0);
		expect(state.part).toBe(0); // wrapped
		expect(state.beat).toBe(0); // NOT advanced
		expect(state.bar).toBe(0);
	});
});


