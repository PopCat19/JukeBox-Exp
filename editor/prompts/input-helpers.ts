// InputHelpers
//
// Purpose: Shared validation and layout helpers for prompt dialogs
//
// This module:
// - Provides number input validation (key filtering, blur clamping)
// - Builds label+input flex rows and okay button rows

import { HTML } from "imperative-html/dist/esm/elements-strict";

const { div } = HTML;

export function validateKey(event: KeyboardEvent): boolean {
	const charCode = (event.which) ? event.which : event.keyCode;
	if (charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57)) {
		event.preventDefault();
		return true;
	}
	return false;
}

export function validateNumber(event: Event): void {
	const el: HTMLInputElement = <HTMLInputElement> event.target;
	el.value = String(validate(el));
}

export function validate(input: HTMLInputElement): number {
	return Math.floor(Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value))));
}

export function labelRow(...children: (HTMLElement | string)[]): HTMLDivElement {
	return div(
		{ style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" },
		...children,
	);
}

export function updatePlayButton(btn: HTMLButtonElement, playing: boolean): void {
	if (playing) {
		btn.classList.remove("playButton");
		btn.classList.add("pauseButton");
		btn.title = "Pause (Space)";
		btn.innerText = "Pause";
	} else {
		btn.classList.remove("pauseButton");
		btn.classList.add("playButton");
		btn.title = "Play (Space)";
		btn.innerText = "Play";
	}
}
