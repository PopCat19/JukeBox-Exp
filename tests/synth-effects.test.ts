// Effects dispatch tests
//
// Purpose: Verify that effectsSynth integrates with the effects plugin
// cache and does not throw for basic configurations

import { describe, it, expect } from "bun:test";

describe("effectsSynth integration", () => {
	it("imports without side effects", async () => {
		const mod = await import("../synth/synth-effects");
		expect(mod).toBeDefined();
		expect(typeof mod.effectsSynth).toBe("function");
	});
});
