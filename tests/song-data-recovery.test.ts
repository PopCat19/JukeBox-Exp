// song-data-recovery.test.ts
//
// Purpose: Guards atomic song loading and malformed recovery record handling.
//
// This module:
// - Covers bounded modulator and target repairs
// - Rejects stale decoder indexes with typed data errors
// - Verifies failed song changes preserve the active song
// - Covers defensive recovery parsing and duplicate history events

import { afterEach, describe, expect, test } from "bun:test";
import { ChangeSong } from "../editor/changes/song";
import { EditorConfig } from "../editor/config/editor-config";
import { BrowserHistoryManager } from "../editor/core/history-manager";
import { SongRecovery } from "../editor/io/song-recovery";
import {
	createCustomSampleHandler,
	createCustomSampleTransaction,
	decodeEditorSong,
} from "../editor/song-custom-samples";
import "../synth/plugins";
import { encode32BitNumber } from "../synth/serialization";
import { Song } from "../synth/song";
import type { InstrumentModule } from "../synth/socket/instrument-module";
import type { OpaqueSocketInstrument } from "../synth/socket/opaque-instrument";
import { registerInstrument } from "../synth/socket/registry";
import { SOCKET_VERSION } from "../synth/socket/version";
import { repairModTarget, SongDataError } from "../synth/synth-deserialize";
import { Config, sampleLoadEvents, sampleLoadingState } from "../synth/synth-config";
import { createTestNote } from "./test-helpers";

// Self-contained base64 helpers
const BASE64 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
const PRODUCTION_MODULE_HASH = new Song().toBase64String();
const GOLDBOX_LOOP_CONTROL_SAMPLE_HASH = "g4T0y0";
const GOLDBOX_SUPERSAW_SAMPLE_HASH = "g4T0xo";

function modulePayload(hash: string, tag: string): { start: number; length: number } {
	let tagIndex = hash.indexOf(tag);
	while (tagIndex !== -1) {
		let length = 0;
		let validLength = true;
		for (let i = 1; i <= 6; i++) {
			const value = BASE64.indexOf(hash[tagIndex + i]);
			if (value === -1) {
				validLength = false;
				break;
			}
			length = length * 64 + value;
		}
		const start = tagIndex + 7;
		if (validLength && length > 0 && start + length <= hash.length) {
			try {
				JSON.parse(atob(hash.slice(start, start + length)));
				return { start, length };
			} catch {
				// Continue past tag characters embedded inside another payload.
			}
		}
		tagIndex = hash.indexOf(tag, tagIndex + 1);
	}
	throw new Error(`Missing production ${tag} payload.`);
}

function replaceModulePayload(
	hash: string,
	tag: string,
	value: Record<string, unknown>,
): string {
	const current = modulePayload(hash, tag);
	const blob = btoa(JSON.stringify(value));
	const encoded: number[] = [tag.charCodeAt(0)];
	encode32BitNumber(encoded, blob.length);
	for (let i = 0; i < blob.length; i++) encoded.push(blob.charCodeAt(i));
	return `${hash.slice(0, current.start - 7)}${String.fromCharCode(...encoded)}${hash.slice(current.start + current.length)}`;
}

function readModulePayload(hash: string, tag: string): Record<string, unknown> {
	const payload = modulePayload(hash, tag);
	try {
		const decoded: unknown = JSON.parse(
			atob(hash.slice(payload.start, payload.start + payload.length)),
		);
		if (typeof decoded !== "object" || decoded == null || Array.isArray(decoded)) {
			throw new TypeError("Module payload must be an object.");
		}
		return decoded as Record<string, unknown>;
	} catch (error) {
		throw new Error(`Invalid production ${tag} payload.`, { cause: error });
	}
}

function patternPayload(hash: string): { start: number; bitLength: number } {
	const tagIndex: number = hash.lastIndexOf("p");
	const lc: number = BASE64.indexOf(hash[tagIndex + 1]);
	let len = 0;
	for (let i = 0; i < lc; i++) len = (len << 6) + BASE64.indexOf(hash[tagIndex + 2 + i]);
	return { start: tagIndex + 2 + lc, bitLength: len * 6 };
}

function mutatePayloadBits(hash: string, mutate: (bits: number[]) => void): string {
	const pl = patternPayload(hash);
	const chars: string[] = hash.split("");
	const bits: number[] = [];
	for (let i = pl.start; i < pl.start + pl.bitLength / 6; i++) {
		const v = BASE64.indexOf(hash[i]);
		for (let s = 5; s >= 0; s--) bits.push((v >> s) & 1);
	}
	mutate(bits);
	for (let i = 0; i < bits.length; i += 6) {
		let v = 0;
		for (let j = 0; j < 6; j++) v = (v << 1) | bits[i + j];
		chars[pl.start + i / 6] = BASE64[v];
	}
	return chars.join("");
}

