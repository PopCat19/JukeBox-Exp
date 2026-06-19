// Player UI
//
// Purpose: Constructs all DOM elements and injects CSS styles for the song player
//
// This module:
// - Injects global CSS styles for player controls
// - Creates and assembles all DOM elements (buttons, sliders, timeline, volume bar)
// - Provides localStorage helpers with cross-origin iframe safety

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../shared/color-config";
import { events } from "../shared/events";
import { spectrumCanvas } from "../shared/spectrum";
import { Synth } from "../synth";

const { a, button, div, h1, input, canvas } = HTML;
const { svg, circle, path } = SVG;

export const isMobile: boolean = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|android|ipad|playbook|silk/i.test(navigator.userAgent);

export function getLocalStorage(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch (_error) {
		// Ignore the error since we can't fix it.
		return null;
	}
}

export function setLocalStorage(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch (_error) {
		// Ignore the error since we can't fix it.
	}
}

export interface PlayerUI {
	synth: Synth;
	spectrum: spectrumCanvas;
	titleText: HTMLHeadingElement;
	editLink: HTMLAnchorElement;
	copyLink: HTMLAnchorElement;
	shareLink: HTMLAnchorElement;
	fullscreenLink: HTMLAnchorElement;
	playButton: HTMLButtonElement;
	loopIcon: SVGPathElement;
	loopButton: HTMLButtonElement;
	volumeSlider: HTMLInputElement;
	zoomIcon: SVGSVGElement;
	zoomButton: HTMLButtonElement;
	timeline: SVGSVGElement;
	playhead: HTMLDivElement;
	timelineContainer: HTMLDivElement;
	visualizationContainer: HTMLDivElement;
	outVolumeBar: SVGRectElement;
	outVolumeCap: SVGRectElement;
	sampleLoadingBar: HTMLDivElement;
	sampleLoadingBarContainer: HTMLDivElement;
}

