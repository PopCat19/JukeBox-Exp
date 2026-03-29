// ChannelVolumeVisualizerPrompt
//
// Purpose: Modal popup displaying per-channel gain information with live updates
//
// This module:
// - Shows output volume level (same as editor volume bar)
// - Displays per-channel live output volume bars
// - Updates in real-time during playback

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "../song-document";
import { SongEditor } from "../song-editor";
import { ColorConfig } from "../rendering/color-config";
import { BasePrompt } from "./base-prompt";

const { div, h2, h3, span, button } = HTML;
const { svg, defs, linearGradient, stop, rect } = SVG;

export class ChannelVolumeVisualizerPrompt extends BasePrompt {
  private _animationId: number = 0;

  // Volume bar elements
  private readonly _outVolumeBar: SVGRectElement = rect({
    "pointer-events": "none",
    height: "50%",
    width: "0%",
    x: "5%",
    y: "25%",
    fill: "url('#channelVolumeVisualizerGrad')",
  });
  private readonly _outVolumeCap: SVGRectElement = rect({
    "pointer-events": "none",
    width: "2px",
    height: "50%",
    x: "5%",
    y: "25%",
    fill: "var(--ui-widget-focus, #777)",
  });
  private readonly _volumeBarContainer: SVGSVGElement = svg(
    {
      style: "touch-action: none; overflow: visible; margin: auto;",
      width: "160px",
      height: "12px",
      preserveAspectRatio: "none",
      viewBox: "0 0 160 12",
    },
    defs(
      {},
      linearGradient(
        { id: "channelVolumeVisualizerGrad", gradientUnits: "userSpaceOnUse" },
        stop({ "stop-color": "lime", offset: "60%" }),
        stop({ "stop-color": "orange", offset: "90%" }),
        stop({ "stop-color": "red", offset: "100%" }),
      ),
    ),
    rect({
      "pointer-events": "none",
      width: "90%",
      height: "50%",
      x: "5%",
      y: "25%",
      fill: "var(--ui-widget-background, #444)",
    }),
    this._outVolumeBar,
    this._outVolumeCap,
  );

  private readonly _contentContainer: HTMLDivElement = div({
    style: "display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; align-content: start;",
  });

  // Store channel volume bar elements for live updates
  private readonly _channelVolumeBars: Map<number, SVGRectElement> = new Map();
  private readonly _channelVolumeCaps: Map<number, SVGRectElement> = new Map();
  private readonly _channelHistoricCaps: Map<number, { cap: number; timer: number }> = new Map();
  private readonly _channelLastWidths: Map<number, number> = new Map();
  private readonly _channelLastCaps: Map<number, number> = new Map();
  private readonly _channelDbLabels: Map<number, HTMLSpanElement> = new Map();
  private readonly _channelDivs: Map<number, HTMLDivElement> = new Map();
  // Store instrument spans for live updates: key is "channelIndex-instrumentIndex"
  private readonly _instrumentSpans: Map<string, HTMLSpanElement> = new Map();

  private readonly _playPauseButton: HTMLButtonElement = button({
    style: "font-size: 11px; padding: 4px 8px;",
  }, "▶ Play");

  private _historicVolumeCap: number = 0;
  private _historicTimer: number = 0;
  private _lastVolumeWidth: number = -1;
  private _lastCapX: number = -1;

