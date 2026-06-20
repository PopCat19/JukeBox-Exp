// BarScrollBar
//
// Purpose: Renders and manages the horizontal bar navigation scrollbar
//
// This module:
// - Handles drag-based scrolling to navigate song bars
// - Updates scrollbar position based on current playback

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import type { SongDocument } from "../song-document";

export class BarScrollBar {
	private readonly _editorWidth: number = 512;
	private readonly _editorHeight: number = 20;
	private readonly _playhead: SVGRectElement = SVG.rect("rect", {
		fill: ColorConfig.playhead,
		x: 0,
		y: 0,
		width: 2,
		height: this._editorHeight,
	});
	private readonly _notches: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _handle: SVGRectElement = SVG.rect({
		fill: ColorConfig.uiWidgetBackground,
		x: 0,
		y: 2,
		width: 10,
		height: this._editorHeight - 4,
	});
	private readonly _handleHighlight: SVGRectElement = SVG.rect({
		fill: "none",
		stroke: "var(--primary-text)",
		"stroke-width": 2,
		"pointer-events": "none",
		x: 0,
		y: 1,
		width: 10,
		height: this._editorHeight - 2,
	});
	private readonly _leftHighlight: SVGPathElement = SVG.path({
		fill: "var(--primary-text)",
		"pointer-events": "none",
	});
	private readonly _rightHighlight: SVGPathElement = SVG.path({
		fill: "var(--primary-text)",
		"pointer-events": "none",
	});
	private _renderedPlayhead: number = -1;

	private readonly _svg: SVGSVGElement = SVG.svg(
		{
			style: `background-color: ${ColorConfig.editorBackground}; touch-action: pan-y; position: absolute;`,
			width: this._editorWidth,
			height: this._editorHeight,
		},
		this._notches,
		this._handle,
		this._handleHighlight,
		this._leftHighlight,
		this._rightHighlight,
		this._playhead,
	);

	public readonly container: HTMLElement = HTML.div(
		{
			class: "barScrollBar",
			style: "width: 512px; height: 20px; overflow: hidden; position: relative;",
		},
		this._svg,
	);

	private _mouseX: number = 0;
	private _mouseDown: boolean = false;
	private _svgRect: DOMRect | null = null;
	private _mouseOver: boolean = false;
	private _dragging: boolean = false;
	private _dragOffset: number;
	private _notchSpace: number;
	private _renderedNotchCount: number = -1;
	private _renderedScrollBarPos: number = -1;

	constructor(private _doc: SongDocument) {
		const center: number = this._editorHeight * 0.5;
		const base: number = 20;
		const tip: number = 9;
		const arrowHeight: number = 6;
		this._leftHighlight.setAttribute("d", `M ${tip} ${center} L ${base} ${center + arrowHeight} L ${base} ${center - arrowHeight} z`);
		this._rightHighlight.setAttribute(
			"d",
			`M ${this._editorWidth - tip} ${center} L ${this._editorWidth - base} ${center + arrowHeight} L ${
				this._editorWidth - base
			} ${center - arrowHeight} z`,
		);

		this.container.addEventListener("mousedown", this._whenMousePressed);
		document.addEventListener("mousemove", this._whenMouseMoved);
		document.addEventListener("mouseup", this._whenCursorReleased);
		window.addEventListener("resize", () => (this._svgRect = null));
		window.addEventListener("scroll", () => (this._svgRect = null), { capture: true, passive: true });
		this.container.addEventListener("mouseover", this._whenMouseOver);
		this.container.addEventListener("mouseout", this._whenMouseOut);

		this.container.addEventListener("touchstart", this._whenTouchPressed);
		this.container.addEventListener("touchmove", this._whenTouchMoved);
		this.container.addEventListener("touchend", this._whenCursorReleased);
		this.container.addEventListener("touchcancel", this._whenCursorReleased);
	}

	public animatePlayhead = (): void => {
		const playhead = Math.min(512, Math.max(0, this._notchSpace * this._doc.synth.playhead - 2));
		if (this._renderedPlayhead !== playhead) {
			this._renderedPlayhead = playhead;
			this._playhead.setAttribute("x", `${playhead}`);
		}
	};

	private _whenMouseOver = (_event: MouseEvent): void => {
		if (this._mouseOver) return;
		this._mouseOver = true;
		this._updatePreview();
	};

	private _whenMouseOut = (_event: MouseEvent): void => {
		if (!this._mouseOver) return;
		this._mouseOver = false;
		this._updatePreview();
	};

	private _whenMousePressed = (event: MouseEvent): void => {
		event.preventDefault();
		this._mouseDown = true;
		if (!this._svgRect) this._svgRect = this._svg.getBoundingClientRect();
		const boundingRect: DOMRect = this._svgRect;
		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		// this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
		this._updatePreview();
		if (
			this._mouseX >= this._doc.barScrollPos * this._notchSpace &&
			this._mouseX <= (this._doc.barScrollPos + this._doc.trackVisibleBars) * this._notchSpace
		) {
			this._dragging = true;
			this._dragOffset = this._mouseX - this._doc.barScrollPos * this._notchSpace;
		}
	};

