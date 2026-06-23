// Slider
//
// Purpose: Slider element wrapper with pill-shaped div-based visual
//
// This module:
// - Binds slider elements to prospective and committed changes
// - Integrates with SongDocument for undo/redo support
// - Renders a pill-shaped track + fill + knob using divs instead
//   of the native <input type="range">, matching the PMD design
//   system (see project-minimalist-design hue slider)
// - Supports two layouts:
//   Regular (midTick=false): fill originates from the left edge
//   Delta (midTick=true): fill emanates from center, knob is
//     absolutely positioned, center-line shows the reference

import { HTML } from "imperative-html/dist/esm/elements-strict";
import type { Change } from "../../core/change";
import type { SongDocument } from "../../song-document";

const { input, span, div } = HTML;

export class Slider {
	private _change: Change | null = null;
	private _value: number = 0;
	private _oldValue: number = 0;
	private _defaultValue: number = 0;
	private _min: number;
	private _max: number;
	private readonly _midTick: boolean;
	private _wrapperDiv: HTMLDivElement;
	// Regular slider fields
	private _fillDiv: HTMLDivElement | null = null;
	private _trackDiv: HTMLDivElement | null = null;
	// Delta slider fields
	private _leftFillDiv: HTMLDivElement | null = null;
	private _rightFillDiv: HTMLDivElement | null = null;
	private _leftTrackDiv: HTMLDivElement | null = null;
	private _rightTrackDiv: HTMLDivElement | null = null;
	private _centerLine: HTMLDivElement | null = null;
	private _knobDiv: HTMLDivElement | null = null;
	private readonly _modIndicator: HTMLDivElement;
	private _dragging: boolean = false;
	public container: HTMLSpanElement;

	constructor(
		public readonly input: HTMLInputElement,
		private readonly _doc: SongDocument,
		private readonly _getChange: ((oldValue: number, newValue: number) => Change) | null,
		midTick: boolean,
		defaultValue?: number,
	) {
		this._value = defaultValue ?? 0;
		this._defaultValue = defaultValue ?? 0;
		this._min = parseFloat(input.min) || 0;
		this._max = parseFloat(input.max) || 100;
		this._midTick = midTick;

		// Hide the native range input; the div-based visual takes over.
		input.style.display = "none";

		this._modIndicator = div({
			class: "slider-mod-indicator",
			style: "position: absolute; left: var(--mod-position, -50%); width: 4px; height: 100%; top: 0; background: var(--subtext); border-radius: 999px; transform: translate(-50%, 0); pointer-events: none; z-index: 10;",
		});

		if (midTick) {
			this._buildDeltaSlider();
		} else {
			this._buildRegularSlider();
		}

		this.container = midTick
			? span({ style: "position: sticky; display: flex; width: 61.5%; flex-shrink: 0;" }, input, this._wrapperDiv)
			: span({ style: "position: sticky; display: flex; width: 62.5%; flex-shrink: 0;" }, input, this._wrapperDiv);

		input.addEventListener("input", this._whenInput);
		input.addEventListener("change", this._whenChange);
		this._wrapperDiv.addEventListener("pointerdown", this._onPointerDown);
		this._wrapperDiv.addEventListener("dblclick", this._onDoubleClick);

		this._syncVisual();
	}

	// ── Layout builders ──

	private _buildRegularSlider(): void {
		// Each fill/track element clips itself with overflow:hidden + border-radius.
		// No parent track-layer — avoids browser clipping issues with nested border-radius + overflow.

		// Fill: pill at left, 8px at right (knob side)
		this._fillDiv = div({
			style: "position: absolute; left: 0; top: 5px; width: 0; height: 6px; background: var(--cta-bg); border-radius: 999px 8px 8px 999px;",
		});

		// Track: 8px at left (knob side), pill at right
		this._trackDiv = div({
			style: "position: absolute; right: 0; top: 5px; width: 0; height: 6px; background: var(--slider-track, var(--ui-widget-background, #444)); border-radius: 8px 999px 999px 8px;",
		});

		this._knobDiv = div({
			style: "position: absolute; width: 4px; height: 100%; background: var(--cta-bg); border-radius: 999px; transform: translateX(-50%); pointer-events: none; z-index: 3;",
		});

		this._wrapperDiv = div(
			{
				style: "width: 100%; min-width: 0; position: relative; height: 16px; cursor: pointer; user-select: none; touch-action: none;",
			},
			this._fillDiv,
			this._trackDiv,
			this._knobDiv,
			this._modIndicator,
		);
	}

