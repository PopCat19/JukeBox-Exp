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
import { buildDesignTokensCSS } from "../shared/styles/design-tokens";
import { Synth } from "../synth";

const { a, button, div, h1, input, canvas } = HTML;
const { svg, circle, path } = SVG;

export const isMobile: boolean =
	/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|android|ipad|playbook|silk/i.test(
		navigator.userAgent,
	);

export function getLocalStorage(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch (_error) {
		return null;
	}
}

export function setLocalStorage(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch (_error) {
		/* localStorage may be unavailable (private browsing, etc.) */
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
		${buildDesignTokensCSS("'B612', sans-serif", "monospace")}
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
		-webkit-mask-image: url("data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22currentColor%22 > <path stroke=%22none%22 d=%22M0 0h24v24H0z%22 fill=%22none%22 /> <path d=%22M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z%22 /> </svg>");
		-webkit-mask-repeat: no-repeat;
		-webkit-mask-position: center;
		-webkit-mask-size: 12px 12px;
		mask-image: url("data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22currentColor%22 > <path stroke=%22none%22 d=%22M0 0h24v24H0z%22 fill=%22none%22 /> <path d=%22M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z%22 /> </svg>");
		mask-repeat: no-repeat;
		mask-position: center;
		mask-size: 12px 12px;
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
		-webkit-mask-image: url("data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22currentColor%22 > <path stroke=%22none%22 d=%22M0 0h24v24H0z%22 fill=%22none%22 /> <path d=%22M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z%22 /> <path d=%22M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z%22 /> </svg>");
		-webkit-mask-repeat: no-repeat;
		-webkit-mask-position: center;
		-webkit-mask-size: 12px 12px;
		mask-image: url("data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22currentColor%22 > <path stroke=%22none%22 d=%22M0 0h24v24H0z%22 fill=%22none%22 /> <path d=%22M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z%22 /> <path d=%22M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z%22 /> </svg>");
		mask-repeat: no-repeat;
		mask-position: center;
		mask-size: 12px 12px;
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
	const editLink: HTMLAnchorElement = a({ target: "_top", style: "margin: 0 4px;" }, "Edit");
	const copyLink: HTMLAnchorElement = a({ href: "#", style: "margin: 0 4px;" }, "Copy URL");
	const shareLink: HTMLAnchorElement = a({ href: "#", style: "margin: 0 4px;" }, "Share");
	const fullscreenLink: HTMLAnchorElement = a(
		{ target: "_top", style: "margin: 0 4px;" },
		"Fullscreen",
	);

	const playButton: HTMLButtonElement = button({
		style: "width: 100%; height: 100%; max-height: 50px;",
	});
	const playButtonContainer: HTMLDivElement = div(
		{
			style: "flex-shrink: 0; display: flex; padding: 2px; width: 80px; height: 100%; box-sizing: border-box; align-items: center;",
		},
		playButton,
	);
	const loopIcon: SVGPathElement = path({
		d: "M4 12v-3a3 3 0 0 1 3 -3h13m-3 -3l3 3l-3 3 M20 12v3a3 3 0 0 1 -3 3h-13m3 3l-3 -3l3 -3",
		"stroke": "currentColor",
		"stroke-width": "2",
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		fill: "none",
	});
	const loopButton: HTMLButtonElement = button(
		{
			title: "loop",
			style: "background: none; flex: 0 0 12px; margin: 0 3px; width: 12px; height: 12px; display: flex;",
		},
		svg({ width: 12, height: 12, viewBox: "0 0 24 24" }, loopIcon),
	);

	const volumeIcon: SVGSVGElement = svg(
		{
			style: "flex: 0 0 12px; margin: 0 1px; width: 12px; height: 12px;",
			viewBox: "0 0 24 24",
		},
		path({
			d: "M15 8a5 5 0 0 1 0 8 M17.7 5a9 9 0 0 1 0 14 M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5",
			"stroke": "currentColor",
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			fill: "none",
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
		{ width: 12, height: 12, viewBox: "0 0 24 24" },
		circle({
			cx: "10",
			cy: "10",
			r: "7",
			"stroke-width": "2",
			stroke: "currentColor",
			fill: "none",
		}),
		path({
			stroke: "currentColor",
			"stroke-width": "2",
			"stroke-linecap": "round",
			d: "M 15 15 L 21 21 M 7 10 L 13 10 M 10 7 L 10 13",
			fill: "none",
		}),
	);
	const zoomButton: HTMLButtonElement = button(
		{
			title: "zoom",
			style: "background: none; flex: 0 0 12px; margin: 0 3px; width: 12px; height: 12px; display: flex;",
		},
		zoomIcon,
	);

	const timeline: SVGSVGElement = svg({
		style: "min-width: 0; min-height: 0; touch-action: pan-y pinch-zoom;",
	});
	const playhead: HTMLDivElement = div({
		style: `position: absolute; left: 0; top: 0; width: 2px; height: 100%; background: ${ColorConfig.playhead}; pointer-events: none;`,
	});
	const timelineContainer: HTMLDivElement = div(
		{ style: "display: flex; flex-grow: 1; flex-shrink: 1; position: relative;" },
		timeline,
		playhead,
	);
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
	const gradient: SVGGradientElement = SVG.linearGradient(
		{ id: "volumeGrad2", gradientUnits: "userSpaceOnUse" },
		stop1,
		stop2,
		stop3,
	);
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
		div(
			{
				class: "selectRow",
				style: "overflow: hidden; margin: auto; width: 160px; height: 10px; ",
			},
			sampleLoadingBarContainer,
		),
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
