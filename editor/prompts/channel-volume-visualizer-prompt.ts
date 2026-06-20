import { BorderWidth, Typography } from "../ui/style-constants";
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
import { forwardRealFourierTransform } from "../../synth/fft";
import type { ChannelState } from "../../synth/channel-state";
import type { PromptEditorRefs } from "../core/prompt-manager";
import type { SongDocument } from "../song-document";
import { BasePrompt } from "./base-prompt";

const { div, h2, h3, span, button } = HTML;
const { svg, defs, linearGradient, stop, rect } = SVG;

// Spectrum overlay tuning, mirroring shared/spectrum.ts main FG layer so the
// per-channel overlay matches the editor's main spectrum look.
// FG bands: 151 quarter-tone bands from ~130Hz to ~10000Hz.
const FG_BANDS = 151;
// Display bars aggregated from the FG bands. The channel cards are narrow
// (1:1 aspect), so a 151-point wave is unreadable; 16 rounded bars aggregate
// ~9-10 bands each and read clearly at the card width.
const BAR_COUNT = 16;
// Fixed soft-compression reference (same as main spectrum FG_REF). The bar
// height is min(1, 2*avg/(avg+FG_REF)), so a band reaches the ceiling only at
// ~FG_REF in magnitude. The per-channel ring holds the channel's own isolated
// diff at its true sample amplitude (a solo full-scale channel writes +/-1),
// so no extra gain is needed: bars respond to the channel's actual level with
// the same compression curve as the main spectrum.
const FG_REF = 0.04;
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

// Perceived-loudness metering. Meters use A-weighted RMS (IEC 61672 analytical
// curve) instead of sample-peak, so they track hearing rather than headroom.
// LOUDNESS_REF is the RMS of a full-scale 1 kHz sine (1/sqrt(2)); a FS sine
// reads 0 dB and fills the bar, so the dB scale is dBFS(A).
const LOUDNESS_REF: number = Math.SQRT1_2;

// Ra(f): unnormalized A-weighting transfer magnitude (IEC 61672). Normalized
// against Ra(1000) so the result is 1.0 at 1 kHz.
function computeRaWeight(f: number): number {
	const f2 = f * f;
	const num = 12194 * 12194 * f2 * f2;
	const d1 = f2 + 20.6 * 20.6;
	const d2 = f2 + 12194 * 12194;
	const d3 = Math.sqrt((f2 + 107.7 * 107.7) * (f2 + 737.9 * 737.9));
	return num / (d1 * d2 * d3);
}

export class ChannelVolumeVisualizerPrompt extends BasePrompt {
	private _animationId: number = 0;

	// Volume bar elements
	private readonly _outVolumeBar: SVGRectElement = rect({
		"pointer-events": "none",
		height: "50%",
		width: "0%",
		x: "5%",
		y: "25%",
		fill: "url('#channelVolumeVisualizerGrad')",
	});
	private readonly _outVolumeCap: SVGRectElement = rect({
		"pointer-events": "none",
		width: BorderWidth.default,
		height: "50%",
		x: "5%",
		y: "25%",
		fill: "var(--ui-widget-focus, #777)",
	});
	private readonly _volumeBarContainer: SVGSVGElement = svg(
		{
			style: "touch-action: none; overflow: visible; margin: auto;",
			width: "160px",
			height: "12px",
			preserveAspectRatio: "none",
			viewBox: "0 0 160 12",
		},
		defs(
			{},
			linearGradient(
				{ id: "channelVolumeVisualizerGrad", gradientUnits: "userSpaceOnUse" },
				stop({ "stop-color": "lime", offset: "60%" }),
				stop({ "stop-color": "orange", offset: "90%" }),
				stop({ "stop-color": "red", offset: "100%" }),
			),
		),
		rect({
			"pointer-events": "none",
			width: "90%",
			height: "50%",
			x: "5%",
			y: "25%",
			fill: "var(--ui-widget-background, #444)",
		}),
		this._outVolumeBar,
		this._outVolumeCap,
	);

