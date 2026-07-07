// snapshot.test.ts
//
// Purpose: Unit tests for SongSnapshot types and SnapshotBuilder
//
// This module:
// - Verifies snapshot from default empty Song populates all fields correctly
// - Verifies snapshot from a song with known structure
// - Verifies editSequence increments after incrementEditSequence()
// - Verifies snapshot is deeply immutable (no shared references to Song internals)
// - Verifies version monotonicity

import { describe, test, expect } from "bun:test";
import {
	SnapshotBuilder,
	snapshotInstrument,
} from "../../../synth/render/snapshot";
import { Song } from "../../../synth/song";
import { Instrument } from "../../../synth/instruments";
import { Note } from "../../../synth/notes";

// ── Default song snapshot ─────────────────────────────────────────────────

describe("SnapshotBuilder", () => {
	test("builds snapshot from default empty Song with all fields populated", () => {
		const song: Song = new Song();
		const builder: SnapshotBuilder = new SnapshotBuilder();
		const snapshot = builder.build(song);

		// Version starts at 1
		expect(snapshot.version).toBe(1);
		expect(snapshot.editSequence).toBe(0);
		expect(snapshot.timestamp).toBeGreaterThan(0);

		// Song structure
		expect(snapshot.sampleRate).toBe(44100);
		expect(snapshot.beatsPerBar).toBe(8);
		expect(snapshot.barCount).toBe(8);
		expect(snapshot.ticksPerPart).toBe(2);
		expect(snapshot.partsPerBeat).toBe(24);
		expect(snapshot.pitchChannelCount).toBe(2);
		expect(snapshot.noiseChannelCount).toBe(1);
		expect(snapshot.modChannelCount).toBe(1);

		// Channel count
		expect(snapshot.channelSnapshots.length).toBe(4);

		// Each channel has instruments
		for (const ch of snapshot.channelSnapshots) {
			expect(ch.instruments.length).toBeGreaterThanOrEqual(1);
			expect(ch.patterns.length).toBe(song.patternsPerChannel);
			expect(ch.barPatternMap.length).toBe(snapshot.barCount);
		}

		// Transport defaults
		expect(snapshot.loopBarStart).toBe(0);
		expect(snapshot.loopBarEnd).toBe(8);
		expect(snapshot.loopRepeatCount).toBe(-1);
		expect(snapshot.loopBarCopy).toBe(0);
		expect(snapshot.barCountOverride).toBeNull();

		// Global params
		expect(snapshot.masterGain).toBe(1.0);
		expect(snapshot.inVolumeCap).toBe(0.0);
		expect(snapshot.outVolumeCap).toBe(0.0);
		expect(snapshot.compressionThreshold).toBe(1.0);
		expect(snapshot.limitThreshold).toBe(1.0);
		expect(snapshot.compressionRatio).toBe(1.0);
		expect(snapshot.limitRatio).toBe(1.0);
		expect(snapshot.limitDecay).toBe(4.0);
		expect(snapshot.limitRise).toBe(4000.0);
		expect(snapshot.tempo).toBe(160);
		expect(snapshot.reverb).toBe(0);
		expect(snapshot.rhythm).toBe(1);

		// eqFilter exists
		expect(snapshot.eqFilter.controlPointCount).toBe(0);

		// Song-level octave/key
		expect(snapshot.octave).toBe(0);
		expect(snapshot.key).toBe(0);

		// Pattern/layer flags
		expect(snapshot.patternInstruments).toBeTrue();
		expect(snapshot.layeredInstruments).toBeFalse();

		// scaleCustom array
		expect(snapshot.scaleCustom.length).toBe(12);
	});

	test("version increments monotonically on each build", () => {
		const song: Song = new Song();
		const builder: SnapshotBuilder = new SnapshotBuilder();

		const s1 = builder.build(song);
		const s2 = builder.build(song);
		const s3 = builder.build(song);

		expect(s1.version).toBe(1);
		expect(s2.version).toBe(2);
		expect(s3.version).toBe(3);
	});

	test("editSequence increments after incrementEditSequence", () => {
		const song: Song = new Song();
		const builder: SnapshotBuilder = new SnapshotBuilder();

		expect(builder.editSequence).toBe(0);

		const s1 = builder.build(song);
		expect(s1.editSequence).toBe(0);

		builder.incrementEditSequence();
		expect(builder.editSequence).toBe(1);

		const s2 = builder.build(song);
		expect(s2.editSequence).toBe(1);

		builder.incrementEditSequence();
		builder.incrementEditSequence();
		const s3 = builder.build(song);
		expect(s3.editSequence).toBe(3);
	});

	test("snapshot is deeply immutable — modifying Song does not change snapshot", () => {
		const song: Song = new Song();
		const builder: SnapshotBuilder = new SnapshotBuilder();
		const snapshot = builder.build(song);

		// Mutate song after snapshot
		song.masterGain = 0.5;
		song.tempo = 200;
		song.barCount = 16;
		song.channels[0].muted = true;
		song.channels[0].instruments[0].volume = 50;

		// Snapshot retains original values
		expect(snapshot.masterGain).toBe(1.0);
		expect(snapshot.tempo).toBe(160);
		expect(snapshot.barCount).toBe(8);
		expect(snapshot.channelSnapshots[0].muted).toBeFalse();
		expect(snapshot.channelSnapshots[0].instruments[0].volume).toBe(0);
	});

	test("snapshot with known song structure — channels, instruments, patterns", () => {
		const song: Song = new Song();
		// Build a specific structure
		song.pitchChannelCount = 1;
		song.noiseChannelCount = 1;
		song.modChannelCount = 0;
		song.barCount = 4;
		song.beatsPerBar = 4;
		song.loopStart = 0;
		song.loopLength = 4;
		song.title = "Test Song";

		// Reset channels
		song.channels.length = 2;
		for (let i: number = 0; i < 2; i++) {
			song.channels[i] = song.channels[i] ?? new (require("../../../synth/channels").Channel)();
		}
		const channel: typeof song.channels[0] = song.channels[0];

		// Add two instruments to channel 0
		channel.instruments.length = 2;
		channel.instruments[0] = new Instrument(false, false);
		channel.instruments[0].type = 1;
		channel.instruments[0].volume = 20;
		channel.instruments[1] = new Instrument(false, false);
		channel.instruments[1].type = 2;
		channel.instruments[1].volume = 30;
		channel.muted = false;

		// Add a pattern with one note
		const pattern = channel.patterns[0];
		pattern.notes.push(new Note(60, 0, 4, 8));
		pattern.instruments[0] = 0;
		channel.bars[0] = 1;

		// Add noise channel
		const noiseChannel: typeof song.channels[0] = song.channels[1];
		noiseChannel.instruments.length = 1;
		noiseChannel.instruments[0] = new Instrument(true, false);
		noiseChannel.instruments[0].volume = 15;
		noiseChannel.muted = false;
		noiseChannel.bars[0] = 0;

		// Build snapshot
		const builder: SnapshotBuilder = new SnapshotBuilder();
		const snapshot = builder.build(song);

		expect(snapshot.pitchChannelCount).toBe(1);
		expect(snapshot.noiseChannelCount).toBe(1);
		expect(snapshot.modChannelCount).toBe(0);
		expect(snapshot.channelSnapshots.length).toBe(2);
		expect(snapshot.beatsPerBar).toBe(4);
		expect(snapshot.barCount).toBe(4);
		expect(snapshot.loopBarStart).toBe(0);
		expect(snapshot.loopBarEnd).toBe(4);

		// Channel 0: 2 instruments, no mute
		const ch0 = snapshot.channelSnapshots[0];
		expect(ch0.muted).toBeFalse();
		expect(ch0.instruments.length).toBe(2);
		expect(ch0.instruments[0].volume).toBe(20);
		expect(ch0.instruments[1].volume).toBe(30);

		// Channel 0 pattern 0 has a note
		expect(ch0.patterns[0].notes.length).toBe(1);
		const noteSnap = ch0.patterns[0].notes[0];
		expect(noteSnap.pitches[0]).toBe(60);
		expect(noteSnap.start).toBe(0);
		expect(noteSnap.end).toBe(4);
		expect(noteSnap.pins.length).toBeGreaterThanOrEqual(2);

		// Bar map: bar 0 → pattern index 1 (bars are 1-indexed)
		expect(ch0.barPatternMap[0]).toBe(1);

		// Channel 1: noise, 1 instrument
		const ch1 = snapshot.channelSnapshots[1];
		expect(ch1.instruments.length).toBe(1);
		expect(ch1.instruments[0].volume).toBe(15);
		// Bar 0 has no pattern
		expect(ch1.barPatternMap[0]).toBe(0);
	});

	test("instrument snapshot is deeply immutable — no shared references", () => {
		const inst: Instrument = new Instrument(false, false);
		const snap = snapshotInstrument(inst);

		// Modify original arrays
		inst.volume = 99;
		inst.pan = 50;
		inst.pulseWidth = 100;
		inst.modChannels[0] = 999;
		inst.envelopes[0] = new (require("../../../synth/instruments").EnvelopeSettings)(false);

		// Snapshot unchanged
		expect(snap.volume).toBe(0);
		expect(snap.modChannels.length).toBe(0); // non-mod channel has no mod arrays
	});

	test("snapshot with custom wave data (Float32Array → number[])", () => {
		const inst: Instrument = new Instrument(false, false);
		const snap = snapshotInstrument(inst);

		expect(snap.customChipWave.length).toBe(64);
		expect(snap.customChipWaveIntegral.length).toBe(65);

		// Confirm it's not the same reference
		expect(snap.customChipWave).not.toBe(inst.customChipWave as unknown as readonly number[]);
	});

	test("snapshot with note with multiple pins and chords", () => {
		const song: Song = new Song();
		const ch = song.channels[0];
		ch.instruments.length = 1;
		ch.instruments[0] = new Instrument(false, false);

		// A note with 3 pins and 2 pitches
		const note: Note = new Note(60, 0, 8, 12);
		note.pitches.push(64); // chord
		note.pins.push(
			{ interval: 0, time: 4, size: 10 },
			{ interval: 1, time: 8, size: 0 },
		);
		note.velocity = 100;
		const pattern = ch.patterns[0];
		pattern.notes.push(note);
		ch.bars[0] = 1;

		const builder: SnapshotBuilder = new SnapshotBuilder();
		const snapshot = builder.build(song);
		const noteSnap = snapshot.channelSnapshots[0].patterns[0].notes[0];

		expect(noteSnap.pitches.length).toBe(2);
		expect(noteSnap.pitches[1]).toBe(64);
		expect(noteSnap.pins.length).toBeGreaterThanOrEqual(2);
		expect(noteSnap.velocity).toBe(100);
		expect(noteSnap.start).toBe(0);
		expect(noteSnap.end).toBe(8);
	});

	test("filter settings snapshot deep copies control points", () => {
		const inst: Instrument = new Instrument(false, false);
		inst.eqFilter.addPoint(0, 10, 20);
		inst.eqFilter.addPoint(1, 30, 40);

		const snap = snapshotInstrument(inst);
		expect(snap.eqFilter.controlPointCount).toBe(2);
		expect(snap.eqFilter.controlPoints[0].type).toBe(0);
		expect(snap.eqFilter.controlPoints[0].freq).toBe(10);
		expect(snap.eqFilter.controlPoints[0].gain).toBe(20);
		expect(snap.eqFilter.controlPoints[1].type).toBe(1);
	});

	test("loopRepeatCount from opts is reflected in snapshot", () => {
		const song: Song = new Song();
		const builder: SnapshotBuilder = new SnapshotBuilder();
		const snap = builder.build(song, { loopRepeatCount: 3 });
		expect(snap.loopRepeatCount).toBe(3);
	});

	test("snapshot includes key, octave, patternInstruments, layeredInstruments from modified song", () => {
	const song: Song = new Song();
	song.key = 3;
	song.octave = 4;
	song.patternInstruments = false;
	song.layeredInstruments = true;

	const builder: SnapshotBuilder = new SnapshotBuilder();
	const snap = builder.build(song);

	expect(snap.key).toBe(3);
	expect(snap.octave).toBe(4);
	expect(snap.patternInstruments).toBeFalse();
	expect(snap.layeredInstruments).toBeTrue();
});

test("scaleCustom array is copied by value", () => {
		const song: Song = new Song();
		const builder: SnapshotBuilder = new SnapshotBuilder();
		const snap = builder.build(song);

		expect(snap.scaleCustom.length).toBe(12);
		// Modify original
		song.scaleCustom[0] = false;
		expect(snap.scaleCustom[0]).toBeTrue(); // unchanged
	});

	test("barPatternMap length matches barCount", () => {
		const song: Song = new Song();
		// Modify barCount before building so channels.bars arrays are shorter
		song.barCount = 16;
		const builder: SnapshotBuilder = new SnapshotBuilder();
		const snap = builder.build(song);

		expect(snap.barCount).toBe(16);
		for (const ch of snap.channelSnapshots) {
			expect(ch.barPatternMap.length).toBe(16);
		}
	});
});

describe("SnapshotBuilder builder state", () => {
	test("get version returns current version", () => {
		const builder: SnapshotBuilder = new SnapshotBuilder();
		expect(builder.version).toBe(0);

		const song: Song = new Song();
		builder.build(song);
		expect(builder.version).toBe(1);

		builder.build(song);
		expect(builder.version).toBe(2);
	});

	test("edit sequence starts at 0", () => {
		const builder: SnapshotBuilder = new SnapshotBuilder();
		expect(builder.editSequence).toBe(0);
	});
});