export function injectPlayerStyles(): void {
	document.head.appendChild(
		HTML.style(
			{ type: "text/css" },
			`
	:root {
		/* Design Token System — spacing (rem-based) */
		--spacing-xs: 0.125rem;
		--spacing-sm: 0.25rem;
		--spacing-md: 0.5rem;
		--spacing-lg: 1rem;
		--spacing-xl: 1.5rem;
		--spacing-xxl: 2rem;

		/* Design Token System — gap (rem-based) */
		--gap-xs: 0.125rem;
		--gap-rem-sm: 0.25rem;
		--gap-rem-md: 0.5rem;
		--gap-rem-lg: 0.75rem;
		--gap-rem-xl: 1rem;

		/* Design Token System — padding (rem-based) */
		--padding-xs: 0.125rem;
		--padding-rem-sm: 0.25rem;
		--padding-rem-md: 0.5rem;
		--padding-rem-lg: 0.75rem;
		--padding-rem-xl: 1rem;

		/* Design Token System — border */
		--border-width-hairline: 1px;
		--border-width-default: 2px;
		--border-width-thick: 3px;
		--border-radius-rem-sm: 0.25rem;
		--border-radius-rem-md: 0.5rem;
		--border-radius-rem-lg: 1rem;
		--border-radius-full: 100px;

		/* Design Token System — typography */
		--font-family: 'B612', sans-serif;
		--font-family-mono: monospace;
		--font-size-xs: 0.625rem;
		--font-size-sm: 0.6875rem;
		--font-size-md: 0.8125rem;
		--font-size-lg: 0.875rem;
		--font-size-xl: 1.1875rem;
		--font-size-2xl: 1.25rem;
		--font-weight-normal: 400;
		--font-weight-medium: 500;
		--font-weight-bold: 700;
		--line-height-tight: 1.2;
		--line-height-normal: 1.5;
		--line-height-relaxed: 1.75;

		/* Design Token System — z-index */
		--z-base: 0;
		--z-below: -1;
		--z-above: 1;
		--z-dropdown: 10;
		--z-overlay: 20;
		--z-modal: 30;
		--z-toast: 40;

		/* Design Token System — animation */
		--anim-duration-fast: 80ms;
		--anim-duration-normal: 120ms;
		--anim-duration-slow: 170ms;
		--anim-duration-slower: 200ms;
		--anim-duration-slowest: 250ms;
		--anim-duration-modal: 500ms;
		--anim-easing-ease: ease;
		--anim-easing-ease-in: ease-in;
		--anim-easing-ease-out: ease-out;
		--anim-easing-linear: linear;

		/* Design Token System — sizing */
		--sizing-button: 26px;
		--sizing-widget-sm: 24px;
		--sizing-widget-md: 28px;
		--sizing-widget-lg: 32px;

		/* Design Token System — icons */
		--icon-sm: 16px;
		--icon-md: 20px;
		--icon-lg: 24px;

		/* Design Token System — opacity scale */
		--opacity-surface: 0.08;
		--opacity-dim: 0.24;
		--opacity-secondary: 0.48;
		--opacity-muted: 0.8;
		--opacity-full: 1;

		/* Design Token System — asymmetric border radius */
		--radius-left: 1rem 0.5rem 0.5rem 1rem;
		--radius-right: 0.5rem 1rem 1rem 0.5rem;

		/* Design Token System — shadows */
		--shadow-none: none;
		--shadow-subtle: 0 0 4px rgba(0,0,0,0.3);
		--shadow-modal: 0 0 20px rgba(0,0,0,0.5);

		/* Design Token System — backdrop */
		--backdrop-blur: blur(14px);
		--backdrop-blur-heavy: blur(24px);
		--backdrop-dim: brightness(0.9);
	}

	body {
		color: ${ColorConfig.primaryText};
		background: ${ColorConfig.editorBackground};
	}
	h1 {
		font-weight: bold;
		font-size: 14px;
		line-height: 22px;
		text-align: initial;
		margin: 0;
	}
	a {
		font-weight: bold;
		font-size: 12px;
		line-height: 22px;
		white-space: nowrap;
		color: ${ColorConfig.linkAccent};
	}
	button {
		margin: 0;
		padding: 0;
		position: relative;
		border: none;
		border-radius: 5px;
		background: ${ColorConfig.uiWidgetBackground};
		color: ${ColorConfig.primaryText};
		cursor: pointer;
		font-size: 14px;
		font-family: inherit;
	}
	button:hover, button:focus {
		background: ${ColorConfig.uiWidgetFocus};
	}
	.playButton, .pauseButton {
		padding-left: 24px;
		padding-right: 6px;
	}
	.playButton::before {
		content: "";
		position: absolute;
		left: 6px;
		top: 50%;
		margin-top: -6px;
		width: 12px;
		height: 12px;
		pointer-events: none;
		background: ${ColorConfig.primaryText};
		-webkit-mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="-6 -6 12 12"><path d="M 6 0 L -5 6 L -5 -6 z" fill="gray"/></svg>');
		-webkit-mask-repeat: no-repeat;
		-webkit-mask-position: center;
		mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="-6 -6 12 12"><path d="M 6 0 L -5 6 L -5 -6 z" fill="gray"/></svg>');
		mask-repeat: no-repeat;
		mask-position: center;
	}
	.pauseButton::before {
		content: "";
		position: absolute;
		left: 6px;
		top: 50%;
		margin-top: -6px;
		width: 12px;
		height: 12px;
		pointer-events: none;
		background: ${ColorConfig.primaryText};
		-webkit-mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="-6 -6 12 12"><rect x="-5" y="-6" width="3" height="12" fill="gray"/><rect x="2"  y="-6" width="3" height="12" fill="gray"/></svg>');
		-webkit-mask-repeat: no-repeat;
		-webkit-mask-position: center;
		mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="-6 -6 12 12"><rect x="-5" y="-6" width="3" height="12" fill="gray"/><rect x="2"  y="-6" width="3" height="12" fill="gray"/></svg>');
		mask-repeat: no-repeat;
		mask-position: center;
	}
	
	input[type=range] {
		-webkit-appearance: none;
		appearance: none;
		height: 16px;
		margin: 0;
		cursor: pointer;
		background-color: ${ColorConfig.editorBackground};
		touch-action: pan-y;
	}
	input[type=range]:focus {
		outline: none;
	}
	input[type=range]::-webkit-slider-runnable-track {
		width: 100%;
		height: 4px;
		cursor: pointer;
		background: ${ColorConfig.uiWidgetBackground};
	}
	input[type=range]::-webkit-slider-thumb {
		height: 16px;
		width: 4px;
		border-radius: 2px;
		background: ${ColorConfig.primaryText};
		cursor: pointer;
		-webkit-appearance: none;
		margin-top: -6px;
	}
	input[type=range]:focus::-webkit-slider-runnable-track, input[type=range]:hover::-webkit-slider-runnable-track {
		background: ${ColorConfig.uiWidgetFocus};
	}
	input[type=range]::-moz-range-track {
		width: 100%;
		height: 4px;
		cursor: pointer;
		background: ${ColorConfig.uiWidgetBackground};
	}
	input[type=range]:focus::-moz-range-track, input[type=range]:hover::-moz-range-track  {
		background: ${ColorConfig.uiWidgetFocus};
	}
	input[type=range]::-moz-range-thumb {
		height: 16px;
		width: 4px;
		border-radius: 2px;
		border: none;
		background: ${ColorConfig.primaryText};
		cursor: pointer;
	}
	input[type=range]::-ms-track {
		width: 100%;
		height: 4px;
		cursor: pointer;
		background: ${ColorConfig.uiWidgetBackground};
		border-color: transparent;
	}
	input[type=range]:focus::-ms-track, input[type=range]:hover::-ms-track {
		background: ${ColorConfig.uiWidgetFocus};
	}
	input[type=range]::-ms-thumb {
		height: 16px;
		width: 4px;
		border-radius: 2px;
		background: ${ColorConfig.primaryText};
		cursor: pointer;
	}
`,
		),
	);
}