	private readonly _contentContainer: HTMLDivElement = div({
		style: "display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; align-content: start; overflow-y: auto; flex: 1; min-height: 0;",
	});

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
	// Reusable FFT scratch buffers (avoid per-frame allocation across channels).
	private _fftScratch: Float32Array = new Float32Array(FFT_SIZE);
	private _magScratch: Float32Array = new Float32Array(FFT_SIZE / 2 + 1);
	// Reusable per-band work arrays (channels are processed sequentially per frame,
	// so a single set shared across channels avoids per-frame allocation).
	private readonly _bandMags: Float32Array = new Float32Array(FG_BANDS);
	private readonly _blurred: Float32Array = new Float32Array(FG_BANDS);
	// Cached per-channel overlay fill color. getComputedChannelColor calls
	// getComputedStyle 4x per call, which forces a style recalc; computing it
	// once per channel on render (and on theme change) removes that per-frame reflow.
	private readonly _channelSpectrumColors: Map<number, string> = new Map();
	// Cached per-channel canvas backing-store size in device pixels, refreshed by a
	// ResizeObserver so the animate loop never reads clientWidth/clientHeight
	// (which would force layout reflows interleaved with style writes).
	private readonly _canvasSizes: Map<number, { w: number; h: number }> = new Map();
	private _resizeObserver: ResizeObserver | null = null;
	// A-weighting per FFT bin, precomputed for the current synth sample rate.
	private _aWeight: Float32Array | null = null;
	private _aWeightSampleRate: number = 0;
	// Per-channel A-weighted RMS loudness (0..~0.7), populated each frame from the
	// spectrum FFT. Read by the metering code (one frame of latency, imperceptible
	// for a ~170ms-integrated loudness meter) so metering needs no second FFT.
	private readonly _channelLoudnessRms: Map<number, number> = new Map();
	// FG band center frequencies (absolute Hz, independent of sample rate).
	private readonly _fgFreqs: number[] = ChannelVolumeVisualizerPrompt._initFgFreqs();

	private static _initFgFreqs(): number[] {
		const freqs: number[] = [];
		const noteStart = Math.round(12 * Math.log2(130 / 440) + 69);
		for (let b = 0; b < FG_BANDS; b++) {
			freqs.push(440 * 2 ** ((noteStart + b * 0.5 - 69) / 12));
		}
		return freqs;
	}

	private readonly _playPauseButton: HTMLButtonElement = button(
		{
			style: `font-size: ${Typography.sizeSm}; padding: 4px 8px;`,
		},
		"▶ Play",
	);

