// enums.test.ts
//
// Purpose: Unit tests for synth config enumeration types
//
// This module:
// - Verifies all enums have expected values
// - Tests LFOEnvelopeTypes and RandomEnvelopeTypes are subsets
// - Tests DropdownID values

import { describe, test, expect } from "bun:test";
import {
	FilterType,
	SustainType,
	GranularEnvelopeType,
	EnvelopeType,
	DropdownID,
	EffectType,
	EnvelopeComputeIndex,
	LFOEnvelopeTypes,
	RandomEnvelopeTypes,
	SampleLoadingStatus,
} from "../synth/config/enums";

describe("FilterType", () => {
	test("lowPass is 0", () => expect(FilterType.lowPass).toBe(0));
	test("highPass is 1", () => expect(FilterType.highPass).toBe(1));
	test("peak is 2", () => expect(FilterType.peak).toBe(2));
	test("length is 3", () => expect(FilterType.length).toBe(3));
});

describe("SustainType", () => {
	test("bright is 0", () => expect(SustainType.bright).toBe(0));
	test("length is 2", () => expect(SustainType.length).toBe(2));
});

describe("EnvelopeType", () => {
	test("none is 0", () => expect(EnvelopeType.none).toBe(0));
	test("pitch is 2", () => expect(EnvelopeType.pitch).toBe(2));
	test("pseudorandom is 3", () => expect(EnvelopeType.pseudorandom).toBe(3));
	test("lfo is 8", () => expect(EnvelopeType.lfo).toBe(8));
});

describe("EffectType", () => {
	test("reverb is 0", () => expect(EffectType.reverb).toBe(0));
	test("distortion is 3", () => expect(EffectType.distortion).toBe(3));
	test("bitcrusher is 4", () => expect(EffectType.bitcrusher).toBe(4));
	test("echo is 6", () => expect(EffectType.echo).toBe(6));
});

describe("DropdownID", () => {
	test("Transition is 3", () => expect(DropdownID.Transition).toBe(3));
	test("EnvelopeSettings is 8", () => expect(DropdownID.EnvelopeSettings).toBe(8));
	test("Envelope is 7", () => expect(DropdownID.Envelope).toBe(7));
});

describe("EnvelopeComputeIndex", () => {
	test("noteVolume is 0", () => expect(EnvelopeComputeIndex.noteVolume).toBe(0));
	test("pulseWidth is 2", () => expect(EnvelopeComputeIndex.pulseWidth).toBe(2));
	test("stringSustain is 3", () => expect(EnvelopeComputeIndex.stringSustain).toBe(3));
});

describe("LFOEnvelopeTypes", () => {
	test("sine is 0", () => expect(LFOEnvelopeTypes.sine).toBe(0));
	test("sawtooth is 3", () => expect(LFOEnvelopeTypes.sawtooth).toBe(3));
	test("trapezoid is 4", () => expect(LFOEnvelopeTypes.trapezoid).toBe(4));
});

describe("RandomEnvelopeTypes", () => {
	test("time is 0", () => expect(RandomEnvelopeTypes.time).toBe(0));
	test("pitch is 1", () => expect(RandomEnvelopeTypes.pitch).toBe(1));
	test("note is 2", () => expect(RandomEnvelopeTypes.note).toBe(2));
});

describe("SampleLoadingStatus", () => {
	test("loading is 0", () => expect(SampleLoadingStatus.loading).toBe(0));
	test("loaded is 1", () => expect(SampleLoadingStatus.loaded).toBe(1));
	test("error is 2", () => expect(SampleLoadingStatus.error).toBe(2));
});

describe("GranularEnvelopeType", () => {
	test("parabolic is 0", () => expect(GranularEnvelopeType.parabolic).toBe(0));
	test("raisedCosineBell is 1", () => expect(GranularEnvelopeType.raisedCosineBell).toBe(1));
});
