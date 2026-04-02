// Euclidgen Renderer
//
// Purpose: Renders SVG visualizations for Euclidean rhythm preview
//
// This module:
// - Draws clock visualization showing rhythm pattern
// - Draws bar preview showing note placement
// - Manages sequence selector buttons
// - Renders pitch/bar labels

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ChannelColors, ColorConfig } from "../../shared/color-config";
import { Song } from "../../synth";
import { Config } from "../../synth/synth-config";
import { prettyNumber } from "../config/editor-config";
import { Sequence } from "./euclidgen-algorithm";

export interface EuclidgenRendererContext {
	song: Song;
	sequences: Sequence[];
	generatedSequences: number[][];
	sequenceIndex: number;
	barPreviewBarIndex: number;
	startBar: number;
	barAmount: number;
	renderedSequenceCount: number;
	highlightedSequenceIndex: number;
	clockWire: SVGCircleElement;
	clockPoints: SVGSVGElement;
	barPreviewBackground: SVGSVGElement;
	barPreviewSteps: SVGSVGElement;
	barPreviewLabel: HTMLDivElement;
	sequenceButtonContainer: HTMLDivElement;
	clockWidth: number;
	clockHeight: number;
	clockPointMinRadius: number;
	clockPointMaxRadius: number;
	barPreviewWidth: number;
	barPreviewHeight: number;
	maxSequences: number;
	sequenceButtons: HTMLButtonElement[];
	sequenceRemoveButton: HTMLButtonElement;
	sequenceAddButton: HTMLButtonElement;
}

export function renderClock(ctx: EuclidgenRendererContext): void {
	const sequence: Sequence = ctx.sequences[ctx.sequenceIndex];
	const steps: number = sequence.steps;
	const generatedSequence: number[] = ctx.generatedSequences[ctx.sequenceIndex];
	const on: number = sequence.invert ? 0 : 1;
	const color: string = ColorConfig.getChannelColor(ctx.song, ctx.sequences[ctx.sequenceIndex].channel).primaryNote;
	ctx.clockWire.setAttribute("stroke", color);
	const container: SVGSVGElement = ctx.clockPoints;
	while (container.firstChild) container.removeChild(container.firstChild);
	const centerX: number = ctx.clockWidth / 2,
		centerY: number = ctx.clockHeight / 2;
	const clockPointRadius: number = Math.max(ctx.clockPointMinRadius, Math.min(ctx.clockPointMaxRadius, ctx.clockWidth / steps));
	for (let step: number = 0; step < steps; step++) {
		const angle: number = (step / steps) * Math.PI * 2 - Math.PI / 2;
		const x: number = centerX + Math.cos(angle) * (ctx.clockWidth / 2 - ctx.clockPointMaxRadius - ctx.clockWidth / ctx.maxSequences),
			y: number = centerY + Math.sin(angle) * (ctx.clockWidth / 2 - ctx.clockPointMaxRadius - ctx.clockWidth / ctx.maxSequences);
		const clockPoint: SVGCircleElement = SVG.circle({
			cx: x,
			cy: y,
			r: clockPointRadius,
			style: `stroke: ${color}; stroke-width: 0.5; fill: ${generatedSequence.length > 0 && generatedSequence[step % steps] === on ? color : ColorConfig.editorBackground}`,
		});
		container.appendChild(clockPoint);
	}
}

