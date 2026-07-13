// prompt-dock.ts
//
// Purpose: Snaps prompts to the left/right edge of the editor
//
// This module:
// - Pins docked prompts to the L/R side of .beepboxEditor via padding
// - Shrinks the editor grid content to make room (padding insets the grid)
// - Keeps prompts inside .beepboxEditor so all component CSS still applies
// - Supports up to two prompts per side stacked vertically (master/editor stays centered)
// - Provides a resizable divider between dock and editor, and between stacked slots
// - Undocks when a prompt is dragged away from the edge or closed

import { HTML } from "imperative-html/dist/esm/elements-strict";

const { div } = HTML;

export type DockSide = "left" | "right";
export type Slot = 0 | 1;

export interface DockTarget {
	readonly container: HTMLElement;
	readonly canDock?: () => boolean;
	readonly onDockChange?: (side: DockSide | null) => void;
}

export interface PromptDockHost {
	editor: HTMLElement;
	onLayoutChanged: () => void;
}

const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 280;
const EDITOR_FLOOR = 560;
const DIVIDER_WIDTH = 6;
const SLOT_DIVIDER_HEIGHT = 6;
const SNAP_THRESHOLD = 40;
const UNSNAP_THRESHOLD = 90;
const MIN_SLOT_HEIGHT = 120;

interface SlotEntry {
	target: DockTarget;
	height: number; // fraction of the dock height, 0..1
}

export class PromptDock {
	private readonly _editor: HTMLElement;
	private readonly _host: PromptDockHost;
	private readonly _docked: Map<DockSide, SlotEntry[]> = new Map();
	private readonly _dividerEls: Map<DockSide, HTMLDivElement> = new Map();
	private readonly _slotDividerEls: Map<DockSide, HTMLDivElement[]> = new Map();
	private readonly _widths: Map<DockSide, number> = new Map();
	private readonly _savedStyles: Map<DockTarget, string> = new Map();

	constructor(host: PromptDockHost) {
		this._editor = host.editor;
		this._host = host;
		window.addEventListener("resize", this._onWindowResize);
	}

	public dispose(): void {
		window.removeEventListener("resize", this._onWindowResize);
	}

	private _onWindowResize = (): void => {
		for (const slots of [...this._docked.values()]) {
			for (const { target } of [...slots]) {
				if (target.canDock?.() === false) this.undock(target);
			}
		}
		for (const side of this._docked.keys()) this._relayoutSide(side);
		this._applyEditorPadding();
	};

	public isDocked(target: DockTarget): boolean {
		return this.findSlot(target) !== null;
	}

	public getSide(target: DockTarget): DockSide | null {
		const found = this.findSlot(target);
		return found ? found.side : null;
	}

	private findSlot(target: DockTarget): { side: DockSide; index: number } | null {
		for (const [side, slots] of this._docked) {
			const index = slots.findIndex((s) => s.target === target);
			if (index !== -1) return { side, index };
		}
		return null;
	}

	public getSnapSide(promptX: number, promptWidth: number, _pointerX: number): DockSide | null {
		const r = this._editor.getBoundingClientRect();
		const promptLeftVp = r.left + promptX;
		const promptRightVp = promptLeftVp + promptWidth;
		if (promptLeftVp <= r.left + SNAP_THRESHOLD) return "left";
		if (promptRightVp >= r.right - SNAP_THRESHOLD) return "right";
		return null;
	}

	public shouldUnsnapByDrag(target: DockTarget, dragDeltaX: number): boolean {
		const side = this.getSide(target);
		if (!side) return false;
		if (side === "left") return dragDeltaX > UNSNAP_THRESHOLD;
		return dragDeltaX < -UNSNAP_THRESHOLD;
	}

