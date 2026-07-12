// prompt-drag.ts
//
// Purpose: Attaches reusable bounded whole-surface dragging to prompt containers

export interface PromptDragPosition {
	x: number;
	y: number;
}

export interface PromptDragPadding {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export interface PromptDragSession {
	anchorX: number;
	startX: number;
	startY: number;
	reanchor(clientX: number, clientY: number, position: PromptDragPosition): void;
}

export interface PromptDragMove {
	event: MouseEvent;
	position: PromptDragPosition;
	width: number;
	session: PromptDragSession;
}

export interface PromptDragOptions {
	container: HTMLElement;
	bounds: HTMLElement;
	document?: Document;
	isDisabled?: () => boolean;
	getPosition: () => PromptDragPosition;
	getPadding?: () => PromptDragPadding;
	onStart?: (session: PromptDragSession) => void;
	beforeMove?: (event: MouseEvent, session: PromptDragSession) => boolean;
	onMove?: (move: PromptDragMove) => boolean;
	onPosition: (position: PromptDragPosition) => void;
	onEnd?: () => void;
}

const excludedSelectors = [
	".slider",
	".harmonics",
	".filterEditor",
	".spectrum",
	".prompt-dock-divider",
	".prompt-dock-slot-divider",
].join(",");

export function isPromptDragTarget(target: Element): boolean {
	const tagName = target.tagName.toLowerCase();
	if (["input", "button", "select", "textarea"].includes(tagName)) return false;
	return target.closest(excludedSelectors) === null;
}

export function attachPromptDrag(options: PromptDragOptions): () => void {
	const ownerDocument = options.document ?? options.container.ownerDocument;
	let removeActiveListeners: (() => void) | null = null;

	const endDrag = (): void => {
		if (removeActiveListeners === null) return;
		removeActiveListeners();
		removeActiveListeners = null;
		options.onEnd?.();
	};

	const onMouseDown = (event: MouseEvent): void => {
		if (options.isDisabled?.()) return;
		const target = event.target;
		if (!(target instanceof Element) || !isPromptDragTarget(target)) return;
		endDrag();

		const current = options.getPosition();
		const session: PromptDragSession = {
			anchorX: event.clientX,
			startX: event.clientX - current.x,
			startY: event.clientY - current.y,
			reanchor(clientX, clientY, position): void {
				this.anchorX = clientX;
				this.startX = clientX - position.x;
				this.startY = clientY - position.y;
			},
		};
		options.onStart?.(session);

		const onMouseMove = (moveEvent: MouseEvent): void => {
			if (options.beforeMove?.(moveEvent, session) === false) return;
			const rect = options.container.getBoundingClientRect();
			const padding = options.getPadding?.() ?? { left: 0, top: 0, right: 0, bottom: 0 };
			const position = {
				x: Math.max(
					padding.left,
					Math.min(
						moveEvent.clientX - session.startX,
						options.bounds.clientWidth - padding.right - rect.width,
					),
				),
				y: Math.max(
					padding.top,
					Math.min(
						moveEvent.clientY - session.startY,
						options.bounds.clientHeight - padding.bottom - rect.height,
					),
				),
			};
			if (
				options.onMove?.({ event: moveEvent, position, width: rect.width, session }) ===
				false
			)
				return;
			options.container.style.left = `${position.x}px`;
			options.container.style.top = `${position.y}px`;
			options.onPosition(position);
		};
		const onMouseUp = (): void => {
			endDrag();
		};
		ownerDocument.addEventListener("mousemove", onMouseMove);
		ownerDocument.addEventListener("mouseup", onMouseUp);
		removeActiveListeners = () => {
			ownerDocument.removeEventListener("mousemove", onMouseMove);
			ownerDocument.removeEventListener("mouseup", onMouseUp);
		};
	};

	options.container.addEventListener("mousedown", onMouseDown);
	return () => {
		endDrag();
		options.container.removeEventListener("mousedown", onMouseDown);
	};
}