class MemoryStorage {
	private readonly _items = new Map<string, string>();
	get length(): number { return this._items.size; }
	key(index: number): string | null { return Array.from(this._items.keys())[index] ?? null; }
	getItem(key: string): string | null { return this._items.get(key) ?? null; }
	setItem(key: string, value: string): void { this._items.set(key, value); }
	removeItem(key: string): void { this._items.delete(key); }
}

type TestGlobal =
	| "window"
	| "localStorage"
	| "document"
	| "fetch"
	| "AudioContext"
	| "OFFLINE"
	| "alert"
	| "location";

const originalGlobals = new Map<TestGlobal, PropertyDescriptor | undefined>();
for (const key of [
	"window",
	"localStorage",
	"document",
	"fetch",
	"AudioContext",
	"OFFLINE",
	"alert",
	"location",
] as const) {
	originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
}

function setGlobal(key: TestGlobal, value: unknown): void {
	Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}

afterEach(() => {
	originalGlobals.forEach((descriptor, key) => {
		if (descriptor === undefined) Reflect.deleteProperty(globalThis, key);
		else Object.defineProperty(globalThis, key, descriptor);
	});
});

describe("bounded song data repairs", () => {
	test("production decoder repairs modulator 63", () => {
		// Encode a song with a known modulator value (pan=6), then
		// mutate those 6 bits to all 1s (value 63). The decoder's
		// repairModulatorIndex must map 63 to "none".
		const song = new Song();
		const mi = song.pitchChannelCount + song.noiseChannelCount;
		song.channels[mi].instruments[0].modulators[0] = 6; // "pan"
		song.channels[mi].instruments[0].modChannels[0] = 0;
		song.channels[mi].instruments[0].modInstruments[0] = 0;
		const hash = song.toBase64String();

		// 3 non-mod channels x 32 empty patterns x 1 bit = 96 bits
		// then 2 status + 8 channel + 4 instrument bits for mod[0]
		const modOffset = 96 + 2 + 8 + 4;
		const corrupted = mutatePayloadBits(hash, (b) => b.fill(1, modOffset, modOffset + 6));
		expect(corrupted).not.toBe(hash);

		const decoded = new Song(corrupted);
		expect(decoded.channels[mi].instruments[0].modulators[0]).toBe(
			Config.modulators.dictionary.none.index,
		);
	});

	test("invalid channel and instrument targets become disabled", () => {
		const song = new Song();
		expect(repairModTarget(63, 63, song as never)).toEqual({ channelIndex: -2, instrumentIndex: 0 });
		expect(repairModTarget(0, 63, song as never)).toEqual({ channelIndex: -2, instrumentIndex: 0 });
	});

	test("production decoder disables a target corrupted into a mod channel", () => {
		const song = new Song();
		const modChannel = song.pitchChannelCount + song.noiseChannelCount;
		const instrument = song.channels[modChannel].instruments[0];
		instrument.modulators[0] = 6;
		instrument.modChannels[0] = 0;
		instrument.modInstruments[0] = 0;
		const hash = song.toBase64String();
		const targetChannelOffset = 96 + 2;
		const corrupted = mutatePayloadBits(hash, (bits) => {
			bits.fill(1, targetChannelOffset, targetChannelOffset + 8);
		});

		const decoded = new Song(corrupted);
		const decodedInstrument = decoded.channels[modChannel].instruments[0];
		expect(decodedInstrument.modChannels[0]).toBe(-2);
		expect(decodedInstrument.modInstruments[0]).toBe(0);
		expect(decodedInstrument.modulators[0]).toBe(Config.modulators.dictionary.none.index);
	});

	function createSingleNoteSong(): Song {
		const song = new Song();
		song.patternsPerChannel = 1;
		for (let ci = 0; ci < song.channels.length; ci++) {
			song.channels[ci].patterns.length = 1;
			song.channels[ci].patterns[0].notes = [];
		}
		song.channels[0].patterns[0].notes = [createTestNote(60, 0, 4, 8)];
		return song;
	}

	test("production decoder rejects stale shape index", () => {
		const noteHash = createSingleNoteSong().toBase64String();
		const corrupted = mutatePayloadBits(noteHash, (bits) => {
			bits[1] = 1;
		});
		expect(() => new Song(corrupted)).toThrow(SongDataError);
	});

	test("production decoder clamps historical pitch cache indexes", () => {
		const noteHash = createSingleNoteSong().toBase64String();
		const historical = mutatePayloadBits(noteHash, (bits) => {
			bits[13] = 1;
			bits.fill(1, 14, 18);
		});

		const decoded = new Song(historical);
		expect(decoded.channels[0].patterns[0].notes[0].pitches).toEqual([24]);
	});

	test("rejects a malformed socket blob emitted by the production serializer", () => {
		const payload = modulePayload(PRODUCTION_MODULE_HASH, "Z");
		const malformed = `${PRODUCTION_MODULE_HASH.slice(0, payload.start)}!${PRODUCTION_MODULE_HASH.slice(payload.start + 1)}`;

		expect(payload.length).toBeGreaterThan(0);
		expect(() => new Song(malformed)).toThrow(SongDataError);
	});

	test("unknown socket params hydrate once after late module registration", () => {
		const moduleId = "community.recovery-late-hydration";
		const unknownPayload = {
			id: moduleId,
			version: 37,
			params: {
				gain: 7,
				nested: { values: [1, true, null, { depth: "kept" }] },
			},
		};
		const withUnknown = replaceModulePayload(
			PRODUCTION_MODULE_HASH,
			"Z",
			unknownPayload,
		);
		const decoded = new Song(withUnknown);
		const instrument = decoded.channels[0].instruments[0] as OpaqueSocketInstrument & {
			gain?: number;
		};

		expect(readModulePayload(decoded.toBase64String(), "Z")).toEqual(unknownPayload);
		const deserializeVersions: number[] = [];
		const module: InstrumentModule = {
			id: moduleId,
			socketVersion: SOCKET_VERSION,
			displayName: "Late hydration test",
			capabilities: {},
			schema: { params: [] },
			buildSynthSource: () => "return function(){}",
			serialize: (params, writer) => { writer.writeInt("gain", params.gain as number); },
			deserialize: (reader, version) => {
				deserializeVersions.push(version);
				return { gain: reader.readInt("gain") };
			},
		};
		registerInstrument(module);

		expect(instrument.gain).toBeUndefined();
		expect(instrument._opaqueSocketPayload).toEqual(unknownPayload);
		instrument.gain = 19;
		const serialized = decoded.toBase64String();
		const hydratedPayload = readModulePayload(serialized, "Z");
		const redecoded = new Song(serialized);
		const redecodedInstrument = redecoded.channels[0].instruments[0] as typeof instrument;

		expect(deserializeVersions).toEqual([37, 37]);
		expect(hydratedPayload).toEqual({
			id: moduleId,
			version: 37,
			params: {
				gain: 19,
				nested: { values: [1, true, null, { depth: "kept" }] },
			},
		});
		expect(redecodedInstrument.gain).toBe(19);
		expect(redecodedInstrument._opaqueSocketPayload).toBeUndefined();
	});

	test("rejects malformed plugin framing before canonicalization", () => {
		const tagIndex = PRODUCTION_MODULE_HASH.indexOf("Z");
		const malformedPlugin: number[] = ["Y".charCodeAt(0)];
		encode32BitNumber(malformedPlugin, 1);
		malformedPlugin.push("!".charCodeAt(0));
		const malformed = `${PRODUCTION_MODULE_HASH.slice(0, tagIndex)}${String.fromCharCode(...malformedPlugin)}${PRODUCTION_MODULE_HASH.slice(tagIndex)}`;

		expect(() => new Song(malformed)).toThrow(SongDataError);
	});

	test("non-string custom samples reject before live sample mutation", () => {
		const liveSamples = ["live-sample"];
		let setCalls = 0;
		const handler = {
			getCustomSamples: () => liveSamples,
			setCustomSamples: (): void => { setCalls++; },
			getPresetCategories: () => [],
			addPresetCategory(): void {},
			nameToPresetValue: () => null,
			getVersionDisplayName: () => "test",
			setDocumentTitle(): void {},
			clearSamples(): void { setCalls++; },
		};
		const song = new Song(undefined, handler);
		setGlobal("window", { sessionStorage: new MemoryStorage() });
		expect(() => { song.fromJsonObject({ format: "JummBox", customSamples: [42] }); }).toThrow(SongDataError);
		expect(setCalls).toBe(0);
		expect(handler.getCustomSamples()).toEqual(liveSamples);
	});

	test("malformed URI and nested JSON shapes throw typed data errors", () => {
		const titledSong = new Song();
		titledSong.title = "abc";
		const malformedTitle = titledSong.toBase64String().replace("N03abc", "N03%ZZ");

		expect(() => new Song(malformedTitle)).toThrow(SongDataError);
		expect(() => new Song('{"format":"JummBox","channels":[null]}')).toThrow(
			SongDataError,
		);
	});
});

