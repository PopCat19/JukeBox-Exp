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
import { forwardRealFourierTransform } from "../synth/fft";

const FG_BANDS = 32;
const FG_MIN_FREQ = 160;
const FG_MAX_FREQ = 4000;

const BG_BANDS = 12;
const BG_MIN_FREQ = 20;
const BG_MAX_FREQ = 160;

// CQT Q factor: constant ratio of frequency to bandwidth
// Q=8 means bandwidth = freq/8. Higher Q = narrower filters.
// At 2048 buffer/48kHz: lowest freq with full CQT is ~60Hz.
// Below that, window is clamped to buffer size.
const FFT_SIZE = 2048;

export class spectrumCanvas {
	public _EventUpdateCanvas: (left: Float32Array, right?: Float32Array) => void;
	private _cachedBgColor: string = "";
	private _cachedLColor: string = "";
	private _cachedRColor: string = "";

	private _sampleRate = 48000;
	private _lastBufferSize = 0;
	private readonly _bgFreqs: number[] = [];
	private readonly _fgFreqs: number[] = [];

	// Fixed normalization references (floor for soft compression)
	private static readonly FG_REF = 0.02;
	private static readonly BG_REF = 0.005;
	// Peak hold: gentle decay (0.92 ≈ 120ms) so peaks reach ceiling
	// without being too aggressive like the old 30ms (0.57)
	private _bgSmoothMax = 0.001;
	// FFT scratch buffer (reused each frame)
	private _fftBuffer: Float32Array = new Float32Array(FFT_SIZE);
	// Per-band temporal smoothing (~30ms decay at 60fps)
	// factor^2 ≈ 0.1, so ~30ms to decay to 10%
	private _fgSmoothMags = new Float32Array(32);
	private _bgSmoothMags = new Float32Array(12);

	constructor(
		public readonly canvas: HTMLCanvasElement,
		readonly scale: number = 1,
	) {
		this._updateCachedColors();
		this._initBands(48000);

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
				this._initBands(this._sampleRate);
				this._lastBufferSize = sampleCount;
			}
			this._sampleRate = this._sampleRate || 48000;

			// Compute FFT on latest samples (mix to mono, Hann window)
			const fftBuf = this._fftBuffer;
			const fftSize = FFT_SIZE;
			const copyLen = Math.min(sampleCount, fftSize);
			for (let i = 0; i < copyLen; i++) {
				const hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
				fftBuf[i] = (directlinkL[i] + directlinkR[i]) * 0.5 * hann;
			}
			for (let i = copyLen; i < fftSize; i++) fftBuf[i] = 0;
			forwardRealFourierTransform(fftBuf);

			// FFT output format: elements 0..N/2 are real, N/2+1..N-1 are imag in descending order
			const halfN = fftSize >> 1;
			const binFreq = this._sampleRate / fftSize;
			const mags = new Float32Array(halfN + 1);
			for (let k = 0; k <= halfN; k++) {
				const re = fftBuf[k];
				const im = (k === 0 || k === halfN) ? 0 : fftBuf[fftSize - k];
				mags[k] = Math.sqrt(re * re + im * im) / fftSize; // keep /N for FG (linear mag)
			}

			// Interpolate FG + BG bands from FFT bins (log-frequency interpolation)
			const fgMags = new Float32Array(FG_BANDS);
			for (let b = 0; b < FG_BANDS; b++) {
				const kFloat = this._fgFreqs[b] / binFreq;
				const kLo = Math.floor(kFloat);
				const kHi = Math.min(kLo + 1, halfN);
				const frac = kFloat - kLo;
				fgMags[b] = mags[kLo] + (mags[kHi] - mags[kLo]) * frac;
			}

			const bgMags = new Float32Array(BG_BANDS);
			let bgInstMax = 0.0001;
			for (let b = 0; b < BG_BANDS; b++) {
				const kFloat = this._bgFreqs[b] / binFreq;
				const kLo = Math.floor(kFloat);
				const kHi = Math.min(kLo + 1, halfN);
				const frac = kFloat - kLo;
				// Interpolate magnitude from adjacent FFT bins (natural, no squaring)
				bgMags[b] = mags[kLo] + (mags[kHi] - mags[kLo]) * frac;
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

	private _initBands(sampleRate: number): void {
		this._sampleRate = sampleRate;
		// Compute BG center frequencies for band interpolation
		this._bgFreqs.length = 0;
		const bgLogMin = Math.log(BG_MIN_FREQ);
		const bgLogMax = Math.log(BG_MAX_FREQ);
		for (let b = 0; b < BG_BANDS; b++) {
			this._bgFreqs.push(Math.exp(bgLogMin + (b / (BG_BANDS - 1)) * (bgLogMax - bgLogMin)));
		}
		// Compute FG center frequencies for band interpolation
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

	private _updateCachedColors(): void {
		this._cachedBgColor = ColorConfig.getComputed("--editor-background") || "black";
		this._cachedLColor = ColorConfig.getComputed("--spectrum-line-L") || "white";
		this._cachedRColor = ColorConfig.getComputed("--spectrum-line-R") || "rgba(119,68,255,0.99)";
	}
}

