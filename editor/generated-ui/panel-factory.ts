// panel-factory.ts
//
// Purpose: Auto-generates settings panel UI from a module's ParamSchema
//
// This module:
// - Reads ParamSchema and produces slider/checkbox/select controls
// - Groups params by schema groups or categories
// - Returns a GeneratedModulePanel with named rows + updateValues + destroy
// - Keeps custom panel escape hatch via opts.overrideParam

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { rangeSlider, type Slider } from "../ui";
import type { SongDocument } from "../song-document";
import type { ParamSchema, ParamDescriptor } from "../../synth/socket/param-schema";
import type { Instrument } from "../../synth";
import { createChangeForParam, type ModuleModMap } from "./change-factory";

const { div, span, input, label } = HTML;

export interface GeneratedModulePanel {
	readonly container: HTMLElement;
	readonly rows: Record<string, { row: HTMLDivElement; slider: Slider }>;
	readonly checkboxes: Record<string, { el: HTMLInputElement; onChange: () => void }>;
	readonly selects: Record<string, { el: HTMLSelectElement; onChange: () => void }>;
	updateValues: (instrument: Instrument) => void;
	destroy: () => void;
}

export interface PanelFactoryOptions {
	doc: SongDocument;
	schema: ParamSchema;
	modMap?: ModuleModMap;
	onOpenPrompt?: (key: string) => void;
	overrideParam?: (
		key: string,
		descriptor: ParamDescriptor,
	) => { row: HTMLDivElement; slider?: Slider } | null;
}

export function buildModulePanel(opts: PanelFactoryOptions): GeneratedModulePanel {
	const { doc, schema, modMap, onOpenPrompt, overrideParam } = opts;
	const rows: Record<string, { row: HTMLDivElement; slider: Slider }> = {};
	const checkboxes: Record<string, { el: HTMLInputElement; onChange: () => void }> = {};
	const selects: Record<string, { el: HTMLSelectElement; onChange: () => void }> = {};
	const sliders: Slider[] = [];
	const elements: HTMLElement[] = [];

	const groups = schema.groups && schema.groups.length > 0
		? schema.groups.map((g) => ({
				label: g.label,
				params: g.params.map((k) => schema.params.find((p) => p.key === k)!).filter(Boolean),
			}))
		: [{ label: "", params: [...schema.params] }];

	for (const group of groups) {
		if (group.label) {
			elements.push(div({ class: "sectionHeader" }, group.label));
		}

		for (const param of group.params) {
			const override = overrideParam?.(param.key, param);
			if (override) {
				elements.push(override.row);
				if (override.slider) {
					sliders.push(override.slider);
					rows[param.key] = { row: override.row, slider: override.slider };
				}
				continue;
			}

			if (param.type === "int" || param.type === "float" || param.type === "percent") {
				const slider = rangeSlider(
					doc,
					(oldValue: number, newValue: number) =>
						createChangeForParam(doc, param.key, oldValue, newValue, modMap),
					param.min ?? 0,
					param.max ?? 100,
					(param.defaultValue as number) ?? 0,
				);
				sliders.push(slider);

				const row = div(
					{ class: "selectRow" },
					span(
						{
							class: "tip",
							onclick: () => onOpenPrompt?.(param.key),
						},
						`${param.label}:`,
					),
					slider.container,
				);
				rows[param.key] = { row: row, slider };
				elements.push(row as HTMLElement);
			} else if (param.type === "boolean") {
				const chk = input({ type: "checkbox", checked: !!param.defaultValue });
				const onChange = () => {
					createChangeForParam(doc, param.key, !chk.checked, chk.checked, modMap);
				};
				chk.addEventListener("change", onChange);
				checkboxes[param.key] = { el: chk, onChange };

				elements.push(div(
					{ class: "selectRow" },
					label(chk, param.label),
				) as HTMLElement);
			} else if (param.type === "enum") {
				const sel = document.createElement("select");
				for (let i = 0; i < (param.enumValues?.length ?? 0); i++) {
					const opt = document.createElement("option");
					opt.value = String(i);
					opt.textContent = param.enumValues![i];
					sel.appendChild(opt);
				}
				sel.value = String(param.defaultValue);
				let currentVal = parseInt(sel.value, 10);
				const onChange = () => {
					const newVal = parseInt(sel.value, 10);
					createChangeForParam(doc, param.key, currentVal, newVal, modMap);
					currentVal = newVal;
				};
				sel.addEventListener("change", onChange);
				selects[param.key] = { el: sel, onChange };

				elements.push(div(
					{ class: "selectRow" },
					span(
						{
							class: "tip",
							onclick: () => onOpenPrompt?.(param.key),
						},
						`${param.label}:`,
					),
					sel,
				) as HTMLElement);
			}
		}
	}

	const container = div({ class: "generatedPanel" }, ...elements);

	function updateValues(instrument: Instrument): void {
		const inst = instrument as unknown as Record<string, unknown>;
		for (const [key, entry] of Object.entries(rows)) {
			const value = inst[key] as number | undefined;
			if (value !== undefined) {
				entry.slider.updateValue(value);
			}
		}
		for (const [key, cb] of Object.entries(checkboxes)) {
			const value = inst[key] as boolean | undefined;
			if (value !== undefined) {
				cb.el.checked = value;
			}
		}
		for (const [key, s] of Object.entries(selects)) {
			const value = inst[key] as number | undefined;
			if (value !== undefined) {
				s.el.value = String(value);
			}
		}
	}

	function destroy(): void {
		for (const cb of Object.values(checkboxes)) {
			cb.el.removeEventListener("change", cb.onChange);
		}
		for (const s of Object.values(selects)) {
			s.el.removeEventListener("change", s.onChange);
		}
		container.remove();
	}

	return { container: container as HTMLElement, rows, checkboxes, selects, updateValues, destroy };
}
