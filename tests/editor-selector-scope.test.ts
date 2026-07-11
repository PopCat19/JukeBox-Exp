// editor-selector-scope.test.ts
//
// Purpose: Guard that editor CSS selectors root under .beepboxEditor
//
// This module:
// - Imports every editor/rendering/styles/*.ts build function
// - Extracts class selectors from the generated CSS
// - Fails when a class selector leaks past the .beepboxEditor scope
// - Maintains a baseline allowlist of known page-level exceptions

import { beforeAll, describe, expect, test } from "bun:test";
import { buildAnimationsCSS } from "../editor/rendering/styles/animations";
import { buildBaseWidgetsCSS } from "../editor/rendering/styles/base-widgets";
import { buildEditorLayoutCSS } from "../editor/rendering/styles/editor-layout";
import { buildFilterEditorsCSS } from "../editor/rendering/styles/filter-editors";
import { buildFormInputsCSS } from "../editor/rendering/styles/form-inputs";
import { buildIconButtonsCSS } from "../editor/rendering/styles/icon-buttons";
import { buildIconSymbolsCSS } from "../editor/rendering/styles/icon-symbols";
import { buildCleanChannelCSS } from "../editor/rendering/styles/prompt-clean-channel";
import { buildPromptCompactSearchCSS } from "../editor/rendering/styles/prompt-compact-search";
import { buildKeyboardShortcutsCSS } from "../editor/rendering/styles/prompt-keyboard-shortcuts";
import { buildPromptMiscCSS } from "../editor/rendering/styles/prompt-misc";
import { buildSampleBrowserCSS } from "../editor/rendering/styles/prompt-sample-browser";
import { buildPromptShellCSS } from "../editor/rendering/styles/prompt-shell";
import { buildPromptSmallCSS } from "../editor/rendering/styles/prompt-small";
import { buildResponsiveCSS } from "../editor/rendering/styles/responsive";
import { buildSharedUICSS } from "../editor/rendering/styles/shared-ui";

beforeAll(() => {
	if (typeof globalThis.localStorage === "undefined") {
		const store = new Map<string, string>();
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			value: {
				getItem: (key: string) => store.get(key) ?? null,
				setItem: (key: string, value: string) => store.set(key, value),
				removeItem: (key: string) => store.delete(key),
			},
		});
	}
});

const builders: ReadonlyArray<readonly [string, () => string]> = [
	["animations", buildAnimationsCSS],
	["base-widgets", buildBaseWidgetsCSS],
	["editor-layout", buildEditorLayoutCSS],
	["filter-editors", buildFilterEditorsCSS],
	["form-inputs", buildFormInputsCSS],
	["icon-buttons", buildIconButtonsCSS],
	["icon-symbols", buildIconSymbolsCSS],
	["prompt-clean-channel", buildCleanChannelCSS],
	["prompt-compact-search", buildPromptCompactSearchCSS],
	["prompt-keyboard-shortcuts", buildKeyboardShortcutsCSS],
	["prompt-misc", buildPromptMiscCSS],
	["prompt-sample-browser", buildSampleBrowserCSS],
	["prompt-shell", buildPromptShellCSS],
	["prompt-small", buildPromptSmallCSS],
	["responsive", buildResponsiveCSS],
	["shared-ui", buildSharedUICSS],
];

// Known page-level selectors that intentionally bypass the .beepboxEditor root.
// Audit §5 exception: :root custom properties, html, and .obtrusive-scrollbars
// scrollbar rules are page-level by necessity. Each entry is [module, selector].
const baselineAllowlist: ReadonlyArray<readonly [string, string]> = [
	["form-inputs", ".modTarget:hover"],
	["responsive", "#beepboxEditorContainer"],
];

function isPageLevel(selector: string): boolean {
	const trimmed = selector.trim();
	if (trimmed.startsWith(":root")) return true;
	if (trimmed.startsWith("html") && !/[a-zA-Z0-9_-]/.test(trimmed.slice(4, 5))) return true;
	if (trimmed === ".obtrusive-scrollbars" || trimmed.startsWith(".obtrusive-scrollbars.")) return true;
	if (trimmed.startsWith("@")) return true;
	return false;
}

function isKeyframeSelector(selector: string): boolean {
	const trimmed = selector.trim();
	if (trimmed === "from" || trimmed === "to") return true;
	if (/^\d+(\.\d+)?%$/.test(trimmed)) return true;
	return false;
}

function isBeepboxEditorScoped(selector: string): boolean {
	const trimmed = selector.trim();
	if (!trimmed.startsWith(".beepboxEditor")) return false;
	const after = trimmed.slice(".beepboxEditor".length);
	if (after.length === 0) return true;
	const nextChar = after[0];
	return /[\s.:#>~+[]/.test(nextChar);
}

function extractClassSelectors(css: string): string[] {
	const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, "");
	const selectors: string[] = [];
	const parseBlock = (source: string): void => {
		let current = "";
		let i = 0;
		while (i < source.length) {
			const ch = source[i];
			if (ch === "{") {
				const sel = current.trim();
				if (sel.startsWith("@")) {
					let depth = 1;
					let inner = "";
					i++;
					while (i < source.length && depth > 0) {
						if (source[i] === "{") depth++;
						else if (source[i] === "}") depth--;
						if (depth > 0) inner += source[i];
						i++;
					}
					parseBlock(inner);
					current = "";
					continue;
				}
				if (sel.length > 0 && !sel.startsWith("@")) {
					for (const part of sel.split(",")) {
						const trimmed = part.trim();
						if (trimmed.length > 0) selectors.push(trimmed);
					}
				}
				current = "";
			} else if (ch === "}") {
				current = "";
			} else {
				current += ch;
			}
			i++;
		}
		};
	parseBlock(cleaned);
	return selectors;
}

function leakedSelectors(css: string): string[] {
	return extractClassSelectors(css).filter((selector) => {
		if (isBeepboxEditorScoped(selector)) return false;
		if (isPageLevel(selector)) return false;
		if (isKeyframeSelector(selector)) return false;
		return true;
	});
}

describe("editor selector scoping", () => {
	const allowlistMatches = new Set<string>();
	for (const [module, builder] of builders) {
		test(`${module} selectors root under .beepboxEditor or are baseline-allowed`, () => {
			const css = builder();
			const leaks = leakedSelectors(css);
			const allowed = new Set(
				baselineAllowlist
					.filter(([mod]) => mod === module)
					.map(([, selector]) => selector),
			);
			const unexpected = leaks.filter((selector) => {
				if (allowed.has(selector)) {
					allowlistMatches.add(`${module}:${selector}`);
					return false;
				}
				return true;
			});
			expect(unexpected).toEqual([]);
		});
	}

	test("every baseline allowlist entry matches a real leaked selector", () => {
		const allLeaks = new Set<string>();
		for (const [module, builder] of builders) {
			for (const selector of leakedSelectors(builder())) {
				allLeaks.add(`${module}:${selector}`);
			}
		}
		const unused = baselineAllowlist
			.filter(([module, selector]) => !allLeaks.has(`${module}:${selector}`))
			.map(([module, selector]) => `${module}:${selector}`);
		expect(unused).toEqual([]);
	});
});
