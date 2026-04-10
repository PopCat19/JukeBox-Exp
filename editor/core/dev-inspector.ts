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

let current: Element | null = null;
let outlineOverlay: HTMLDivElement | null = null;
let overlay: HTMLDivElement | null = null;
let depthLabel: HTMLDivElement | null = null;
let boxOverlays: HTMLDivElement[] = [];
let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let logSeq = 0;
let logTimer: ReturnType<typeof setTimeout> | null = null;
let currentDepth = 0;
let navStack: Element[] = [];

function depth(el: Element): number {
	let d = 0;
	let c: Element | null = el;
	while (c && c !== document.body) {
		d++;
		c = c.parentElement;
	}
	return d;
}

function findSvgChildAtPoint(x: number, y: number, svg: SVGSVGElement): Element | null {
	const CONTAINER_TAGS = ["path", "rect", "circle", "ellipse", "line", "polyline", "polygon"];

	let best: Element | null = null;
	let bestArea = Infinity;
	let bestIsContainer = false;

	function isVisible(el: Element): boolean {
		if (el.getAttribute("visibility") === "hidden") return false;
		const style = el.getAttribute("style");
		if (style && /visibility\s*:\s*hidden/.test(style)) return false;
		if (el.getAttribute("display") === "none") return false;
		return true;
	}

	function hitTest(el: Element): void {
		if (el instanceof SVGGraphicsElement && el.tagName !== "svg" && isVisible(el)) {
			const rect = el.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) {
				if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
					const area = rect.width * rect.height;
					const isContainer = CONTAINER_TAGS.includes(el.tagName.toLowerCase());
					if (!best || (isContainer && !bestIsContainer) || (isContainer === bestIsContainer && area < bestArea)) {
						best = el;
						bestArea = area;
						bestIsContainer = isContainer;
					}
				}
			}
		}
		for (const child of Array.from(el.children)) {
			hitTest(child);
		}
	}

	hitTest(svg);
	return best ?? svg;
}

function deepestElementAtPoint(x: number, y: number): Element | null {
	const els = document.elementsFromPoint(x, y);
	if (els.length === 0) return null;

	const inspectorNodes = new Set<Element>([
		...(overlay ? [overlay] : []),
		...(outlineOverlay ? [outlineOverlay] : []),
		...(depthLabel ? [depthLabel] : []),
		...boxOverlays,
	]);
	const filtered = els.filter((e) => !inspectorNodes.has(e));
	if (filtered.length === 0) return null;

	// Prefer elements inside an active prompt over background canvas elements
	const promptEl = filtered.find((e) => e.closest(".prompt, .promptContainer"));
	if (promptEl) return promptEl;

	const htmlEl = filtered.find((e) => !(e instanceof SVGElement));

	for (let i = 0; i < filtered.length; i++) {
		const el = filtered[i];
		if (el instanceof SVGSVGElement) {
			const child = findSvgChildAtPoint(x, y, el);
			if (child && child !== el) return child;
			for (let j = i + 1; j < filtered.length; j++) {
				if (!(filtered[j] instanceof SVGElement) && filtered[j] !== document.body && filtered[j] !== document.documentElement) {
					return filtered[j];
				}
			}
			return htmlEl ?? el;
		}
	}

	// If first element is a non-root SVG element (e.g. <rect>), prefer HTML
	return htmlEl ?? filtered[0];
}

function depthColor(d: number): string {
	return `hsl(${(d * 37) % 360}, 80%, 55%)`;
}

