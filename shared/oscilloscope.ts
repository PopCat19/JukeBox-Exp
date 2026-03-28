// Oscilloscope
//
// Purpose: Renders real-time audio waveform visualization on a canvas element
//
// This module:
// - Draws left and right channel waveforms as pixel columns
// - Listens for oscilloscope update events from the synth engine
// - Supports configurable canvas scaling

import { ColorConfig } from "../editor/rendering/color-config";
import { events } from "./events";

export class oscilloscopeCanvas {
  public _EventUpdateCanvas: Function;

  constructor(public readonly canvas: HTMLCanvasElement, readonly scale: number = 1) {
    this._EventUpdateCanvas = function(directlinkL: Float32Array, directlinkR?: Float32Array): void {
      if (directlinkR) {
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

        ctx.fillStyle = ColorConfig.getComputed("--editor-background");
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = ColorConfig.getComputed("--oscilloscope-line-L");
        for (let i: number = directlinkL.length - 1; i >= directlinkL.length - 1 - (canvas.width / scale); i--) {
          const x = i - (directlinkL.length - 1) + (canvas.width / scale);
          const yl = directlinkL[i] * (canvas.height / scale / 2) + (canvas.height / scale / 2);

          ctx.fillRect((x - 1) * scale, (yl - 1) * scale, 1 * scale, 1.5 * scale);
          if (x == 0) break;
        }
        ctx.fillStyle = ColorConfig.getComputed("--oscilloscope-line-R"); // less ctx style calls = less expensive??? also avoiding uncached colors
        for (let i: number = directlinkR.length - 1; i >= directlinkR.length - 1 - (canvas.width / scale); i--) {
          const x = i - (directlinkR.length - 1) + (canvas.width / scale);
          const yr = directlinkR[i] * (canvas.height / scale / 2) + (canvas.height / scale / 2);

          ctx.fillRect((x - 1) * scale, (yr - 1) * scale, 1 * scale, 1.5 * scale);
          if (x == 0) break;
        }
      }
    };
    events.listen("oscilloscopeUpdate", this._EventUpdateCanvas);
  }
}
