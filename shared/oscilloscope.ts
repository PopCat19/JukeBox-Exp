// Oscilloscope
//
// Purpose: Renders real-time audio waveform in corrscope style
//
// This module:
// - Draws a single mono waveform trace (L+R mixed) as a continuous line path
// - Centered vertically, fills canvas width
// - Thin bright line on dark background (corrscope aesthetic)
// - Listens for oscilloscope update events from the synth engine

import { ColorConfig } from "./color-config";
import { events } from "./events";

export class oscilloscopeCanvas {
	public _EventUpdateCanvas: (left: Float32Array, right?: Float32Array) => void;
	private _cachedBgColor: string = "";
	private _cachedLColor: string = "";
	private _cachedRColor: string = "";

	constructor(
		public readonly canvas: HTMLCanvasElement,
		readonly scale: number = 1,
	) {
		this._updateCachedColors();

		this._EventUpdateCanvas = (directlinkL: Float32Array, directlinkR?: Float32Array): void => {
			if (!directlinkR) return;

			const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
			const w = canvas.width;
			const h = canvas.height;

			// Clear with cached background color
			ctx.fillStyle = this._cachedBgColor;
			ctx.fillRect(0, 0, w, h);

			const halfH = h / 2;
			const sampleCount = directlinkL.length;
			if (sampleCount < 2) return;

			// Use the most recent samples that fit the canvas width
			const visibleSamples = Math.min(sampleCount, w);
			const startIdx = sampleCount - visibleSamples;

			// Draw the waveform as a continuous line path (corrscope style)
			// Mix L and R to mono for a single clean trace
			ctx.strokeStyle = this._cachedLColor;
			ctx.lineWidth = scale;
			ctx.lineJoin = "round";
			ctx.lineCap = "round";
			ctx.beginPath();

			for (let i = 0; i < visibleSamples; i++) {
				const sampleIdx = startIdx + i;
				// Mix to mono: average L and R
				const mono = (directlinkL[sampleIdx] + directlinkR[sampleIdx]) * 0.5;
				const x = (i / (visibleSamples - 1)) * w;
				const y = halfH - mono * halfH;
				if (i === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}

			ctx.stroke();

			// Draw a faint R-color trace offset slightly for stereo hint
			ctx.strokeStyle = this._cachedRColor;
			ctx.globalAlpha = 0.35;
			ctx.lineWidth = scale;
			ctx.beginPath();

			for (let i = 0; i < visibleSamples; i++) {
				const sampleIdx = startIdx + i;
				// Use right channel only for the secondary trace
				const r = directlinkR[sampleIdx];
				const x = (i / (visibleSamples - 1)) * w;
				const y = halfH - r * halfH;
				if (i === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}

			ctx.stroke();
			ctx.globalAlpha = 1.0;
		};

		events.listen("oscilloscopeUpdate", this._EventUpdateCanvas);

		// Listen for theme changes to update cached colors
		events.listen("themeChange", () => this._updateCachedColors());
	}

	private _updateCachedColors(): void {
		this._cachedBgColor = ColorConfig.getComputed("--editor-background") || "black";
		this._cachedLColor = ColorConfig.getComputed("--oscilloscope-line-L") || "white";
		this._cachedRColor = ColorConfig.getComputed("--oscilloscope-line-R") || "rgba(119,68,255,0.99)";
	}
}