// prompt-dock.ts
//
// Purpose: Snaps prompts to the left/right edge outside the editor
//
// This module:
// - Docks a prompt beside .beepboxEditor inside #beepboxEditorContainer
// - Shrinks the editor to make room (flex row layout)
// - Enforces one prompt per side; snapping a second swaps the first back to floating
// - Provides a resizable divider between dock and editor
// - Undocks when the prompt is dragged away from the edge or closed

import { HTML } from "imperative-html/dist/esm/elements-strict";
import type { Prompt } from "../prompts/prompt";

const { div } = HTML;

export type DockSide = "left" | "right";

export interface PromptDockHost {
	editor: HTMLElement;
	promptContainer: HTMLElement;
}

const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 240;
const SNAP_THRESHOLD = 40;
const UNSNAP_THRESHOLD = 90;

export class PromptDock {
	private readonly _editor: HTMLElement;
	private readonly _promptContainer: HTMLElement;
	private readonly _container: HTMLElement;
	private readonly _docked: Map<DockSide, Prompt> = new Map();
	private readonly _dockEls: Map<DockSide, HTMLDivElement> = new Map();
	private readonly _dividerEls: Map<DockSide, HTMLDivElement> = new Map();
	private readonly _widths: Map<DockSide, number> = new Map();
	private readonly _savedPositions: Map<Prompt, { x: number; y: number }> = new Map();

	constructor(host: PromptDockHost) {
		this._editor = host.editor;
		this._promptContainer = host.promptContainer;
		this._container = host.editor.parentElement as HTMLElement;
	}

	public isDocked(prompt: Prompt): boolean {
		return this.getSide(prompt) !== null;
	}

	public getSide(prompt: Prompt): DockSide | null {
		for (const [side, p] of this._docked) {
			if (p === prompt) return side;
		}
		return null;
	}

	public getSnapSide(promptX: number, editorWidth: number, promptWidth: number, pointerX: number): DockSide | null {
		const vw = window.innerWidth;
		if (promptX <= SNAP_THRESHOLD || pointerX <= SNAP_THRESHOLD) return "left";
		if (promptX >= editorWidth - promptWidth - SNAP_THRESHOLD || pointerX >= vw - SNAP_THRESHOLD) return "right";
		return null;
	}

	public shouldUnsnapByDrag(prompt: Prompt, dragDeltaX: number): boolean {
		const side = this.getSide(prompt);
		if (!side) return false;
		if (side === "left") return dragDeltaX > UNSNAP_THRESHOLD;
		return dragDeltaX < -UNSNAP_THRESHOLD;
	}

	public snap(prompt: Prompt, side: DockSide): void {
		if (this._docked.get(side) === prompt) return;
		const existing = this._docked.get(side);
		if (existing) this.undock(existing);
		const otherSide: DockSide = side === "left" ? "right" : "left";
		if (this._docked.get(otherSide) === prompt) this._removeFromDock(prompt);

		if (!this._savedPositions.has(prompt)) {
			const left = prompt.container.style.left;
			const top = prompt.container.style.top;
			this._savedPositions.set(prompt, {
				x: left ? parseFloat(left) : 0,
				y: top ? parseFloat(top) : 0,
			});
		}

		this._ensureDock(side);
		const dockEl = this._dockEls.get(side) as HTMLDivElement;
		const content = dockEl.querySelector(".prompt-dock-content") as HTMLElement;
		prompt.container.classList.add("docked");
		prompt.container.style.left = "";
		prompt.container.style.top = "";
		content.appendChild(prompt.container);
		this._docked.set(side, prompt);
		this._applyLayout();
	}

	public undock(prompt: Prompt): void {
		const side = this.getSide(prompt);
		if (!side) return;
		this._removeFromDock(prompt);
		const saved = this._savedPositions.get(prompt);
		this._savedPositions.delete(prompt);
		prompt.container.classList.remove("docked");
		this._promptContainer.appendChild(prompt.container);
		if (saved) {
			prompt.container.style.left = `${saved.x}px`;
			prompt.container.style.top = `${saved.y}px`;
		}
		this._removeDock(side);
		this._applyLayout();
	}