describe("atomic song replacement", () => {
	test("malformed JSON preserves the current song and synth reference", () => {
		const song = new Song();
		song.title = "keep me";
		const synth = { setSongCalls: 0, setSong(): void { synth.setSongCalls++; } };
		const doc = { song, synth } as never;

		expect(() => new ChangeSong(doc, "{broken")).toThrow(SongDataError);
		expect((doc as { song: Song }).song).toBe(song);
		expect(song.title).toBe("keep me");
		expect((synth as { setSongCalls: number }).setSongCalls).toBe(0);
	});

	test("unsupported URL version preserves the current song and synth reference", () => {
		const song = new Song();
		song.title = "keep unsupported";
		const synth = { setSongCalls: 0, setSong(): void { synth.setSongCalls++; } };
		const doc = { song, synth } as never;

		expect(() => new ChangeSong(doc, "J~")).toThrow(SongDataError);
		expect((doc as { song: Song }).song).toBe(song);
		expect(song.title).toBe("keep unsupported");
		expect(synth.setSongCalls).toBe(0);
	});

	test("rejected custom samples start no load and preserve loading state", () => {
		const song = new Song();
		const loadingSnapshot = {
			statusTable: sampleLoadingState.statusTable,
			urlTable: sampleLoadingState.urlTable,
			totalSamples: sampleLoadingState.totalSamples,
			samplesLoaded: sampleLoadingState.samplesLoaded,
		};
		let fetchCalls = 0;
		let eventCalls = 0;
		setGlobal("fetch", (): never => {
			fetchCalls++;
			throw new Error("unexpected fetch");
		});
		const listener = (): void => { eventCalls++; };
		sampleLoadEvents.addEventListener("sampleloaded", listener);
		const malformed = JSON.stringify({
			format: "JummBox",
			customSamples: ["https://example.com/rejected.wav"],
			channels: [null],
		});

		try {
			expect(() => new ChangeSong({ song, synth: { setSong(): void {} } } as never, malformed)).toThrow(
				SongDataError,
			);
			expect(fetchCalls).toBe(0);
			expect(eventCalls).toBe(0);
			expect(sampleLoadingState).toMatchObject(loadingSnapshot);
			expect(sampleLoadingState.statusTable).toBe(loadingSnapshot.statusTable);
			expect(sampleLoadingState.urlTable).toBe(loadingSnapshot.urlTable);
		} finally {
			sampleLoadEvents.removeEventListener("sampleloaded", listener);
		}
	});

	test("GoldBox legacy sample branches defer all loading side effects", () => {
		const originalReloadFlag = Config.willReloadForCustomSamples;
		const loadingSnapshot = {
			statusTable: sampleLoadingState.statusTable,
			urlTable: sampleLoadingState.urlTable,
			totalSamples: sampleLoadingState.totalSamples,
			samplesLoaded: sampleLoadingState.samplesLoaded,
		};
		let eventCalls = 0;
		const listener = (): void => {
			eventCalls++;
		};
		sampleLoadEvents.addEventListener("sampleloaded", listener);
		setGlobal("document", { URL: "https://example.com/editor" });

		try {
			Config.willReloadForCustomSamples = true;
			for (const hash of [
				GOLDBOX_LOOP_CONTROL_SAMPLE_HASH,
				GOLDBOX_SUPERSAW_SAMPLE_HASH,
			]) {
				const deferredSamples: string[][] = [];
				const validationSong = new Song(undefined, {
					deferSampleLoading: true,
					getCustomSamples: () => null,
					setCustomSamples(samples): void {
						deferredSamples.push(samples.slice());
					},
					getPresetCategories: () => [],
					addPresetCategory(): void {},
					nameToPresetValue: () => null,
					getVersionDisplayName: () => "test",
					setDocumentTitle(): void {},
					clearSamples(): void {},
				});
				validationSong.fromBase64String(hash);
				expect(deferredSamples).toContainEqual(["legacySamples"]);
			}
			expect(eventCalls).toBe(0);
			expect(Config.willReloadForCustomSamples).toBe(true);
			expect(sampleLoadingState).toMatchObject(loadingSnapshot);
			expect(sampleLoadingState.statusTable).toBe(loadingSnapshot.statusTable);
			expect(sampleLoadingState.urlTable).toBe(loadingSnapshot.urlTable);
		} finally {
			sampleLoadEvents.removeEventListener("sampleloaded", listener);
			Config.willReloadForCustomSamples = originalReloadFlag;
		}
	});

	test("valid custom sample starts exactly one load after validation", () => {
		const hash = `${new Song().toBase64String()}|legacySamples`;
		const originalReloadFlag = Config.willReloadForCustomSamples;
		const originalChipWaves = Config.chipWaves;
		const originalRawChipWaves = Config.rawChipWaves;
		const originalRawRawChipWaves = Config.rawRawChipWaves;
		const originalCustomSamples = EditorConfig.customSamples;
		const originalLoadingState = {
			statusTable: sampleLoadingState.statusTable,
			urlTable: sampleLoadingState.urlTable,
			totalSamples: sampleLoadingState.totalSamples,
			samplesLoaded: sampleLoadingState.samplesLoaded,
		};
		let appendedScripts = 0;
		setGlobal("document", {
			title: "sample test",
			createElement: () => ({ addEventListener(): void {}, src: "" }),
			head: { appendChild: (): void => { appendedScripts++; } },
		});

		try {
			Config.willReloadForCustomSamples = false;
			EditorConfig.customSamples = null;
			decodeEditorSong(hash, createCustomSampleHandler());
			expect(appendedScripts).toBe(1);
			expect(sampleLoadingState.totalSamples).toBeGreaterThan(originalLoadingState.totalSamples);
		} finally {
			Config.willReloadForCustomSamples = originalReloadFlag;
			Config.chipWaves = originalChipWaves;
			Config.rawChipWaves = originalRawChipWaves;
			Config.rawRawChipWaves = originalRawRawChipWaves;
			EditorConfig.customSamples = originalCustomSamples;
			Object.assign(sampleLoadingState, originalLoadingState);
		}
	});

	test("valid external custom URL starts exactly one load after validation", async () => {
		const url = "https://example.com/custom.wav";
		const hash = `${new Song().toBase64String()}|${url}`;
		const originalReloadFlag = Config.willReloadForCustomSamples;
		const originalChipWaves = Config.chipWaves;
		const originalRawChipWaves = Config.rawChipWaves;
		const originalRawRawChipWaves = Config.rawRawChipWaves;
		const originalCustomSamples = EditorConfig.customSamples;
		const originalLoadingState = {
			statusTable: sampleLoadingState.statusTable,
			urlTable: sampleLoadingState.urlTable,
			totalSamples: sampleLoadingState.totalSamples,
			samplesLoaded: sampleLoadingState.samplesLoaded,
		};
		let fetchCalls = 0;
		setGlobal("OFFLINE", false);
		setGlobal("alert", (): void => {});
		setGlobal("AudioContext", class {
			close(): Promise<void> { return Promise.resolve(); }
		});
		setGlobal("fetch", () => {
			fetchCalls++;
			return Promise.resolve({ ok: false });
		});

		try {
			Config.willReloadForCustomSamples = false;
			EditorConfig.customSamples = null;
			decodeEditorSong(hash, createCustomSampleHandler());
			await Promise.resolve();
			expect(fetchCalls).toBe(1);
			expect((EditorConfig as { customSamples: string[] | null }).customSamples).toEqual([
				url,
			]);
		} finally {
			Config.willReloadForCustomSamples = originalReloadFlag;
			Config.chipWaves = originalChipWaves;
			Config.rawChipWaves = originalRawChipWaves;
			Config.rawRawChipWaves = originalRawRawChipWaves;
			EditorConfig.customSamples = originalCustomSamples;
			Object.assign(sampleLoadingState, originalLoadingState);
		}
	});

	test("decoder, validation, and notifier failures precede transport mutation", () => {
		const replacement = new Song();
		const scenarios: Array<{ name: string; hash: string; failure: "validation" | "notifier" | "decoder" }> = [
			{ name: "decoder", hash: "{broken", failure: "decoder" },
			{ name: "validation", hash: replacement.toBase64String(), failure: "validation" },
			{ name: "notifier", hash: replacement.toBase64String(), failure: "notifier" },
		];

		for (const scenario of scenarios) {
			const song = new Song();
			const transportCalls: string[] = [];
			const synth = {
				setSong(): void {},
				computeLatestModValues(): void {},
				pause(): void { transportCalls.push("pause"); },
				goToBar(): void { transportCalls.push("goToBar"); },
			};
			const doc = {
				song,
				synth,
				channel: 0,
				bar: 0,
				viewedInstrument: [0],
				recentPatternInstruments: [[0]],
				selection: {
					toJSON: () => ({}),
					fromJSON(): void {},
					scrollToSelectedPattern(): void {
						if (scenario.failure === "validation") throw new Error("validation failure");
					},
				},
				notifier: {
					changed(): void {
						if (scenario.failure === "notifier") throw new Error("notifier failure");
					},
				},
			} as never;

			expect(() => new ChangeSong(doc, scenario.hash), scenario.name).toThrow();
			expect(transportCalls, scenario.name).toEqual([]);
			expect((doc as { song: Song }).song, scenario.name).toBe(song);
		}
	});

	test("post-swap notifier failure recomputes modulation for restored old song", () => {
		const song = new Song();
		const replacement = new Song();
		setGlobal("window", { sessionStorage: new MemoryStorage() });
		const computeSongs: Song[] = [];
		const synth = {
			setSong(nextSong: Song): void { synth.song = nextSong; },
			song,
			computeLatestModValues(): void { computeSongs.push(synth.song); },
		};
		const doc = {
			song,
			synth,
			channel: 0,
			bar: 0,
			viewedInstrument: [0],
			recentPatternInstruments: [[0]],
			selection: { scrollToSelectedPattern(): void {}, resetBoxSelection(): void {} },
			notifier: { changed(): never { throw new Error("notifier failure"); } },
		} as never;

		expect(() => new ChangeSong(doc, replacement.toBase64String())).toThrow("notifier failure");
		expect(computeSongs.length).toBe(1);
		expect(computeSongs[0]).toBe(song);
		expect(synth.song).toBe(song);
	});

	test("post-swap failure restores song, cursor, views, and selection", () => {
		const song = new Song();
		const replacement = new Song();
		setGlobal("window", { sessionStorage: new MemoryStorage() });
		replacement.title = "replacement";
		const synth = {
			song,
			setSong(nextSong: Song): void {
				synth.song = nextSong;
			},
			computeLatestModValues(): never {
				throw new Error("forced post-swap failure");
			},
		};
		const selectionState = { x0: 2, x1: 3, y0: 1, y1: 2, start: 4, end: 5 };
		let selection = { ...selectionState };
		const doc = {
			song,
			synth,
			channel: 1,
			bar: 7,
			viewedInstrument: [2, 3],
			recentPatternInstruments: [[1], [2, 3]],
			selection: {
				toJSON: () => ({ ...selection }),
				fromJSON: (value: typeof selectionState) => { selection = { ...value }; },
				scrollToSelectedPattern(): void {},
			},
			notifier: { changed(): void {} },
		} as never;

		expect(() => new ChangeSong(doc, replacement.toBase64String())).toThrow(
			"forced post-swap failure",
		);
		expect((doc as { song: Song }).song).toBe(song);
		expect(synth.song).toBe(song);
		expect((doc as { channel: number }).channel).toBe(1);
		expect((doc as { bar: number }).bar).toBe(7);
		expect((doc as { viewedInstrument: number[] }).viewedInstrument).toEqual([2, 3]);
		expect((doc as { recentPatternInstruments: number[][] }).recentPatternInstruments).toEqual([
			[1],
			[2, 3],
		]);
		expect(selection).toEqual(selectionState);
	});

	test("decode failure rolls back editor and wave globals", () => {
		const song = new Song();
		const originalSamples = EditorConfig.customSamples;
		const originalCategoryCount = EditorConfig.presetCategories.length;
		const originalChipWaves = Config.chipWaves;
		const originalRawChipWaves = Config.rawChipWaves;
		const originalRawRawChipWaves = Config.rawRawChipWaves;
		const originalReloadFlag = Config.willReloadForCustomSamples;
		setGlobal("document", { title: "original title" });
		const doc = { song, synth: { setSong(): void {} } } as never;
		const malformed = JSON.stringify({
			format: "JummBox",
			name: "changed title",
			customSamples: ["legacySamples"],
			channels: [null],
		});

		expect(() => new ChangeSong(doc, malformed)).toThrow(SongDataError);
		expect(EditorConfig.customSamples).toBe(originalSamples);
		expect(EditorConfig.presetCategories.length).toBe(originalCategoryCount);
		expect(document.title).toBe("original title");
		expect(Config.chipWaves).toBe(originalChipWaves);
		expect(Config.rawChipWaves).toBe(originalRawChipWaves);
		expect(Config.rawRawChipWaves).toBe(originalRawRawChipWaves);
		expect(Config.willReloadForCustomSamples).toBe(originalReloadFlag);
	});

	test("custom sample transaction rolls back editor and wave globals", () => {
		const originalSamples = EditorConfig.customSamples;
		const originalCategoryCount = EditorConfig.presetCategories.length;
		const originalChipWaves = Config.chipWaves;
		const originalRawChipWaves = Config.rawChipWaves;
		const originalRawRawChipWaves = Config.rawRawChipWaves;
		const originalReloadFlag = Config.willReloadForCustomSamples;
		setGlobal("document", { title: "original title" });
		const transaction = createCustomSampleTransaction();

		transaction.handler.setCustomSamples(["changed"]);
		transaction.handler.addPresetCategory({ name: "temp", presets: [] });
		transaction.handler.setDocumentTitle("changed title");
		Config.chipWaves = [] as never;
		Config.rawChipWaves = [] as never;
		Config.rawRawChipWaves = [] as never;
		Config.willReloadForCustomSamples = !originalReloadFlag;
		transaction.rollback();

		expect(EditorConfig.customSamples).toBe(originalSamples);
		expect(EditorConfig.presetCategories.length).toBe(originalCategoryCount);
		expect(document.title).toBe("original title");
		expect(Config.chipWaves).toBe(originalChipWaves);
		expect(Config.rawChipWaves).toBe(originalRawChipWaves);
		expect(Config.rawRawChipWaves).toBe(originalRawRawChipWaves);
		expect(Config.willReloadForCustomSamples).toBe(originalReloadFlag);
	});

	test("custom sample transaction commits editor and wave globals", () => {
		const originalSamples = EditorConfig.customSamples;
		const originalCategoryCount = EditorConfig.presetCategories.length;
		const originalChipWaves = Config.chipWaves;
		const originalRawChipWaves = Config.rawChipWaves;
		const originalRawRawChipWaves = Config.rawRawChipWaves;
		const originalReloadFlag = Config.willReloadForCustomSamples;
		setGlobal("document", { title: "original title" });
		const transaction = createCustomSampleTransaction();
		const changedChipWaves = [] as never;
		const changedRawChipWaves = [] as never;
		const changedRawRawChipWaves = [] as never;

		try {
			transaction.handler.setCustomSamples(["committed"]);
			transaction.handler.addPresetCategory({ name: "committed", presets: [] });
			transaction.handler.setDocumentTitle("committed title");
			Config.chipWaves = changedChipWaves;
			Config.rawChipWaves = changedRawChipWaves;
			Config.rawRawChipWaves = changedRawRawChipWaves;
			Config.willReloadForCustomSamples = !originalReloadFlag;
			transaction.commit();

			expect(EditorConfig.customSamples).toEqual(["committed"]);
			expect(EditorConfig.presetCategories.length).toBe(originalCategoryCount + 1);
			expect(document.title).toBe(`committed title - ${EditorConfig.versionDisplayName}`);
			expect(Config.chipWaves).toBe(changedChipWaves);
			expect(Config.rawChipWaves).toBe(changedRawChipWaves);
			expect(Config.rawRawChipWaves).toBe(changedRawRawChipWaves);
			expect(Config.willReloadForCustomSamples).toBe(!originalReloadFlag);
		} finally {
			EditorConfig.customSamples = originalSamples;
			EditorConfig.presetCategories.length = originalCategoryCount;
			Config.chipWaves = originalChipWaves;
			Config.rawChipWaves = originalRawChipWaves;
			Config.rawRawChipWaves = originalRawRawChipWaves;
			Config.willReloadForCustomSamples = originalReloadFlag;
		}
	});
});

