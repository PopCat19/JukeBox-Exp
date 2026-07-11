// svg-editor-rect-contract.test.ts
//
// Purpose: Guards fresh SVG geometry capture across movable graph prompt interactions.
//
// This module:
// - Requires every graph editor press path to replace cached geometry.
// - Requires release paths to invalidate cached geometry.
// - Keeps non-drag hover paths safe after cache invalidation.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const editorPaths = [
	"editor/components/filter-editor.ts",
	"editor/components/harmonics-editor.ts",
	"editor/components/spectrum-editor.ts",
] as const;

function source(path: string): string {
	return readFileSync(join(root, path), "utf8");
}

function methodBody(contents: string, name: string, nextName: string): string {
	const start = contents.indexOf(`private ${name}`);
	const end = contents.indexOf(`private ${nextName}`, start + 1);
	expect(start).toBeGreaterThanOrEqual(0);
	expect(end).toBeGreaterThan(start);
	return contents.slice(start, end);
}

describe("movable SVG editor geometry", () => {
	for (const path of editorPaths) {
		test(`${path} press replaces cached geometry`, () => {
			const body = methodBody(source(path), "_whenMousePressed", "_whenTouchPressed");
			expect(body).toContain("this._svgRect = this._svg.getBoundingClientRect();");
			expect(body).not.toContain("if (!this._svgRect)");
		});

		test(`${path} release invalidates cached geometry`, () => {
			const contents = source(path);
			const start = contents.indexOf("private _whenCursorReleased");
			const end = contents.indexOf("\n\tpublic ", start + 1);
			expect(start).toBeGreaterThanOrEqual(0);
			expect(end).toBeGreaterThan(start);
			expect(contents.slice(start, end)).toContain("this._svgRect = null;");
		});
	}

	test("filter hover lazily recaptures invalidated geometry", () => {
		const body = methodBody(source(editorPaths[0]), "_whenMouseMoved", "_whenTouchMoved");
		expect(body).toContain(
			"if (!this._svgRect) this._svgRect = this._svg.getBoundingClientRect();",
		);
	});

	test("spectrum hover lazily recaptures invalidated geometry", () => {
		const body = methodBody(source(editorPaths[2]), "_whenMouseMoved", "_whenTouchMoved");
		expect(body).toContain(
			"if (!this._svgRect) this._svgRect = this._svg.getBoundingClientRect();",
		);
	});

	test("filter drag snapshot copies the fresh press geometry", () => {
		const body = methodBody(source(editorPaths[0]), "_whenMousePressed", "_whenTouchPressed");
		const capture = body.indexOf("this._svgRect = this._svg.getBoundingClientRect();");
		const snapshot = body.indexOf("this._dragSvgRect = DOMRect.fromRect(this._svgRect);");
		expect(snapshot).toBeGreaterThan(capture);
	});
});
