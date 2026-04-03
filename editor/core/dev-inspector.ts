// dev-inspector
//
// Purpose: Inject a hover-based DOM inspector that copies computed styles to clipboard
//
// This module:
// - Activates on demand and freezes interaction via a transparent overlay
// - Highlights hovered elements with a red outline
// - Captures computed styles and markup on Enter, traverses DOM on ArrowUp/ArrowDown

const RELEVANT = [
	"padding",
	"paddingTop",
	"paddingRight",
	"paddingBottom",
	"paddingLeft",
	"margin",
	"marginTop",
	"marginRight",
	"marginBottom",
	"marginLeft",
	"width",
	"height",
	"minWidth",
	"maxWidth",
	"minHeight",
	"maxHeight",
	"color",
	"backgroundColor",
	"borderColor",
	"border",
	"borderRadius",
	"fontSize",
	"fontWeight",
	"fontFamily",
	"lineHeight",
	"letterSpacing",
	"display",
	"flexDirection",
	"alignItems",
	"justifyContent",
	"gap",
	"position",
	"top",
	"right",
	"bottom",
	"left",
	"zIndex",
	"opacity",
	"boxShadow",
	"overflow",
] as const;

let current: HTMLElement | null = null;
let outlineEl: HTMLElement | null = null;
let savedOutline = "";
let overlay: HTMLDivElement | null = null;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let logSeq = 0;

function highlight(el: HTMLElement): void {
	if (!el || el === overlay) return;
	if (outlineEl) outlineEl.style.outline = savedOutline;
	outlineEl = el;
	savedOutline = el.style.outline;
	el.style.outline = "2px solid red";
	current = el;
	const path: string[] = [];
	let c: HTMLElement | null = el;
	while (c && c !== document.body) {
		path.unshift(
			c.tagName.toLowerCase() +
				(c.id ? "#" + c.id : "") +
				(c.className && typeof c.className === "string" && c.className ? "." + Array.from(c.classList).join(".") : ""),
		);
		c = c.parentElement;
	}
	console.log(`[inspector] #${++logSeq}`, path.join(" > "));
}

function captureStyles(): void {
	if (!current) return;
	const el = current;
	const cs = window.getComputedStyle(el);
	const styles = Object.fromEntries(RELEVANT.map((k) => [k, cs[k as keyof CSSStyleDeclaration]]));
	const html = el.outerHTML.replace(/\s*outline:\s*[^;"]+;\s*/gi, "").slice(0, 500);
	navigator.clipboard.writeText(
		JSON.stringify({ tag: el.tagName.toLowerCase(), id: el.id || undefined, classes: Array.from(el.classList), html, styles }, null, 2),
	);
	console.log("[inspector] copied", el);
	deactivate();
}

function deactivate(): void {
	if (outlineEl) {
		outlineEl.style.outline = savedOutline;
		outlineEl = null;
	}
	current = null;
	if (overlay) {
		overlay.remove();
		overlay = null;
	}
	if (keyHandler) {
		document.removeEventListener("keydown", keyHandler, true);
		keyHandler = null;
	}
	console.log("[inspector] deactivated");
}

export function activate(): void {
	if (overlay) return;
	overlay = document.createElement("div");
	Object.assign(overlay.style, {
		position: "fixed",
		top: "0",
		left: "0",
		width: "100%",
		height: "100%",
		zIndex: "999999",
		cursor: "crosshair",
		background: "transparent",
	});
	overlay.addEventListener("mousemove", (e) => {
		overlay!.style.pointerEvents = "none";
		const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
		overlay!.style.pointerEvents = "auto";
		if (el) highlight(el);
	});
	overlay.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
	document.body.appendChild(overlay);

	keyHandler = (e: KeyboardEvent) => {
		if (!["Enter", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		if (e.key === "Enter") captureStyles();
		else if (e.key === "Escape") deactivate();
		else if (e.key === "ArrowUp" && current?.parentElement && current.parentElement !== document.body) highlight(current.parentElement);
		else if (e.key === "ArrowDown" && current?.children?.length) {
			if (current.tagName.toLowerCase() === "select") {
				const sel = current as HTMLSelectElement;
				const opts = Array.from(sel.options)
					.map((o, i) => `${i === sel.selectedIndex ? "▸" : " "} [${i}] ${o.value} (${o.textContent})`)
					.join("\n");
				console.log(`[inspector] #${++logSeq} <select> options (value="${sel.value}", selectedIndex=${sel.selectedIndex}):\n${opts}`);
			} else {
				highlight(current.children[0] as HTMLElement);
			}
		} else if (current?.tagName.toLowerCase() === "select") {
			const sel = current as HTMLSelectElement;
			const delta = e.key === "ArrowRight" ? 1 : -1;
			sel.selectedIndex = Math.max(0, Math.min(sel.options.length - 1, sel.selectedIndex + delta));
			const opts = Array.from(sel.options)
				.map((o, i) => `${i === sel.selectedIndex ? "▸" : " "} [${i}] ${o.value} (${o.textContent})`)
				.join("\n");
			console.log(`[inspector] #${++logSeq} <select> options (value="${sel.value}", selectedIndex=${sel.selectedIndex}):\n${opts}`);
		}
	};
	document.addEventListener("keydown", keyHandler, true);
	console.log("[inspector] frozen — hover element, Enter to copy, ↑↓ to traverse, Esc to cancel");
}

export function isActive(): boolean {
	return overlay !== null;
}