export function buildPlayerUI(): PlayerUI {
	const colorTheme: string | null = getLocalStorage("colorTheme");
	ColorConfig.setTheme(colorTheme === null ? ColorConfig.defaultTheme : colorTheme);

	const synth: Synth = new Synth();
	synth.onSpectrumUpdate = (l, r) => events.raise("spectrumUpdate", l, r);
	const spectrum: spectrumCanvas = new spectrumCanvas(
		canvas({
			width: isMobile ? 144 : 288,
			height: isMobile ? 32 : 64,
			style: `border:2px solid ${ColorConfig.uiWidgetBackground}; overflow: hidden;`,
			id: "spectrumAll",
		}),
		isMobile ? 1 : 2,
	);
	const showSpectrum: boolean = getLocalStorage("showSpectrum") !== "false";
	if (!showSpectrum) {
		spectrum.canvas.style.display = "none";
		synth.spectrumEnabled = false;
	}
	const titleText: HTMLHeadingElement = h1(
		{
			style: "flex-grow: 1; margin: 0 1px; margin-left: 10px; overflow: hidden;",
		},
		"",
	);
	const editLink: HTMLAnchorElement = a({ target: "_top", style: "margin: 0 4px;" }, "✎ Edit");
	const copyLink: HTMLAnchorElement = a({ href: "#", style: "margin: 0 4px;" }, "⎘ Copy URL");
	const shareLink: HTMLAnchorElement = a({ href: "#", style: "margin: 0 4px;" }, "⤳ Share");
	const fullscreenLink: HTMLAnchorElement = a({ target: "_top", style: "margin: 0 4px;" }, "⇱ Fullscreen");

	const playButton: HTMLButtonElement = button({ style: "width: 100%; height: 100%; max-height: 50px;" });
	const playButtonContainer: HTMLDivElement = div(
		{
			style: "flex-shrink: 0; display: flex; padding: 2px; width: 80px; height: 100%; box-sizing: border-box; align-items: center;",
		},
		playButton,
	);
	const loopIcon: SVGPathElement = path({
		d: "M 4 2 L 4 0 L 7 3 L 4 6 L 4 4 Q 2 4 2 6 Q 2 8 4 8 L 4 10 Q 0 10 0 6 Q 0 2 4 2 M 8 10 L 8 12 L 5 9 L 8 6 L 8 8 Q 10 8 10 6 Q 10 4 8 4 L 8 2 Q 12 2 12 6 Q 12 10 8 10 z",
	});
	const loopButton: HTMLButtonElement = button(
		{
			title: "loop",
			style: "background: none; flex: 0 0 12px; margin: 0 3px; width: 12px; height: 12px; display: flex;",
		},
		svg({ width: 12, height: 12, viewBox: "0 0 12 12" }, loopIcon),
	);

	const volumeIcon: SVGSVGElement = svg(
		{ style: "flex: 0 0 12px; margin: 0 1px; width: 12px; height: 12px;", viewBox: "0 0 12 12" },
		path({
			fill: ColorConfig.uiWidgetBackground,
			d: "M 1 9 L 1 3 L 4 3 L 7 0 L 7 12 L 4 9 L 1 9 M 9 3 Q 12 6 9 9 L 8 8 Q 10.5 6 8 4 L 9 3 z",
		}),
	);
	const volumeSlider: HTMLInputElement = input({
		title: "volume",
		type: "range",
		value: 75,
		min: 0,
		max: 75,
		step: 1,
		style: "width: 12vw; max-width: 100px; margin: 0 1px;",
	});

	const zoomIcon: SVGSVGElement = svg(
		{ width: 12, height: 12, viewBox: "0 0 12 12" },
		circle({ cx: "5", cy: "5", r: "4.5", "stroke-width": "1", stroke: "currentColor", fill: "none" }),
		path({ stroke: "currentColor", "stroke-width": "2", d: "M 8 8 L 11 11 M 5 2 L 5 8 M 2 5 L 8 5", fill: "none" }),
	);
	const zoomButton: HTMLButtonElement = button(
		{
			title: "zoom",
			style: "background: none; flex: 0 0 12px; margin: 0 3px; width: 12px; height: 12px; display: flex;",
		},
		zoomIcon,
	);

	const timeline: SVGSVGElement = svg({ style: "min-width: 0; min-height: 0; touch-action: pan-y pinch-zoom;" });
	const playhead: HTMLDivElement = div({
		style: `position: absolute; left: 0; top: 0; width: 2px; height: 100%; background: ${ColorConfig.playhead}; pointer-events: none;`,
	});
	const timelineContainer: HTMLDivElement = div({ style: "display: flex; flex-grow: 1; flex-shrink: 1; position: relative;" }, timeline, playhead);
	const visualizationContainer: HTMLDivElement = div(
		{
			style: "display: flex; flex-grow: 1; flex-shrink: 1; height: 0; position: relative; align-items: center; overflow: hidden;",
		},
		timelineContainer,
	);

	const outVolumeBarBg: SVGRectElement = SVG.rect({
		"pointer-events": "none",
		width: "90%",
		height: "50%",
		x: "5%",
		y: "25%",
		fill: ColorConfig.uiWidgetBackground,
	});
	const outVolumeBar: SVGRectElement = SVG.rect({
		"pointer-events": "none",
		height: "50%",
		width: "0%",
		x: "5%",
		y: "25%",
		fill: "url('#volumeGrad2')",
	});
	const outVolumeCap: SVGRectElement = SVG.rect({
		"pointer-events": "none",
		width: "2px",
		height: "50%",
		x: "5%",
		y: "25%",
		fill: ColorConfig.uiWidgetFocus,
	});
	const stop1: SVGStopElement = SVG.stop({ "stop-color": "lime", offset: "60%" });
	const stop2: SVGStopElement = SVG.stop({ "stop-color": "orange", offset: "90%" });
	const stop3: SVGStopElement = SVG.stop({ "stop-color": "red", offset: "100%" });
	const gradient: SVGGradientElement = SVG.linearGradient({ id: "volumeGrad2", gradientUnits: "userSpaceOnUse" }, stop1, stop2, stop3);
	const defs: SVGDefsElement = SVG.defs({}, gradient);
	const volumeBarContainer: SVGSVGElement = SVG.svg(
		{
			style: `touch-action: none; overflow: hidden; margin: auto;`,
			width: "160px",
			height: "10px",
			preserveAspectRatio: "none",
		},
		defs,
		outVolumeBarBg,
		outVolumeBar,
		outVolumeCap,
	);
	const sampleLoadingBar: HTMLDivElement = div({
		style: `width: 0%; height: 100%; background-color: ${ColorConfig.indicatorPrimary};`,
	});
	const sampleLoadingBarContainer: HTMLDivElement = div(
		{
			class: `sampleLoadingContainer`,
			style: `overflow: hidden; margin: auto; width: 90%; height: 50%; background-color: var(--empty-sample-bar, ${ColorConfig.indicatorSecondary});`,
			preserveAspectRatio: "none",
		},
		sampleLoadingBar,
	);
	const sampleLoadingStatusContainer: HTMLDivElement = div(
		{},
		div({ class: "selectRow", style: "overflow: hidden; margin: auto; width: 160px; height: 10px; " }, sampleLoadingBarContainer),
	);
	const volumeBarContainerDiv: HTMLDivElement = div(
		{
			class: `volBarContainer`,
			style: "display:flex; flex-direction:column; touch-action: none; overflow: hidden; margin: auto",
		},
		volumeBarContainer,
		sampleLoadingStatusContainer,
	);
	document.body.appendChild(visualizationContainer);
	document.body.appendChild(
		div(
			{
				style: `flex-shrink: 0; height: 20vh; min-height: 22px; max-height: 70px; display: flex; align-items: center;`,
			},
			playButtonContainer,
			loopButton,
			volumeIcon,
			volumeSlider,
			zoomButton,
			volumeBarContainerDiv,
			spectrum.canvas, // make it auto remove itself later
			titleText,
			editLink,
			copyLink,
			shareLink,
			fullscreenLink,
		),
	);

	return {
		synth,
		spectrum,
		titleText,
		editLink,
		copyLink,
		shareLink,
		fullscreenLink,
		playButton,
		loopIcon,
		loopButton,
		volumeSlider,
		zoomIcon,
		zoomButton,
		timeline,
		playhead,
		timelineContainer,
		visualizationContainer,
		outVolumeBar,
		outVolumeCap,
		sampleLoadingBar,
		sampleLoadingBarContainer,
	};
}
