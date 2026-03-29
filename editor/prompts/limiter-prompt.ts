// LimiterPrompt
//
// Purpose: Provides dialog for configuring song limiter and compressor settings
//
// This module:
// - Renders threshold, ratio, and decay controls
// - Applies limiter settings to the song

// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ChangeLimiterSettings } from "../changes";
import { prettyNumber } from "../config/editor-config";
import { ColorConfig } from "../rendering/color-config";
import { SongDocument } from "../song-document";
import { SongEditor } from "../song-editor";
import { BasePrompt } from "./base-prompt";

const { button, div, h2, input } = HTML;

export class LimiterCanvas {
  private readonly _editorWidth: number = 200;
  private readonly _editorHeight: number = 52;
  private readonly _fill: SVGPathElement = SVG.path({ fill: ColorConfig.uiWidgetBackground, "pointer-events": "none" });
  private readonly _ticks: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
  private readonly _subticks: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
  private readonly _boostCurve: SVGPathElement = SVG.path({
    fill: "none",
    stroke: ColorConfig.textSelection,
    "stroke-width": 2,
    "pointer-events": "none",
  });
  private readonly _limiterCurve: SVGPathElement = SVG.path({
    fill: "none",
    stroke: ColorConfig.primaryText,
    "stroke-width": 2,
    "pointer-events": "none",
  });
  private readonly _svg: SVGSVGElement = SVG.svg(
    {
      style: `background-color: ${ColorConfig.editorBackground}; touch-action: none; overflow: visible;`,
      width: "100%",
      height: "100%",
      viewBox: "0 0 " + this._editorWidth + " " + this._editorHeight,
      preserveAspectRatio: "none",
    },
    this._fill,
    this._ticks,
    this._subticks,
    this._boostCurve,
    this._limiterCurve,
  );

  public readonly container: HTMLElement = div({
    class: "",
    style: "height: 52px; width: 200px; padding-bottom: 1.5em; margin: auto;",
  }, this._svg);

  constructor() {
    for (let i: number = 1; i <= 4; i++) {
      this._ticks.appendChild(
        SVG.rect({
          fill: ColorConfig.tonic,
          x: (i * this._editorWidth / 4) - 1,
          y: 0,
          width: 2,
          height: this._editorHeight,
        }),
      );
    }
  }

  public render(
    limitRatio: number,
    compressionRatio: number,
    limitThreshold: number,
    compressionThreshold: number,
    masterGain: number,
  ): void {
    const boostPoints: string[] = [];
    const limiterPoints: string[] = [];

    for (let i: number = 0; i <= this._editorWidth; i += 2) {
      const x: number = i / this._editorWidth;
      const gain: number = Math.pow(2.0, x * 4.0 - 2.0);

      let compressedGain: number = gain * masterGain;
      if (compressedGain > compressionThreshold) {
        compressedGain = compressionThreshold
          + (compressedGain - compressionThreshold) * (1.0 / compressionRatio);
      }
      const boostY: number = this._editorHeight
        - Math.log2(compressedGain / gain + 1.0) * this._editorHeight / 2.0;
      boostPoints.push(i + "," + boostY);

      let limitedGain: number = compressedGain;
      if (limitedGain > limitThreshold) {
        limitedGain = limitThreshold + (limitedGain - limitThreshold) * (1.0 / limitRatio);
      }
      const limiterY: number = this._editorHeight - Math.log2(limitedGain + 1.0) * this._editorHeight / 2.0;
      limiterPoints.push(i + "," + limiterY);
    }

    this._boostCurve.setAttribute("d", "M " + boostPoints.join(" L "));
    this._limiterCurve.setAttribute("d", "M " + limiterPoints.join(" L "));
  }
}

export class LimiterPrompt extends BasePrompt {
  public limiterCanvas: LimiterCanvas = new LimiterCanvas();
  public readonly _playButton: HTMLButtonElement = button({ style: "width: 55%;", type: "button" });