	private _whenTouchPressed = (event: TouchEvent): void => {
		event.preventDefault();
		this._mouseDown = true;
		if (!this._svgRect) this._svgRect = this._svg.getBoundingClientRect();
		const boundingRect: DOMRect = this._svgRect;
		this._mouseX = event.touches[0].clientX - boundingRect.left;
		// this._mouseY = event.touches[0].clientY - boundingRect.top;
		this._updatePreview();
		if (
			this._mouseX >= this._doc.barScrollPos * this._notchSpace &&
			this._mouseX <= (this._doc.barScrollPos + this._doc.trackVisibleBars) * this._notchSpace
		) {
			this._dragging = true;
			this._dragOffset = this._mouseX - this._doc.barScrollPos * this._notchSpace;
		}
	};

	private _whenMouseMoved = (event: MouseEvent): void => {
		if (!this._svgRect) this._svgRect = this._svg.getBoundingClientRect();
		const boundingRect = this._svgRect;
		this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		// this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
		this._whenCursorMoved();
	};

	private _whenTouchMoved = (event: TouchEvent): void => {
		if (!this._mouseDown) return;
		event.preventDefault();
		if (!this._svgRect) this._svgRect = this._svg.getBoundingClientRect();
		const boundingRect: DOMRect = this._svgRect;
		this._mouseX = event.touches[0].clientX - boundingRect.left;
		// this._mouseY = event.touches[0].clientY - boundingRect.top;
		this._whenCursorMoved();
	};

	private _whenCursorMoved(): void {
		if (this._dragging) {
			const target = Math.round((this._mouseX - this._dragOffset) / this._notchSpace);
			this._doc.barScrollPos = Math.max(0, Math.min(this._doc.song.barCount - this._doc.trackVisibleBars, target));
			this._doc.notifier.changed();
		}
		if (this._mouseOver) this._updatePreview();
	}

	public changePos(offset: number) {
		const maxScroll: number = this._doc.song.barCount - this._doc.trackVisibleBars;
		this._doc.barScrollPos = Math.max(0, Math.min(maxScroll, this._doc.barScrollPos + offset));
		this._doc.notifier.changed();
	}

	private _whenCursorReleased = (_event: Event): void => {
		if (!this._dragging && this._mouseDown) {
			if (this._mouseX < (this._doc.barScrollPos + 8) * this._notchSpace) {
				if (this._doc.barScrollPos > 0) this._doc.barScrollPos--;
				this._doc.notifier.changed();
			} else {
				if (this._doc.barScrollPos < this._doc.song.barCount - this._doc.trackVisibleBars) this._doc.barScrollPos++;
				this._doc.notifier.changed();
			}
		}
		this._mouseDown = false;
		this._dragging = false;
		this._updatePreview();
	};

	private _updatePreview(): void {
		const showHighlight: boolean = this._mouseOver && !this._mouseDown;
		let showleftHighlight: boolean = false;
		let showRightHighlight: boolean = false;
		let showHandleHighlight: boolean = false;

		if (showHighlight) {
			if (this._mouseX < this._doc.barScrollPos * this._notchSpace) {
				showleftHighlight = true;
			} else if (this._mouseX > (this._doc.barScrollPos + this._doc.trackVisibleBars) * this._notchSpace) {
				showRightHighlight = true;
			} else {
				showHandleHighlight = true;
			}
		}

		this._leftHighlight.style.visibility = showleftHighlight ? "visible" : "hidden";
		this._rightHighlight.style.visibility = showRightHighlight ? "visible" : "hidden";
		this._handleHighlight.style.visibility = showHandleHighlight ? "visible" : "hidden";
	}

	public render(): void {
		this._notchSpace = (this._editorWidth - 1) / Math.max(this._doc.trackVisibleBars, this._doc.song.barCount);

		const resized: boolean = this._renderedNotchCount !== this._doc.song.barCount;
		if (resized) {
			this._renderedNotchCount = this._doc.song.barCount;

			while (this._notches.firstChild) this._notches.removeChild(this._notches.firstChild);

			for (let i: number = 0; i <= this._doc.song.barCount; i++) {
				const lineHeight: number = i % 16 === 0 ? 0 : i % 4 === 0 ? this._editorHeight / 8 : this._editorHeight / 3;
				this._notches.appendChild(
					SVG.rect({
						fill: ColorConfig.uiWidgetBackground,
						x: i * this._notchSpace - 1,
						y: lineHeight,
						width: 2,
						height: this._editorHeight - lineHeight * 2,
					}),
				);
			}
		}

		if (resized || this._renderedScrollBarPos !== this._doc.barScrollPos) {
			this._renderedScrollBarPos = this._doc.barScrollPos;
			this._handle.setAttribute("x", String(this._notchSpace * this._doc.barScrollPos));
			this._handle.setAttribute("width", String(this._notchSpace * this._doc.trackVisibleBars));
			this._handleHighlight.setAttribute("x", String(this._notchSpace * this._doc.barScrollPos));
			this._handleHighlight.setAttribute("width", String(this._notchSpace * this._doc.trackVisibleBars));
		}

		this._updatePreview();
	}
}
