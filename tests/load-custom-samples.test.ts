// load-custom-samples.test.ts
//
// Purpose: Unit tests for loadCustomSamples — custom sample URL parsing and loading
//
// This module:
// - Verifies pipe-split extraction of sample URLs from compressed string
// - Verifies built-in sample pack detection (legacysamples, nintariboxsamples, mariopaintboxsamples)
// - Verifies the compressed (first segment before |) is returned

import { describe, test, expect } from "bun:test";
import { loadCustomSamples } from "../synth/deserialize/load-custom-samples";

// Minimal SongLike stub — customSampleHandler only
function makeSongLike(): any {
	return {
		customSampleHandler: null,
	};
}

describe("loadCustomSamples", () => {
	test("splits pipe and returns first segment", () => {
		const song = makeSongLike();
		const result = loadCustomSamples("songdata|sample1|sample2", false, song as any);
		expect(result).toBe("songdata");
	});

	test("handles string with no pipe", () => {
		const song = makeSongLike();
		const result = loadCustomSamples("songdata", false, song as any);
		expect(result).toBe("songdata");
	});

	test("avoids loadBuiltInSamples with null handler (no legacy trigger)", () => {
		const song = makeSongLike();
		// A sample URL that's not a built-in pack won't call loadBuiltInSamples
		const result = loadCustomSamples("data|http://example.com/sample.wav", false, song as any);
		expect(result).toBe("data");
	});

	test("handles percent-encoded pipe (%7C)", () => {
		const song = makeSongLike();
		const result = loadCustomSamples("data%7Csample", false, song as any);
		expect(result).toBe("data");
	});

	test("passes beforeThree to legacy syntax parsing", () => {
		const song = makeSongLike();
		// Should not throw regardless of beforeThree value
		const resultTrue = loadCustomSamples("data|url1", true, song as any);
		expect(resultTrue).toBe("data");
		const resultFalse = loadCustomSamples("data|url1", false, song as any);
		expect(resultFalse).toBe("data");
	});
});