  public readonly limitRatioSlider: HTMLInputElement = input({
    style: "width: 100%;",
    type: "range",
    min: "1",
    max: "20",
    step: "0.1",
  });
  public readonly compressionRatioSlider: HTMLInputElement = input({
    style: "width: 100%;",
    type: "range",
    min: "1",
    max: "70",
    step: "0.1",
  });
  public readonly limitThresholdSlider: HTMLInputElement = input({
    style: "width: 100%;",
    type: "range",
    min: "0.1",
    max: "2",
    step: "0.01",
  });
  public readonly compressionThresholdSlider: HTMLInputElement = input({
    style: "width: 100%;",
    type: "range",
    min: "0.1",
    max: "2",
    step: "0.01",
  });
  public readonly limitDecaySlider: HTMLInputElement = input({
    style: "width: 100%;",
    type: "range",
    min: "1",
    max: "10",
    step: "0.1",
  });
  public readonly limitRiseSlider: HTMLInputElement = input({
    style: "width: 100%;",
    type: "range",
    min: "1",
    max: "8000",
    step: "1",
  });
  public readonly masterGainSlider: HTMLInputElement = input({
    style: "width: 100%;",
    type: "range",
    min: "0.1",
    max: "2",
    step: "0.01",
  });

  public readonly limitRatioLabel: HTMLDivElement = div(
    { style: "width: 5em; text-align: left; font-size: smaller;" },
    "1:1",
  );
  public readonly compressionRatioLabel: HTMLDivElement = div(
    { style: "width: 5em; text-align: left; font-size: smaller;" },
    "1:1",
  );
  public readonly limitThresholdLabel: HTMLDivElement = div(
    { style: "width: 5em; text-align: left; font-size: smaller;" },
    "0dB",
  );
  public readonly compressionThresholdLabel: HTMLDivElement = div(
    { style: "width: 5em; text-align: left; font-size: smaller;" },
    "0dB",
  );
  public readonly limitDecayLabel: HTMLDivElement = div(
    { style: "width: 5em; text-align: left; font-size: smaller;" },
    "1.0x",
  );
  public readonly limitRiseLabel: HTMLDivElement = div(
    { style: "width: 5em; text-align: left; font-size: smaller;" },
    "1.0x",
  );
  public readonly masterGainLabel: HTMLDivElement = div(
    { style: "width: 5em; text-align: left; font-size: smaller;" },
    "0dB",
  );

  private startingLimitRatio: number = 1;
  private startingCompressionRatio: number = 1;
  private startingLimitThreshold: number = 1;
  private startingCompressionThreshold: number = 1;
  private startingLimitDecay: number = 1;
  private startingLimitRise: number = 1;
  private startingMasterGain: number = 1;

