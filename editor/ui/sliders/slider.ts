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
	private _wrapperDiv: HTMLDivElement;
	private _fillDiv: HTMLDivElement;
	private _trackDiv: HTMLDivElement;
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

		// Hide the native range input; the div-based visual takes over.
		input.style.display = "none";

		this._fillDiv = div({ style: "height: 6px; background: var(--cta-bg); border-radius: 999px 2px 2px 999px; flex-shrink: 0; align-self: center;" });
		const knob = div({ style: "width: 4px; height: 100%; background: var(--cta-bg); border-radius: 999px; flex-shrink: 0;" });
		this._trackDiv = div({
			style: "flex: 1; height: 6px; background: var(--slider-track, var(--ui-widget-background, #444)); border-radius: 2px 999px 999px 2px; align-self: center;",
		});

		this._wrapperDiv = div(
			{
				style: "width: 100%; min-width: 0; display: flex; align-items: center; gap: 4px; height: 16px; cursor: pointer; user-select: none; touch-action: none;",
			},
			this._fillDiv,
			knob,
			this._trackDiv,
		);

		this.container = midTick
			? span({ class: "midTick", style: "position: sticky; width: 61.5%; display: block;" }, input, this._wrapperDiv)
			: span({ style: "position: sticky; display: block;" }, input, this._wrapperDiv);

		input.addEventListener("input", this._whenInput);
		input.addEventListener("change", this._whenChange);
		this._wrapperDiv.addEventListener("pointerdown", this._onPointerDown);
		this._wrapperDiv.addEventListener("dblclick", this._onDoubleClick);

		this._syncVisual();
	}

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
		const val = parseFloat(this.input.value) || this._min;
		const frac = this._max > this._min ? (val - this._min) / (this._max - this._min) : 0;
		this._fillDiv.style.flex = `0 0 ${Math.max(0, Math.min(100, frac * 100))}%`;
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
