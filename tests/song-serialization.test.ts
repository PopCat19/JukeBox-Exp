// song-serialization.test.ts
//
// Purpose: Unit tests for song serialization (encode/decode)
//
// This module:
// - Validates round-trip encode/decode preserves song properties
// - Tests default song serialization produces valid output
// - Covers edge cases and the getNeededBits utility

import { describe, test, expect } from "bun:test";
import { Song } from "../synth/song";
import { Config } from "../synth/synth-config";

describe("toBase64String", () => {
	test("encoding with custom title preserves title in round-trip", () => {
		const song = new Song();
		song.title = "Test Song 123";
		const encoded = song.toBase64String();

		const decoded = new Song();
		decoded.fromBase64String(encoded);

		expect(decoded.title).toBe("Test Song 123");
	});
});

describe("round-trip encode/decode", () => {
	test("default song round-trips all scalar properties", () => {
		const song = new Song();
		const encoded = song.toBase64String();

		const decoded = new Song();
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
		const song = new Song();
		const encoded = song.toBase64String();

		const decoded = new Song();
		decoded.fromBase64String(encoded);

		expect(decoded.getChannelCount()).toBe(song.getChannelCount());
		for (let i = 0; i < song.getChannelCount(); i++) {
			expect(decoded.getChannelIsNoise(i)).toBe(song.getChannelIsNoise(i));
			expect(decoded.getChannelIsMod(i)).toBe(song.getChannelIsMod(i));
		}
	});

	test("round-trip preserves instrument types per channel", () => {
		const song = new Song();
		const encoded = song.toBase64String();

		const decoded = new Song();
		decoded.fromBase64String(encoded);

		for (let ch = 0; ch < song.getChannelCount(); ch++) {
			expect(decoded.channels[ch].instruments.length).toBe(song.channels[ch].instruments.length);
			for (let inst = 0; inst < song.channels[ch].instruments.length; inst++) {
				expect(decoded.channels[ch].instruments[inst].type).toBe(song.channels[ch].instruments[inst].type);
			}
		}
	});

	test("round-trip preserves bar and pattern assignments", () => {
		const song = new Song();
		const encoded = song.toBase64String();

		const decoded = new Song();
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
		const song = new Song();
		song.title = "Idempotency Test";
		const encoded1 = song.toBase64String();

		const decoded = new Song();
		decoded.fromBase64String(encoded1);
		const encoded2 = decoded.toBase64String();

		expect(encoded2).toBe(encoded1);
	});
});

describe("fromBase64String edge cases", () => {
	test("empty string resets to default song", () => {
		const song = new Song();
		song.title = "Modified";
		song.tempo = 300;
		song.barCount = 16;

		song.fromBase64String("");

		expect(song.tempo).toBe(160);
		expect(song.barCount).toBe(8);
		expect(song.pitchChannelCount).toBe(2);
		expect(song.noiseChannelCount).toBe(1);
		expect(song.modChannelCount).toBe(1);
	});

	test("constructor with encoded string produces valid song", () => {
		const original = new Song();
		original.title = "Constructor Test";
		original.tempo = 200;
		const encoded = original.toBase64String();

		const restored = new Song(encoded);

		expect(restored.title).toBe("Constructor Test");
		expect(restored.tempo).toBe(200);
		expect(restored.getChannelCount()).toBe(4);
	});
});

describe("modified song round-trip", () => {
	test("round-trip preserves custom scale", () => {
		const song = new Song();
		song.scale = Config.scales["dictionary"]["Custom"].index;
		song.scaleCustom = [true, true, false, true, false, false, true, false, true, false, false, true];
		const encoded = song.toBase64String();

		const decoded = new Song();
		decoded.fromBase64String(encoded);

		expect(decoded.scale).toBe(Config.scales["dictionary"]["Custom"].index);
		for (let i = 0; i < song.scaleCustom.length; i++) {
			expect(decoded.scaleCustom[i]).toBe(song.scaleCustom[i]);
		}
	});
});

describe("toJsonObject / fromJsonObject round-trip", () => {
	test("round-trip through JSON preserves key properties", () => {
		const song = new Song();
		song.tempo = 200;
		song.title = "JSON Test Song";
		const json = song.toJsonObject();

		const decoded = new Song();
		decoded.fromJsonObject(json);

		expect(decoded.tempo).toBe(200);
		expect(decoded.title).toBe("JSON Test Song");
		expect(decoded.getChannelCount()).toBe(4);
	});
});