  // Running averages for dB
  private _masterVolumeSum: number = 0;
  private _masterSampleCount: number = 0;
  private readonly _channelVolumeSums: Map<number, number> = new Map();
  private readonly _channelSampleCounts: Map<number, number> = new Map();
  private _masterMinDb: number = Infinity;
  private _masterMaxDb: number = -Infinity;
  private readonly _channelMinDb: Map<number, number> = new Map();
  private readonly _channelMaxDb: Map<number, number> = new Map();
  private readonly _masterDbPeakLabel: HTMLSpanElement = span({
    style: "color: var(--primary-text); font-size: 11px; font-family: monospace;",
  }, "Peak: -inf dB");
  private readonly _masterDbAvgLabel: HTMLSpanElement = span({
    style: "color: var(--secondary-text); font-size: 11px; font-family: monospace;",
  }, "Avg: -inf dB");
  private readonly _masterDbMinLabel: HTMLSpanElement = span({
    style: "color: var(--secondary-text); font-size: 11px; font-family: monospace;",
  }, "Min: -inf dB");
  private readonly _masterDbMaxLabel: HTMLSpanElement = span({
    style: "color: var(--secondary-text); font-size: 11px; font-family: monospace;",
  }, "Max: -inf dB");
  private readonly _currentBarLabel: HTMLSpanElement = span({
    style: "color: var(--primary-text); font-size: 11px; font-family: monospace; margin-top: 12px;",
  }, "Bar: 1");

  public container: HTMLDivElement = div(
    { class: "prompt noSelection", style: "width: 600px; height: auto; max-height: 80vh; display: flex; flex-direction: column; outline: none;", tabindex: "0" },
    h2({ style: "margin: 12px 12px 0px 12px; text-align: center;" }, "Channel Volume Visualizer"),
    div(
      { style: "display: flex; flex: 1; min-height: 0; gap: 12px;" },
      // Left pane: Master controls
      div(
        { style: "flex: 0 0 180px; display: flex; flex-direction: column; padding: 4px 12px 12px 12px; border-right: 1px solid var(--ui-widget-background);" },
        h3({ style: "margin-top: 0px; margin-bottom: 12px;" }, "Master"),
        this._currentBarLabel,
        div({ style: "display: flex; flex-direction: column; align-items: center; margin-bottom: 8px; margin-top: 8px;" }, this._volumeBarContainer),
        this._masterDbPeakLabel,
        this._masterDbAvgLabel,
        this._masterDbMinLabel,
        this._masterDbMaxLabel,
        div({ style: "margin-top: 8px;" }, this._playPauseButton),
        div(
          { style: "margin-top: 16px; font-size: 9px; color: var(--secondary-text); border-top: 1px solid var(--ui-widget-background); padding-top: 8px; white-space: nowrap;" },
          div({ title: "Pattern number" }, span({ style: "font-weight: bold;" }, "P#"), " = Pattern"),
          div({ title: "Instrument number" }, span({ style: "font-weight: bold;" }, "I#"), " = Instrument"),
          div({ title: "Decibel - volume measurement" }, span({ style: "font-weight: bold;" }, "dB"), " = Decibel"),
          div({ title: "Highest volume level" }, span({ style: "font-weight: bold;" }, "Pk"), " = Peak"),
          div({ title: "Average volume level" }, span({ style: "font-weight: bold;" }, "A"), " = Average"),
          div({ title: "Volume range" }, span({ style: "font-weight: bold;" }, "min/max"), " = Range"),
        ),
      ),
      // Right pane: Channels
      div(
        { style: "flex: 1; display: flex; flex-direction: column; min-height: 0; padding: 4px 12px 12px 12px;" },
        h3({ style: "margin-top: 0px; margin-bottom: 8px;" }, "Channels"),
        this._contentContainer,
      ),
    ),
    this._cancelButton,
  );

  constructor(doc: SongDocument, private _songEditor: SongEditor) {
    super(doc);
    this.buildTitlebar();
    this._animate = this._animate.bind(this);
    this._onDocChange = this._renderChannelList.bind(this);
    this._doc.notifier.watch(this._onDocChange);
    this._renderChannelList();
    this._animationId = window.requestAnimationFrame(this._animate);
    this._playPauseButton.addEventListener("click", this._togglePlayPause);
    setTimeout(() => this.container.focus());
  }

  private _togglePlayPause = (): void => {
    if (this._doc.synth.playing) {
      this._doc.performance.pause();
    } else {
      this._doc.performance.play();
    }
    this._updatePlayPauseButton();
  };

