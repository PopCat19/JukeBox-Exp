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
let depthLabel: HTMLDivElement | null = null;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let logSeq = 0;
let logTimer: ReturnType<typeof setTimeout> | null = null;
let currentDepth = 0;

function depth(el: HTMLElement): number {
	let d = 0;
	let c: HTMLElement | null = el;
	while (c && c !== document.body) {
		d++;
		c = c.parentElement;
	}
	return d;
}

function depthColor(d: number): string {
	return `hsl(${(d * 37) % 360}, 80%, 55%)`;
}

function highlight(el: HTMLElement): void {
	if (!el || el === overlay) return;
	if (outlineEl) outlineEl.style.outline = savedOutline;
	outlineEl = el;
	savedOutline = el.style.outline;
	currentDepth = depth(el);
	const color = depthColor(currentDepth);
	el.style.outline = `2px solid ${color}`;
	el.style.outlineOffset = "-1px";
	current = el;
	if (!depthLabel) {
		depthLabel = document.createElement("div");
		Object.assign(depthLabel.style, {
			position: "fixed",
			zIndex: "1000000",
			pointerEvents: "none",
			padding: "2px 6px",
			fontSize: "11px",
			fontFamily: "monospace",
			color: "#fff",
			background: "rgba(0,0,0,0.7)",
			borderRadius: "3px",
			whiteSpace: "nowrap",
		});
		document.body.appendChild(depthLabel);
	}
	depthLabel.textContent = `depth ${currentDepth}`;
	depthLabel.style.background = color;
	const rect = el.getBoundingClientRect();
	depthLabel.style.top = `${rect.bottom + 2}px`;
	depthLabel.style.left = `${rect.right}px`;
	if (logTimer) clearTimeout(logTimer);
	logTimer = setTimeout(() => {
		const cs = window.getComputedStyle(el);
		console.log(`[inspector] #${++logSeq} depth:${currentDepth}\n${figmaSummary(el, cs)}`);
		logTimer = null;
	}, 400);
}

function px(v: string): string {
	return v === "0px" ? "0" : v;
}

function hexColor(rgb: string): string {
	const m = rgb.match(/\d+/g);
	if (!m || m.length < 3) return rgb;
	const hex = m
		.slice(0, 3)
		.map((v) => parseInt(v).toString(16).padStart(2, "0"))
		.join("");
	return `#${hex}`;
}

function figmaSummary(el: HTMLElement, cs: CSSStyleDeclaration): string {
	const lines: string[] = [];
	const tag = el.tagName.toLowerCase();
	const id = el.id ? `#${el.id}` : "";
	const cls = el.classList.length ? "." + Array.from(el.classList).join(".") : "";
	lines.push(`${tag}${id}${cls}`);
	lines.push(`  W: ${px(cs.width)}  H: ${px(cs.height)}`);
	const bg = cs.backgroundColor;
	if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") lines.push(`  Fill: ${hexColor(bg)}`);
	const border = cs.border;
	if (border && border !== "0px none rgb(0, 0, 0)") lines.push(`  Stroke: ${border.replace(/rgb\([^)]+\)/g, hexColor)}`);
	const br = cs.borderRadius;
	if (br && br !== "0px") lines.push(`  Radius: ${px(br)}`);
	const pad = `${px(cs.paddingTop)} ${px(cs.paddingRight)} ${px(cs.paddingBottom)} ${px(cs.paddingLeft)}`;
	if (pad !== "0 0 0 0") lines.push(`  Padding: ${pad}`);
	const marg = `${px(cs.marginTop)} ${px(cs.marginRight)} ${px(cs.marginBottom)} ${px(cs.marginLeft)}`;
	if (marg !== "0 0 0 0") lines.push(`  Margin: ${marg}`);
	const fs = cs.fontSize;
	if (fs && fs !== "0px") lines.push(`  Font: ${cs.fontFamily.split(",")[0].replace(/"/g, "")}, ${px(fs)}, ${cs.fontWeight}`);
	const lh = cs.lineHeight;
	if (lh !== "normal") lines.push(`  Line height: ${px(lh)}`);
	const ls = cs.letterSpacing;
	if (ls !== "normal" && ls !== "0px") lines.push(`  Letter spacing: ${px(ls)}`);
	const color = cs.color;
	if (color && color !== "rgb(0, 0, 0)") lines.push(`  Text: ${hexColor(color)}`);
	if (cs.display === "flex") {
		lines.push(`  Auto: ${cs.flexDirection}, ${cs.alignItems}, ${cs.justifyContent}`);
		if (cs.gap !== "normal") lines.push(`  Gap: ${px(cs.gap)}`);
	}
	if (cs.position !== "static") lines.push(`  Position: ${cs.position}`);
	const op = cs.opacity;
	if (op !== "1") lines.push(`  Opacity: ${op}`);
	const bs = cs.boxShadow;
	if (bs !== "none") lines.push(`  Shadow: ${bs}`);
	const ov = cs.overflow;
	if (ov !== "visible") lines.push(`  Overflow: ${ov}`);
	return lines.join("\n");
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
	if (depthLabel) {
		depthLabel.remove();
		depthLabel = null;
	}
	if (logTimer) {
		clearTimeout(logTimer);
		logTimer = null;
	}
	if (overlay) {
		overlay.remove();
		overlay = null;
	}
	if (keyHandler) {
		document.removeEventListener("keydown", keyHandler, true);
		keyHandler = null;
	}
	document.body.focus();
	console.log("[inspector] deactivated");
}

document.addEventListener("keydown", (e: KeyboardEvent) => {
	if (e.shiftKey && e.key === "D" && !isActive()) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		activate();
	}
}, true);

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
	overlay.addEventListener("click", (e) => {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		captureStyles();
	});
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
