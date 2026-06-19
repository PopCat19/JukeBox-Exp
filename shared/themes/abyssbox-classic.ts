// abyssbox-classic.ts
//
// Purpose: CSS variable definitions for the "abyssbox classic" theme

export const abyssboxClassic: string = `
			:root {
			--page-margin: #1e0915;
			--editor-background: #1e0915;
			--playhead: rgba(255, 255, 255, 0.9);
			--secondary-text: #ffcedd;
			--box-selection-fill: #1e0915;
			--loop-accent: #873a51;
			--link-accent: #df88ff;
			--ui-widget-background: #581b3e;
			--ui-widget-focus: #762b4c;
			--pitch-background: #381d24;
			--tonic: #873a51;
			--fifth-note: #75001e;
			--white-piano-key: #cca5c7;
			--black-piano-key: #402f2f;
			--use-color-formula: true;
			--track-editor-bg-pitch: #571c40;
			--track-editor-bg-pitch-dim: #290d0d;
			--track-editor-bg-noise: #571131;
			--track-editor-bg-noise-dim: #330a28;
			--track-editor-bg-mod: #54083c;
			--track-editor-bg-mod-dim: #360426;
			--multiplicative-mod-slider: #9f6082;
			--overwriting-mod-slider: #9e3470;
			--indicator-primary: #b3498f;
			--indicator-secondary: #541d40;
			--select2-opt-group: #4f191e;
			--input-box-outline: #18041a;
			--mute-button-normal: #dd5d94;
			--mute-button-mod: #ba364c;
			--mod-label-primary: #541625;
			--mod-label-secondary-text: rgb(120, 87, 86);
			--mod-label-primary-text: gray;

			--pitch-secondary-channel-hue: -80;
			--pitch-secondary-channel-hue-scale 0;
			--pitch-secondary-channel-sat: 43;
			--pitch-secondary-channel-sat-scale: 0.1;
			--pitch-secondary-channel-lum: 40;
			--pitch-secondary-channel-lum-scale: 0.05;

			--pitch-primary-channel-hue: -53;
			--pitch-primary-channel-hue-scale: 6.1;
			--pitch-primary-channel-sat: 75;
			--pitch-primary-channel-sat-scale: 0.1;
			--pitch-primary-channel-lum: 67.5;
			--pitch-primary-channel-lum-scale: 0.05;

			--pitch-secondary-note-hue: -34;
			--pitch-secondary-note-hue-scale: 6.1;
			--pitch-secondary-note-sat: 93.9;
			--pitch-secondary-note-sat-scale: 0.1;
			--pitch-secondary-note-lum: 25;
			--pitch-secondary-note-lum-scale: 0.05;

			--pitch-primary-note-hue: -53;
			--pitch-primary-note-hue-scale: 6.1;
			--pitch-primary-note-sat: 100;
			--pitch-primary-note-sat-scale: 0.05;
			--pitch-primary-note-lum: 85.6;
			--pitch-primary-note-lum-scale: 0.025;

			--noise-secondary-channel-hue: 0;
			--noise-secondary-channel-hue-scale: 2;
			--noise-secondary-channel-sat: 65;
			--noise-secondary-channel-sat-scale: 0;
			--noise-secondary-channel-lum: 42;
			--noise-secondary-channel-lum-scale: 0;

			--noise-primary-channel-hue: 0;
			--noise-primary-channel-hue-scale: 1;
			--noise-primary-channel-sat: 100;
			--noise-primary-channel-sat-scale: 1;
			--noise-primary-channel-lum: 63.5;
			--noise-primary-channel-lum-scale: 0;

			--noise-secondary-note-hue: 24;
			--noise-secondary-note-hue-scale: 2;
			--noise-secondary-note-sat: 100;
			--noise-secondary-note-sat-scale: 0;
			--noise-secondary-note-lum: 35;
			--noise-secondary-note-lum-scale: 0;

			--noise-primary-note-hue: 24;
			--noise-primary-note-hue-scale: 2;
			--noise-primary-note-sat: 100;
			--noise-primary-note-sat-scale: 1;
			--noise-primary-note-lum: 60;
			--noise-primary-note-lum-scale: 1;

			--mod-secondary-channel-hue: 55;
			--mod-secondary-channel-hue-scale: 1.5;
			--mod-secondary-channel-sat: 100;
			--mod-secondary-channel-sat-scale: 0;
			--mod-secondary-channel-lum: 20;
			--mod-secondary-channel-lum-scale: 0;

			--mod-primary-channel-hue: 55;
			--mod-primary-channel-hue-scale: 1.5;
			--mod-primary-channel-sat: 96;
			--mod-primary-channel-sat-scale: 0;
			--mod-primary-channel-lum: 50;
			--mod-primary-channel-lum-scale: 0;

			--mod-secondary-note-hue: 55;
			--mod-secondary-note-hue-scale: 1.5;
			--mod-secondary-note-sat: 92;
			--mod-secondary-note-sat-scale: 0;
			--mod-secondary-note-lum: 45;
			--mod-secondary-note-lum-scale: 0;

			--mod-primary-note-hue: 55;
			--mod-primary-note-hue-scale: 1.5;
			--mod-primary-note-sat: 96;
			--mod-primary-note-sat-scale: 0;
			--mod-primary-note-lum: 85;
			--mod-primary-note-lum-scale: 0;

			--note-flash: #ffffff;
			--note-flash-secondary: #ffffff77;

			--spectrum-line-R: var(--ui-widget-background);
			--spectrum-line-L: var(--secondary-text);
			--text-spacing-icon: > ;
			--scrollbar-color: #bf2c5d;

			--file-page-symbol: url("assets/images/icon-file.png");
			--edit-pencil-symbol: url("assets/images/icon-edit.png");
			--preferences-gear-symbol: url("assets/images/icon-preferences.png");
			--instrument-copy-symbol: url("assets/images/icon-copy.png");
			--instrument-paste-symbol: url("assets/images/icon-paste.png");
			--play-symbol: url("assets/images/icon-play.png");
			--pause-symbol: url("assets/images/icon-pause.png");
			--record-symbol: url("assets/images/icon-record.png");
			--stop-symbol: url("assets/images/icon-stop.png");
			--prev-bar-symbol: url("assets/images/icon-prev.png");
			--next-bar-symbol: url("assets/images/icon-next.png");
			--muted-symbol: url("assets/images/icon-speakerMuted.png");
			--unmuted-symbol: url("assets/images/icon-speaker.png");
			--volume-symbol: url("assets/images/icon-speaker.png");
			--zoom-in-symbol: url("assets/images/icon-zoomIn.png");
			--zoom-out-symbol: url("assets/images/icon-zoomOut.png");
			--export-symbol: url("assets/images/icon-export.png");
				}
		* {
		cursor: url("assets/images/abyssbox_cursor.png"), auto;
		}

			@font-face {
		   font-family: "AbyssType";
		   src:
			url("assets/fonts/abysstype.otf") format("opentype") tech(color-COLRv1),
			}

			/* sets background image */
			body {
			background-image: url("assets/images/stripesbg.gif") !important;
			background-position: center;
			background-repeat: repeat;

			image-rendering: -moz-crisp-edges !important;         /* Firefox */
			image-rendering: -webkit-optimize-contrast !important; /* Webkit (Chrome/Safari) */
			image-rendering: -o-crisp-edges !important;            /* Opera */
			image-rendering: pixelated !important;                 /* Future browsers */
			image-rendering: optimizeSpeed !important;             /* IE */
				}

			#text-content {
					border-image-source: url("assets/images/abyssbox_border.png");
					border-image-slice: 4 fill;
				   border-image-width: 8px;
				border-image-repeat: stretch;
					padding: 12px;

					image-rendering: -moz-crisp-edges !important;         /* Firefox */
					image-rendering: -webkit-optimize-contrast !important; /* Webkit (Chrome/Safari) */
					image-rendering: -o-crisp-edges !important;            /* Opera */
					image-rendering: pixelated !important;                 /* Future browsers */
					image-rendering: optimizeSpeed !important;             /* IE */
				}
			#beepboxEditorContainer {
					border-image-source: url("assets/images/abyssbox_border.png");
					border-image-slice: 4 fill;
				   	border-image-width: 8px;
					border-image-repeat: stretch;
					padding: 12px;

					image-rendering: -moz-crisp-edges !important;         /* Firefox */
					image-rendering: -webkit-optimize-contrast !important; /* Webkit (Chrome/Safari) */
					image-rendering: -o-crisp-edges !important;            /* Opera */
					image-rendering: pixelated !important;                 /* Future browsers */
					image-rendering: optimizeSpeed !important;             /* IE */
				}
			.beepboxEditor button,
			button.playButton,
			button.pauseButton,
			button.recordButton,
			button.stopButton,
			button.nextBarButton,
			button.prevBarButton,
			button.copyButton,
			button.pasteButton,
			button.exportInstrumentButton,
			button.importInstrumentButton,
			.beepboxEditor select,
			.beepboxEditor .select2-selection__rendered {
					border-image-source: url("assets/images/abyssbox_border.png") !important;
					border-image-slice: 4 fill !important;
				   border-image-width: 4px !important;
				border-image-repeat: stretch !important;
					padding: 4px !important;

					image-rendering: -moz-crisp-edges !important;         /* Firefox */
					image-rendering: -webkit-optimize-contrast !important; /* Webkit (Chrome/Safari) */
					image-rendering: -o-crisp-edges !important;            /* Opera */
					image-rendering: pixelated !important;                 /* Future browsers */
					image-rendering: optimizeSpeed !important;             /* IE */

					cursor: url("assets/images/abyssbox_cursor_hand.png"), pointer !important;
				}

			div.selectRow button:not(.copyButton,.pasteButton,.exportInstrumentButton,.importInstrumentButton) {
				--ui-widget-background: #1e0915 !important;
				border-image-source:none !important;
			}

				select.trackSelectBox {
					border-image: none !important;
				}

			@font-face {
		   font-family: "AbyssType_small";
		   src:
			url("assets/fonts/abysstype_small.otf") format("opentype") tech(color-COLRv1),
			}

			html {
				font-family: 'AbyssType';
			}

			div.channelBoxLabel {
				font-family: 'AbyssType_small' !important;
			}

			.beepboxEditor input[type="range"]::-webkit-slider-thumb
			{
				cursor: url("assets/images/abyssbox_cursor_hand.png"), pointer !important;
			}

			.beepboxEditor input[type="range"]::-webkit-slider-runnable-track
			{
				cursor: url("assets/images/abyssbox_cursor_hand.png"), pointer !important;
			}

			.beepboxEditor input[type="range"]:focus::-webkit-slider-runnable-track
			{
				cursor: url("assets/images/abyssbox_cursor_hand.png"), pointer !important;
			}

			.beepboxEditor input[type="range"]::-ms-thumb
			{
				cursor: url("assets/images/abyssbox_cursor_hand.png"), pointer !important;
			}

			.beepboxEditor input[type="range"]::-ms-track
			{
				cursor: url("assets/images/abyssbox_cursor_hand.png"), pointer !important;
			}

			.beepboxEditor input[type="range"]:focus::-ms-track
			{
				cursor: url("assets/images/abyssbox_cursor_hand.png"), pointer !important;
			}

			.beepboxEditor input[type="range"]::-moz-range-thumb
			{
				cursor: url("assets/images/abyssbox_cursor_hand.png"), pointer !important;
			}

			.beepboxEditor input[type="range"]::-moz-range-track
			{
				cursor: url("assets/images/abyssbox_cursor_hand.png"), pointer !important;
			}

			.beepboxEditor input[type="range"]:focus::-moz-range-track
			{
				cursor: url("assets/images/abyssbox_cursor_hand.png"), pointer !important;
			}

			.beepboxEditor input[type="text"],
			.beepboxEditor input[type="number"]
			{
				cursor: url("assets/images/abyssbox_cursor_hand.png"), pointer !important;
			}

			.beepboxEditor input[type="checkbox"]
			{
				cursor: url("assets/images/abyssbox_cursor_hand.png"), pointer !important;
			}

			.beepboxEditor input[type="checkbox"]:checked
			{
				cursor: url("assets/images/abyssbox_cursor_hand.png"), pointer !important;
			}

			.beepboxEditor input[type="checkbox"]:checked:after
			{
				cursor: url("assets/images/abyssbox_cursor_hand.png"), pointer !important;
			}

			div.selectRow span {
				cursor: url("assets/images/abyssbox_cursor_hand.png"), pointer !important;
			}

			`;
