// song-round-trip.test.ts
//
// Purpose: Integration tests for song serialization round-trip encode/decode
//
// Tests that encoding a song to base64 or JSON and decoding it back produces
// an equivalent song. These verify format structure — any change that breaks
// the round-trip invariant fails here.

import { describe, test, expect } from "bun:test";
import { fromJukeboxExpV2Json, toJukeboxExpV2Json } from "../synth/formats/jukebox-exp-v2";
import { Song } from "../synth/song";
import { tagInstrumentWithModule } from "../synth/socket/instrument-tagging";
import { getInstrumentCount } from "../synth/socket/registry";
import { Config, InstrumentType } from "../synth/synth-config";
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

describe("effects and envelope round-trip", () => {
	test("round-trip preserves effects bitmask", () => {
		const song = createTestSong();
		const instr = song.channels[0].instruments[0];
		instr.effects = 0x2400;
		const encoded = song.toBase64String();

		const decoded = createTestSong();
		decoded.fromBase64String(encoded);
		const decodedInstr = decoded.channels[0].instruments[0];

		expect(decodedInstr.effects).toBe(0x2400);
	});

	test("round-trip preserves loop bounds", () => {
		const song = createTestSong();
		song.loopStart = 2;
		song.loopLength = 4;

		const encoded = song.toBase64String();
		const decoded = createTestSong();
		decoded.fromBase64String(encoded);

		expect(decoded.loopStart).toBe(2);
		expect(decoded.loopLength).toBe(4);
	});

	test("round-trip preserves non-default limiter settings", () => {
		const song = createTestSong();
		song.limitDecay = 10;
		song.limitRise = 5000;
		song.compressionThreshold = 0.5;
		song.limitThreshold = 0.8;
		song.compressionRatio = 0.5;
		song.limitRatio = 0.5;
		song.masterGain = 0.8;

		const encoded = song.toBase64String();
		const decoded = createTestSong();
		decoded.fromBase64String(encoded);

		expect(decoded.limitDecay).toBeCloseTo(10, 0);
		expect(decoded.limitRise).toBeCloseTo(5000, -2);
		expect(decoded.compressionThreshold).toBeCloseTo(0.5, 1);
		expect(decoded.limitThreshold).toBeCloseTo(0.8, 1);
	});
});

describe("JukeboxExp JSON round-trip", () => {
	test("v2 preserves supersaw dynamism and opaque module payloads", () => {
		const song = createTestSong();
		const instrument = song.channels[0].instruments[0];
		instrument.type = InstrumentType.supersaw;
		instrument.supersawDynamism = 17;
		instrument.supersawSpread = 23;
		instrument.supersawShape = 9;
		tagInstrumentWithModule(instrument);
		const json = toJukeboxExpV2Json(song as any);
		const decoded = createTestSong();
		fromJukeboxExpV2Json(decoded as any, json);
		const restored = decoded.channels[0].instruments[0];
		expect(restored.supersawDynamism).toBe(17);
		expect(restored.supersawSpread).toBe(23);
		expect(restored.supersawShape).toBe(9);

		const productionDecoded = new Song(JSON.stringify(json));
		const productionRestored = productionDecoded.channels[0].instruments[0];
		expect(productionRestored.supersawDynamism).toBe(17);
		expect(productionRestored.supersawSpread).toBe(23);
		expect(productionRestored.supersawShape).toBe(9);

		const unknown = {
			...json,
			modulePayloads: {
				"0:0": {
					id: "community.round-trip-unknown",
					version: 44,
					params: { nested: { values: [1, true, null, "kept"] } },
				},
			},
		};
		const before = getInstrumentCount();
		const opaque = createTestSong();
		fromJukeboxExpV2Json(opaque as any, unknown as any);
		expect(getInstrumentCount()).toBe(before);
		const reencoded = toJukeboxExpV2Json(opaque as any);
		expect(reencoded.modulePayloads?.["0:0"]).toEqual(unknown.modulePayloads["0:0"]);
	});

	test("round-trip through JukeboxExp JSON preserves properties", () => {
		const { toJukeboxExpJson, fromJukeboxExpJson } = require("../synth/formats/jukebox-exp");
		const song = createTestSong();
		song.tempo = 180;
		song.title = "JukeboxExp Test";

		const json = toJukeboxExpJson(song as any);
		const decoded = createTestSong();
		fromJukeboxExpJson(decoded as any, json);

		expect(decoded.tempo).toBe(180);
		expect(decoded.title).toBe("JukeboxExp Test");
		expect(decoded.getChannelCount()).toBe(song.getChannelCount());
	});
});