  private _updatePlayPauseButton = (): void => {
    this._playPauseButton.textContent = this._doc.synth.playing ? "⏸ Pause" : "▶ Play";
  };

  public override whenKeyPressed = (event: KeyboardEvent): void => {
    if (event.key === " ") {
      event.preventDefault();
      this._togglePlayPause();
    }
  };

  protected override _saveChanges(): void {
    // No changes to save
  }

  public override cleanUp = (): void => {
    super.cleanUp();
    this._doc.notifier.unwatch(this._onDocChange);
    if (this._animationId !== 0) {
      window.cancelAnimationFrame(this._animationId);
      this._animationId = 0;
    }
    while (this._contentContainer.firstChild !== null) {
      this._contentContainer.removeChild(this._contentContainer.firstChild);
    }
    this._channelVolumeBars.clear();
    this._channelVolumeCaps.clear();
    this._channelHistoricCaps.clear();
    this._channelLastWidths.clear();
    this._channelLastCaps.clear();
    this._channelDbLabels.clear();
    this._channelDivs.clear();
    this._instrumentSpans.clear();
    this._playPauseButton.removeEventListener("click", this._togglePlayPause);
    this._songEditor.muteEditor.setHoveredChannel(-1);
    this._songEditor.trackEditor.setHoveredChannel(-1);
    // Invalidate cached bounding rects in other components
    // Use setTimeout to ensure DOM has settled after prompt removal
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("scroll"));
    }, 0);
  };

  private _onDocChange!: () => void;

  private _animate = (): void => {
    // Update play/pause button state
    this._updatePlayPauseButton();

    // Update current bar
    const currentBar = Math.floor(this._doc.synth.playhead);
    this._currentBarLabel.textContent = `Bar: ${currentBar + 1}`;

    // Update master volume bar
    this._historicTimer--;
    if (this._historicTimer <= 0) {
      this._historicVolumeCap -= 0.03;
    }
    if (this._doc.song.outVolumeCap > this._historicVolumeCap) {
      this._historicVolumeCap = this._doc.song.outVolumeCap;
      this._historicTimer = 50;
    }

    const volumeWidth = Math.min(144, this._doc.song.outVolumeCap * 144);
    const capX = 8 + Math.min(144, this._historicVolumeCap * 144);
    if (volumeWidth !== this._lastVolumeWidth) {
      this._lastVolumeWidth = volumeWidth;
      this._outVolumeBar.setAttribute("width", "" + volumeWidth);
    }
    if (capX !== this._lastCapX) {
      this._lastCapX = capX;
      this._outVolumeCap.setAttribute("x", "" + capX);
    }

    // Update master dB labels
    const masterPeakDb = this._historicVolumeCap > 0 ? 20 * Math.log10(this._historicVolumeCap) : -Infinity;
    this._masterDbPeakLabel.textContent = isFinite(masterPeakDb) ? `Peak: ${masterPeakDb.toFixed(1)} dB` : "Peak: -inf dB";

    // Update average, min, max
    if (this._doc.song.outVolumeCap > 0) {
      this._masterVolumeSum += this._doc.song.outVolumeCap;
      this._masterSampleCount++;

      const currentDb = 20 * Math.log10(this._doc.song.outVolumeCap);
      if (isFinite(currentDb)) {
        if (currentDb < this._masterMinDb) this._masterMinDb = currentDb;
        if (currentDb > this._masterMaxDb) this._masterMaxDb = currentDb;
      }
    }
    if (this._masterSampleCount > 0) {
      const avg = this._masterVolumeSum / this._masterSampleCount;
      const avgDb = avg > 0 ? 20 * Math.log10(avg) : -Infinity;
      this._masterDbAvgLabel.textContent = isFinite(avgDb) ? `Avg: ${avgDb.toFixed(1)} dB` : "Avg: -inf dB";

      const minDb = isFinite(this._masterMinDb) ? this._masterMinDb.toFixed(1) : "-inf";
      const maxDb = isFinite(this._masterMaxDb) ? this._masterMaxDb.toFixed(1) : "-inf";
      this._masterDbMinLabel.textContent = `Min: ${minDb} dB`;
      this._masterDbMaxLabel.textContent = `Max: ${maxDb} dB`;
    }

    // Update per-channel volume bars
    const synth = this._doc.synth;
    for (const [channelIndex, bar] of this._channelVolumeBars) {
      const channelState = synth.channels[channelIndex];
      if (!channelState) continue;

      let historic = this._channelHistoricCaps.get(channelIndex);
      if (!historic) {
        historic = { cap: 0, timer: 0 };
        this._channelHistoricCaps.set(channelIndex, historic);
      }

      historic.timer--;
      if (historic.timer <= 0) {
        historic.cap -= 0.03;
      }
      if (channelState.volumeCap > historic.cap) {
        historic.cap = channelState.volumeCap;
        historic.timer = 50;
      }

      const chWidth = Math.min(144, channelState.volumeCap * 144);
      const chCapX = 8 + Math.min(144, historic.cap * 144);
      const lastWidth = this._channelLastWidths.get(channelIndex) ?? -1;
      const lastCap = this._channelLastCaps.get(channelIndex) ?? -1;
      if (chWidth !== lastWidth) {
        this._channelLastWidths.set(channelIndex, chWidth);
        bar.setAttribute("width", "" + chWidth);
      }
      const capEl = this._channelVolumeCaps.get(channelIndex);
      if (capEl && chCapX !== lastCap) {
        this._channelLastCaps.set(channelIndex, chCapX);
        capEl.setAttribute("x", "" + chCapX);
      }

      // Update average and range for channel
      if (channelState.volumeCap > 0) {
        const sum = (this._channelVolumeSums.get(channelIndex) ?? 0) + channelState.volumeCap;
        const count = (this._channelSampleCounts.get(channelIndex) ?? 0) + 1;
        this._channelVolumeSums.set(channelIndex, sum);
        this._channelSampleCounts.set(channelIndex, count);

        const currentDb = 20 * Math.log10(channelState.volumeCap);
        if (isFinite(currentDb)) {
          const minDb = this._channelMinDb.get(channelIndex) ?? Infinity;
          const maxDb = this._channelMaxDb.get(channelIndex) ?? -Infinity;
          if (currentDb < minDb) this._channelMinDb.set(channelIndex, currentDb);
          if (currentDb > maxDb) this._channelMaxDb.set(channelIndex, currentDb);
        }
      }

      // Update channel dB label with peak, avg, and range
      const dbLabel = this._channelDbLabels.get(channelIndex);
      if (dbLabel) {
        const peakDb = historic.cap > 0 ? 20 * Math.log10(historic.cap) : -Infinity;
        const sampleCount = this._channelSampleCounts.get(channelIndex) ?? 0;
        let statsText = "";
        if (sampleCount > 0) {
          const avg = (this._channelVolumeSums.get(channelIndex) ?? 0) / sampleCount;
          const avgDb = avg > 0 ? 20 * Math.log10(avg) : -Infinity;
          const minDb = this._channelMinDb.get(channelIndex) ?? -Infinity;
          const maxDb = this._channelMaxDb.get(channelIndex) ?? -Infinity;
          const avgText = isFinite(avgDb) ? avgDb.toFixed(1) : "-inf";
          const minText = isFinite(minDb) ? minDb.toFixed(1) : "-inf";
          const maxText = isFinite(maxDb) ? maxDb.toFixed(1) : "-inf";
          statsText = ` | A:${avgText} | ${minText}/${maxText}`;
        }
        dbLabel.textContent = isFinite(peakDb) ? `Pk:${peakDb.toFixed(1)}${statsText}` : `Pk:-inf${statsText}`;
      }

      // Update dim state: dim if P0
      const channelDiv = this._channelDivs.get(channelIndex);
      if (channelDiv) {
        const songChannel = this._doc.song.channels[channelIndex];
        if (songChannel) {
          const currentBarAnim = Math.floor(this._doc.synth.playhead);
          const hasPat = songChannel.bars[currentBarAnim] > 0;
          channelDiv.style.opacity = hasPat ? "1" : "0.5";
        }
      }

      // Update instrument highlights
      const channel = this._doc.song.channels[channelIndex];
      if (channel) {
        const channelColors = ColorConfig.getChannelColor(this._doc.song, channelIndex);
        const currentBarAnim = Math.floor(this._doc.synth.playhead);
        const patternIndexAnim = channel.bars[currentBarAnim];
        const patternAnim = patternIndexAnim > 0 ? this._doc.song.getPattern(channelIndex, currentBarAnim) : null;
        const patternInstrumentsAnim = patternAnim ? patternAnim.instruments : [];
        
        for (const [key, instrSpan] of this._instrumentSpans) {
          if (key.startsWith(`${channelIndex}-`)) {
            const j = parseInt(key.split("-")[1]);
            const instrState = channelState.instruments[j];
            if (instrState && instrSpan) {
              const isPlaying = instrState.activeTones.count() > 0 || instrState.releasedTones.count() > 0 || instrState.liveInputTones.count() > 0;
              const inPattern = patternInstrumentsAnim.includes(j);
              instrSpan.style.background = isPlaying ? "white" : inPattern ? channelColors.primaryChannel : "var(--ui-widget-background)";
              instrSpan.style.color = isPlaying ? "black" : inPattern ? "var(--editor-background)" : channelColors.primaryChannel;
              instrSpan.style.opacity = inPattern || isPlaying ? "1" : "0.5";
            }
          }
        }
      }
    }

    this._animationId = window.requestAnimationFrame(this._animate);
  };

  private _renderChannelList = (): void => {
    while (this._contentContainer.firstChild) {
      this._contentContainer.removeChild(this._contentContainer.firstChild);
    }
    this._channelVolumeBars.clear();
    this._channelVolumeCaps.clear();
    this._channelLastWidths.clear();
    this._channelLastCaps.clear();
    this._channelDbLabels.clear();
    this._channelDivs.clear();

    const song = this._doc.song;
    const synth = this._doc.synth;
    const channelCount = song.getChannelCount();

    if (channelCount === 0) {
      this._contentContainer.appendChild(div({
        style: "color: var(--secondary-text); text-align: center; padding: 20px;",
      }, "No channels in this song."));
      return;
    }

    for (let i = 0; i < channelCount; i++) {
      const channel = song.channels[i];
      const channelState = synth.channels[i];
      if (!channel) continue;

      const isMuted = channel.muted;
      const isModChannel = i >= song.pitchChannelCount + song.noiseChannelCount;
      if (isModChannel) continue; // Skip mod channels

      const isDrumChannel = i >= song.pitchChannelCount;

      const channelName = channel.name || `${i + 1}`;
      const channelType = isDrumChannel ? "Drum" : "Pitch";
      const channelColors = ColorConfig.getChannelColor(song, i);

      // Check if channel has pattern or sound (only dim during playback)
      const currentBar = Math.floor(this._doc.synth.playhead);
      const patternIndex = channel.bars[currentBar];
      const hasPattern = patternIndex > 0;
      const isPlaying = this._doc.synth.playing;
      const isDimmed = isPlaying && !hasPattern;

      // Volume bar for this channel
      const volBar = rect({
        "pointer-events": "none",
        height: "40%",
        width: "0%",
        x: "5%",
        y: "30%",
        fill: channelColors.primaryChannel,
      });
      const volCap = rect({
        "pointer-events": "none",
        width: "2px",
        height: "40%",
        x: "5%",
        y: "30%",
        fill: channelColors.primaryNote,
      });

      this._channelVolumeBars.set(i, volBar);
      this._channelVolumeCaps.set(i, volCap);

      const dbLabel = span({
        style: `color: ${channelColors.primaryChannel}; opacity: 0.8; font-size: 9px; font-weight: 600; font-family: monospace; text-align: center; display: block;`,
      }, "Pk:-inf");
      this._channelDbLabels.set(i, dbLabel);

      const volBarContainer = svg(
        {
          style: "touch-action: none; overflow: visible;",
          width: "100%",
          height: "12px",
          preserveAspectRatio: "none",
          viewBox: "0 0 160 12",
        },
        rect({
          "pointer-events": "none",
          width: "90%",
          height: "40%",
          x: "5%",
          y: "30%",
          fill: "var(--ui-widget-background, #444)",
        }),
        volBar,
        volCap,
      );

      const channelDiv = div({
        style: `display: flex; flex-direction: column; padding: 4px 6px; border: 2px solid ${
          isMuted ? "var(--mute-button-normal)" : channelColors.primaryChannel
        }; border-radius: 4px; background: var(--editor-background); cursor: pointer; ${isMuted ? "opacity: 0.5;" : ""} ${isDimmed ? "opacity: 0.5;" : ""}`,
      });
      this._channelDivs.set(i, channelDiv);

      channelDiv.addEventListener("mouseenter", () => {
        this._songEditor.muteEditor.setHoveredChannel(i);
        this._songEditor.trackEditor.setHoveredChannel(i);
      });
      channelDiv.addEventListener("mouseleave", () => {
        this._songEditor.muteEditor.setHoveredChannel(-1);
        this._songEditor.trackEditor.setHoveredChannel(-1);
      });
      channelDiv.addEventListener("click", () => {
        this._doc.channel = i;
        this._doc.notifier.changed();
      });

      const headerDiv = div({
        style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;",
      });

      headerDiv.appendChild(span({
        style: `font-weight: bold; color: ${channelColors.primaryChannel}; font-size: 11px;`,
      }, channelName));

      headerDiv.appendChild(span({
        style: `font-size: 9px; font-weight: 600; color: ${channelColors.primaryChannel}; opacity: 0.7;`,
      }, channelType));

      // Show active pattern if playing
      if (patternIndex > 0) {
        headerDiv.appendChild(span({
          style: `font-size: 9px; font-weight: 600; color: ${channelColors.primaryNote}; margin-left: 4px;`,
        }, `P${patternIndex}`));
      }

      channelDiv.appendChild(headerDiv);
      channelDiv.appendChild(volBarContainer);
      channelDiv.appendChild(dbLabel);

      // Show instruments
      if (channel.instruments.length > 0) {
        const instrDiv = div({
          style: "display: flex; flex-wrap: wrap; gap: 2px; margin-top: 4px;",
        });
        
        // Get instruments in current pattern for highlighting
        const pattern = hasPattern ? song.getPattern(i, currentBar) : null;
        const patternInstruments = pattern ? pattern.instruments : [];
        
        for (let j = 0; j < channel.instruments.length; j++) {
          const inPattern = patternInstruments.includes(j);
          const instrState = channelState ? channelState.instruments[j] : null;
          const isPlaying = instrState ? (instrState.activeTones.count() > 0 || instrState.releasedTones.count() > 0 || instrState.liveInputTones.count() > 0) : false;
          const instrSpan = span({
            style: `font-size: 9px; font-weight: 600; padding: 1px 3px; border-radius: 2px; background: ${
              isPlaying ? "white" : inPattern ? channelColors.primaryChannel : "var(--ui-widget-background)"
            }; color: ${
              isPlaying ? "black" : inPattern ? "var(--editor-background)" : channelColors.primaryChannel
            }; opacity: ${
              inPattern || isPlaying ? "1" : "0.5"
            };`,
          }, `I${j + 1}`);
          this._instrumentSpans.set(`${i}-${j}`, instrSpan);
          instrDiv.appendChild(instrSpan);
        }
        channelDiv.appendChild(instrDiv);
      }

      this._contentContainer.appendChild(channelDiv);
    }
  };
}
