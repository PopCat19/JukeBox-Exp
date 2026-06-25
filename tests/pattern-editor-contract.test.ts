// pattern-editor-contract.test.ts
//
// Purpose: Structural contract tests for pattern-editor.ts rendering invariants
//
// Failure categories:
// - Stale canvas path: _drawNoteToCanvas fast-path (fillRect) returns early
//   without calling beginPath(), leaving a previous envelope path to be filled
//   by the caller's unconditional ctx.fill(). This produces ghost note overlays
//   that persist until SVG container replacement (Bug 3 → Bug 1 cascade).
// - SVG/Canvas y-center divergence: _drawNote uses prettyNumber() for the
//   envelope center but the canvas fast-path uses DPR-aware snap(). This
//   produces a vertical offset between the note body and the envelope overlay
//   (Bug 2).
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
			// Skip the declaration line; start after the opening {
			if (line.includes("{")) {
				started = true;
				depth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
				if (depth <= 0) break; // single-line body
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
	const drawNoteToCanvasIdx = findFunction(lines, "drawNoteToCanvas");
	const drawNoteIdx = findFunction(lines, "drawNote");

	// -----------------------------------------------------------------------
	// Category A: Stale canvas path guard
	// -----------------------------------------------------------------------
	test("_drawNoteToCanvas calls ctx.beginPath before any branch", () => {
		const body = functionBody(lines, drawNoteToCanvasIdx);
		// beginPath must appear after the variable declarations but before
		// the fast-path comment. It must be the only beginPath in the function.
		const beginPathLines = body.filter((l) => l.includes("ctx.beginPath()"));
		expect(beginPathLines.length).toBe(1);

		// Verify it appears before the fast-path check.
		const beginIdx = body.findIndex((l) => l.includes("ctx.beginPath()"));
		const fastPathIdx = body.findIndex((l) => l.includes("Fast-path"));
		const pathBranchIdx = body.findIndex((l) => l.includes("// Fast-path") === false && l.includes("beginPath") === false && l.includes("}"));
		expect(beginIdx).toBeLessThan(fastPathIdx);

		// No beginPath inside the envelope path branch (after fast-path return).
		const returnIdx = body.findIndex((l) => l.trim() === "return;");
		const afterReturn = body.slice(returnIdx + 1);
		const strayBeginPath = afterReturn.filter((l) => l.includes("beginPath"));
		expect(strayBeginPath.length).toBe(0);
	});

	test("_drawNoteToCanvas fast-path fillRect does not contain beginPath", () => {
		const body = functionBody(lines, drawNoteToCanvasIdx);
		const fastPathStart = body.findIndex((l) => l.includes("fillRect is pixel-sharp"));
		const returnIdx = body.findIndex((l, i) => i > fastPathStart && l.trim() === "return;");
		const fastPathBlock = body.slice(fastPathStart, returnIdx + 1);
		// The fast-path block must not contain any beginPath call — beginPath
		// is called once at the function top.
		const hasBeginPath = fastPathBlock.some((l) => l.includes("beginPath"));
		expect(hasBeginPath).toBeFalse();
	});

	// -----------------------------------------------------------------------
	// Category B: SVG/canvas y-center alignment
	// -----------------------------------------------------------------------
	test("_drawNote uses snap() for y-center to match canvas DPR rounding", () => {
		const body = functionBody(lines, drawNoteIdx);

		// Must compute a snap-based centerY.
		const snapDecl = body.find((l) => l.includes("const snap:"));
		expect(snapDecl).toBeDefined();
		expect(snapDecl).toContain("Math.round(v * (this._dpr || 1)) / (this._dpr || 1)");

		const centerYDecl = body.find((l) => l.includes("const centerY:"));
		expect(centerYDecl).toBeDefined();
		expect(centerYDecl).toContain("snap(this._pitchToPixelHeight(");

		// Verify centerY variable is used in path string computation, not raw pitchToPixelHeight.
		// The path lines use `centerY` (variable name, not literal string).
		const pathLines = body.filter((l) => l.includes("centerY") || l.includes("prettyNumber(this._pitchToPixelHeight"));
		const usesSnappedCenter = pathLines.some((l) => /\bcenterY\b/.test(l));
		const usesRawPixelHeight = pathLines.some((l) => l.includes("prettyNumber(this._pitchToPixelHeight"));
		expect(usesSnappedCenter).toBeTrue();
		expect(usesRawPixelHeight).toBeFalse();
	});

	test("_drawNote has no standalone beginPath (it builds SVG path strings)", () => {
		const body = functionBody(lines, drawNoteIdx);
		// _drawNote only builds SVG 'd' attribute strings, never calls ctx methods.
		const hasCtxCall = body.some((l) => l.includes("ctx."));
		expect(hasCtxCall).toBeFalse();
	});
});
