// css-var-contract.test.ts
//
// Purpose: Validate CSS custom property names against the shared style contract

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import {
	isKnownCssVariable,
	knownCssVarSet,
	requiredThemeCssVars,
	supplementalThemeFallbackCssVars,
	themeCssVarFallbacks,
} from "../shared/styles/css-var-contract";

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

const expectedRequiredThemeCssVars: readonly string[] = [
	"--editor-background",
	"--primary-text",
	"--secondary-text",
	"--ui-widget-background",
	"--indicator-primary",
	"--indicator-secondary",
];

describe("css variable contract", () => {
	test("required theme variable set is stable and matches the canonical six", () => {
		const actual: string[] = [...requiredThemeCssVars];
		const expected: string[] = [...expectedRequiredThemeCssVars];
		expect(actual.sort((a, b) => a.localeCompare(b))).toEqual(
			expected.sort((a, b) => a.localeCompare(b)),
		);
	});

	test("every bundled theme file is imported by the theme registry", () => {
		const themeFiles = collectFiles("shared/themes")
			.filter((path) => path.endsWith(".ts") && !path.endsWith("index.ts"))
			.map((path) => basename(path, ".ts"));
		const indexSource = read("shared/themes/index.ts");
		const importedPaths = Array.from(
			indexSource.matchAll(/from\s*"\.\/([^"]+)"/g),
			(match) => match[1],
		);
		const missing = themeFiles.filter((name) => !importedPaths.includes(name));
		expect(missing).toEqual([]);
	});

	test("every imported theme binding is wired into the exported registry", () => {
		const indexSource = read("shared/themes/index.ts");
		const importEnd = indexSource.lastIndexOf("from \"./");
		const registrySource = indexSource.slice(importEnd);
		const importedBindings = Array.from(
			indexSource.matchAll(/import\s*\{\s*([^}]+)\s*\}\s*from/g),
		)
			.flatMap((match) => match[1].split(","))
			.map((binding) => binding.replace(/\s+as\s+.+$/, "").trim())
			.filter((binding) => binding.length > 0);
		const registryIdentifiers = new Set<string>(
			Array.from(registrySource.matchAll(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g), (match) => match[1]),
		);
		const unwired = importedBindings.filter((binding) => !registryIdentifiers.has(binding));
		expect(unwired).toEqual([]);
	});

	test("every bundled theme file declares a :root variable block", () => {
		const themeFiles = collectFiles("shared/themes").filter(
			(path) => path.endsWith(".ts") && !path.endsWith("index.ts"),
		);
		const withoutRoot = themeFiles.filter((path) => !/:root\s*\{/.test(stripLineComments(read(path))));
		expect(withoutRoot).toEqual([]);
	});

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

	test("theme fallback map covers all required theme variables", () => {
		const fallbackKeys = new Set(Object.keys(themeCssVarFallbacks));
		const missing = requiredThemeCssVars.filter((cssVar) => !fallbackKeys.has(cssVar));
		expect(missing).toEqual([]);
	});

	test("theme fallback map covers all supplemental fallback variables (#34)", () => {
		const fallbackKeys = new Set(Object.keys(themeCssVarFallbacks));
		const missing = supplementalThemeFallbackCssVars.filter((cssVar) => !fallbackKeys.has(cssVar));
		expect(missing).toEqual([]);
	});

	test("theme fallback map values are non-empty and keys are registered", () => {
		const bad: string[] = [];
		for (const [varName, value] of Object.entries(themeCssVarFallbacks)) {
			if (!knownCssVarSet.has(varName)) bad.push(`${varName}: not in knownCssVarSet`);
			if (typeof value !== "string" || value.length === 0) bad.push(`${varName}: empty value`);
		}
		expect(bad).toEqual([]);
	});
});
