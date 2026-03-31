// editor/rendering/themes/abyssbox-light.ts
//
// Purpose: CSS variable definitions for the "abyssbox light" theme

export const abyssboxLight: string = `
		:root {
			--page-margin: #e0adbc;
			--editor-background: #e0adbc;
			--playhead: rgba(255, 255, 255, 0.9);
			--primary-text: #6110d9;
			--secondary-text: #cc1338;
			--inverted-text:  #e8bcc9;
			--box-selection-fill: #bf2c5d;
			--loop-accent: #8c346a;
			--link-accent: #8c346a;
			--ui-widget-background: #f5e9f0;
			--ui-widget-focus: #f5e9f0;
			--pitch-background: #eddadf;
			--tonic: #f5f0f1;
			--fifth-note: #ffb5c9;
			--white-piano-key: #cca5c7;
			--black-piano-key: #402f2f;
			--use-color-formula: true;
			--track-editor-bg-pitch: #edbecc;
			--track-editor-bg-pitch-dim: #e0adbc;
			--track-editor-bg-noise: #edbecc;
			--track-editor-bg-noise-dim: #e0adbc;
			--track-editor-bg-mod: #edbecc;
			--track-editor-bg-mod-dim: #e0adbc;
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
			--mod-title: #cc1338;

			--pitch-secondary-channel-hue: -80;
			--pitch-secondary-channel-hue-scale 0;
			--pitch-secondary-channel-sat: 255;
			--pitch-secondary-channel-sat-scale: 0.1;
			--pitch-secondary-channel-lum: 30;
			--pitch-secondary-channel-lum-scale: 0.05;

			--pitch-primary-channel-hue: -53;
			--pitch-primary-channel-hue-scale: 6.1;
			--pitch-primary-channel-sat: 255;
			--pitch-primary-channel-sat-scale: 0.1;
			--pitch-primary-channel-lum: 60;
			--pitch-primary-channel-lum-scale: 0.05;

			--pitch-secondary-note-hue: -34;
			--pitch-secondary-note-hue-scale: 6.1;
			--pitch-secondary-note-sat: 255;
			--pitch-secondary-note-sat-scale: 0.1;
			--pitch-secondary-note-lum: 30;
			--pitch-secondary-note-lum-scale: 0.05;

			--pitch-primary-note-hue: -53;
			--pitch-primary-note-hue-scale: 6.1;
			--pitch-primary-note-sat: 255;
			--pitch-primary-note-sat-scale: 0.05;
			--pitch-primary-note-lum: 60;
			--pitch-primary-note-lum-scale: 0.025;

			--noise-secondary-channel-hue: 0;
			--noise-secondary-channel-hue-scale: 2;
			--noise-secondary-channel-sat: 255;
			--noise-secondary-channel-sat-scale: 0;
			--noise-secondary-channel-lum: 30;
			--noise-secondary-channel-lum-scale: 0;

			--noise-primary-channel-hue: 0;
			--noise-primary-channel-hue-scale: 1;
			--noise-primary-channel-sat: 255;
			--noise-primary-channel-sat-scale: 1;
			--noise-primary-channel-lum: 60;
			--noise-primary-channel-lum-scale: 0;

			--noise-secondary-note-hue: 24;
			--noise-secondary-note-hue-scale: 2;
			--noise-secondary-note-sat: 255;
			--noise-secondary-note-sat-scale: 0;
			--noise-secondary-note-lum: 30;
			--noise-secondary-note-lum-scale: 0;

			--noise-primary-note-hue: 24;
			--noise-primary-note-hue-scale: 2;
			--noise-primary-note-sat: 255;
			--noise-primary-note-sat-scale: 1;
			--noise-primary-note-lum: 60;
			--noise-primary-note-lum-scale: 1;

			--mod-secondary-channel-hue: 55;
			--mod-secondary-channel-hue-scale: 1.5;
			--mod-secondary-channel-sat: 255;
			--mod-secondary-channel-sat-scale: 0;
			--mod-secondary-channel-lum: 30;
			--mod-secondary-channel-lum-scale: 0;

			--mod-primary-channel-hue: 55;
			--mod-primary-channel-hue-scale: 1.5;
			--mod-primary-channel-sat: 255;
			--mod-primary-channel-sat-scale: 0;
			--mod-primary-channel-lum: 60;
			--mod-primary-channel-lum-scale: 0;

			--mod-secondary-note-hue: 55;
			--mod-secondary-note-hue-scale: 1.5;
			--mod-secondary-note-sat: 255;
			--mod-secondary-note-sat-scale: 0;
			--mod-secondary-note-lum: 30;
			--mod-secondary-note-lum-scale: 0;

			--mod-primary-note-hue: 55;
			--mod-primary-note-hue-scale: 1.5;
			--mod-primary-note-sat: 255;
			--mod-primary-note-sat-scale: 0;
			--mod-primary-note-lum: 60;
			--mod-primary-note-lum-scale: 0;

			--note-flash: #ffffff;
			--note-flash-secondary: #ffffff77;

			--oscilloscope-line-R: var(--ui-widget-background);
			--oscilloscope-line-L: var(--secondary-text);
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
				/* sets background image */
				body {
				background-image: url("assets/images/stripesbg_light.gif") !important;
				background-position: center;
				background-repeat: repeat;

				image-rendering: -moz-crisp-edges !important;         /* Firefox */
				image-rendering: -webkit-optimize-contrast !important; /* Webkit (Chrome/Safari) */
				image-rendering: -o-crisp-edges !important;            /* Opera */
				image-rendering: pixelated !important;                 /* Future browsers */
				image-rendering: optimizeSpeed !important;             /* IE */
					}
			#text-content {
					border-image-source: url("assets/images/abyssbox_border_light.png");
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
					border-image-source: url("assets/images/abyssbox_border_light.png");
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
						border-image-source: url("assets/images/abyssbox_border_light.png") !important;
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
					--ui-widget-background: var(--editor-background) !important;
					border-image-source:none !important;
				}

				select.trackSelectBox {
					border-image: none !important;
				}

		/* sets cursor */
		* {
		cursor: url("assets/images/abyssbox_cursor.png"), auto !important;
		}
			@font-face {
		   font-family: "AbyssType";
		   src:
			url("assets/fonts/abysstype.otf") format("opentype") tech(color-COLRv1),
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
