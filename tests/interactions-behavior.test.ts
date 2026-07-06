// interactions-behavior.test.ts
//
// Purpose: Behavioral tests for editor/ui/interactions.ts
//
// Why a hand-rolled DOM mock:
// - Project has zero DOM-test deps today; this file adds behavioral
//   coverage without introducing happy-dom or jsdom.
// - interactions.ts touches a narrow DOM surface (classList.add/remove/
//   toggle, style.setProperty/removeProperty, dataset[key] = value,
//   document.createElement("style"), document.head.appendChild,
//   document.head.querySelectorAll("style[data-jb-style]")).
//   A targeted recorder for those surfaces is clearer than a full
//   DOM polyfill.
//
// Recorder strategy: every mock element exposes its own recorder
// arrays on the handle object. The handle's `.el` field is the
// HTMLElement-compatible proxy passed to the helper. After the helper
// returns, the test reads `handle.classNamesAdded`, `handle.propertyCalls`,
// etc. to assert what the helper actually did.
//
// Style-injection constraint: interactions.ts delegates to the shared
// tagged style injector. Repeated helper calls should leave one
// data-jb-style="pmd-interactions" style tag in the mock document.

import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";

// ---- Recorder types ----

interface PropertyCall {
	op: "set" | "remove";
	name: string;
	value?: string;
}

interface MockElementHandle {
	el: HTMLElement;
	classNamesAdded: string[];
	classNamesRemoved: string[];
	toggledOn: string[];
	toggledOff: string[];
	propertyCalls: PropertyCall[];
	datasetWrites: Record<string, string | undefined>;
	disabledWrites: (true | false)[];
}

// ---- Mock element factory ----

function createMockElement(tag: string): MockElementHandle {
	const classNamesAdded: string[] = [];
	const classNamesRemoved: string[] = [];
	const toggledOn: string[] = [];
	const toggledOff: string[] = [];
	const propertyCalls: PropertyCall[] = [];
	const datasetWrites: Record<string, string | undefined> = {};
	const disabledWrites: (true | false)[] = [];

	const fakeEl = {
		tagName: tag,
		classList: {
			add(name: string) {
				if (!classNamesAdded.includes(name)) classNamesAdded.push(name);
			},
			remove(name: string) {
				if (!classNamesRemoved.includes(name)) classNamesRemoved.push(name);
			},
			toggle(name: string, on?: boolean) {
				const finalOn = on ?? !classNamesAdded.includes(name);
				if (finalOn) {
					if (!classNamesAdded.includes(name)) classNamesAdded.push(name);
					toggledOn.push(name);
				} else {
					toggledOff.push(name);
				}
			},
			contains(name: string) {
				return classNamesAdded.includes(name);
			},
		},
		style: {
			setProperty(name: string, value: string) {
				propertyCalls.push({ op: "set", name, value });
			},
			removeProperty(name: string) {
				propertyCalls.push({ op: "remove", name });
			},
			getPropertyValue(name: string) {
				const set = propertyCalls.find((c) => c.op === "set" && c.name === name);
				return set?.value ?? "";
			},
			// Direct property assignment (e.g. `el.style.color = "x"`).
			// JS setters can't be defined on plain objects, so we use a
			// getter/setter pair on a dedicated object and proxy through.
			_color: "",
			get color(): string {
				return this._color;
			},
			set color(value: string) {
				this._color = value;
				if (value === "") {
					propertyCalls.push({ op: "remove", name: "color" });
				} else {
					propertyCalls.push({ op: "set", name: "color", value });
				}
			},
		},
		dataset: new Proxy(
			{},
			{
				get(_target, key: string) {
					return datasetWrites[key];
				},
				set(_target, key: string, value: string) {
					datasetWrites[key] = value;
					return true;
				},
			},
		),
		// `el.disabled = bool` is the IDL attribute that setDisabled writes.
		// Real DOM defines disabled as a boolean property; the mock
		// records each write so tests can assert the helper did (or did
		// not) toggle it.
		_disabled: false,
		get disabled(): boolean {
			return this._disabled;
		},
		set disabled(value: boolean) {
			this._disabled = value;
			disabledWrites.push(value);
		},
	};

	return {
		el: fakeEl as unknown as HTMLElement,
		classNamesAdded,
		classNamesRemoved,
		toggledOn,
		toggledOff,
		propertyCalls,
		datasetWrites,
		disabledWrites,
	};
}