export function renderBarPreview(ctx: EuclidgenRendererContext): void {
	const beatsPerBar: number = ctx.sequences[ctx.sequenceIndex].steps > 0 ? ctx.sequences[ctx.sequenceIndex].steps : 4;
	const partsPerBeat: number = Config.partsPerBeat;
	const partsPerBar: number = partsPerBeat * beatsPerBar;
	const sequence: Sequence = ctx.sequences[ctx.sequenceIndex];
	const steps: number = sequence.steps;
	const stepSize: number = sequence.stepSizeNumerator / sequence.stepSizeDenominator;
	const generatedSequence: number[] = ctx.generatedSequences[ctx.sequenceIndex];
	const on: number = sequence.invert ? 0 : 1;
	const channelColors: ChannelColors = ColorConfig.getChannelColor(ctx.song, sequence.channel);
	const partOffset: number = (ctx.barPreviewBarIndex - ctx.startBar) * partsPerBar;
	const container: SVGSVGElement = ctx.barPreviewSteps;
	while (container.firstChild) container.removeChild(container.firstChild);
	const toPushAtTheEnd: SVGElement[] = [];
	const beatWidth: number = ctx.barPreviewWidth / beatsPerBar,
		partWidth: number = beatWidth / partsPerBeat,
		padding: number = 0.2,
		y: number = padding,
		h: number = ctx.barPreviewHeight - padding * 2;
	const firstStep: number = Math.floor((beatsPerBar * (ctx.barPreviewBarIndex - ctx.startBar)) / stepSize);
	const lastStep: number = Math.ceil((beatsPerBar * (ctx.barPreviewBarIndex - ctx.startBar + 1)) / stepSize);
	for (let step: number = firstStep; step < lastStep; step++) {
		const rawStart: number = Math.floor(step * partsPerBeat * stepSize) - partOffset,
			rawEnd: number = Math.floor((step + 1) * partsPerBeat * stepSize) - partOffset;
		const stepStart: number = Math.max(0, Math.min(partsPerBar, rawStart)),
			stepEnd: number = Math.max(0, Math.min(partsPerBar, rawEnd));
		const x: number = padding + stepStart * partWidth,
			w: number = (stepEnd - stepStart) * partWidth - padding * 2;
		if (generatedSequence.length > 0 && generatedSequence[step % steps] === on) {
			if (sequence.generateFadingNotes) {
				container.appendChild(SVG.rect({ x: x, y: y, width: w, height: h, style: `fill: ${channelColors.secondaryNote};` }));
				const startSize: number = Math.max(0, Math.min(1, 1 - (stepStart - rawStart) / (rawEnd - rawStart))),
					endSize: number = Math.max(0, Math.min(1, 1 - (stepEnd - rawStart) / (rawEnd - rawStart)));
				container.appendChild(
					SVG.path({
						d: `M ${x} ${y + (h / 2) * (1 - startSize)} L ${x + w} ${y + (h / 2) * (1 - endSize)} L ${x + w} ${y + h - (h / 2) * (1 - endSize)} L ${x} ${y + h - (h / 2) * (1 - startSize)} z`,
						style: `fill: ${channelColors.primaryNote};`,
					}),
				);
			} else {
				container.appendChild(SVG.rect({ x: x, y: y, width: w, height: h, style: `fill: ${channelColors.primaryNote};` }));
			}
			if (rawStart < 0) {
				const arrowY: number = y + h / 2,
					arrowHeight: number = Math.min(h, 20);
				const arrow: SVGPathElement = SVG.path({
					d: `M ${prettyNumber(partWidth * stepStart + 2 + padding)} ${prettyNumber(arrowY - 0.1 * arrowHeight)} L ${prettyNumber(partWidth * stepStart + 2 + padding)} ${prettyNumber(arrowY + 0.1 * arrowHeight)} L ${prettyNumber(partWidth * stepStart + 6 + padding)} ${prettyNumber(arrowY + 0.1 * arrowHeight)} L ${prettyNumber(partWidth * stepStart + 6 + padding)} ${prettyNumber(arrowY + 0.3 * arrowHeight)} L ${prettyNumber(partWidth * stepStart + 14 + padding)} ${prettyNumber(arrowY)} L ${prettyNumber(partWidth * stepStart + 6 + padding)} ${prettyNumber(arrowY - 0.3 * arrowHeight)} L ${prettyNumber(partWidth * stepStart + 6 + padding)} ${prettyNumber(arrowY - 0.1 * arrowHeight)}`,
					fill: ColorConfig.invertedText,
				});
				toPushAtTheEnd.push(arrow);
			}
		}
	}
	for (const element of toPushAtTheEnd) container.appendChild(element);
}

