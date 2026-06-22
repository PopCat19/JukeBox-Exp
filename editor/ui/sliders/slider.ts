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
		this._fillDiv = div({ style: "height: 6px; background: var(--cta-bg); border-radius: 999px 2px 2px 999px; flex-shrink: 0; align-self: center;" });
		const knob = div({ style: "width: 4px; height: 100%; background: var(--cta-bg); border-radius: 999px; flex-shrink: 0;" });
		this._trackDiv = div({
			style: "flex: 1; height: 6px; background: var(--slider-track, var(--ui-widget-background, #444)); border-radius: 2px 999px 999px 2px; align-self: center;",
		});

		this._wrapperDiv = div(
			{
				style: "width: 100%; min-width: 0; position: relative; display: flex; align-items: center; gap: 4px; height: 16px; cursor: pointer; user-select: none; touch-action: none;",
			},
			this._fillDiv,
			knob,
			this._trackDiv,
			this._modIndicator,
		);
	}

	private _buildDeltaSlider(): void {
		// Track layer: contains track-bg and two fills that grow from center.
		const trackLayer = div(
			{
				style: "position: absolute; top: 5px; left: 0; right: 0; height: 6px; overflow: hidden; border-radius: 999px;",
			},
			// Track background (fills entire track area)
			div({ style: "position: absolute; inset: 0; background: var(--slider-track, var(--ui-widget-background, #444));" }),
			// Left fill: anchored at left:0, extends rightward toward knob (minus gap)
			(this._leftFillDiv = div({
				style: "position: absolute; left: 0; width: 0; height: 100%; background: var(--cta-bg); border-radius: 999px 0 0 999px;",
			})),
			// Right fill: anchored at right:0, extends leftward toward knob (minus gap)
			(this._rightFillDiv = div({
				style: "position: absolute; right: 0; width: 0; height: 100%; background: var(--cta-bg); border-radius: 0 999px 999px 0;",
			})),
		);

		// Center reference line (replaces the old midTick:after pseudo-element)
		this._centerLine = div({
			style: "position: absolute; left: 50%; width: 2px; height: 100%; background: var(--subtext); border-radius: 999px; transform: translateX(-50%); pointer-events: none; z-index: 2;",
		});

		// Knob: absolutely positioned at the current value
		this._knobDiv = div({
			style: "position: absolute; width: 4px; height: 100%; background: var(--cta-bg); border-radius: 999px; transform: translateX(-50%); pointer-events: none; z-index: 3;",
		});

		this._wrapperDiv = div(
			{
				style: "width: 100%; min-width: 0; position: relative; height: 16px; cursor: pointer; user-select: none; touch-action: none;",
			},
			trackLayer,
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

		if (this._midTick) {
			// Delta mode: fills grow from outer edges toward knob (minus 4px gap).
			const w = this._wrapperDiv.offsetWidth;
			const gapPct = w > 0 ? (4 / w) * 100 : 0;
			const knobPct = frac * 100;
			if (knobPct <= 50) {
				const fillW = Math.max(0, knobPct - gapPct);
				if (this._leftFillDiv) this._leftFillDiv.style.width = `${fillW}%`;
				if (this._rightFillDiv) this._rightFillDiv.style.width = "0";
			} else {
				const fillW = Math.max(0, 100 - knobPct - gapPct);
				if (this._leftFillDiv) this._leftFillDiv.style.width = "0";
				if (this._rightFillDiv) this._rightFillDiv.style.width = `${fillW}%`;
			}
			if (this._knobDiv) this._knobDiv.style.left = `${knobPct}%`;
		} else {
			// Regular mode: single fill from left edge
			if (this._fillDiv) {
				this._fillDiv.style.flex = `0 0 ${Math.max(0, Math.min(100, frac * 100))}%`;
			}
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
