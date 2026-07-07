// effect-state.test.ts
//
// Purpose: Contract tests for EffectStateDescriptor and EffectInstanceState

import { describe, it, expect } from "bun:test";
import {
	createEffectInstanceState,
	resetEffectInstanceState,
} from "../synth/socket/effect-state";
import type { EffectStateDescriptor } from "../synth/socket/effect-state";
import type { EffectModule } from "../synth/socket/effect-module";
import { SOCKET_VERSION } from "../synth/socket/version";

// ── test fixtures ──────────────────────────────────────────────────────────────

const statelessModule: EffectModule = {
	id: "test.stateless",
	socketVersion: SOCKET_VERSION,
	displayName: "Stateless Test Effect",
	schema: { params: [] },
	stateDescriptor: undefined,
	buildEffectSource: () => "return () => {}",
	serialize(_params, _w) {},
	deserialize() {
		return {};
	},
};

const delayLineModule: EffectModule = {
	id: "test.delayLine",
	socketVersion: SOCKET_VERSION,
	displayName: "Delay Line Test Effect",
	schema: { params: [] },
	stateDescriptor: {
		stateBufferSize: 4,
		delayLineCount: 1,
		delayLineLength: 256,
	},
	buildEffectSource: () => "return () => {}",
	serialize(_params, _w) {},
	deserialize() {
		return {};
	},
};

const multiDelayModule: EffectModule = {
	id: "test.multiDelay",
	socketVersion: SOCKET_VERSION,
	displayName: "Multi Delay Test Effect",
	schema: { params: [] },
	stateDescriptor: {
		stateBufferSize: 8,
		delayLineCount: 3,
		delayLineLength: 1024,
	},
	buildEffectSource: () => "return () => {}",
	serialize(_params, _w) {},
	deserialize() {
		return {};
	},
};

const zeroStateModule: EffectModule = {
	id: "test.zeroState",
	socketVersion: SOCKET_VERSION,
	displayName: "Zero State Test Effect",
	schema: { params: [] },
	stateDescriptor: {
		stateBufferSize: 0,
		delayLineCount: 0,
		delayLineLength: 0,
	},
	buildEffectSource: () => "return () => {}",
	serialize(_params, _w) {},
	deserialize() {
		return {};
	},
};

// ── tests ──────────────────────────────────────────────────────────────────────

describe("EffectStateDescriptor", () => {
	it("stateless module declares undefined stateDescriptor", () => {
		expect(statelessModule.stateDescriptor).toBeUndefined();
	});

	it("stateful module declares correct descriptor shape", () => {
		const desc: EffectStateDescriptor = delayLineModule.stateDescriptor!;
		expect(desc.stateBufferSize).toBeGreaterThanOrEqual(0);
		expect(desc.delayLineCount).toBeGreaterThanOrEqual(0);
		expect(desc.delayLineLength).toBeGreaterThanOrEqual(0);
	});

	it("descriptor with zero values is valid", () => {
		expect(zeroStateModule.stateDescriptor).toEqual({
			stateBufferSize: 0,
			delayLineCount: 0,
			delayLineLength: 0,
		});
	});

	it("is optional on EffectModule (stateDescriptor can be undefined)", () => {
		// TypeScript enforces the type contract at compile time.
		// At runtime, optional fields may be absent.
		expect("stateDescriptor" in statelessModule).toBe(true);
	});

	it("initializeState is present when module provides it", () => {
		const m: EffectModule = {
			...delayLineModule,
			id: "test.hasInit",
			initializeState() {},
		};
		expect("initializeState" in m).toBe(true);
	});
});

