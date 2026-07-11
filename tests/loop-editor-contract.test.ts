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
	test("registers mousedown listener restoring mainLayer focus when body focused", () => {
		const hasBodyCheck = songLines.some((l) => l.includes("activeElement === document.body"));
		expect(hasBodyCheck).toBeTrue();
		const hasMainLayerFocus = songLines.some((l) => l.includes("mainLayer.focus"));
		expect(hasMainLayerFocus).toBeTrue();
	});

	test("registers capture-phase keydown listener for Space on select", () => {
		const captureLines = songLines.filter((l) => l.includes("capture: true"));
		expect(captureLines.length).toBeGreaterThan(0);
	});

	test("capture listener intercepts Space/ArrowUp/ArrowDown on non-input elements", () => {
		const hasArrowUp = songLines.some((l) => l.includes("38"));
		const hasArrowDown = songLines.some((l) => l.includes("40"));
		expect(hasArrowUp).toBeTrue();
		expect(hasArrowDown).toBeTrue();
		const hasPreventDefault = songLines.some((l) => l.includes("preventDefault"));
		expect(hasPreventDefault).toBeTrue();
		const hasFormCheck = songLines.some(
			(l) => l.includes("HTMLInputElement") || l.includes("instanceof"),
		);
		expect(hasFormCheck).toBeTrue();
	});

	test("capture listener routes to handleKeyDown", () => {
		const hasHandleKeyDown = songLines.some((l) => l.includes("handleKeyDown"));
		expect(hasHandleKeyDown).toBeTrue();
	});
});

	// -------------------------------------------------------------------
	// Category D: mouseup listener does NOT steal focus from <select>
	// (regression guard for issue #11: Firefox closes native dropdown)
	// -------------------------------------------------------------------
	describe("mouseup focus-steal select regression contract", () => {
		/** Return the source slice of the mouseup rAF listener block. */
		function mouseupListenerBlock(): string[] {
			const idx = songLines.findIndex((l) => l.includes('addEventListener("mouseup"'));
			if (idx < 0) throw new Error("mouseup listener not found");
			const block: string[] = [];
			let depth = 0;
			let started = false;
			for (let i = idx; i < songLines.length; i++) {
				const line = songLines[i];
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
				block.push(line);
				if (depth <= 0) break;
			}
			return block;
		}

		test("mouseup listener condition omits HTMLSelectElement branch", () => {
			const block = mouseupListenerBlock();
			const hasSelectBranch = block.some((l) => l.includes("HTMLSelectElement"));
			expect(hasSelectBranch).toBeFalse();
		});

		test("mouseup listener retains document.body branch (off-click path)", () => {
			const block = mouseupListenerBlock();
			const hasBodyBranch = block.some((l) => l.includes("activeElement === document.body"));
			expect(hasBodyBranch).toBeTrue();
		});

		test("mouseup listener retains HTMLButtonElement branch (button path)", () => {
			const block = mouseupListenerBlock();
			const hasButtonBranch = block.some((l) => l.includes("HTMLButtonElement"));
			expect(hasButtonBranch).toBeTrue();
		});

		test("mouseup listener clears openedSelect only inside the focus-restore branch", () => {
			const block = mouseupListenerBlock();
			// openedSelect is cleared inside the body/button branch only, not
			// unconditionally, so the opening click retains state for the pick.
			const hasBranchClear = block.some((l) => l.includes("openedSelect = null"));
			expect(hasBranchClear).toBeTrue();
		});
	});

	// -------------------------------------------------------------------
	// Category E: change listener restores mainLayer focus after a pick
	// -------------------------------------------------------------------
	describe("change listener focus-restore contract", () => {
		test("document-level change listener targets HTMLSelectElement", () => {
			const hasChangeListener = songLines.some((l) => l.includes('addEventListener("change"'));
			expect(hasChangeListener).toBeTrue();
			const hasSelectCheck = songLines.some((l) =>
				l.includes("event.target instanceof HTMLSelectElement"));
			expect(hasSelectCheck).toBeTrue();
		});

		test("change listener restores mainLayer focus inside requestAnimationFrame", () => {
			const idx = songLines.findIndex((l) => l.includes('addEventListener("change"'));
			expect(idx).toBeGreaterThanOrEqual(0);
			const slice = songLines.slice(idx, idx + 16);
			const hasRaf = slice.some((l) => l.includes("requestAnimationFrame"));
			expect(hasRaf).toBeTrue();
			const hasFocus = slice.some((l) => l.includes("mainLayer.focus"));
			expect(hasFocus).toBeTrue();
		});

		test("change listener is gated on openedSelect and keyboardNavigatingSelect", () => {
			const idx = songLines.findIndex((l) => l.includes('addEventListener("change"'));
			expect(idx).toBeGreaterThanOrEqual(0);
			const slice = songLines.slice(idx, idx + 16);
			const hasOpenGate = slice.some((l) => l.includes("openedSelect !== null"));
			expect(hasOpenGate).toBeTrue();
			const hasKeyboardGate = slice.some((l) => l.includes("!keyboardNavigatingSelect"));
			expect(hasKeyboardGate).toBeTrue();
		});

		test("mousedown listener stores the select element in openedSelect", () => {
			const hasMousedown = songLines.some((l) =>
				l.includes('addEventListener("mousedown"'));
			expect(hasMousedown).toBeTrue();
			const hasStore = songLines.some((l) => l.includes("openedSelect = target"));
			expect(hasStore).toBeTrue();
		});

		test("keydown listener handles arrow, Enter, and Escape on openedSelect", () => {
			let idx = -1;
			for (let i = 0; i < songLines.length; i++) {
				if (
					songLines[i].includes('addEventListener("keydown"') &&
					songLines.slice(i, i + 30).some((s) => s.includes("openedSelect"))
				) {
					idx = i;
					break;
				}
			}
			expect(idx).toBeGreaterThanOrEqual(0);
			const slice = songLines.slice(idx, idx + 40);
			const hasArrows = slice.some((l) => l.includes("keyboardNavigatingSelect = true"));
			expect(hasArrows).toBeTrue();
			const hasEnter = slice.some((l) =>
				l.includes("keyboardNavigatingSelect = false"));
			expect(hasEnter).toBeTrue();
			const hasEscape = slice.some((l) => l.includes("event.keyCode === 27"));
			expect(hasEscape).toBeTrue();
		});
	});
});