	private _buildDeltaSlider(): void {
		// Each track/fill element clips itself. No parent track-layer.

		// Left track: pill at left edge, 8px at knob side
		this._leftTrackDiv = div({
			style: "position: absolute; left: 0; top: 5px; width: 0; height: 6px; background: var(--slider-track, var(--ui-widget-background, #444)); border-radius: 999px 8px 8px 999px;",
		});

		// Right track: 8px at knob side, pill at right edge
		this._rightTrackDiv = div({
			style: "position: absolute; right: 0; top: 5px; width: 0; height: 6px; background: var(--slider-track, var(--ui-widget-background, #444)); border-radius: 8px 999px 999px 8px;",
		});

		// Left fill: pill at center (right), 8px at knob side (left)
		this._leftFillDiv = div({
			style: "position: absolute; right: 50%; top: 5px; width: 0; height: 6px; background: var(--cta-bg); border-radius: 8px 999px 999px 8px;",
		});

		// Right fill: pill at center (left), 8px at knob side (right)
		this._rightFillDiv = div({
			style: "position: absolute; left: 50%; top: 5px; width: 0; height: 6px; background: var(--cta-bg); border-radius: 999px 8px 8px 999px;",
		});

		// Center reference line (replaces the old midTick:after pseudo-element)
		this._centerLine = div({
			style: "position: absolute; left: 50%; width: 2px; height: 12px; background: var(--primary-text); border-radius: 999px; top: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 2;",
		});

		// Knob: absolutely positioned at the current value
		this._knobDiv = div({
			style: "position: absolute; width: 4px; height: 100%; background: var(--cta-bg); border-radius: 999px; transform: translateX(-50%); pointer-events: none; z-index: 3;",
		});

		this._wrapperDiv = div(
			{
				style: "width: 100%; min-width: 0; position: relative; height: 16px; cursor: pointer; user-select: none; touch-action: none;",
			},
			this._leftTrackDiv,
			this._rightTrackDiv,
			this._leftFillDiv,
			this._rightFillDiv,
			this._centerLine,
			this._knobDiv,
			this._modIndicator,
		);
	}

	// ── Event handlers ──

	private _whenInput = (): void => {
		const continuingProspectiveChange: boolean = this._doc.lastChangeWas(this._change);
		if (!continuingProspectiveChange) this._oldValue = this._value;
		if (this._getChange != null) {
			this._change = this._getChange(this._oldValue, parseFloat(this.input.value));
			this._doc.setProspectiveChange(this._change);
		}
	};

	private _whenChange = (): void => {
		if (this._getChange != null) {
			this._doc.record(this._change!);
			this._change = null;
		}
	};

	// ── Pointer / drag ──

	private _onPointerDown = (e: PointerEvent): void => {
		if (this._dragging) return;
		e.preventDefault();
		this._wrapperDiv.setPointerCapture(e.pointerId);
		this._dragging = true;
		this._updateFromPointer(e.clientX);
		this.input.dispatchEvent(new Event("input", { bubbles: true }));

		const onMove = (ev: PointerEvent): void => {
			if (!this._dragging) return;
			this._updateFromPointer(ev.clientX);
			this.input.dispatchEvent(new Event("input", { bubbles: true }));
		};
		const onUp = (): void => {
			this._dragging = false;
			this._wrapperDiv.releasePointerCapture(e.pointerId);
			this._wrapperDiv.removeEventListener("pointermove", onMove);
			this._wrapperDiv.removeEventListener("pointerup", onUp);
			this.input.dispatchEvent(new Event("change", { bubbles: true }));
		};
		this._wrapperDiv.addEventListener("pointermove", onMove);
		this._wrapperDiv.addEventListener("pointerup", onUp);
	};

	private _updateFromPointer(clientX: number): void {
		const rect = this._wrapperDiv.getBoundingClientRect();
		const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		const value = Math.round(this._min + frac * (this._max - this._min));
		this.input.value = String(Math.max(this._min, Math.min(this._max, value)));
		this._syncVisual();
	}

	// ── Visual sync ──

