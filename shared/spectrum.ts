// Spectrum
//
// Purpose: Renders real-time audio as a smooth bezier-curve spectrum analyzer
//
// Inspired by camellia/seatrus MV visualizers and Furnace tracker spectrum.
// This module:
// - Computes a 16-band logarithmic frequency spectrum from the mono mix
// - Draws a smooth bezier curve through band magnitudes (not flat bars)
// - Fills below the curve with a vertical gradient
// - Mirrors a faint reflection below the center line for depth
// - Always clean and readable regardless of project size or channel count

import { ColorConfig } from "./color-config";
import { events } from "./events";

const BAND_COUNT = 16;
const MIN_FREQ = 40; // Hz
const MAX_FREQ = 12000; // Hz

export class spectrumCanvas {
	public _EventUpdateCanvas: (left: Float32Array, right?: Float32Array) => void;
	private _cachedBgColor: string = "";
	private _cachedLColor: string = "";
	private _cachedRColor: string = "";

	// Precompute Goertzel coefficients for each band
	private readonly _bandFreqs: number[] = [];
	private readonly _bandCoefs: { cos: number; sin: number }[][] = [];
	private _sampleRate = 48000;
	private _lastBufferSize = 0;

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

			// Clear with cached background color
			ctx.fillStyle = this._cachedBgColor;
			ctx.fillRect(0, 0, w, h);

			const sampleCount = directlinkL.length;
			if (sampleCount < 4) return;

			// Recompute coefficients if buffer size changed
			if (sampleCount !== this._lastBufferSize) {
				this._initBands(this._sampleRate, sampleCount);
				this._lastBufferSize = sampleCount;
			}

			// Mix to mono
			const mono = new Float32Array(sampleCount);
			for (let i = 0; i < sampleCount; i++) {
				mono[i] = (directlinkL[i] + directlinkR[i]) * 0.5;
			}

			// Compute spectrum via Goertzel for each band
			const magnitudes = new Float32Array(BAND_COUNT);
			let maxMag = 0.0001;
			for (let b = 0; b < BAND_COUNT; b++) {
				const coefs = this._bandCoefs[b];
				let re = 0;
				let im = 0;
				for (let n = 0; n < sampleCount; n++) {
					re += mono[n] * coefs[n].cos;
					im -= mono[n] * coefs[n].sin;
				}
				const mag = Math.sqrt(re * re + im * im) / sampleCount;
				magnitudes[b] = Math.sqrt(mag);
				if (magnitudes[b] > maxMag) maxMag = magnitudes[b];
			}

			// Normalize magnitudes to 0..1
			const norms = new Float32Array(BAND_COUNT);
			for (let b = 0; b < BAND_COUNT; b++) {
				norms[b] = Math.min(1, magnitudes[b] / maxMag);
			}

			// Map bands to x positions across the canvas width
			const bandWidth = w / (BAND_COUNT - 1);
			const ys: number[] = new Array(BAND_COUNT);
			for (let b = 0; b < BAND_COUNT; b++) {
				ys[b] = h * 0.5 - norms[b] * h * 0.45;
			}

			// Draw smooth bezier curve through the band points
			// Using quadraticCurveTo with midpoints for smooth interpolation
			ctx.beginPath();
			ctx.moveTo(0, h * 0.5);

			// First point
			ctx.lineTo(0, ys[0]);

			// Smooth curve through all points using midpoint quadratic method
			for (let b = 0; b < BAND_COUNT - 1; b++) {
				const x1 = b * bandWidth;
				const x2 = (b + 1) * bandWidth;
				const midX = (x1 + x2) * 0.5;
				const midY = (ys[b] + ys[b + 1]) * 0.5;
				ctx.quadraticCurveTo(x1, ys[b], midX, midY);
			}
			// Last segment
			ctx.quadraticCurveTo((BAND_COUNT - 1) * bandWidth, ys[BAND_COUNT - 1], w, ys[BAND_COUNT - 1]);

			// Close the path along the top for fill
			ctx.lineTo(w, h * 0.5);
			ctx.lineTo(0, h * 0.5);
			ctx.closePath();

			// Fill with vertical gradient: L color at curve peak, fading to bg at center
			const grad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
			grad.addColorStop(0, this._cachedLColor);
			grad.addColorStop(1, this._cachedBgColor);
			ctx.fillStyle = grad;
			ctx.fill();

