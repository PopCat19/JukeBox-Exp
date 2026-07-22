// svg-prompt-transaction-contract.test.ts
//
// Purpose: Guards transactional discard behavior for live-mutating SVG prompts
//
// This module:
// - Verifies every prompt uses one idempotent restore gate
// - Verifies commit marks state saved before closing

import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { readFileSync } from "node:fs";
import { CustomChipPromptCanvas } from "../editor/prompts/custom-chip-prompt";
import type { SongDocument } from "../editor/song-document";
import { ColorConfig } from "../shared/color-config";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();

const managerSource = readFileSync("editor/core/prompt-manager.ts", "utf8");
const filterEditorSource = readFileSync("editor/components/filter-editor.ts", "utf8");

const fullSources = {
	harmonics: readFileSync("editor/components/harmonics-editor.ts", "utf8"),
	spectrum: readFileSync("editor/components/spectrum-editor.ts", "utf8"),
	chip: readFileSync("editor/prompts/custom-chip-prompt.ts", "utf8"),
	filter: readFileSync("editor/prompts/custom-filter-prompt.ts", "utf8"),
	limiter: readFileSync("editor/prompts/limiter-prompt.ts", "utf8"),
};

const sources = Object.fromEntries(
	Object.entries(fullSources).map(([name, source]) => {
		const promptStart = source.lastIndexOf("export class ");
		return [name, source.slice(promptStart)];
	}),
);

function methodBody(source: string, signature: string): string {
	const start = source.lastIndexOf(signature);
	expect(start).toBeGreaterThanOrEqual(0);
	const open = source.indexOf("{", start);
	let depth = 0;
	for (let index = open; index < source.length; index++) {
		if (source[index] === "{") depth++;
		if (source[index] === "}" && --depth === 0) return source.slice(open + 1, index);
	}
	throw new Error(`Unclosed method: ${signature}`);
}

describe("SVG prompt transactions", () => {
	test("custom chip creates 64 finite blocks and removes window listeners", () => {
		const customChipWave = new Float32Array(65);
		customChipWave[1] = Number.NaN;
		const doc = {
			channel: 0,
			song: { pitchChannelCount: 1, noiseChannelCount: 0 },
			getCurrentInstrumentObj: () => ({ customChipWave }),
		} as unknown as SongDocument;
		const originalGetChannelColor = ColorConfig.getChannelColor;
		const originalAddEventListener = window.addEventListener;
		const originalRemoveEventListener = window.removeEventListener;
		const added = new Map<string, EventListenerOrEventListenerObject>();
		const removed = new Map<string, EventListenerOrEventListenerObject>();
		window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => {
			if (type === "scroll" || type === "resize") added.set(type, listener);
			originalAddEventListener.call(window, type, listener, options);
		}) as typeof window.addEventListener;
		window.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => {
			if (type === "scroll" || type === "resize") removed.set(type, listener);
			originalRemoveEventListener.call(window, type, listener, options);
		}) as typeof window.removeEventListener;
		ColorConfig.getChannelColor = () => ({ primaryNote: "#fff" }) as ReturnType<typeof ColorConfig.getChannelColor>;
		try {
			const canvas = new CustomChipPromptCanvas(doc);
			const blockLayer = canvas.container.querySelector("svg > svg:last-child");
			const blocks = Array.from(blockLayer?.querySelectorAll("rect") ?? []);

			expect(customChipWave.length).toBe(65);
			expect(blocks.length).toBe(64);
			for (const block of blocks) {
				expect(Number.isFinite(Number(block.getAttribute("y")))).toBeTrue();
			}
			canvas.cleanUp();
			expect(removed.get("scroll")).toBe(added.get("scroll"));
			expect(removed.get("resize")).toBe(added.get("resize"));
		} finally {
			ColorConfig.getChannelColor = originalGetChannelColor;
			window.addEventListener = originalAddEventListener;
			window.removeEventListener = originalRemoveEventListener;
		}
	});

	for (const [name, source] of Object.entries(sources)) {
		test(`${name} discard is idempotent across close and cleanup`, () => {
			const restore = methodBody(source, "_restoreOpeningState(): void");
			const close = methodBody(source, "_close = (): void");
			const cleanupSignature =
				name === "harmonics" || name === "spectrum"
					? "cleanUp = (): void"
					: "override cleanUp(): void";
			const cleanup = methodBody(source, cleanupSignature);
			expect(restore).toContain("if (this._saved || this._restored) return;");
			expect(restore).toContain("this._restored = true;");
			expect(close).toContain("this._restoreOpeningState();");
			expect(cleanup).toContain("this._restoreOpeningState();");
		});

		test(`${name} commit disables cleanup restore before close`, () => {
			const save = methodBody(source, "_saveChanges");
			const saved = save.indexOf("this._saved = true;");
			const close = save.indexOf(
				name === "limiter" ? "this._finishClose();" : "this._doc.prompt = null;",
			);
			expect(saved).toBeGreaterThanOrEqual(0);
			expect(close).toBeGreaterThan(saved);
		});
	}

	test("manager discards synchronously before prompt removal", () => {
		const close = methodBody(managerSource, "public close(prompt: Prompt | null): void");
		const discard = close.indexOf("prompt.discard();");
		const splice = close.indexOf("this._prompts.splice(index, 1);");
		expect(discard).toBeGreaterThanOrEqual(0);
		expect(splice).toBeGreaterThan(discard);
	});

	test("limiter previews bypass document history", () => {
		const update = methodBody(fullSources.limiter, "_updateLimiter = ()");
		const save = methodBody(fullSources.limiter, "_saveChanges");
		expect(update).not.toContain("this._doc.record(");
		expect(save).toContain("this._doc.record(this._updateLimiter(), true);");
	});

	test("filter discard restores deep main and morph snapshots", () => {
		const constructor = methodBody(filterEditorSource, "constructor(");
		const reset = methodBody(filterEditorSource, "resetToInitial(): void");
		expect(constructor).toContain("this._initialFilterSettings = this._copyFilter(filterSettings);");
		expect(constructor).toContain("this._initialSubFilters = targetSubFilters.map");
		expect(reset).toContain("restoredSubFilters");
		expect(reset).not.toContain("this.undo();");
	});

	test("wave editors restore captured opening arrays", () => {
		const harmonicsReset = methodBody(fullSources.harmonics, "resetToInitial(): void");
		const spectrumReset = methodBody(fullSources.spectrum, "resetToInitial(): void");
		expect(harmonicsReset).toContain("this.setHarmonicsWave(this._initialHarmonics);");
		expect(spectrumReset).toContain("this.setSpectrumWave(this._initialSpectrum);");
	});
});
