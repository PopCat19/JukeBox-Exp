// Visual Loop Controls Handle
//
// Purpose: Draggable canvas handle for waveform loop point visualization
//
// This module:
// - Renders a draggable handle on a canvas element
// - Handles mouse and touch input for dragging
// - Validates and reports value changes via callbacks

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";

const { canvas } = HTML;

type HandleValueValidator = (value: number) => number;
type HandleValueChangeHandler = (value: number) => void;
type ShapeFunction = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void;

const defaultShapeFunction: ShapeFunction = (_cnv, ctx, x, y, w, h) => {
	ctx.fillRect(x, y, w, h);
};

export class VisualLoopControlsHandle {
	private _value: number;
	private readonly _validator: HandleValueValidator;
	private readonly _whenValueChanges: HandleValueChangeHandler;
	private readonly _whenMouseUpHappens: () => void;
	private readonly _shapeFunction: ShapeFunction;
	private readonly _handleWidth: number = 40;
	private _mouseDown: boolean = false;
	private _viewportX0: number;
	private _viewportX1: number;
	private _handleDragOffset: number | null = null;
	private _canvasWidth: number;
	private _canvasHeight: number;
	public canvas: HTMLCanvasElement | null = null;
	private _context: CanvasRenderingContext2D | null = null;

	constructor(
		value: number,
		canvasWidth: number,
		canvasHeight: number,
		viewportX0: number,
		viewportX1: number,
		validator: HandleValueValidator,
		whenValueChanges: HandleValueChangeHandler,
		whenMouseUpHappens: () => void,
		shapeFunction: ShapeFunction | null,
	) {
		this._value = value;
		this._validator = validator;
		this._whenValueChanges = whenValueChanges;
		this._whenMouseUpHappens = whenMouseUpHappens;
		this._shapeFunction = shapeFunction == null ? defaultShapeFunction : shapeFunction;
		this._viewportX0 = viewportX0;
		this._viewportX1 = viewportX1;
		this._canvasWidth = canvasWidth;
		this._canvasHeight = canvasHeight;
		this.canvas = canvas({
			width: this._canvasWidth,
			height: this._canvasHeight,
			style: "cursor: default; position: static; margin-bottom: 0.5em; margin-left: auto; margin-right: auto; outline: 1px solid var(--ui-widget-background); box-sizing: border-box; width: 100%;",
		});
		this._context = this.canvas.getContext("2d");
		window.addEventListener("mousemove", this._whenMouseMoves);
		this.canvas!.addEventListener("mousedown", this._whenMouseIsDown);
		window.addEventListener("mouseup", this._whenMouseIsUp);
		this.canvas!.addEventListener("touchstart", this._whenTouchIsDown);
		this.canvas!.addEventListener("touchmove", this._whenTouchMoves);
		this.canvas!.addEventListener("touchend", this._whenTouchIsUp);
		this.canvas!.addEventListener("touchcancel", this._whenTouchIsUp);
	}

	public update = (newValue: number): void => {
		this._value = this._validator(newValue);
	};

	public render = (): void => {
		const cnv: HTMLCanvasElement = this.canvas!;
		const ctx: CanvasRenderingContext2D = this._context!;
		const w: number = cnv.width;
		const h: number = cnv.height;
		const vx0: number = this._viewportX0;
		const vx1: number = this._viewportX1;
		const v: number = this._value;

		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = ColorConfig.getComputed("--loop-accent");
		const bw: number = this._handleWidth;
		const bh: number = h;
		const bx: number = Math.floor(((v - vx0) * w) / (vx1 - vx0)) - bw / 2;
		const by: number = 0;
		this._shapeFunction(cnv, ctx, bx, by, bw, bh);
	};

	public updateViewport = (x0: number, x1: number): void => {
		this._viewportX0 = x0;
		this._viewportX1 = x1;
	};

	private _whenMouseMoves = (event: MouseEvent): void => {
		if (!this._mouseDown) return;
		const w: number = this._canvasWidth;
		const vx0: number = this._viewportX0;
		const vx1: number = this._viewportX1;
		const bounds: DOMRect = this.canvas!.getBoundingClientRect();
		const canvasXScale: number = w / bounds.width;
		const mx: number = ((event.clientX || event.pageX) - bounds.left) * canvasXScale;
		const wmx: number = vx0 + (mx * (vx1 - vx0)) / w;
		this._value = this._validator(wmx - (this._handleDragOffset != null ? this._handleDragOffset : 0));
		this.render();
		if (this._whenValueChanges) this._whenValueChanges(this._value);
	};

