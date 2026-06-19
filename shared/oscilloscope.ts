// Oscilloscope
//
// Purpose: Renders real-time audio as a mini spectrum analyzer (corrscope-style)
//
// This module:
// - Computes a 16-band logarithmic frequency spectrum from the mono mix
// - Draws vertical bars on a dark background
// - Always clean and readable regardless of project size or channel count
// - Complements the existing ChannelVolumeVisualizerPrompt (volume per channel)

import { ColorConfig } from "./color-config";
import { events } from "./events";

const BAND_COUNT = 16;
const MIN_FREQ = 40; // Hz
const MAX_FREQ = 12000; // Hz

export class oscilloscopeCanvas {
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
			let maxMag = 0.0001; // avoid div-by-zero
			for (let b = 0; b < BAND_COUNT; b++) {
				const coefs = this._bandCoefs[b];
				let re = 0;
				let im = 0;
				for (let n = 0; n < sampleCount; n++) {
					const c = coefs[n];
					re += mono[n] * c.cos;
					im -= mono[n] * c.sin;
				}
				// Magnitude, normalized by buffer size, with sqrt for perceptual scaling
				const mag = Math.sqrt(re * re + im * im) / sampleCount;
				magnitudes[b] = Math.sqrt(mag); // sqrt scaling for better visual range
				if (magnitudes[b] > maxMag) maxMag = magnitudes[b];
			}

			// Draw bars
			const barWidth = w / BAND_COUNT;
			const barGap = Math.max(1, barWidth * 0.15);
			const innerW = barWidth - barGap;

			for (let b = 0; b < BAND_COUNT; b++) {
				const normMag = Math.min(1, magnitudes[b] / maxMag);
				const barH = normMag * h;
				const x = b * barWidth + barGap * 0.5;
				const y = h - barH;

				// Gradient: L color at top, R color at bottom for depth
				ctx.fillStyle = this._cachedLColor;
				ctx.globalAlpha = 0.4 + normMag * 0.6; // brighter bands are more opaque
				ctx.fillRect(x, y, innerW, barH);
			}
			ctx.globalAlpha = 1.0;

			// Draw faint center line for reference
			ctx.strokeStyle = this._cachedRColor;
			ctx.globalAlpha = 0.2;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(0, h - 1);
			ctx.lineTo(w, h - 1);
			ctx.stroke();
			ctx.globalAlpha = 1.0;
		};

		events.listen("oscilloscopeUpdate", this._EventUpdateCanvas);
		events.listen("themeChange", () => this._updateCachedColors());
	}

	private _initBands(sampleRate: number, bufferSize: number): void {
		this._sampleRate = sampleRate;
		this._bandFreqs.length = 0;
		this._bandCoefs.length = 0;

		const logMin = Math.log(MIN_FREQ);
		const logMax = Math.log(MAX_FREQ);

		for (let b = 0; b < BAND_COUNT; b++) {
			// Logarithmic frequency mapping
			const t = b / (BAND_COUNT - 1);
			const freq = Math.exp(logMin + t * (logMax - logMin));
			this._bandFreqs.push(freq);

			// Precompute Goertzel coefficients
			const coefs: { cos: number; sin: number }[] = new Array(bufferSize);
			const omega = (2 * Math.PI * freq) / sampleRate;
			for (let n = 0; n < bufferSize; n++) {
				coefs[n] = { cos: Math.cos(omega * n), sin: Math.sin(omega * n) };
			}
			this._bandCoefs.push(coefs);
		}
	}

	private _updateCachedColors(): void {
		this._cachedBgColor = ColorConfig.getComputed("--editor-background") || "black";
		this._cachedLColor = ColorConfig.getComputed("--oscilloscope-line-L") || "white";
		this._cachedRColor = ColorConfig.getComputed("--oscilloscope-line-R") || "rgba(119,68,255,0.99)";
	}
}