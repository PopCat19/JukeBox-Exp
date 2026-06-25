// synthesis.test.ts
//
// Purpose: Unit tests for synthesis source string builders
//
// Each build*Source function returns a JavaScript source string for
// AudioWorklet evaluation. We can't eval these in bun:test (no DOM),
// but we can validate structural properties: non-empty, correct
// function signature, voice count scaling.

import { describe, test, expect } from "bun:test";
import { createTestInstrument } from "./test-helpers";
import {
	buildChipSource,
	buildLoopableChipSource,
} from "../synth/synthesis/chip";
import { buildDrumSource } from "../synth/synthesis/drum";
import { buildEffectsSource } from "../synth/synthesis/effects";
import { buildFmSource } from "../synth/synthesis/fm";
import { buildFm6Source } from "../synth/synthesis/fm6";
import { buildHarmonicsSource } from "../synth/synthesis/harmonics";
import { buildNoiseSource } from "../synth/synthesis/noise";
import { buildPickedStringSource } from "../synth/synthesis/picked-string";
import { buildPulseWidthSource } from "../synth/synthesis/pulse";
import { buildSpectrumSource } from "../synth/synthesis/spectrum";
import { buildSupersawSource } from "../synth/synthesis/supersaw";

// Different preambles per source type — checked to verify correct preamble
const SCALED = "return (synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState) => {";
const RUNLEN = "return (synth, bufferIndex, runLength, tone, instrumentState) => {";
const FM = "return (synth, bufferIndex, roundedSamplesPerTick, tone, instrument) => {";
const FX = "return (synth, outputDataL, outputDataR, bufferIndex, runLength, instrumentState) => {";

describe("buildChipSource", () => {
	test("returns non-empty string", () => {
		expect(buildChipSource(4).length).toBeGreaterThan(100);
	});
	test("preamble uses roundedSamplesPerTick", () => {
		expect(buildChipSource(4).startsWith(SCALED)).toBe(true);
	});
	test("higher voice count produces longer source", () => {
		expect(buildChipSource(4).length).toBeGreaterThan(buildChipSource(1).length);
	});
});

describe("buildLoopableChipSource", () => {
	test("returns non-empty string", () => {
		expect(buildLoopableChipSource(4).length).toBeGreaterThan(100);
	});
	test("preamble uses roundedSamplesPerTick", () => {
		expect(buildLoopableChipSource(4).startsWith(SCALED)).toBe(true);
	});
	test("differs from non-loopable chip source", () => {
		expect(buildLoopableChipSource(4)).not.toBe(buildChipSource(4));
	});
});

describe("buildDrumSource", () => {
	test("returns non-empty string", () => {
		expect(buildDrumSource(4).length).toBeGreaterThan(100);
	});
	test("preamble uses runLength", () => {
		expect(buildDrumSource(4).startsWith(RUNLEN)).toBe(true);
	});
});

describe("buildEffectsSource", () => {
	test("returns non-empty string", () => {
		const src = buildEffectsSource(false, false, false, false, false, false, false, false, false, false, false);
		expect(src.length).toBeGreaterThan(100);
	});
	test("preamble is FX variant", () => {
		const src = buildEffectsSource(false, false, false, false, false, false, false, false, false, false, false);
		expect(src.startsWith(FX)).toBe(true);
	});
	test("with distortion produces different source than without", () => {
		const withFx = buildEffectsSource(true, false, false, false, false, false, false, false, false, false, false);
		const withoutFx = buildEffectsSource(false, false, false, false, false, false, false, false, false, false, false);
		expect(withFx).not.toBe(withoutFx);
	});
});

describe("buildFmSource", () => {
	test("returns non-empty string", () => {
		const src = buildFmSource(createTestInstrument());
		expect(src.length).toBeGreaterThan(100);
	});
	test("preamble is FM variant (instrument not instrumentState)", () => {
		const src = buildFmSource(createTestInstrument());
		expect(src.startsWith(FM)).toBe(true);
	});
});

describe("buildFm6Source", () => {
	test("returns non-empty string", () => {
		const src = buildFm6Source(createTestInstrument());
		expect(src.length).toBeGreaterThan(100);
	});
	test("preamble is FM variant (instrument not instrumentState)", () => {
		const src = buildFm6Source(createTestInstrument());
		expect(src.startsWith(FM)).toBe(true);
	});
});

describe("buildHarmonicsSource", () => {
	test("returns non-empty string", () => {
		expect(buildHarmonicsSource(4).length).toBeGreaterThan(100);
	});
	test("preamble uses roundedSamplesPerTick", () => {
		expect(buildHarmonicsSource(4).startsWith(SCALED)).toBe(true);
	});
});

describe("buildNoiseSource", () => {
	test("returns non-empty string", () => {
		expect(buildNoiseSource(4).length).toBeGreaterThan(100);
	});
	test("preamble uses runLength", () => {
		expect(buildNoiseSource(4).startsWith(RUNLEN)).toBe(true);
	});
});

describe("buildPickedStringSource", () => {
	test("returns non-empty string", () => {
		expect(buildPickedStringSource(4).length).toBeGreaterThan(100);
	});
	test("preamble uses runLength", () => {
		expect(buildPickedStringSource(4).startsWith(RUNLEN)).toBe(true);
	});
});

describe("buildPulseWidthSource", () => {
	test("returns non-empty string", () => {
		expect(buildPulseWidthSource(4).length).toBeGreaterThan(100);
	});
	test("preamble uses roundedSamplesPerTick", () => {
		expect(buildPulseWidthSource(4).startsWith(SCALED)).toBe(true);
	});
});

describe("buildSpectrumSource", () => {
	test("returns non-empty string", () => {
		expect(buildSpectrumSource(4).length).toBeGreaterThan(100);
	});
	test("preamble uses runLength", () => {
		expect(buildSpectrumSource(4).startsWith(RUNLEN)).toBe(true);
	});
});

describe("buildSupersawSource", () => {
	test("returns non-empty string", () => {
		expect(buildSupersawSource(4).length).toBeGreaterThan(100);
	});
	test("preamble uses runLength", () => {
		expect(buildSupersawSource(4).startsWith(RUNLEN)).toBe(true);
	});
});
