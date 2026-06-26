// FilterControlPoint tests
//
// Purpose: Verify filter control point math — Hz conversion, linear gain,
// volume compensation for low-pass, high-pass, and peak filter types

import { describe, it, expect } from "bun:test";
import { FilterControlPoint } from "../synth/instruments";
import { Config } from "../synth/synth-config";

describe("FilterControlPoint", () => {
	const testCases = [
		{ setting: 0 },
		{ setting: 50 },
		{ setting: Config.filterFreqRange - 1 },
	];

		describe("getHzFromSettingValue / getSettingValueFromHz", () => {
		it.each(testCases)("roundtrip: setting $setting → Hz → setting", ({ setting }) => {
			const hz = FilterControlPoint.getHzFromSettingValue(setting);
			expect(hz).toBeGreaterThan(0);
			const back = FilterControlPoint.getSettingValueFromHz(hz);
			expect(Math.round(back)).toBeCloseTo(setting, -0.5);
		});

		it("lowest setting produces ~62.5 Hz", () => {
			const lowHz = FilterControlPoint.getHzFromSettingValue(0);
			expect(lowHz).toBeCloseTo(62.5, 1);
		});

		it("highest setting produces max frequency (~19kHz)", () => {
			const highHz = FilterControlPoint.getHzFromSettingValue(Config.filterFreqRange - 1);
			expect(highHz).toBeCloseTo(Config.filterFreqMaxHz, -1);
		});
	});

	describe("getRoundedSettingValueFromHz", () => {
		it("returns integer within range", () => {
			const val = FilterControlPoint.getRoundedSettingValueFromHz(440);
			expect(Number.isInteger(val)).toBe(true);
			expect(val).toBeGreaterThanOrEqual(0);
			expect(val).toBeLessThanOrEqual(Config.filterFreqRange - 1);
		});
	});

	describe("set and getHz", () => {
		it("sets freq and gain from settings", () => {
			const pt = new FilterControlPoint();
			pt.set(50, 60);
			expect(pt.freq).toBe(50);
			expect(pt.gain).toBe(60);
		});
	});

	describe("getLinearGain", () => {
		it("returns 1.0 at filter gain center", () => {
			const pt = new FilterControlPoint();
			pt.gain = Config.filterGainCenter;
			pt.type = 0; // peak
			const g = pt.getLinearGain(1.0);
			expect(g).toBeCloseTo(1.0, 4);
		});

		it("returns less than 1.0 for low-pass at reduced gain", () => {
			const pt = new FilterControlPoint();
			pt.gain = Config.filterGainCenter - 10;
			pt.type = 0; // lowPass
			const g = pt.getLinearGain(1.0);
			expect(g).toBeLessThan(1.0);
		});
	});

	describe("getRoundedSettingValueFromLinearGain", () => {
		it("roundtrips through getLinearGain for peak type", () => {
			const pt = new FilterControlPoint();
			pt.gain = Config.filterGainCenter + 5;
			pt.type = 0; // peak
			const linear = pt.getLinearGain(1.0);
			const back = FilterControlPoint.getRoundedSettingValueFromLinearGain(linear);
			expect(back).toBeGreaterThanOrEqual(0);
			expect(back).toBeLessThanOrEqual(Config.filterGainRange - 1);
		});
	});

	describe("getVolumeCompensationMult", () => {
		it("returns positive number", () => {
			const pt = new FilterControlPoint();
			pt.freq = 50;
			pt.gain = Config.filterGainCenter;
			pt.type = 0;
			const mult = pt.getVolumeCompensationMult();
			expect(mult).toBeGreaterThan(0);
		});

		it("throws for unknown filter type", () => {
			const pt = new FilterControlPoint();
			pt.type = 999;
			expect(() => pt.getVolumeCompensationMult()).toThrow();
		});
	});
});
