// envelope-computer.test.ts
//
// Purpose: Unit tests for EnvelopeComputer — envelope computation and lifecycle
//
// This module:
// - Verifies constructor and reset initialize state
// - Verifies static computeEnvelope for multiple envelope types
// - Verifies computePitchEnvelope bounds logic
// - Verifies getLowpassCutoffDecayVolumeCompensation

import { describe, test, expect } from "bun:test";
import { EnvelopeComputer } from "../synth/envelope-computer";
import { EnvelopeType } from "../synth/config/enums";
import type { Instrument } from "../synth/instruments";

// Minimal envelope fixture matching Envelope interface shape
function makeEnvelope(type: number, speed: number = 1, name: string = "test"): any {
	return { type, speed, name };
}

describe("EnvelopeComputer", () => {
	test("constructor creates a reset instance", () => {
		const ec = new EnvelopeComputer();
		expect(ec.noteSecondsEndUnscaled).toBe(0);
		expect(ec.noteTicksEnd).toBe(0);
		expect(ec.drumsetFilterEnvelopeStart).toBe(0);
		expect(ec.drumsetFilterEnvelopeEnd).toBe(0);
		expect(ec.startPinTickAbsolute).toBeNull();
	});

	test("reset clears time state", () => {
		const ec = new EnvelopeComputer();
		ec.noteSecondsEndUnscaled = 5.0;
		ec.noteTicksEnd = 3.0;
		ec.drumsetFilterEnvelopeStart = 0.7;
		ec.reset();
		expect(ec.noteSecondsEndUnscaled).toBe(0);
		expect(ec.noteTicksEnd).toBe(0);
		expect(ec.drumsetFilterEnvelopeStart).toBe(0);
		expect(ec.startPinTickAbsolute).toBeNull();
	});

	test("clearEnvelopes resets modified envelopes to 1.0", () => {
		const ec = new EnvelopeComputer();
		ec.envelopeStarts[5] = 0.5;
		ec.envelopeEnds[5] = 0.3;
		// simulate that index 5 was modified
		// Access private field via type assertion
		(ec as any)._modifiedEnvelopeIndices[0] = 5;
		(ec as any)._modifiedEnvelopeCount = 1;
		ec.clearEnvelopes();
		expect(ec.envelopeStarts[5]).toBe(1.0);
		expect(ec.envelopeEnds[5]).toBe(1.0);
	});
});

describe("EnvelopeComputer.computeEnvelope", () => {
	test("none type returns perEnvelopeUpperBound", () => {
		const result = EnvelopeComputer.computeEnvelope(
			makeEnvelope(0), // none
			1, 1, 0, 0, 0, 0, 0.5, 0, false, 0, 1, false, 2, 0, 0, 0, 0,
		);
		expect(result).toBe(1);
	});

	test("twang type decays over time", () => {
		const at0 = EnvelopeComputer.computeEnvelope(
			makeEnvelope(EnvelopeType.twang),
			1, 1, 0, 0, 0, 0, 0.5, 0, false, 0, 1, false, 2, 0, 0, 0, 0,
		);
		const at5 = EnvelopeComputer.computeEnvelope(
			makeEnvelope(EnvelopeType.twang),
			1, 1, 5, 5, 0, 0, 0.5, 0, false, 0, 1, false, 2, 0, 0, 0, 0,
		);
		expect(at0).toBe(1);
		expect(at5).toBeLessThan(at0);
	});

	test("lfo sine oscillates", () => {
		const r1 = EnvelopeComputer.computeEnvelope(
			makeEnvelope(EnvelopeType.lfo),
			1, 1, 0, 0, 0, 0, 0.5, 0, false, 0, 1, false, 2, 0, 0, 0, 0,
		);
		const r2 = EnvelopeComputer.computeEnvelope(
			makeEnvelope(EnvelopeType.lfo),
			1, 1, 0, 0, 0.5, 0, 0.5, 0, false, 0, 1, false, 2, 0, 0, 0, 0,
		);
		expect(r1).not.toBe(r2);
	});

	test("inverse twang at same time: direct descends, inverse ascends", () => {
		// Direct twang at time=5: 1/(1+5) = 0.167
		const direct = EnvelopeComputer.computeEnvelope(
			makeEnvelope(EnvelopeType.twang),
			1, 1, 5, 5, 0, 0, 0.5, 0, false, 0, 1, false, 2, 0, 0, 0, 0,
		);
		// Inverse twang at time=5: 1 - 1/(1+5) = 0.833
		const inverse = EnvelopeComputer.computeEnvelope(
			makeEnvelope(EnvelopeType.twang),
			1, 1, 5, 5, 0, 0, 0.5, 0, true, 0, 1, false, 2, 0, 0, 0, 0,
		);
		expect(direct).toBeLessThan(inverse);
	});

	test("bounds clamp output range", () => {
		const lower = EnvelopeComputer.computeEnvelope(
			makeEnvelope(EnvelopeType.twang),
			1, 1, 100, 100, 0, 0, 0.5, 0, false, 0.3, 0.7, false, 2, 0, 0, 0, 0,
		);
		expect(lower).toBeGreaterThanOrEqual(0.3);
		expect(lower).toBeLessThanOrEqual(0.7);
	});

	test("decay type decreases with time", () => {
		const early = EnvelopeComputer.computeEnvelope(
			makeEnvelope(EnvelopeType.decay),
			1, 1, 0, 0, 0, 0, 0.5, 0, false, 0, 1, false, 2, 0, 0, 0, 0,
		);
		const late = EnvelopeComputer.computeEnvelope(
			makeEnvelope(EnvelopeType.decay),
			1, 1, 5, 5, 0, 0, 0.5, 0, false, 0, 1, false, 2, 0, 0, 0, 0,
		);
		expect(early).toBe(1);
		expect(late).toBeLessThan(early);
	});

	test("blip type is non-zero only at start", () => {
		const atStart = EnvelopeComputer.computeEnvelope(
			makeEnvelope(EnvelopeType.blip),
			1, 1, 0, 0, 0, 0, 0.5, 0, false, 0, 1, false, 2, 0, 0, 0, 0,
		);
		const after = EnvelopeComputer.computeEnvelope(
			makeEnvelope(EnvelopeType.blip),
			1, 1, 1, 1, 0, 0, 0.5, 0, false, 0, 1, false, 2, 0, 0, 0, 0,
		);
		expect(atStart).toBeGreaterThan(0);
		expect(after).toBe(0);
	});

	test("linear type linearly approaches 0", () => {
		const early = EnvelopeComputer.computeEnvelope(
			makeEnvelope(EnvelopeType.linear),
			1, 1, 0, 0, 0, 0, 0.5, 0, false, 0, 1, false, 2, 0, 0, 0, 0,
		);
		const late = EnvelopeComputer.computeEnvelope(
			makeEnvelope(EnvelopeType.linear),
			1, 1, 20, 20, 0, 0, 0.5, 0, false, 0, 1, false, 2, 0, 0, 0, 0,
		);
		expect(early).toBeCloseTo(1, 3);
		expect(late).toBeCloseTo(0, 3);
	});

	test("throws for unknown envelope type", () => {
		expect(() =>
			EnvelopeComputer.computeEnvelope(
				makeEnvelope(99), // unknown
				1, 1, 0, 0, 0, 0, 0.5, 0, false, 0, 1, false, 2, 0, 0, 0, 0,
			),
		).toThrow("Unrecognized");
	});
});

