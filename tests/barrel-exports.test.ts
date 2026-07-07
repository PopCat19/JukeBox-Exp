// barrel-exports.test.ts
//
// Purpose: Verify barrel re-exports resolve at runtime
//
// Catches: removed exports, renamed symbols, broken re-export chains.
// If a barrel drops an export, the import here throws at module load time.

import { describe, test, expect } from "bun:test";

describe("synth barrel exports", () => {
	test("synth/synthesis build functions are accessible from sub-barrel", async () => {
		const mod = await import("../synth/synthesis");
		expect(typeof mod.buildChipSource).toBe("function");
		expect(typeof mod.buildDrumSource).toBe("function");
		expect(typeof mod.buildEffectsSource).toBe("function");
		expect(typeof mod.buildFmSource).toBe("function");
		expect(typeof mod.buildFm6Source).toBe("function");
		expect(typeof mod.buildHarmonicsSource).toBe("function");
		expect(typeof mod.buildNoiseSource).toBe("function");
		expect(typeof mod.buildPickedStringSource).toBe("function");
		expect(typeof mod.buildPulseWidthSource).toBe("function");
		expect(typeof mod.buildSpectrumSource).toBe("function");
		expect(typeof mod.buildSupersawSource).toBe("function");
	});

	test("synth/config utils and sample-loader are accessible from sub-barrel", async () => {
		const configMod = await import("../synth/config");
		expect(typeof configMod.Config).toBe("function");
		expect(typeof configMod.InstrumentType).toBe("object");
		expect(typeof configMod.FilterType).toBe("object");
		expect(typeof configMod.EnvelopeType).toBe("object");
		expect(typeof configMod.getInstrumentTypeName).toBe("function");
		expect(typeof configMod.getInstrumentTypeId).toBe("function");
		expect(typeof configMod.startLoadingSample).toBe("function");
		expect(typeof configMod.centerWave).toBe("function");
		expect(typeof configMod.getArpeggioPitchIndex).toBe("function");
		expect(typeof configMod.getPulseWidthRatio).toBe("function");
		expect(typeof configMod.sampleLoadingState).toBe("object");
	});

	test("synth/formats legacy-compat is accessible from sub-barrel", async () => {
		const fmtMod = await import("../synth/formats");
		expect(typeof fmtMod.fromJukeboxExpJson).toBe("function");
		expect(typeof fmtMod.toJukeboxExpJson).toBe("function");
		expect(typeof fmtMod.fromLegacyCompatJson).toBe("function");
		expect(typeof fmtMod.toLegacyCompatJson).toBe("function");
		expect(typeof fmtMod.JUKEBOX_EXP_FORMAT).toBe("string");
		expect(typeof fmtMod.JUKEBOX_EXP_LATEST_VERSION).toBe("number");
	});

	test("synth/instruments barrel is accessible", async () => {
		const instMod = await import("../synth/instruments");
		expect(typeof instMod.Instrument).toBe("function");
		expect(typeof instMod.Operator).toBe("function");
		expect(typeof instMod.FilterSettings).toBe("function");
		expect(typeof instMod.EnvelopeSettings).toBe("function");
		expect(typeof instMod.CustomAlgorithm).toBe("function");
		expect(typeof instMod.CustomFeedBack).toBe("function");
		expect(typeof instMod.FilterControlPoint).toBe("function");
	});

	test("synth/plugins barrel is accessible", async () => {
		const plugMod = await import("../synth/plugins");
		expect(typeof plugMod.getPlugin).toBe("function");
		expect(typeof plugMod.registerPlugin).toBe("function");
		expect(typeof plugMod.getRegisteredPlugins).toBe("function");
		expect(typeof plugMod.getEffectsSynthFunction).toBe("function");
	});

	test("util functions are accessible", async () => {
		const mod = await import("../synth");
		expect(typeof mod.clamp).toBe("function");
		expect(typeof mod.validateRange).toBe("function");
		expect(typeof mod.detuneToCents).toBe("function");
		expect(typeof mod.centsToDetune).toBe("function");
		expect(typeof mod.fittingPowerOfTwo).toBe("function");
		expect(typeof mod.fadeInSettingToSeconds).toBe("function");
		expect(typeof mod.secondsToFadeInSetting).toBe("function");
		expect(typeof mod.fadeOutSettingToTicks).toBe("function");
		expect(typeof mod.ticksToFadeOutSetting).toBe("function");
		expect(typeof mod.getOperatorWave).toBe("function");
		expect(typeof mod.parseFloatWithDefault).toBe("function");
		expect(typeof mod.parseIntWithDefault).toBe("function");
		expect(typeof mod.epsilon).toBe("number");
		expect(typeof mod.wrap).toBe("function");
	});

	test("core classes are accessible", async () => {
		const mod = await import("../synth");
		expect(typeof mod.Song).toBe("function");
		expect(typeof mod.Synth).toBe("function");
		expect(typeof mod.Tone).toBe("function");
		expect(typeof mod.Note).toBe("function");
		expect(typeof mod.Pattern).toBe("function");
		expect(typeof mod.Channel).toBe("function");
		expect(typeof mod.Instrument).toBe("function");
	});

	test("plugin registry is accessible", async () => {
		const mod = await import("../synth");
		expect(typeof mod.getPlugin).toBe("function");
		expect(typeof mod.registerPlugin).toBe("function");
		expect(typeof mod.getRegisteredPlugins).toBe("function");
	});

	test("synth-config re-exports are accessible", async () => {
		const mod = await import("../synth");
		expect(typeof mod.Config).toBe("function");
		expect(typeof mod.InstrumentType).toBe("object");
		expect(typeof mod.FilterType).toBe("object");
		expect(typeof mod.EnvelopeType).toBe("object");
		// Chord and Transition are type-only (interfaces), not runtime values
	});

	test("serialization helpers are accessible", async () => {
		const mod = await import("../synth");
		expect(typeof mod.base64CharCodeToInt).toBe("object");
		expect(typeof mod.base64IntToCharCode).toBe("object");
		expect(typeof mod.getNeededBits).toBe("function");
	});

	test("format handlers are accessible", async () => {
		const mod = await import("../synth");
		expect(typeof mod.fromJukeboxExpJson).toBe("function");
		expect(typeof mod.toJukeboxExpJson).toBe("function");
		expect(typeof mod.JUKEBOX_EXP_FORMAT).toBe("string");
		expect(typeof mod.JUKEBOX_EXP_LATEST_VERSION).toBe("number");
	});
});

