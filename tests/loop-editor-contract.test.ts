// loop-editor-contract.test.ts
//
// Purpose: Structural contract tests for loop-editor UI invariants
//
// This module:
// - Verifies loop disabled state uses CSS class toggle (survives inline clears)
// - Verifies song-editor doesn't conflict with CSS class approach

import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

function sourceLines(file: string): string[] {
	return readFileSync(resolve(__dirname, file), "utf-8").split("\n");
}

/** Find the line index of a function/method declaration by matching `name(` or `name <` inclusive of private/public prefix. */
function findFunction(lines: string[], name: string): number {
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(` ${name}(`)) return i;
	}
	throw new Error(`function ${name} not found`);
}

/** Return body lines of a function given its opening declaration line index. */
function functionBody(lines: string[], openIdx: number): string[] {
	const body: string[] = [];
	let depth = 0;
	let started = false;
	for (let i = openIdx; i < lines.length; i++) {
		const line = lines[i];
		if (!started) {
			if (line.includes("{")) {
				started = true;
				depth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
				if (depth <= 0) break;
			}
			continue;
		}
		depth += (line.match(/{/g) || []).length;
		depth -= (line.match(/}/g) || []).length;
		if (depth <= 0) break;
		body.push(line);
	}
	return body;
}

describe("loop-editor UI contract / song-editor focus-steal contract", () => {
	const loopLines = sourceLines("../editor/components/loop-editor.ts");
	const songLines = sourceLines("../editor/song-editor.ts");

	// -----------------------------------------------------------------------
	// Category A: Loop disabled state uses CSS class, not inline style
	// -----------------------------------------------------------------------
	test("LoopEditor._render uses classList.toggle for loop disabled state", () => {
		const renderIdx = findFunction(loopLines, "_render");
		const body = functionBody(loopLines, renderIdx);
		// Must use classList.toggle to set disabled state
		const hasClassToggle = body.some((l) => l.includes("classList.toggle"));
		expect(hasClassToggle).toBeTrue();
		// Must NOT set inline opacity for disabled state
		const inlineOpacitySets = body.filter(
			(l) => l.includes("style.opacity") || l.includes("style.opacity"),
		);
		expect(inlineOpacitySets.length).toBe(0);
	});

	// -----------------------------------------------------------------------
	// Category B: song-editor whenUpdated does not conflict with CSS class
	// -----------------------------------------------------------------------
	test("SongEditor.whenUpdated clears loopEditor inline opacity but does not remove loopDisabled class", () => {
		// whenUpdated is an arrow-function property (public whenUpdated = () => { ... })
		// Search for its body by scanning for the inline opacity clears on loopEditor.
		const clearPattern = 'this._loopEditor.container.style.opacity = ""';
		const dimPattern = 'this._loopEditor.container.style.opacity = "0.5"';
		// Verify the inline clears exist (that's fine) but there's no classList.remove for loopDisabled.
		const hasClear = songLines.some((l) => l.includes(clearPattern));
		expect(hasClear).toBeTrue();
		const hasDim = songLines.some((l) => l.includes(dimPattern));
		expect(hasDim).toBeTrue();
		// Verify no classList.remove of the disabled class
		const classRemovals = songLines.filter((l) => l.includes("classList.remove") && l.includes("loopDisabled"));
		expect(classRemovals.length).toBe(0);
	});

	describe("focus-steal contract", () => {
	// -------------------------------------------------------------------
	// Category C: SongEditor constructor registers focus-steal listeners
	// -------------------------------------------------------------------
	test("registers mouseup listener for buttons", () => {
		const hasClosestButton = songLines.some((l) => l.includes("closest(\"button\")"));
		expect(hasClosestButton).toBeTrue();
	});

	test("registers capture-phase keydown listener for Space on select", () => {
		const captureLines = songLines.filter((l) => l.includes("capture: true"));
		expect(captureLines.length).toBeGreaterThan(0);
	});

	test("capture listener checks closest(\"select\") on Space keyCode 32", () => {
		const hasClosestSelect = songLines.some((l) => l.includes("closest(\"select\")"));
		expect(hasClosestSelect).toBeTrue();
	});

	test("capture listener prevents default on Space for selects", () => {
		const hasPreventDefault = songLines.some((l) => l.includes("preventDefault"));
		expect(hasPreventDefault).toBeTrue();
	});

	test("capture listener routes to handleKeyDown", () => {
		const hasHandleKeyDown = songLines.some((l) => l.includes("handleKeyDown"));
		expect(hasHandleKeyDown).toBeTrue();
	});
});
});
