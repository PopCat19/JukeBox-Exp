import { BorderWidth, Sizing, Typography } from "../ui/style-constants";
// ChannelVolumeVisualizerPrompt
//
// Purpose: Modal popup displaying per-channel gain information with live updates
//
// This module:
// - Shows output volume level (same as editor volume bar)
// - Displays per-channel live output volume bars
// - Updates in real-time during playback

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { events } from "../../shared/events";
import { spectrumCanvas } from "../../shared/spectrum";
import type { ChannelState } from "../../synth/channel-state";
import { Config } from "../../synth/config/index";
import { getInstrumentTypeName } from "../../synth/config/instrument-registry";
import { forwardRealFourierTransform } from "../../synth/fft";
import { EditorConfig } from "../config/editor-config";
import type { PromptEditorRefs } from "../core/prompt-manager";
import type { SongDocument } from "../song-document";
import { BasePrompt } from "./base-prompt";

const { div, h2, span, button, canvas } = HTML;
const { svg, rect } = SVG;

// Spectrum overlay tuning, mirroring shared/spectrum.ts main FG layer so the
// per-channel overlay matches the editor's main spectrum look.
// FG bands: 151 quarter-tone bands from ~130Hz to ~10000Hz.
const FG_BANDS = 151;
// Display bars aggregated from the FG or BG bands. The channel cards are narrow
// (1:1 aspect), so a 151-point wave is unreadable; 16 rounded bars aggregate
// ~9-10 bands each and read clearly at the card width.
const BAR_COUNT = 24;
// BG bands: 67 quarter-tone bands from ~20Hz to ~130Hz (mirrors main spectrum).
const BG_BANDS = 67;
// Fixed soft-compression reference (same as main spectrum FG_REF). The bar
// height is min(1, 2*v/(v+FG_REF)), so a band reaches the ceiling only at
// ~FG_REF in magnitude. The per-channel ring holds the channel's own isolated
// diff at its true sample amplitude (a solo full-scale channel writes +/-1).
const FG_REF = 0.04;
// Display-only gain for the spectrum bars (not the meter). The per-channel
// isolated signal is quieter than the main spectrum's full-mix source, so a
// modest fixed lift makes the bars read visibly without affecting the peak
// meter, which stays accurate to the post-limiter output level. Tuned so a
// typical channel sits mid-bar rather than near the floor.
const SPECTRUM_DISPLAY_GAIN = 3;
// 8192-point FFT: at 48kHz gives 5.86Hz bins, enough resolution for the FG band grid.
const FFT_SIZE = 8192;
// Gaussian spatial-blur kernel (sigma=3 bands), truncated to +-BLUR_RADIUS.
// Precomputed once so the per-channel per-frame blur is O(FG_BANDS * kernel)
// instead of O(FG_BANDS^2). At 3 sigma the truncated tail is negligible.
const BLUR_RADIUS = 9;
const BLUR_KERNEL: readonly number[] = ChannelVolumeVisualizerPrompt_initBlurKernel();
function ChannelVolumeVisualizerPrompt_initBlurKernel(): number[] {
	const kernel: number[] = [];
	for (let d = -BLUR_RADIUS; d <= BLUR_RADIUS; d++) {
		kernel.push(Math.exp((-0.5 * d * d) / 9));
	}
	return kernel;
}

function getInstrumentDisplayName(instrument: import("../../synth/instruments").Instrument): string {
	// Prefer preset name if instrument has one.
	const preset = EditorConfig.valueToPreset(instrument.preset);
	if (preset) return preset.name;
	// For chip instruments using a custom sample, show the sample name.
	const chipWave = Config.chipWaves[instrument.chipWave];
	if (chipWave?.isCustomSampled && chipWave.name) return chipWave.name;
	// Fall back to instrument type name.
	return getInstrumentTypeName(instrument.type);
}

