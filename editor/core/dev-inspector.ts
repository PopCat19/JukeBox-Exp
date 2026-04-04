// dev-inspector
//
// Purpose: Inject a hover-based DOM inspector that copies computed styles to clipboard
//
// This module:
// - Activates on demand and freezes interaction via a transparent overlay
// - Highlights hovered elements with a depth-colored outline
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

const COLORS = {
	margin: "#ffcc44",
	padding: "#44dd44",
	border: "#44ddff",
	radius: "#ffffff",
	flexChild: "#77bbff",
	gap: "#dd88ff",
} as const;

const Z_INDEX = { label: 1000000, overlay: 1000001, labelStrip: 1000002 } as const;

const LABEL_OFFSET = { above: -16, below: 8 } as const;
const LABEL_SIZE = { charWidth: 6, height: 14 } as const;
const RADIUS_OVERLAY = 8;

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
let navStack: HTMLElement[] = [];

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

function selector(el: HTMLElement): string {
	const tag = el.tagName.toLowerCase();
	const id = el.id ? `#${el.id}` : "";
	const cls = el.classList.length ? "." + Array.from(el.classList).join(".") : "";
	return `${tag}${id}${cls}`;
}

function addStrip(parent: Node, top: number, left: number, w: number, h: number, color: string, label?: string): void {
	if (w <= 0 || h <= 0) return;

	if (label) {
		const lbl = document.createElement("div");
		Object.assign(lbl.style, {
			position: "fixed",
			zIndex: Z_INDEX.labelStrip,
			pointerEvents: "none",
			fontSize: "13px",
			fontWeight: "700",
			fontFamily: "monospace",
			color: color,
			textShadow: "-1px -1px 0 rgba(0,0,0,0.9), 1px -1px 0 rgba(0,0,0,0.9), -1px 1px 0 rgba(0,0,0,0.9), 1px 1px 0 rgba(0,0,0,0.9)",
			whiteSpace: "nowrap",
			lineHeight: "1",
		});
		const lblW = label.length * LABEL_SIZE.charWidth;
		lbl.style.top = `${top + Math.max(0, (h - LABEL_SIZE.height) / 2)}px`;
		lbl.style.left = `${left + Math.max(0, (w - lblW) / 2)}px`;
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

	if (mt) addStrip(document.body, rect.top - mt, rect.left - ml, rect.width + ml + mr, mt, COLORS.margin, `${mt.toFixed(0)}`);
	if (mb) addStrip(document.body, rect.bottom, rect.left - ml, rect.width + ml + mr, mb, COLORS.margin, `${mb.toFixed(0)}`);
	if (ml) addStrip(document.body, rect.top - mt, rect.left - ml, ml, rect.height + mt + mb, COLORS.margin, `${ml.toFixed(0)}`);
	if (mr) addStrip(document.body, rect.top - mt, rect.right, mr, rect.height + mt + mb, COLORS.margin, `${mr.toFixed(0)}`);

	if (pt || pr || pb || pl) {
		if (pt) addStrip(document.body, rect.top, rect.left + pl, rect.width - pl - pr, pt, COLORS.padding, `${pt.toFixed(0)}`);
		if (pb) addStrip(document.body, rect.bottom - pb, rect.left + pl, rect.width - pl - pr, pb, COLORS.padding, `${pb.toFixed(0)}`);
		if (pl) addStrip(document.body, rect.top, rect.left, pl, rect.height, COLORS.padding, `${pl.toFixed(0)}`);
		if (pr) addStrip(document.body, rect.top, rect.right - pr, pr, rect.height, COLORS.padding, `${pr.toFixed(0)}`);
	}

	const bt = parseFloat(cs.borderTopWidth) || 0;
	const br = parseFloat(cs.borderRightWidth) || 0;
	const bb = parseFloat(cs.borderBottomWidth) || 0;
	const bl = parseFloat(cs.borderLeftWidth) || 0;
	const borderVals = [bt, br, bb, bl];
	const allSame = borderVals.every((v) => v === borderVals[0]);
	if (allSame && bt) {
		addStrip(document.body, rect.top, rect.left, rect.width, bt, COLORS.border, `b ${bt.toFixed(0)}`);
	} else {
		const counts = new Map<number, number>();
		for (const v of borderVals) counts.set(v, (counts.get(v) || 0) + 1);
		const common = borderVals.length > 0 ? [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] : 0;
		if (bt !== common) addStrip(document.body, rect.top, rect.left, rect.width, bt, COLORS.border, `b-t ${bt.toFixed(0)}`);
		if (bb !== common) addStrip(document.body, rect.bottom - bb, rect.left, rect.width, bb, COLORS.border, `b-b ${bb.toFixed(0)}`);
		if (bl !== common) addStrip(document.body, rect.top, rect.left, bl, rect.height, COLORS.border, `b-l ${bl.toFixed(0)}`);
		if (br !== common) addStrip(document.body, rect.top, rect.right - br, br, rect.height, COLORS.border, `b-r ${br.toFixed(0)}`);
	}

	const brtl = parseFloat(cs.borderTopLeftRadius) || 0;
	const brtr = parseFloat(cs.borderTopRightRadius) || 0;
	const brbr = parseFloat(cs.borderBottomRightRadius) || 0;
	const brbl = parseFloat(cs.borderBottomLeftRadius) || 0;
	if (brtl) addStrip(document.body, rect.top, rect.left, RADIUS_OVERLAY, RADIUS_OVERLAY, COLORS.radius, `↱${brtl.toFixed(0)}`);
	if (brtr) addStrip(document.body, rect.top, rect.right - RADIUS_OVERLAY, RADIUS_OVERLAY, RADIUS_OVERLAY, COLORS.radius, `↰${brtr.toFixed(0)}`);
	if (brbr)
		addStrip(
			document.body,
			rect.bottom - RADIUS_OVERLAY,
			rect.right - RADIUS_OVERLAY,
			RADIUS_OVERLAY,
			RADIUS_OVERLAY,
			COLORS.radius,
			`↲${brbr.toFixed(0)}`,
		);
	if (brbl) addStrip(document.body, rect.bottom - RADIUS_OVERLAY, rect.left, RADIUS_OVERLAY, RADIUS_OVERLAY, COLORS.radius, `↳${brbl.toFixed(0)}`);

	const isFlex = cs.display === "flex" || cs.display === "inline-flex";
	if (isFlex) {
		const childRects = Array.from(el.children)
			.map((c) => c.getBoundingClientRect())
			.filter((r) => r.width > 0 && r.height > 0);

		for (const cr of childRects) {
			addStrip(document.body, cr.top, cr.left, cr.width, cr.height, COLORS.flexChild);
		}

		const gapVal = parseFloat(cs.gap) || 0;
		if (gapVal > 0 && childRects.length > 1) {
			const isColumn = cs.flexDirection === "column" || cs.flexDirection === "column-reverse";
			const sorted = [...childRects].sort((a, b) => (isColumn ? a.top - b.top : a.left - b.left));
			for (let i = 0; i < sorted.length - 1; i++) {
				const a = sorted[i];
				const b = sorted[i + 1];
				if (isColumn) {
					addStrip(document.body, a.bottom, rect.left + pl, rect.width - pl - pr, b.top - a.bottom, COLORS.gap, `${(b.top - a.bottom).toFixed(0)}`);
				} else {
					addStrip(document.body, rect.top + pt, a.right, b.left - a.right, rect.height - pt - pb, COLORS.gap, `${(b.left - a.right).toFixed(0)}`);
				}
			}
		}
	}
}

function clearBoxOverlays(): void {
	for (const o of boxOverlays) o.remove();
	boxOverlays = [];
}

function reconcileLabels(): void {
	requestAnimationFrame(() => {
		const allLabels: HTMLElement[] = [];
		if (depthLabel) allLabels.push(depthLabel);
		for (const el of boxOverlays) {
			if (el.textContent && el.style.fontSize) allLabels.push(el);
		}

		const items = allLabels.map((el) => ({ el, rect: el.getBoundingClientRect() }));

		for (let pass = 0; pass < 3; pass++) {
			for (let i = 0; i < items.length; i++) {
				for (let j = i + 1; j < items.length; j++) {
					const a = items[i];
					const b = items[j];
					const overlap = !(
						a.rect.right <= b.rect.left ||
						b.rect.right <= a.rect.left ||
						a.rect.bottom <= b.rect.top ||
						b.rect.bottom <= a.rect.top
					);
					if (overlap) {
						const pushDown = a.rect.bottom - b.rect.top + 2;
						const pushUp = b.rect.bottom - a.rect.top + 2;
						const pushRight = a.rect.right - b.rect.left + 2;
						const pushLeft = b.rect.right - a.rect.left + 2;

						const shifts = [
							{ dx: 0, dy: pushDown },
							{ dx: 0, dy: -pushUp },
							{ dx: pushRight, dy: 0 },
							{ dx: -pushLeft, dy: 0 },
						];

						let bestDx = 0;
						let bestDy = 0;
						let bestDist = Infinity;
						for (const s of shifts) {
							const dist = Math.sqrt(s.dx * s.dx + s.dy * s.dy);
							if (dist < bestDist) {
								bestDx = s.dx;
								bestDy = s.dy;
								bestDist = dist;
							}
						}

						const currentTop = parseFloat(b.el.style.top);
						const currentLeft = parseFloat(b.el.style.left);
						b.el.style.top = `${currentTop + bestDy}px`;
						b.el.style.left = `${currentLeft + bestDx}px`;
						b.rect = b.el.getBoundingClientRect();
					}
				}
			}
		}
	});
}

interface LegendEntry {
	label: string;
	color: string;
}

function buildLegend(cs: CSSStyleDeclaration): LegendEntry[] {
	const entries: LegendEntry[] = [];
	const marg = `${px(cs.marginTop)} ${px(cs.marginRight)} ${px(cs.marginBottom)} ${px(cs.marginLeft)}`;
	const pad = `${px(cs.paddingTop)} ${px(cs.paddingRight)} ${px(cs.paddingBottom)} ${px(cs.paddingLeft)}`;
	const bw = parseFloat(cs.borderTopWidth) || 0;
	const gapVal = parseFloat(cs.gap) || 0;
	if (marg !== "0 0 0 0") entries.push({ label: "margin", color: "#ffa500" });
	if (pad !== "0 0 0 0") entries.push({ label: "padding", color: "#00c800" });
	if (bw > 0) entries.push({ label: "border", color: "#00c8ff" });
	if (cs.display === "flex" || cs.display === "inline-flex") entries.push({ label: "flex children", color: "#6495ed" });
	if (gapVal > 0) entries.push({ label: "gap", color: "#c864ff" });
	entries.push({ label: "() depth", color: "#888" });
	return entries;
}

function formatLegend(entries: LegendEntry[]): { text: string; styles: string[] } {
	const parts: string[] = [];
	const styles: string[] = [];
	for (const e of entries) {
		parts.push(`%c■ ${e.label}%c`);
		styles.push(`color: ${e.color}`, "color: inherit");
	}
	return { text: parts.join("  "), styles };
}

interface SummaryResult {
	text: string;
	styles: string[];
}

function figmaSummary(el: HTMLElement, cs: CSSStyleDeclaration): SummaryResult {
	const segments: string[] = [];
	const styles: string[] = [];
	segments.push(selector(el));
	const props: { label: string; color?: string }[] = [];
	props.push({ label: `W: ${px(cs.width)}  H: ${px(cs.height)}` });
	const bg = cs.backgroundColor;
	if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") props.push({ label: `Fill: ${hexColor(bg)}` });
	const border = cs.border;
	if (border && border !== "0px none rgb(0, 0, 0)") props.push({ label: `Stroke: ${border.replace(/rgb\([^)]+\)/g, hexColor)}` });
	const br = cs.borderRadius;
	if (br && br !== "0px") props.push({ label: `Radius: ${px(br)}` });
	const pad = `${px(cs.paddingTop)} ${px(cs.paddingRight)} ${px(cs.paddingBottom)} ${px(cs.paddingLeft)}`;
	if (pad !== "0 0 0 0") props.push({ label: `Padding: ${pad}`, color: "#00c800" });
	const marg = `${px(cs.marginTop)} ${px(cs.marginRight)} ${px(cs.marginBottom)} ${px(cs.marginLeft)}`;
	if (marg !== "0 0 0 0") props.push({ label: `Margin: ${marg}`, color: "#ffa500" });
	const fs = cs.fontSize;
	if (fs && fs !== "0px") props.push({ label: `Font: ${cs.fontFamily.split(",")[0].replace(/"/g, "")}, ${px(fs)}, ${cs.fontWeight}` });
	const lh = cs.lineHeight;
	if (lh !== "normal") props.push({ label: `Line height: ${px(lh)}` });
	const ls = cs.letterSpacing;
	if (ls !== "normal" && ls !== "0px") props.push({ label: `Letter spacing: ${px(ls)}` });
	const color = cs.color;
	if (color && color !== "rgb(0, 0, 0)") props.push({ label: `Text: ${hexColor(color)}` });
	if (cs.display === "flex") {
		props.push({ label: `Auto: ${cs.flexDirection}, ${cs.alignItems}, ${cs.justifyContent}`, color: "#6495ed" });
		if (cs.gap !== "normal") props.push({ label: `Gap: ${px(cs.gap)}`, color: "#6495ed" });
	}
	if (cs.position !== "static") props.push({ label: `Position: ${cs.position}` });
	const op = cs.opacity;
	if (op !== "1") props.push({ label: `Opacity: ${op}` });
	const bs = cs.boxShadow;
	if (bs !== "none") props.push({ label: `Shadow: ${bs}` });
	const ov = cs.overflow;
	if (ov !== "visible") props.push({ label: `Overflow: ${ov}` });
	for (let i = 0; i < props.length; i++) {
		const isLast = i === props.length - 1;
		const prefix = isLast ? "└─ " : "├─ ";
		segments.push(`%c${prefix}${props[i].label}%c`);
		styles.push(props[i].color ? `color: ${props[i].color}` : "color: inherit", "color: inherit");
	}
	return { text: segments.join("\n"), styles };
}

function positionDepthLabel(el: HTMLElement): void {
	const rect = el.getBoundingClientRect();
	depthLabel!.style.top = `${rect.bottom + LABEL_OFFSET.below}px`;
	depthLabel!.style.left = `${rect.left + rect.width / 2}px`;
	depthLabel!.style.transform = "translateX(-50%)";
	requestAnimationFrame(() => {
		const lr = depthLabel!.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		if (lr.bottom > vh) {
			depthLabel!.style.top = `${rect.top + LABEL_OFFSET.above}px`;
			depthLabel!.style.transform = "translateX(-50%)";
		}
		if (lr.left < 0) depthLabel!.style.left = `${lr.width / 2}px`;
		if (lr.right > vw) depthLabel!.style.left = `${vw - lr.width / 2}px`;
	});
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
	if (current && !el.contains(current)) navStack = [];
	current = el;
	if (!depthLabel) {
		depthLabel = document.createElement("div");
		Object.assign(depthLabel.style, {
			position: "fixed",
			zIndex: Z_INDEX.label,
			pointerEvents: "none",
			padding: "2px 6px",
			fontSize: "11px",
			fontWeight: "600",
			fontFamily: "monospace",
			whiteSpace: "nowrap",
			borderRadius: "3px",
		});
		document.body.appendChild(depthLabel);
	}
	const rect = el.getBoundingClientRect();
	depthLabel.textContent = `${selector(el)} (${currentDepth}) ${rect.width.toFixed(0)}×${rect.height.toFixed(0)}`;
	const bg = `hsl(${(currentDepth * 37) % 360}, 80%, 55%, 0.8)`;
	depthLabel.style.background = bg;
	depthLabel.style.color = wcagTextColor(bg);
	positionDepthLabel(el);
	if (logTimer) clearTimeout(logTimer);
	logTimer = setTimeout(() => {
		const cs = window.getComputedStyle(el);
		showBoxModel(el, cs);
		reconcileLabels();
		const summary = figmaSummary(el, cs);
		const legend = formatLegend(buildLegend(cs));
		console.log(
			`%c[inspector] #${++logSeq} ${selector(el)} %c(${currentDepth})%c\n${legend.text}\n%c${summary.text}`,
			`color: ${depthColor(currentDepth)}`,
			`color: ${depthColor(currentDepth)}`,
			"color: inherit",
			...legend.styles,
			"color: inherit",
		);
		logTimer = null;
	}, 400);
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
	navStack = [];
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
	overlay.tabIndex = -1;
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
		else if (e.key === "ArrowUp" && current?.parentElement && current.parentElement !== document.body) {
			navStack.push(current);
			highlight(current.parentElement);
		} else if (e.key === "ArrowDown") {
			if (current?.tagName.toLowerCase() === "select") {
				const sel = current as HTMLSelectElement;
				const opts = Array.from(sel.options)
					.map((o, i) => `${i === sel.selectedIndex ? "▸" : " "} [${i}] ${o.value} (${o.textContent})`)
					.join("\n");
				console.log(`[inspector] #${++logSeq} <select> options (value="${sel.value}", selectedIndex=${sel.selectedIndex}):\n${opts}`);
			} else if (navStack.length > 0) {
				highlight(navStack.pop()!);
			} else if (current?.children?.length) {
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
