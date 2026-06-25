// song-round-trip.test.ts
//
// Purpose: Integration tests for song serialization round-trip encode/decode
//
// Tests that encoding a song to base64 or JSON and decoding it back produces
// an equivalent song. These verify format structure — any change that breaks
// the round-trip invariant fails here.

import { describe, test, expect } from "bun:test";
import { Config } from "../synth/synth-config";
import { createTestSong } from "./test-helpers";

describe("round-trip encode/decode", () => {
	test("default song round-trips all scalar properties", () => {
		const song = createTestSong();
		const encoded = song.toBase64String();

		const decoded = createTestSong();
		decoded.fromBase64String(encoded);

		expect(decoded.pitchChannelCount).toBe(song.pitchChannelCount);
		expect(decoded.noiseChannelCount).toBe(song.noiseChannelCount);
		expect(decoded.modChannelCount).toBe(song.modChannelCount);
		expect(decoded.tempo).toBe(song.tempo);
		expect(decoded.barCount).toBe(song.barCount);
		expect(decoded.beatsPerBar).toBe(song.beatsPerBar);
		expect(decoded.patternsPerChannel).toBe(song.patternsPerChannel);
		expect(decoded.loopStart).toBe(song.loopStart);
		expect(decoded.loopLength).toBe(song.loopLength);
		expect(decoded.octaveCount).toBe(song.octaveCount);
		expect(decoded.key).toBe(song.key);
		expect(decoded.scale).toBe(song.scale);
		expect(decoded.rhythm).toBe(song.rhythm);
	});

	test("round-trip preserves channel count and types", () => {
		const song = createTestSong();
		const encoded = song.toBase64String();

		const decoded = createTestSong();
		decoded.fromBase64String(encoded);

		expect(decoded.getChannelCount()).toBe(song.getChannelCount());
		for (let i = 0; i < song.getChannelCount(); i++) {
			expect(decoded.getChannelIsNoise(i)).toBe(song.getChannelIsNoise(i));
			expect(decoded.getChannelIsMod(i)).toBe(song.getChannelIsMod(i));
		}
	});

	test("round-trip preserves instrument types per channel", () => {
		const song = createTestSong();
		const encoded = song.toBase64String();

		const decoded = createTestSong();
		decoded.fromBase64String(encoded);

		for (let ch = 0; ch < song.getChannelCount(); ch++) {
			expect(decoded.channels[ch].instruments.length).toBe(song.channels[ch].instruments.length);
			for (let inst = 0; inst < song.channels[ch].instruments.length; inst++) {
				expect(decoded.channels[ch].instruments[inst].type).toBe(song.channels[ch].instruments[inst].type);
			}
		}
	});

	test("round-trip preserves bar and pattern assignments", () => {
		const song = createTestSong();
		const encoded = song.toBase64String();

		const decoded = createTestSong();
		decoded.fromBase64String(encoded);

		for (let ch = 0; ch < song.getChannelCount(); ch++) {
			expect(decoded.channels[ch].bars.length).toBe(song.channels[ch].bars.length);
			expect(decoded.channels[ch].patterns.length).toBe(song.channels[ch].patterns.length);
			for (let bar = 0; bar < song.barCount; bar++) {
				expect(decoded.channels[ch].bars[bar]).toBe(song.channels[ch].bars[bar]);
			}
		}
	});

	test("double round-trip is idempotent", () => {
		const song = createTestSong();
		song.title = "Idempotency Test";
		const encoded1 = song.toBase64String();

		const decoded = createTestSong();
		decoded.fromBase64String(encoded1);
		const encoded2 = decoded.toBase64String();

		expect(encoded2).toBe(encoded1);
	});
});

describe("modified song round-trip", () => {
	test("round-trip preserves custom scale", () => {
		const song = createTestSong();
		song.scale = Config.scales["dictionary"]["Custom"].index;
		song.scaleCustom = [true, true, false, true, false, false, true, false, true, false, false, true];
		const encoded = song.toBase64String();

		const decoded = createTestSong();
		decoded.fromBase64String(encoded);

		expect(decoded.scale).toBe(Config.scales["dictionary"]["Custom"].index);
		for (let i = 0; i < song.scaleCustom.length; i++) {
			expect(decoded.scaleCustom[i]).toBe(song.scaleCustom[i]);
		}
	});
});

describe("toJsonObject / fromJsonObject round-trip", () => {
	test("round-trip through JSON preserves key properties", () => {
		const song = createTestSong();
		song.tempo = 200;
		song.title = "JSON Test Song";
		const json = song.toJsonObject();

		const decoded = createTestSong();
		decoded.fromJsonObject(json);

		expect(decoded.tempo).toBe(200);
		expect(decoded.title).toBe("JSON Test Song");
		expect(decoded.getChannelCount()).toBe(4);
	});
});