// ---- Mock document ----

interface MockStyleElement {
	setAttribute(name: string, value: string): void;
	getAttribute(name: string): string | null;
	textContent: string;
}

interface MockDocument {
	createdStyles: MockStyleElement[];
	headChildren: unknown[];
	createElement(tag: string): unknown;
	head: {
		appendChild(child: unknown): void;
		querySelectorAll(selector: string): { length: number; item(index: number): MockStyleElement };
	};
}

function createMockDocument(): MockDocument {
	const createdStyles: MockStyleElement[] = [];
	const headChildren: unknown[] = [];
	return {
		createdStyles,
		headChildren,
		createElement(tag: string): unknown {
			if (tag === "style") {
				const attributes: Record<string, string> = {};
				const el: MockStyleElement = {
					setAttribute(name: string, value: string) {
						attributes[name] = value;
					},
					getAttribute(name: string) {
						return attributes[name] ?? null;
					},
					textContent: "",
				};
				createdStyles.push(el);
				return el;
			}
			return createMockElement(tag).el;
		},
		head: {
			appendChild(child: unknown) {
				headChildren.push(child);
			},
			querySelectorAll(selector: string) {
				const matches =
					selector === "style[data-jb-style]"
						? headChildren.filter(
								(child): child is MockStyleElement =>
									typeof child === "object" &&
									child !== null &&
									typeof (child as MockStyleElement).getAttribute === "function" &&
									(child as MockStyleElement).getAttribute("data-jb-style") !== null,
							)
						: [];
				return {
					length: matches.length,
					item(index: number) {
						return matches[index];
					},
				};
			},
		},
	};
}

// ---- Install mock before module loads ----

let mockDoc: MockDocument;

beforeAll(() => {
	mockDoc = createMockDocument();
	(globalThis as unknown as { document: MockDocument }).document = mockDoc;
});

beforeEach(() => {
	mockDoc.createdStyles.length = 0;
	mockDoc.headChildren.length = 0;
});

afterEach(() => {
	mockDoc.createdStyles.length = 0;
	mockDoc.headChildren.length = 0;
});

// Lazy import after the mock document is installed. interactions.ts checks
// `typeof document === "undefined"` inside ensureStyleInjected(), so the
// mock must exist on globalThis before the first helper call.
let hoverReveal: typeof import("../editor/ui/interactions").hoverReveal;
let focusReveal: typeof import("../editor/ui/interactions").focusReveal;
let setActive: typeof import("../editor/ui/interactions").setActive;
let setDisabled: typeof import("../editor/ui/interactions").setDisabled;

beforeAll(async () => {
	const mod = await import("../editor/ui/interactions");
	hoverReveal = mod.hoverReveal;
	focusReveal = mod.focusReveal;
	setActive = mod.setActive;
	setDisabled = mod.setDisabled;
});

// ---- hoverReveal (default / outline mode) ----

describe("hoverReveal (outline mode, default)", () => {
	test("adds pmd-hover class to the element", () => {
		const handle = createMockElement("div");
		hoverReveal(handle.el);
		expect(handle.classNamesAdded).toContain("pmd-hover");
	});

	test("does not add pmd-hover-color in default mode", () => {
		const handle = createMockElement("div");
		hoverReveal(handle.el);
		expect(handle.classNamesAdded).not.toContain("pmd-hover-color");
	});

	test("does not set --hover-color-* custom props in default mode", () => {
		const handle = createMockElement("div");
		hoverReveal(handle.el);
		const hoverColorCalls = handle.propertyCalls.filter((c) =>
			c.name.startsWith("--hover-color"),
		);
		expect(hoverColorCalls.length).toBe(0);
	});

	test("writes pmdRole dataset when role option is provided", () => {
		const handle = createMockElement("div");
		hoverReveal(handle.el, { role: "primary" });
		expect(handle.datasetWrites["pmdRole"]).toBe("primary");
	});

	test("writes pmdRole dataset when role is secondary (instrument-browser clearBtn)", () => {
		const handle = createMockElement("span");
		hoverReveal(handle.el, { role: "secondary" });
		expect(handle.datasetWrites["pmdRole"]).toBe("secondary");
		expect(handle.classNamesAdded).toContain("pmd-hover");
	});

	test("does not write pmdRole when role option is omitted", () => {
		const handle = createMockElement("div");
		hoverReveal(handle.el);
		expect(handle.datasetWrites["pmdRole"]).toBeUndefined();
	});
});