describe("recovery records", () => {
	test("quota failure reports quarantine persistence failure", () => {
		const storage = new MemoryStorage();
		storage.setItem = (): never => {
			throw new DOMException("quota", "QuotaExceededError");
		};
		setGlobal("localStorage", storage);

		const result = SongRecovery.quarantine("hash", "#raw", null, new SongDataError("bad"));
		expect(result).toBeNull();
		expect(storage.length).toBe(0);
	});

	test("startup only replaces malformed raw history after quarantine succeeds", async () => {
		const source = await Bun.file("editor/song-document.ts").text();
		expect(source).toContain("if (!retainRawHistoryEntry) this._history.replaceState");
		expect(source).toContain("SongRecovery.quarantine(\"hash\", songString");
	});

	test("malformed version and quarantine records do not block valid records", () => {
		const storage = new MemoryStorage();
		setGlobal("localStorage", storage);
		storage.setItem("songVersion: {broken", "bad");
		storage.setItem('songVersion: {"uid":"ok","time":2,"name":"valid","work":3}', "song-data");
		storage.setItem("songQuarantine:broken", "not-json");
		storage.setItem("songQuarantine:ok", JSON.stringify({
			id: "ok", time: 4, source: "history", hash: "raw", state: null, error: "bad data",
		}));

		expect(SongRecovery.getAllRecoveredSongs().length).toBe(1);
		expect(SongRecovery.getAllRecoveredSongs()[0].versions[0].uid).toBe("ok");
		expect(SongRecovery.getQuarantinedSongs().map((r) => r.id)).toEqual(["ok"]);
		SongRecovery.deleteQuarantinedSong("ok");
		expect(SongRecovery.getQuarantinedSongs().length).toBe(0);
	});
});

