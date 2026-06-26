// Synth shared tests
//
// Purpose: Verify volume conversion utilities — instrumentVolumeToVolumeMult
// and noteSizeToVolumeMult edge cases

import { describe, it, expect } from "bun:test";
import { instrumentVolumeToVolumeMult, noteSizeToVolumeMult } from "../synth/synth-shared";
import { Config } from "../synth/synth-config";

describe("instrumentVolumeToVolumeMult", () => {
	it("returns 0.0 at minimum volume (-volumeRange/2)", () => {
		const minVol = -Config.volumeRange / 2;
		expect(instrumentVolumeToVolumeMult(minVol)).toBe(0.0);
	});

	it("returns 1.0 at volume 0", () => {
		expect(instrumentVolumeToVolumeMult(0)).toBe(1.0);
	});

	it("returns >1.0 for positive volume", () => {
		expect(instrumentVolumeToVolumeMult(10)).toBeGreaterThan(1.0);
	});

	it("returns <1.0 for negative volume above min", () => {
		const val = instrumentVolumeToVolumeMult(-5);
		expect(val).toBeGreaterThan(0);
		expect(val).toBeLessThan(1.0);
	});
});

describe("noteSizeToVolumeMult", () => {
	it("returns 0.0 for size 0", () => {
		expect(noteSizeToVolumeMult(0)).toBe(0.0);
	});

	it("returns 1.0 at max size", () => {
		expect(noteSizeToVolumeMult(Config.noteSizeMax)).toBe(1.0);
	});

	it("monotonically increases with size", () => {
		const vals = [0.25, 0.5, 0.75, 1.0].map((ratio) =>
			noteSizeToVolumeMult(ratio * Config.noteSizeMax),
		);
		for (let i = 1; i < vals.length; i++) {
			expect(vals[i]).toBeGreaterThan(vals[i - 1]);
		}
	});
});