	private _whenMouseIsDown = (event: MouseEvent): void => {
		this._mouseDown = true;
		const w: number = this._canvasWidth;
		const vx0: number = this._viewportX0;
		const vx1: number = this._viewportX1;
		const bounds: DOMRect = this.canvas!.getBoundingClientRect();
		const canvasXScale: number = w / bounds.width;
		const mx: number = ((event.clientX || event.pageX) - bounds.left) * canvasXScale;
		const bw: number = this._handleWidth;
		const bx0: number = ((this._value - vx0) * w) / (vx1 - vx0) - bw / 2;
		const bx1: number = bx0 + bw;
		if (mx >= bx0 && mx <= bx1) {
			this._handleDragOffset = ((mx - (bx0 + bw / 2)) * (vx1 - vx0)) / w;
		}
		const wmx: number = vx0 + (mx * (vx1 - vx0)) / w;
		this._value = this._validator(wmx - (this._handleDragOffset != null ? this._handleDragOffset : 0));
		this.render();
		if (this._whenValueChanges) this._whenValueChanges(this._value);
	};

	private _whenMouseIsUp = (_event: MouseEvent): void => {
		if (!this._mouseDown) return;
		this._mouseDown = false;
		this._handleDragOffset = null;
		this._whenMouseUpHappens();
	};

	private _whenTouchMoves = (event: TouchEvent): void => {
		if (!this._mouseDown) return;
		event.preventDefault();
		const w: number = this._canvasWidth;
		const vx0: number = this._viewportX0;
		const vx1: number = this._viewportX1;
		const bounds: DOMRect = this.canvas!.getBoundingClientRect();
		const canvasXScale: number = w / bounds.width;
		const mx: number = (event.touches[0].clientX - bounds.left) * canvasXScale;
		const wmx: number = vx0 + (mx * (vx1 - vx0)) / w;
		this._value = this._validator(wmx - (this._handleDragOffset != null ? this._handleDragOffset : 0));
		this.render();
		if (this._whenValueChanges) this._whenValueChanges(this._value);
	};

	private _whenTouchIsDown = (event: TouchEvent): void => {
		event.preventDefault();
		this._mouseDown = true;
		const w: number = this._canvasWidth;
		const vx0: number = this._viewportX0;
		const vx1: number = this._viewportX1;
		const bounds: DOMRect = this.canvas!.getBoundingClientRect();
		const canvasXScale: number = w / bounds.width;
		const mx: number = (event.touches[0].clientX - bounds.left) * canvasXScale;
		const bw: number = this._handleWidth;
		const bx0: number = ((this._value - vx0) * w) / (vx1 - vx0) - bw / 2;
		const bx1: number = bx0 + bw;
		if (mx >= bx0 && mx <= bx1) {
			this._handleDragOffset = ((mx - (bx0 + bw / 2)) * (vx1 - vx0)) / w;
		}
		const wmx: number = vx0 + (mx * (vx1 - vx0)) / w;
		this._value = this._validator(wmx - (this._handleDragOffset != null ? this._handleDragOffset : 0));
		this.render();
		if (this._whenValueChanges) this._whenValueChanges(this._value);
	};

	private _whenTouchIsUp = (event: TouchEvent): void => {
		event.preventDefault();
		this._mouseDown = false;
		this._handleDragOffset = null;
		this._whenMouseUpHappens();
	};

	public cleanUp = (): void => {
		window.removeEventListener("mousemove", this._whenMouseMoves);
		this.canvas!.removeEventListener("mousedown", this._whenMouseIsDown);
		window.removeEventListener("mouseup", this._whenMouseIsUp);
		this.canvas!.removeEventListener("touchstart", this._whenTouchIsDown);
		this.canvas!.removeEventListener("touchmove", this._whenTouchMoves);
		this.canvas!.removeEventListener("touchend", this._whenTouchIsUp);
		this.canvas!.removeEventListener("touchcancel", this._whenTouchIsUp);
	};
}