	public snap(target: DockTarget, side: DockSide): void {
		if (target.canDock?.() === false) return;
		const found = this.findSlot(target);
		if (found && found.side === side) return;
		// Remove from any other side first.
		if (found) {
			this._removeFromSide(found.side, found.index);
			this._relayoutSide(found.side);
		}

		// Only one side may be docked at a time to avoid cramping the
		// editor on narrower viewports (e.g. 16:9).
		const opposite: DockSide = side === "left" ? "right" : "left";
		const oppositeSlots = this._docked.get(opposite);
		if (oppositeSlots && oppositeSlots.length > 0) {
			while (oppositeSlots.length > 0) {
				const evicted = oppositeSlots.shift() as SlotEntry;
				this._clearDockClass(evicted.target);
				this._restoreTarget(evicted.target);
				evicted.target.onDockChange?.(null);
			}
			this._relayoutSide(opposite);
			this._removeDivider(opposite);
			this._removeSlotDividers(opposite);
			this._docked.delete(opposite);
		}

		if (!this._savedStyles.has(target)) {
			this._savedStyles.set(target, target.container.style.cssText);
		}

		let slots = this._docked.get(side);
		if (!slots) {
			slots = [];
			this._docked.set(side, slots);
		}
		if (slots.length >= 2) {
			// Side full: evict the top slot back to floating.
			const evicted = slots.shift() as SlotEntry;
			this._clearDockClass(evicted.target);
			this._restoreTarget(evicted.target);
			evicted.target.onDockChange?.(null);
		}
		// First snap: adopt the prompt's own width so it keeps its layout.
		const promptW = target.container.getBoundingClientRect().width;
		const maxW = this._maxWidth();
		const stored = this._widths.get(side);
		const width = Math.max(MIN_WIDTH, Math.min(maxW, stored ?? Math.min(promptW, maxW)));
		this._widths.set(side, width);

		target.container.classList.add("docked");
		// New slot takes an equal share of the remaining height.
		const n = slots.length + 1;
		const height = 1 / n;
		slots.push({ target, height });
		for (const slot of slots) slot.height = height;

		this._ensureDivider(side);
		this._relayoutSide(side);
		this._applyEditorPadding();
		target.onDockChange?.(side);
	}

	public undock(target: DockTarget): void {
		const found = this.findSlot(target);
		if (!found) return;
		this._removeFromSide(found.side, found.index);
		this._restoreTarget(target);
		this._relayoutSide(found.side);
		this._applyEditorPadding();
		target.onDockChange?.(null);
	}

	public restoreFloatingSize(_target: DockTarget): void {
		// undock already restores spawn dimensions synchronously.
	}

	public remove(target: DockTarget): void {
		const found = this.findSlot(target);
		if (!found) return;
		this._removeFromSide(found.side, found.index);
		this._restoreTarget(target);
		this._relayoutSide(found.side);
		this._applyEditorPadding();
		target.onDockChange?.(null);
	}

	private _removeFromSide(side: DockSide, index: number): void {
		const slots = this._docked.get(side);
		if (!slots) return;
		const entry = slots[index];
		if (!entry) return;
		slots.splice(index, 1);
		this._clearDockClass(entry.target);
		// Redistribute freed height across remaining slots.
		if (slots.length > 0) {
			const total = slots.reduce((sum, s) => sum + s.height, 0);
			if (total > 0) for (const s of slots) s.height /= total;
			else for (const s of slots) s.height = 1 / slots.length;
		}
	}

	private _clearDockClass(target: DockTarget): void {
		target.container.classList.remove("docked");
	}

	private _restoreTarget(target: DockTarget): void {
		const saved = this._savedStyles.get(target);
		this._savedStyles.delete(target);
		if (saved !== undefined) target.container.style.cssText = saved;
	}

	private _editorRect(): DOMRect {
		return this._editor.getBoundingClientRect();
	}

