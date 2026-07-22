// theme-raster-redraw.test.ts
//
// Purpose: Verifies theme changes synchronously repaint retained raster data.
//
// This module:
// - proves theme listeners observe reset color caches
// - proves paused spectrum repaint retains geometry and handles resize
// - proves editor and prompt raster ownership is lifecycle-safe

import { afterAll, afterEach, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type { SongEditor } from "../editor/song-editor";
import {
	ThemeRasterRedrawRegistry,
	registerSongEditorThemeRasterOwner,
} from "../editor/core/theme-raster-redraw";
import type { PromptEditorRefs } from "../editor/core/prompt-manager";
import { ChannelVolumeVisualizerPrompt } from "../editor/prompts/channel-volume-visualizer-prompt";
import { VisualLoopControlsPrompt } from "../editor/prompts/visual-loop-controls-prompt";
import { SongDocument } from "../editor/song-document";
import { ColorConfig } from "../shared/color-config";
import { events } from "../shared/events";
import { spectrumCanvas } from "../shared/spectrum";

let registeredHappyDom = false;
let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

class MockContext {
	public fillStyle: string | CanvasGradient | CanvasPattern = "";
	public strokeStyle: string | CanvasGradient | CanvasPattern = "";
	public globalAlpha = 1;
	public lineWidth = 1;
	public readonly curves: number[][] = [];
	public readonly fillColors: string[] = [];
	public readonly strokeColors: string[] = [];
	public fillRects = 0;
	public clears = 0;
	public beginPath(): void {}
	public moveTo(): void {}
	public lineTo(): void {}
	public closePath(): void {}
	public save(): void {}
	public restore(): void {}
	public arc(): void {}
	public fillRect(): void { this.fillRects++; this.fillColors.push(String(this.fillStyle)); }
	public clearRect(): void { this.clears++; }
	public fill(): void { this.fillColors.push(String(this.fillStyle)); }
	public stroke(): void { this.strokeColors.push(String(this.strokeStyle)); }
	public quadraticCurveTo(...args: number[]): void { this.curves.push(args); }
}

function editorRefs(): PromptEditorRefs {
	return {
		togglePlay: () => {},
		muteEditor: { setHoveredChannel: () => {} },
		trackEditor: { setHoveredChannel: () => {} },
		drumsetSpectrumEditors: [],
		patternEditor: {} as PromptEditorRefs["patternEditor"],
		trackArea: document.createElement("div"),
		handleImportFile: () => {},
	};
}

beforeAll(() => {
	if (!GlobalRegistrator.isRegistered) {
		GlobalRegistrator.register();
		registeredHappyDom = true;
	}
	originalGetContext = HTMLCanvasElement.prototype.getContext;
});

afterEach(() => {
	document.body.replaceChildren();
});

afterAll(() => {
	HTMLCanvasElement.prototype.getContext = originalGetContext;
	if (registeredHappyDom) GlobalRegistrator.unregister();
});

describe("theme raster redraw", () => {
	test("repaints retained spectrum colors after cache reset without geometry changes", () => {
		const context = new MockContext();
		const canvas = document.createElement("canvas");
		Object.defineProperties(canvas, {
			clientWidth: { configurable: true, value: 160 },
			clientHeight: { configurable: true, value: 80 },
		});
		canvas.getContext = (() => context) as unknown as typeof canvas.getContext;
		let colorVersion = 0;
		const originalReset = ColorConfig.resetColors;
		const reset = spyOn(ColorConfig, "resetColors").mockImplementation(() => {
			colorVersion++;
			originalReset.call(ColorConfig);
		});
		const colors = spyOn(ColorConfig, "getComputed").mockImplementation(
			(name) => `${name}-${colorVersion}`,
		);
		const random = spyOn(Math, "random").mockReturnValue(0);
		const spectrum = new spectrumCanvas(canvas);
		spectrum.showParticles = true;
		const samples = Float32Array.from({ length: 2048 }, (_, index) =>
			Math.sin((index * Math.PI) / 8),
		);
		type Internals = { _particles: Array<Record<string, unknown>>; _fgSmoothMags: Float32Array; _bgSmoothMags: Float32Array };
		try {
			events.raise("spectrumUpdate", samples, samples);
			const internal = spectrum as unknown as Internals;
			expect(internal._particles.length).toBeGreaterThan(0);
			const particleGeometry = internal._particles.map(({ color: _color, ...particle }) => ({ ...particle }));
			const fg = Array.from(internal._fgSmoothMags);
			const bg = Array.from(internal._bgSmoothMags);
			const curveGeometry = context.curves.map((curve) => curve.slice());
			const fillStart = context.fillColors.length;
			ColorConfig.setTheme("forest");
			const repaintedColors = context.fillColors.slice(fillStart);
			expect(repaintedColors.length).toBeGreaterThan(2);
			expect(repaintedColors.every((color) => color.endsWith("-1"))).toBeTrue();
			expect(context.curves.slice(curveGeometry.length)).toEqual(curveGeometry);
			expect(Array.from(internal._fgSmoothMags)).toEqual(fg);
			expect(Array.from(internal._bgSmoothMags)).toEqual(bg);
			expect(internal._particles.map(({ color: _color, ...particle }) => ({ ...particle }))).toEqual(
				particleGeometry,
			);
			expect(internal._particles.every((particle) => String(particle.color).endsWith("-1"))).toBeTrue();
		} finally {
			spectrum.dispose();
			random.mockRestore();
			colors.mockRestore();
			reset.mockRestore();
		}
	});

	test("resizes before particle placement and repaints a paused DPR resize once", () => {
		const context = new MockContext();
		const canvas = document.createElement("canvas");
		let cssWidth = 100;
		let cssHeight = 50;
		Object.defineProperties(canvas, {
			clientWidth: { configurable: true, get: () => cssWidth },
			clientHeight: { configurable: true, get: () => cssHeight },
		});
		canvas.getContext = (() => context) as unknown as typeof canvas.getContext;
		Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 2 });
		const random = spyOn(Math, "random").mockReturnValue(0);
		const spectrum = new spectrumCanvas(canvas);
		spectrum.showParticles = true;
		const samples = Float32Array.from({ length: 2048 }, (_, index) => Math.sin(index / 3));
		type Internals = { _particles: Array<{ x: number; y: number }> };
		try {
			events.raise("spectrumUpdate", samples, samples);
			const particles = (spectrum as unknown as Internals)._particles;
			expect(canvas.width).toBe(200);
			expect(canvas.height).toBe(100);
			expect(Math.max(...particles.map((particle) => particle.x))).toBeGreaterThan(100);
			const geometry = particles.map((particle) => ({ x: particle.x, y: particle.y }));
			const paints = context.fillRects;
			cssWidth = 120;
			cssHeight = 60;
			Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 1.5 });
			window.dispatchEvent(new Event("resize"));
			expect(canvas.width).toBe(180);
			expect(canvas.height).toBe(90);
			expect(context.fillRects - paints).toBe(1);
			expect(particles.map((particle) => ({ x: particle.x, y: particle.y }))).toEqual(geometry);
			window.dispatchEvent(new Event("resize"));
			expect(context.fillRects - paints).toBe(1);
			spectrum.dispose();
			window.dispatchEvent(new Event("resize"));
			expect(context.fillRects - paints).toBe(1);
		} finally {
			spectrum.dispose();
			random.mockRestore();
		}
	});

	test("SongEditor redraw calls five raster APIs without notifier or history writes", async () => {
		const { SongEditor } = await import("../editor/song-editor");
		const calls: string[] = [];
		const owner = {
			_patternEditorPrev: { render: () => calls.push("previous") },
			_patternEditor: { render: () => calls.push("current") },
			_patternEditorNext: { render: () => calls.push("next") },
			_customWaveDrawCanvas: { redrawCanvas: () => calls.push("wave") },
			_customAlgorithmCanvas: { redrawCanvas: (force: boolean) => calls.push(`algorithm:${force}`) },
			doc: { notifier: { changed: () => calls.push("notifier") }, record: () => calls.push("history") },
		};
		SongEditor.prototype.redrawThemeRasters.call(owner as unknown as SongEditor);
		expect(calls).toEqual(["previous", "current", "next", "wave", "algorithm:true"]);
	});

	test("one weak registry redraws multiple owners and prunes dead ownership", () => {
		let first = 0;
		let second = 0;
		const live = [
			{ redrawThemeRasters: () => { first++; } },
			{ redrawThemeRasters: () => { second++; } },
		];
		for (const owner of live) registerSongEditorThemeRasterOwner(owner);
		events.raise("themeChange", "forest");
		expect([first, second]).toEqual([1, 1]);

		let attached = true;
		const registry = new ThemeRasterRedrawRegistry((owner) => ({
			deref: () => attached ? owner : undefined,
		}));
		registry.register(live[0]);
		attached = false;
		registry.redrawAndPrune();
		expect(registry.ownerReferenceCount).toBe(0);
	});

	test("constructed CVV and visual-loop prompts redraw and clean theme listeners", () => {
		const contexts = new WeakMap<HTMLCanvasElement, MockContext>();
		HTMLCanvasElement.prototype.getContext = function (
			this: HTMLCanvasElement,
		): RenderingContext | null {
			let context = contexts.get(this);
			if (context === undefined) {
				context = new MockContext();
				contexts.set(this, context);
			}
			return context as unknown as CanvasRenderingContext2D;
		} as typeof HTMLCanvasElement.prototype.getContext;
		const frame = spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		const cancel = spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
		const channelColors = {
			index: 0,
			name: "test",
			primaryChannel: "#ffffff",
			secondaryChannel: "#888888",
			primaryNote: "#ffffff",
			secondaryNote: "#888888",
		};
		const getChannelColor = spyOn(ColorConfig, "getChannelColor").mockReturnValue(channelColors);
		const getComputedChannelColor = spyOn(
			ColorConfig,
			"getComputedChannelColor",
		).mockReturnValue(channelColors);
		const cvv = new ChannelVolumeVisualizerPrompt(new SongDocument(), editorRefs());
		const loop = new VisualLoopControlsPrompt(new SongDocument(), editorRefs());
		const cvvRepaint = spyOn(cvv as never, "_repaintChannelSpectra");
		const loopRender = spyOn(loop as never, "_render");
		try {
			document.body.append(cvv.container, loop.container);
			events.raise("themeChange", "forest");
			expect(cvvRepaint).toHaveBeenCalledTimes(1);
			expect(loopRender).toHaveBeenCalledTimes(1);
			cvv.cleanUp();
			loop.cleanUp();
			cvv.cleanUp();
			loop.cleanUp();
			events.raise("themeChange", "nebula");
			expect(cvvRepaint).toHaveBeenCalledTimes(1);
			expect(loopRender).toHaveBeenCalledTimes(1);
		} finally {
			cvv.cleanUp();
			loop.cleanUp();
			cvvRepaint.mockRestore();
			loopRender.mockRestore();
			frame.mockRestore();
			cancel.mockRestore();
			getChannelColor.mockRestore();
			getComputedChannelColor.mockRestore();
		}
	});
});