describe("createEffectInstanceState", () => {
	it("creates empty state for stateless module", () => {
		const ctx = createEffectInstanceState(statelessModule, 44100, 128, 2);
		expect(ctx.module.id).toBe("test.stateless");
		expect(ctx.sampleRate).toBe(44100);
		expect(ctx.blockSize).toBe(128);
		expect(ctx.channelCount).toBe(2);
		expect(ctx.stateBuffer.length).toBe(0);
		expect(ctx.delayLines.length).toBe(0);
	});

	it("allocates correct buffer sizes from descriptor", () => {
		const ctx = createEffectInstanceState(delayLineModule, 44100, 128, 2);
		expect(ctx.stateBuffer.length).toBe(4);
		expect(ctx.delayLines.length).toBe(1);
		expect(ctx.delayLines[0].length).toBe(256);
	});

	it("allocates multiple delay lines", () => {
		const ctx = createEffectInstanceState(multiDelayModule, 48000, 256, 2);
		expect(ctx.stateBuffer.length).toBe(8);
		expect(ctx.delayLines.length).toBe(3);
		for (const dl of ctx.delayLines) {
			expect(dl.length).toBe(1024);
		}
	});

	it("zeroes all buffers", () => {
		const ctx = createEffectInstanceState(delayLineModule, 44100, 128, 2);
		for (let i = 0; i < ctx.stateBuffer.length; i++) {
			expect(ctx.stateBuffer[i]).toBe(0);
		}
		for (const dl of ctx.delayLines) {
			for (let i = 0; i < dl.length; i++) {
				expect(dl[i]).toBe(0);
			}
		}
	});

	it("calls initializeState when module provides it", () => {
		let called = false;
		let receivedCtx: unknown = null;
		const initModule: EffectModule = {
			...delayLineModule,
			id: "test.withInit",
			initializeState(ctx) {
				called = true;
				receivedCtx = ctx;
				// Set some initial state values
				ctx.stateBuffer[0] = 1.0;
				ctx.stateBuffer[1] = -1.0;
			},
		};
		const ctx = createEffectInstanceState(initModule, 44100, 128, 2);
		expect(called).toBe(true);
		expect(receivedCtx).toBe(ctx);
		expect(ctx.stateBuffer[0]).toBe(1.0);
		expect(ctx.stateBuffer[1]).toBe(-1.0);
	});

	it("does not call initializeState when module omits it", () => {
		const ctx = createEffectInstanceState(delayLineModule, 44100, 128, 2);
		expect(ctx.stateBuffer[0]).toBe(0); // still zero
	});
});

describe("resetEffectInstanceState", () => {
	it("zeroes all buffers", () => {
		const ctx = createEffectInstanceState(multiDelayModule, 44100, 128, 2);
		// Fill with non-zero values
		ctx.stateBuffer.fill(1.0);
		for (const dl of ctx.delayLines) {
			dl.fill(0.5);
		}

		resetEffectInstanceState(ctx);

		for (let i = 0; i < ctx.stateBuffer.length; i++) {
			expect(ctx.stateBuffer[i]).toBe(0);
		}
		for (const dl of ctx.delayLines) {
			for (let i = 0; i < dl.length; i++) {
				expect(dl[i]).toBe(0);
			}
		}
	});

	it("preserves context shape after reset", () => {
		const ctx = createEffectInstanceState(delayLineModule, 44100, 128, 2);
		ctx.stateBuffer.fill(1.0);

		resetEffectInstanceState(ctx);

		expect(ctx.module.id).toBe("test.delayLine");
		expect(ctx.stateBuffer.length).toBe(4);
		expect(ctx.delayLines.length).toBe(1);
	});

	it("is idempotent", () => {
		const ctx = createEffectInstanceState(multiDelayModule, 44100, 128, 2);
		resetEffectInstanceState(ctx);
		resetEffectInstanceState(ctx);
		for (let i = 0; i < ctx.stateBuffer.length; i++) {
			expect(ctx.stateBuffer[i]).toBe(0);
		}
	});
});

describe("EffectInstanceContext shape", () => {
	it("provides host audio parameters correctly", () => {
		const ctx = createEffectInstanceState(delayLineModule, 48000, 256, 1);
		expect(ctx.sampleRate).toBe(48000);
		expect(ctx.blockSize).toBe(256);
		expect(ctx.channelCount).toBe(1);
	});
});
