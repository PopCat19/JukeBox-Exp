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
			fontWeight: "600",
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
	const rect = el.getBoundingClientRect();
	const w = rect.width.toFixed(0);
	const h = rect.height.toFixed(0);
	depthLabel.textContent = `${tag}${id}${cls} (${currentDepth}) ${w}×${h}`;
	depthLabel.style.background = `hsl(${(currentDepth * 37) % 360}, 80%, 55%, 0.8)`;
	depthLabel.style.color = wcagTextColor(depthLabel.style.background);
	const cx = rect.left + rect.width / 2;
	const above = rect.top - 16;
	const below = rect.bottom + 2;
	depthLabel.style.top = `${below}px`;
	depthLabel.style.left = `${cx}px`;
	depthLabel.style.transform = "translateX(-50%)";
	requestAnimationFrame(() => {
		const lr = depthLabel!.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		if (lr.bottom > vh) {
			depthLabel!.style.top = `${above}px`;
			depthLabel!.style.transform = "translateX(-50%)";
		}
		if (lr.left < 0) depthLabel!.style.left = `${lr.width / 2}px`;
		if (lr.right > vw) depthLabel!.style.left = `${vw - lr.width / 2}px`;
	});
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
		const bw = parseFloat(cs.borderTopWidth) || 0;
		if (bw > 0) { legendParts.push("%c■ border%c"); legendStyles.push("color: #00c8ff", "color: inherit"); }
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

function wcagTextColor(bgColor: string): string {
	let r: number, g: number, b: number;
	const hsl = bgColor.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
	if (hsl) {
		const h = Number(hsl[1]) / 360;
		const s = Number(hsl[2]) / 100;
		const l = Number(hsl[3]) / 100;
		const hue2rgb = (p: number, q: number, t: number) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3) * 255;
		g = hue2rgb(p, q, h) * 255;
		b = hue2rgb(p, q, h - 1 / 3) * 255;
	} else {
		const m = bgColor.match(/[\d.]+/g);
		if (!m || m.length < 3) return "#fff";
		[r, g, b] = m.slice(0, 3).map(Number);
	}
	const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return lum > 0.5 ? "#000" : "#fff";
}

