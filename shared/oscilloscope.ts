// Oscilloscope
//
// Purpose: Renders real-time audio waveform visualization on a canvas element
//
// This module:
// - Draws left and right channel waveforms as pixel columns
// - Listens for oscilloscope update events from the synth engine
// - Supports configurable canvas scaling

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
		// Pre-cache colors on creation
		this._updateCachedColors();

		this._EventUpdateCanvas = (directlinkL: Float32Array, directlinkR?: Float32Array): void => {
			if (directlinkR) {
				const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
				const w = canvas.width;
				const h = canvas.height;

				// Clear with cached background color
				ctx.fillStyle = this._cachedBgColor;
				ctx.fillRect(0, 0, w, h);

				const halfH = h / scale / 2;
				const sampleCount = Math.min(directlinkL.length, Math.floor(w / scale));
				const startIdx = directlinkL.length - sampleCount;

				// Draw left channel
				ctx.fillStyle = this._cachedLColor;
				for (let i = startIdx; i < directlinkL.length; i++) {
					const x = (i - startIdx) * scale;
					const y = directlinkL[i] * halfH + halfH;
					ctx.fillRect(x, (y - 1) * scale, scale, scale * 1.5);
				}

				// Draw right channel
				ctx.fillStyle = this._cachedRColor;
				for (let i = startIdx; i < directlinkR.length; i++) {
					const x = (i - startIdx) * scale;
					const y = directlinkR[i] * halfH + halfH;
					ctx.fillRect(x, (y - 1) * scale, scale, scale * 1.5);
				}
			}
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
