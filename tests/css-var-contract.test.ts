// css-var-contract.test.ts
//
// Purpose: Validate CSS custom property names against the shared style contract

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { isKnownCssVariable, knownCssVarSet, requiredThemeCssVars } from "../shared/styles/css-var-contract";

const scanRoots: readonly string[] = ["editor", "player", "shared", "website"];
const scanExtensions: readonly string[] = [".ts", ".css", ".html"];

function collectFiles(root: string): string[] {
	const paths: string[] = [];
	for (const entry of readdirSync(root)) {
		const path = join(root, entry);
		const stat = statSync(path);
		if (stat.isDirectory()) {
			paths.push(...collectFiles(path));
			continue;
		}
		for (const ext of scanExtensions) {
			if (path.endsWith(ext)) paths.push(path);
		}
	}
	return paths;
}

function read(path: string): string {
	return readFileSync(path, "utf8");
}

function stripLineComments(source: string): string {
	return source
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}

function extractCssVarReferences(source: string): string[] {
	return Array.from(stripLineComments(source).matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g), (match) => match[1]);
}

function extractCssVarDeclarations(source: string): string[] {
	return Array.from(
		stripLineComments(source).matchAll(/(?<![A-Za-z0-9_-])(--[A-Za-z0-9_-]+)\s*:/g),
		(match) => match[1],
	);
}

function extractPmdSetCalls(source: string): string[] {
	return Array.from(stripLineComments(source).matchAll(/set\(\s*"(--[A-Za-z0-9_-]+)"/g), (match) => match[1]);
}

function rememberUnknown(unknown: Map<string, Set<string>>, cssVar: string, path: string): void {
	const paths = unknown.get(cssVar) ?? new Set<string>();
	paths.add(path);
	unknown.set(cssVar, paths);
}

function formatUnknown(unknown: Map<string, Set<string>>): string[] {
	return Array.from(unknown.entries()).map(
		([cssVar, paths]) => `${cssVar}: ${Array.from(paths).sort((left, right) => left.localeCompare(right)).join(", ")}`,
	);
}

describe("css variable contract", () => {
	test("all css variable references and declarations are registered", () => {
		const unknown = new Map<string, Set<string>>();
		for (const path of scanRoots.flatMap(collectFiles)) {
			const vars = [...extractCssVarReferences(read(path)), ...extractCssVarDeclarations(read(path))];
			for (const cssVar of vars) {
				if (knownCssVarSet.has(cssVar)) continue;
				rememberUnknown(unknown, cssVar, path);
			}
		}

		expect(formatUnknown(unknown)).toEqual([]);
	});

	test("theme files only declare registered variables", () => {
		const themeFiles = collectFiles("shared/themes").filter(
			(path) => path.endsWith(".ts") && !path.endsWith("index.ts"),
		);
		const unknown = new Map<string, Set<string>>();
		for (const path of themeFiles) {
			for (const cssVar of extractCssVarDeclarations(read(path))) {
				if (knownCssVarSet.has(cssVar)) continue;
				rememberUnknown(unknown, cssVar, path);
			}
		}

		expect(formatUnknown(unknown)).toEqual([]);
	});

	test("pmd adapter runtime variables are registered", () => {
		const missing = extractPmdSetCalls(read("shared/pmd-adapter.ts")).filter((cssVar) => !isKnownCssVariable(cssVar));
		expect(missing).toEqual([]);
	});

	test("required theme variables are part of the known contract", () => {
		const missing = requiredThemeCssVars.filter((cssVar) => !knownCssVarSet.has(cssVar));
		expect(missing).toEqual([]);
	});

	test("ColorConfig fallback covers all required theme variables", () => {
		const source = stripLineComments(read("shared/color-config.ts"));
		const fallbackVars = new Set(
			Array.from(
				source.matchAll(/valuesToAdd\s*\+=\s*"(--[A-Za-z0-9_-]+):/g),
				(match) => match[1],
			),
		);
		const missing = requiredThemeCssVars.filter((cssVar) => !fallbackVars.has(cssVar));
		expect(missing).toEqual([]);
	});
});