	public remove(prompt: Prompt): void {
		const side = this.getSide(prompt);
		if (!side) return;
		this._docked.delete(side);
		const saved = this._savedPositions.get(prompt);
		this._savedPositions.delete(prompt);
		prompt.container.classList.remove("docked");
		// Reparent so the exit animation can play in promptContainer.
		this._promptContainer.appendChild(prompt.container);
		if (saved) {
			prompt.container.style.left = `${saved.x}px`;
			prompt.container.style.top = `${saved.y}px`;
		}
		this._removeDock(side);
		this._applyLayout();
	}

	private _removeFromDock(prompt: Prompt): void {
		const side = this.getSide(prompt);
		if (!side) return;
		this._docked.delete(side);
		this._removeDock(side);
	}

	private _ensureDock(side: DockSide): void {
		if (this._dockEls.has(side)) return;
		const maxW = Math.min(this._container.clientWidth * 0.5, Math.max(MIN_WIDTH, this._container.clientWidth - 520));
		const width = Math.max(MIN_WIDTH, Math.min(maxW, this._widths.get(side) ?? DEFAULT_WIDTH));
		const dockEl = div({ class: `prompt-dock prompt-dock-${side}`, style: `width: ${width}px;` }, div({ class: "prompt-dock-content" }));
		const divider = div({ class: "prompt-dock-divider" });
		this._dockEls.set(side, dockEl);
		this._dividerEls.set(side, divider);
		this._widths.set(side, width);
		this._attachDivider(side, divider);
		this._insertInOrder();
	}

	private _removeDock(side: DockSide): void {
		const dockEl = this._dockEls.get(side);
		const divider = this._dividerEls.get(side);
		if (dockEl && dockEl.parentNode) dockEl.parentNode.removeChild(dockEl);
		if (divider && divider.parentNode) divider.parentNode.removeChild(divider);
		this._dockEls.delete(side);
		this._dividerEls.delete(side);
	}

	private _insertInOrder(): void {
		const ref = this._editor;
		const leftDock = this._dockEls.get("left");
		const leftDiv = this._dividerEls.get("left");
		const rightDiv = this._dividerEls.get("right");
		const rightDock = this._dockEls.get("right");
		if (leftDock) this._container.insertBefore(leftDock, ref);
		if (leftDiv) this._container.insertBefore(leftDiv, ref);
		if (rightDiv) this._container.insertBefore(rightDiv, ref.nextSibling);
		if (rightDock) this._container.insertBefore(rightDock, rightDiv ? rightDiv.nextSibling : ref.nextSibling);
	}

	private _applyLayout(): void {
		const anyDocked = this._docked.size > 0;
		if (anyDocked) {
			this._container.style.display = "flex";
			this._container.style.flexDirection = "row";
			this._editor.style.flex = "1 1 auto";
			this._editor.style.minWidth = "0";
		} else {
			this._container.style.display = "";
			this._container.style.flexDirection = "";
			this._editor.style.flex = "";
			this._editor.style.minWidth = "";
		}
	}

	private _attachDivider(side: DockSide, divider: HTMLDivElement): void {
		divider.addEventListener("mousedown", (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			const startX = e.clientX;
			const startWidth = this._widths.get(side) ?? DEFAULT_WIDTH;
			const onMove = (me: MouseEvent): void => {
				const dockEl = this._dockEls.get(side);
				if (!dockEl) return;
				const delta = side === "left" ? me.clientX - startX : startX - me.clientX;
				const maxW = Math.min(this._container.clientWidth * 0.5, Math.max(MIN_WIDTH, this._container.clientWidth - 520));
				const w = Math.max(MIN_WIDTH, Math.min(maxW, startWidth + delta));
				this._widths.set(side, w);
				dockEl.style.width = `${w}px`;
			};
			const onUp = (): void => {
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
			};
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		});
	}
}
