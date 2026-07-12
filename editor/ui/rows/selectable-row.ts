// Purpose: Applies shared PMD interaction and selection state to list rows.

import { focusReveal, hoverReveal, setActive } from "../interactions";

export function selectableRow<T extends HTMLElement>(element: T, active = false): T {
	element.classList.add("selectableRow");
	hoverReveal(element);
	focusReveal(element);
	setSelectableRowActive(element, active);
	return element;
}

export function setSelectableRowActive(element: HTMLElement, active: boolean): void {
	setActive(element, active);
	element.classList.toggle("active", active);
}