	private _relayoutSide(side: DockSide): void {
		const slots = this._docked.get(side);
		const width = this._widths.get(side) ?? DEFAULT_WIDTH;
		// Clamp width against current max.
		const maxW = this._maxWidth();
		const w = Math.max(MIN_WIDTH, Math.min(maxW, width));
		this._widths.set(side, w);
		if (!slots || slots.length === 0) {
			this._removeDivider(side);
			this._removeSlotDividers(side);
			this._docked.delete(side);
			return;
		}
		this._ensureDivider(side);
		this._positionDivider(side, w);
		const r = this._editorRect();
		const vw = window.innerWidth;
		const overlap = this._overlap(side, w);
		let leftPx: number;
		if (side === "left") {
			const inner = r.left + overlap;
			leftPx = Math.max(0, inner - DIVIDER_WIDTH - w);
		} else {
			const inner = r.right - overlap;
			leftPx = Math.min(vw - w, inner + DIVIDER_WIDTH);
		}
		// Layout slots vertically with dividers between them.
		const n = slots.length;
		const totalDividers = n - 1;
		const avail = r.height - totalDividers * SLOT_DIVIDER_HEIGHT;
		let y = r.top;
		// Rebuild slot dividers.
		this._removeSlotDividers(side);
		const newSlotDivs: HTMLDivElement[] = [];
		for (let i = 0; i < n; i++) {
			const entry = slots[i];
			const h = Math.max(MIN_SLOT_HEIGHT, avail * entry.height);
			this._pinTarget(entry.target, leftPx, y, w, h);
			y += h;
			if (i < n - 1) {
				const sd = div({ class: "prompt-dock-slot-divider" });
				sd.style.position = "fixed";
				sd.style.left = `${leftPx}px`;
				sd.style.top = `${y}px`;
				sd.style.width = `${w}px`;
				sd.style.height = `${SLOT_DIVIDER_HEIGHT}px`;
				sd.style.zIndex = "101";
				sd.style.cursor = "row-resize";
				sd.style.background = "var(--ui-widget-background, #444)";
				sd.style.pointerEvents = "auto";
				this._editor.appendChild(sd);
				this._attachSlotDivider(side, i, sd);
				newSlotDivs.push(sd);
				y += SLOT_DIVIDER_HEIGHT;
			}
		}
		this._slotDividerEls.set(side, newSlotDivs);
	}

	private _pinTarget(
		target: DockTarget,
		leftPx: number,
		topPx: number,
		width: number,
		height: number,
	): void {
		const c = target.container;
		const fillY = c.classList.contains("fill-y");
		const fillX = c.classList.contains("fill-x");
		c.style.position = "fixed";
		c.style.margin = "0";
		c.style.borderRadius = "0";
		c.style.transform = "none";
		c.style.top = `${topPx}px`;
		c.style.right = "";
		c.style.maxWidth = "none";
		c.style.maxHeight = "none";
		if (fillY) {
			c.style.width = `${width}px`;
			c.style.height = `${height}px`;
			c.style.left = `${leftPx}px`;
		} else if (fillX) {
			// Fill the slot width but keep the prompt's natural height so
			// compact control panels (e.g. limiter) use the dock space
			// without stretching vertically. SVG content must keep its own
			// aspect ratio to avoid distorting the graph.
			c.style.width = `${width}px`;
			c.style.height = "";
			c.style.left = `${leftPx}px`;
		} else {
			// Visual/SVG prompts keep their intrinsic size and center in
			// the slot so their graphics do not stretch to the dock width.
			c.style.height = "";
			const naturalW = c.getBoundingClientRect().width;
			c.style.width = "";
			c.style.left = `${leftPx + Math.max(0, (width - naturalW) / 2)}px`;
		}
	}

	private _ensureDivider(side: DockSide): void {
		if (this._dividerEls.has(side)) return;
		const divider = div({ class: `prompt-dock-divider prompt-dock-divider-${side}` });
		this._dividerEls.set(side, divider);
		this._editor.appendChild(divider);
		this._attachDivider(side, divider);
	}

