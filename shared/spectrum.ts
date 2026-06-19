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
const FG_MIN_FREQ = 201;
const FG_MAX_FREQ = 12000;

const BG_BANDS = 12;
const BG_MIN_FREQ = 20;
const BG_MAX_FREQ = 200;

export class spectrumCanvas {
	public _EventUpdateCanvas: (left: Float32Array, right?: Float32Array) => void;
	private _cachedBgColor: string = "";
	private _cachedLColor: string = "";
	private _cachedRColor: string = "";

	private _fgCoefs: { cos: number; sin: number }[][] = [];
	private _bgCoefs: { cos: number; sin: number }[][] = [];
	private _sampleRate = 48000;
	private _lastBufferSize = 0;

	// Dynamic amplification: slow-decay peak hold
	private _fgSmoothMax = 0.001;
	private _bgSmoothMax = 0.001;
	// Per-band temporal smoothing (~30ms decay at 60fps)
	// factor^2 ≈ 0.1, so ~30ms to decay to 10%
	private _fgSmoothMags = new Float32Array(32);
	private _bgSmoothMags = new Float32Array(12);

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

			// Mix to mono
			const mono = new Float32Array(sampleCount);
			for (let i = 0; i < sampleCount; i++) {
				mono[i] = (directlinkL[i] + directlinkR[i]) * 0.5;
			}

			// Compute foreground spectrum
			const fgMags = new Float32Array(FG_BANDS);
			let fgInstMax = 0.0001;
			for (let b = 0; b < FG_BANDS; b++) {
				const coefs = this._fgCoefs[b];
				let re = 0, im = 0;
				for (let n = 0; n < sampleCount; n++) {
					re += mono[n] * coefs[n].cos;
					im -= mono[n] * coefs[n].sin;
				}
				fgMags[b] = Math.sqrt(Math.sqrt(re * re + im * im) / sampleCount);
				if (fgMags[b] > fgInstMax) fgInstMax = fgMags[b];
			}

			// Compute background (bass) spectrum
			const bgMags = new Float32Array(BG_BANDS);
			let bgInstMax = 0.0001;
			for (let b = 0; b < BG_BANDS; b++) {
				const coefs = this._bgCoefs[b];
				let re = 0, im = 0;
				for (let n = 0; n < sampleCount; n++) {
					re += mono[n] * coefs[n].cos;
					im -= mono[n] * coefs[n].sin;
				}
				bgMags[b] = Math.sqrt(Math.sqrt(re * re + im * im) / sampleCount);
				if (bgMags[b] > bgInstMax) bgInstMax = bgMags[b];
			}

			// Per-band temporal smoothing: instant attack, ~100ms decay
			// At 60fps, 6 frames = 100ms. factor^6 ≈ 0.1
			for (let b = 0; b < FG_BANDS; b++) {
				if (fgMags[b] > this._fgSmoothMags[b]) {
					this._fgSmoothMags[b] = fgMags[b]; // instant attack
				} else {
					this._fgSmoothMags[b] = this._fgSmoothMags[b] * 0.32 + fgMags[b] * 0.68; // ~30ms decay
				}
			}
			for (let b = 0; b < BG_BANDS; b++) {
				if (bgMags[b] > this._bgSmoothMags[b]) {
					this._bgSmoothMags[b] = bgMags[b]; // instant attack
				} else {
					this._bgSmoothMags[b] = this._bgSmoothMags[b] * 0.68 + bgMags[b] * 0.32; // ~100ms decay
				}
			}

			// Dynamic amplification: instant attack, slow decay
			if (fgInstMax > this._fgSmoothMax) {
				this._fgSmoothMax = fgInstMax;
			} else {
				this._fgSmoothMax *= 0.96; // ~1s decay at 60fps
				if (this._fgSmoothMax < 0.001) this._fgSmoothMax = 0.001;
			}
			if (bgInstMax > this._bgSmoothMax) {
				this._bgSmoothMax = bgInstMax;
			} else {
				this._bgSmoothMax *= 0.96;
				if (this._bgSmoothMax < 0.001) this._bgSmoothMax = 0.001;
			}

			// Draw background bass layer (R color, low opacity, thicker)
			this._drawCurve(ctx, w, h, this._bgSmoothMags, this._bgSmoothMax, BG_BANDS, this._cachedRColor, 0.25);

			// Draw foreground main layer (L color, full opacity)
			this._drawCurve(ctx, w, h, this._fgSmoothMags, this._fgSmoothMax, FG_BANDS, this._cachedLColor, 1.0);
		};

		events.listen("spectrumUpdate", this._EventUpdateCanvas);
		events.listen("themeChange", () => this._updateCachedColors());
	}

	private _drawCurve(
		ctx: CanvasRenderingContext2D,
		w: number, h: number,
		mags: Float32Array, maxMag: number,
		bandCount: number,
		color: string,
		opacity: number,
	): void {
		const bandWidth = w / (bandCount - 1);
		const ys = new Array<number>(bandCount);
		for (let b = 0; b < bandCount; b++) {
			ys[b] = h - Math.min(1, mags[b] / maxMag) * h;
		}

		ctx.globalAlpha = opacity;

		// Fill below curve using Catmull-Rom spline through data points.
		// Passes through every point with smooth curves (no jagged lines,
		// no over-smoothed hill). Uses bezierCurveTo with Catmull-Rom
		// control points: cp = P1 +/- (P2-P0)/6.
		ctx.beginPath();
		ctx.moveTo(0, h);
		ctx.lineTo(0, ys[0]);
		for (let b = 0; b < bandCount - 1; b++) {
			const p0 = ys[Math.max(0, b - 1)];
			const p1 = ys[b];
			const p2 = ys[b + 1];
			const p3 = ys[Math.min(bandCount - 1, b + 2)];
			const x1 = b * bandWidth;
			const x2 = (b + 1) * bandWidth;
			// Catmull-Rom to bezier control points
			const cp1y = p1 + (p2 - p0) / 6;
			const cp2y = p2 - (p3 - p1) / 6;
			ctx.bezierCurveTo(x1 + (x2 - x1) / 3, cp1y, x2 - (x2 - x1) / 3, cp2y, x2, p2);
		}
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