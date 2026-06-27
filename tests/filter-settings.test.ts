// filter-settings.test.ts
//
// Purpose: Unit tests for FilterSettings — instrument filter control point collection
//
// This module:
// - Verifies constructor defaults and reset behavior
// - Tests addPoint creates valid control points
// - Tests toJsonObject / fromJsonObject round-trip
// - Tests filtersCanMorph and lerpFilters
// - Tests legacy filter conversion

import { describe, test, expect } from "bun:test";
import { FilterSettings, FilterControlPoint } from "../synth/instruments";
import { Config, FilterType } from "../synth/synth-config";

describe("FilterSettings", () => {
	test("constructor initializes empty", () => {
		const fs = new FilterSettings();
		expect(fs.controlPointCount).toBe(0);
		expect(fs.controlPoints.length).toBeGreaterThanOrEqual(0);
	});

	test("reset() clears all points", () => {
		const fs = new FilterSettings();
		fs.addPoint(FilterType.lowPass, 50, 30);
		expect(fs.controlPointCount).toBe(1);
		fs.reset();
		expect(fs.controlPointCount).toBe(0);
	});

	test("addPoint creates a valid control point", () => {
		const fs = new FilterSettings();
		fs.addPoint(FilterType.highPass, 40, 25);
		expect(fs.controlPointCount).toBe(1);
		expect(fs.controlPoints[0].type).toBe(FilterType.highPass);
	});

	test("addPoint reuses existing control point objects", () => {
		const fs = new FilterSettings();
		fs.addPoint(FilterType.lowPass, 10, 5);
		const firstPoint = fs.controlPoints[0];
		fs.addPoint(FilterType.peak, 20, 15);
		expect(fs.controlPointCount).toBe(2);
		// The first point should still be the same object
		expect(fs.controlPoints[0]).toBe(firstPoint);
	});
});

describe("FilterSettings round-trip", () => {
	test("toJsonObject produces array of points", () => {
		const fs = new FilterSettings();
		fs.addPoint(FilterType.lowPass, 50, 30);
		const json: any = fs.toJsonObject();
		expect(Array.isArray(json)).toBeTrue();
		expect(json.length).toBe(1);
		expect(json[0].type).toBe("low-pass");
		expect(typeof json[0].cutoffHz).toBe("number");
		expect(typeof json[0].linearGain).toBe("number");
	});

	test("fromJsonObject restores multiple points", () => {
		const fs = new FilterSettings();
		fs.addPoint(FilterType.lowPass, 50, 30);
		fs.addPoint(FilterType.peak, 100, 20);
		const json: any = fs.toJsonObject();

		const restored = new FilterSettings();
		restored.fromJsonObject(json);
		expect(restored.controlPointCount).toBe(2);
		expect(restored.controlPoints[0].type).toBe(FilterType.lowPass);
		expect(restored.controlPoints[1].type).toBe(FilterType.peak);
	});

	test("fromJsonObject handles null gracefully", () => {
		const fs = new FilterSettings();
		fs.fromJsonObject(null);
		expect(fs.controlPointCount).toBe(0);
	});

	test("fromJsonObject handles empty array", () => {
		const fs = new FilterSettings();
		fs.fromJsonObject([]);
		expect(fs.controlPointCount).toBe(0);
	});
});

describe("filtersCanMorph", () => {
	test("returns true for identical point structures", () => {
		const a = new FilterSettings();
		const b = new FilterSettings();
		a.addPoint(FilterType.lowPass, 10, 5);
		a.addPoint(FilterType.peak, 20, 10);
		b.addPoint(FilterType.lowPass, 30, 15);
		b.addPoint(FilterType.peak, 40, 20);
		expect(FilterSettings.filtersCanMorph(a, b)).toBeTrue();
	});

	test("returns false for different point counts", () => {
		const a = new FilterSettings();
		const b = new FilterSettings();
		a.addPoint(FilterType.lowPass, 10, 5);
		expect(FilterSettings.filtersCanMorph(a, b)).toBeFalse();
	});

	test("returns false for different point types", () => {
		const a = new FilterSettings();
		const b = new FilterSettings();
		a.addPoint(FilterType.lowPass, 10, 5);
		b.addPoint(FilterType.highPass, 10, 5);
		expect(FilterSettings.filtersCanMorph(a, b)).toBeFalse();
	});
});

describe("lerpFilters", () => {
	test("returns filterA at pos=0", () => {
		const a = new FilterSettings();
		const b = new FilterSettings();
		a.addPoint(FilterType.lowPass, 10, 5);
		b.addPoint(FilterType.lowPass, 50, 25);
		const result = FilterSettings.lerpFilters(a, b, 0);
		expect(result.controlPointCount).toBe(a.controlPointCount);
		expect(result.controlPoints[0].freq).toBe(a.controlPoints[0].freq);
	});

	test("returns filterB at pos=1 for matching types", () => {
		const a = new FilterSettings();
		const b = new FilterSettings();
		a.addPoint(FilterType.lowPass, 10, 5);
		b.addPoint(FilterType.lowPass, 50, 25);
		const result = FilterSettings.lerpFilters(a, b, 1);
		expect(result.controlPoints[0].freq).toBe(b.controlPoints[0].freq);
	});

	test("returns filterB at pos=1 for non-matching types", () => {
		const a = new FilterSettings();
		const b = new FilterSettings();
		a.addPoint(FilterType.lowPass, 10, 5);
		b.addPoint(FilterType.highPass, 50, 25);
		const result = FilterSettings.lerpFilters(a, b, 1);
		expect(result.controlPointCount).toBe(b.controlPointCount);
	});

	test("interpolates mid point", () => {
		const a = new FilterSettings();
		const b = new FilterSettings();
		a.addPoint(FilterType.lowPass, 0, 0);
		b.addPoint(FilterType.lowPass, 100, 100);
		const result = FilterSettings.lerpFilters(a, b, 0.5);
		expect(result.controlPoints[0].freq).toBeCloseTo(50, 0);
		expect(result.controlPoints[0].gain).toBeCloseTo(50, 0);
	});

	test("clamps pos to [0, 1]", () => {
		const a = new FilterSettings();
		const b = new FilterSettings();
		a.addPoint(FilterType.lowPass, 10, 5);
		b.addPoint(FilterType.lowPass, 50, 25);
		const result = FilterSettings.lerpFilters(a, b, -0.5);
		expect(result.controlPoints[0].freq).toBe(a.controlPoints[0].freq);
	});
});
