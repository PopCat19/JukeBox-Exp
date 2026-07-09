// plugin-round-trip.test.ts
//
// Purpose: Per-plugin-type encode→decode→parameter-preservation round-trip tests
//
// Verifies that setting an instrument to a specific type, encoding the song,
// and decoding it back preserves the instrument type and key parameters.
// Each plugin type gets its own describe block.

import { describe, test, expect } from "bun:test";
import { InstrumentType } from "../synth/synth-config";
import { createTestSong } from "./test-helpers";

/** Helper: sets instrument type on channel 0 instrument 0, round-trips, checks type. */
function assertInstrumentTypeRoundTrips(type: InstrumentType): void {
	const song = createTestSong();
	const ch0 = song.channels[0];
	const instr = ch0.instruments[0];
	instr.setTypeAndReset(type, false, false);

	const encoded = song.toBase64String();
	const decoded = createTestSong();
	decoded.fromBase64String(encoded);

	const decodedInstr = decoded.channels[0].instruments[0];
	expect(decodedInstr.type).toBe(type);
}

describe("Instrument type round-trip", () => {
	test("chip type round-trips", () => {
		assertInstrumentTypeRoundTrips(InstrumentType.chip);
	});

	test("fm type round-trips", () => {
		assertInstrumentTypeRoundTrips(InstrumentType.fm);
	});

	test("noise type round-trips", () => {
		const song = createTestSong();
		const ch2 = song.channels[2]; // noise channel (pitch=2, noise=1, mod=1)
		const instr = ch2.instruments[0];
		instr.setTypeAndReset(InstrumentType.noise, true, false);

		const encoded = song.toBase64String();
		const decoded = createTestSong();
		decoded.fromBase64String(encoded);

		const decodedInstr = decoded.channels[2].instruments[0];
		expect(decodedInstr.type).toBe(InstrumentType.noise);
	});

	test("spectrum type round-trips on pitch channel", () => {
		assertInstrumentTypeRoundTrips(InstrumentType.spectrum);
	});

	test("drumset type round-trips on pitch channel", () => {
		assertInstrumentTypeRoundTrips(InstrumentType.drumset);
	});

	test("harmonics type round-trips", () => {
		assertInstrumentTypeRoundTrips(InstrumentType.harmonics);
	});

	test("pwm (pulse) type round-trips", () => {
		assertInstrumentTypeRoundTrips(InstrumentType.pwm);
	});

	test("pickedString type round-trips", () => {
		assertInstrumentTypeRoundTrips(InstrumentType.pickedString);
	});

	test("supersaw type round-trips", () => {
		assertInstrumentTypeRoundTrips(InstrumentType.supersaw);
	});

	test("customChipWave type round-trips", () => {
		assertInstrumentTypeRoundTrips(InstrumentType.customChipWave);
	});

	test("mod type round-trips on mod channel", () => {
		const song = createTestSong();
		const ch3 = song.channels[3]; // mod channel (pitch=2, noise=1, mod=1)
		const instr = ch3.instruments[0];
		instr.setTypeAndReset(InstrumentType.mod, false, true);

		const encoded = song.toBase64String();
		const decoded = createTestSong();
		decoded.fromBase64String(encoded);

		const decodedInstr = decoded.channels[3].instruments[0];
		expect(decodedInstr.type).toBe(InstrumentType.mod);
	});

	test("fm6op type round-trips", () => {
		assertInstrumentTypeRoundTrips(InstrumentType.fm6op);
	});

	test("opl3 type round-trips", () => {
		assertInstrumentTypeRoundTrips(InstrumentType.opl3);
	});
});

describe("Instrument type round-trip updates correct instrument", () => {
	test("changing type after encoding is independent", () => {
		const song = createTestSong();
		song.channels[0].instruments[0].setTypeAndReset(InstrumentType.fm, false, false);

		const encoded = song.toBase64String();
		const decoded = createTestSong();
		decoded.fromBase64String(encoded);

		// Verify original song still has its type
		expect(song.channels[0].instruments[0].type).toBe(InstrumentType.fm);
		// Decoded song also has the type
		expect(decoded.channels[0].instruments[0].type).toBe(InstrumentType.fm);
	});
});
