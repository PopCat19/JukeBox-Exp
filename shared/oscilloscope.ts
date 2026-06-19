// Oscilloscope
//
// Purpose: Renders real-time audio as a vectorscope (Lissajous X-Y plot)
//
// This module:
// - Plots left channel as X, right channel as Y (Lissajous figure)
// - Shows stereo correlation: mono = diagonal line, wide = circle, out-of-phase = opposite diagonal
// - Listens for oscilloscope update events from the synth engine
// - Uses line-segment rendering for smooth waveform trails

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

			// Center of the canvas
			const cx = w / 2;
			const cy = h / 2;

			// Scale factor: fit the Lissajous pattern within the canvas.
			// Use the smaller dimension so the pattern doesn't clip.
			const radius = Math.min(cx, cy) - 1;

			// Draw faint center crosshair for reference
			ctx.strokeStyle = this._cachedBgColor;
			ctx.globalAlpha = 0.3;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(cx, 0);
			ctx.lineTo(cx, h);
			ctx.moveTo(0, cy);
			ctx.lineTo(w, cy);
			ctx.stroke();
			ctx.globalAlpha = 1.0;

			// Draw Lissajous figure: left = X, right = Y
			// Use the most recent samples to show current state
			const sampleCount = directlinkL.length;
			if (sampleCount < 2) return;

			// Draw a faint R-color echo behind the main L-color line for depth
			ctx.strokeStyle = this._cachedRColor;
			ctx.globalAlpha = 0.3;
			ctx.lineWidth = scale + 1;
			ctx.beginPath();

			let prevX = cx + directlinkL[0] * radius;
			let prevY = cy + directlinkR[0] * radius;
			ctx.moveTo(prevX, prevY);

			for (let i = 1; i < sampleCount; i++) {
				const x = cx + directlinkL[i] * radius;
				const y = cy + directlinkR[i] * radius;
				ctx.lineTo(x, y);
				prevX = x;
				prevY = y;
			}

			ctx.stroke();

			// Main L-color line on top
			ctx.globalAlpha = 1.0;
			ctx.strokeStyle = this._cachedLColor;
			ctx.lineWidth = scale;
			ctx.beginPath();
			ctx.moveTo(cx + directlinkL[0] * radius, cy + directlinkR[0] * radius);
			for (let i = 1; i < sampleCount; i++) {
				ctx.lineTo(cx + directlinkL[i] * radius, cy + directlinkR[i] * radius);
			}
			ctx.stroke();
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