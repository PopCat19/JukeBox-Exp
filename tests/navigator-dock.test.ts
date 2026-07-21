// navigator-dock.test.ts
//
// Purpose: Verifies shared PromptDock behavior used by Navigator and normal prompts.

import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { PromptDock, type DockSide, type DockTarget } from "../editor/core/prompt-dock";
import type { PaneRoot } from "../editor/navigator/contracts";
import { NavigatorShell } from "../editor/navigator/navigator-shell";

let registeredHappyDom = false;
const docks: PromptDock[] = [];
beforeAll(() => {
	if (!GlobalRegistrator.isRegistered) {
		GlobalRegistrator.register();
		registeredHappyDom = true;
	}
});
afterEach(() => {
	for (const dock of docks.splice(0)) dock.dispose();
	document.body.replaceChildren();
});
afterAll(() => {
	if (registeredHappyDom) GlobalRegistrator.unregister();
});

function target(
	editor: HTMLElement,
	left = "120px",
	top = "80px",
	canDock: () => boolean = () => true,
): DockTarget {
	const container = document.createElement("div");
	container.className = "prompt fill-y";
	container.style.cssText = `position: absolute; left: ${left}; top: ${top}; right: 7px; bottom: 9px; width: 360px; height: 640px; max-width: 880px; max-height: 640px; margin: 4px; border-radius: 12px; transform: translateX(2px); color: red;`;
	editor.append(container);
	container.getBoundingClientRect = () =>
		({ left: 120, right: 480, top: 80, bottom: 720, width: 360, height: 640 }) as DOMRect;
	return { container, canDock };
}

function setup(canDock: () => boolean = () => true): {
	readonly dock: PromptDock;
	readonly editor: HTMLDivElement;
	readonly target: DockTarget;
	readonly changes: Array<DockSide | null>;
} {
	const editor = document.createElement("div");
	document.body.append(editor);
	Object.defineProperties(editor, {
		clientWidth: { value: 1000, configurable: true },
		clientHeight: { value: 700, configurable: true },
	});
	editor.getBoundingClientRect = () =>
		({ left: 100, right: 1100, top: 20, bottom: 720, width: 1000, height: 700 }) as DOMRect;
	const changes: Array<DockSide | null> = [];
	const first = target(editor, "120px", "80px", canDock);
	const dockTarget: DockTarget = {
		...first,
		onDockChange: (side) => changes.push(side),
	};
	const dock = new PromptDock({ editor, onLayoutChanged: () => undefined });
	docks.push(dock);
	return { dock, editor, target: dockTarget, changes };
}

function root(id: string): PaneRoot {
	const element = document.createElement("div");
	element.dataset.navigatorScope = id;
	return { element };
}

describe("navigator dock contract", () => {
	test("detects and snaps both editor edges", () => {
		const { dock, target: dockTarget } = setup();
		expect(dock.getSnapSide(10, 360, 0)).toBe("left");
		expect(dock.getSnapSide(650, 360, 0)).toBe("right");
		dock.snap(dockTarget, "left");
		expect(dock.getSide(dockTarget)).toBe("left");
		dock.snap(dockTarget, "right");
		expect(dock.getSide(dockTarget)).toBe("right");
	});

	test("restores every original inline style on undock and close", () => {
		for (const close of ["undock", "remove"] as const) {
			const { dock, target: dockTarget } = setup();
			const original = dockTarget.container.style.cssText;
			dock.snap(dockTarget, "right");
			expect(dockTarget.container.style.position).toBe("fixed");
			dock[close](dockTarget);
			expect(dockTarget.container.style.cssText).toBe(original);
		}
	});

	test("applies layout padding and clears dividers on close", () => {
		const { dock, editor, target: dockTarget, changes } = setup();
		dock.snap(dockTarget, "left");
		expect(editor.style.paddingLeft).not.toBe("");
		dock.remove(dockTarget);
		expect(editor.style.paddingLeft).toBe("");
		expect(editor.querySelector(".prompt-dock-divider")).toBeNull();
		expect(changes).toEqual(["left", null]);
	});

	for (const side of ["left", "right"] as const) {
		test(`third-slot eviction normalizes both slots on ${side}`, () => {
			const { dock, editor, target: first } = setup();
			const second = target(editor, "180px", "90px");
			const third = target(editor, "240px", "100px");
			dock.snap(first, side);
			dock.snap(second, side);
			dock.snap(third, side);
			expect(dock.isDocked(first)).toBeFalse();
			expect(second.container.style.height).toBe("347px");
			expect(third.container.style.height).toBe("347px");
			dock.snap(first, side);
			expect(dock.isDocked(second)).toBeFalse();
			expect(third.container.style.height).toBe("347px");
			expect(first.container.style.height).toBe("347px");
		});
	}

	test("mobile resize falls back to floating", () => {
		let desktop = true;
		const { dock, target: dockTarget, editor } = setup(() => desktop);
		dock.snap(dockTarget, "left");
		desktop = false;
		window.dispatchEvent(new Event("resize"));
		expect(dock.isDocked(dockTarget)).toBeFalse();
		expect(editor.style.paddingLeft).toBe("");
	});

	test("dispose removes its resize listener", () => {
		const added: EventListenerOrEventListenerObject[] = [];
		const removed: EventListenerOrEventListenerObject[] = [];
		const add = window.addEventListener.bind(window);
		const remove = window.removeEventListener.bind(window);
		window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => {
			if (type === "resize") added.push(listener);
			add(type, listener, options);
		}) as typeof window.addEventListener;
		window.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => {
			if (type === "resize") removed.push(listener);
			remove(type, listener, options);
		}) as typeof window.removeEventListener;
		try {
			const { dock } = setup();
			dock.dispose();
			expect(removed).toEqual(added);
		} finally {
			window.addEventListener = add;
			window.removeEventListener = remove;
		}
	});

	test("Navigator drag snaps and preserves docking across route replacement", async () => {
		const { dock, editor } = setup();
		const promptContainer = document.createElement("div");
		promptContainer.className = "promptContainer";
		editor.append(promptContainer);
		Object.defineProperties(promptContainer, {
			clientWidth: { value: 1000, configurable: true },
			clientHeight: { value: 700, configurable: true },
		});
		const shell = new NavigatorShell("Navigator", () => undefined);
		shell.setDockController(dock);
		promptContainer.append(shell.container);
		shell.container.classList.add("shaded");
		shell.container.getBoundingClientRect = () =>
			({ left: 500, right: 860, top: 80, bottom: 720, width: 360, height: 640 }) as DOMRect;
		const first = root("instrumentBrowser");
		shell.attach(first);
		shell.container.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 520, clientY: 100 }));
		document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 110, clientY: 100 }));
		document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
		expect(dock.getSide(shell)).toBe("left");
		expect(shell.container.classList.contains("shaded")).toBeFalse();
		expect(shell.container.querySelector<HTMLButtonElement>(".navigator-detach-button")?.hidden).toBeTrue();
		shell.detach(first);
		const second = root("instrumentBrowser");
		shell.attach(second);
		await Promise.resolve();
		expect(dock.getSide(shell)).toBe("left");
		expect(shell.container.querySelector<HTMLButtonElement>(".navigator-detach-button")?.hidden).toBeTrue();
	});
});