	private _positionDivider(side: DockSide, width: number): void {
		const divider = this._dividerEls.get(side);
		if (!divider) return;
		const r = this._editorRect();
		divider.style.top = `${r.top}px`;
		divider.style.height = `${r.height}px`;
		const overlap = this._overlap(side, width);
		if (side === "left") {
			const inner = r.left + overlap;
			divider.style.left = `${inner - DIVIDER_WIDTH}px`;
			divider.style.right = "";
		} else {
			const inner = r.right - overlap;
			divider.style.left = `${inner}px`;
			divider.style.right = "";
		}
	}

	private _removeDivider(side: DockSide): void {
		const divider = this._dividerEls.get(side);
		if (divider?.parentNode) divider.parentNode.removeChild(divider);
		this._dividerEls.delete(side);
	}

	private _removeSlotDividers(side: DockSide): void {
		const divs = this._slotDividerEls.get(side);
		if (divs) for (const d of divs) if (d.parentNode) d.parentNode.removeChild(d);
		this._slotDividerEls.delete(side);
	}

	private _overlap(side: DockSide, width: number): number {
		const r = this._editorRect();
		const vw = window.innerWidth;
		const margin = side === "left" ? r.left : vw - r.right;
		return Math.max(0, width - margin);
	}

	private _applyEditorPadding(): void {
		const leftOverlap =
			this._docked.has("left") && (this._docked.get("left") as SlotEntry[]).length > 0
				? this._overlap("left", this._widths.get("left") as number)
				: 0;
		const rightOverlap =
			this._docked.has("right") && (this._docked.get("right") as SlotEntry[]).length > 0
				? this._overlap("right", this._widths.get("right") as number)
				: 0;
		this._editor.style.paddingLeft = leftOverlap ? `${leftOverlap}px` : "";
		this._editor.style.paddingRight = rightOverlap ? `${rightOverlap}px` : "";
		this._host.onLayoutChanged();
	}

	private _maxWidth(): number {
		const r = this._editorRect();
		const vw = window.innerWidth;
		const margin = Math.max(r.left, vw - r.right);
		return Math.min(vw * 0.5, Math.max(MIN_WIDTH, margin + (r.width - EDITOR_FLOOR)));
	}

	private _attachDivider(side: DockSide, divider: HTMLDivElement): void {
		divider.addEventListener("mousedown", (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			const startX = e.clientX;
			const startWidth = this._widths.get(side) ?? DEFAULT_WIDTH;
			const onMove = (me: MouseEvent): void => {
				if (!this._docked.get(side)?.length) return;
				const delta = side === "left" ? me.clientX - startX : startX - me.clientX;
				const maxW = this._maxWidth();
				const w = Math.max(MIN_WIDTH, Math.min(maxW, startWidth + delta));
				this._widths.set(side, w);
				this._relayoutSide(side);
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

	private _attachSlotDivider(side: DockSide, upperIndex: number, divider: HTMLDivElement): void {
		divider.addEventListener("mousedown", (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			const startY = e.clientY;
			const slots = this._docked.get(side);
			if (!slots) return;
			const startUpper = slots[upperIndex].height;
			const startLower = slots[upperIndex + 1].height;
			const r = this._editorRect();
			const totalH = startUpper + startLower;
			const availPx = r.height * totalH - SLOT_DIVIDER_HEIGHT;
			const onMove = (me: MouseEvent): void => {
				if (!this._docked.get(side)) return;
				const deltaPx = me.clientY - startY;
				let upperPx = r.height * startUpper + deltaPx;
				upperPx = Math.max(MIN_SLOT_HEIGHT, Math.min(availPx - MIN_SLOT_HEIGHT, upperPx));
				const lowerPx = availPx - upperPx;
				slots[upperIndex].height = upperPx / r.height;
				slots[upperIndex + 1].height = lowerPx / r.height;
				this._relayoutSide(side);
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
