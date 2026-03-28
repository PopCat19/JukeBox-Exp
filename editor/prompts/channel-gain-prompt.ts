// ChannelGainPrompt
//
// Purpose: Modal popup displaying per-channel gain information with live updates
//
// This module:
// - Shows output volume level (same as editor volume bar)
// - Displays per-channel live output volume bars
// - Updates in real-time during playback

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "../song-document";
import { Prompt } from "./prompt";

const { div, h2, span, button, p } = HTML;
const { svg, defs, linearGradient, stop, rect } = SVG;

export class ChannelGainPrompt implements Prompt {
  private readonly _doc: SongDocument;
  private _animationId: number = 0;
  private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });

  // Volume bar elements
  private readonly _outVolumeBar: SVGRectElement = rect({
    "pointer-events": "none",
    height: "50%",
    width: "0%",
    x: "5%",
    y: "25%",
    fill: "url('#channelGainVolumeGrad')",
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
        { id: "channelGainVolumeGrad", gradientUnits: "userSpaceOnUse" },
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
    style: "max-height: 45vh; overflow-y: auto;",
  });

  // Store channel volume bar elements for live updates
  private readonly _channelVolumeBars: Map<number, SVGRectElement> = new Map();
  private readonly _channelVolumeCaps: Map<number, SVGRectElement> = new Map();
  private readonly _channelHistoricCaps: Map<number, { cap: number; timer: number }> = new Map();
  private readonly _channelDbLabels: Map<number, HTMLSpanElement> = new Map();

  private _showActiveOnly: boolean = false;
  private readonly _toggleButton: HTMLButtonElement = button({
    style: "font-size: 11px; margin-bottom: 8px; padding: 4px 8px;",
  }, "Show Active Only");

  private _historicVolumeCap: number = 0;
  private _historicTimer: number = 0;
  private readonly _masterDbLabel: HTMLSpanElement = span({
    style: "color: var(--secondary-text); font-size: 11px; font-family: monospace;",
  }, "-inf dB");

  public container: HTMLDivElement = div(
    { class: "prompt noSelection", style: "width: 350px;" },
    h2("Channel Gains"),
    p({ style: "margin-bottom: 4px; font-size: 12px;" }, "Master Output Volume:"),
    div({ style: "display: flex; flex-direction: column; align-items: center; margin-bottom: 12px;" }, this._volumeBarContainer, this._masterDbLabel),
    this._toggleButton,
    this._contentContainer,
    this._cancelButton,
  );

  constructor(_doc: SongDocument) {
    this._doc = _doc;
    this._animate = this._animate.bind(this);
    this._onDocChange = this._renderChannelList.bind(this);
    this._doc.notifier.watch(this._onDocChange);
    this._renderChannelList();
    this._animationId = window.requestAnimationFrame(this._animate);
    this._cancelButton.addEventListener("click", this._close);
    this._toggleButton.addEventListener("click", this._toggleFilter);
  }

  private _toggleFilter = (): void => {
    this._showActiveOnly = !this._showActiveOnly;
    this._toggleButton.textContent = this._showActiveOnly ? "Show All Channels" : "Show Active Only";
    this._renderChannelList();
  };

  private _close = (): void => {
    this._doc.prompt = null;
    this._doc.notifier.changed();
  };

  public cleanUp = (): void => {
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
    this._channelDbLabels.clear();
    this._cancelButton.removeEventListener("click", this._close);
    this._toggleButton.removeEventListener("click", this._toggleFilter);
  };

  private _onDocChange = (): void => {
    this._renderChannelList();
  };

  private _animate = (): void => {
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
    this._outVolumeBar.setAttribute("width", "" + volumeWidth);
    this._outVolumeCap.setAttribute("x", "" + capX);

    // Update master dB label
    const masterDb = this._historicVolumeCap > 0 ? 20 * Math.log10(this._historicVolumeCap) : -Infinity;
    this._masterDbLabel.textContent = isFinite(masterDb) ? `${masterDb.toFixed(1)} dB` : "-inf dB";

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
      bar.setAttribute("width", "" + chWidth);

      const capEl = this._channelVolumeCaps.get(channelIndex);
      if (capEl) {
        capEl.setAttribute("x", "" + chCapX);
      }

      // Update channel dB label
      const dbLabel = this._channelDbLabels.get(channelIndex);
      if (dbLabel) {
        const chDb = historic.cap > 0 ? 20 * Math.log10(historic.cap) : -Infinity;
        dbLabel.textContent = isFinite(chDb) ? `${chDb.toFixed(1)} dB` : "-inf dB";
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
    this._channelDbLabels.clear();

    const song = this._doc.song;
    const channelCount = song.getChannelCount();

    if (channelCount === 0) {
      this._contentContainer.appendChild(div({
        style: "color: var(--secondary-text); text-align: center;",
      }, "No channels in this song."));
      return;
    }

    for (let i = 0; i < channelCount; i++) {
      const channel = song.channels[i];
      const channelState = this._doc.synth.channels[i];
      const isMuted = channel.muted;
      const isModChannel = i >= song.pitchChannelCount + song.noiseChannelCount;
      const isDrumChannel = i >= song.pitchChannelCount && !isModChannel;

      // Check if channel is producing sound
      const isActive = channelState.volumeCap > 0.001 || !isMuted;
      if (this._showActiveOnly && !isActive) continue;

      const channelName = channel.name || `Channel ${i + 1}`;
      const channelType = isModChannel ? "Mod" : (isDrumChannel ? "Drum" : "Pitch");

      // Volume bar for this channel
      const volBar = rect({
        "pointer-events": "none",
        height: "50%",
        width: "0%",
        x: "5%",
        y: "25%",
        fill: "url('#channelGainVolumeGrad')",
      });
      const volCap = rect({
        "pointer-events": "none",
        width: "2px",
        height: "50%",
        x: "5%",
        y: "25%",
        fill: "var(--ui-widget-focus, #777)",
      });

      this._channelVolumeBars.set(i, volBar);
      this._channelVolumeCaps.set(i, volCap);

      const dbLabel = span({
        style: "color: var(--secondary-text); font-size: 11px; font-family: monospace;",
      }, "-inf dB");
      this._channelDbLabels.set(i, dbLabel);

      const volBarContainer = svg(
        {
          style: "touch-action: none; overflow: visible;",
          width: "160px",
          height: "12px",
          preserveAspectRatio: "none",
          viewBox: "0 0 160 12",
        },
        rect({
          "pointer-events": "none",
          width: "90%",
          height: "50%",
          x: "5%",
          y: "25%",
          fill: "var(--ui-widget-background, #444)",
        }),
        volBar,
        volCap,
      );

      const channelDiv = div({
        style: `margin-bottom: 8px; padding: 8px; border: 1px solid ${
          isMuted ? "var(--mute-button-normal)" : "var(--ui-widget-background)"
        }; border-radius: 4px; ${isMuted ? "opacity: 0.6;" : ""}`,
      });

      const headerDiv = div({
        style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;",
      });

      headerDiv.appendChild(span({
        style: "font-weight: bold; color: var(--primary-text);",
      }, channelName));

      headerDiv.appendChild(span({
        style: "font-size: 11px; color: var(--secondary-text);",
      }, `${channelType}${isMuted ? " (Muted)" : ""}`));

      channelDiv.appendChild(headerDiv);
      channelDiv.appendChild(volBarContainer);
      channelDiv.appendChild(dbLabel);

      // Show instrument volume settings
      if (channel.instruments.length > 0) {
        for (let j = 0; j < channel.instruments.length; j++) {
          const instrument = channel.instruments[j];

          const instRow = div({
            style: "display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px;",
          });

          instRow.appendChild(span({
            style: "color: var(--secondary-text);",
          }, `Inst ${j + 1}`));

          instRow.appendChild(span({
            style: "color: var(--primary-text); font-family: monospace;",
          }, `Vol: ${instrument.volume}`));

          channelDiv.appendChild(instRow);
        }
      }

      this._contentContainer.appendChild(channelDiv);
    }
  };
}