	private _historicVolumeCap: number = 0;
	private _historicTimer: number = 0;
	private _lastVolumeWidth: number = -1;
	private _lastCapX: number = -1;

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
			style: `color: var(--primary-text); font-size: ${Typography.sizeSm}; font-family: monospace;`,
		},
		"Peak: -inf dB",
	);
	private readonly _masterDbAvgLabel: HTMLSpanElement = span(
		{
			style: `color: var(--secondary-text); font-size: ${Typography.sizeSm}; font-family: monospace;`,
		},
		"Avg: -inf dB",
	);
	private readonly _masterDbMinLabel: HTMLSpanElement = span(
		{
			style: `color: var(--secondary-text); font-size: ${Typography.sizeSm}; font-family: monospace;`,
		},
		"Min: -inf dB",
	);
	private readonly _masterDbMaxLabel: HTMLSpanElement = span(
		{
			style: `color: var(--secondary-text); font-size: ${Typography.sizeSm}; font-family: monospace;`,
		},
		"Max: -inf dB",
	);
	private readonly _currentBarLabel: HTMLSpanElement = span(
		{
			style: `color: var(--primary-text); font-size: ${Typography.sizeSm}; font-family: monospace; margin-top: 12px;`,
		},
		"Bar: 1",
	);

	public container: HTMLDivElement = div(
		{
			class: "prompt noSelection",
			style: "width: 720px; height: auto; max-height: 80vh; display: flex; flex-direction: column;",
			tabindex: "0",
		},
		h2({ style: "margin: 12px 12px 0px 12px; text-align: center;" }, "Channel Volume Visualizer"),
		div(
			{ style: "display: flex; flex: 1; min-height: 0; gap: 12px;" },
			// Left pane: Master controls
			div(
				{
					style: "flex: 0 0 180px; display: flex; flex-direction: column; padding: 4px 12px 12px 12px; border-right: 2px solid var(--ui-widget-background);",
				},
				h3({ style: "margin-top: 0px; margin-bottom: 12px;" }, "Master"),
				this._currentBarLabel,
				div({ style: "display: flex; flex-direction: column; align-items: center; margin-bottom: 8px; margin-top: 8px;" }, this._volumeBarContainer),
				this._masterDbPeakLabel,
				this._masterDbAvgLabel,
				this._masterDbMinLabel,
				this._masterDbMaxLabel,
				div({ style: "margin-top: 8px;" }, this._playPauseButton),
				div(
					{
						style: "margin-top: 16px; font-size: 10px; color: var(--secondary-text); border-top: 2px solid var(--ui-widget-background); padding-top: 8px; white-space: nowrap;",
					},
					div({ title: "Pattern number" }, span({ style: "font-weight: bold;" }, "P#"), " = Pattern"),
					div({ title: "Instrument number" }, span({ style: "font-weight: bold;" }, "I#"), " = Instrument"),
					div({ title: "Decibel - volume measurement" }, span({ style: "font-weight: bold;" }, "dB"), " = Decibel"),
					div({ title: "Highest volume level" }, span({ style: "font-weight: bold;" }, "Pk"), " = Peak"),
					div({ title: "Average volume level" }, span({ style: "font-weight: bold;" }, "A"), " = Average"),
					div({ title: "Volume range" }, span({ style: "font-weight: bold;" }, "min/max"), " = Range"),
				),
			),
			// Right pane: Channels
			div(
				{ style: "flex: 1; display: flex; flex-direction: column; min-height: 0; padding: 4px 12px 12px 12px;" },
				h3({ style: "margin-top: 0px; margin-bottom: 8px;" }, "Channels"),
				this._contentContainer,
			),
		),
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
		this._animationId = window.requestAnimationFrame(this._animate);
		this._playPauseButton.addEventListener("click", this._togglePlayPause);
		setTimeout(() => this.container.focus());
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
		this._playPauseButton.textContent = this._doc.synth.playing ? "⏸ Pause" : "▶ Play";
	};

	public override whenKeyPressed = (event: KeyboardEvent): void => {
		if (event.key === " ") {
			event.preventDefault();
			this._togglePlayPause();
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
		if (this._animationId !== 0) {
			window.cancelAnimationFrame(this._animationId);
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
		this._channelLoudnessRms.clear();
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

	// Build (or return cached) A-weighting per FFT bin for the given sample rate.
	private _ensureAWeight(sampleRate: number): Float32Array {
		if (this._aWeight != null && this._aWeightSampleRate === sampleRate) return this._aWeight;
		const halfN = FFT_SIZE >> 1;
		const binFreq = sampleRate / FFT_SIZE;
		const ra1000 = computeRaWeight(1000);
		const arr = new Float32Array(halfN + 1);
		for (let k = 0; k <= halfN; k++) {
			const f = k * binFreq;
			arr[k] = f > 0 ? computeRaWeight(f) / ra1000 : 0;
		}
		this._aWeight = arr;
		this._aWeightSampleRate = sampleRate;
		return arr;
	}

	// A-weighted RMS loudness for one channel from its isolated ring buffer.
	// unweightedRMS is exact (time domain over the full ~170ms window). The
	// A-weighting factor is sqrt(weighted spectral energy / unweighted); the Hann
	// window applied to `mags` cancels in that ratio, so the result is independent
	// of the window. No signal gain is applied, so `mags` is the raw magnitude.
	private _computeLoudnessRms(channelState: ChannelState, mags: Float32Array, halfN: number): number {
		const aW = this._ensureAWeight(this._doc.synth.samplesPerSecond || 48000);
		let unweighted = 0;
		let weighted = 0;
		for (let k = 1; k < halfN; k++) {
			const m = mags[k];
			unweighted += m * m;
			const wm = aW[k] * m;
			weighted += wm * wm;
		}
		const ratio = unweighted > 1e-18 ? Math.sqrt(weighted / unweighted) : 0;
		const fftSize = FFT_SIZE;
		const ring = channelState.audioRing;
		const ringPos = channelState.audioRingPos;
		let sumSq = 0;
		for (let i = 0; i < fftSize; i++) {
			const s = ring[(ringPos + i) & (fftSize - 1)];
			sumSq += s * s;
		}
		const unweightedRms = Math.sqrt(sumSq / fftSize);
		return unweightedRms * ratio;
	}

	private _animate = (): void => {
		// Update play/pause button state
		this._updatePlayPauseButton();

		// Update current bar
		const currentBar = Math.floor(this._doc.synth.playhead);
		this._currentBarLabel.textContent = `Bar: ${currentBar + 1}`;

		// Master loudness = energy sum of per-channel A-weighted RMS (loudness adds
		// for mostly-uncorrelated mixer channels). Read from last frame's map values;
		// one frame of latency is imperceptible for a ~170ms-integrated meter.
		let masterRmsSqSum = 0;
		for (const v of this._channelLoudnessRms.values()) masterRmsSqSum += v * v;
		const masterRms = Math.sqrt(masterRmsSqSum);
		const masterLevel = Math.min(1, masterRms / LOUDNESS_REF);

		// Update master volume bar
		this._historicTimer--;
		if (this._historicTimer <= 0) {
			this._historicVolumeCap -= 0.03;
		}
		if (masterLevel > this._historicVolumeCap) {
			this._historicVolumeCap = masterLevel;
			this._historicTimer = 50;
		}

		const volumeWidth = Math.min(144, masterLevel * 144);
		const capX = 8 + Math.min(144, this._historicVolumeCap * 144);
		if (volumeWidth !== this._lastVolumeWidth) {
			this._lastVolumeWidth = volumeWidth;
			this._outVolumeBar.setAttribute("width", `${volumeWidth}`);
		}
		if (capX !== this._lastCapX) {
			this._lastCapX = capX;
			this._outVolumeCap.setAttribute("x", `${capX}`);
		}

		// Update master dB labels (dBFS(A): full-scale 1 kHz sine = 0 dB)
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
			this._masterDbMinLabel.textContent = `Min: ${minDb} dB`;
			this._masterDbMaxLabel.textContent = `Max: ${maxDb} dB`;
		}

		// Update per-channel volume bars
		const synth = this._doc.synth;
		for (const [channelIndex, bar] of this._channelVolumeBars) {
			const channelState = synth.channels[channelIndex];
			if (!channelState) continue;

			// Per-channel perceived loudness (A-weighted RMS of the isolated ring),
			// normalized so a full-scale 1 kHz sine fills the bar. Reads last frame's
			// value (populated in the spectrum FFT pass) to avoid a second FFT.
			const channelLevel = Math.min(1, (this._channelLoudnessRms.get(channelIndex) ?? 0) / LOUDNESS_REF);

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

			const chWidth = Math.min(144, channelLevel * 144);
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
				let statsText = "";
				if (sampleCount > 0) {
					const avg = (this._channelVolumeSums.get(channelIndex) ?? 0) / sampleCount;
					const avgDb = avg > 0 ? 20 * Math.log10(avg) : -Infinity;
					const minDb = this._channelMinDb.get(channelIndex) ?? -Infinity;
					const maxDb = this._channelMaxDb.get(channelIndex) ?? -Infinity;
					const avgText = Number.isFinite(avgDb) ? avgDb.toFixed(1) : "-inf";
					const minText = Number.isFinite(minDb) ? minDb.toFixed(1) : "-inf";
					const maxText = Number.isFinite(maxDb) ? maxDb.toFixed(1) : "-inf";
					statsText = ` | A:${avgText} | ${minText}/${maxText}`;
				}
				dbLabel.textContent = Number.isFinite(peakDb) ? `Pk:${peakDb.toFixed(1)}${statsText}` : `Pk:-inf${statsText}`;
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

					// Perceived-loudness (A-weighted RMS) for the meter, from the same FFT.
					// Stored for the metering pass (one frame latency) to avoid a second FFT.
					this._channelLoudnessRms.set(channelIndex, this._computeLoudnessRms(channelState, mags, halfN));

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

					// Draw rounded-bottom-up bars: aggregate the FG bands into BAR_COUNT bars,
					// each a rounded-top rectangle filled from the card bottom. A continuous
					// wave is unreadable on the narrow 1:1 cards.
					const col = this._channelSpectrumColors.get(channelIndex);
					if (col) {
						const bandsPerBar = FG_BANDS / BAR_COUNT;
						// Leave a 1px gap between bars; cap radius at half the bar width so tall
						// bars stay fully rounded and thin bars don't over-round.
						const gap = Math.max(1, window.devicePixelRatio || 1);
						const barOuter = w / BAR_COUNT;
						const barW = barOuter - gap;
						const radius = Math.min(barW * 0.5, h * 0.12);
						spectrumCtx.fillStyle = col;
						spectrumCtx.globalAlpha = 0.2;
						spectrumCtx.beginPath();
						for (let bar = 0; bar < BAR_COUNT; bar++) {
							// Average the smoothed magnitude across this bar's band range.
							const s0 = Math.floor(bar * bandsPerBar);
							const s1 = Math.min(FG_BANDS, Math.floor((bar + 1) * bandsPerBar));
							let acc = 0;
							for (let b = s0; b < s1; b++) acc += smooth[b];
							const avg = acc / (s1 - s0);
							const norm = Math.min(1, (2 * avg) / (avg + FG_REF));
							const barH = norm * h;
							if (barH < 0.5) continue;
							const x = bar * barOuter + gap * 0.5;
							const y = h - barH;
							// Rounded-top rectangle path (bottom corners square, top corners rounded).
							const r = Math.min(radius, barH * 0.5);
							spectrumCtx.moveTo(x, h);
							spectrumCtx.lineTo(x, y + r);
							spectrumCtx.quadraticCurveTo(x, y, x + r, y);
							spectrumCtx.lineTo(x + barW - r, y);
							spectrumCtx.quadraticCurveTo(x + barW, y, x + barW, y + r);
							spectrumCtx.lineTo(x + barW, h);
						}
						spectrumCtx.fill();
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
				const channelColors = ColorConfig.getChannelColor(this._doc.song, channelIndex);
				const currentBarAnim = Math.floor(this._doc.synth.playhead);
				const patternIndexAnim = channel.bars[currentBarAnim];
				const patternAnim = patternIndexAnim > 0 ? this._doc.song.getPattern(channelIndex, currentBarAnim) : null;
				const patternInstrumentsAnim = patternAnim ? patternAnim.instruments : [];

				for (const [key, instrSpan] of this._instrumentSpans) {
					if (key.startsWith(`${channelIndex}-`)) {
						const j = parseInt(key.split("-")[1], 10);
						const instrState = channelState.instruments[j];
						if (instrState && instrSpan) {
							const isPlaying =
								instrState.activeTones.count() > 0 || instrState.releasedTones.count() > 0 || instrState.liveInputTones.count() > 0;
							const inPattern = patternInstrumentsAnim.includes(j);
							instrSpan.style.background = isPlaying ? "white" : inPattern ? channelColors.primaryChannel : "var(--ui-widget-background)";
							instrSpan.style.color = isPlaying ? "black" : inPattern ? "var(--editor-background)" : channelColors.primaryChannel;
							instrSpan.style.opacity = inPattern || isPlaying ? "1" : "0.5";
						}
					}
				}
			}
		}

		this._animationId = window.requestAnimationFrame(this._animate);
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
		this._channelLoudnessRms.clear();

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
				width: "0%",
				x: "5%",
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
					style: `color: ${channelColors.primaryChannel}; opacity: 0.8; font-size: 10px; font-weight: 600; font-family: monospace; text-align: center; display: block;`,
				},
				"Pk:-inf",
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
				style: `display: flex; flex-direction: column; padding: 4px 8px; min-width: 0; aspect-ratio: 1; overflow: hidden; position: relative; border: 2px solid ${
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
					style: "display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;",
				});

				// Get instruments in current pattern for highlighting
				const pattern = hasPattern ? song.getPattern(i, currentBar) : null;
				const patternInstruments = pattern ? pattern.instruments : [];

				for (let j = 0; j < channel.instruments.length; j++) {
					const inPattern = patternInstruments.includes(j);
					const instrState = channelState ? channelState.instruments[j] : null;
					const isPlaying = instrState
						? instrState.activeTones.count() > 0 || instrState.releasedTones.count() > 0 || instrState.liveInputTones.count() > 0
						: false;
					const instrSpan = span(
						{
							style: `font-size: 10px; font-weight: 600; padding: 1px 4px; border-radius: var(--border-radius-medium); background: ${
								isPlaying ? "white" : inPattern ? channelColors.primaryChannel : "var(--ui-widget-background)"
							}; color: ${isPlaying ? "black" : inPattern ? "var(--editor-background)" : channelColors.primaryChannel}; opacity: ${
								inPattern || isPlaying ? "1" : "0.5"
							};`,
						},
						`I${j + 1}`,
					);
					this._instrumentSpans.set(`${i}-${j}`, instrSpan);
					instrDiv.appendChild(instrSpan);
				}
				contentWrap.appendChild(instrDiv);
			}

			this._contentContainer.appendChild(channelDiv);
		}

		// Observe the grid container so per-channel canvas backing-store sizes are
		// refreshed on layout changes without any per-frame clientWidth reads.
		this._setupResizeObserver();
	};

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
