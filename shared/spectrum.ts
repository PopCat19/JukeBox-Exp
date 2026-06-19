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

const FG_BANDS = 16;
const FG_MIN_FREQ = 300;
const FG_MAX_FREQ = 6000;

const BG_BANDS = 12;
const BG_MIN_FREQ = 30;
const BG_MAX_FREQ = 240;

// Fixed dB normalization (inspired by audioMotion-analyzer)
// Instead of dynamic peak hold, normalize against fixed dB limits.
// This prevents flooding (loudest band doesn't set ceiling for all)
// and eliminates the wedge (high freqs show their natural low level).
const FG_MIN_DB = -90;   // noise floor (very sensitive)
const FG_MAX_DB = -15;   // near full scale
const FG_BOOST = 1.0;     // natural (no boost)

const BG_MIN_DB = -80;
const BG_MAX_DB = -5;     // wide headroom for bass (prevents flooding)
const BG_BOOST = 1.0;     // natural (no boost)

// Per-band temporal smoothing (30ms time constant)
// At 60fps (16.67ms/frame): factor = e^(-16.67/30) ≈ 0.57
const BAND_DECAY = 0.57;

export class spectrumCanvas {
	public _EventUpdateCanvas: (left: Float32Array, right?: Float32Array) => void;
	private _cachedBgColor: string = "";
	private _cachedLColor: string = "";
	private _cachedRColor: string = "";

	private _fgCoefs: { cos: number; sin: number }[][] = [];
	private _bgCoefs: { cos: number; sin: number }[][] = [];
	private _sampleRate = 48000;
	private _lastBufferSize = 0;
	private readonly _bgFreqs: number[] = [];
	private readonly _fgFreqs: number[] = [];

	// Per-band temporal smoothing (30ms time constant)
	private _fgSmoothMags = new Float32Array(16);
	private _bgSmoothMags = new Float32Array(40);

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

			// Mix to mono with Hann window to prevent spectral leakage
			const mono = new Float32Array(sampleCount);
			for (let i = 0; i < sampleCount; i++) {
				const hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (sampleCount - 1)));
				mono[i] = (directlinkL[i] + directlinkR[i]) * 0.5 * hann;
			}

			// Compute foreground spectrum
			const fgMags = new Float32Array(FG_BANDS);
			for (let b = 0; b < FG_BANDS; b++) {
				const coefs = this._fgCoefs[b];
				let re = 0, im = 0;
				for (let n = 0; n < sampleCount; n++) {
					re += mono[n] * coefs[n].cos;
					im -= mono[n] * coefs[n].sin;
				}
					// Fixed dB normalization: magnitude → dB → normalize → boost for contrast
				const fgRaw = Math.sqrt(re * re + im * im) / sampleCount;
				const fgDb = 20 * Math.log10(fgRaw + 1e-10);
				let fgNorm = Math.max(0, Math.min(1, (fgDb - FG_MIN_DB) / (FG_MAX_DB - FG_MIN_DB)));
				fgMags[b] = Math.pow(fgNorm, FG_BOOST);
			}

			// Compute background (bass) spectrum
			const bgMags = new Float32Array(BG_BANDS);
			for (let b = 0; b < BG_BANDS; b++) {
				const coefs = this._bgCoefs[b];
				let re = 0, im = 0;
				for (let n = 0; n < sampleCount; n++) {
					re += mono[n] * coefs[n].cos;
					im -= mono[n] * coefs[n].sin;
				}
					// Fixed dB normalization: power → dB → normalize → boost for contrast
				const bgRaw = (re * re + im * im) / sampleCount;
				const bgDb = 10 * Math.log10(bgRaw + 1e-10);
				let bgNorm = Math.max(0, Math.min(1, (bgDb - BG_MIN_DB) / (BG_MAX_DB - BG_MIN_DB)));
				bgMags[b] = Math.pow(bgNorm, BG_BOOST);
			}

			// Per-band temporal smoothing: instant attack, 30ms decay
			for (let b = 0; b < FG_BANDS; b++) {
				if (fgMags[b] > this._fgSmoothMags[b]) {
					this._fgSmoothMags[b] = fgMags[b]; // instant attack
				} else {
					this._fgSmoothMags[b] = this._fgSmoothMags[b] * BAND_DECAY + fgMags[b] * (1 - BAND_DECAY);
				}
			}
			for (let b = 0; b < BG_BANDS; b++) {
				if (bgMags[b] > this._bgSmoothMags[b]) {
					this._bgSmoothMags[b] = bgMags[b]; // instant attack
				} else {
					this._bgSmoothMags[b] = this._bgSmoothMags[b] * BAND_DECAY + bgMags[b] * (1 - BAND_DECAY);
				}
			}

			// Draw background bass layer (R color, low opacity)
			this._drawSmooth(ctx, w, h, this._bgSmoothMags, BG_BANDS, this._cachedRColor, 0.4, 1.0);

			// Draw foreground main layer (L color, full opacity)
			this._drawSmooth(ctx, w, h, this._fgSmoothMags, FG_BANDS, this._cachedLColor, 1.0, 1.0);
		};

		events.listen("spectrumUpdate", this._EventUpdateCanvas);
		events.listen("spectrumReset", () => this.reset());
		events.listen("themeChange", () => this._updateCachedColors());
	}

	private _drawSmooth(
		ctx: CanvasRenderingContext2D,
		w: number, h: number,
		mags: Float32Array, // pre-normalized [0,1]
		bandCount: number,
		color: string,
		opacity: number,
		heightScale: number,
	): void {
		const bandWidth = w / (bandCount - 1);
		const ys = new Array<number>(bandCount);
		for (let b = 0; b < bandCount; b++) {
			ys[b] = h - mags[b] * h * heightScale;
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
	): { cos: number; sin: number }[][] {
		const coefs: { cos: number; sin: number }[][] = [];
		const logMin = Math.log(minFreq);
		const logMax = Math.log(maxFreq);
		for (let b = 0; b < bandCount; b++) {
			const t = b / (bandCount - 1);
			const freq = Math.exp(logMin + t * (logMax - logMin));
			const omega = (2 * Math.PI * freq) / sampleRate;
			const band: { cos: number; sin: number }[] = new Array(bufferSize);
			for (let n = 0; n < bufferSize; n++) {
				band[n] = { cos: Math.cos(omega * n), sin: Math.sin(omega * n) };
			}
			coefs.push(band);
		}
		return coefs;
	}


	private _updateCachedColors(): void {
		this._cachedBgColor = ColorConfig.getComputed("--editor-background") || "black";
		this._cachedLColor = ColorConfig.getComputed("--spectrum-line-L") || "white";
		this._cachedRColor = ColorConfig.getComputed("--spectrum-line-R") || "rgba(119,68,255,0.99)";
	}
}