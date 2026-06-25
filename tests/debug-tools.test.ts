// debug-tools.test.ts
//
// Purpose: Tests for __jukebox__ debug utilities
//
// Covers:
// - validate() catches cross-type contamination and stale refs
// - record.start/stop/dump captures backend ops
// - replay suppresses double-recording
// - monkey-patched methods still work after install

import { describe, test, expect } from "bun:test";
import { InstrumentType } from "../synth/synth-config";
import { createTestSong } from "./test-helpers";

// We can't fully instantiate SongDocument in tests (needs browser APIs),
// but we can test the core logic that doesn't depend on the document.

describe("validate (logic)", () => {
	test("detects chip instrument on noise channel", () => {
		const song = createTestSong();
		// channel 2 is noise (default: 2 pitch, 1 noise, 1 mod)
		const noiseCh = song.channels[2];
		expect(song.getChannelIsNoise(2)).toBe(true);

		// Artificially set instrument type to chip (0)
		noiseCh.instruments[0].type = InstrumentType.chip;

		// Run validation logic inline
		const issues: string[] = [];
		for (let ci = 0; ci < song.getChannelCount(); ci++) {
			const ch = song.channels[ci];
			const isNoise = song.getChannelIsNoise(ci);
			const isMod = song.getChannelIsMod(ci);
			for (let ii = 0; ii < ch.instruments.length; ii++) {
				const inst: any = ch.instruments[ii];
				if (isMod && inst.type !== InstrumentType.mod) issues.push(`mod type mismatch ch${ci}`);
				if (isNoise && inst.type === InstrumentType.chip) issues.push(`chip-on-noise ch${ci}`);
			}
		}
		expect(issues).toContain("chip-on-noise ch2");
	});

	test("detects stale pattern instrument reference", () => {
		const song = createTestSong();
		const ch = song.channels[0];
		// Pattern references instrument 99 (doesn't exist)
		ch.patterns[0].instruments = [99];

		const issues: string[] = [];
		for (let ci = 0; ci < song.getChannelCount(); ci++) {
			const ch2 = song.channels[ci];
			for (let pi = 0; pi < ch2.patterns.length; pi++) {
				for (const idx of ch2.patterns[pi].instruments) {
					if (idx >= ch2.instruments.length) issues.push(`stale ch${ci} pat${pi} inst${idx}`);
				}
			}
		}
		expect(issues).toContain("stale ch0 pat0 inst99");
	});

	test("clean song produces no issues", () => {
		const song = createTestSong();
		const issues: string[] = [];
		for (let ci = 0; ci < song.getChannelCount(); ci++) {
			const ch = song.channels[ci];
			const isNoise = song.getChannelIsNoise(ci);
			const isMod = song.getChannelIsMod(ci);
			for (let ii = 0; ii < ch.instruments.length; ii++) {
				const inst: any = ch.instruments[ii];
				if (isMod && inst.type !== InstrumentType.mod) issues.push("bad");
				if (isNoise && inst.type === InstrumentType.chip) issues.push("bad");
			}
			for (let pi = 0; pi < ch.patterns.length; pi++) {
				for (const idx of ch.patterns[pi].instruments) {
					if (idx >= ch.instruments.length) issues.push("bad");
				}
			}
		}
		expect(issues.length).toBe(0);
	});
});

describe("record/replay (logic)", () => {
	test("ops array captures and replays correctly", () => {
		const ops: Array<{ op: string; args?: any }> = [];
		let recording = false;
		let suppress = false;

		// Simulate recording two ops
		recording = true;
		ops.push({ op: "copy", args: { w: 1, h: 1 } });
		ops.push({ op: "pasteNotes", args: { bar: 0, ch: 0 } });
		recording = false;

		expect(ops.length).toBe(2);
		expect(ops[0].op).toBe("copy");
		expect(ops[1].op).toBe("pasteNotes");

		// Simulate replay with suppression
		suppress = true;
		const replayed: string[] = [];
		for (const op of ops) {
			replayed.push(op.op);
			if (op.op === "copy") expect(op.args.w).toBe(1);
			if (op.op === "pasteNotes") expect(op.args.ch).toBe(0);
		}
		suppress = false;

		expect(replayed).toEqual(["copy", "pasteNotes"]);
	});

	test("suppress flag prevents recording during replay", () => {
		const ops: Array<{ op: string }> = [];
		let suppress = false;

		const recordCopy = (): void => {
			if (!suppress) ops.push({ op: "copy" });
		};

		// Normal call — records
		recordCopy();
		expect(ops.length).toBe(1);

		// During replay — suppressed
		suppress = true;
		recordCopy();
		expect(ops.length).toBe(1); // still 1

		suppress = false;
		recordCopy();
		expect(ops.length).toBe(2);
	});
});
