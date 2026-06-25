// synth-contract.test.ts
//
// Purpose: Verify Synth's public API surface after extraction refactors
//
// The audio backend and post-processing extractions moved private fields
// into standalone classes. Synthesis source strings reference
// `synth.sanitizeFilters()` at runtime — this test ensures the delegation
// methods are present and the generated source strings match the actual API.

import { describe, test, expect } from "bun:test";
import { Synth } from "../synth/synth";
import { buildChipSource } from "../synth/synthesis/chip";
import { buildDrumSource } from "../synth/synthesis/drum";
import { buildEffectsSource } from "../synth/synthesis/effects";
import { buildFmSource } from "../synth/synthesis/fm";
import { buildHarmonicsSource } from "../synth/synthesis/harmonics";
import { buildNoiseSource } from "../synth/synthesis/noise";
import { buildPickedStringSource } from "../synth/synthesis/picked-string";
import { buildPulseWidthSource } from "../synth/synthesis/pulse";
import { buildSpectrumSource } from "../synth/synthesis/spectrum";
import { buildSupersawSource } from "../synth/synthesis/supersaw";
import { createTestInstrument } from "./test-helpers";

const SYNTH_METHODS = [
	"sanitizeFilters",
	"applyFilters",
	"play",
	"setSong",
	"pause",
	"synthesize",
	"resetEffects",
	"maintainLiveInput",
	"startRecording",
	"getMasterScale",
	"getTicksIntoBar",
	"getCurrentPart",
	"getSamplesUpToBar",
	"getSamplesPerTick",
	"getNextBar",
	"freeAllTones",
	"warmUpSynthesizer",
	"syncSongState",
	"computeSongState",
	"computeTone",
	"determineCurrentActiveTones",
	"computeDelayBufferSizes",
] as const;

/** Each source references methods via `synth.<name>(...)`. Extract them. */
function usedSynthMethods(source: string): Set<string> {
	const refs = new Set<string>();
	const pattern = /synth\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(source)) !== null) {
		refs.add(match[1]);
	}
	return refs;
}

describe("synthesis source strings reference existing Synth methods", () => {
	test("chip source references synced with Synth API", () => {
		const source = buildChipSource(4);
		const refs = usedSynthMethods(source);
		for (const ref of refs) {
			expect(typeof (Synth.prototype as any)[ref]).toBe("function");
		}
	});

	test("drum source references synced with Synth API", () => {
		const source = buildDrumSource(4);
		const refs = usedSynthMethods(source);
		for (const ref of refs) {
			expect(typeof (Synth.prototype as any)[ref]).toBe("function");
		}
	});

	test("effects source references synced with Synth API", () => {
		const source = buildEffectsSource(false, false, false, false, false, false, false, false, false, false, false);
		const refs = usedSynthMethods(source);
		for (const ref of refs) {
			expect(typeof (Synth.prototype as any)[ref]).toBe("function");
		}
	});

	test("fm source references synced with Synth API", () => {
		const source = buildFmSource(createTestInstrument());
		const refs = usedSynthMethods(source);
		for (const ref of refs) {
			expect(typeof (Synth.prototype as any)[ref]).toBe("function");
		}
	});

	test("harmonics source references synced with Synth API", () => {
		const source = buildHarmonicsSource(4);
		const refs = usedSynthMethods(source);
		for (const ref of refs) {
			expect(typeof (Synth.prototype as any)[ref]).toBe("function");
		}
	});

	test("noise source references synced with Synth API", () => {
		const source = buildNoiseSource(4);
		const refs = usedSynthMethods(source);
		for (const ref of refs) {
			expect(typeof (Synth.prototype as any)[ref]).toBe("function");
		}
	});

	test("picked string source references synced with Synth API", () => {
		const source = buildPickedStringSource(4);
		const refs = usedSynthMethods(source);
		for (const ref of refs) {
			expect(typeof (Synth.prototype as any)[ref]).toBe("function");
		}
	});

	test("pulse width source references synced with Synth API", () => {
		const source = buildPulseWidthSource(4);
		const refs = usedSynthMethods(source);
		for (const ref of refs) {
			expect(typeof (Synth.prototype as any)[ref]).toBe("function");
		}
	});

	test("spectrum source references synced with Synth API", () => {
		const source = buildSpectrumSource(4);
		const refs = usedSynthMethods(source);
		for (const ref of refs) {
			expect(typeof (Synth.prototype as any)[ref]).toBe("function");
		}
	});

	test("supersaw source references synced with Synth API", () => {
		const source = buildSupersawSource(4);
		const refs = usedSynthMethods(source);
		for (const ref of refs) {
			expect(typeof (Synth.prototype as any)[ref]).toBe("function");
		}
	});
});