  public readonly container: HTMLDivElement = div(
    { class: "prompt noSelection", style: "width: 400px;" },
    h2("Limiter & Compressor Settings"),
    div({
      style:
        "display: flex; width: 55%; align-self: center; flex-direction: row; align-items: center; justify-content: center;",
    }, this._playButton),
    this.limiterCanvas.container,
    div(
      { style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
      div({ style: "width: 10em; text-align: right;" }, "Limit Ratio:"),
      this.limitRatioSlider,
      this.limitRatioLabel,
    ),
    div(
      { style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
      div({ style: "width: 10em; text-align: right;" }, "Comp. Ratio:"),
      this.compressionRatioSlider,
      this.compressionRatioLabel,
    ),
    div(
      { style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
      div({ style: "width: 10em; text-align: right;" }, "Limit Thresh.:"),
      this.limitThresholdSlider,
      this.limitThresholdLabel,
    ),
    div(
      { style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
      div({ style: "width: 10em; text-align: right;" }, "Comp. Thresh.:"),
      this.compressionThresholdSlider,
      this.compressionThresholdLabel,
    ),
    div(
      { style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
      div({ style: "width: 10em; text-align: right;" }, "Limit Decay:"),
      this.limitDecaySlider,
      this.limitDecayLabel,
    ),
    div(
      { style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
      div({ style: "width: 10em; text-align: right;" }, "Limit Rise:"),
      this.limitRiseSlider,
      this.limitRiseLabel,
    ),
    div(
      { style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
      div({ style: "width: 10em; text-align: right;" }, "Master Gain:"),
      this.masterGainSlider,
      this.masterGainLabel,
    ),
    div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" }, this._okayButton),
    this._cancelButton,
  );

  constructor(doc: SongDocument, private _songEditor: SongEditor) {
    super(doc);
    this.limitRatioSlider.value = ""
      + (this._doc.song.limitRatio < 1 ? this._doc.song.limitRatio * 10 : 9 + this._doc.song.limitRatio);
    this.compressionRatioSlider.value = ""
      + (this._doc.song.compressionRatio < 1
        ? this._doc.song.compressionRatio * 10
        : 10 + (this._doc.song.compressionRatio - 1) * 60);
    this.limitThresholdSlider.value = "" + this._doc.song.limitThreshold;
    this.compressionThresholdSlider.value = "" + this._doc.song.compressionThreshold;
    this.limitDecaySlider.value = "" + this._doc.song.limitDecay;
    this.limitRiseSlider.value = "" + this._doc.song.limitRise;
    this.masterGainSlider.value = "" + this._doc.song.masterGain;

    this.startingLimitRatio = +this.limitRatioSlider.value;
    this.startingCompressionRatio = +this.compressionRatioSlider.value;
    this.startingLimitThreshold = +this.limitThresholdSlider.value;
    this.startingCompressionThreshold = +this.compressionThresholdSlider.value;
    this.startingLimitDecay = +this.limitDecaySlider.value;
    this.startingLimitRise = +this.limitRiseSlider.value;
    this.startingMasterGain = +this.masterGainSlider.value;

    this._okayButton.addEventListener("click", this._saveChanges);
    this._cancelButton.addEventListener("click", this._close);
    this.limitRatioSlider.addEventListener("input", this._whenInput);
    this.compressionRatioSlider.addEventListener("input", this._whenInput);
    this.limitThresholdSlider.addEventListener("input", this._whenInputFavorLimitThreshold);
    this.compressionThresholdSlider.addEventListener("input", this._whenInputFavorCompressionThreshold);
    this.limitDecaySlider.addEventListener("input", this._whenInput);
    this.limitRiseSlider.addEventListener("input", this._whenInput);
    this.masterGainSlider.addEventListener("input", this._whenInput);
    this._playButton.addEventListener("click", this._togglePlay);
    this.updatePlayButton();

    setTimeout(() => this._okayButton.focus());

    this._whenInput();
  }

  private _togglePlay = (): void => {
    this._songEditor.togglePlay();
    this.updatePlayButton();
  };

  public updatePlayButton(): void {
    if (this._doc.synth.playing) {
      this._playButton.classList.remove("playButton");
      this._playButton.classList.add("pauseButton");
      this._playButton.title = "Pause (Space)";
      this._playButton.innerText = "Pause";
    } else {
      this._playButton.classList.remove("pauseButton");
      this._playButton.classList.add("playButton");
      this._playButton.title = "Play (Space)";
      this._playButton.innerText = "Play";
    }
  }

  protected override _close = (): void => {
    this.limitRatioSlider.value = "" + this.startingLimitRatio;
    this.compressionRatioSlider.value = "" + this.startingCompressionRatio;
    this.limitThresholdSlider.value = "" + this.startingLimitThreshold;
    this.compressionThresholdSlider.value = "" + this.startingCompressionThreshold;
    this.limitDecaySlider.value = "" + this.startingLimitDecay;
    this.limitRiseSlider.value = "" + this.startingLimitRise;
    this.masterGainSlider.value = "" + this.startingMasterGain;
    this._whenInput();
    this._doc.prompt = null;
  };

  public override cleanUp(): void {
    super.cleanUp();
    this.limitRatioSlider.removeEventListener("input", this._whenInput);
    this.compressionRatioSlider.removeEventListener("input", this._whenInput);
    this.limitThresholdSlider.removeEventListener("input", this._whenInputFavorLimitThreshold);
    this.compressionThresholdSlider.removeEventListener("input", this._whenInputFavorCompressionThreshold);
    this.limitDecaySlider.removeEventListener("input", this._whenInput);
    this.limitRiseSlider.removeEventListener("input", this._whenInput);
    this.masterGainSlider.removeEventListener("input", this._whenInput);
    this._playButton.removeEventListener("click", this._togglePlay);
  }

  public override whenKeyPressed = (event: KeyboardEvent): void => {
    if ((<Element> event.target).tagName != "BUTTON" && event.keyCode == 13) { // Enter key
      this._saveChanges();
    } else if (event.keyCode == 32) {
      this._togglePlay();
      event.preventDefault();
    }
  };

  private _whenInputFavorLimitThreshold = (): void => {
    this.compressionThresholdSlider.value = ""
      + Math.min(+this.compressionThresholdSlider.value, +this.limitThresholdSlider.value);
    this._whenInput();
  };

  private _whenInputFavorCompressionThreshold = (): void => {
    this.limitThresholdSlider.value = ""
      + Math.max(+this.limitThresholdSlider.value, +this.compressionThresholdSlider.value);
    this._whenInput();
  };

  private _whenInput = (): void => {
    const limitRatio: number = +this.limitRatioSlider.value < 10
      ? +this.limitRatioSlider.value / 10
      : +this.limitRatioSlider.value - 9;
    const compressionRatio: number = +this.compressionRatioSlider.value < 10
      ? +this.compressionRatioSlider.value / 10
      : 1.0 + (+this.compressionRatioSlider.value - 10) / 60;
    const limitThreshold: number = +this.limitThresholdSlider.value;
    const compressionThreshold: number = +this.compressionThresholdSlider.value;
    const limitDecay: number = +this.limitDecaySlider.value;
    const limitRise: number = +this.limitRiseSlider.value;
    const masterGain: number = +this.masterGainSlider.value;

    this.limitRatioLabel.innerText = limitRatio < 1 ? "1:" + prettyNumber(1 / limitRatio) : prettyNumber(limitRatio) + ":1";
    this.compressionRatioLabel.innerText = compressionRatio < 1 ? "1:" + prettyNumber(1 / compressionRatio) : prettyNumber(compressionRatio) + ":1";
    this.limitThresholdLabel.innerText = prettyNumber(20 * Math.log10(limitThreshold)) + "dB";
    this.compressionThresholdLabel.innerText = prettyNumber(20 * Math.log10(compressionThreshold)) + "dB";
    this.limitDecayLabel.innerText = prettyNumber(limitDecay) + "x";
    this.limitRiseLabel.innerText = prettyNumber(limitRise) + "x";
    this.masterGainLabel.innerText = prettyNumber(20 * Math.log10(masterGain)) + "dB";

    this.limiterCanvas.render(limitRatio, compressionRatio, limitThreshold, compressionThreshold, masterGain);

    new ChangeLimiterSettings(
      this._doc,
      limitRatio,
      compressionRatio,
      limitThreshold,
      compressionThreshold,
      limitDecay,
      limitRise,
      masterGain,
    );
  };

  protected override _saveChanges(): void {
    const limitRatio: number = +this.limitRatioSlider.value < 10
      ? +this.limitRatioSlider.value / 10
      : +this.limitRatioSlider.value - 9;
    const compressionRatio: number = +this.compressionRatioSlider.value < 10
      ? +this.compressionRatioSlider.value / 10
      : 1.0 + (+this.compressionRatioSlider.value - 10) / 60;
    const limitThreshold: number = +this.limitThresholdSlider.value;
    const compressionThreshold: number = +this.compressionThresholdSlider.value;
    const limitDecay: number = +this.limitDecaySlider.value;
    const limitRise: number = +this.limitRiseSlider.value;
    const masterGain: number = +this.masterGainSlider.value;

    this._doc.prompt = null;
    this._doc.record(
      new ChangeLimiterSettings(
        this._doc,
        limitRatio,
        compressionRatio,
        limitThreshold,
        compressionThreshold,
        limitDecay,
        limitRise,
        masterGain,
      ),
      true,
    );
  }
}