describe("history event coalescing", () => {
	test("displayBrowserUrl false invokes assigned callback for back and forward", async () => {
		const storage = new MemoryStorage();
		const listeners = new Map<string, () => void>();
		setGlobal("location", { pathname: "/" });
		setGlobal("window", {
			sessionStorage: storage,
			history: { state: null, replaceState(): void {}, pushState(): void {}, back(): void {}, forward(): void {} },
			location: { hash: "", pathname: "/" },
			addEventListener: (name: string, listener: () => void) => listeners.set(name, listener),
			removeEventListener: (name: string, listener: () => void) => {
				if (listeners.get(name) === listener) listeners.delete(name);
			},
		});
		const manager = new BrowserHistoryManager(() => false);
		const state = (sequenceNumber: number) => ({
			canUndo: true, sequenceNumber, bar: 0, channel: 0, instrument: 0,
			recoveryUid: String(sequenceNumber),
			selection: { x0: 0, x1: 0, y0: 0, y1: 0, start: 0, end: 0 },
		});
		manager.replaceState(state(0), "first");
		manager.pushState(state(1), "second");
		let calls = 0;
		manager.onChange(() => { calls++; });
		manager.back();
		await new Promise((resolve) => setTimeout(resolve, 0));
		manager.forward();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(calls).toBe(2);
	});

	test("replacing onChange removes old browser listeners", () => {
		const storage = new MemoryStorage();
		const listeners = new Map<string, Set<() => void>>();
		setGlobal("window", {
			sessionStorage: storage,
			history: { state: null },
			location: { hash: "#same" },
			addEventListener: (name: string, listener: () => void) => {
				let set = listeners.get(name);
				if (!set) { set = new Set(); listeners.set(name, set); }
				set.add(listener);
			},
			removeEventListener: (name: string, listener: () => void) => listeners.get(name)?.delete(listener),
		});
		const manager = new BrowserHistoryManager(() => true);
		let oldCalls = 0;
		let newCalls = 0;
		manager.onChange(() => { oldCalls++; });
		manager.onChange(() => { newCalls++; });
		listeners.get("popstate")?.forEach((listener) => { listener(); });
		expect(oldCalls).toBe(0);
		expect(newCalls).toBe(1);
	});

	test("duplicate hashchange and popstate fingerprints invoke one handler", () => {
		const storage = new MemoryStorage();
		const listeners = new Map<string, () => void>();
		const state = {
			canUndo: true, sequenceNumber: 1, bar: 0, channel: 0, instrument: 0,
			recoveryUid: "r",
			selection: { x0: 0, x1: 0, y0: 0, y1: 0, start: 0, end: 0 },
		};
		setGlobal("localStorage", storage);
		setGlobal("window", {
			sessionStorage: storage, history: { state }, location: { hash: "#same" },
			addEventListener: (name: string, l: () => void) => listeners.set(name, l),
			removeEventListener: () => {},
		});
		const manager = new BrowserHistoryManager(() => true);
		let calls = 0;
		manager.onChange(() => { calls++; });
		listeners.get("hashchange")?.();
		listeners.get("popstate")?.();
		expect(calls).toBe(1);
	});

	test("reset clears the event fingerprint before re-registering", () => {
		const storage = new MemoryStorage();
		const listeners = new Map<string, () => void>();
		const state = {
			canUndo: true,
			sequenceNumber: 1,
			bar: 0,
			channel: 0,
			instrument: 0,
			recoveryUid: "r",
			selection: { x0: 0, x1: 0, y0: 0, y1: 0, start: 0, end: 0 },
		};
		setGlobal("window", {
			sessionStorage: storage,
			history: { state },
			location: { hash: "#same" },
			addEventListener: (name: string, listener: () => void) => listeners.set(name, listener),
			removeEventListener: (name: string) => listeners.delete(name),
		});
		const manager = new BrowserHistoryManager(() => true);
		let calls = 0;
		manager.onChange(() => {
			calls++;
		});
		listeners.get("hashchange")?.();
		manager.resetOnChange();
		manager.onChange(() => {
			calls++;
		});
		listeners.get("hashchange")?.();
		expect(calls).toBe(2);
	});

	test("invalid numeric browser history state is rejected", () => {
		const storage = new MemoryStorage();
		setGlobal("window", {
			sessionStorage: storage,
			history: {
				state: {
					canUndo: true,
					sequenceNumber: Number.NaN,
					bar: 0.5,
					channel: Infinity,
					instrument: 0,
					recoveryUid: "r",
					selection: { x0: 0, x1: 0, y0: 0, y1: 0, start: 0, end: 0 },
				},
			},
			location: { hash: "#bad" },
		});
		const manager = new BrowserHistoryManager(() => true);
		expect(manager.getState()).toBeNull();
	});
});

describe("recovery prompt source contract", () => {
	test("wires restore, retry, raw export, and delete controls", async () => {
		const source = await Bun.file("editor/prompts/song-recovery-prompt.ts").text();
		for (const label of ["Restore", "Retry", "Export Raw", "Delete"]) {
			expect(source).toContain(`button({ type: "button" }, "${label}")`);
		}
		expect(source).toContain('doc.record(new ChangeSong(doc, raw), false, true)');
		expect(source).toContain("new Blob([record.hash]");
		expect(source).toContain("SongRecovery.deleteQuarantinedSong(record.id)");
	});
});
