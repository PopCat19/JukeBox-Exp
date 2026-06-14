// LayoutPrompt
//
// Purpose: Provides dialog for selecting editor layout mode
//
// This module:
// - Presents layout options (small, long, tall, wide)
// - Applies selected layout to the editor

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import type { SongDocument } from "../song-document";
import { Layout } from "../ui";
import { BasePrompt } from "./base-prompt";

const { label, div, form, h2, input } = HTML;

export class LayoutPrompt extends BasePrompt {
	private readonly _form: HTMLFormElement = form(
		{ class: "layoutForm" },
		label(
			{ class: "layout-option" },
			input({ type: "radio", name: "layout", value: "small" }),
			SVG(`\
					<svg viewBox="-4 -1 28 22">
						<rect x="0" y="0" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1"/>
						<rect x="2" y="2" width="11" height="10" fill="currentColor"/>
						<rect x="14" y="2" width="4" height="16" fill="currentColor"/>
						<rect x="2" y="13" width="11" height="5" fill="currentColor"/>
					</svg>
				`),
			div("Small"),
		),
		label(
			{ class: "layout-option" },
			input({ type: "radio", name: "layout", value: "long" }),
			SVG(`\
					<svg viewBox="-1 -1 28 22">
						<rect x="0" y="0" width="26" height="20" fill="none" stroke="currentColor" stroke-width="1"/>
						<rect x="2" y="2" width="12" height="10" fill="currentColor"/>
						<rect x="15" y="2" width="4" height="10" fill="currentColor"/>
						<rect x="20" y="2" width="4" height="10" fill="currentColor"/>
						<rect x="2" y="13" width="22" height="5" fill="currentColor"/>
					</svg>
				`),
			div("Long"),
		),
		label(
			{ class: "layout-option" },
			input({ type: "radio", name: "layout", value: "tall" }),
			SVG(`\
					<svg viewBox="-1 -1 28 22">
						<rect x="0" y="0" width="26" height="20" fill="none" stroke="currentColor" stroke-width="1"/>
						<rect x="11" y="2" width="8" height="16" fill="currentColor"/>
						<rect x="20" y="2" width="4" height="16" fill="currentColor"/>
						<rect x="2" y="2" width="8" height="16" fill="currentColor"/>
					</svg>
				`),
			div("Tall"),
		),
		label(
			{ class: "layout-option" },
			input({ type: "radio", name: "layout", value: "wide" }),
			SVG(`\
					<svg viewBox="-1 -1 28 22">
						<rect x="0" y="0" width="26" height="20" fill="none" stroke="currentColor" stroke-width="1"/>
						<rect x="2" y="2" width="4" height="16" fill="currentColor"/>
						<rect x="18" y="2" width="2.5" height="16" fill="currentColor"/>
						<rect x="21.5" y="2" width="2.5" height="16" fill="currentColor"/>
						<rect x="7" y="2" width="10" height="16" fill="currentColor"/>
					</svg>
				`),
			div("Wide (JB)"),
		),
		label(
			{ class: "layout-option" },
			input({ type: "radio", name: "layout", value: "AbyssBox Special" }),
			SVG(`\
					<svg viewBox="-1 -1 28 22">
						<rect x="0" y="0" width="26" height="20" fill="none" stroke="currentColor" stroke-width="1"/>
						<rect x="7" y="2" width="4" height="11" fill="currentColor"/>
						<rect x="2" y="2" width="4" height="11" fill="currentColor"/>
						<rect x="10" y="2" width="14" height="11" fill="currentColor"/>
						<rect x="2" y="14" width="22" height="4" fill="currentColor"/>
					</svg>
				`),
			div("Flipped (AB)"),
		),
		label(
			{ class: "layout-option" },
			input({ type: "radio", name: "layout", value: "focus" }),
			SVG(`\
					<svg viewBox="-1 -1 28 22">
						<rect x="0" y="0" width="26" height="20" fill="none" stroke="currentColor" stroke-width="1"/>
						<rect x="2" y="2" width="17" height="10" fill="currentColor"/>
						<rect x="20" y="2" width="4" height="16" fill="currentColor"/>
						<rect x="2" y="13" width="17" height="5" fill="currentColor"/>
					</svg>
				`),
			div("Focus (AB)"),
		),
		label(
			{ class: "layout-option" },
			input({ type: "radio", name: "layout", value: "long (AB)" }),
			SVG(`\
					<svg viewBox="-1 -1 28 22">
						<rect x="0" y="0" width="26" height="20" fill="none" stroke="currentColor" stroke-width="1"/>
						<rect x="2" y="2" width="12" height="10" fill="currentColor"/>
						<rect x="15" y="2" width="4" height="16" fill="currentColor"/>
						<rect x="20" y="2" width="4" height="16" fill="currentColor"/>
						<rect x="2" y="13" width="12" height="5" fill="currentColor"/>
					</svg>
				`),
			div("Long (AB)"),
		),
		label(
			{ class: "layout-option" },
			input({ type: "radio", name: "layout", value: "theatre" }),
			SVG(`\
					<svg viewBox="-1 -1 28 22">
						<rect x="0" y="0" width="26" height="20" fill="none" stroke="currentColor" stroke-width="1"/>
						<rect x="2" y="2" width="22" height="10" fill="currentColor"></rect>
						<rect x="2" y="13" width="16" height="5" fill="currentColor"></rect>
						<rect x="19" y="13" width="2" height="5" fill="currentColor"></rect>
						<rect x="22" y="13" width="2" height="5" fill="currentColor"></rect>
					</svg>
				`),
			div("Theatre (AB)"),
		),
		label(
			{ class: "layout-option" },
			input({ type: "radio", name: "layout", value: "Upside Down" }),
			SVG(`\
					<svg viewBox="-1 -1 28 22">
						<rect x="0" y="0" width="26" height="20" fill="none" stroke="currentColor" stroke-width="1"/>
						<rect x="7" y="8" width="17" height="10" fill="currentColor"/> /* pattern area */
						<rect x="2" y="2" width="4" height="16" fill="currentColor"/> /* settings area */
						<rect x="7" y="2" width="17" height="5" fill="currentColor"/> /* track area */
					</svg>
				`),
			div("Upturn (AB)"),
		),
	);

	public readonly container: HTMLDivElement = div(
		{ class: "prompt layoutPrompt noSelection" },
		h2("Layout"),
		this._form,
		this._getOkayRow(),
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
		(<any>this._form.elements)["layout"].value = this._doc.prefs.layout;
		this.container.addEventListener("keydown", this.whenKeyPressed);
	}

	protected override _saveChanges(): void {
		this._doc.prefs.layout = (<any>this._form.elements)["layout"].value;
		this._doc.prefs.save();
		Layout.setLayout(this._doc.prefs.layout);
		this._close();
	}

	public override cleanUp(): void {
		super.cleanUp();
		this.container.removeEventListener("keydown", this.whenKeyPressed);
	}
}
