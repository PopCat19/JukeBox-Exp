// Spectrum
//
// Purpose: Renders real-time audio as a smooth bezier-curve spectrum analyzer
//
// Inspired by camellia/seatrus MV visualizers and Furnace tracker spectrum.
// This module:
// - Dual layer: background bass (20-250Hz) + foreground main (250-8000Hz)
// - Smooth bezier curves through band magnitudes
// - Dynamic amplification with slow-decay peak hold (no constant 80% fill)
// - 60fps update rate, always clean regardless of project size

import { ColorConfig } from "./color-config";
import { events } from "./events";

const FG_BANDS = 32;
const FG_MIN_FREQ = 160;
const FG_MAX_FREQ = 4000;

const BG_BANDS = 24;
const BG_MIN_FREQ = 20;
const BG_MAX_FREQ = 160;

// CQT Q factor: constant ratio of frequency to bandwidth
// Q=8 means bandwidth = freq/8. Higher Q = narrower filters.
// At 2048 buffer/48kHz: lowest freq with full CQT is ~60Hz.
// Below that, window is clamped to buffer size.
const CQT_Q = 8;

export class spectrumCanvas {
	public _EventUpdateCanvas: (left: Float32Array, right?: Float32Array) => void;
	private _cachedBgColor: string = "";
	private _cachedLColor: string = "";
	private _cachedRColor: string = "";

	private _fgCoefs: { cos: Float32Array; sin: Float32Array; len: number }[] = [];
	private _bgCoefs: { cos: Float32Array; sin: Float32Array; len: number }[] = [];
	private _sampleRate = 48000;
	private _lastBufferSize = 0;
	private readonly _bgFreqs: number[] = [];
	private readonly _fgFreqs: number[] = [];

	// Fixed normalization references (floor for soft compression)
	private static readonly FG_REF = 0.02;
	private static readonly BG_REF = 0.5;
	// Peak hold: gentle decay (0.92 ≈ 120ms) so peaks reach ceiling
	// without being too aggressive like the old 30ms (0.57)
	private _bgSmoothMax = 0.001;
	// Per-band temporal smoothing (~30ms decay at 60fps)
	// factor^2 ≈ 0.1, so ~30ms to decay to 10%
	private _fgSmoothMags = new Float32Array(32);
	private _bgSmoothMags = new Float32Array(24);

	constructor(
		public readonly canvas: HTMLCanvasElement,
		readonly scale: number = 1,
	) {
		this._updateCachedColors();
		this._initBands(48000, 2048);

		this._EventUpdateCanvas = (directlinkL: Float32Array, directlinkR?: Float32Array): void => {
			if (!directlinkR) return;

			const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
			const w = canvas.width;
			const h = canvas.height;

			// Clear
			ctx.fillStyle = this._cachedBgColor;
			ctx.fillRect(0, 0, w, h);

			const sampleCount = directlinkL.length;
			if (sampleCount < 4) return;

			if (sampleCount !== this._lastBufferSize) {
				this._initBands(this._sampleRate, sampleCount);
				this._lastBufferSize = sampleCount;
			}

			// Mix to mono (Hann window applied per-band with CQT window length)
			const mono = new Float32Array(sampleCount);
			for (let i = 0; i < sampleCount; i++) {
				mono[i] = (directlinkL[i] + directlinkR[i]) * 0.5;
			}

			// Compute foreground spectrum (CQT: each band uses frequency-dependent window)
			const fgMags = new Float32Array(FG_BANDS);
			for (let b = 0; b < FG_BANDS; b++) {
				const bw = this._fgCoefs[b];
				let re = 0, im = 0;
				const nFrames = bw.len;
				for (let n = 0; n < nFrames; n++) {
					const hann = 0.5 * (1 - Math.cos(2 * Math.PI * n / (nFrames - 1)));
					re += mono[n] * bw.cos[n] * hann;
					im -= mono[n] * bw.sin[n] * hann;
				}
				fgMags[b] = Math.sqrt(re * re + im * im) / nFrames;
			}

			// Compute background (bass) spectrum (CQT: each band uses frequency-dependent window)
			const bgMags = new Float32Array(BG_BANDS);
			let bgInstMax = 0.0001;
			for (let b = 0; b < BG_BANDS; b++) {
				const bw = this._bgCoefs[b];
				let re = 0, im = 0;
				const nFrames = bw.len;
				for (let n = 0; n < nFrames; n++) {
					const hann = 0.5 * (1 - Math.cos(2 * Math.PI * n / (nFrames - 1)));
					re += mono[n] * bw.cos[n] * hann;
					im -= mono[n] * bw.sin[n] * hann;
				}
				bgMags[b] = (re * re + im * im) / nFrames;
				if (bgMags[b] > bgInstMax) bgInstMax = bgMags[b];
			}

			// Per-band decay: instant attack, 10ms time constant
			// At 60fps (16.67ms/frame): factor = e^(-16.67/10) ≈ 0.19
			for (let b = 0; b < FG_BANDS; b++) {
				if (fgMags[b] > this._fgSmoothMags[b]) {
					this._fgSmoothMags[b] = fgMags[b]; // instant attack
				} else {
					this._fgSmoothMags[b] = this._fgSmoothMags[b] * 0.4 + fgMags[b] * 0.6;
				}
			}
			for (let b = 0; b < BG_BANDS; b++) {
				if (bgMags[b] > this._bgSmoothMags[b]) {
					this._bgSmoothMags[b] = bgMags[b]; // instant attack
				} else {
					this._bgSmoothMags[b] = this._bgSmoothMags[b] * 0.4 + bgMags[b] * 0.6;
				}
			}

			// BG peak hold: gentle decay so bass peaks reach ceiling
			if (bgInstMax > this._bgSmoothMax) {
				this._bgSmoothMax = bgInstMax;
			} else {
				this._bgSmoothMax *= 0.92;
				if (this._bgSmoothMax < 0.001) this._bgSmoothMax = 0.001;
			}

			// FG uses fixed floor ref (no peak hold), BG uses peak hold
			const fgRef = spectrumCanvas.FG_REF;
			const bgRef = Math.max(this._bgSmoothMax, spectrumCanvas.BG_REF);

			// Draw background bass layer (R color, low opacity)
			this._drawSmooth(ctx, w, h, this._bgSmoothMags, bgRef, BG_BANDS, this._cachedRColor, 0.4, 1.0);

			// Draw foreground main layer (L color, full opacity)
			this._drawSmooth(ctx, w, h, this._fgSmoothMags, fgRef, FG_BANDS, this._cachedLColor, 1.0, 1.0);
		};

		events.listen("spectrumUpdate", this._EventUpdateCanvas);
		events.listen("spectrumReset", () => this.reset());
		events.listen("themeChange", () => this._updateCachedColors());
	}

