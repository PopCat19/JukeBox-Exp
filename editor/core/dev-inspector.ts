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
	"flexWrap",
	"flex",
	"flexShrink",
	"flexGrow",
	"flexBasis",
	"alignSelf",
	"alignItems",
	"justifyContent",
	"justifySelf",
	"gap",
	"gridColumn",
	"gridRow",
	"gridArea",
	"position",
	"top",
	"right",
	"bottom",
	"left",
	"zIndex",
	"opacity",
	"transform",
	"transformOrigin",
	"visibility",
	"pointerEvents",
	"cursor",
	"scrollbarWidth",
	"textAlign",
	"whiteSpace",
	"textOverflow",
	"textShadow",
	"outline",
	"outlineWidth",
	"outlineStyle",
	"outlineColor",
	"boxShadow",
	"overflow",
	"overflowX",
	"overflowY",
	"transition",
	"animation",
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
					if (
						!best ||
						(isContainer && !bestIsContainer) ||
						(isContainer === bestIsContainer && area < bestArea)
					) {
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
				if (
					!(filtered[j] instanceof SVGElement) &&
					filtered[j] !== document.body &&
					filtered[j] !== document.documentElement
				) {
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
		.map((v) => parseInt(v, 10).toString(16).padStart(2, "0"))
		.join("");
	return `#${hex}`;
}

function elementId(el: Element): string {
	const classList = Array.from(el.classList);
	const semanticClasses = classList.filter((c) => {
		if (/^hsl\(|^\d+$/.test(c)) return false;
		if (["no-underline", "active", "selected", "last-button", "midTick"].includes(c))
			return false;
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

interface ComponentSpec {
	pattern: RegExp;
	name: string;
	file?: string;
	grep?: string;
	confidence: number; // 0-10: 10 = certain (data attr), 5 = class match, 3 = structural fingerprint
}

/** Known class patterns mapped to component specs with source file hints */
const COMPONENT_GUESSES: ComponentSpec[] = [
	// Widgets
	{
		pattern: /\bslider-num-input\b/,
		name: "SliderNumWidget",
		file: "editor/ui/sliders/slider-num-widget.ts",
		confidence: 7,
	},
	{
		pattern: /\bdata-dev-component=.*SliderNumWidget\b/,
		name: "SliderNumWidget",
		file: "editor/ui/sliders/slider-num-widget.ts",
		confidence: 10,
	},
	{
		pattern: /\bdata-dev-component=.*(Slider|DeltaSlider)\b/,
		name: "Slider",
		file: "editor/ui/sliders/slider.ts",
		confidence: 10,
	},
	// Playback area (song-editor.ts ~line 2170)
	{
		pattern: /\bplayback-volume-controls\b/,
		name: "PlaybackVolumeControls",
		file: "editor/song-editor.ts",
		grep: "playback-volume-controls",
		confidence: 7,
	},
	{
		pattern: /\bplayback-bar-controls\b/,
		name: "PlaybackBarControls",
		file: "editor/song-editor.ts",
		grep: "playback-bar-controls",
		confidence: 7,
	},
	{
		pattern: /\bplay-pause-area\b/,
		name: "PlayPauseArea",
		file: "editor/song-editor.ts",
		grep: "class.*play-pause",
		confidence: 7,
	},
	{
		pattern: /\bvolume-speaker\b/,
		name: "VolumeSpeaker",
		file: "editor/song-editor.ts",
		grep: "volume-speaker",
		confidence: 7,
	},
	{
		pattern: /\bplayback-volume-bar\b/,
		name: "PlaybackVolumeBar",
		file: "editor/components/playback-controls.ts",
		grep: "playback-volume-bar",
		confidence: 7,
	},
	// Settings area (song-editor.ts ~line 2170)
	{
		pattern: /\bsettings-area\b/,
		name: "SettingsArea",
		file: "editor/song-editor.ts",
		grep: "class.*settings-area",
		confidence: 7,
	},
	{
		pattern: /\bversion-area\b/,
		name: "VersionArea",
		file: "editor/song-editor.ts",
		grep: "class.*version-area",
		confidence: 7,
	},
	{
		pattern: /\bsong-settings-area\b/,
		name: "SongSettingsArea",
		file: "editor/song-editor.ts",
		grep: "class.*song-settings-area",
		confidence: 7,
	},
	{
		pattern: /\binstrument-settings-area\b/,
		name: "InstrumentSettingsArea",
		file: "editor/song-editor.ts",
		grep: "class.*instrument-settings-area",
		confidence: 7,
	},
	{
		pattern: /\beditor-controls\b/,
		name: "EditorControls",
		file: "editor/song-editor.ts",
		grep: "class.*editor-controls",
		confidence: 7,
	},
	{
		pattern: /\beditor-song-settings\b/,
		name: "EditorSongSettings",
		file: "editor/song-editor.ts",
		grep: "class.*editor-song-settings",
		confidence: 7,
	},
	{
		pattern: /\bselectRow\b/,
		name: "SelectRow",
		file: "editor/song-editor.ts",
		grep: "class.*selectRow",
		confidence: 6,
	},
	{
		pattern: /\bselectContainer\b/,
		name: "SelectContainer",
		file: "editor/song-editor.ts",
		grep: "class.*selectContainer",
		confidence: 6,
	},
	// Track/pattern editors
	{
		pattern: /\btrackContainer\b/,
		name: "TrackContainer",
		file: "editor/song-editor.ts",
		grep: "trackContainer",
		confidence: 7,
	},
	{
		pattern: /\btrack-area\b/,
		name: "TrackArea",
		file: "editor/song-editor.ts",
		grep: "class.*track-area",
		confidence: 7,
	},
	{
		pattern: /\bpattern-area\b/,
		name: "PatternArea",
		file: "editor/song-editor.ts",
		grep: "class.*pattern-area",
		confidence: 7,
	},
	{
		pattern: /\btrackAndMuteContainer\b/,
		name: "TrackAndMuteContainer",
		file: "editor/song-editor.ts",
		grep: "trackAndMuteContainer",
		confidence: 7,
	},
	{
		pattern: /\bmute-editor\b/,
		name: "MuteEditor",
		file: "editor/components/mute-editor.ts",
		confidence: 7,
	},
	{
		pattern: /\bbarScrollBar\b/,
		name: "BarScrollBar",
		file: "editor/components/bar-scroll-bar.ts",
		confidence: 7,
	},
	{
		pattern: /\bchannelRow\b/,
		name: "ChannelRow",
		file: "editor/components/channel-row.ts",
		confidence: 7,
	},
	{
		pattern: /\bpiano-button\b/,
		name: "PianoButton",
		file: "editor/components/piano.ts",
		confidence: 7,
	},
	{
		pattern: /\bdrum-button\b/,
		name: "DrumButton",
		file: "editor/core/drumset-setup.ts",
		confidence: 7,
	},
	{
		pattern: /\benvelope-row\b/,
		name: "EnvelopeRow",
		file: "editor/components/envelope-editor.ts",
		confidence: 7,
	},
	{
		pattern: /\bfadeInOut\b/,
		name: "FadeInOutEditor",
		file: "editor/components/fade-in-out-editor.ts",
		confidence: 7,
	},
	{
		pattern: /\bfilterEditor\b/,
		name: "FilterEditor",
		file: "editor/components/filter-editor.ts",
		confidence: 7,
	},
	{
		pattern: /\bloopEditor\b/,
		name: "LoopEditor",
		file: "editor/components/loop-editor.ts",
		confidence: 7,
	},
	// Menu
	{
		pattern: /\bmenu-area\b/,
		name: "MenuArea",
		file: "editor/song-editor.ts",
		grep: "class.*menu-area",
		confidence: 7,
	},
	{
		pattern: /\binstrument-bar\b/,
		name: "InstrumentBar",
		file: "editor/song-editor.ts",
		grep: "class.*instrument-bar",
		confidence: 7,
	},
	// Prompts
	{
		pattern: /\bprompt\b/,
		name: "Prompt overlay",
		file: "editor/prompts/",
		grep: "class.*prompt",
		confidence: 5,
	},
	{
		pattern: /\bpromptContainer\b/,
		name: "PromptContainer",
		file: "editor/song-editor.ts",
		grep: "promptContainer",
		confidence: 7,
	},
	{
		pattern: /\bprompt-dock-slot\b/,
		name: "PromptDockSlot",
		file: "editor/core/prompt-manager.ts",
		grep: "prompt-dock",
		confidence: 7,
	},
	{
		pattern: /\bprompt-dock-slot-divider\b/,
		name: "PromptDockSlotDivider",
		file: "editor/core/prompt-manager.ts",
		grep: "prompt-dock",
		confidence: 7,
	},
	// Buttons
	{
		pattern: /\bpresetButton\b/,
		name: "PresetButton",
		file: "editor/song-editor.ts",
		grep: "presetButton",
		confidence: 7,
	},
	{
		pattern: /\bpresetSelect\b/,
		name: "PresetSelect",
		file: "editor/song-editor.ts",
		grep: "presetSelect",
		confidence: 7,
	},
	{
		pattern: /\bcopyButton\b/,
		name: "InstrumentCopyButton",
		file: "editor/song-editor.ts",
		grep: "copyButton",
		confidence: 7,
	},
	{
		pattern: /\bpasteButton\b/,
		name: "InstrumentPasteButton",
		file: "editor/song-editor.ts",
		grep: "pasteButton",
		confidence: 7,
	},
	{
		pattern: /\bexportInstrumentButton\b/,
		name: "InstrumentExportButton",
		file: "editor/song-editor.ts",
		grep: "exportInstrumentButton",
		confidence: 7,
	},
	{
		pattern: /\bimportInstrumentButton\b/,
		name: "InstrumentImportButton",
		file: "editor/song-editor.ts",
		grep: "importInstrumentButton",
		confidence: 7,
	},
	{
		pattern: /\bplayButton\b/,
		name: "PlayButton",
		file: "editor/components/playback-controls.ts",
		grep: "PlayButton",
		confidence: 7,
	},
	{
		pattern: /\bpauseButton\b/,
		name: "PauseButton",
		file: "editor/components/playback-controls.ts",
		grep: "PauseButton",
		confidence: 7,
	},
	{
		pattern: /\brecordButton\b/,
		name: "RecordButton",
		file: "editor/components/playback-controls.ts",
		grep: "RecordButton",
		confidence: 7,
	},
	{
		pattern: /\bstopButton\b/,
		name: "StopButton",
		file: "editor/components/playback-controls.ts",
		grep: "StopButton",
		confidence: 7,
	},
	{
		pattern: /\badd-envelope\b/,
		name: "AddEnvelopeButton",
		file: "editor/song-editor.ts",
		grep: "add-envelope",
		confidence: 7,
	},
	// Dropdowns
	{
		pattern: /\bdropFader\b/,
		name: "DropFader",
		file: "editor/song-editor.ts",
		grep: "dropFader",
		confidence: 7,
	},
	{
		pattern: /\bdropdown-open\b/,
		name: "DropdownOpen",
		file: "editor/core/menu-handler.ts",
		grep: "dropdown-open",
		confidence: 7,
	},
	// Modulators
	{
		pattern: /\bmodSlider\b/,
		name: "ModSlider",
		file: "editor/core/mod-slider-registry.ts",
		grep: "modSlider",
		confidence: 7,
	},
	{
		pattern: /\bslider-mod-indicator\b/,
		name: "SliderModIndicator",
		file: "editor/ui/sliders/slider.ts",
		grep: "slider-mod-indicator",
		confidence: 7,
	},
	// FM operators
	{
		pattern: /\boperatorRow\b/,
		name: "OperatorRow",
		file: "editor/core/fm-operator-setup.ts",
		grep: "operatorRow",
		confidence: 7,
	},
	// Preset browser
	{
		pattern: /\bcategoryListPane\b/,
		name: "CategoryListPane",
		file: "editor/prompts/preset-browser-prompt.ts",
		grep: "categoryListPane",
		confidence: 7,
	},
	{
		pattern: /\bpresetListPane\b/,
		name: "PresetListPane",
		file: "editor/prompts/preset-browser-prompt.ts",
		grep: "presetListPane",
		confidence: 7,
	},
	{
		pattern: /\btagGridContainer\b/,
		name: "TagGridContainer",
		file: "editor/prompts/preset-browser-prompt.ts",
		grep: "tagGridContainer",
		confidence: 7,
	},
	// Player
	{
		pattern: /\bvolBarContainer\b/,
		name: "VolumeBar",
		file: "player/player-ui.ts",
		grep: "volBarContainer",
		confidence: 7,
	},
	{
		pattern: /\bbeepboxEditor\b/,
		name: "BeepboxEditor",
		file: "editor/song-editor.ts",
		grep: "beepboxEditor",
		confidence: 7,
	},
	// Generics
	{
		pattern: /\btoggle-switch\b/,
		name: "ToggleSwitch",
		file: "editor/ui/",
		grep: "toggle-switch",
		confidence: 6,
	},
	{
		pattern: /\bcolor-swatch\b/,
		name: "ColorSwatch",
		file: "editor/prompts/",
		grep: "color-swatch",
		confidence: 6,
	},
	{
		pattern: /\bbeat-selector\b/,
		name: "BeatSelector",
		file: "editor/components/",
		grep: "beat-selector",
		confidence: 6,
	},
	{
		pattern: /\btip\b/,
		name: "TipLabel",
		file: "editor/",
		grep: "tipSpan.*onclick",
		confidence: 5,
	},
	{
		pattern: /\bpitchShiftMarker\b/,
		name: "PitchShiftMarker",
		file: "editor/song-editor.ts",
		grep: "pitchShiftMarker",
		confidence: 7,
	},
	{
		pattern: /\btabButton\b/,
		name: "TabButton",
		file: "editor/",
		grep: "tabButton",
		confidence: 6,
	},
];

interface ComponentInfo {
	name: string;
	file?: string;
	grep?: string;
	confidence: number;
}

function componentGuess(el: Element): ComponentInfo | null {
	// 1. Check data-dev-component (highest confidence)
	const devComp =
		el.getAttribute("data-dev-component") ||
		el.closest("[data-dev-component]")?.getAttribute("data-dev-component");
	if (devComp) {
		const info: ComponentInfo = {
			name: devComp,
			file: "editor/ui/sliders/slider.ts",
			grep: "new " + devComp,
			confidence: 10,
		};
		return info;
	}

	// 2. Class pattern match
	const cls = Array.from(el.classList).join(" ");
	for (const spec of COMPONENT_GUESSES) {
		if (spec.pattern.test(cls)) {
			const info: ComponentInfo = { name: spec.name, confidence: spec.confidence };
			if (spec.file) info.file = spec.file;
			if (spec.grep) info.grep = spec.grep;
			return info;
		}
	}

	// 3. Structural fingerprint: SliderNumWidget pattern
	if (el.classList.contains("slider-num-input")) {
		const parentRow = el.closest(".selectRow");
		if (parentRow) {
			return {
				name: "SliderNumWidget",
				file: "editor/ui/sliders/slider-num-widget.ts",
				grep: "new SliderNumWidget",
				confidence: 8,
			};
		}
	}

	// 4. Structural fingerprint: hidden range input inside slider container
	if (el instanceof HTMLInputElement && el.type === "range" && el.style.display === "none") {
		const container = el.parentElement;
		if (container && container.querySelector(".slider-mod-indicator")) {
			return {
				name: "Slider",
				file: "editor/ui/sliders/slider.ts",
				grep: "new Slider",
				confidence: 8,
			};
		}
	}

	return null;
}

function domPath(el: Element): string {
	const parts: string[] = [];
	let c: Element | null = el;
	while (c) {
		const root = c.getRootNode ? c.getRootNode() : document;
		if (c === document.body || c === document.documentElement) break;
		if (root instanceof ShadowRoot) {
			parts.unshift("> shadow");
			parts.unshift(domPath(root.host));
			break;
		}
		const tag = c.tagName.toLowerCase();
		const id = c.getAttribute("id");
		if (id && id.length > 1 && !/^hsl\(/.test(id)) {
			parts.unshift(`#${CSS.escape(id)}`);
			break;
		}
		const cls = Array.from(c.classList)
			.filter((x) => x.length > 2 && !/^hsl\(|^[\d.]+$/.test(x))
			.slice(0, 2)
			.map((x) => CSS.escape(x))
			.join(".");
		parts.unshift(cls ? `${tag}.${cls}` : tag);
		c = c.parentElement;
	}
	return parts.join(" > ");
}

function elementHtml(el: Element, maxLen = 120): string {
	const clone = el.cloneNode(true) as HTMLElement;
	const inline = clone.getAttribute("style");
	if (inline) clone.setAttribute("style", inline.replace(/\s*outline:\s*[^;]+;?\s*/gi, ""));
	const html = clone.outerHTML;
	return html.length > maxLen ? `${html.slice(0, maxLen)}…` : html;
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
			textShadow:
				"-1px -1px 0 rgba(0,0,0,0.9), 1px -1px 0 rgba(0,0,0,0.9), -1px 1px 0 rgba(0,0,0,0.9), 1px 1px 0 rgba(0,0,0,0.9)",
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

	if (mt)
		addStrip(
			document.body,
			rect.top - mt,
			rect.left - ml,
			rect.width + ml + mr,
			mt,
			COLORS.margin,
			`↑${mt.toFixed(0)}`,
		);
	if (mb)
		addStrip(
			document.body,
			rect.bottom,
			rect.left - ml,
			rect.width + ml + mr,
			mb,
			COLORS.margin,
			`↓${mb.toFixed(0)}`,
		);
	if (ml)
		addStrip(
			document.body,
			rect.top - mt,
			rect.left - ml,
			ml,
			rect.height + mt + mb,
			COLORS.margin,
			`←${ml.toFixed(0)}`,
		);
	if (mr)
		addStrip(
			document.body,
			rect.top - mt,
			rect.right,
			mr,
			rect.height + mt + mb,
			COLORS.margin,
			`→${mr.toFixed(0)}`,
		);

	if (pt || pr || pb || pl) {
		if (pt)
			addStrip(
				document.body,
				rect.top,
				rect.left,
				rect.width,
				pt,
				COLORS.padding,
				`↑${pt.toFixed(0)}`,
			);
		if (pb)
			addStrip(
				document.body,
				rect.bottom - pb,
				rect.left,
				rect.width,
				pb,
				COLORS.padding,
				`↓${pb.toFixed(0)}`,
			);
		if (pl)
			addStrip(
				document.body,
				rect.top,
				rect.left,
				pl,
				rect.height,
				COLORS.padding,
				`←${pl.toFixed(0)}`,
			);
		if (pr)
			addStrip(
				document.body,
				rect.top,
				rect.right - pr,
				pr,
				rect.height,
				COLORS.padding,
				`→${pr.toFixed(0)}`,
			);
	}

	const brtl = parseFloat(cs.borderTopLeftRadius) || 0;
	const brtr = parseFloat(cs.borderTopRightRadius) || 0;
	const brbr = parseFloat(cs.borderBottomRightRadius) || 0;
	const brbl = parseFloat(cs.borderBottomLeftRadius) || 0;
	const radiusVals = [brtl, brtr, brbr, brbl].map((v) => Math.round(v));
	const allSameRadius = radiusVals.every((v) => v === radiusVals[0]);
	if (allSameRadius && brtl) {
		addStrip(
			document.body,
			rect.top,
			rect.left,
			RADIUS_OVERLAY,
			RADIUS_OVERLAY,
			COLORS.radius,
			`○${brtl.toFixed(0)}`,
		);
	} else {
		const counts = new Map<number, number>();
		for (const v of radiusVals) counts.set(v, (counts.get(v) || 0) + 1);
		const common =
			radiusVals.length > 0 ? [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] : 0;
		if (brtl !== common)
			addStrip(
				document.body,
				rect.top,
				rect.left,
				RADIUS_OVERLAY,
				RADIUS_OVERLAY,
				COLORS.radius,
				`↱${brtl.toFixed(0)}`,
			);
		if (brtr !== common)
			addStrip(
				document.body,
				rect.top,
				rect.right - RADIUS_OVERLAY,
				RADIUS_OVERLAY,
				RADIUS_OVERLAY,
				COLORS.radius,
				`↰${brtr.toFixed(0)}`,
			);
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
			addStrip(
				document.body,
				rect.bottom - RADIUS_OVERLAY,
				rect.left,
				RADIUS_OVERLAY,
				RADIUS_OVERLAY,
				COLORS.radius,
				`↳${brbl.toFixed(0)}`,
			);
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
		addStrip(
			document.body,
			rect.top,
			rect.left,
			rect.width,
			bt,
			COLORS.border,
			`b${bt.toFixed(0)}`,
			topOffset,
			align,
		);
	} else {
		const counts = new Map<number, number>();
		for (const v of borderVals) counts.set(v, (counts.get(v) || 0) + 1);
		const common =
			borderVals.length > 0 ? [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] : 0;
		if (bt !== common) {
			const topOffset = brtl > 0 ? LABEL_SIZE.height + 2 : 0;
			const align = brtl > 0 ? "left" : "center";
			addStrip(
				document.body,
				rect.top,
				rect.left,
				rect.width,
				bt,
				COLORS.border,
				`↑b${bt.toFixed(0)}`,
				topOffset,
				align,
			);
		}
		if (bb !== common)
			addStrip(
				document.body,
				rect.bottom - bb,
				rect.left,
				rect.width,
				bb,
				COLORS.border,
				`↓b${bb.toFixed(0)}`,
			);
		if (bl !== common)
			addStrip(
				document.body,
				rect.top,
				rect.left,
				bl,
				rect.height,
				COLORS.border,
				`←b${bl.toFixed(0)}`,
			);
		if (br !== common)
			addStrip(
				document.body,
				rect.top,
				rect.right - br,
				br,
				rect.height,
				COLORS.border,
				`→b${br.toFixed(0)}`,
			);
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
			const sorted = [...childRects].sort((a, b) =>
				isColumn ? a.top - b.top : a.left - b.left,
			);
			for (let i = 0; i < sorted.length - 1; i++) {
				const a = sorted[i];
				const gapLabel = isColumn ? `↕${gapVal.toFixed(0)}` : `←→${gapVal.toFixed(0)}`;
				if (isColumn) {
					addStrip(
						document.body,
						a.bottom,
						rect.left + pl,
						rect.width - pl - pr,
						gapVal,
						COLORS.gap,
						gapLabel,
					);
				} else {
					addStrip(
						document.body,
						rect.top + pt,
						a.right,
						gapVal,
						rect.height - pt - pb,
						COLORS.gap,
						gapLabel,
					);
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
	if (cs.display === "flex" || cs.display === "inline-flex")
		entries.push({ label: "flex children", color: "#6495ed" });
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

function cssVar(el: Element, name: string): string | undefined {
	const val = getComputedStyle(el).getPropertyValue(name).trim();
	if (!val || val === "") return undefined;
	return val;
}

function attrSummary(input: Record<string, string>): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(input)) if (v !== "") out[k] = v;
	return out;
}

function figmaSummary(el: Element, cs: CSSStyleDeclaration): SummaryResult {
	const segments: string[] = [];
	const styles: string[] = [];
	segments.push(elementId(el));
	const props: { label: string; color?: string }[] = [];
	const comp = componentGuess(el);
	if (comp) {
		let compLabel = comp.name;
		if (comp.file && comp.confidence >= 7) compLabel += ` (${comp.file})`;
		if (comp.grep && comp.confidence >= 8) compLabel += ` ~grep ${comp.grep}`;
		props.push({ label: `Component: ${compLabel}`, color: "#ff88cc" });
	}
	props.push({ label: `W: ${px(cs.width)}  H: ${px(cs.height)}` });
	const bg = cs.backgroundColor;
	if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)")
		props.push({ label: `Fill: ${hexColor(bg)}` });
	const border = cs.border;
	if (border && border !== "0px none rgb(0, 0, 0)")
		props.push({ label: `Stroke: ${border.replace(/rgb\([^)]+\)/g, hexColor)}` });
	const br = cs.borderRadius;
	if (br && br !== "0px") props.push({ label: `Radius: ${px(br)}` });
	const pad = `${px(cs.paddingTop)} ${px(cs.paddingRight)} ${px(cs.paddingBottom)} ${px(cs.paddingLeft)}`;
	if (pad !== "0 0 0 0") props.push({ label: `Padding: ${pad}`, color: "#00c800" });
	const marg = `${px(cs.marginTop)} ${px(cs.marginRight)} ${px(cs.marginBottom)} ${px(cs.marginLeft)}`;
	if (marg !== "0 0 0 0") props.push({ label: `Margin: ${marg}`, color: "#ffa500" });
	const fs = cs.fontSize;
	if (fs && fs !== "0px")
		props.push({
			label: `Font: ${cs.fontFamily.split(",")[0].replace(/"/g, "")}, ${px(fs)}, ${cs.fontWeight}`,
		});
	const lh = cs.lineHeight;
	if (lh !== "normal") props.push({ label: `Line height: ${px(lh)}` });
	const ls = cs.letterSpacing;
	if (ls !== "normal" && ls !== "0px") props.push({ label: `Letter spacing: ${px(ls)}` });
	const color = cs.color;
	if (color && color !== "rgb(0, 0, 0)") props.push({ label: `Text: ${hexColor(color)}` });
	if (cs.display === "flex") {
		props.push({
			label: `Auto: ${cs.flexDirection}, ${cs.alignItems}, ${cs.justifyContent}`,
			color: "#6495ed",
		});
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

	// Sibling info
	const parent = el.parentElement;
	if (parent) {
		const siblings = Array.from(parent.children).filter((c) => c !== el);
		const idx = Array.from(parent.children).indexOf(el);
		if (siblings.length > 0) {
			props.push({
				label: `Parent: ${parent.tagName.toLowerCase()}[${parent.children.length}] child #${idx}`,
				color: "#888",
			});
		}
	}

	// DOM path
	const path = domPath(el);
	if (path) props.push({ label: `Path: ${path}`, color: "#888" });

	// Key attributes
	const elAttrs = attrSummary(
		Object.fromEntries(
			Array.from(el.attributes)
				.filter(
					(a) =>
						/^(id|title|role|aria-|data-)/.test(a.name) &&
						a.name !== "style" &&
						a.name !== "class",
				)
				.map((a) => [a.name, a.value]),
		),
	);
	const attrKeys = Object.keys(elAttrs);
	if (attrKeys.length > 0) {
		const parts = attrKeys.map((k) => `${k}="${elAttrs[k]}"`).join(" ");
		props.push({ label: `Attrs: ${parts}`, color: "#ff88cc" });
	}

	// Semantic classes (full list, filtered)
	const allClasses = Array.from(el.classList).filter(
		(c) => c.length > 2 && !/^\d+$/.test(c) && !/^hsl\(/.test(c),
	);
	if (allClasses.length > 0) {
		props.push({ label: `Classes: ${allClasses.join(" ")}`, color: "#aaa" });
	}

	// CSS custom properties on this element
	const CUSTOM_PROPS = [
		"--cta-bg",
		"--primary-text",
		"--secondary-text",
		"--ui-widget-background",
		"--ui-widget-focus",
		"--slider-track",
		"--subtext",
		"--mod-color",
		"--mod-border-radius",
		"--mod-position",
		"--text-color-lit",
		"--text-color-dim",
		"--background-color-lit",
		"--background-color-dim",
		"--link-accent",
		"--editor-background",
		"--playhead",
		"--indicator-primary",
		"--indicator-secondary",
		"--empty-sample-bar",
	];
	const found = CUSTOM_PROPS.map((n) => [n, cssVar(el, n)] as const).filter(([, v]) => v != null);
	if (found.length > 0) {
		props.push({
			label: `CSS vars: ${found.map(([n]) => n.replace("--", "")).join(" ")}`,
			color: "#88ddaa",
		});
	}

	for (let i = 0; i < props.length; i++) {
		const isLast = i === props.length - 1;
		const prefix = isLast ? "└─ " : "├─ ";
		segments.push(`%c${prefix}${props[i].label}%c`);
		styles.push(
			props[i].color ? `color: ${props[i].color}` : "color: inherit",
			"color: inherit",
		);
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
		const treeStyles = [
			`color: ${depthColor(currentDepth)}`,
			"color: inherit",
			"color: #888",
			"color: inherit",
		];
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
	const parentInfo = parent
		? { tag: parent.tagName.toLowerCase(), classes: Array.from(parent.classList) }
		: null;
	const siblings = parent
		? Array.from(parent.children).filter((c) => c.tagName === el.tagName)
		: [];
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

	const comp = componentGuess(el);
	const path = domPath(el);
	const siblingsTotal = parent ? parent.children.length : 0;
	const compLabel = comp?.name;
	const compFile = comp?.file;
	const compGrep = comp?.grep;

	navigator.clipboard.writeText(
		JSON.stringify(
			{
				id: elementId(el),
				label: compLabel,
				componentFile: compFile,
				componentGrep: compGrep,
				domPath: path,
				tag: el.tagName.toLowerCase(),
				classes: Array.from(el.classList),
				siblingIndex: siblings.length > 1 ? siblingIndex : undefined,
				siblingTotal: siblingsTotal > 0 ? siblingsTotal : undefined,
				parent: parentInfo,
				html: html.length > 1000 ? `${html.slice(0, 1000)}…` : html,
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
	const editor = document.querySelector(".beepboxEditor");
	if (editor instanceof HTMLElement) editor.focus({ preventScroll: true });
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
	overlay.addEventListener(
		"wheel",
		(e) => {
			e.preventDefault();
		},
		{ passive: false },
	);
	overlay.addEventListener("click", (e) => {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		captureStyles();
	});
	document.body.appendChild(overlay);

	keyHandler = (e: KeyboardEvent) => {
		if (!["Enter", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
			return;
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		if (e.key === "Enter") captureStyles();
		else if (e.key === "Escape") deactivate();
		else if (
			e.key === "ArrowUp" &&
			current?.parentElement &&
			current.parentElement !== document.body
		) {
			navStack.push(current);
			highlight(current.parentElement);
		} else if (e.key === "ArrowDown") {
			if (current?.tagName.toLowerCase() === "select") {
				const sel = current as HTMLSelectElement;
				const opts = Array.from(sel.options)
					.map(
						(o, i) =>
							`${i === sel.selectedIndex ? "▸" : " "} [${i}] ${o.value} (${o.textContent})`,
					)
					.join("\n");
				console.log(
					`[inspector] #${++logSeq} <select> options (value="${sel.value}", selectedIndex=${sel.selectedIndex}):\n${opts}`,
				);
			} else if (navStack.length > 0) {
				highlight(navStack.pop()!);
			} else if (current?.children?.length) {
				highlight(current.children[0]);
			}
		} else if (current?.tagName.toLowerCase() === "select") {
			const sel = current as HTMLSelectElement;
			const delta = e.key === "ArrowRight" ? 1 : -1;
			sel.selectedIndex = Math.max(
				0,
				Math.min(sel.options.length - 1, sel.selectedIndex + delta),
			);
			const opts = Array.from(sel.options)
				.map(
					(o, i) =>
						`${i === sel.selectedIndex ? "▸" : " "} [${i}] ${o.value} (${o.textContent})`,
				)
				.join("\n");
			console.log(
				`[inspector] #${++logSeq} <select> options (value="${sel.value}", selectedIndex=${sel.selectedIndex}):\n${opts}`,
			);
		}
	};
	document.addEventListener("keydown", keyHandler, true);

	console.log("[inspector] frozen — hover element, Enter to copy, ↑↓ to traverse, Esc to cancel");
}

export function isActive(): boolean {
	return overlay !== null;
}
