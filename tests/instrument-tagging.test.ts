import { describe, expect, test } from "bun:test";

import "../synth/plugins";
import { Instrument } from "../synth/instruments/instrument";
import { Song } from "../synth/song";
import {
	tagInstrumentWithModule,
	preserveOrTagInstrumentWithModule,
} from "../synth/socket/instrument-tagging";
import { INSTRUMENT_TYPE_TO_MODULE_ID } from "../synth/socket/bridge";
import { getInstrument } from "../synth/socket/registry";
import { InstrumentType } from "../synth/synth-config";
import { toJukeboxExpV2Json, fromJukeboxExpV2Json } from "../synth/formats/jukebox-exp-v2";

describe("instrument tagging", () => {
	test("bridge map covers all 11 core modules", () => {
		expect(INSTRUMENT_TYPE_TO_MODULE_ID.size).toBe(11);
		expect(INSTRUMENT_TYPE_TO_MODULE_ID.get(InstrumentType.chip)).toBe("core.chip");
		expect(INSTRUMENT_TYPE_TO_MODULE_ID.get(InstrumentType.noise)).toBe("core.noise");
		expect(INSTRUMENT_TYPE_TO_MODULE_ID.get(InstrumentType.fm)).toBe("core.fm");
		expect(INSTRUMENT_TYPE_TO_MODULE_ID.get(InstrumentType.fm6op)).toBe("core.fm6");
		expect(INSTRUMENT_TYPE_TO_MODULE_ID.get(InstrumentType.spectrum)).toBe("core.spectrum");
		expect(INSTRUMENT_TYPE_TO_MODULE_ID.get(InstrumentType.harmonics)).toBe("core.harmonics");
		expect(INSTRUMENT_TYPE_TO_MODULE_ID.get(InstrumentType.drumset)).toBe("core.drumset");
		expect(INSTRUMENT_TYPE_TO_MODULE_ID.get(InstrumentType.pickedString)).toBe(
			"core.pickedString",
		);
		expect(INSTRUMENT_TYPE_TO_MODULE_ID.get(InstrumentType.supersaw)).toBe("core.supersaw");
		expect(INSTRUMENT_TYPE_TO_MODULE_ID.get(InstrumentType.pwm)).toBe("core.pulse");
		expect(INSTRUMENT_TYPE_TO_MODULE_ID.get(InstrumentType.mod)).toBe("core.mod");
	});

	test("tagInstrumentWithModule sets id for chip type", () => {
		const inst = new Instrument(false, false);
		inst.setTypeAndReset(InstrumentType.chip, false, false);
		tagInstrumentWithModule(inst);
		expect((inst as unknown as { _socketModuleId?: string })._socketModuleId).toBe(
			"core.chip",
		);
	});

	test("tagInstrumentWithModule sets id for fm6op type", () => {
		const inst = new Instrument(false, false);
		inst.setTypeAndReset(InstrumentType.fm6op, false, false);
		tagInstrumentWithModule(inst);
		expect((inst as unknown as { _socketModuleId?: string })._socketModuleId).toBe(
			"core.fm6",
		);
	});

	test("tagInstrumentWithModule sets id for mod type", () => {
		const inst = new Instrument(false, true);
		inst.setTypeAndReset(InstrumentType.mod, false, true);
		tagInstrumentWithModule(inst);
		expect((inst as unknown as { _socketModuleId?: string })._socketModuleId).toBe(
			"core.mod",
		);
	});

	test("tagInstrumentWithModule clears stale id for unregistered type", () => {
		const inst = new Instrument(false, false);
		// Simulate a previously tagged chip instrument whose user then changes type
		(inst as unknown as { _socketModuleId?: string })._socketModuleId = "core.chip";
		// customChipWave has no core module registered
		inst.setTypeAndReset(InstrumentType.customChipWave, false, false);
		tagInstrumentWithModule(inst);
		expect((inst as unknown as { _socketModuleId?: string })._socketModuleId).toBeUndefined();
	});

	test("preserveOrTagInstrumentWithModule keeps src id when present", () => {
		const src = new Instrument(false, false);
		src.setTypeAndReset(InstrumentType.chip, false, false);
		(src as unknown as { _socketModuleId?: string })._socketModuleId = "core.chip";

		const dest = new Instrument(false, false);
		dest.setTypeAndReset(InstrumentType.noise, false, false);
		// dest has no tag yet, type=0 (default)

		preserveOrTagInstrumentWithModule(dest, src);
		expect((dest as unknown as { _socketModuleId?: string })._socketModuleId).toBe(
			"core.chip",
		);
	});

	test("preserveOrTagInstrumentWithModule falls back to type when src has no id", () => {
		const src = new Instrument(false, false);
		// src has no _socketModuleId

		const dest = new Instrument(false, false);
		dest.setTypeAndReset(InstrumentType.fm, false, false);

		preserveOrTagInstrumentWithModule(dest, src);
		expect((dest as unknown as { _socketModuleId?: string })._socketModuleId).toBe(
			"core.fm",
		);
	});

	test("fresh song instruments get tagged on init", () => {
		const song = new Song();
		// Default song has pitch channels (chip), noise channels (noise), mod channels (mod)
		const pitchInstrument = song.channels[0].instruments[0];
		const noiseInstrument = song.channels[song.pitchChannelCount].instruments[0];
		const modInstrument =
			song.channels[song.pitchChannelCount + song.noiseChannelCount].instruments[0];

		expect((pitchInstrument as unknown as { _socketModuleId?: string })._socketModuleId).toBe(
			"core.chip",
		);
		expect((noiseInstrument as unknown as { _socketModuleId?: string })._socketModuleId).toBe(
			"core.noise",
		);
		expect((modInstrument as unknown as { _socketModuleId?: string })._socketModuleId).toBe(
			"core.mod",
		);
	});

	test("round-trip via JukeboxExpV2 preserves module payloads for fresh songs", () => {
		const song = new Song();
		// Confirm tagging first
		const pitchInstrument = song.channels[0].instruments[0];
		expect((pitchInstrument as unknown as { _socketModuleId?: string })._socketModuleId).toBe(
			"core.chip",
		);

		const exported = toJukeboxExpV2Json(song as any);
		// modulePayloads must be present and contain a chip entry
		expect(exported.modulePayloads).toBeDefined();
		const keys = Object.keys(exported.modulePayloads!);
		expect(keys.length).toBeGreaterThan(0);
		const firstPayload = exported.modulePayloads![keys[0]];
		expect(firstPayload.id).toMatch(/^core\./);

		// Verify the round-trip
		const newSong = new Song();
		fromJukeboxExpV2Json(newSong as any, exported);
		const restored = (newSong.channels[0].instruments[0] as unknown as {
			_socketModuleId?: string;
		})._socketModuleId;
		expect(restored).toBe((pitchInstrument as unknown as { _socketModuleId?: string })._socketModuleId);
	});

	test("setDefaultInstruments retags after preset reset (regression)", async () => {
		// setDefaultInstruments() overwrites instrument settings via fromJsonObject
		// inside a fresh editor song. Without re-tagging, stale _socketModuleId
		// would survive and v2 export would emit a wrong modulePayload.
		// setDefaultInstruments depends on document for preset tags, so stub it.
		const g = globalThis as { document?: unknown };
		const prevDoc = g.document;
		g.document = { getElementById: () => null };
		try {
			const { setDefaultInstruments } = await import("../editor/changes/song");
			const song = new Song();
			setDefaultInstruments(song);
			for (let ch = 0; ch < song.channels.length; ch++) {
				const isNoise = song.getChannelIsNoise(ch);
				const isMod = song.getChannelIsMod(ch);
				for (const inst of song.channels[ch].instruments) {
					const id = (inst as unknown as { _socketModuleId?: string })._socketModuleId;
					// Tag must either be a known core module id, or cleared (unregistered type).
					if (id !== undefined) {
						expect(id).toMatch(/^core\./);
					}
					if (isMod) {
						expect([InstrumentType.mod]).toContain(inst.type);
					} else if (isNoise) {
						expect(
							id === undefined ||
								id === "core.noise" ||
								id === "core.drumset" ||
								id === "core.spectrum",
						).toBeTrue();
					}
				}
			}
		} finally {
			if (prevDoc === undefined) {
				delete g.document;
			} else {
				g.document = prevDoc;
			}
		}
	});

	test("registry returns module for each tagged type", () => {
		const taggableTypes = [
			InstrumentType.chip,
			InstrumentType.noise,
			InstrumentType.fm,
			InstrumentType.fm6op,
			InstrumentType.spectrum,
			InstrumentType.harmonics,
			InstrumentType.drumset,
			InstrumentType.pickedString,
			InstrumentType.supersaw,
			InstrumentType.pwm,
			InstrumentType.mod,
		];
		for (const t of taggableTypes) {
			const id: string | undefined = INSTRUMENT_TYPE_TO_MODULE_ID.get(t);
			expect(id).toBeDefined();
			const mod = id !== undefined ? getInstrument(id) : undefined;
			expect(mod).toBeDefined();
			expect(mod!.id).toBe(id!);
		}
	});
});