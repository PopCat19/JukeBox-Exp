// style-inject.test.ts
//
// Purpose: Behavioral tests for shared/styles/inject.ts

import { describe, expect, test } from "bun:test";
import { injectGlobalStyles } from "../shared/styles/inject";

interface MockStyleElement {
	textContent: string | null;
	attributes: Record<string, string>;
	getAttribute(name: string): string | null;
	setAttribute(name: string, value: string): void;
}

interface MockStyleList {
	length: number;
	item(index: number): HTMLStyleElement;
}

function createMockStyleElement(): HTMLStyleElement {
	const style: MockStyleElement = {
		textContent: null,
		attributes: {},
		getAttribute(name: string): string | null {
			return this.attributes[name] ?? null;
		},
		setAttribute(name: string, value: string): void {
			this.attributes[name] = value;
		},
	};

	return style as unknown as HTMLStyleElement;
}

function createMockDocument(): { doc: Document; appendedStyles: HTMLStyleElement[] } {
	const appendedStyles: HTMLStyleElement[] = [];
	const head = {
		querySelectorAll(selector: string): MockStyleList {
			expect(selector).toBe("style[data-jb-style]");
			const styles = appendedStyles.filter((style) => style.getAttribute("data-jb-style") !== null);
			return {
				length: styles.length,
				item(index: number): HTMLStyleElement {
					return styles[index];
				},
			};
		},
		appendChild(style: HTMLStyleElement): HTMLStyleElement {
			appendedStyles.push(style);
			return style;
		},
	};
	const doc = {
		head,
		createElement(tag: string): HTMLStyleElement {
			expect(tag).toBe("style");
			return createMockStyleElement();
		},
	};

	return { doc: doc as unknown as Document, appendedStyles };
}

describe("injectGlobalStyles", () => {
	test("creates a tagged style element", () => {
		const { doc, appendedStyles } = createMockDocument();

		const style = injectGlobalStyles(doc, "editor-main", ".a { color: red; }");

		expect(appendedStyles).toHaveLength(1);
		expect(style).toBe(appendedStyles[0]);
		expect(style.getAttribute("type")).toBe("text/css");
		expect(style.getAttribute("data-jb-style")).toBe("editor-main");
		expect(style.textContent).toBe(".a { color: red; }");
	});

	test("updates an existing tagged style element without appending a duplicate", () => {
		const { doc, appendedStyles } = createMockDocument();

		const first = injectGlobalStyles(doc, "player-main", ".a { color: red; }");
		const second = injectGlobalStyles(doc, "player-main", ".a { color: blue; }");

		expect(appendedStyles).toHaveLength(1);
		expect(second).toBe(first);
		expect(first.textContent).toBe(".a { color: blue; }");
	});

	test("matches ids as attribute values instead of selector fragments", () => {
		const { doc, appendedStyles } = createMockDocument();
		const id = 'odd"style]id';

		const first = injectGlobalStyles(doc, id, ".a { color: red; }");
		const second = injectGlobalStyles(doc, id, ".a { color: blue; }");

		expect(appendedStyles).toHaveLength(1);
		expect(second).toBe(first);
		expect(first.getAttribute("data-jb-style")).toBe(id);
		expect(first.textContent).toBe(".a { color: blue; }");
	});
});