// ---- hoverReveal (color mode) ----

describe("hoverReveal (color mode)", () => {
	test("adds pmd-hover-color class and not pmd-hover", () => {
		const handle = createMockElement("div");
		hoverReveal(handle.el, { mode: "color" });
		expect(handle.classNamesAdded).toContain("pmd-hover-color");
		expect(handle.classNamesAdded).not.toContain("pmd-hover");
	});

	test("sets --hover-color-idle and --hover-color-accent custom props from options", () => {
		const handle = createMockElement("div");
		hoverReveal(handle.el, {
			mode: "color",
			idleColor: "var(--primary-text)",
			accentColor: "var(--cta-fg)",
		});
		const idleSet = handle.propertyCalls.find(
			(c) => c.op === "set" && c.name === "--hover-color-idle",
		);
		const accentSet = handle.propertyCalls.find(
			(c) => c.op === "set" && c.name === "--hover-color-accent",
		);
		expect(idleSet?.value).toBe("var(--primary-text)");
		expect(accentSet?.value).toBe("var(--cta-fg)");
	});

	test("clears any inline color so the .pmd-hover-color class rule wins", () => {
		const handle = createMockElement("div");
		hoverReveal(handle.el, { mode: "color" });
		const colorRemoval = handle.propertyCalls.find(
			(c) => c.op === "remove" && c.name === "color",
		);
		expect(colorRemoval).toBeDefined();
	});

	test("default colors are --primary-text and --cta-fg when color options are omitted", () => {
		const handle = createMockElement("div");
		hoverReveal(handle.el, { mode: "color" });
		const idleSet = handle.propertyCalls.find(
			(c) => c.op === "set" && c.name === "--hover-color-idle",
		);
		const accentSet = handle.propertyCalls.find(
			(c) => c.op === "set" && c.name === "--hover-color-accent",
		);
		expect(idleSet?.value).toBe("var(--primary-text)");
		expect(accentSet?.value).toBe("var(--cta-fg)");
	});

	test("outline mode does not clear inline color", () => {
		const handle = createMockElement("div");
		hoverReveal(handle.el);
		const colorRemoval = handle.propertyCalls.find(
			(c) => c.op === "remove" && c.name === "color",
		);
		expect(colorRemoval).toBeUndefined();
	});
});

// ---- focusReveal ----

describe("focusReveal", () => {
	test("adds pmd-focus class", () => {
		const handle = createMockElement("div");
		focusReveal(handle.el);
		expect(handle.classNamesAdded).toContain("pmd-focus");
	});

	test("writes pmdRole dataset when role is provided", () => {
		const handle = createMockElement("div");
		focusReveal(handle.el, { role: "secondary" });
		expect(handle.datasetWrites["pmdRole"]).toBe("secondary");
	});

	test("does not write pmdRole when role is omitted", () => {
		const handle = createMockElement("div");
		focusReveal(handle.el);
		expect(handle.datasetWrites["pmdRole"]).toBeUndefined();
	});
});

// ---- setActive ----

describe("setActive", () => {
	test("active=true toggles pmd-active on (records add or toggle-on)", () => {
		const handle = createMockElement("div");
		setActive(handle.el, true);
		// classList.toggle(name, true) routes through classNamesAdded in
		// our recorder, so either array signals success.
		const on =
			handle.classNamesAdded.includes("pmd-active") ||
			handle.toggledOn.includes("pmd-active");
		expect(on).toBeTrue();
	});

	test("active=false records the off transition", () => {
		const handle = createMockElement("div");
		setActive(handle.el, false);
		const off =
			handle.classNamesRemoved.includes("pmd-active") ||
			handle.toggledOff.includes("pmd-active");
		expect(off).toBeTrue();
	});

	test("textColor on active=true writes inline color", () => {
		const handle = createMockElement("div");
		setActive(handle.el, true, { textColor: "var(--cta-fg)" });
		const colorSet = handle.propertyCalls.find(
			(c) => c.op === "set" && c.name === "color",
		);
		expect(colorSet?.value).toBe("var(--cta-fg)");
	});

	test("textColor on active=false removes inline color", () => {
		const handle = createMockElement("div");
		setActive(handle.el, false, { textColor: "var(--cta-fg)" });
		const colorRemove = handle.propertyCalls.find(
			(c) => c.op === "remove" && c.name === "color",
		);
		expect(colorRemove).toBeDefined();
	});
});

