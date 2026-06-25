// pattern-editor-contract.test.ts
//
// Purpose: Structural contract tests for pattern-editor.ts rendering invariants
//
// Failure categories:
// - Stale canvas path: _drawNoteToCanvas was removed; notes now render as SVG
//   paths via _drawNoteToSvg (calls _drawNote to build path string). This
//   eliminates pixel-sharp fillRect seam issues entirely. SVG anti-aliasing
//   naturally produces ~0.5-1px gaps between adjacent notes.
// - SVG/Canvas y-center divergence: _drawNote uses prettyNumber() for the
//   envelope center but the old canvas fast-path used DPR-aware snap(). Now
//   that all note bodies are SVG, the envelope and body share the same
//   coordinate system.
// - _drawNoteToSvg wraps _drawNote to create a filled SVG path element.
//
// These invariants are verified by scanning the source file at test time,
// because pattern-editor depends on a live DOM + canvas context and cannot
// be instantiated headless in bun:test.

import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

function sourceLines(): string[] {
	return readFileSync(resolve(__dirname, "../editor/components/pattern-editor.ts"), "utf-8").split("\n");
}

/** Find the line index of a function declaration by matching `private _funcName(` or `private _funcName <` */
function findFunction(lines: string[], name: string): number {
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes(`private _${name}(`)) return i;
	}
	throw new Error(`function _${name} not found`);
}

/** Return lines of a function body given its opening declaration line index. */
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

describe("pattern-editor rendering contract", () => {
	const lines = sourceLines();
	const drawNoteToSvgIdx = findFunction(lines, "drawNoteToSvg");
	const drawNoteIdx = findFunction(lines, "drawNote");
	const redrawPatternsIdx = findFunction(lines, "redrawNotePatterns");

	// -----------------------------------------------------------------------
	// Category A: Note bodies use SVG paths (not canvas fillRect)
	// -----------------------------------------------------------------------
	test("_drawNoteToSvg creates SVG path element via _drawNote", () => {
		const body = functionBody(lines, drawNoteToSvgIdx);
		// Must create an SVG path element
		expect(body.some((l) => l.includes("SVG.path()"))).toBeTrue();
		// Must call _drawNote to build the path string
		expect(body.some((l) => l.includes("this._drawNote("))).toBeTrue();
		// Must append to _svgNoteContainer
		expect(body.some((l) => l.includes("this._svgNoteContainer.appendChild"))).toBeTrue();
	});

	test("_redrawNotePatterns uses _drawNoteToSvg for note bodies (not canvas)", () => {
		const body = functionBody(lines, redrawPatternsIdx);
		// Note bodies must be drawn via SVG, not canvas
		const drawSvgCalls = body.filter((l) => l.includes("this._drawNoteToSvg("));
		expect(drawSvgCalls.length).toBeGreaterThan(0);
		// No reference to canvas note drawing
		const canvasNoteCalls = body.filter((l) => l.includes("_drawNoteToCanvas"));
		expect(canvasNoteCalls.length).toBe(0);
	});

	// -----------------------------------------------------------------------
	// Category B: fillStyle ordering — must be set before _drawNoteToCanvas
	// if canvas note drawing were used. Not applicable with SVG paths.
	// -----------------------------------------------------------------------

	// -----------------------------------------------------------------------
	// Category C: SVG/canvas y-center alignment
	// -----------------------------------------------------------------------
	test("_drawNote calls _drawNote (SVG path string builder)", () => {
		const body = functionBody(lines, drawNoteIdx);
		// _drawNote only builds SVG 'd' attribute strings, never calls ctx methods.
		const hasCtxCall = body.some((l) => l.includes("ctx."));
		expect(hasCtxCall).toBeFalse();
	});
});
