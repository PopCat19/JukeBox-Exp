// dom-hooks.test.ts
//
// Purpose: Guard that published editor and prompt DOM hooks stay declared in source
//
// This module:
// - Statically asserts editor mount, prompt shell, lifecycle, popout, and interaction hooks
// - Fails when a published hook literal is removed or renamed

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function read(path: string): string {
	return readFileSync(path, "utf8");
}

function stripLineComments(source: string): string {
	return source
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}

function stripBlockComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function assertLiteral(path: string, literal: string): void {
	const source = stripBlockComments(stripLineComments(read(path)));
	expect(source.includes(literal)).toBeTrue();
}

describe("editor and prompt DOM hooks", () => {
	test("editor mount and shell hooks stay declared", () => {
		assertLiteral("editor/song-editor.ts", '"beepboxEditor"');
		assertLiteral("editor/main.ts", '"beepboxEditorContainer"');
		assertLiteral("editor/song-editor.ts", '"promptContainer"');
	});

	test("prompt structural and lifecycle hooks stay declared", () => {
		assertLiteral("editor/components/spectrum-editor.ts", '"prompt noSelection"');
		assertLiteral("editor/core/prompt-manager.ts", 'classList.add("entering")');
		assertLiteral("editor/core/prompt-manager.ts", 'classList.add("exiting")');
		assertLiteral("editor/core/prompt-manager.ts", 'classList.add("focused")');
		assertLiteral("editor/core/prompt-manager.ts", 'classList.add("refocus")');
		assertLiteral("editor/core/prompt-dock.ts", 'classList.add("docked")');
	});

	test("prompt popout, PMD role, and scrollbar hooks stay declared", () => {
		assertLiteral("editor/core/prompt-popout.ts", 'dataset.popout = "true"');
		assertLiteral("editor/core/prompt-popout.ts", 'removeAttribute("data-popout")');
		assertLiteral("editor/ui/interactions.ts", "dataset.pmdRole");
		assertLiteral("editor/rendering/style.ts", 'classList.add("obtrusive-scrollbars")');
	});
});