	private _syncVisual(): void {
		const val = parseFloat(this.input.value) ?? this._min;
		const frac = this._max > this._min ? (val - this._min) / (this._max - this._min) : 0;
		const w = this._wrapperDiv.offsetWidth || 120;
		const knobHalfPct = (2 / w) * 100;
		const kClamped = Math.max(knobHalfPct, Math.min(100 - knobHalfPct, frac * 100));

		if (this._midTick) {
			// Delta mode: tracks and fills both respect the knob gap.
			// Active side (knob < 50 = left, knob > 50 = right):
			//   track: edge to far gap edge (farthest from center)
			//   fill:  near gap edge (closest to center) to center
			// Inactive side: track fills full half (static).
			const gapPct = (4 / w) * 100;
			const farGap = Math.max(0, kClamped - gapPct);
			const nearGap = Math.min(100, kClamped + gapPct);
			if (kClamped < 50) {
				// Active = left side: track 0→farGap, fill nearGap→center
				if (this._leftTrackDiv) this._leftTrackDiv.style.width = `${farGap}%`;
				if (this._rightTrackDiv) this._rightTrackDiv.style.width = "50%";
				if (this._leftFillDiv) this._leftFillDiv.style.width = `${Math.max(0, 50 - nearGap)}%`;
				if (this._rightFillDiv) this._rightFillDiv.style.width = "0";
			} else if (kClamped > 50) {
				// Active = right side: track farGap→edge, fill center→farGap
				if (this._leftTrackDiv) this._leftTrackDiv.style.width = "50%";
				if (this._rightTrackDiv) this._rightTrackDiv.style.width = `${Math.max(0, 100 - nearGap)}%`;
				if (this._leftFillDiv) this._leftFillDiv.style.width = "0";
				if (this._rightFillDiv) this._rightFillDiv.style.width = `${Math.max(0, farGap - 50)}%`;
			} else {
				// Center: both tracks stop at gap edges, no fill
				if (this._leftTrackDiv) this._leftTrackDiv.style.width = `${farGap}%`;
				if (this._rightTrackDiv) this._rightTrackDiv.style.width = `${Math.max(0, 100 - nearGap)}%`;
				if (this._leftFillDiv) this._leftFillDiv.style.width = "0";
				if (this._rightFillDiv) this._rightFillDiv.style.width = "0";
			}
			if (this._knobDiv) this._knobDiv.style.left = `${kClamped}%`;
		} else {
			// Regular mode: fill from left → knob, track from knob → right, both with 2px visible gap.
			const gapPct = (4 / w) * 100;
			const fillPct = Math.max(0, kClamped - gapPct);
			const trackPct = Math.max(0, 100 - kClamped - gapPct);
			if (this._fillDiv) this._fillDiv.style.width = `${fillPct}%`;
			if (this._trackDiv) this._trackDiv.style.width = `${trackPct}%`;
			if (this._knobDiv) this._knobDiv.style.left = `${kClamped}%`;
		}
	}

	// ── Double-click reset ──

	private _onDoubleClick = (): void => {
		if (!this._doc.prefs.doubleClickSliderReset) return;
		if (this._getChange == null) return;
		const oldValue = this._value;
		const newValue = this._defaultValue;
		if (oldValue === newValue) return;
		this.input.value = String(newValue);
		this._value = newValue;
		this._oldValue = oldValue;
		this._change = this._getChange(oldValue, newValue);
		this._doc.record(this._change);
		this._doc.notifier.notifyWatchers();
		this._change = null;
		this._syncVisual();
	};

	// ── Public API ──

	public updateValue(value: number): void {
		this._value = value;
		this.input.value = String(value);
		this._syncVisual();
	}

	public getValueBeforeProspectiveChange(): number {
		return this._oldValue;
	}
}

export interface RangeSliderOptions {
	style?: string;
	title?: string;
	midTick?: boolean;
	undo?: boolean;
}

export function rangeSlider(
	doc: SongDocument,
	getChange: ((oldValue: number, newValue: number) => Change) | null,
	min: number,
	max: number,
	value: number,
	options?: RangeSliderOptions,
): Slider {
	const style = options?.style ?? "margin: 0;";
	const attrs: Record<string, string> = {
		style,
		type: "range",
		min: String(min),
		max: String(max),
		value: String(value),
		step: "1",
	};
	if (options?.title) attrs.title = options.title;
	const undo = options?.undo ?? true;
	return new Slider(input(attrs), doc, undo ? getChange : null, options?.midTick ?? false, value);
}
