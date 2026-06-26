// channels.test.ts
//
// Purpose: Unit tests for Channel and ChannelState data structures
//
// This module:
// - Verifies Channel default values and array initialization
// - Verifies ChannelState default values and audio buffer sizing

import { describe, test, expect } from "bun:test";
import { Channel } from "../synth/channels";
import { ChannelState } from "../synth/channel-state";

describe("Channel", () => {
	test("default octave is 0", () => {
		const c = new Channel();
		expect(c.octave).toBe(0);
	});

	test("default muted is false", () => {
		const c = new Channel();
		expect(c.muted).toBeFalse();
	});

	test("default name is empty string", () => {
		const c = new Channel();
		expect(c.name).toBe("");
	});

	test("instruments, patterns, bars start empty", () => {
		const c = new Channel();
		expect(c.instruments).toBeEmpty();
		expect(c.patterns).toBeEmpty();
		expect(c.bars).toBeEmpty();
	});

	test("mutable arrays allow pushing", () => {
		const c = new Channel();
		c.instruments.push({} as any);
		c.patterns.push({} as any);
		c.bars.push(4);
		expect(c.instruments.length).toBe(1);
		expect(c.patterns.length).toBe(1);
		expect(c.bars.length).toBe(1);
	});
});

describe("ChannelState", () => {
	test("instruments start empty", () => {
		const s = new ChannelState();
		expect(s.instruments).toBeEmpty();
	});

	test("default muted is false", () => {
		const s = new ChannelState();
		expect(s.muted).toBeFalse();
	});

	test("singleSeamlessInstrument starts null", () => {
		const s = new ChannelState();
		expect(s.singleSeamlessInstrument).toBeNull();
	});

	test("volumeCap starts at 0", () => {
		const s = new ChannelState();
		expect(s.volumeCap).toBe(0);
	});

	test("audioRing is 8192 elements initialized to 0", () => {
		const s = new ChannelState();
		expect(s.audioRing.length).toBe(8192);
		for (let i = 0; i < s.audioRing.length; i++) {
			expect(s.audioRing[i]).toBe(0);
		}
	});

	test("audioRingPos starts at 0", () => {
		const s = new ChannelState();
		expect(s.audioRingPos).toBe(0);
	});

	test("audioScratch is 8192 elements", () => {
		const s = new ChannelState();
		expect(s.audioScratch.length).toBe(8192);
	});
});