function wcagTextColor(bgColor: string): string {
	let r: number, g: number, b: number;
	const hsl = bgColor.match(/hsla?\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%/);
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
		const m = bgColor.match(/\d+/g);
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

function elementId(el: Element): string {
	const classList = Array.from(el.classList);
	const semanticClasses = classList.filter((c) => {
		if (/^hsl\(|^\d+$/.test(c)) return false;
		if (["no-underline", "active", "selected", "last-button", "midTick"].includes(c)) return false;
		return c.length > 2;
	});

	if (semanticClasses.length > 0) return semanticClasses.join(".");

	const tag = el.tagName.toLowerCase();
	const text = el.textContent?.trim().slice(0, 20) || "";
	if (text && el.children.length === 0) return `${tag} "${text}"`;
	if (text) return `${tag} "${text.slice(0, 12)}…"`;

	const parent = el.parentElement;
	if (parent) {
		const siblings = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
		if (siblings.length > 1) return `${tag} #${siblings.indexOf(el)}`;
	}

	return tag;
}

function elementHtml(el: Element, maxLen = 120): string {
	const clone = el.cloneNode(true) as HTMLElement;
	const inline = clone.getAttribute("style");
	if (inline) clone.setAttribute("style", inline.replace(/\s*outline:\s*[^;]+;?\s*/gi, ""));
	const html = clone.outerHTML;
	return html.length > maxLen ? html.slice(0, maxLen) + "…" : html;
}

function addStrip(
	parent: Node,
	top: number,
	left: number,
	w: number,
	h: number,
	color: string,
	label?: string,
	labelOffsetY = 0,
	align: "center" | "left" = "center",
): void {
	if (w <= 0 || h <= 0) return;
	const div = document.createElement("div");
	Object.assign(div.style, {
		position: "fixed",
		zIndex: Z_INDEX.overlay,
		pointerEvents: "none",
		top: `${top}px`,
		left: `${left}px`,
		width: `${w}px`,
		height: `${h}px`,
		background: `${color}22`,
	});
	boxOverlays.push(div);
	parent.appendChild(div);

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
		lbl.style.top = `${top + Math.max(0, (h - LABEL_SIZE.height) / 2) + labelOffsetY}px`;
		lbl.style.left = align === "left" ? `${left}px` : `${left + Math.max(0, (w - lblW) / 2)}px`;
		lbl.textContent = label;
		boxOverlays.push(lbl);
		parent.appendChild(lbl);
	}
}

function showBoxModel(el: Element, cs: CSSStyleDeclaration): void {
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

	if (mt) addStrip(document.body, rect.top - mt, rect.left - ml, rect.width + ml + mr, mt, COLORS.margin, `↑${mt.toFixed(0)}`);
	if (mb) addStrip(document.body, rect.bottom, rect.left - ml, rect.width + ml + mr, mb, COLORS.margin, `↓${mb.toFixed(0)}`);
	if (ml) addStrip(document.body, rect.top - mt, rect.left - ml, ml, rect.height + mt + mb, COLORS.margin, `←${ml.toFixed(0)}`);
	if (mr) addStrip(document.body, rect.top - mt, rect.right, mr, rect.height + mt + mb, COLORS.margin, `→${mr.toFixed(0)}`);

	if (pt || pr || pb || pl) {
		if (pt) addStrip(document.body, rect.top, rect.left, rect.width, pt, COLORS.padding, `↑${pt.toFixed(0)}`);
		if (pb) addStrip(document.body, rect.bottom - pb, rect.left, rect.width, pb, COLORS.padding, `↓${pb.toFixed(0)}`);
		if (pl) addStrip(document.body, rect.top, rect.left, pl, rect.height, COLORS.padding, `←${pl.toFixed(0)}`);
		if (pr) addStrip(document.body, rect.top, rect.right - pr, pr, rect.height, COLORS.padding, `→${pr.toFixed(0)}`);
	}

	const brtl = parseFloat(cs.borderTopLeftRadius) || 0;
	const brtr = parseFloat(cs.borderTopRightRadius) || 0;
	const brbr = parseFloat(cs.borderBottomRightRadius) || 0;
	const brbl = parseFloat(cs.borderBottomLeftRadius) || 0;
	const radiusVals = [brtl, brtr, brbr, brbl].map((v) => Math.round(v));
	const allSameRadius = radiusVals.every((v) => v === radiusVals[0]);
	if (allSameRadius && brtl) {
		addStrip(document.body, rect.top, rect.left, RADIUS_OVERLAY, RADIUS_OVERLAY, COLORS.radius, `○${brtl.toFixed(0)}`);
	} else {
		const counts = new Map<number, number>();
		for (const v of radiusVals) counts.set(v, (counts.get(v) || 0) + 1);
		const common = radiusVals.length > 0 ? [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] : 0;
		if (brtl !== common) addStrip(document.body, rect.top, rect.left, RADIUS_OVERLAY, RADIUS_OVERLAY, COLORS.radius, `↱${brtl.toFixed(0)}`);
		if (brtr !== common)
			addStrip(document.body, rect.top, rect.right - RADIUS_OVERLAY, RADIUS_OVERLAY, RADIUS_OVERLAY, COLORS.radius, `↰${brtr.toFixed(0)}`);
		if (brbr !== common)
			addStrip(
				document.body,
				rect.bottom - RADIUS_OVERLAY,
				rect.right - RADIUS_OVERLAY,
				RADIUS_OVERLAY,
				RADIUS_OVERLAY,
				COLORS.radius,
				`↲${brbr.toFixed(0)}`,
			);
		if (brbl !== common)
			addStrip(document.body, rect.bottom - RADIUS_OVERLAY, rect.left, RADIUS_OVERLAY, RADIUS_OVERLAY, COLORS.radius, `↳${brbl.toFixed(0)}`);
	}

	const bt = parseFloat(cs.borderTopWidth) || 0;
	const br = parseFloat(cs.borderRightWidth) || 0;
	const bb = parseFloat(cs.borderBottomWidth) || 0;
	const bl = parseFloat(cs.borderLeftWidth) || 0;
	const borderVals = [bt, br, bb, bl].map((v) => Math.round(v));
	const allSame = borderVals.every((v) => v === borderVals[0]);
	if (allSame && bt) {
		const topOffset = brtl > 0 ? LABEL_SIZE.height + 2 : 0;
		const align = brtl > 0 ? "left" : "center";
		addStrip(document.body, rect.top, rect.left, rect.width, bt, COLORS.border, `b${bt.toFixed(0)}`, topOffset, align);
	} else {
		const counts = new Map<number, number>();
		for (const v of borderVals) counts.set(v, (counts.get(v) || 0) + 1);
		const common = borderVals.length > 0 ? [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] : 0;
		if (bt !== common) {
			const topOffset = brtl > 0 ? LABEL_SIZE.height + 2 : 0;
			const align = brtl > 0 ? "left" : "center";
			addStrip(document.body, rect.top, rect.left, rect.width, bt, COLORS.border, `↑b${bt.toFixed(0)}`, topOffset, align);
		}
		if (bb !== common) addStrip(document.body, rect.bottom - bb, rect.left, rect.width, bb, COLORS.border, `↓b${bb.toFixed(0)}`);
		if (bl !== common) addStrip(document.body, rect.top, rect.left, bl, rect.height, COLORS.border, `←b${bl.toFixed(0)}`);
		if (br !== common) addStrip(document.body, rect.top, rect.right - br, br, rect.height, COLORS.border, `→b${br.toFixed(0)}`);
	}

	const isFlex = cs.display === "flex" || cs.display === "inline-flex";
	if (isFlex) {
		const childRects = Array.from(el.children)
			.map((c) => c.getBoundingClientRect())
			.filter((r) => r.width > 0 && r.height > 0);

		for (const cr of childRects) {
			const div = document.createElement("div");
			Object.assign(div.style, {
				position: "fixed",
				zIndex: Z_INDEX.overlay,
				pointerEvents: "none",
				top: `${cr.top}px`,
				left: `${cr.left}px`,
				width: `${cr.width}px`,
				height: `${cr.height}px`,
				outline: `1px dashed ${COLORS.flexChild}`,
				background: `${COLORS.flexChild}18`,
			});
			boxOverlays.push(div);
			document.body.appendChild(div);
		}

		const gapVal = parseFloat(cs.gap) || 0;
		if (gapVal > 0 && childRects.length > 1) {
			const isColumn = cs.flexDirection === "column" || cs.flexDirection === "column-reverse";
			const sorted = [...childRects].sort((a, b) => (isColumn ? a.top - b.top : a.left - b.left));
			for (let i = 0; i < sorted.length - 1; i++) {
				const a = sorted[i];
				const gapLabel = isColumn ? `↕${gapVal.toFixed(0)}` : `←→${gapVal.toFixed(0)}`;
				if (isColumn) {
					addStrip(document.body, a.bottom, rect.left + pl, rect.width - pl - pr, gapVal, COLORS.gap, gapLabel);
				} else {
					addStrip(document.body, rect.top + pt, a.right, gapVal, rect.height - pt - pb, COLORS.gap, gapLabel);
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
					const overlap = !(a.rect.right <= b.rect.left || b.rect.right <= a.rect.left || a.rect.bottom <= b.rect.top || b.rect.bottom <= a.rect.top);
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

function figmaSummary(el: Element, cs: CSSStyleDeclaration): SummaryResult {
	const segments: string[] = [];
	const styles: string[] = [];
	segments.push(elementId(el));
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
		if (cs.gap !== "normal") props.push({ label: `Gap: ${px(cs.gap)}`, color: "#c864ff" });
	}
	if (cs.position !== "static") props.push({ label: `Position: ${cs.position}` });
	const op = cs.opacity;
	if (op !== "1") props.push({ label: `Opacity: ${op}` });
	const bs = cs.boxShadow;
	if (bs !== "none") props.push({ label: `Shadow: ${bs}` });
	const ov = cs.overflow;
	if (ov !== "visible") props.push({ label: `Overflow: ${ov}` });
	if (el instanceof HTMLInputElement) {
		props.push({ label: `Input: type=${el.type} value=${el.value}`, color: "#ff88cc" });
		if (el.type === "range" || el.type === "number") {
			props.push({ label: `Range: ${el.min}..${el.max} step=${el.step}` });
		}
		if (el.type === "checkbox" || el.type === "radio") {
			props.push({ label: `Checked: ${el.checked}` });
		}
		if (el.placeholder) props.push({ label: `Placeholder: "${el.placeholder}"` });
		if (el.disabled) props.push({ label: `Disabled`, color: "#888" });
		if (el.name) props.push({ label: `Name: ${el.name}` });
	} else if (el instanceof HTMLSelectElement) {
		props.push({ label: `Select: value=${el.value} [${el.selectedIndex}]`, color: "#ff88cc" });
	} else if (el instanceof HTMLTextAreaElement) {
		props.push({ label: `Textarea: "${el.value.slice(0, 30)}"`, color: "#ff88cc" });
	}
	for (let i = 0; i < props.length; i++) {
		const isLast = i === props.length - 1;
		const prefix = isLast ? "└─ " : "├─ ";
		segments.push(`%c${prefix}${props[i].label}%c`);
		styles.push(props[i].color ? `color: ${props[i].color}` : "color: inherit", "color: inherit");
	}
	return { text: segments.join("\n"), styles };
}

function positionDepthLabel(el: Element): void {
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

function highlight(el: Element): void {
	if (!el || el === overlay) return;
	if (outlineOverlay) outlineOverlay.remove();
	currentDepth = depth(el);
	const color = depthColor(currentDepth);
	const elRect = el.getBoundingClientRect();
	outlineOverlay = document.createElement("div");
	Object.assign(outlineOverlay.style, {
		position: "fixed",
		top: `${elRect.top - 1}px`,
		left: `${elRect.left - 1}px`,
		width: `${elRect.width + 2}px`,
		height: `${elRect.height + 2}px`,
		outline: `2px solid ${color}`,
		pointerEvents: "none",
		zIndex: Z_INDEX.overlay,
	});
	document.body.appendChild(outlineOverlay);
	if (current && !el.contains(current)) navStack = [];
	current = el;
	if (!depthLabel) {
		depthLabel = document.createElement("div");
		Object.assign(depthLabel.style, {
			position: "fixed",
			zIndex: Z_INDEX.label,
			pointerEvents: "none",
			padding: "3px 8px",
			fontSize: "11px",
			fontWeight: "600",
			fontFamily: "monospace",
			whiteSpace: "pre",
			borderRadius: "3px",
			lineHeight: "1.4",
		});
		document.body.appendChild(depthLabel);
	}
	const rect = el.getBoundingClientRect();
	const idPath = elementId(el);
	depthLabel.textContent = `${idPath}  ${rect.width.toFixed(0)}×${rect.height.toFixed(0)}`;
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
		const idPath = elementId(el);
		const html = elementHtml(el);
		const treePrefix = `%c${idPath}%c\n%c${html}%c`;
		const treeStyles = [`color: ${depthColor(currentDepth)}`, "color: inherit", "color: #888", "color: inherit"];
		console.log(
			`%c[inspector] #${++logSeq}%c\n${treePrefix}\n%c${summary.text}`,
			`color: ${depthColor(currentDepth)}`,
			...treeStyles,
			...legend.styles,
			"color: inherit",
			...summary.styles,
		);
		logTimer = null;
	}, 400);
}

function captureStyles(): void {
	if (!current) return;
	const el = current;
	const cs = window.getComputedStyle(el);
	const styles = Object.fromEntries(RELEVANT.map((k) => [k, cs[k as keyof CSSStyleDeclaration]]));
	const html = el.outerHTML.replace(/\s*outline:\s*[^;"]+;?\s*/gi, "");

	const parent = el.parentElement;
	const parentInfo = parent ? { tag: parent.tagName.toLowerCase(), classes: Array.from(parent.classList) } : null;
	const siblings = parent ? Array.from(parent.children).filter((c) => c.tagName === el.tagName) : [];
	const siblingIndex = siblings.indexOf(el);

	let inputInfo: Record<string, unknown> | undefined;
	if (el instanceof HTMLInputElement) {
		inputInfo = { type: el.type, value: el.value, disabled: el.disabled };
		if (el.type === "range" || el.type === "number") {
			inputInfo.min = el.min;
			inputInfo.max = el.max;
			inputInfo.step = el.step;
		}
		if (el.type === "checkbox" || el.type === "radio") inputInfo.checked = el.checked;
		if (el.placeholder) inputInfo.placeholder = el.placeholder;
		if (el.name) inputInfo.name = el.name;
	} else if (el instanceof HTMLSelectElement) {
		inputInfo = { type: "select", value: el.value, selectedIndex: el.selectedIndex };
	} else if (el instanceof HTMLTextAreaElement) {
		inputInfo = { type: "textarea", value: el.value };
	}

	navigator.clipboard.writeText(
		JSON.stringify(
			{
				id: elementId(el),
				tag: el.tagName.toLowerCase(),
				classes: Array.from(el.classList),
				siblingIndex: siblings.length > 1 ? siblingIndex : undefined,
				parent: parentInfo,
				html: html.length > 1000 ? html.slice(0, 1000) + "…" : html,
				...(inputInfo ? { input: inputInfo } : {}),
				styles,
			},
			null,
			2,
		),
	);
	console.log("[inspector] copied", el);
	deactivate();
}

function deactivate(): void {
	if (outlineOverlay) {
		outlineOverlay.remove();
		outlineOverlay = null;
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
		const el = deepestElementAtPoint(e.clientX, e.clientY);
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
				highlight(current.children[0]);
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
