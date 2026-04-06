// shared/themes/jummbox-light.ts
//
// Purpose: CSS variable definitions for the "jummbox light" theme

export const jummboxLight: string = `
		:root {
			-webkit-text-stroke-width: 0.5px;
			--page-margin: #cab1d3;
			--editor-background: #f4f4f4;
			--hover-preview: #2d26a2;
			--playhead: rgb(20 25 153 / 90%);
			--primary-text: #b686c3;
			--secondary-text: #970f38;
			--inverted-text: #fefdff;
			--text-selection: rgb(56 21 8 / 99%);
			--box-selection-fill: rgb(20 203 160 / 61%);
			--loop-accent: #09dc0e;
			--link-accent: #3ee669;
			--ui-widget-background: #0e0a42;
			--ui-widget-focus: #380c42;
			--pitch-background: #8daf96;
			--tonic: #a16fb1;
			--fifth-note: #d08c8c;
			--white-piano-key: #fbffee;
			--black-piano-key: #c9d8e5;
			--white-piano-key-text: #101160;
			--black-piano-key-text: #231b03;
			--use-color-formula: true;
			--track-editor-bg-pitch: #34456a;
			--track-editor-bg-pitch-dim: #88afad;
			--track-editor-bg-noise: #564566;
			--track-editor-bg-noise-dim: #aaa;
			--track-editor-bg-mod: #7f779d;
			--track-editor-bg-mod-dim: #aaa;
			--multiplicative-mod-slider: #807caf;
			--overwriting-mod-slider: #909cdf;
			--indicator-primary: #ae38ff;
			--indicator-secondary: #5c8dbb;
			--select2-opt-group: #581b50;
			--input-box-outline: #6f7074;
			--mute-button-normal: #db1e00;
			--mute-button-mod: #883bf9;
			--mod-label-primary: #525297;
			--mod-label-secondary-text: rgb(197 147 245);
			--mod-label-primary-text: #a3aae9;
                    --pitch-secondary-channel-hue: 26;
                    --pitch-secondary-channel-hue-scale: 214.5;
                    --pitch-secondary-channel-sat: 74.3;
                    --pitch-secondary-channel-sat-scale: -0.1;
			--pitch-secondary-channel-lum: 55;
			--pitch-secondary-channel-lum-scale: -0.05;
			--pitch-primary-channel-hue: 26;
			--pitch-primary-channel-hue-scale: 214.5;
			--pitch-primary-channel-sat: 74;
			--pitch-primary-channel-sat-scale: -0.1;
			--pitch-primary-channel-lum: 65.5;
			--pitch-primary-channel-lum-scale: -0.05;
			--pitch-secondary-note-hue: 26;
			--pitch-secondary-note-hue-scale: 214.5;
			--pitch-secondary-note-sat: 74.9;
			--pitch-secondary-note-sat-scale: -0.1;
			--pitch-secondary-note-lum: 70;
			--pitch-secondary-note-lum-scale: -0.05;
			--pitch-primary-note-hue: 26;
			--pitch-primary-note-hue-scale: 214.5;
			--pitch-primary-note-sat: 85;
			--pitch-primary-note-sat-scale: 0.05;
			--pitch-primary-note-lum: 64.6;
			--pitch-primary-note-lum-scale: -0.025;
			--noise-secondary-channel-hue: 220;
			--noise-secondary-channel-hue-scale: 2;
			--noise-secondary-channel-sat: 25;
			--noise-secondary-channel-sat-scale: 0;
			--noise-secondary-channel-lum: 62;
			--noise-secondary-channel-lum-scale: -0.1;
			--noise-primary-channel-hue: 220;
			--noise-primary-channel-hue-scale: 2;
			--noise-primary-channel-sat: 53;
			--noise-primary-channel-sat-scale: 0;
			--noise-primary-channel-lum: 53.5;
			--noise-primary-channel-lum-scale: -0.1;
			--noise-secondary-note-hue: 220;
			--noise-secondary-note-hue-scale: 2;
			--noise-secondary-note-sat: 58.5;
			--noise-secondary-note-sat-scale: 0;
			--noise-secondary-note-lum: 85;
			--noise-secondary-note-lum-scale: -1;
			--noise-primary-note-hue: 220;
			--noise-primary-note-hue-scale: 2;
			--noise-primary-note-sat: 56.5;
			--noise-primary-note-sat-scale: 0;
			--noise-primary-note-lum: 54;
			--noise-primary-note-lum-scale: -1;
			--mod-secondary-channel-hue: 90;
			--mod-secondary-channel-hue-scale: 1.5;
			--mod-secondary-channel-sat: 88;
			--mod-secondary-channel-sat-scale: 0;
			--mod-secondary-channel-lum: 60;
			--mod-secondary-channel-lum-scale: 0;
			--mod-primary-channel-hue: 90;
			--mod-primary-channel-hue-scale: 1.5;
			--mod-primary-channel-sat: 89;
			--mod-primary-channel-sat-scale: 0;
			--mod-primary-channel-lum: 65;
			--mod-primary-channel-lum-scale: 0;
			--mod-secondary-note-hue: 90;
			--mod-secondary-note-hue-scale: 1.5;
			--mod-secondary-note-sat: 79;
			--mod-secondary-note-sat-scale: 0;
			--mod-secondary-note-lum: 95;
			--mod-secondary-note-lum-scale: 0;
			--mod-primary-note-hue: 90;
			--mod-primary-note-hue-scale: 1.5;
			--mod-primary-note-sat: 79;
			--mod-primary-note-sat-scale: 0;
			--mod-primary-note-lum: 55;
			--mod-primary-note-lum-scale: 0;
			--disabled-note-primary:    #868;
			--disabled-note-secondary:  #767;
		}

		.beepboxEditor button, .beepboxEditor select {
			background-color: var(--secondary-text);
		}

		.select2-selection__rendered {
			background-color: var(--secondary-text);
		}

		.beepboxEditor .piano-button::before {
			display: none;
		}

		.promptContainerBG::before {
			box-shadow: inset 0 0 2000px rgba(255, 255, 255, .5);
		}
	`;