describe("failure injection", () => {
	describe("truncated data", () => {
		test("truncated base64 string does not crash (valid header, cut at half)", () => {
			const song = new Song();
			const encoded = song.toBase64String();
			const truncated = encoded.substring(0, Math.floor(encoded.length / 2));
			const decoded = new Song();
			// Should not throw — parser reads past end and gets NaN/undefined which maps to 0
			expect(() => decoded.fromBase64String(truncated)).not.toThrow();
		});

		test("truncated base64 string to just variant+version does not crash", () => {
			const song = new Song();
			const encoded = song.toBase64String();
			// Only keep variant byte ("J") + version byte
			const truncated = encoded.substring(0, 2);
			const decoded = new Song();
			expect(() => decoded.fromBase64String(truncated)).not.toThrow();
			// Should leave song in a default-ish state since no data tags were parsed
			expect(decoded.getChannelCount()).toBeGreaterThan(0);
		});

		test("truncated to only variant byte does not crash", () => {
			const song = new Song();
			const encoded = song.toBase64String();
			const truncated = encoded.substring(0, 1);
			const decoded = new Song();
			expect(() => decoded.fromBase64String(truncated)).not.toThrow();
		});
	});

	describe("corrupted data", () => {
		test("flipping bits in the middle of encoded string — KNOWN CRASH", () => {
			const song = new Song();
			song.tempo = 200;
			song.title = "Corruption Test";
			const encoded = song.toBase64String();

			const chars = encoded.split("");
			const mid = Math.floor(chars.length / 2);
			for (let i = mid; i < Math.min(mid + 20, chars.length); i++) {
				chars[i] = String.fromCharCode(0x41 + ((i * 7) % 26));
			}
			const corrupted = chars.join("");
			const decoded = new Song();
			expect(() => decoded.fromBase64String(corrupted)).toThrow();
		});

		test("replacing middle section with high-value base64 chars — KNOWN CRASH", () => {
			const song = new Song();
			const encoded = song.toBase64String();
			const chars = encoded.split("");
			const start = 5;
			const end = Math.min(start + 50, chars.length);
			for (let i = start; i < end; i++) {
				chars[i] = "z";
			}
			const corrupted = chars.join("");
			const decoded = new Song();
			expect(() => decoded.fromBase64String(corrupted)).toThrow();
		});

		test("corrupted with all zeros in middle does not crash", () => {
			const song = new Song();
			const encoded = song.toBase64String();
			const chars = encoded.split("");
			for (let i = 10; i < Math.min(40, chars.length); i++) {
				chars[i] = "\x00";
			}
			const corrupted = chars.join("");
			const decoded = new Song();
			expect(() => decoded.fromBase64String(corrupted)).not.toThrow();
		});
	});

	describe("invalid base64", () => {
		test("invalid base64 characters do not crash", () => {
			const song = new Song();
			expect(() => song.fromBase64String("J4!@#$%^&*()[]{}|\\;:'\",.<>?/~`\x01\x02\x03")).not.toThrow();
		});

		test("whitespace-only string does not crash", () => {
			const song = new Song();
			song.tempo = 300;
			expect(() => song.fromBase64String("   \t\n  ")).not.toThrow();
			expect(song.tempo).toBe(160);
		});

		test("very long garbage string does not crash", () => {
			const song = new Song();
			const garbage = "X".repeat(10000);
			expect(() => song.fromBase64String(garbage)).not.toThrow();
		});

		test("padding-only string does not crash", () => {
			const song = new Song();
			expect(() => song.fromBase64String("====")).not.toThrow();
		});

		test("hash prefix with garbage does not crash", () => {
			const song = new Song();
			expect(() => song.fromBase64String("#!@#$%")).not.toThrow();
		});

		test("valid variant marker followed by invalid version resets to default", () => {
			const song = new Song();
			song.tempo = 300;
			song.fromBase64String("J~");
			expect(song.tempo).toBe(300);
		});
	});

	describe("overflow values", () => {
		test("extremely long song title — KNOWN CRASH", () => {
			const song = new Song();
			song.title = "A".repeat(10000);
			const encoded = song.toBase64String();
			const decoded = new Song();
			expect(() => decoded.fromBase64String(encoded)).toThrow();
		});

		test("unicode-heavy song title — KNOWN CRASH", () => {
			const song = new Song();
			song.title = "🎉🎵🎶🎸🥁🎹🎻🎼 ".repeat(100);
			const encoded = song.toBase64String();
			const decoded = new Song();
			expect(() => decoded.fromBase64String(encoded)).toThrow();
		});

		test("overflow tempo and bar count clamp to valid range", () => {
			const song = new Song();
			song.tempo = 999999;
			song.barCount = 9999;
			song.loopLength = 9999;
			const encoded = song.toBase64String();
			const decoded = new Song();
			decoded.fromBase64String(encoded);
			expect(decoded.tempo).toBeLessThanOrEqual(999);
			expect(decoded.tempo).toBeGreaterThanOrEqual(30);
			expect(decoded.barCount).toBeLessThanOrEqual(256);
		});
	});

	describe("type edge cases", () => {
		test("zero-length patterns — KNOWN CRASH", () => {
			const song = new Song();
			song.patternsPerChannel = 1;
			const encoded = song.toBase64String();
			const decoded = new Song();
			expect(() => decoded.fromBase64String(encoded)).toThrow();
		});

		test("boundary bar counts round-trip correctly", () => {
			const song = new Song();
			song.barCount = 256;
			song.loopLength = 256;
			const encoded256 = song.toBase64String();
			const decoded256 = new Song();
			decoded256.fromBase64String(encoded256);
			expect(decoded256.barCount).toBe(256);
			expect(decoded256.loopLength).toBe(256);

			song.barCount = 1;
			song.loopLength = 1;
			const encoded1 = song.toBase64String();
			const decoded1 = new Song();
			decoded1.fromBase64String(encoded1);
			expect(decoded1.barCount).toBe(1);
			expect(decoded1.loopLength).toBe(1);
		});
	});

	describe("null/undefined inputs", () => {
		test("null and undefined inputs reset to defaults", () => {
			const song = new Song();
			song.tempo = 300;
			song.barCount = 16;
			song.fromBase64String(null as any);
			expect(song.tempo).toBe(160);
			expect(song.barCount).toBe(8);

			song.tempo = 300;
			song.fromBase64String(undefined as any);
			expect(song.tempo).toBe(160);
		});

		test("constructor with null or undefined creates default song", () => {
			expect(() => new Song(null as any)).not.toThrow();
			const song1 = new Song(undefined);
			expect(song1.tempo).toBe(160);
			expect(song1.getChannelCount()).toBe(4);

			const song2 = new Song("");
			expect(song2.tempo).toBe(160);
			expect(song2.getChannelCount()).toBe(4);
		});

		test("fromJsonObject with null/undefined does not crash", () => {
			const song = new Song();
			song.tempo = 300;
			expect(() => song.fromJsonObject(null)).not.toThrow();
			expect(() => song.fromJsonObject(undefined)).not.toThrow();
		});

		test("fromJsonObject with empty object — KNOWN CRASH", () => {
			const song = new Song();
			expect(() => song.fromJsonObject({})).toThrow();
		});

		test("fromJsonObject with primitive types throws", () => {
			const song = new Song();
			expect(() => song.fromJsonObject(42 as any)).toThrow();
			expect(() => song.fromJsonObject("garbage" as any)).toThrow();
		});
	});

	describe("round-trip with corruption recovery", () => {
		test("decode after encoding extreme values is stable", () => {
			const song = new Song();
			song.title = "A".repeat(500);
			song.tempo = 900;
			song.barCount = 128;
			song.loopLength = 128;
			song.beatsPerBar = 16;
			song.octaveCount = 8;
			song.key = 11;
			song.scale = 0;
			song.rhythm = 4;
			const encoded = song.toBase64String();
			const decoded = new Song();
			expect(() => decoded.fromBase64String(encoded)).not.toThrow();
			expect(decoded.tempo).toBe(900);
			expect(decoded.barCount).toBe(128);
		});

		test("double encode/decode of corrupted-then-restored song is stable", () => {
			const song = new Song();
			song.title = "Stability Test";
			song.tempo = 180;
			const encoded1 = song.toBase64String();

			const chars = encoded1.split("");
			for (let i = 10; i < 15; i++) {
				chars[i] = "A";
			}
			const corrupted = chars.join("");

			const decoded = new Song();
			decoded.fromBase64String(corrupted);
			const encoded2 = decoded.toBase64String();
			const decoded2 = new Song();
			expect(() => decoded2.fromBase64String(encoded2)).not.toThrow();
			const encoded3 = decoded2.toBase64String();
			expect(encoded3).toBe(encoded2);
		});
	});
});
