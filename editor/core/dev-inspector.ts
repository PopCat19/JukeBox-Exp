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
let boxOverlays: HTMLDivElement[] = [];
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
	const tag = el.tagName.toLowerCase();
	const id = el.id ? `#${el.id}` : "";
	const cls = el.classList.length ? "." + Array.from(el.classList).join(".") : "";
	depthLabel.textContent = `${tag}${id}${cls} (${currentDepth})`;
	depthLabel.style.background = color;
	const rect = el.getBoundingClientRect();
	depthLabel.style.top = `${rect.bottom + 2}px`;
	depthLabel.style.left = `${rect.right}px`;
	if (logTimer) clearTimeout(logTimer);
	logTimer = setTimeout(() => {
		const cs = window.getComputedStyle(el);
		showBoxModel(el, cs);
		const summary = figmaSummary(el, cs);
		const legendParts: string[] = [];
		const legendStyles: string[] = [];
		const pad = `${px(cs.paddingTop)} ${px(cs.paddingRight)} ${px(cs.paddingBottom)} ${px(cs.paddingLeft)}`;
		const marg = `${px(cs.marginTop)} ${px(cs.marginRight)} ${px(cs.marginBottom)} ${px(cs.marginLeft)}`;
		if (marg !== "0 0 0 0") { legendParts.push("%c■ margin%c"); legendStyles.push("color: #ffa500", "color: inherit"); }
		if (pad !== "0 0 0 0") { legendParts.push("%c■ padding%c"); legendStyles.push("color: #00c800", "color: inherit"); }
		if (cs.display === "flex" || cs.display === "inline-flex") { legendParts.push("%c■ flex children%c"); legendStyles.push("color: #6495ed", "color: inherit"); }
		const gapVal = parseFloat(cs.gap) || 0;
		if (gapVal > 0) { legendParts.push("%c■ gap%c"); legendStyles.push("color: #c864ff", "color: inherit"); }
		legendParts.push("%c() depth%c");
		legendStyles.push("color: #888", "color: inherit");
		const tag = el.tagName.toLowerCase();
		const id = el.id ? `#${el.id}` : "";
		const cls = el.classList.length ? "." + Array.from(el.classList).join(".") : "";
		console.log(
			`%c[inspector] #${++logSeq} ${tag}${id}${cls} %c(${currentDepth})%c\n${legendParts.join("  ")}\n%c${summary.text}`,
			`color: ${depthColor(currentDepth)}`,
			`color: ${depthColor(currentDepth)}`,
			"color: inherit",
			...legendStyles,
			"color: inherit",
		);
		logTimer = null;
	}, 400);
}

function clearBoxOverlays(): void {
	for (const o of boxOverlays) o.remove();
	boxOverlays = [];
}

