// ChannelRow
//
// Purpose: Renders individual channel rows in the track editor view
//
// This module:
// - Displays channel patterns and bar sequence visually
// - Handles channel row interaction and selection

// Copyright (C) 2021 John Nesky, distributed under the MIT license.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { type ChannelColors, ColorConfig } from "../../shared/color-config";
import type { Pattern } from "../../synth";
import type { SongDocument } from "../song-document";

export class Box {
	private readonly _text: Text = document.createTextNode("");
	private readonly _label: HTMLElement = HTML.div({ class: "channelBoxLabel" }, this._text);
	public readonly container: HTMLElement = HTML.div(
		{
			class: "channelBox",
			style: `margin: 1px; height: ${ChannelRow.patternHeight - 2}px;`,
		},
		this._label,
	);
	private _renderedIndex: number = -1;
	private _renderedLabelColor: string = "?";
	private _renderedVisibility: string = "?";
	private _renderedBorderLeft: string = "?";
	private _renderedBorderRight: string = "?";
	private _renderedBackgroundColor: string = "?";
	constructor(_channel: number, color: string) {
		this.container.style.background = ColorConfig.uiWidgetBackground;
		this._label.style.color = color;
	}

	public setWidth(width: number): void {
		this.container.style.width = `${width - 2}px`; // there's a 1 pixel margin on either side.
	}

	public setHeight(height: number): void {
		this.container.style.height = `${height - 2}px`; // there's a 1 pixel margin on either side.
	}

	public setIndex(
		index: number,
		selected: boolean,
		dim: boolean,
		color: string,
		isNoise: boolean,
		isMod: boolean,
	): void {
		if (this._renderedIndex !== index) {
			if (index >= 100) {
				this._label.setAttribute("font-size", "14");
				this._label.style.setProperty("transform", "translate(0px, -1.5px)");
			} else {
				this._label.setAttribute("font-size", "18");
				this._label.style.setProperty("transform", "translate(0px, 0px)");
			}

			this._renderedIndex = index;
			this._text.data = String(index);
		}
		const useColor: string = selected ? ColorConfig.c_invertedText : color;
		if (this._renderedLabelColor !== useColor) {
			this._label.style.color = useColor;
			this._renderedLabelColor = useColor;
		}
		if (!selected) {
			if (isNoise) {
				color = dim
					? ColorConfig.c_trackEditorBgNoiseDim
					: ColorConfig.c_trackEditorBgNoise;
			} else if (isMod) {
				color = dim ? ColorConfig.c_trackEditorBgModDim : ColorConfig.c_trackEditorBgMod;
			} else {
				color = dim
					? ColorConfig.c_trackEditorBgPitchDim
					: ColorConfig.c_trackEditorBgPitch;
			}
		}
		color = selected ? color : index === 0 ? "none" : color;
		if (this._renderedBackgroundColor !== color) {
			this.container.style.background = color;
			this._renderedBackgroundColor = color;
		}
	}
	// These cache the value given to them, since they're apparently quite
	// expensive to set.
	public setVisibility(visibility: string): void {
		if (this._renderedVisibility !== visibility) {
			this.container.style.visibility = visibility;
			this._renderedVisibility = visibility;
		}
	}
	public setBorderLeft(borderLeft: string): void {
		if (this._renderedBorderLeft !== borderLeft) {
			this.container.style.setProperty("border-left", borderLeft);
			this._renderedBorderLeft = borderLeft;
		}
	}
	public setBorderRight(borderRight: string): void {
		if (this._renderedBorderRight !== borderRight) {
			this.container.style.setProperty("border-right", borderRight);
			this._renderedBorderRight = borderRight;
		}
	}
}

export class ChannelRow {
	public static patternHeight: number = 28;

	private _renderedBarWidth: number = -1;
	private _renderedBarHeight: number = -1;
	private _boxes: Box[] = [];

	public readonly container: HTMLElement = HTML.div({ class: "channelRow" });

	private _prevSelectedBar: number = -1;
	private _renderedGeneration: number = -1;

	constructor(
		private readonly _doc: SongDocument,
		public readonly index: number,
	) {}

