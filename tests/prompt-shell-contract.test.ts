// prompt-shell-contract.test.ts
//
// Purpose: Guard standard titlebar and button-row structure for editor graph prompts
//
// This module:
// - Verifies harmonics and spectrum prompts build the shared titlebar
// - Verifies graph action semantics and single-source copy/paste spacing
// - Verifies custom filter icons remain inline before their labels

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function read(path: string): string {
	return readFileSync(path, "utf8");
}

describe("graph prompt shell contract", () => {
	test("harmonics and spectrum prompts build the shared titlebar", () => {
		for (const path of [
			"editor/components/harmonics-editor.ts",
			"editor/components/spectrum-editor.ts",
		]) {
			const source = read(path);
			expect(source.includes('import { buildPromptTitlebar } from "../prompts/base-prompt"')).toBeTrue();
			expect(source.includes("buildPromptTitlebar(this.container);")).toBeTrue();
		}
	});

	test("harmonics, spectrum, and filter prompts use the standard button row", () => {
		const graphSources = [
			read("editor/components/harmonics-editor.ts"),
			read("editor/components/spectrum-editor.ts"),
		];
		const filter = read("editor/prompts/custom-filter-prompt.ts");
		const filterEditor = read("editor/components/filter-editor.ts");
		const chip = read("editor/prompts/custom-chip-prompt.ts");

		for (const source of [...graphSources, filter]) {
			expect(source.includes('class: "iconBtnSm promptCopyPasteButton copyButton"')).toBeTrue();
			expect(source.includes('class: "iconBtnSm promptCopyPasteButton pasteButton"')).toBeTrue();
			expect(source.includes('class: "promptCopyPasteActions"')).toBeTrue();
			expect(source.includes('class: "iconBtnContainer"')).toBeFalse();
			expect(source.includes('style: "width: 185px;"')).toBeFalse();
			expect(source.includes("style: `width:${Sizing.inputSm}")).toBeFalse();
		}
		for (const source of graphSources) {
			expect(source.includes('HTML.div({ class: "prompt-button-row" }')).toBeTrue();
			expect(source.includes('actionButton("Commit")')).toBeTrue();
			expect(source.includes('class: "okayButton", style: "width:45%;"')).toBeFalse();
		}
		expect(filter.includes("this._getOkayRow(this._filterCopyPasteContainer)")).toBeTrue();
		expect(filterEditor.includes('this.container.style.setProperty("width", "100%")')).toBeTrue();
		expect(filterEditor.includes('this.container.style.setProperty("width", "85%")')).toBeFalse();
		expect(filter.includes('class: "iconBtnSm marginRight copyButton"')).toBeFalse();
		expect(chip.includes('class: "iconBtnSm marginRight copyButton"')).toBeFalse();
	});

	test("custom filter copy and paste match harmonics inline icon markup", () => {
		const harmonics = read("editor/components/harmonics-editor.ts");
		const filter = read("editor/prompts/custom-filter-prompt.ts");
		const inlineIconStyle = 'style: "flex-shrink: 0; pointer-events: none;"';

		expect(harmonics.match(new RegExp(inlineIconStyle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))?.length).toBe(2);
		expect(filter.match(new RegExp(inlineIconStyle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))?.length).toBe(2);
		expect(filter.includes('class: "iconBtnSvgOverlay"')).toBeFalse();
		expect(filter.indexOf('style: "flex-shrink: 0; pointer-events: none;"')).toBeLessThan(
			filter.indexOf('"Copy",'),
		);
		expect(filter.lastIndexOf('style: "flex-shrink: 0; pointer-events: none;"')).toBeLessThan(
			filter.indexOf('"Paste",'),
		);
	});

	test("graph prompt styles preserve editor geometry responsively", () => {
		const styles = read("editor/rendering/styles/filter-editors.ts");

		expect(
			styles.includes(".beepboxEditor .customFilterPrompt {\n\tbox-sizing: border-box;"),
		).toBeTrue();
		expect(
			styles.includes(".beepboxEditor .graphEditorPrompt {\n\tbox-sizing: border-box;"),
		).toBeTrue();
		expect(styles.match(/max-width: calc\(100vw - 24px\);/g)?.length).toBe(2);
		expect(styles.match(/box-sizing: border-box;/g)?.length).toBe(2);
		expect(
			styles.includes(
				".customFilterPrompt {\n\tbox-sizing: border-box;\n\twidth: 500px;\n\tmax-width: calc(100vw - 24px);",
			),
		).toBeTrue();
		expect(
			styles.includes(
				".graphEditorPrompt {\n\tbox-sizing: border-box;\n\twidth: 500px;\n\tmax-width: calc(100vw - 24px);",
			),
		).toBeTrue();
		expect(styles.includes("aspect-ratio: 120 / 26;")).toBeTrue();
		expect(styles.includes("height: auto !important;")).toBeTrue();
		expect(styles.includes(".promptCopyPasteActions {\n\tdisplay: flex;\n\tgap: 5px;\n\twidth: max-content;")).toBeTrue();
		expect(styles.includes(".promptCopyPasteButton {\n\tdisplay: inline-flex;\n\talign-items: center;\n\tgap: 4px;\n\twidth: max-content;\n\theight: 26px;\n\tpadding: 0 var(--padding-12);")).toBeTrue();
		const actionButton = read("editor/ui/buttons/action-button.ts");
		expect(actionButton.includes("padding:0 var(--padding-12);")).toBeTrue();
		expect(styles.includes(".promptCopyPasteActions {\n\tdisplay: flex;\n\tgap: 5px;\n\twidth: 185px;")).toBeFalse();
		expect(styles.includes(".promptCopyPasteButton {\n\twidth: var(--input-width-sm, 86px);")).toBeFalse();
		expect(styles.includes(".iconBtnSm.marginRight")).toBeFalse();
		expect(styles.includes("margin-right: 5px;")).toBeFalse();
		expect(styles.includes(".graphEditorPrompt .prompt-button-row")).toBeFalse();
		expect(styles.includes("justify-content: space-between;")).toBeFalse();

		const shell = read("editor/rendering/styles/prompt-shell.ts");
		expect(shell.includes(".prompt-button-row {\n\tdisplay: flex;")).toBeTrue();
		expect(shell.includes("justify-content: flex-end;")).toBeTrue();
	});
});