export function renderLabel(ctx: EuclidgenRendererContext): void {
	const sequence: Sequence = ctx.sequences[ctx.sequenceIndex];
	const pitchNameIndex: number = (sequence.pitch + ctx.song.key) % Config.pitchesPerOctave;
	let pitch: string = "";
	if (Config.keys[pitchNameIndex].isWhiteKey) {
		pitch = Config.keys[pitchNameIndex].name;
	} else {
		const shiftDir: number = Config.blackKeyNameParents[sequence.pitch % Config.pitchesPerOctave];
		pitch = Config.keys[(pitchNameIndex + Config.pitchesPerOctave + shiftDir) % Config.pitchesPerOctave].name + (shiftDir === 1 ? "♭" : "♯");
	}
	ctx.barPreviewLabel.innerText = `Bar ${ctx.barPreviewBarIndex + 1}, ${pitch}${Math.floor(sequence.pitch / Config.pitchesPerOctave)}`;
}

export function renderSequenceButtons(ctx: EuclidgenRendererContext): void {
	const container: HTMLDivElement = ctx.sequenceButtonContainer;
	while (ctx.sequenceButtons.length < ctx.sequences.length) {
		const sequenceButton: HTMLButtonElement = HTML.button({ class: "no-underline" }, ctx.sequenceButtons.length + 1 + "");
		ctx.sequenceButtons.push(sequenceButton);
		container.insertBefore(sequenceButton, ctx.sequenceRemoveButton);
	}
	for (let i: number = ctx.renderedSequenceCount; i < ctx.sequences.length; i++) ctx.sequenceButtons[i].style.display = "";
	for (let i: number = ctx.sequences.length; i < ctx.renderedSequenceCount; i++) ctx.sequenceButtons[i].style.display = "none";
	ctx.renderedSequenceCount = ctx.sequences.length;
	while (ctx.sequenceButtons.length > ctx.maxSequences) container.removeChild(ctx.sequenceButtons.pop()!);
	ctx.sequenceRemoveButton.style.display = ctx.sequences.length > 1 ? "" : "none";
	ctx.sequenceAddButton.style.display = ctx.sequences.length < ctx.maxSequences ? "" : "none";
	ctx.sequenceRemoveButton.classList.toggle("last-button", ctx.sequences.length >= ctx.maxSequences);
	if (ctx.highlightedSequenceIndex !== ctx.sequenceIndex) {
		if (ctx.sequenceButtons[ctx.highlightedSequenceIndex]) ctx.sequenceButtons[ctx.highlightedSequenceIndex].classList.remove("selected-instrument");
		ctx.sequenceButtons[ctx.sequenceIndex].classList.add("selected-instrument");
		ctx.highlightedSequenceIndex = ctx.sequenceIndex;
	}
	for (let s: number = 0; s < ctx.sequences.length; s++)
		ctx.sequenceButtons[s].style.color = s === ctx.highlightedSequenceIndex ? "" : ColorConfig.primaryText;
	const colors: ChannelColors = ColorConfig.getChannelColor(ctx.song, ctx.sequences[ctx.sequenceIndex].channel);
	ctx.sequenceButtonContainer.style.setProperty("--text-color-lit", colors.primaryNote);
	ctx.sequenceButtonContainer.style.setProperty("--text-color-dim", colors.secondaryNote);
	ctx.sequenceButtonContainer.style.setProperty("--background-color-lit", colors.primaryChannel);
	ctx.sequenceButtonContainer.style.setProperty("--background-color-dim", colors.secondaryChannel);
}

export function renderAll(ctx: EuclidgenRendererContext): void {
	renderClock(ctx);
	renderBarPreview(ctx);
	renderLabel(ctx);
	renderSequenceButtons(ctx);
}

export function renderInitialBackground(ctx: EuclidgenRendererContext): void {
	const beatsPerBar: number = 4;
	const color: string = ColorConfig.pitchBackground;
	const container: SVGSVGElement = ctx.barPreviewBackground;
	const padding: number = 1;
	const beatWidth: number = ctx.barPreviewWidth / beatsPerBar;
	const beatHeight: number = ctx.barPreviewHeight;
	for (let beat: number = 0; beat < beatsPerBar; beat++) {
		container.appendChild(
			SVG.rect({
				x: beat * beatWidth + padding,
				y: padding,
				width: beatWidth - padding * 2,
				height: beatHeight - padding * 2,
				style: `fill: ${color};`,
			}),
		);
	}
}