// Format seconds as M:SS, matching player-animator.ts.
function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export class ChannelVolumeVisualizerPrompt extends BasePrompt {
	private _animationId: number = 0;
	// Window the current rAF id is scheduled on. Tracked so cancel targets the
	// correct window (main and popout have separate rAF id spaces) and so the
	// animate loop reschedules on whichever window currently hosts the container.
	// When popped out the container lives in the popout window, whose rAF keeps
	// firing while the main editor window is throttled out of view — this is what
	// lets the popout stay live without the editor rendering. The audio data it
	// reads (outVolumeCap, per-channel audioRing, playhead) is written by the
	// AudioWorklet on the audio thread, independent of either window's visibility.
	private _rafWin: Window = window;

	private readonly _contentContainer: HTMLDivElement = div({
		style: "display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; align-content: start;",
	});
	private readonly _channelsPane: HTMLDivElement = div(
		{
			style: "flex: 1; display: flex; flex-direction: column; min-height: 0; padding: 4px 12px 12px 12px;",
		},
		this._contentContainer,
	);

	// Store channel volume bar elements for live updates
	private readonly _channelVolumeBars: Map<number, SVGRectElement> = new Map();
	private readonly _channelVolumeCaps: Map<number, SVGRectElement> = new Map();
	private readonly _channelHistoricCaps: Map<number, { cap: number; timer: number }> = new Map();
	private readonly _channelLastWidths: Map<number, number> = new Map();
	private readonly _channelLastCaps: Map<number, number> = new Map();
	private readonly _channelDbLabels: Map<number, HTMLSpanElement> = new Map();
	private readonly _channelDivs: Map<number, HTMLDivElement> = new Map();
	// Store instrument spans for live updates: key is "channelIndex-instrumentIndex"
	private readonly _instrumentSpans: Map<string, HTMLSpanElement> = new Map();
	// Per-channel pitch spectrum overlay canvases
	private readonly _channelSpectrumCanvases: Map<number, HTMLCanvasElement> = new Map();
	private readonly _channelSpectrumCanvas2ds: Map<number, CanvasRenderingContext2D | null> = new Map();
	private readonly _spectrumSmooth: Map<number, Float32Array> = new Map();
	private readonly _bgSpectrumSmooth: Map<number, Float32Array> = new Map();
	// Reusable FFT scratch buffers (avoid per-frame allocation across channels).
	private _fftScratch: Float32Array = new Float32Array(FFT_SIZE);
	private _magScratch: Float32Array = new Float32Array(FFT_SIZE / 2 + 1);
	// Reusable per-band work arrays (channels are processed sequentially per frame,
	// so a single set shared across channels avoids per-frame allocation).
	private readonly _bandMags: Float32Array = new Float32Array(FG_BANDS);
	private readonly _blurred: Float32Array = new Float32Array(FG_BANDS);
	private readonly _bgBandMags: Float32Array = new Float32Array(BG_BANDS);
	private readonly _bgBlurred: Float32Array = new Float32Array(BG_BANDS);
	// Cached per-channel overlay fill color. getComputedChannelColor calls
	// getComputedStyle 4x per call, which forces a style recalc; computing it
	// once per channel on render (and on theme change) removes that per-frame reflow.
	private readonly _channelSpectrumColors: Map<number, string> = new Map();
	// Cached per-channel canvas backing-store size in device pixels, refreshed by a
	// ResizeObserver so the animate loop never reads clientWidth/clientHeight
	// (which would force layout reflows interleaved with style writes).
	private readonly _canvasSizes: Map<number, { w: number; h: number }> = new Map();
	private _resizeObserver: ResizeObserver | null = null;
	private _dockClassObserver: MutationObserver | null = null;
	// Per-channel post-limiter peak (0..1), populated each frame from the
	// isolated ring. Read by the metering code (one frame of latency) so metering
	// needs no second FFT.
	private readonly _channelPeak: Map<number, number> = new Map();
	// Smoothed post-limiter master gain (masterGain^2 * volume * limiter) that the
	// per-channel ring omits. Smoothed per frame so the limiter's fast dynamics and
	// startup transient don't make the meters/spectrum jump; the underlying ring
	// already integrates over ~170ms so a slow gain factor is appropriate.
	private _smoothedMasterScale: number = 1;
	// FG band center frequencies (absolute Hz, independent of sample rate).
	private readonly _fgFreqs: number[] = ChannelVolumeVisualizerPrompt._initFgFreqs();
	private readonly _bgFreqs: number[] = ChannelVolumeVisualizerPrompt._initBgFreqs();

	private static _initFgFreqs(): number[] {
		const freqs: number[] = [];
		const noteStart = Math.round(12 * Math.log2(130 / 440) + 69);
		for (let b = 0; b < FG_BANDS; b++) {
			freqs.push(440 * 2 ** ((noteStart + b * 0.5 - 69) / 12));
		}
		return freqs;
	}
	private static _initBgFreqs(): number[] {
		const freqs: number[] = [];
		const noteStart = Math.round(12 * Math.log2(20 / 440) + 69);
		for (let b = 0; b < BG_BANDS; b++) {
			freqs.push(440 * 2 ** ((noteStart + b * 0.5 - 69) / 12));
		}
		return freqs;
	}

	private readonly _playPauseButton: HTMLButtonElement = button(
		{
			style: `font-size: ${Typography.sizeSm}; width: ${Sizing.button}; height: ${Sizing.button}; padding: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; line-height: 1;`,
		},
		"▶",
	);
	private readonly _tempoLabel: HTMLSpanElement = span(
		{
			style: `color: var(--secondary-text); font-size: ${Typography.sizeSm}; font-family: monospace; white-space: nowrap;`,
		},
		"",
	);

	private _historicVolumeCap: number = 0;
	private _historicTimer: number = 0;

	// Bar position label throttle (mirroring player-animator.ts BAR_LABEL_THROTTLE)
	private _barLabelCounter: number = 0;
	private _cachedDuration: number = -1;
	private _cachedBarCount: number = -1;
	private _cachedGeneration: number = -1;

	// Running averages for dB
	private _masterVolumeSum: number = 0;
	private _masterSampleCount: number = 0;
	private readonly _channelVolumeSums: Map<number, number> = new Map();
	private readonly _channelSampleCounts: Map<number, number> = new Map();
	private _masterMinDb: number = Infinity;
	private _masterMaxDb: number = -Infinity;
	private readonly _channelMinDb: Map<number, number> = new Map();
	private readonly _channelMaxDb: Map<number, number> = new Map();
	private readonly _masterDbPeakLabel: HTMLSpanElement = span(
		{
			style: `color: var(--primary-text); font-size: ${Typography.sizeSm}; font-family: monospace; white-space: nowrap;`,
		},
		"Peak: -inf dB",
	);
	private readonly _masterDbAvgLabel: HTMLSpanElement = span(
		{
			style: `color: var(--secondary-text); font-size: ${Typography.sizeSm}; font-family: monospace; white-space: nowrap;`,
		},
		"Avg: -inf dB",
	);
	private readonly _masterDbMinMaxLabel: HTMLSpanElement = span(
		{
			style: `color: var(--secondary-text); font-size: ${Typography.sizeSm}; font-family: monospace; white-space: nowrap;`,
		},
		"-inf/-inf dB",
	);

	private readonly _barPosLabel: HTMLSpanElement = span(
		{
			style: `color: var(--secondary-text); font-size: ${Typography.sizeSm}; font-family: monospace; white-space: nowrap;`,
		},
		"0:00 / 0:00  -  0/0",
	);

	// Piano key octave display — two rows of octave-spanning keys that
	// light up to the channel's 80x PMD color when pitches are active.
	private readonly _octaveRow0Svg: SVGSVGElement = svg({
		style: "width: calc(100% - 24px); height: 20px; display: block; margin: 2px 12px; overflow: visible; shape-rendering: crispEdges;",
		viewBox: "0 0 28 1",
		preserveAspectRatio: "none",
	});
	private readonly _octaveRow1Svg: SVGSVGElement = svg({
		style: "width: calc(100% - 24px); height: 20px; display: block; margin: 2px 12px; overflow: visible; shape-rendering: crispEdges;",
		viewBox: "0 0 28 1",
		preserveAspectRatio: "none",
	});
	private readonly _whiteKeyRects: Map<number, SVGRectElement> = new Map();
	private readonly _blackKeyRects: Map<number, SVGRectElement> = new Map();

	// Global spectrum bar pinned to the absolute bottom of the prompt.
	// Only visible when popped out; when docked the editor's main
	// spectrum is already visible.
	private readonly _cvSpectrum: spectrumCanvas = new spectrumCanvas(
		canvas({
			width: 384,
			height: 96,
			style: "display: none; position: absolute; bottom: 0; left: 0; width: 100%; height: 96px; pointer-events: none; z-index: 1; opacity: 0.12;",
		}),
		1,
		true,
	);

	public container: HTMLDivElement = div(
		{
			class: "prompt noSelection fill-y",
			style: "width: 720px; height: auto; max-height: 80vh; display: flex; flex-direction: column; position: relative;",
			tabindex: "0",
		},
		h2({ style: "margin: 12px 12px 0px 12px; text-align: center;" }, "Channel Volume Visualizer"),
		// Top bar — play/pause, volume meter, stats
		div(
			{
				style: "display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: nowrap; padding: 4px 12px 0px 12px;"
			},
			this._playPauseButton,
			this._barPosLabel,
			this._tempoLabel,
			span(
				{ style: `display: inline-flex; gap: 10px; flex-wrap: nowrap;` },
				this._masterDbPeakLabel,
				this._masterDbAvgLabel,
				this._masterDbMinMaxLabel,
			),
		),
		// Divider
		div({ style: "border-top: 2px solid var(--ui-widget-background); margin: 0 12px;" }),
		// Piano key octave rows
		this._octaveRow0Svg,
		this._octaveRow1Svg,
		// Channels grid
		this._channelsPane,
		// Spectrum bar
		this._cvSpectrum.canvas,
		this._cancelButton,
	);

	constructor(
		doc: SongDocument,
		private _songEditor: PromptEditorRefs,
	) {
		super(doc);
		this.buildTitlebar();
		this._animate = this._animate.bind(this);
		this._onDocChange = this._renderChannelList.bind(this);
		this._doc.notifier.watch(this._onDocChange);
		this._onThemeChange = this._refreshSpectrumColors.bind(this);
		events.listen("themeChange", this._onThemeChange);
		this._renderChannelList();
		this._buildPianoKeyRows();
		this._scheduleFrame();
		this._playPauseButton.addEventListener("click", this._togglePlayPause);
		setTimeout(() => this.container.focus());

		// Drag-and-drop file import for .json, .mid, .midi files.
		// Attach to the container so it works in both main-window and popped-out
		// documents (popout key events are routed separately via prompt-popout).
		const _onDragOver = (e: DragEvent) => {
			if (e.dataTransfer && e.dataTransfer.types.indexOf("Files") !== -1) {
				e.preventDefault();
			}
		};
		const _onDrop = (e: DragEvent) => {
			if (!e.dataTransfer) return;
			const files: FileList = e.dataTransfer.files;
			if (files.length === 0) return;
			const file: File = files[0];
			const name: string = file.name.toLowerCase();
			if (name.endsWith(".json") || name.endsWith(".mid") || name.endsWith(".midi")) {
				e.preventDefault();
				this._songEditor.handleImportFile(file);
			}
		};
		this.container.addEventListener("dragover", _onDragOver);
		this.container.addEventListener("drop", _onDrop);

		// Re-apply the channels pane scroll state when the dock toggles, since
		// docking happens after the last render and the pane style would
		// otherwise stay stale until the next doc change.
		this._dockClassObserver = new MutationObserver(() => {
			this._applyChannelsPaneScroll(this._channelDivs.size);
		});
		this._dockClassObserver.observe(this.container, { attributes: true, attributeFilter: ["class"] });
	}

	private _onThemeChange!: (name: string) => void;

	private _togglePlayPause = (): void => {
		if (this._doc.synth.playing) {
			this._doc.performance.pause();
		} else {
			this._doc.performance.play();
		}
		this._updatePlayPauseButton();
	};

	private _updatePlayPauseButton = (): void => {
		this._playPauseButton.textContent = this._doc.synth.playing ? "⏸" : "▶";
	};

	private _updateBarPosLabel(): void {
		const bar = Math.floor(this._doc.synth.playhead) + 1;
		const total = this._doc.song.barCount;
		const generation = this._doc.notifier.generation;
		if (this._cachedDuration < 0 || this._doc.song.barCount !== this._cachedBarCount || generation !== this._cachedGeneration) {
			const totalSamples = this._doc.synth.getTotalSamples(true, true, 0);
			this._cachedDuration = totalSamples > 0 ? totalSamples / this._doc.synth.samplesPerSecond : 0;
			this._cachedBarCount = this._doc.song.barCount;
			this._cachedGeneration = generation;
		}
		const elapsed = this._doc.synth.totalSamplesRendered / this._doc.synth.samplesPerSecond;
		const elapsedStr = formatTime(elapsed);
		const totalStr = formatTime(this._cachedDuration);
		this._barPosLabel.textContent = `${elapsedStr} / ${totalStr}  -  ${bar}/${total}`;
		this._barLabelCounter = 5;
	}

	public override whenKeyPressed = (event: KeyboardEvent): void => {
		if (event.key === " ") {
			event.preventDefault();
			this._togglePlayPause();
		} else if (event.key === "[") {
			event.preventDefault();
			this._doc.synth.goToPrevBar();
			this._updateBarPosLabel();
		} else if (event.key === "]") {
			event.preventDefault();
			this._doc.synth.goToNextBar();
			this._updateBarPosLabel();
		}
	};

	protected override _saveChanges(): void {
		// No changes to save
	}

	public override cleanUp = (): void => {
		super.cleanUp();
		this._doc.notifier.unwatch(this._onDocChange);
		events.unlisten("themeChange", this._onThemeChange);
		if (this._resizeObserver != null) {
			this._resizeObserver.disconnect();
			this._resizeObserver = null;
		}
		if (this._dockClassObserver != null) {
			this._dockClassObserver.disconnect();
			this._dockClassObserver = null;
		}
		if (this._animationId !== 0) {
			try {
				this._rafWin.cancelAnimationFrame(this._animationId);
			} catch {
				// The rAF window may already be closed (popout X-button close path);
				// a closed window auto-cancels its pending rAF callbacks on close.
			}
			this._animationId = 0;
		}
		while (this._contentContainer.firstChild !== null) {
			this._contentContainer.removeChild(this._contentContainer.firstChild);
		}
		this._channelVolumeBars.clear();
		this._channelVolumeCaps.clear();
		this._channelHistoricCaps.clear();
		this._channelLastWidths.clear();
		this._channelLastCaps.clear();
		this._channelDbLabels.clear();
		this._channelDivs.clear();
		this._instrumentSpans.clear();
		this._channelSpectrumColors.clear();
		this._canvasSizes.clear();
		this._channelPeak.clear();
		this._whiteKeyRects.clear();
		this._blackKeyRects.clear();
		this._playPauseButton.removeEventListener("click", this._togglePlayPause);
		this._songEditor.muteEditor.setHoveredChannel(-1);
		this._songEditor.trackEditor.setHoveredChannel(-1);
		// Invalidate cached bounding rects in other components
		// Use setTimeout to ensure DOM has settled after prompt removal
		setTimeout(() => {
			window.dispatchEvent(new Event("resize"));
			window.dispatchEvent(new Event("scroll"));
		}, 0);
	};

	private _onDocChange!: () => void;

	// Recompute cached per-channel overlay colors. Called on render and on
	// themeChange. getComputedChannelColor forces 4 getComputedStyle calls, so
	// this must stay out of the per-frame animate loop.
	private _refreshSpectrumColors(): void {
		const song = this._doc.song;
		for (const channelIndex of this._channelSpectrumCanvases.keys()) {
			this._channelSpectrumColors.set(channelIndex, ColorConfig.getComputedChannelColor(song, channelIndex).primaryChannel);
		}
	}

	// Post-limiter per-channel peak: max |sample| of the channel's isolated
	// ring buffer (true amplitude, no differential clamp) over the ~170ms window,
	// scaled by the master gain the ring omits (masterGain^2 * volume * limiter).
	// Same metric as the master meter (song.outVolumeCap) and the limiter prompt, so
	// per-channel peak/avg/min/max dB are consistent with the master.
	private _computeChannelPeak(channelState: ChannelState, masterScale: number): number {
		const fftSize = FFT_SIZE;
		const ring = channelState.audioRing;
		const ringPos = channelState.audioRingPos;
		let peak = 0;
		for (let i = 0; i < fftSize; i++) {
			const s = ring[(ringPos + i) & (fftSize - 1)];
			const a = s < 0 ? -s : s;
			if (a > peak) peak = a;
		}
		return Math.min(1, peak * masterScale);
	}

	// Build the two piano-key octave rows. Row 0: octaves 0–3. Row 1: octaves 4–7.
	// Each key is an SVG rect; references are stored in _whiteKeyRects / _blackKeyRects
	// keyed by MIDI pitch for per-frame active-pitch updates.
	private _buildPianoKeyRows(): void {
		const WHITE_IDX = new Map<number, number>([
			[0, 0], [2, 1], [4, 2], [5, 3], [7, 4], [9, 5], [11, 6],
		]);
		const BLACK_X: Record<number, number> = { 1: 0.2, 3: 1.2, 6: 3.2, 8: 4.2, 10: 5.2 };
		const BLACK_KEY_W = 0.6;
		const BLACK_KEY_H = 0.6;

		const buildRow = (
			svgEl: SVGSVGElement,
			startOctave: number,
			endOctave: number,
			viewBaseOctave: number,
		): void => {
			for (let oct = startOctave; oct <= endOctave; oct++) {
				const octX = (oct - viewBaseOctave) * 7;
				// White keys
				for (const [note, idx] of WHITE_IDX) {
					const pitch = (oct + 1) * 12 + note;
					const r = rect({
						x: String(octX + idx),
						y: "0",
						width: "1",
						height: "1",
						fill: "var(--pitch-background)",
						opacity: "1",
					});
					svgEl.appendChild(r);
					this._whiteKeyRects.set(pitch, r);
				}
				// Black keys
				for (const noteStr of Object.keys(BLACK_X)) {
					const note = parseInt(noteStr, 10);
					const pitch = (oct + 1) * 12 + note;
					const r = rect({
						x: String(octX + BLACK_X[note]),
						y: "0",
						width: String(BLACK_KEY_W),
						height: String(BLACK_KEY_H),
						fill: "var(--base02-surface)",
						opacity: "1",
					});
					svgEl.appendChild(r);
					this._blackKeyRects.set(pitch, r);
				}
			}
		};

		buildRow(this._octaveRow0Svg, 0, 3, 0);
		buildRow(this._octaveRow1Svg, 4, 7, 4);
	}

	// Schedule the next animate frame on whichever window currently hosts the
	// container. ownerDocument.defaultView is the popout window when the container
	// has been adopted into it, otherwise the main window. Falling back to the
	// main window covers the close path where the container may be momentarily
	// detached. Tracking _rafWin lets cleanUp cancel on the same window.
	private _scheduleFrame(): void {
		this._rafWin = (this.container.ownerDocument.defaultView as Window | null) ?? window;
		this._animationId = this._rafWin.requestAnimationFrame(this._animate);
	}

	private _animate = (): void => {
		// Show spectrum only when popped out; when docked the editor's
		// main spectrum already fills the viewport.
		this._cvSpectrum.canvas.style.display =
			this.container.ownerDocument.defaultView !== window ? "block" : "none";

		// Update play/pause button state
		this._updatePlayPauseButton();

		// Update bar position label with elapsed time (throttled).
		this._barLabelCounter--;
		if (this._barLabelCounter <= 0) {
			this._updateBarPosLabel();
		}

		// Update tempo label
		this._tempoLabel.textContent = `BPM: ${this._doc.song.tempo}`;

		// Master volume from the post-limiter sample peak (song.outVolumeCap), the
		// same source as the limiter prompt's Out meter and the editor's main meter.
		// Peak (not RMS) so it reacts to kicks/transients and matches the actual
		// output sample level.
		const masterLevel = this._doc.song.outVolumeCap;

		// Track historic peak for dB stats
		this._historicTimer--;
		if (this._historicTimer <= 0) {
			this._historicVolumeCap -= 0.03;
		}
		if (masterLevel > this._historicVolumeCap) {
			this._historicVolumeCap = masterLevel;
			this._historicTimer = 50;
		}

		// Update master dB labels (dBFS peak: full-scale = 0 dB)
		const masterPeakDb = this._historicVolumeCap > 0 ? 20 * Math.log10(this._historicVolumeCap) : -Infinity;
		this._masterDbPeakLabel.textContent = Number.isFinite(masterPeakDb) ? `Peak: ${masterPeakDb.toFixed(1)} dB` : "Peak: -inf dB";

		// Update average, min, max
		if (masterLevel > 0) {
			this._masterVolumeSum += masterLevel;
			this._masterSampleCount++;

			const currentDb = 20 * Math.log10(masterLevel);
			if (Number.isFinite(currentDb)) {
				if (currentDb < this._masterMinDb) this._masterMinDb = currentDb;
				if (currentDb > this._masterMaxDb) this._masterMaxDb = currentDb;
			}
		}
		if (this._masterSampleCount > 0) {
			const avg = this._masterVolumeSum / this._masterSampleCount;
			const avgDb = avg > 0 ? 20 * Math.log10(avg) : -Infinity;
			this._masterDbAvgLabel.textContent = Number.isFinite(avgDb) ? `Avg: ${avgDb.toFixed(1)} dB` : "Avg: -inf dB";

			const minDb = Number.isFinite(this._masterMinDb) ? this._masterMinDb.toFixed(1) : "-inf";
			const maxDb = Number.isFinite(this._masterMaxDb) ? this._masterMaxDb.toFixed(1) : "-inf";
			this._masterDbMinMaxLabel.textContent = `${minDb}/${maxDb} dB`;
		}

		// Update per-channel volume bars
		const synth = this._doc.synth;
		// Smooth the post-limiter master gain the per-channel ring omits, so the
		// per-channel meters and spectrum reflect the output-bus level. Smoothed to
		// tame the limiter's fast per-sample dynamics.
		const targetScale = synth.getMasterScale();
		this._smoothedMasterScale += (targetScale - this._smoothedMasterScale) * 0.3;
		for (const [channelIndex, bar] of this._channelVolumeBars) {
			const channelState = synth.channels[channelIndex];
			if (!channelState) continue;

			// Per-channel perceived loudness (C-weighted RMS of the isolated ring,
			// scaled by the post-limiter master gain), normalized so a full-scale
			// 1 kHz sine fills the bar. Reads last frame's value (populated in the
			// spectrum FFT pass) to avoid a second FFT.
			const channelLevel = this._channelPeak.get(channelIndex) ?? 0;

			let historic = this._channelHistoricCaps.get(channelIndex);
			if (!historic) {
				historic = { cap: 0, timer: 0 };
				this._channelHistoricCaps.set(channelIndex, historic);
			}

			historic.timer--;
			if (historic.timer <= 0) {
				historic.cap -= 0.03;
			}
			if (channelLevel > historic.cap) {
				historic.cap = channelLevel;
				historic.timer = 50;
			}

			// Floor at 1px so tiles are sized identically before first playback.
			const chWidth = channelLevel > 0 ? Math.min(144, channelLevel * 144) : 1;
			const chCapX = 8 + Math.min(144, historic.cap * 144);
			const lastWidth = this._channelLastWidths.get(channelIndex) ?? -1;
			const lastCap = this._channelLastCaps.get(channelIndex) ?? -1;
			if (chWidth !== lastWidth) {
				this._channelLastWidths.set(channelIndex, chWidth);
				bar.setAttribute("width", `${chWidth}`);
			}
			const capEl = this._channelVolumeCaps.get(channelIndex);
			if (capEl && chCapX !== lastCap) {
				this._channelLastCaps.set(channelIndex, chCapX);
				capEl.setAttribute("x", `${chCapX}`);
			}

			// Update average and range for channel (dBFS(A))
			if (channelLevel > 0) {
				const sum = (this._channelVolumeSums.get(channelIndex) ?? 0) + channelLevel;
				const count = (this._channelSampleCounts.get(channelIndex) ?? 0) + 1;
				this._channelVolumeSums.set(channelIndex, sum);
				this._channelSampleCounts.set(channelIndex, count);

				const currentDb = 20 * Math.log10(channelLevel);
				if (Number.isFinite(currentDb)) {
					const minDb = this._channelMinDb.get(channelIndex) ?? Infinity;
					const maxDb = this._channelMaxDb.get(channelIndex) ?? -Infinity;
					if (currentDb < minDb) this._channelMinDb.set(channelIndex, currentDb);
					if (currentDb > maxDb) this._channelMaxDb.set(channelIndex, currentDb);
				}
			}

			// Update channel dB label with peak, avg, and range
			const dbLabel = this._channelDbLabels.get(channelIndex);
			if (dbLabel) {
				const peakDb = historic.cap > 0 ? 20 * Math.log10(historic.cap) : -Infinity;
				const sampleCount = this._channelSampleCounts.get(channelIndex) ?? 0;
				const avg = sampleCount > 0 ? (this._channelVolumeSums.get(channelIndex) ?? 0) / sampleCount : -Infinity;
				const avgDb = avg > 0 ? 20 * Math.log10(avg) : -Infinity;
				const minDb = this._channelMinDb.get(channelIndex) ?? Infinity;
				const maxDb = this._channelMaxDb.get(channelIndex) ?? -Infinity;
				const avgText = Number.isFinite(avgDb) ? avgDb.toFixed(1) : "-inf";
				const minText = Number.isFinite(minDb) ? minDb.toFixed(1) : "-inf";
				const maxText = Number.isFinite(maxDb) ? maxDb.toFixed(1) : "-inf";
				dbLabel.textContent = Number.isFinite(peakDb) ? `Pk:${peakDb.toFixed(1)}\nA:${avgText}\n${minText}/${maxText}` : `Pk:-inf\nA:${avgText}\n${minText}/${maxText}`;
			}

			// Draw pitch spectrum overlay: smooth bezier curve fill from active tone bands
			const spectrumCtx = this._channelSpectrumCanvas2ds.get(channelIndex);
			if (spectrumCtx) {
				const cvs = this._channelSpectrumCanvases.get(channelIndex);
				// Backing-store size comes from the ResizeObserver cache, not a per-frame
				// clientWidth/clientHeight read (which would force a layout reflow).
				const size = this._canvasSizes.get(channelIndex);
				if (cvs && size && size.w > 0 && size.h > 0) {
					if (cvs.width !== size.w || cvs.height !== size.h) {
						cvs.width = size.w;
						cvs.height = size.h;
					}

					const w = cvs.width;
					const h = cvs.height;
					spectrumCtx.clearRect(0, 0, w, h);

					// Real audio FFT from per-channel ring buffer. Pipeline mirrors the
					// main FG spectrum (shared/spectrum.ts): Hann window, magnitude per
					// bin, quadratic-interpolated log bands, spectral-tilt gain, gaussian
					// blur, temporal smoothing, single fixed-ref soft-compression. The
					// per-channel ring holds the channel's own isolated diff at true
					// amplitude, so no extra gain is applied.
					const fftSize = FFT_SIZE;
					const fftBuf = this._fftScratch;
					const mags = this._magScratch;
					const ring = channelState.audioRing;
					const ringPos = channelState.audioRingPos;
					for (let i = 0; i < fftSize; i++) {
						const idx = (ringPos + i) & (fftSize - 1);
						const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
						fftBuf[i] = ring[idx] * hann;
					}
					forwardRealFourierTransform(fftBuf);

					const halfN = fftSize >> 1;
					const sampleRate = this._doc.synth.samplesPerSecond || 48000;
					const binFreq = sampleRate / fftSize;
					for (let k = 0; k <= halfN; k++) {
						const re = fftBuf[k];
						const im = k === 0 || k === halfN ? 0 : fftBuf[fftSize - k];
						mags[k] = Math.sqrt(re * re + im * im) / fftSize;
					}

					// Per-channel post-limiter peak for the meter, computed from the isolated
					// ring (no second FFT needed; the ring is read directly). Stored for the
					// metering pass (one frame latency).
					this._channelPeak.set(channelIndex, this._computeChannelPeak(channelState, this._smoothedMasterScale));

					// Interpolate FG bands from FFT bins (quadratic for sensitivity).
					const bandMags = this._bandMags;
					for (let b = 0; b < FG_BANDS; b++) {
						const kFloat = this._fgFreqs[b] / binFreq;
						const k = Math.floor(kFloat);
						const frac = kFloat - k;
						if (k < 1 || k >= halfN) {
							const kHi = Math.min(k + 1, halfN);
							bandMags[b] = mags[k] + (mags[kHi] - mags[k]) * frac;
						} else {
							const ym1 = mags[k - 1],
								y0 = mags[k],
								yp1 = mags[k + 1];
							const qa = (ym1 + yp1) * 0.5 - y0;
							const qb = (yp1 - ym1) * 0.5;
							const qc = y0;
							bandMags[b] = qa * frac * frac + qb * frac + qc;
						}
					}
					// Per-band gain: ramp 0.5x (low) to 2x (high) to compensate spectral tilt.
					const fgGainStep = 1.5 / (FG_BANDS - 1);
					for (let b = 0; b < FG_BANDS; b++) {
						bandMags[b] *= 0.5 + b * fgGainStep;
					}
					// Light gaussian spatial blur (sigma=3 bands) to suppress peak jitter.
					// Truncated precomputed kernel (BLUR_KERNEL, +-BLUR_RADIUS) makes this
					// O(FG_BANDS * kernelWidth) instead of O(FG_BANDS^2). Output written to a
					// separate array so the convolution reads original values, not in-place writes.
					const blurred = this._blurred;
					const kernel = BLUR_KERNEL;
					for (let b = 0; b < FG_BANDS; b++) {
						let sum = 0;
						let wSum = 0;
						const n0 = Math.max(0, b - BLUR_RADIUS);
						const n1 = Math.min(FG_BANDS - 1, b + BLUR_RADIUS);
						for (let n = n0; n <= n1; n++) {
							const wt = kernel[BLUR_RADIUS + (n - b)];
							sum += bandMags[n] * wt;
							wSum += wt;
						}
						blurred[b] = wSum > 0.001 ? sum / wSum : 0;
					}
					for (let b = 0; b < FG_BANDS; b++) bandMags[b] = blurred[b];

					// Temporal smoothing: instant attack, 0.55/0.45 decay (matches main FG).
					let smooth = this._spectrumSmooth.get(channelIndex);
					if (!smooth || smooth.length !== FG_BANDS) {
						smooth = new Float32Array(FG_BANDS);
						this._spectrumSmooth.set(channelIndex, smooth);
					}
					for (let b = 0; b < FG_BANDS; b++) {
						if (bandMags[b] > smooth[b]) {
							smooth[b] = bandMags[b];
						} else {
							smooth[b] = smooth[b] * 0.55 + bandMags[b] * 0.45;
						}
					}

					// Interpolate BG bands from same FFT bins.
					const bgBandMags = this._bgBandMags;
					for (let b = 0; b < BG_BANDS; b++) {
						const kFloat = this._bgFreqs[b] / binFreq;
						const k = Math.floor(kFloat);
						const frac = kFloat - k;
						if (k < 1 || k >= halfN) {
							const kHi = Math.min(k + 1, halfN);
							bgBandMags[b] = mags[k] + (mags[kHi] - mags[k]) * frac;
						} else {
							const ym1 = mags[k - 1],
								y0 = mags[k],
								yp1 = mags[k + 1];
							const qa = (ym1 + yp1) * 0.5 - y0;
							const qb = (yp1 - ym1) * 0.5;
							const qc = y0;
							bgBandMags[b] = qa * frac * frac + qb * frac + qc;
						}
					}
					// BG spectral tilt: 0.25x at 20Hz to 0.5x at 130Hz (matches FG's
					// 0.5x floor at the transition, preventing BG from looking amp'd).
					const bgGainStep = 0.25 / (BG_BANDS - 1);
					for (let b = 0; b < BG_BANDS; b++) {
						bgBandMags[b] *= 0.25 + b * bgGainStep;
					}
					// BG light gaussian blur (sigma=2 bands)
					{
						const bgBlurred = this._bgBlurred;
						for (let b = 0; b < BG_BANDS; b++) {
							let sum = 0,
								wSum = 0;
							for (let n = 0; n < BG_BANDS; n++) {
								const d = n - b;
								const w = Math.exp((-0.5 * d * d) / 4);
								sum += bgBandMags[n] * w;
								wSum += w;
							}
							bgBlurred[b] = wSum > 0.001 ? sum / wSum : 0;
						}
						for (let b = 0; b < BG_BANDS; b++) bgBandMags[b] = bgBlurred[b];
					}
					// BG temporal smoothing: instant attack, faster decay (matches main BG).
					let bgSmooth = this._bgSpectrumSmooth.get(channelIndex);
					if (!bgSmooth || bgSmooth.length !== BG_BANDS) {
						bgSmooth = new Float32Array(BG_BANDS);
						this._bgSpectrumSmooth.set(channelIndex, bgSmooth);
					}
					for (let b = 0; b < BG_BANDS; b++) {
						if (bgBandMags[b] > bgSmooth[b]) {
							bgSmooth[b] = bgBandMags[b];
						} else {
							bgSmooth[b] = bgSmooth[b] * 0.31 + bgBandMags[b] * 0.69;
						}
					}

					// Draw rounded-bottom-up bars: aggregate the FG bands into BAR_COUNT bars,
					// each a rounded-top rectangle filled from the card bottom. A continuous
					// wave is unreadable on the narrow 1:1 cards.
					const col = this._channelSpectrumColors.get(channelIndex);
					if (col) {
						const gap = Math.max(1, window.devicePixelRatio || 1);
						const barOuter = w / BAR_COUNT;
						const barW = barOuter - gap;
						const radius = Math.min(barW * 0.5, h * 0.12);

						// Helper to draw one layer of 16 bars from band magnitudes.
						spectrumCtx.fillStyle = col;
						const drawBars = (bandCount: number, mags: Float32Array, ref: number, alpha: number): void => {
							const bandsPerBar = bandCount / BAR_COUNT;
							spectrumCtx.globalAlpha = alpha;
							spectrumCtx.beginPath();
							for (let bar = 0; bar < BAR_COUNT; bar++) {
								const s0 = Math.floor(bar * bandsPerBar);
								const s1 = Math.min(bandCount, Math.floor((bar + 1) * bandsPerBar));
								let peak = 0;
								for (let b = s0; b < s1; b++) if (mags[b] > peak) peak = mags[b];
								const v = peak * this._smoothedMasterScale * SPECTRUM_DISPLAY_GAIN;
								const norm = Math.min(1, (2 * v) / (v + ref));
								const barH = norm * h;
								if (barH < 0.5) continue;
								const x = bar * barOuter + gap * 0.5;
								const y = h - barH;
								const r = Math.min(radius, barH * 0.5);
								spectrumCtx.moveTo(x, h);
								spectrumCtx.lineTo(x, y + r);
								spectrumCtx.quadraticCurveTo(x, y, x + r, y);
								spectrumCtx.lineTo(x + barW - r, y);
								spectrumCtx.quadraticCurveTo(x + barW, y, x + barW, y + r);
								spectrumCtx.lineTo(x + barW, h);
							}
							spectrumCtx.fill();
						};

						// BG layer (low frequencies) drawn first
						drawBars(BG_BANDS, bgSmooth, FG_REF, 0.24);
						// FG layer (mid-high frequencies) drawn on top
						drawBars(FG_BANDS, smooth, FG_REF, 0.48);
						spectrumCtx.globalAlpha = 1.0;
					}
				}
			}

			// Update dim state: dim if P0
			const channelDiv = this._channelDivs.get(channelIndex);
			if (channelDiv) {
				const songChannel = this._doc.song.channels[channelIndex];
				if (songChannel) {
					const currentBarAnim = Math.floor(this._doc.synth.playhead);
					const hasPat = songChannel.bars[currentBarAnim] > 0;
					channelDiv.style.opacity = hasPat ? "1" : "0.5";
				}
			}

			// Update instrument highlights
			const channel = this._doc.song.channels[channelIndex];
			if (channel) {
				const chanPeak = this._channelPeak.get(channelIndex) ?? 0;
				const v = chanPeak * 3.16;
				const peakScaled = (2 * v) / (v + 1.0);
				const volBrightness = 0.3 + Math.min(1, peakScaled) * 0.7;

				for (const [key, instrSpan] of this._instrumentSpans) {
					if (key.startsWith(`${channelIndex}-`)) {
						const j = parseInt(key.split("-")[1], 10);
						const instrState = channelState.instruments[j];
						if (instrState && instrSpan) {
							const isPlaying =
								(instrState.activeTones.count() > 0 || instrState.liveInputTones.count() > 0) && chanPeak > 0.001;
							if (isPlaying) {
								// Blend from channel color to white as volume rises,
								// with opacity fading in from the floor for a smooth ramp.
								const hex = this._channelSpectrumColors.get(channelIndex) ?? "#888";
								const r = parseInt(hex.length >= 7 ? hex.slice(1, 3) : hex.slice(1, 2) + hex.slice(1, 2), 16);
								const g = parseInt(hex.length >= 7 ? hex.slice(3, 5) : hex.slice(2, 3) + hex.slice(2, 3), 16);
								const b = parseInt(hex.length >= 7 ? hex.slice(5, 7) : hex.slice(3, 4) + hex.slice(3, 4), 16);
								const t = Math.min(1, Math.max(0, (volBrightness - 0.3) / 0.7));
								const br = Math.round(r + (255 - r) * t);
								const bg = Math.round(g + (255 - g) * t);
								const bb = Math.round(b + (255 - b) * t);
								instrSpan.style.background = `rgb(${br},${bg},${bb})`;
								instrSpan.style.color = t > 0.5 ? "black" : "var(--editor-background)";
								instrSpan.style.opacity = String(volBrightness);
							} else {
								instrSpan.style.background = "var(--ui-widget-background)";
								instrSpan.style.color = this._channelSpectrumColors.get(channelIndex) ?? "var(--primary-text)";
								instrSpan.style.opacity = "0.5";
							}
						}
					}
				}

			}
		}

		// Update piano key octave display — alpha peak curve with
		// weighted-RGB channel color mixing when multiple channels
		// play the same pitch.
		{
			const pitchBlend = new Map<number, { r: number; g: number; b: number; w: number; maxPeak: number }>();

			for (let ci = 0; ci < synth.channels.length; ci++) {
				const cs = synth.channels[ci];
				if (!cs) continue;
				const peak = this._channelPeak.get(ci) ?? 0;
				if (peak <= 0.001) continue;

				const hex = this._channelSpectrumColors.get(ci);
				if (!hex) continue;
				const cr = parseInt(hex.length >= 7 ? hex.slice(1, 3) : hex.slice(1, 2) + hex.slice(1, 2), 16);
				const cg = parseInt(hex.length >= 7 ? hex.slice(3, 5) : hex.slice(2, 3) + hex.slice(2, 3), 16);
				const cb = parseInt(hex.length >= 7 ? hex.slice(5, 7) : hex.slice(3, 4) + hex.slice(3, 4), 16);

				const collectPitches = (pitches: number[], count: number): void => {
					for (let pi = 0; pi < count; pi++) {
						const p = pitches[pi];
						let b = pitchBlend.get(p);
						if (!b) { b = { r: 0, g: 0, b: 0, w: 0, maxPeak: 0 }; pitchBlend.set(p, b); }
						b.r += cr * peak;
						b.g += cg * peak;
						b.b += cb * peak;
						b.w += peak;
						if (peak > b.maxPeak) b.maxPeak = peak;
					}
				};

				for (const inst of cs.instruments) {
					for (let ti = 0; ti < inst.activeTones.count(); ti++) {
						const tone = inst.activeTones.get(ti);
						collectPitches(tone.pitches, tone.pitchCount);
					}
					for (let li = 0; li < inst.liveInputTones.count(); li++) {
						const tone = inst.liveInputTones.get(li);
						collectPitches(tone.pitches, tone.pitchCount);
					}
				}
			}

			const updateKeys = (rects: Map<number, SVGRectElement>, defaultFill: string): void => {
				for (const [pitch, rect] of rects) {
					const b = pitchBlend.get(pitch);
					if (b && b.w > 0) {
						const rr = Math.round(b.r / b.w);
						const gg = Math.round(b.g / b.w);
						const bb = Math.round(b.b / b.w);
						rect.setAttribute("fill", `rgb(${rr},${gg},${bb})`);
						const v = b.maxPeak * 3.16;
						const peakScaled = (2 * v) / (v + 1.0);
						const alpha = 0.3 + Math.min(1, peakScaled) * 0.7;
						rect.setAttribute("opacity", String(alpha));
					} else {
						rect.setAttribute("fill", defaultFill);
						rect.setAttribute("opacity", "1");
					}
				}
			};

			updateKeys(this._whiteKeyRects, "var(--pitch-background)");
			updateKeys(this._blackKeyRects, "var(--base02-surface)");
		}

		this._scheduleFrame();
	};

	private _renderChannelList = (): void => {
		while (this._contentContainer.firstChild) {
			this._contentContainer.removeChild(this._contentContainer.firstChild);
		}
		this._channelVolumeBars.clear();
		this._channelVolumeCaps.clear();
		this._channelLastWidths.clear();
		this._channelLastCaps.clear();
		this._channelDbLabels.clear();
		this._channelDivs.clear();
		this._channelSpectrumCanvases.clear();
		this._channelSpectrumCanvas2ds.clear();
		this._spectrumSmooth.clear();
		this._channelSpectrumColors.clear();
		this._canvasSizes.clear();
		this._channelPeak.clear();

		// Invalidate duration cache so the bar position label reflects the
		// newly imported song's bar count and duration.
		this._cachedDuration = -1;
		this._cachedBarCount = -1;

		const song = this._doc.song;
		const synth = this._doc.synth;
		const channelCount = song.getChannelCount();

		if (channelCount === 0) {
			this._contentContainer.appendChild(
				div(
					{
						style: "color: var(--secondary-text); text-align: center; padding: 20px;",
					},
					"No channels in this song.",
				),
			);
			return;
		}

		for (let i = 0; i < channelCount; i++) {
			const channel = song.channels[i];
			const channelState = synth.channels[i];
			if (!channel) continue;

			const isMuted = channel.muted;
			const isModChannel = i >= song.pitchChannelCount + song.noiseChannelCount;
			if (isModChannel) continue; // Skip mod channels

			const isDrumChannel = i >= song.pitchChannelCount;

			const channelName = channel.name || `${i + 1}`;
			const channelType = isDrumChannel ? "Drum" : "Pitch";
			const channelColors = ColorConfig.getChannelColor(song, i);

			// Check if channel has pattern or sound (only dim during playback)
			const currentBar = Math.floor(this._doc.synth.playhead);
			const patternIndex = channel.bars[currentBar];
			const hasPattern = patternIndex > 0;
			const isPlaying = this._doc.synth.playing;
			const isDimmed = isPlaying && !hasPattern;

			// Volume bar for this channel
			const volBar = rect({
				"pointer-events": "none",
				height: "40%",
				width: 1,
				x: 8,
				y: "30%",
				fill: channelColors.primaryChannel,
			});
			const volCap = rect({
				"pointer-events": "none",
				width: BorderWidth.default,
				height: "40%",
				x: "5%",
				y: "30%",
				fill: channelColors.primaryNote,
			});

			this._channelVolumeBars.set(i, volBar);
			this._channelVolumeCaps.set(i, volCap);

			const dbLabel = span(
				{
					style: `color: ${channelColors.primaryChannel}; opacity: 0.8; font-size: 10px; font-weight: 600; font-family: monospace; text-align: center; display: block; white-space: pre-line;`,
				},
				"Pk:-inf\nA:-inf\n-inf/-inf",
			);
			this._channelDbLabels.set(i, dbLabel);

			const volBarContainer = svg(
				{
					style: "touch-action: none; overflow: visible;",
					width: "100%",
					height: "12px",
					preserveAspectRatio: "none",
					viewBox: "0 0 160 12",
				},
				rect({
					"pointer-events": "none",
					width: "90%",
					height: "40%",
					x: "5%",
					y: "30%",
					fill: "var(--ui-widget-background, #444)",
				}),
				volBar,
				volCap,
			);

			const channelDiv = div({
				style: `display: flex; flex-direction: column; padding: 4px 8px; min-width: 0; overflow: hidden; position: relative; border: 2px solid ${
					isMuted ? "var(--mute-button-normal)" : channelColors.primaryChannel
				}; border-radius: var(--border-radius-medium); background: var(--editor-background); cursor: pointer; ${isMuted ? "opacity: 0.5;" : ""} ${isDimmed ? "opacity: 0.5;" : ""}`,
			});
			this._channelDivs.set(i, channelDiv);

			channelDiv.addEventListener("mouseenter", () => {
				this._songEditor.muteEditor.setHoveredChannel(i);
				this._songEditor.trackEditor.setHoveredChannel(i);
			});
			channelDiv.addEventListener("mouseleave", () => {
				this._songEditor.muteEditor.setHoveredChannel(-1);
				this._songEditor.trackEditor.setHoveredChannel(-1);
			});
			channelDiv.addEventListener("click", () => {
				this._doc.channel = i;
				this._doc.notifier.changed();
			});

			const headerDiv = div({
				style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; min-width: 0; overflow: hidden;",
			});

			headerDiv.appendChild(
				span(
					{
						style: `font-weight: bold; color: ${channelColors.primaryChannel}; font-size: ${Typography.sizeSm}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 1; min-width: 0;`,
					},
					channelName,
				),
			);

			headerDiv.appendChild(
				span(
					{
						style: `font-size: 10px; font-weight: 600; color: ${channelColors.primaryChannel}; opacity: 0.7;`,
					},
					channelType,
				),
			);

			// Show active pattern if playing
			if (patternIndex > 0) {
				headerDiv.appendChild(
					span(
						{
							style: `font-size: 10px; font-weight: 600; color: ${channelColors.primaryNote}; margin-left: 4px;`,
						},
						`P${patternIndex}`,
					),
				);
			}

			const contentWrap = div({ style: "display: flex; flex-direction: column; flex: 1; min-height: 0; position: relative; z-index: 1;" });
			channelDiv.appendChild(contentWrap);
			contentWrap.appendChild(headerDiv);
			contentWrap.appendChild(volBarContainer);
			contentWrap.appendChild(dbLabel);

			// Pitch spectrum overlay canvas (z-index: 0 paints after parent bg, before contentWrap at z-index 1)
			const spectrumCanvas = document.createElement("canvas");
			spectrumCanvas.width = 128;
			spectrumCanvas.height = 16;
			spectrumCanvas.style.cssText = "position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; border-radius: inherit;";
			channelDiv.insertBefore(spectrumCanvas, contentWrap);
			this._channelSpectrumCanvases.set(i, spectrumCanvas);
			this._channelSpectrumCanvas2ds.set(i, spectrumCanvas.getContext("2d"));
			this._channelSpectrumColors.set(i, ColorConfig.getComputedChannelColor(song, i).primaryChannel);

			// Show instruments
			if (channel.instruments.length > 0) {
				const instrDiv = div({
					style: "display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; justify-content: center;",
				});

				// Get instruments in current pattern for highlighting
				const pattern = hasPattern ? song.getPattern(i, currentBar) : null;
				const patternInstruments = pattern ? pattern.instruments : [];

				// Count duplicate type names to append disambiguation suffixes
				const typeCounts: Map<string, number> = new Map();
				for (let j = 0; j < channel.instruments.length; j++) {
					const instrument = channel.instruments[j];
					const typeName = instrument ? getInstrumentDisplayName(instrument) : "?";
					typeCounts.set(typeName, (typeCounts.get(typeName) || 0) + 1);
				}

				const currentCounts: Map<string, number> = new Map();
				for (let j = 0; j < channel.instruments.length; j++) {
					const inPattern = patternInstruments.includes(j);
					const instrState = channelState ? channelState.instruments[j] : null;
					const isPlaying = instrState
						? instrState.activeTones.count() > 0 || instrState.liveInputTones.count() > 0
						: false;
					const instrument = channel.instruments[j];
					const typeName = instrument ? getInstrumentDisplayName(instrument) : "?";
					const total = typeCounts.get(typeName) || 1;
					const nth = (currentCounts.get(typeName) || 0) + 1;
					currentCounts.set(typeName, nth);
					const instrName = total > 1 ? `${typeName} ${nth}` : typeName;
					const instrSpan = span(
						{
							style: `font-size: 10px; font-weight: 600; padding: 1px 4px; border-radius: var(--border-radius-medium); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: ${
								isPlaying ? "white" : inPattern ? channelColors.primaryChannel : "var(--ui-widget-background)"
							}; color: ${isPlaying ? "black" : inPattern ? "var(--editor-background)" : channelColors.primaryChannel}; opacity: ${
								inPattern || isPlaying ? "1" : "0.5"
							};`,
						},
						instrName,
					);
					this._instrumentSpans.set(`${i}-${j}`, instrSpan);
					instrDiv.appendChild(instrSpan);
				}
				contentWrap.appendChild(instrDiv);
			}

			this._contentContainer.appendChild(channelDiv);
		}

		if (channelCount > 28) {
			this._applyChannelsPaneScroll(channelCount);
		}

		// Observe the grid container so per-channel canvas backing-store sizes are
		// refreshed on layout changes without any per-frame clientWidth reads.
		this._setupResizeObserver();
	};

	private _applyChannelsPaneScroll(channelCount: number): void {
		// In popout mode, always enable scrolling regardless of channel count
		// so the pane fills the bounded popout panel height. When docked, rely
		// on the flex slot height; otherwise cap at 600px for the main-window
		// modal (past 28 channels the grid overflows the viewport).
		const isPopout = this.container.hasAttribute("data-popout");
		if (isPopout) {
			this._channelsPane.style.display = "flex";
			this._channelsPane.style.flex = "1";
			this._channelsPane.style.overflowY = "auto";
			this._channelsPane.style.minHeight = "0";
			this._channelsPane.style.height = "100%";
			this._channelsPane.style.maxHeight = "";
		} else if (channelCount > 28) {
			this._channelsPane.style.display = "flex";
			this._channelsPane.style.flex = "1";
			this._channelsPane.style.overflowY = "auto";
			this._channelsPane.style.maxHeight = this.container.classList.contains("docked") ? "" : "600px";
			this._channelsPane.style.minHeight = "";
			this._channelsPane.style.height = "";
		} else {
			this._channelsPane.style.display = "flex";
			this._channelsPane.style.flex = "1";
			this._channelsPane.style.maxHeight = "";
			this._channelsPane.style.overflowY = "";
			this._channelsPane.style.minHeight = "";
			this._channelsPane.style.height = "";
		}
	}

	private _setupResizeObserver(): void {
		if (this._resizeObserver != null) {
			this._resizeObserver.disconnect();
		}
		const dpr = window.devicePixelRatio || 1;
		const measure = (): void => {
			for (const [channelIndex, cvs] of this._channelSpectrumCanvases) {
				const parent = cvs.parentElement;
				if (parent) {
					this._canvasSizes.set(channelIndex, {
						w: Math.round(parent.clientWidth * dpr),
						h: Math.round(parent.clientHeight * dpr),
					});
				}
			}
		};
		const observer = new ResizeObserver((): void => measure());
		observer.observe(this._contentContainer);
		this._resizeObserver = observer;
		// ResizeObserver fires once asynchronously on observe; also measure now in
		// case layout is already settled.
		measure();
	}
}