	private _drawSmooth(
		ctx: CanvasRenderingContext2D,
		w: number, h: number,
		mags: Float32Array, maxMag: number,
		bandCount: number,
		color: string,
		opacity: number,
		heightScale: number,
	): void {
		const bandWidth = w / (bandCount - 1);
		const ys = new Array<number>(bandCount);
		for (let b = 0; b < bandCount; b++) {
			ys[b] = h - Math.min(1, 2 * mags[b] / (mags[b] + maxMag)) * h * heightScale;
		}

		ctx.globalAlpha = opacity;

		// Simple quadratic bezier: data points as control, midpoints as endpoints
		ctx.beginPath();
		ctx.moveTo(0, h);
		ctx.lineTo(0, ys[0]);
		for (let b = 0; b < bandCount - 1; b++) {
			const x1 = b * bandWidth;
			const x2 = (b + 1) * bandWidth;
			ctx.quadraticCurveTo(x1, ys[b], (x1 + x2) / 2, (ys[b] + ys[b + 1]) / 2);
		}
		ctx.lineTo(w, ys[bandCount - 1]);
		ctx.lineTo(w, h);
		ctx.closePath();
		ctx.fillStyle = color;
		ctx.fill();
		ctx.globalAlpha = 1.0;
	}

	private _initBands(sampleRate: number, bufferSize: number): void {
		this._sampleRate = sampleRate;
		this._fgCoefs = this._buildCoefs(FG_BANDS, FG_MIN_FREQ, FG_MAX_FREQ, sampleRate, bufferSize);
		this._bgCoefs = this._buildCoefs(BG_BANDS, BG_MIN_FREQ, BG_MAX_FREQ, sampleRate, bufferSize);
		// Compute BG center frequencies for gain curve
		this._bgFreqs.length = 0;
		const bgLogMin = Math.log(BG_MIN_FREQ);
		const bgLogMax = Math.log(BG_MAX_FREQ);
		for (let b = 0; b < BG_BANDS; b++) {
			this._bgFreqs.push(Math.exp(bgLogMin + (b / (BG_BANDS - 1)) * (bgLogMax - bgLogMin)));
		}
		// Compute FG center frequencies for gain curve
		this._fgFreqs.length = 0;
		const fgLogMin = Math.log(FG_MIN_FREQ);
		const fgLogMax = Math.log(FG_MAX_FREQ);
		for (let b = 0; b < FG_BANDS; b++) {
			this._fgFreqs.push(Math.exp(fgLogMin + (b / (FG_BANDS - 1)) * (fgLogMax - fgLogMin)));
		}
	}

	public reset(): void {
		this._fgSmoothMags.fill(0);
		this._bgSmoothMags.fill(0);
	}

	private _buildCoefs(
		bandCount: number, minFreq: number, maxFreq: number,
		sampleRate: number, bufferSize: number,
	): { cos: Float32Array; sin: Float32Array; len: number }[] {
		const coefs: { cos: Float32Array; sin: Float32Array; len: number }[] = [];
		const logMin = Math.log(minFreq);
		const logMax = Math.log(maxFreq);
		for (let b = 0; b < bandCount; b++) {
			const t = b / (bandCount - 1);
			const freq = Math.exp(logMin + t * (logMax - logMin));
			// CQT: each band processes a frequency-dependent number of samples.
			// Higher frequencies use fewer samples (wider bandwidth proportional to freq).
			// Low frequencies use more samples, clamped to buffer size.
			const cqtLen = Math.min(bufferSize, Math.max(2, Math.round(CQT_Q * sampleRate / freq)));
			const omega = (2 * Math.PI * freq) / sampleRate;
			const cos = new Float32Array(cqtLen);
			const sin = new Float32Array(cqtLen);
			for (let n = 0; n < cqtLen; n++) {
				cos[n] = Math.cos(omega * n);
				sin[n] = Math.sin(omega * n);
			}
			coefs.push({ cos, sin, len: cqtLen });
		}
		return coefs;
	}


	private _updateCachedColors(): void {
		this._cachedBgColor = ColorConfig.getComputed("--editor-background") || "black";
		this._cachedLColor = ColorConfig.getComputed("--spectrum-line-L") || "white";
		this._cachedRColor = ColorConfig.getComputed("--spectrum-line-R") || "rgba(119,68,255,0.99)";
	}
}