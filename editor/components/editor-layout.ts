// Editor Layout
//
// Purpose: Main editor layout composing pattern, track, and settings areas
//
// This module:
// - Composes PatternArea, TrackArea, and SettingsArea
// - Manages responsive grid layout
// - Handles layout switching (long, tall, wide, etc.)

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { SongDocument } from "../song-document";
import { PatternArea } from "./pattern-area";
import { SettingsArea } from "./settings-area";
import { Shiggy } from "./shiggy-component";
import { TrackArea } from "./track-area";

const { div } = HTML;

export class EditorLayout {
	public readonly container: HTMLDivElement;
	public readonly patternArea: PatternArea;
	public readonly trackArea: TrackArea;
	public readonly settingsArea: SettingsArea;
	public readonly shiggy: Shiggy;

	constructor(
		doc: SongDocument,
		songEditor: any,
		onOpenPrompt: (prompt: string) => void,
		switchEQFilterType: (simple: boolean) => void,
		switchNoteFilterType: (simple: boolean) => void,
	) {
		// Create Areas
		this.patternArea = new PatternArea(doc, onOpenPrompt);
		this.trackArea = new TrackArea(doc, songEditor);
		this.settingsArea = new SettingsArea(doc, onOpenPrompt, switchEQFilterType, switchNoteFilterType);

		// Create Shiggy (easter egg)
		this.shiggy = new Shiggy();

		// Sample Loading Bar
		const sampleLoadingBar = div({
			style: `width: 0%; height: 100%; background-color: ${ColorConfig.indicatorPrimary};`,
		});

		const sampleLoadingBarContainer = div(
			{
				style: `width: 80%; height: 4px; overflow: hidden; margin-left: auto; margin-right: auto; margin-top: 0.5em; cursor: pointer; background-color: ${ColorConfig.indicatorSecondary};`,
			},
			sampleLoadingBar,
		);

		const sampleLoadingStatusContainer = div(
			{ style: "cursor: pointer;" },
			div({ style: `margin-top: 0.5em; text-align: center; color: ${ColorConfig.secondaryText};` }, "Sample Loading Status"),
			div({ class: "selectRow", style: "height: 6px; margin-bottom: 0.5em;" }, sampleLoadingBarContainer),
		);

		// Main Layout
		this.container = div(
			{ class: "beepboxEditor" },
			div({ class: "pattern-area-container" }, this.patternArea.container),
			div({ class: "track-area-container" }, this.trackArea.container),
			div({ class: "settings-area-container" }, this.settingsArea.container),
			div({ class: "shiggy-container" }, this.shiggy.container),
			div({ class: "sample-loading-container" }, sampleLoadingStatusContainer),
		);
	}

	public updateLayout(): void {
		// Layout switching can be done via CSS classes
		// This method is a placeholder for future layout logic
	}

	public setLayoutMode(mode: string): void {
		this.container.classList.remove("layout-long", "layout-tall", "layout-wide", "layout-small");
		if (mode && mode !== "small") {
			this.container.classList.add(`layout-${mode}`);
		}
	}
}