	public render(): void {
		ChannelRow.patternHeight = this._doc.getChannelHeight();

		const barWidth: number = this._doc.getBarWidth();
		const barCount: number = this._doc.song.barCount;

		// Quick guard: skip per-bar DOM updates when nothing changed.
		// The notifier generation increments on every state change; the
		// rAF-driven render loop fires every frame even when idle.
		if (
			this._renderedGeneration === this._doc.notifier.generation &&
			this._boxes.length === barCount &&
			this._renderedBarWidth === barWidth &&
			this._renderedBarHeight === ChannelRow.patternHeight
		) {
			return;
		}
		this._renderedGeneration = this._doc.notifier.generation;

		if (this._boxes.length !== barCount) {
			for (let x: number = this._boxes.length; x < barCount; x++) {
				const box: Box = new Box(
					this.index,
					ColorConfig.getChannelColor(this._doc.song, this.index).secondaryChannel,
				);
				box.setWidth(barWidth);
				this.container.appendChild(box.container);
				this._boxes[x] = box;
			}
			for (let x: number = barCount; x < this._boxes.length; x++) {
				this.container.removeChild(this._boxes[x].container);
			}
			this._boxes.length = barCount;
		}

		if (this._renderedBarWidth !== barWidth) {
			this._renderedBarWidth = barWidth;
			for (let x: number = 0; x < this._boxes.length; x++) {
				this._boxes[x].setWidth(barWidth);
			}
		}

		if (this._renderedBarHeight !== ChannelRow.patternHeight) {
			this._renderedBarHeight = ChannelRow.patternHeight;
			for (let x: number = 0; x < this._boxes.length; x++) {
				this._boxes[x].setHeight(ChannelRow.patternHeight);
			}
		}

		const currentBar: number = this._doc.bar;
		const currentChannel: number = this._doc.channel;
		const loopBarStart: number = this._doc.synth.loopBarStart;
		const loopBarEnd: number = this._doc.synth.loopBarEnd;
		const channelIndex: number = this.index;
		const colors: ChannelColors = ColorConfig.getChannelColor(this._doc.song, channelIndex);
		const isNoise: boolean =
			channelIndex >= this._doc.song.pitchChannelCount &&
			channelIndex <
				this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount;
		const isMod: boolean =
			channelIndex >= this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount;

		if (
			!this._doc.synth.playing || this._doc.synth.recording
		) {
			// Full per-box update (18k calls for 38 ch x 485 bars):
			// pattern index, selected state, dim/color, borders.
			for (let i: number = 0; i < this._boxes.length; i++) {
				const pattern: Pattern | null = this._doc.song.getPattern(channelIndex, i);
				const selected: boolean = i === currentBar && channelIndex === currentChannel;
				const dim: boolean = pattern == null || pattern.notes.length === 0;

				const box: Box = this._boxes[i];
				if (i < barCount) {
					box.setIndex(
						this._doc.song.channels[channelIndex].bars[i],
						selected,
						dim,
						dim && !selected ? colors.secondaryChannel : colors.primaryChannel,
						isNoise,
						isMod,
					);
					box.setVisibility("visible");
				} else {
					box.setVisibility("hidden");
				}
				box.setBorderLeft(
					i === loopBarStart ? `1px dashed ${ColorConfig.uiWidgetFocus}` : "none",
				);
				box.setBorderRight(
					i === loopBarEnd ? `1px dashed ${ColorConfig.uiWidgetFocus}` : "none",
				);
			}
		} else {
			// During playback, only update the selected (highlighted)
			// box when scrolled into view. Pattern indices, dimensions,
			// and loop bounds are stable.
			if (
				currentBar >= 0 &&
				currentBar < this._boxes.length &&
				currentChannel === this.index
			) {
				this._boxes[currentBar].setIndex(
					this._doc.song.channels[channelIndex].bars[currentBar],
					true,
					false,
					colors.primaryChannel,
					isNoise,
					isMod,
				);
				// De-select the previously selected bar.
				if (
					this._prevSelectedBar !== currentBar &&
					this._prevSelectedBar >= 0 &&
					this._prevSelectedBar < this._boxes.length
				) {
					const prevPattern: Pattern | null = this._doc.song.getPattern(
						channelIndex,
						this._prevSelectedBar,
					);
					const prevDim: boolean = prevPattern == null || prevPattern.notes.length === 0;
					this._boxes[this._prevSelectedBar].setIndex(
						this._doc.song.channels[channelIndex].bars[this._prevSelectedBar],
						false,
						prevDim,
						prevDim ? colors.secondaryChannel : colors.primaryChannel,
						isNoise,
						isMod,
					);
				}
				this._prevSelectedBar = currentBar;
			}
		}
	}
}
