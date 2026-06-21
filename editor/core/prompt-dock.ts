// prompt-dock.ts
//
// Purpose: Snaps prompts to the left/right edge of the editor
//
// This module:
// - Pins a docked prompt to the L/R side of .beepboxEditor via padding
// - Shrinks the editor grid content to make room (padding insets the grid)
// - Keeps the prompt inside .beepboxEditor so all component CSS still applies
// - Enforces one prompt per side; snapping a second swaps the first back to floating
// - Provides a resizable divider between dock and editor content
// - Undocks when the prompt is dragged away from the edge or closed

import { HTML } from "imperative-html/dist/esm/elements-strict";
import type { Prompt } from "../prompts/prompt";

const { div } = HTML;

export type DockSide = "left" | "right";

export interface PromptDockHost {
	editor: HTMLElement;
}

const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 240;
const SNAP_THRESHOLD = 40;
const UNSNAP_THRESHOLD = 90;

export class PromptDock {
	private readonly _editor: HTMLElement;
	private readonly _docked: Map<DockSide, Prompt> = new Map();
	private readonly _dividerEls: Map<DockSide, HTMLDivElement> = new Map();
	private readonly _widths: Map<DockSide, number> = new Map();
	private readonly _savedPositions: Map<Prompt, { x: number; y: number }> = new Map();

	constructor(host: PromptDockHost) {
		this._editor = host.editor;
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
		if (this._docked.get(otherSide) === prompt) this._clearDockState(prompt);

		if (!this._savedPositions.has(prompt)) {
			const left = prompt.container.style.left;
			const top = prompt.container.style.top;
			this._savedPositions.set(prompt, {
				x: left ? parseFloat(left) : 0,
				y: top ? parseFloat(top) : 0,
			});
		}

		const maxW = this._maxWidth();
		const width = Math.max(MIN_WIDTH, Math.min(maxW, this._widths.get(side) ?? DEFAULT_WIDTH));
		this._widths.set(side, width);

		prompt.container.classList.add("docked");
		this._pinPrompt(prompt, side, width);
		this._ensureDivider(side, width);

		this._docked.set(side, prompt);
		this._applyEditorPadding();
	}

	public undock(prompt: Prompt): void {
		const side = this.getSide(prompt);
		if (!side) return;
		this._clearDockState(prompt);
		this._restorePrompt(prompt);
		this._removeDivider(side);
		this._docked.delete(side);
		this._applyEditorPadding();
	}

	public remove(prompt: Prompt): void {
		const side = this.getSide(prompt);
		if (!side) return;
		this._clearDockState(prompt);
		this._restorePrompt(prompt);
		this._removeDivider(side);
		this._docked.delete(side);
		this._applyEditorPadding();
	}

	private _clearDockState(prompt: Prompt): void {
		this._docked.delete(this.getSide(prompt) as DockSide);
		this._savedPositions.delete(prompt);
		prompt.container.classList.remove("docked");
	}

	private _restorePrompt(prompt: Prompt): void {
		const saved = this._savedPositions.get(prompt);
		this._savedPositions.delete(prompt);
		const c = prompt.container;
		c.style.left = saved ? `${saved.x}px` : "";
		c.style.top = saved ? `${saved.y}px` : "";
		c.style.width = "";
		c.style.height = "";
		c.style.right = "";
		c.style.margin = "";
		c.style.borderRadius = "";
	}

	private _pinPrompt(prompt: Prompt, side: DockSide, width: number): void {
		const c = prompt.container;
		c.style.margin = "0";
		c.style.borderRadius = "0";
		c.style.width = `${width}px`;
		c.style.height = "100%";
		c.style.top = "0";
		if (side === "left") {
			c.style.left = "0";
			c.style.right = "";
		} else {
			c.style.right = "0";
			c.style.left = "";
		}
	}

	private _ensureDivider(side: DockSide, width: number): void {
		if (this._dividerEls.has(side)) {
			this._positionDivider(side, width);
			return;
		}
		const divider = div({ class: `prompt-dock-divider prompt-dock-divider-${side}` });
		this._dividerEls.set(side, divider);
		this._positionDivider(side, width);
		this._editor.appendChild(divider);
		this._attachDivider(side, divider);
	}

	private _positionDivider(side: DockSide, width: number): void {
		const divider = this._dividerEls.get(side);
		if (!divider) return;
		divider.style.top = "0";
		divider.style.height = "100%";
		if (side === "left") {
			divider.style.left = `${width}px`;
			divider.style.right = "";
		} else {
			divider.style.right = `${width}px`;
			divider.style.left = "";
		}
	}

	private _removeDivider(side: DockSide): void {
		const divider = this._dividerEls.get(side);
		if (divider && divider.parentNode) divider.parentNode.removeChild(divider);
		this._dividerEls.delete(side);
	}

	private _applyEditorPadding(): void {
		const leftW = this._docked.has("left") ? (this._widths.get("left") as number) : 0;
		const rightW = this._docked.has("right") ? (this._widths.get("right") as number) : 0;
		this._editor.style.paddingLeft = leftW ? `${leftW}px` : "";
		this._editor.style.paddingRight = rightW ? `${rightW}px` : "";
	}

	private _maxWidth(): number {
		const cw = this._editor.clientWidth;
		return Math.min(cw * 0.5, Math.max(MIN_WIDTH, cw - 520));
	}

	private _attachDivider(side: DockSide, divider: HTMLDivElement): void {
		divider.addEventListener("mousedown", (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			const startX = e.clientX;
			const startWidth = this._widths.get(side) ?? DEFAULT_WIDTH;
			const onMove = (me: MouseEvent): void => {
				if (!this._docked.has(side)) return;
				const delta = side === "left" ? me.clientX - startX : startX - me.clientX;
				const maxW = this._maxWidth();
				const w = Math.max(MIN_WIDTH, Math.min(maxW, startWidth + delta));
				this._widths.set(side, w);
				const prompt = this._docked.get(side) as Prompt;
				this._pinPrompt(prompt, side, w);
				this._positionDivider(side, w);
				this._applyEditorPadding();
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
