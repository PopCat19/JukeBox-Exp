// Playback Controls
//
// Purpose: Playback control buttons and volume visualization
//
// This module:
// - Creates play, pause, record, stop buttons
// - Creates prev/next bar navigation buttons
// - Creates volume slider and visualizer

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import type { SongDocument } from "../song-document";
import { numberInput } from "../ui/build-helpers";
import { iconButton } from "../ui/buttons";
import { rangeSlider, type Slider } from "../ui/sliders";

const { button, div, span } = HTML;

export class PlaybackControls {
	public readonly playButton: HTMLButtonElement;
	public readonly pauseButton: HTMLButtonElement;
	public readonly recordButton: HTMLButtonElement;
	public readonly stopButton: HTMLButtonElement;
	public readonly prevBarButton: HTMLButtonElement;
	public readonly nextBarButton: HTMLButtonElement;
	public readonly volumeSlider: Slider;
	public readonly volumeInputBox: HTMLInputElement;
	public readonly volumeBarContainer: SVGSVGElement;
	public readonly volumeBarBox: HTMLDivElement;
	public readonly barPosLabel: HTMLSpanElement;

	private readonly _outVolumeBar: SVGRectElement;
	private readonly _outVolumeCap: SVGRectElement;

	constructor(doc: SongDocument) {
		// Play button
		this.playButton = button(
			{
				class: "playButton",
				type: "button",
				title: "Play (Space)",
			},
			span("Play"),
		);

		// Pause button
		this.pauseButton = button(
			{
				class: "pauseButton",
				style: "display: none;",
				type: "button",
				title: "Pause (Space)",
			},
			span("Pause"),
		);

		// Record button
		this.recordButton = button(
			{
				class: "recordButton",
				style: "display: none;",
				type: "button",
				title: "Record (Ctrl+Space)",
			},
			span("Record"),
		);

		// Stop button
		this.stopButton = button(
			{
				class: "stopButton",
				style: "display: none;",
				type: "button",
				title: "Stop Recording (Space)",
			},
			span("Stop Recording"),
		);

		// Navigation buttons
		this.prevBarButton = iconButton("prevBarButton", {
			title: "Previous Bar (left bracket), Shift+click to first bar",
		});
		this.nextBarButton = iconButton("nextBarButton", {
			title: "Next Bar (right bracket), Shift+click to last bar",
		});

		// Volume slider
		this.volumeSlider = rangeSlider(doc, null, 0, 75, 50, {
			style: "width: 5em; flex-grow: 1; margin: 0;",
			title: "main volume",
		});

		this.volumeInputBox = numberInput({
			style: "width: 4em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;",
			type: "number",
			step: "1",
			min: "0",
			max: "75",
			value: "50",
		});

		this.volumeInputBox.addEventListener("change", () => {
			const raw = +this.volumeInputBox.value;
			if (isNaN(raw)) return;
			const clamped = Math.max(0, Math.min(75, Math.round(raw)));
			this.volumeInputBox.value = String(clamped);
			this.volumeSlider.input.value = String(clamped);
			this.volumeSlider.input.dispatchEvent(new Event("input", { bubbles: true }));
			this.volumeSlider.input.dispatchEvent(new Event("change", { bubbles: true }));
		});

		// Volume visualization
		const outVolumeBarBg = SVG.rect({
			"pointer-events": "none",
			width: "90%",
			height: "50%",
			x: "5%",
			y: "25%",
			fill: ColorConfig.uiWidgetBackground,
			rx: "3",
		});

		this._outVolumeBar = SVG.rect({
			"pointer-events": "none",
			height: "50%",
			width: "0%",
			x: "5%",
			y: "25%",
			fill: "url('#volumeGrad2')",
			rx: "3",
		});

		this._outVolumeCap = SVG.rect({
			"pointer-events": "none",
			width: "2px",
			height: "50%",
			x: "5%",
			y: "25%",
			fill: ColorConfig.uiWidgetFocus,
			rx: "3",
		});

		const stop1 = SVG.stop({ "stop-color": "lime", offset: "60%" });
		const stop2 = SVG.stop({ "stop-color": "orange", offset: "90%" });
		const stop3 = SVG.stop({ "stop-color": "red", offset: "100%" });
		const gradient = SVG.linearGradient(
			{ id: "volumeGrad2", gradientUnits: "userSpaceOnUse" },
			stop1,
			stop2,
			stop3,
		);
		const defs = SVG.defs({}, gradient);

		this.volumeBarContainer = SVG.svg(
			{
				style: "touch-action: none; overflow: visible; margin: auto; max-width: 20vw;",
				width: "160px",
				height: "100%",
				preserveAspectRatio: "none",
				viewBox: "0 0 160 12",
			},
			defs,
			outVolumeBarBg,
			this._outVolumeBar,
			this._outVolumeCap,
		);

		this.volumeBarBox = div(
			{
				class: "playback-volume-bar",
				style: "height: 12px; align-self: center;",
			},
			this.volumeBarContainer,
		);

		this.barPosLabel = span(
			{
				style: "font-size: 10px; font-family: monospace; color: var(--secondary-text); white-space: nowrap; line-height: 1.2; display: inline-block;",
			},
			"0 / 0",
		);
	}

	public setVolumeBar(percent: number): void {
		this._outVolumeBar.setAttribute("width", `${percent}%`);
		this._outVolumeCap.setAttribute("x", `${5 + percent * 0.9}%`);
	}
}