function showBoxModel(el: HTMLElement, cs: CSSStyleDeclaration): void {
	clearBoxOverlays();
	const rect = el.getBoundingClientRect();
	const mt = parseFloat(cs.marginTop) || 0;
	const mr = parseFloat(cs.marginRight) || 0;
	const mb = parseFloat(cs.marginBottom) || 0;
	const ml = parseFloat(cs.marginLeft) || 0;
	const pt = parseFloat(cs.paddingTop) || 0;
	const pr = parseFloat(cs.paddingRight) || 0;
	const pb = parseFloat(cs.paddingBottom) || 0;
	const pl = parseFloat(cs.paddingLeft) || 0;

	const marginDiv = document.createElement("div");
	Object.assign(marginDiv.style, {
		position: "fixed",
		zIndex: "1000001",
		pointerEvents: "none",
		top: `${rect.top - mt}px`,
		left: `${rect.left - ml}px`,
		width: `${rect.width + ml + mr}px`,
		height: `${rect.height + mt + mb}px`,
		outline: "1px dashed rgba(255, 165, 0, 0.6)",
		background: "rgba(255, 165, 0, 0.08)",
	});
	boxOverlays.push(marginDiv);
	document.body.appendChild(marginDiv);

	if (pt || pr || pb || pl) {
		const isFlex = cs.display === "flex" || cs.display === "inline-flex";
		const hasFlexChildren = isFlex && Array.from(el.children).some((c) => {
			const r = c.getBoundingClientRect();
			return r.width > 0 && r.height > 0;
		});
		if (!hasFlexChildren) {
			const padDiv = document.createElement("div");
			Object.assign(padDiv.style, {
				position: "fixed",
				zIndex: "1000001",
				pointerEvents: "none",
				top: `${rect.top}px`,
				left: `${rect.left}px`,
				width: `${rect.width}px`,
				height: `${rect.height}px`,
				outline: "1px dashed rgba(0, 200, 0, 0.6)",
				background: "rgba(0, 200, 0, 0.08)",
			});
			boxOverlays.push(padDiv);
			document.body.appendChild(padDiv);
		}
	}

	if (cs.display === "flex" || cs.display === "inline-flex") {
		const children = Array.from(el.children);
		const childRects = children
			.map((c) => c.getBoundingClientRect())
			.filter((r) => r.width > 0 && r.height > 0);

		for (const cr of childRects) {
			const childDiv = document.createElement("div");
			Object.assign(childDiv.style, {
				position: "fixed",
				zIndex: "1000001",
				pointerEvents: "none",
				top: `${cr.top}px`,
				left: `${cr.left}px`,
				width: `${cr.width}px`,
				height: `${cr.height}px`,
				outline: "1px dashed rgba(100, 149, 237, 0.8)",
			});
			boxOverlays.push(childDiv);
			document.body.appendChild(childDiv);
		}

		const gapVal = parseFloat(cs.gap) || 0;
		if (gapVal > 0 && childRects.length > 1) {
			const isColumn = cs.flexDirection === "column" || cs.flexDirection === "column-reverse";
			const sorted = [...childRects].sort((a, b) => (isColumn ? a.top - b.top : a.left - b.left));
			for (let i = 0; i < sorted.length - 1; i++) {
				const a = sorted[i];
				const b = sorted[i + 1];
				const gapDiv = document.createElement("div");
				if (isColumn) {
					const gapTop = a.bottom;
					const gapHeight = b.top - a.bottom;
					Object.assign(gapDiv.style, {
						position: "fixed",
						zIndex: "1000001",
						pointerEvents: "none",
						top: `${gapTop}px`,
						left: `${rect.left + pl}px`,
						width: `${rect.width - pl - pr}px`,
						height: `${gapHeight}px`,
						outline: "1px dashed rgba(200, 100, 255, 0.8)",
						background: "rgba(200, 100, 255, 0.12)",
					});
				} else {
					const gapLeft = a.right;
					const gapWidth = b.left - a.right;
					Object.assign(gapDiv.style, {
						position: "fixed",
						zIndex: "1000001",
						pointerEvents: "none",
						top: `${rect.top + pt}px`,
						left: `${gapLeft}px`,
						width: `${gapWidth}px`,
						height: `${rect.height - pt - pb}px`,
						outline: "1px dashed rgba(200, 100, 255, 0.8)",
						background: "rgba(200, 100, 255, 0.12)",
					});
				}
				boxOverlays.push(gapDiv);
				document.body.appendChild(gapDiv);
			}
		}
	}
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

function figmaSummary(el: HTMLElement, cs: CSSStyleDeclaration): { text: string; styles: string[] } {
	const segments: string[] = [];
	const styles: string[] = [];
	const tag = el.tagName.toLowerCase();
	const id = el.id ? `#${el.id}` : "";
	const cls = el.classList.length ? "." + Array.from(el.classList).join(".") : "";
	segments.push(`${tag}${id}${cls}`);
	segments.push(`  W: ${px(cs.width)}  H: ${px(cs.height)}`);
	const bg = cs.backgroundColor;
	if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") segments.push(`  Fill: ${hexColor(bg)}`);
	const border = cs.border;
	if (border && border !== "0px none rgb(0, 0, 0)") segments.push(`  Stroke: ${border.replace(/rgb\([^)]+\)/g, hexColor)}`);
	const br = cs.borderRadius;
	if (br && br !== "0px") segments.push(`  Radius: ${px(br)}`);
	const pad = `${px(cs.paddingTop)} ${px(cs.paddingRight)} ${px(cs.paddingBottom)} ${px(cs.paddingLeft)}`;
	if (pad !== "0 0 0 0") {
		segments.push(`  %cPadding:%c ${pad}`);
		styles.push("color: #00c800", "color: inherit");
	}
	const marg = `${px(cs.marginTop)} ${px(cs.marginRight)} ${px(cs.marginBottom)} ${px(cs.marginLeft)}`;
	if (marg !== "0 0 0 0") {
		segments.push(`  %cMargin:%c ${marg}`);
		styles.push("color: #ffa500", "color: inherit");
	}
	const fs = cs.fontSize;
	if (fs && fs !== "0px") segments.push(`  Font: ${cs.fontFamily.split(",")[0].replace(/"/g, "")}, ${px(fs)}, ${cs.fontWeight}`);
	const lh = cs.lineHeight;
	if (lh !== "normal") segments.push(`  Line height: ${px(lh)}`);
	const ls = cs.letterSpacing;
	if (ls !== "normal" && ls !== "0px") segments.push(`  Letter spacing: ${px(ls)}`);
	const color = cs.color;
	if (color && color !== "rgb(0, 0, 0)") segments.push(`  Text: ${hexColor(color)}`);
	if (cs.display === "flex") {
		segments.push(`  %cAuto:%c ${cs.flexDirection}, ${cs.alignItems}, ${cs.justifyContent}`);
		styles.push("color: #6495ed", "color: inherit");
		if (cs.gap !== "normal") {
			segments.push(`  %cGap:%c ${px(cs.gap)}`);
			styles.push("color: #6495ed", "color: inherit");
		}
	}
	if (cs.position !== "static") segments.push(`  Position: ${cs.position}`);
	const op = cs.opacity;
	if (op !== "1") segments.push(`  Opacity: ${op}`);
	const bs = cs.boxShadow;
	if (bs !== "none") segments.push(`  Shadow: ${bs}`);
	const ov = cs.overflow;
	if (ov !== "visible") segments.push(`  Overflow: ${ov}`);
	return { text: segments.join("\n"), styles };
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
	clearBoxOverlays();
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
	const editor = document.querySelector(".beepboxEditor") as HTMLElement | null;
	if (editor) editor.focus({ preventScroll: true });
	console.log("[inspector] deactivated");
}

document.addEventListener(
	"keydown",
	(e: KeyboardEvent) => {
		if (e.shiftKey && e.key === "D" && !isActive()) {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			activate();
		}
	},
	true,
);

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
