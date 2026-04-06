// build-helpers.ts
//
// Purpose: Factory functions for creating common UI elements like selects and inputs
//
// This module:
// - Provides numberInput with wheel support
// - Provides buildOptions for populating select menus
// - Provides buildHeaderedOptions with a non-interactive header
// - Provides buildPresetOptions for instrument preset dropdowns

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { InstrumentType } from "../../synth/synth-config";
import { getRegisteredPlugins } from "../../synth";
import { EditorConfig, type Preset, type PresetCategory } from "../config/editor-config";
import { addWheelSupport } from "./base/input";

const { select, option, optgroup, input } = HTML;

export function numberInput(attrs: Record<string, any>): HTMLInputElement {
	const el = input(attrs);
	if (attrs.type === "number") {
		addWheelSupport(el);
	}
	return el;
}

export function buildOptions(menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
	for (let index: number = 0; index < items.length; index++) {
		menu.appendChild(option({ value: index }, items[index]));
	}
	return menu;
}

export function buildHeaderedOptions(header: string, menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
	menu.appendChild(option({ selected: true, disabled: true, value: header }, header));

	for (const item of items) {
		menu.appendChild(option({ value: item }, item));
	}
	return menu;
}

export function buildPresetOptions(isNoise: boolean, idSet: string): HTMLSelectElement {
	const menu: HTMLSelectElement = select({ id: idSet, class: "presetSelect" });

	if (isNoise) {
		for (const plugin of getRegisteredPlugins()) {
			if (plugin.type === InstrumentType.noise || plugin.type === InstrumentType.spectrum || plugin.type === InstrumentType.drumset) {
				const preset = EditorConfig.valueToPreset(plugin.type);
				menu.appendChild(option({ value: plugin.type }, preset?.name ?? plugin.displayName ?? plugin.name));
			}
		}
	} else {
		for (const plugin of getRegisteredPlugins()) {
			const preset = EditorConfig.valueToPreset(plugin.type) ?? EditorConfig.instrumentToPreset(plugin.type);
			menu.appendChild(option({ value: plugin.type }, preset?.name ?? plugin.displayName ?? plugin.name));
		}
	}

	const randomGroup: HTMLElement = optgroup({ label: "Randomize ▾" });
	randomGroup.appendChild(option({ value: "randomPreset" }, "Random Preset (R)"));
	randomGroup.appendChild(option({ value: "randomGenerated" }, "Random Generated (Shift + R)"));
	menu.appendChild(randomGroup);

	let firstCategoryGroup: HTMLElement | null = null;
	let customSampleCategoryGroup: HTMLElement | null = null;

	for (let categoryIndex: number = 1; categoryIndex < EditorConfig.presetCategories.length; categoryIndex++) {
		const category: PresetCategory = EditorConfig.presetCategories[categoryIndex];
		const group: HTMLElement = optgroup({ label: category.name + " ▾" });
		let foundAny: boolean = false;
		for (let presetIndex: number = 0; presetIndex < category.presets.length; presetIndex++) {
			const preset: Preset = category.presets[presetIndex];
			if ((preset.isNoise === true) === isNoise) {
				group.appendChild(option({ value: (categoryIndex << 12) + presetIndex }, preset.name));
				foundAny = true;
			}
		}

		if (categoryIndex === 1 && foundAny) {
			firstCategoryGroup = group;
		} else if (category.name === "Custom Sample Presets" && foundAny) {
			customSampleCategoryGroup = group;
		}

		if (category.name === "String Presets" && foundAny) {
			const moveViolin2 = group.removeChild(group.children[11]);
			group.insertBefore(moveViolin2, group.children[1]);
		}

		if (category.name === "Flute Presets" && foundAny) {
			const moveFlute2 = group.removeChild(group.children[11]);
			group.insertBefore(moveFlute2, group.children[1]);
		}

		if (category.name === "Keyboard Presets" && foundAny) {
			const moveGrandPiano2 = group.removeChild(group.children[9]);
			const moveGrandPiano3 = group.removeChild(group.children[9]);
			group.insertBefore(moveGrandPiano3, group.children[1]);
			group.insertBefore(moveGrandPiano2, group.children[1]);
		}

		if (foundAny) menu.appendChild(group);
	}

	if (firstCategoryGroup != null && customSampleCategoryGroup != null) {
		const parent: HTMLSelectElement = <HTMLSelectElement>customSampleCategoryGroup.parentNode;
		parent.removeChild(customSampleCategoryGroup);
		parent.insertBefore(customSampleCategoryGroup, firstCategoryGroup);
	}

	return menu;
}