// ---- ensureStyleInjected ----

describe("ensureStyleInjected tagged style injection", () => {
	test("repeated helper calls leave one PMD interaction style tag", () => {
		const handle = createMockElement("div");
		hoverReveal(handle.el);
		focusReveal(handle.el);
		setActive(handle.el, true);
		setDisabled(createMockElement("button").el as unknown as HTMLButtonElement, true);

		const pmdStyles = mockDoc.headChildren.filter(
			(child): child is MockStyleElement =>
				typeof child === "object" &&
				child !== null &&
				typeof (child as MockStyleElement).getAttribute === "function" &&
				(child as MockStyleElement).getAttribute("data-jb-style") === "pmd-interactions",
		);
		expect(pmdStyles.length).toBe(1);
	});

	test("injected style element carries PMD rule text in textContent", () => {
		const handle = createMockElement("div");
		hoverReveal(handle.el);
		const style = mockDoc.headChildren.find(
			(child): child is MockStyleElement =>
				typeof child === "object" &&
				child !== null &&
				typeof (child as MockStyleElement).getAttribute === "function" &&
				(child as MockStyleElement).getAttribute("data-jb-style") === "pmd-interactions",
		);
		expect(style?.textContent).toContain(".pmd-hover:hover");
		expect(style?.textContent).toContain(".pmd-disabled");
	});
});

// ---- setDisabled ----

describe("setDisabled", () => {
	test("disabled=true assigns el.disabled = true", () => {
		const handle = createMockElement("input");
		(handle.el as unknown as { disabled: boolean }).disabled = false;
		handle.disabledWrites.length = 0; // forget the reset
		setDisabled(handle.el as unknown as HTMLInputElement, true);
		expect(handle.disabledWrites[handle.disabledWrites.length - 1]).toBe(true);
	});

	test("disabled=false assigns el.disabled = false", () => {
		const handle = createMockElement("button");
		(handle.el as unknown as { disabled: boolean }).disabled = true;
		handle.disabledWrites.length = 0;
		setDisabled(handle.el as unknown as HTMLButtonElement, false);
		expect(handle.disabledWrites[handle.disabledWrites.length - 1]).toBe(false);
	});

	test("disabled=true toggles pmd-disabled on via classList.toggle(name, true)", () => {
		const handle = createMockElement("input");
		setDisabled(handle.el as unknown as HTMLInputElement, true);
		// Both arrays are valid signals: either the helper added the class
		// (add-style) or routed through toggle(name, true).
		const on =
			handle.classNamesAdded.includes("pmd-disabled") ||
			handle.toggledOn.includes("pmd-disabled");
		expect(on).toBeTrue();
	});

	test("disabled=false routes the toggle through the off branch", () => {
		const handle = createMockElement("input");
		setDisabled(handle.el as unknown as HTMLInputElement, false);
		const off =
			handle.classNamesRemoved.includes("pmd-disabled") ||
			handle.toggledOff.includes("pmd-disabled");
		expect(off).toBeTrue();
	});

	test("role option writes pmdRole dataset", () => {
		const handle = createMockElement("select");
		setDisabled(handle.el as unknown as HTMLSelectElement, true, { role: "primary" });
		expect(handle.datasetWrites["pmdRole"]).toBe("primary");
	});

	test("does not write pmdRole when role option is omitted", () => {
		const handle = createMockElement("input");
		setDisabled(handle.el as unknown as HTMLInputElement, true);
		expect(handle.datasetWrites["pmdRole"]).toBeUndefined();
	});
});