function addStrip(parent: Node, top: number, left: number, w: number, h: number, color: string, label?: string): void {
	if (w <= 0 || h <= 0) return;
	const div = document.createElement("div");
	Object.assign(div.style, {
		position: "fixed",
		zIndex: "1000001",
		pointerEvents: "none",
		top: `${top}px`,
		left: `${left}px`,
		width: `${w}px`,
		height: `${h}px`,
		outline: `1px dashed ${color}`,
		background: color.replace("0.6", "0.12"),
	});
	boxOverlays.push(div);
	parent.appendChild(div);

	if (label) {
		const lbl = document.createElement("div");
		const bg = color.replace("0.6", "0.85");
		const textColor = wcagTextColor(bg);
		Object.assign(lbl.style, {
			position: "fixed",
			zIndex: "1000002",
			pointerEvents: "none",
			fontSize: "10px",
			fontFamily: "monospace",
			color: textColor,
			background: bg,
			borderRadius: "2px",
			padding: "1px 3px",
			whiteSpace: "nowrap",
			lineHeight: "1",
		});
		lbl.style.top = `${top + (h - 14) / 2}px`;
		lbl.style.left = `${left + (w - label.length * 6) / 2}px`;
		lbl.textContent = label;
		boxOverlays.push(lbl);
		parent.appendChild(lbl);
	}
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

	const marginColor = "rgba(255, 165, 0, 0.6)";
	const padColor = "rgba(0, 200, 0, 0.6)";

	if (mt) addStrip(document.body, rect.top - mt, rect.left - ml, rect.width + ml + mr, mt, marginColor, `${mt.toFixed(0)}`);
	if (mb) addStrip(document.body, rect.bottom, rect.left - ml, rect.width + ml + mr, mb, marginColor, `${mb.toFixed(0)}`);
	if (ml) addStrip(document.body, rect.top - mt, rect.left - ml, ml, rect.height + mt + mb, marginColor, `${ml.toFixed(0)}`);
	if (mr) addStrip(document.body, rect.top - mt, rect.right, mr, rect.height + mt + mb, marginColor, `${mr.toFixed(0)}`);

	if (pt || pr || pb || pl) {
		if (pt) addStrip(document.body, rect.top, rect.left + pl, rect.width - pl - pr, pt, padColor, `${pt.toFixed(0)}`);
		if (pb) addStrip(document.body, rect.bottom - pb, rect.left + pl, rect.width - pl - pr, pb, padColor, `${pb.toFixed(0)}`);
		if (pl) addStrip(document.body, rect.top, rect.left, pl, rect.height, padColor, `${pl.toFixed(0)}`);
		if (pr) addStrip(document.body, rect.top, rect.right - pr, pr, rect.height, padColor, `${pr.toFixed(0)}`);
	}

	const bt = parseFloat(cs.borderTopWidth) || 0;
	const br = parseFloat(cs.borderRightWidth) || 0;
	const bb = parseFloat(cs.borderBottomWidth) || 0;
	const bl = parseFloat(cs.borderLeftWidth) || 0;
	const borderColor = "rgba(0, 200, 255, 0.6)";
	if (bt) addStrip(document.body, rect.top, rect.left, rect.width, bt, borderColor, `border ${bt.toFixed(0)}`);
	if (bb) addStrip(document.body, rect.bottom - bb, rect.left, rect.width, bb, borderColor, `border ${bb.toFixed(0)}`);
	if (bl) addStrip(document.body, rect.top, rect.left, bl, rect.height, borderColor, `border ${bl.toFixed(0)}`);
	if (br) addStrip(document.body, rect.top, rect.right - br, br, rect.height, borderColor, `border ${br.toFixed(0)}`);

	const brtl = parseFloat(cs.borderTopLeftRadius) || 0;
	const brtr = parseFloat(cs.borderTopRightRadius) || 0;
	const brbr = parseFloat(cs.borderBottomRightRadius) || 0;
	const brbl = parseFloat(cs.borderBottomLeftRadius) || 0;
	const radiusColor = "rgba(255, 255, 255, 0.6)";
	if (brtl) addStrip(document.body, rect.top, rect.left, 8, 8, radiusColor, `↱${brtl.toFixed(0)}`);
	if (brtr) addStrip(document.body, rect.top, rect.right - 8, 8, 8, radiusColor, `↰${brtr.toFixed(0)}`);
	if (brbr) addStrip(document.body, rect.bottom - 8, rect.right - 8, 8, 8, radiusColor, `↲${brbr.toFixed(0)}`);
	if (brbl) addStrip(document.body, rect.bottom - 8, rect.left, 8, 8, radiusColor, `↳${brbl.toFixed(0)}`);

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
		const gapColor = "rgba(200, 100, 255, 0.6)";
		if (gapVal > 0 && childRects.length > 1) {
			const isColumn = cs.flexDirection === "column" || cs.flexDirection === "column-reverse";
			const sorted = [...childRects].sort((a, b) => (isColumn ? a.top - b.top : a.left - b.left));
			for (let i = 0; i < sorted.length - 1; i++) {
				const a = sorted[i];
				const b = sorted[i + 1];
				if (isColumn) {
					const gapTop = a.bottom;
					const gapHeight = b.top - a.bottom;
					addStrip(document.body, gapTop, rect.left + pl, rect.width - pl - pr, gapHeight, gapColor, `${gapHeight.toFixed(0)}`);
				} else {
					const gapLeft = a.right;
					const gapWidth = b.left - a.right;
					addStrip(document.body, rect.top + pt, gapLeft, gapWidth, rect.height - pt - pb, gapColor, `${gapWidth.toFixed(0)}`);
				}
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