			// Stroke the curve line on top
			ctx.beginPath();
			ctx.moveTo(0, ys[0]);
			for (let b = 0; b < BAND_COUNT - 1; b++) {
				const x1 = b * bandWidth;
				const x2 = (b + 1) * bandWidth;
				const midX = (x1 + x2) * 0.5;
				const midY = (ys[b] + ys[b + 1]) * 0.5;
				ctx.quadraticCurveTo(x1, ys[b], midX, midY);
			}
			ctx.quadraticCurveTo((BAND_COUNT - 1) * bandWidth, ys[BAND_COUNT - 1], w, ys[BAND_COUNT - 1]);
			ctx.strokeStyle = this._cachedLColor;
			ctx.lineWidth = scale;
			ctx.lineJoin = "round";
			ctx.lineCap = "round";
			ctx.stroke();

			// Mirrored reflection below center line (faint)
			const mirrorYs: number[] = new Array(BAND_COUNT);
			for (let b = 0; b < BAND_COUNT; b++) {
				mirrorYs[b] = h - ys[b];
			}

			ctx.beginPath();
			ctx.moveTo(0, h * 0.5);
			ctx.lineTo(0, mirrorYs[0]);
			for (let b = 0; b < BAND_COUNT - 1; b++) {
				const x1 = b * bandWidth;
				const x2 = (b + 1) * bandWidth;
				const midX = (x1 + x2) * 0.5;
				const midY = (mirrorYs[b] + mirrorYs[b + 1]) * 0.5;
				ctx.quadraticCurveTo(x1, mirrorYs[b], midX, midY);
			}
			ctx.quadraticCurveTo((BAND_COUNT - 1) * bandWidth, mirrorYs[BAND_COUNT - 1], w, mirrorYs[BAND_COUNT - 1]);
			ctx.lineTo(w, h * 0.5);
			ctx.closePath();

			// Fill mirror with R color gradient at low opacity
			const mirrorGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
			mirrorGrad.addColorStop(0, this._cachedBgColor);
			mirrorGrad.addColorStop(1, this._cachedRColor);
			ctx.fillStyle = mirrorGrad;
			ctx.globalAlpha = 0.3;
			ctx.fill();
			ctx.globalAlpha = 1.0;

			// Stroke mirror curve faintly
			ctx.beginPath();
			ctx.moveTo(0, mirrorYs[0]);
			for (let b = 0; b < BAND_COUNT - 1; b++) {
				const x1 = b * bandWidth;
				const x2 = (b + 1) * bandWidth;
				const midX = (x1 + x2) * 0.5;
				const midY = (mirrorYs[b] + mirrorYs[b + 1]) * 0.5;
				ctx.quadraticCurveTo(x1, mirrorYs[b], midX, midY);
			}
			ctx.quadraticCurveTo((BAND_COUNT - 1) * bandWidth, mirrorYs[BAND_COUNT - 1], w, mirrorYs[BAND_COUNT - 1]);
			ctx.strokeStyle = this._cachedRColor;
			ctx.lineWidth = scale;
			ctx.globalAlpha = 0.3;
			ctx.stroke();
			ctx.globalAlpha = 1.0;
		};

		events.listen("spectrumUpdate", this._EventUpdateCanvas);
		events.listen("themeChange", () => this._updateCachedColors());
	}

	private _initBands(sampleRate: number, bufferSize: number): void {
		this._sampleRate = sampleRate;
		this._bandFreqs.length = 0;
		this._bandCoefs.length = 0;

		const logMin = Math.log(MIN_FREQ);
		const logMax = Math.log(MAX_FREQ);

		for (let b = 0; b < BAND_COUNT; b++) {
			const t = b / (BAND_COUNT - 1);
			const freq = Math.exp(logMin + t * (logMax - logMin));
			this._bandFreqs.push(freq);

			const omega = (2 * Math.PI * freq) / sampleRate;
			const coefs: { cos: number; sin: number }[] = new Array(bufferSize);
			for (let n = 0; n < bufferSize; n++) {
				coefs[n] = { cos: Math.cos(omega * n), sin: Math.sin(omega * n) };
			}
			this._bandCoefs.push(coefs);
		}
	}

	private _updateCachedColors(): void {
		this._cachedBgColor = ColorConfig.getComputed("--editor-background") || "black";
		this._cachedLColor = ColorConfig.getComputed("--spectrum-line-L") || "white";
		this._cachedRColor = ColorConfig.getComputed("--spectrum-line-R") || "rgba(119,68,255,0.99)";
	}
}