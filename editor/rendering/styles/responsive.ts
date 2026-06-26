// Responsive Breakpoints
//
// Purpose: CSS for responsive layout breakpoints — wide screen (>=711px) and
// narrow screen (<=710px) media query blocks.

import { ColorConfig } from "../../../shared/color-config";
import { getLocalStorageItem } from "../../../synth/synth-config";
import { BorderWidth } from "../../ui/style-constants";

export function buildResponsiveCSS(): string {
	return `\
/* wide screen */
@media (min-width: 711px) {
	#beepboxEditorContainer {
		background-image: url(${getLocalStorageItem("customTheme2", "")});
		display: table;
	}
	.beepboxEditor {
		flex-direction: row;
	}
	.beepboxEditor:focus-within {
		outline: ${BorderWidth.thick} solid ${ColorConfig.uiWidgetBackground};
	}
	.beepboxEditor .trackAndMuteContainer {
		width: 512px;
	}
	.beepboxEditor .trackSelectBox {
		display: none;
	}
    .beepboxEditor .muteButtonSelectBox {
		display: none;
	}
	.beepboxEditor .play-pause-area {
		display: flex;
		flex-direction: column;
	}
	.beepboxEditor .playback-bar-controls {
		margin: 2px 0;
	}
	.beepboxEditor .playback-volume-controls {
		display: flex;
		flex-direction: row;
		margin: 2px 0;
		align-items: center;
	}
	.beepboxEditor .settings-area {
		width: var(--settings-area-width);
	}
}

/* narrow screen */
@media (max-width: 710px) {
	.beepboxEditor {
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: min-content 6px min-content min-content;
		grid-template-areas: "pattern-area" "." "track-area" "settings-area";
		grid-row-gap: 0;
	}
	.beepboxEditor .settings-area {
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		grid-template-rows: min-content min-content 1fr min-content;
		grid-template-areas:
			"play-pause-area play-pause-area"
			"menu-area instrument-settings-area"
			"song-settings-area instrument-settings-area"
			"version-area version-area";
		grid-column-gap: 8px;
		margin: 0 4px;
		padding-right: 6px;
	}
	.beepboxEditor:focus-within {
		outline: none;
	}
	.beepboxEditor .pattern-area {
		max-height: 75vh;
	}
	.beepboxEditor .trackAndMuteContainer {
		overflow-x: auto;
	}
	.beepboxEditor .barScrollBar {
		display: none;
	}
	.beepboxEditor .play-pause-area {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		grid-column-gap: 8px;
		margin: 2px 0;
	}
	.beepboxEditor .playback-bar-controls {
		flex-grow: 1;
	}
	.beepboxEditor .playback-volume-controls {
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-grow: 1;
	}

	.beepboxEditor .soundIcon {
	  background: ${ColorConfig.editorBackground};
	  display: inline-block;
	  height: 10px;
	  margin-left: 0px;
	  margin-top: 8px;
		position: relative;
		width: 10px;
	}
	.beepboxEditor .soundIcon:before {
	  border-bottom: 6px solid transparent;
	  border-top: 6px solid transparent;
	  border-right: 10px solid ${ColorConfig.editorBackground};
	  content: "";
	  height: 10px;
	  left: 6px;
	  position: absolute;
	  top: -6px;
	  width: 0;
	}
}
`;
}
