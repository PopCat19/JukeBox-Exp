// Inline Slider Row
//
// Purpose: Reusable layout helper for tempo-style slider + number input rows
//
// This module:
// - Produces a selectRow div with a clickable tip label, optional dropdown
//   button, and the slider + number input side by side in a flex container
// - Pattern: tip | [dropdown?] | [slider][numInput] all inline
// - Matches the tempo slider/stepper layout throughout the instrument settings

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { tipSpan } from "./tip-span";

/**
 * Build a row in tempo style: tip label, optional dropdown, then slider +
 * number input side by side.
 *
 * Example produced DOM (no dropdown):
 *   <div class="selectRow">
 *     <span class="tip">Label:</span>
 *     <span style="display: flex; align-items: center;">
 *       [sliderContainer][inputBox]
 *     </span>
 *   </div>
 *
 * With dropdown:
 *   <div class="selectRow">
 *     <span class="tip">Label:</span>
 *     [dropdownButton]
 *     <span style="display: flex; align-items: center;">
 *       [sliderContainer][inputBox]
 *     </span>
 *   </div>
 */
export function inlineSliderRow(
	label: string,
	onClick: () => void,
	sliderContainer: HTMLElement,
	inputBox: HTMLInputElement,
	dropdown?: HTMLButtonElement,
): HTMLDivElement {
	const children: Array<HTMLElement | string> = [tipSpan(label, onClick)];

	if (dropdown) {
		children.push(dropdown);
	}

	// Wrapper needs min-width:0 so it can shrink inside the 62.5% last-child slot.
	const wrapper = HTML.span(
		{ style: "display: flex; align-items: center; min-width: 0;" },
		sliderContainer,
		inputBox,
	);
	// Slider container shrinks, input box stays fixed at 4em.
	sliderContainer.style.flex = "1 1 auto";
	sliderContainer.style.minWidth = "0";
	inputBox.style.flexShrink = "0";
	children.push(wrapper);

	return HTML.div({ class: "selectRow" }, ...children);
}