describe("editor/ui barrel exports", () => {
	test("build helpers are accessible", async () => {
		const mod = await import("../editor/ui");
		expect(typeof mod.buildOptions).toBe("function");
		expect(typeof mod.numberInput).toBe("function");
		expect(typeof mod.buildPresetOptions).toBe("function");
		expect(typeof mod.buildHeaderedOptions).toBe("function");
		expect(typeof mod.setSelectedValue).toBe("function");
	});

	test("slider and layout are accessible", async () => {
		// Slider and Layout have circular deps with SongDocument via the barrel.
		// Test direct imports to avoid ESM dead zones.
		const sliderMod = await import("../editor/ui/sliders/slider");
		expect(typeof sliderMod.Slider).toBe("function");
		expect(typeof sliderMod.rangeSlider).toBe("function");
		// Layout has circular dependency with barrel — verify direct import works
		const layoutMod = await import("../editor/ui/layout/layout");
		expect(typeof layoutMod.Layout).toBe("function");
	});

	test("base factories are accessible", async () => {
		const mod = await import("../editor/ui");
		expect(typeof mod.createDiv).toBe("function");
		expect(typeof mod.createSpan).toBe("function");
		expect(typeof mod.createButton).toBe("function");
		expect(typeof mod.createInput).toBe("function");
		expect(typeof mod.createLabel).toBe("function");
		expect(typeof mod.addWheelSupport).toBe("function");
	});

	test("prompt components are accessible", async () => {
		const mod = await import("../editor/ui");
		expect(typeof mod.pane).toBe("function");
		expect(typeof mod.flexPane).toBe("function");
		expect(typeof mod.paneContainer).toBe("function");
		expect(typeof mod.inputRow).toBe("function");
		expect(typeof mod.instructions).toBe("function");
		expect(typeof mod.promptLabel).toBe("function");
		expect(typeof mod.promptValue).toBe("function");
	});

	test("container helpers are accessible", async () => {
		const mod = await import("../editor/ui");
		expect(typeof mod.flexRowCenter).toBe("function");
		expect(typeof mod.flexColumnCenter).toBe("function");
		expect(typeof mod.formRow).toBe("function");
		expect(typeof mod.selectRow).toBe("function");
		expect(typeof mod.checkboxRow).toBe("function");
		expect(typeof mod.okayRow).toBe("function");
	});

	test("button factories are accessible", async () => {
		const mod = await import("../editor/ui");
		expect(typeof mod.actionButton).toBe("function");
		expect(typeof mod.iconButton).toBe("function");
		expect(typeof mod.toggleButton).toBe("function");
		expect(typeof mod.clearButton).toBe("function");
		expect(typeof mod.deleteButton).toBe("function");
		expect(typeof mod.selectorButton).toBe("function");
	});

	test("input factories are accessible", async () => {
		const mod = await import("../editor/ui");
		expect(typeof mod.createInputBox).toBe("function");
		expect(typeof mod.searchInput).toBe("function");
		expect(typeof mod.stepperInput).toBe("function");
		expect(typeof mod.checkboxInput).toBe("function");
	});

	test("style system is accessible", async () => {
		const mod = await import("../editor/ui");
		expect(typeof mod.s).toBe("function");
		expect(typeof mod.bg).toBe("function");
		expect(typeof mod.fg).toBe("function");
		expect(typeof mod.flex).toBe("function");
		expect(typeof mod.gap).toBe("function");
		expect(typeof mod.p).toBe("function");
		expect(typeof mod.m).toBe("function");
	});

	test("state tokens and interaction helpers are accessible", async () => {
		const mod = await import("../editor/ui");
		// State tokens
		expect(typeof mod.StateOutline).toBe("object");
		expect(typeof mod.StateForeground).toBe("object");
		expect(typeof mod.StateBackground).toBe("object");
		expect(typeof mod.stateTransition).toBe("function");
		expect(typeof mod.hoverRing).toBe("function");
		expect(typeof mod.hoverRule).toBe("function");
		expect(typeof mod.focusRule).toBe("function");
		expect(typeof mod.inputFocusRule).toBe("function");
		expect(typeof mod.interactiveFeedback).toBe("function");
		// Surface roles
		expect(typeof mod.interactiveSurface).toBe("function");
		expect(typeof mod.primarySurface).toBe("function");
		expect(typeof mod.secondarySurface).toBe("function");
		expect(typeof mod.ghostSurface).toBe("function");
		// Interaction helpers
		expect(typeof mod.hoverReveal).toBe("function");
		expect(typeof mod.focusReveal).toBe("function");
		expect(typeof mod.setActive).toBe("function");
	});
});

