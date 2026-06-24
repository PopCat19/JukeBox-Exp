// select-helpers.ts
//
// Purpose: Shared DOM helpers for synchronizing HTMLSelectElement values
//
// This module:
// - Provides setSelectedValue to set select value only when it differs
// - Supports optional select2 jQuery plugin trigger

export function setSelectedValue(menu: HTMLSelectElement, value: number, isSelect2: boolean = false): void {
	const stringValue = value.toString();
	if (menu.value !== stringValue) {
		menu.value = stringValue;
		if (isSelect2) {
			($(menu) as any).val(value).trigger("change.select2");
		}
	}
}
