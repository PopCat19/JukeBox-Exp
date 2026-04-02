// song-editor-integration-example.ts
//
// Purpose: Example of integrating PlaybackControls into song-editor.ts
//
// This module demonstrates how to replace inline playback controls
// with the new PlaybackControls component

import { PlaybackControls } from "./components/playback-controls";
import { SongDocument } from "./song-document";

// BEFORE (Lines 268-363 in song-editor.ts):
// =====================================================
// private readonly _playButton: HTMLButtonElement = button(
//   {
//     class: "playButton",
//     type: "button",
//     title: "Play (Space)",
//   },
//   span("Play"),
// );
// private readonly _pauseButton: HTMLButtonElement = button(
//   {
//     class: "pauseButton",
//     style: "display: none;",
//     type: "button",
//     title: "Pause (Space)",
//   },
//   "Pause",
// );
// private readonly _recordButton: HTMLButtonElement = button(
//   {
//     class: "recordButton",
//     style: "display: none;",
//     type: "button",
//     title: "Record (Ctrl+Space)",
//   },
//   span("Record"),
// );
// private readonly _stopButton: HTMLButtonElement = button(
//   {
//     class: "stopButton",
//     style: "display: none;",
//     type: "button",
//     title: "Stop Recording (Space)",
//   },
//   "Stop Recording",
// );
// private readonly _prevBarButton: HTMLButtonElement = iconButton("prevBarButton", {
//   title: "Previous Bar (left bracket)",
// });
// private readonly _nextBarButton: HTMLButtonElement = iconButton("nextBarButton", {
//   title: "Next Bar (right bracket)",
// });
// private readonly _volumeSlider: Slider = rangeSlider(this.doc, null, 0, 75, 50, { style: "width: 5em; flex-grow: 1; margin: 0;", title: "main volume" });
// private readonly _outVolumeBarBg: SVGRectElement = SVG.rect({
//   "pointer-events": "none",
//   width: "90%",
//   height: "50%",
//   x: "5%",
//   y: "25%",
//   fill: ColorConfig.uiWidgetBackground,
// });
// private readonly _outVolumeBar: SVGRectElement = SVG.rect({
//   "pointer-events": "none",
//   height: "50%",
//   width: "0%",
//   x: "5%",
//   y: "25%",
//   fill: "url('#volumeGrad2')",
// });
// private readonly _outVolumeCap: SVGRectElement = SVG.rect({
//   "pointer-events": "none",
//   width: "2px",
//   height: "50%",
//   x: "5%",
//   y: "25%",
//   fill: ColorConfig.uiWidgetFocus,
// });
// private readonly _stop1: SVGStopElement = SVG.stop({ "stop-color": "lime", offset: "60%" });
// private readonly _stop2: SVGStopElement = SVG.stop({ "stop-color": "orange", offset: "90%" });
// private readonly _stop3: SVGStopElement = SVG.stop({ "stop-color": "red", offset: "100%" });
// private readonly _gradient: SVGGradientElement = SVG.linearGradient(
//   { id: "volumeGrad2", gradientUnits: "userSpaceOnUse" },
//   this._stop1,
//   this._stop2,
//   this._stop3,
// );
// private readonly _defs: SVGDefsElement = SVG.defs({}, this._gradient);
// private readonly _volumeBarContainer: SVGSVGElement = SVG.svg(
//   {
//     style: `touch-action: none; overflow: visible; margin: auto; max-width: 20vw;`,
//     width: "160px",
//     height: "100%",
//     preserveAspectRatio: "none",
//     viewBox: "0 0 160 12",
//   },
//   this._defs,
//   this._outVolumeBarBg,
//   this._outVolumeBar,
//   this._outVolumeCap,
// );
// private readonly _volumeBarBox: HTMLDivElement = div(
//   {
//     class: "playback-volume-bar",
//     style: "height: 12px; align-self: center;",
//   },
//   this._volumeBarContainer,
// );
// 
// // Total: ~95 lines

// AFTER (Using PlaybackControls component):
// ==========================================

export class SongEditorExample {
  public readonly doc: SongDocument;
  
  // Single line instead of 95 lines!
  private readonly _playbackControls: PlaybackControls;
  
  constructor() {
    this.doc = new SongDocument();
    
    // Create playback controls (replaces 95 lines)
    this._playbackControls = new PlaybackControls(this.doc);
    
    // Wire up event handlers
    this._setupPlaybackEventHandlers();
    
    // Add to DOM
    this._setupLayout();
  }
  
  private _setupPlaybackEventHandlers(): void {
    // Access buttons via component
    this._playbackControls.playButton.addEventListener("click", () => {
      this._play();
    });
    
    this._playbackControls.pauseButton.addEventListener("click", () => {
      this._pause();
    });
    
    this._playbackControls.recordButton.addEventListener("click", () => {
      this._record();
    });
    
    this._playbackControls.stopButton.addEventListener("click", () => {
      this._stop();
    });
    
    this._playbackControls.prevBarButton.addEventListener("click", () => {
      this._prevBar();
    });
    
    this._playbackControls.nextBarButton.addEventListener("click", () => {
      this._nextBar();
    });
    
    // Volume slider is already wired up internally
    // Just add custom volume visualization update
    this._playbackControls.volumeSlider.input.addEventListener("input", () => {
      this._updateVolumeBar();
    });
  }
  
  private _setupLayout(): void {
    // Create the editor layout using component
    const editorContainer = div(
      { class: "beepboxEditor" },
      // ... pattern area, track area, etc.
      div(
        { class: "settings-area" },
        // Add playback controls
        this._playbackControls.playButton,
        this._playbackControls.pauseButton,
        this._playbackControls.recordButton,
        this._playbackControls.stopButton,
        this._playbackControls.prevBarButton,
        this._playbackControls.nextBarButton,
        this._playbackControls.volumeSlider.container,
        this._playbackControls.volumeBarBox,
      ),
    );
    
    document.body.appendChild(editorContainer);
  }
  
  private _play(): void {
    // Play logic
    this._playbackControls.playButton.style.display = "none";
    this._playbackControls.pauseButton.style.display = "";
  }
  
  private _pause(): void {
    // Pause logic
    this._playbackControls.playButton.style.display = "";
    this._playbackControls.pauseButton.style.display = "none";
  }
  
  private _record(): void {
    // Record logic
    this._playbackControls.playButton.style.display = "none";
    this._playbackControls.recordButton.style.display = "none";
    this._playbackControls.stopButton.style.display = "";
  }
  
  private _stop(): void {
    // Stop logic
    this._playbackControls.playButton.style.display = "";
    this._playbackControls.recordButton.style.display = "";
    this._playbackControls.stopButton.style.display = "none";
  }
  
  private _prevBar(): void {
    // Previous bar logic
  }
  
  private _nextBar(): void {
    // Next bar logic
  }
  
  private _updateVolumeBar(): void {
    // Update volume visualization
    const volume = this._playbackControls.volumeSlider.input.value;
    const percent = (parseFloat(volume) / 75) * 100;
    this._playbackControls.setVolumeBar(percent);
  }
}

// SUMMARY
// =======
// Lines saved: ~95 lines
// Quality: Better encapsulation
// Testability: Component can be tested independently
// Maintainability: Changes to playback UI only affect PlaybackControls
// 
// Pattern: Replace inline creation with component import
// Complexity: Low (simple property access)
// Risk: Low (component already tested)