describe("shared barrel exports", () => {
	test("shared/pmd color system is accessible from sub-barrel", async () => {
		const pmdMod = await import("../shared/pmd");
		expect(typeof pmdMod.bake).toBe("function");
		expect(typeof pmdMod.composite).toBe("function");
		expect(typeof pmdMod.stack).toBe("function");
		expect(typeof pmdMod.getPMD).toBe("function");
		expect(typeof pmdMod.getComputed).toBe("function");
		expect(typeof pmdMod.getAuxHue).toBe("function");
		expect(typeof pmdMod.generatePalette).toBe("function");
		expect(typeof pmdMod.getBase16Defs).toBe("function");
		expect(typeof pmdMod.HUE_MAX).toBe("number");
		expect(typeof pmdMod.AUX_HUE_OFFSET).toBe("number");
	});

	test("color-utils functions are accessible from shared/color-utils", async () => {
		const mod = await import("../shared/color-utils");
		expect(typeof mod.parseCssColor).toBe("function");
		expect(typeof mod.rgbaToHex).toBe("function");
		expect(typeof mod.rgbaToHsl).toBe("function");
		expect(typeof mod.hslToRgb).toBe("function");
		expect(typeof mod.oklchToRgb).toBe("function");
		expect(typeof mod.rgbToHex).toBe("function");
		expect(typeof mod.hexToRgb).toBe("function");
		expect(typeof mod.maxOklchChroma).toBe("function");
		expect(typeof mod.clampOklchChroma).toBe("function");
		expect(typeof mod.hexToHsla).toBe("function");
		expect(typeof mod.hexToOklcha).toBe("function");
		expect(typeof mod.hslaToHex).toBe("function");
		expect(typeof mod.oklchToHex).toBe("function");
		expect(typeof mod.formatColorForTab).toBe("function");
	});

	test("events module is accessible", async () => {
		const mod = await import("../shared/events");
		expect(typeof mod.events.raise).toBe("function");
		expect(typeof mod.events.listen).toBe("function");
		expect(typeof mod.events.unlisten).toBe("function");
	});

	test("synth/modules barrel exports all module defaults", async () => {
		const mods = await import("../synth/modules");
		expect(typeof mods.supersawModule).toBe("object");
		expect(typeof mods.pulseModule).toBe("object");
		expect(typeof mods.noiseModule).toBe("object");
		expect(typeof mods.chipModule).toBe("object");
		expect(typeof mods.harmonicsModule).toBe("object");
		expect(typeof mods.spectrumModule).toBe("object");
		expect(typeof mods.pickedStringModule).toBe("object");
		expect(typeof mods.fmModule).toBe("object");
		expect(typeof mods.fm6Module).toBe("object");
		expect(typeof mods.drumsetModule).toBe("object");
		expect(typeof mods.modModule).toBe("object");
		expect(typeof mods.createPlaceholderModule).toBe("function");
		expect(typeof mods.isPlaceholderId).toBe("function");
		expect(typeof mods.unwrapPlaceholderId).toBe("function");
		expect(typeof mods.SUPERSAW_ID).toBe("string");
		expect(typeof mods.PULSE_ID).toBe("string");
		expect(typeof mods.NOISE_ID).toBe("string");
		expect(typeof mods.CHIP_ID).toBe("string");
		expect(typeof mods.HARMONICS_ID).toBe("string");
		expect(typeof mods.SPECTRUM_ID).toBe("string");
		expect(typeof mods.PICKED_STRING_ID).toBe("string");
		expect(typeof mods.FM_ID).toBe("string");
		expect(typeof mods.FM6_ID).toBe("string");
		expect(typeof mods.DRUMSET_ID).toBe("string");
		expect(typeof mods.MOD_ID).toBe("string");
		expect(typeof mods.CUSTOM_CHIP_WAVE_ID).toBe("string");
		expect(mods.CUSTOM_CHIP_WAVE_ID).toBe("core.customChipWave");
		expect(Array.isArray(mods.CORE_MODULE_IDS)).toBeTrue();
		expect(mods.CORE_MODULE_IDS[9]).toBe("core.customChipWave");
	});
});
