// tests/examples/community-simple-synth.test.ts
//
// Purpose: End-to-end smoke test for the reference community module
//
// This module:
// - Loads community_modules/simple_synth through the external loader
// - Verifies module shape, generated source compiles, runtime writes samples
// - Verifies _socketModuleId survives a fresh instrument round-trip via v2 JSON
// - Verifies serde round-trip

import { describe, test, expect, beforeAll } from "bun:test";
import path from "path";
import { loadExternalModule } from "../../synth/socket/external-loader";
import { clearRegistry, getInstrument } from "../../synth/socket/registry";
import type { InstrumentModule } from "../../synth/socket/instrument-module";
import { Instrument } from "../../synth/instruments/instrument";
import { Song } from "../../synth/song";
import {
	toJukeboxExpV2Json,
	fromJukeboxExpV2Json,
} from "../../synth/formats/jukebox-exp-v2";

const MODULE_PATH = path.join(
	import.meta.dirname,
	"..",
	"..",
	"community_modules",
	"simple_synth",
	"module.ts",
);

let mod: InstrumentModule | undefined;

beforeAll(async () => {
	clearRegistry();
	const result = await loadExternalModule(MODULE_PATH);
	if (!result.success) throw new Error(`load failed: ${result.error}`);
	mod = getInstrument(result.id!);
});

// ─── module shape ───────────────────────────────────────────────────────────

describe("community simple_synth module", () => {
	test("loader registers the module with the expected id", () => {
		expect(mod!.id).toBe("community.simple.synth");
	});

	test("displayName and socketVersion are set", () => {
		expect(mod!.displayName).toBe("Simple Sine");
		expect(mod!.socketVersion).toEqual(expect.any(Number));
	});

	test("schema has a single frequency param", () => {
		expect(mod!.schema.params.length).toBe(1);
		expect(mod!.schema.params[0].key).toBe("frequency");
		expect(mod!.schema.params[0].type).toBe("int");
	});

	test("serialize/deserialize callable and round-trip", () => {
		const writes: [string, number][] = [];
		const w = {
			writeInt: (key: string, value: number) => {
				writes.push([key, value]);
			},
			writeFloat: () => {},
			writeBoolean: () => {},
			writeEnum: () => {},
			writeBlob: () => {},
		};
		mod!.serialize({ frequency: 880 }, w);
		expect(writes).toEqual([["frequency", 880]]);
		const reads = new Map<string, number>(writes);
		const r = {
			readInt: (key: string, def: number) => (reads.get(key) ?? def),
			readFloat: (_: string, def: number) => def,
			readBoolean: (_: string, def: boolean) => def,
			readEnum: (_: string, def: number) => def,
			readBlob: () => undefined,
			hasKey: (key: string) => reads.has(key),
		};
		const restored = mod!.deserialize(r, 1);
		expect(restored.frequency).toBe(880);
	});
});

// ─── generated source compiles ──────────────────────────────────────────────

describe("simple_synth dsp source", () => {
	test("buildSynthSource produces a valid function expression", () => {
		const source = mod!.buildSynthSource({
			sampleRate: 44100,
			blockSize: 128,
			maxVoices: 1,
			macros: {},
		} as never);
		expect(typeof source).toBe("string");
		expect(() => new Function(source)).not.toThrow();
	});

	test("compiled function writes nonzero samples to the synth buffer", () => {
		const source = mod!.buildSynthSource({
			sampleRate: 44100,
			blockSize: 128,
			maxVoices: 1,
			macros: {},
		} as never);
		const factory = new Function(source) as () => (
			synth: unknown,
			bufferIndex: number,
			runLength: number,
			tone: { phases: number[] },
			instrumentState: { frequency: number; volumeScale: number },
		) => void;
		const render = factory();

		const sampleRate = 44100;
		const runLength = 1024;
		const buffer = new Float32Array(runLength);
		const synthMock = {
			tempMonoInstrumentSampleBuffer: buffer,
			sampleRate,
		};
		const tone = { phases: [0] };
		const instrumentState = { frequency: 440, volumeScale: 0.5 };

		render(synthMock, 0, runLength, tone, instrumentState);

		let maxAbs = 0;
		for (let i = 0; i < runLength; i++) {
			const v = Math.abs(buffer[i]);
			if (v > maxAbs) maxAbs = v;
		}
		// Should produce roughly half-amplitude oscillation
		expect(maxAbs).toBeGreaterThan(0.1);
		expect(maxAbs).toBeLessThanOrEqual(0.5 + 1e-6);
	});
});

// ─── end-to-end with a fresh instrument ─────────────────────────────────────

describe("simple_synth integrated into a Song", () => {
	test("manually tagged instrument round-trips _socketModuleId through v2", () => {
		const song = new Song();
		const instrument: Instrument = new Instrument(false, false);
		(instrument as unknown as { _socketModuleId: string })._socketModuleId =
			"community.simple.synth";
		song.channels[0].instruments[0] = instrument;

		const exported = toJukeboxExpV2Json(song as never);
		expect(exported.modulePayloads).toBeDefined();

		const newSong = new Song();
		fromJukeboxExpV2Json(newSong as never, exported);
		const restored = (newSong.channels[0].instruments[0] as unknown as {
			_socketModuleId?: string;
		})._socketModuleId;
		expect(restored).toBe("community.simple.synth");
	});
});