describe("EnvelopeComputer.computePitchEnvelope", () => {
	function makeMockInstrument(overrides: any = {}): Instrument {
		return {
			isNoiseInstrument: false,
			envelopeCount: 0,
			envelopes: [],
			...overrides,
		} as any;
	}

	test("default returns lower bound for pitch 0", () => {
		const ec = new EnvelopeComputer();
		const inst = makeMockInstrument();
		const result = ec.computePitchEnvelope(inst, -2, 0);
		expect(result).toBe(0);
	});

	test("default returns upper bound for max pitch", () => {
		const ec = new EnvelopeComputer();
		const inst = makeMockInstrument();
		const result = ec.computePitchEnvelope(inst, -2, 130);
		expect(result).toBe(1);
	});

	test("with envelope bounds interpolates linearly", () => {
		const ec = new EnvelopeComputer();
		const inst = makeMockInstrument({
			envelopeCount: 2,
			envelopes: [
				{ pitchEnvelopeStart: 0, pitchEnvelopeEnd: 100, perEnvelopeLowerBound: 0, perEnvelopeUpperBound: 1, inverse: false },
				{},
			],
		});
		const mid = ec.computePitchEnvelope(inst, 0, 50);
		expect(mid).toBeCloseTo(0.5, 2);
	});

	test("inverse envelope swaps range", () => {
		const ec = new EnvelopeComputer();
		const inst = makeMockInstrument({
			envelopeCount: 1,
			envelopes: [{ pitchEnvelopeStart: 0, pitchEnvelopeEnd: 100, perEnvelopeLowerBound: 0, perEnvelopeUpperBound: 1, inverse: true }],
		});
		const low = ec.computePitchEnvelope(inst, 0, 0);
		const high = ec.computePitchEnvelope(inst, 0, 100);
		expect(low).toBeCloseTo(1, 3);
		expect(high).toBeCloseTo(0, 3);
	});
});

describe("EnvelopeComputer.getLowpassCutoffDecayVolumeCompensation", () => {
	test("decay envelope returns >1 compensation", () => {
		const result = EnvelopeComputer.getLowpassCutoffDecayVolumeCompensation(makeEnvelope(10), 1);
		expect(result).toBeGreaterThan(1);
	});

	test("twang envelope returns >1 compensation", () => {
		const result = EnvelopeComputer.getLowpassCutoffDecayVolumeCompensation(makeEnvelope(6), 1);
		expect(result).toBeGreaterThanOrEqual(1);
	});

	test("other envelopes return 1.0", () => {
		const result = EnvelopeComputer.getLowpassCutoffDecayVolumeCompensation(makeEnvelope(0), 1);
		expect(result).toBe(1.0);
	});
});
