// audio-worklet-processor.test.ts
//
// Purpose: Verify the embedded AudioWorklet JS code is syntactically valid
//
// This module:
// - Parses the worklet code string via new Function() (parse-time only, no exec)
// - Checks brace balance as a fast guard against stray brackets
// - Verifies expected exports are present (class definition, registerProcessor)

// IMPORTANT: The worklet code is a string literal inside the TS module.
// TypeScript does not type-check or parse embedded strings. Syntax errors
// in the worklet code (stray braces, unclosed strings, missing parens)
// silently pass both tsc and esbuild, producing runtime SyntaxError in
// AudioWorkletGlobalScope when the blob is loaded.

import { describe, test, expect } from "bun:test";
import { AUDIO_WORKLET_PROCESSOR_CODE } from "../synth/audio-worklet-processor";

describe("AudioWorklet processor code invariants", () => {
	test("is syntactically valid JavaScript", () => {
		// new Function() parses the string as a function body. Throws
		// SyntaxError on parse failure. Does not execute the code.
		expect(() => {
			new Function(AUDIO_WORKLET_PROCESSOR_CODE);
		}).not.toThrow();
	});

	test("class definition and registration are present", () => {
		expect(AUDIO_WORKLET_PROCESSOR_CODE).toContain(
			"class BeepBoxAudioWorkletProcessor",
		);
		expect(AUDIO_WORKLET_PROCESSOR_CODE).toContain(
			'registerProcessor("beepbox-audio-worklet-processor"',
		);
	});

	test("brace balance — same number of open and close braces", () => {
		let open = 0;
		for (const ch of AUDIO_WORKLET_PROCESSOR_CODE) {
			if (ch === "{") open++;
			if (ch === "}") {
				open--;
				expect(open).toBeGreaterThanOrEqual(0);
			}
		}
		expect(open).toBe(0);
	});

	test("square bracket balance", () => {
		let open = 0;
		for (const ch of AUDIO_WORKLET_PROCESSOR_CODE) {
			if (ch === "[") open++;
			if (ch === "]") {
				open--;
				expect(open).toBeGreaterThanOrEqual(0);
			}
		}
		expect(open).toBe(0);
	});

	test("parenthesis balance", () => {
		let open = 0;
		for (const ch of AUDIO_WORKLET_PROCESSOR_CODE) {
			if (ch === "(") open++;
			if (ch === ")") {
				open--;
				expect(open).toBeGreaterThanOrEqual(0);
			}
		}
		expect(open).toBe(0);
	});

	test("string literal balance (double quotes)", () => {
		// Simple heuristic: count unescaped double-quote pairs.
		// Not perfect for strings with escaped quotes, but catches
		// the common case of an unclosed string.
		const lines = AUDIO_WORKLET_PROCESSOR_CODE.split("\n");
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			// Count quotes, ignoring escaped ones
			let count = 0;
			for (let j = 0; j < line.length; j++) {
				if (line[j] === '"' && (j === 0 || line[j - 1] !== "\\")) {
					count++;
				}
			}
			expect(count % 2).toBe(0);
		}
	});

	test("contains _processSAB method with preemptive need-data guard", () => {
		expect(AUDIO_WORKLET_PROCESSOR_CODE).toContain("_processSAB");
		expect(AUDIO_WORKLET_PROCESSOR_CODE).toContain(
			'this.port.postMessage({ type: "need-data" });',
		);
	});

	test("no obsolete stale-queue code pattern (extra closing brace)", () => {
		// The extra-brace bug: '}\n\n      var slotBase' from a stray
		// brace that closed the while loop prematurely. Verify the
		// transition from while body to slot copy is clean.
		const idx = AUDIO_WORKLET_PROCESSOR_CODE.indexOf(
			"var slotBase = (this._activeSlot % this._numSlots) * this._slotStride;",
		);
		expect(idx).toBeGreaterThan(-1);
		// The line before slotBase should be the while-loop body's
		// closing brace (single '}'), not an extra brace pair.
		const beforeSlotBase = AUDIO_WORKLET_PROCESSOR_CODE.substring(
			idx - 20,
			idx,
		);
		expect(beforeSlotBase).not.toContain("}\n      }");
	});

	test("no unreachable code after return statements", () => {
		const lines = AUDIO_WORKLET_PROCESSOR_CODE.split("\n");
		for (let i = 0; i < lines.length - 1; i++) {
			const line = lines[i].trim();
			if (line === "return;") {
				// The next non-empty, non-comment line should not be
				// executable code (at brace-depth 0+ inside function).
				const nextLine = lines[i + 1].trim();
				expect(
					nextLine === "" ||
						nextLine.startsWith("//") ||
						nextLine.startsWith("}"),
				).toBeTrue();
			}
		}
	});
});
