// audio-backend.test.ts
//
// Purpose: Unit tests for AudioBackend host interface contract
//
// The AudioBackend relies on AudioBackendHost properties being live-read
// (getter functions) rather than stale snapshots. If isPlayingSong() or
// liveInputEndTime() return a copy made at activate() time, the worklet
// callback will see stale values and deactivate prematurely.

import { describe, test, expect } from "bun:test";
import { Synth } from "../synth/synth";

describe("AudioBackendHost live-read contract", () => {
	test("getter returns current value after mutation", () => {
		let isPlayingSong = false;
		const host = {
			synthesize: () => {},
			isPlayingSong: () => isPlayingSong,
			liveInputEndTime: () => 0,
			spectrumEnabled: false,
			onSpectrumUpdate: undefined as any,
			onSpectrumReset: undefined as any,
			anticipatePoorPerformance: false,
			preferLowerLatency: false,
		};

		const snap = host.isPlayingSong();
		expect(snap).toBe(false);
		isPlayingSong = true;
		// Snapshot still false, live read returns true
		expect(snap).toBe(false);
		expect(host.isPlayingSong()).toBe(true);
	});

	test("Synth._toAudioHost returns getter functions", () => {
		const synth = new Synth();
		const host = (synth as any)._toAudioHost();
		expect(typeof host.isPlayingSong).toBe("function");
		expect(typeof host.liveInputEndTime).toBe("function");
		expect(typeof host.synthesize).toBe("function");

		synth.isPlayingSong = false;
		expect(host.isPlayingSong()).toBe(false);
		synth.isPlayingSong = true;
		expect(host.isPlayingSong()).toBe(true);

		synth.liveInputEndTime = 42;
		expect(host.liveInputEndTime()).toBe(42);
		synth.liveInputEndTime = 100;
		expect(host.liveInputEndTime()).toBe(100);
	});
});
