// editor/rendering/themes/light-classic.ts
//
// Purpose: CSS variable definitions for the "light classic" theme

export const lightClassic: string = `
	:root {
		-webkit-text-stroke-width: 0.5px;
		--page-margin: #685d88;
		--editor-background: white;
		--hover-preview: black;
		--playhead: rgba(0,0,0,0.5);
		--primary-text: black;
		--secondary-text: #777;
		--inverted-text: white;
		--text-selection: rgba(200,170,255,0.99);
		--box-selection-fill: rgba(0,0,0,0.1);
		--loop-accent: #98f;
		--link-accent: #74f;
		--ui-widget-background: #ececec;
		--ui-widget-focus: #eee;
		--pitch-background: #ececec;
		--tonic: #f0d6b6;
		--fifth-note: #bbddf0;
		--white-piano-key: #eee;
		--black-piano-key: #666;
			--track-editor-bg-pitch: #ececec;
			--track-editor-bg-pitch-dim: #fdfdfd;
			--track-editor-bg-noise: #ececec;
			--track-editor-bg-noise-dim: #fdfdfd;
			--track-editor-bg-mod: #dbecfd;
			--track-editor-bg-mod-dim: #ecfdff;
			--multiplicative-mod-slider: #789;
			--overwriting-mod-slider: #987;
			--indicator-primary: #98f;
			--indicator-secondary: #cde;
			--select2-opt-group: #cecece;
			--input-box-outline: #ddd;
			--mute-button-normal: #c0b47f;
			--mute-button-mod: #bd7fc0;
		--pitch1-secondary-channel: #6CD9ED;
		--pitch1-primary-channel:   #00A0BD;
		--pitch1-secondary-note:    #34C2DC;
		--pitch1-primary-note:      #00758A;
		--pitch2-secondary-channel: #E3C941;
		--pitch2-primary-channel:   #B49700;
		--pitch2-secondary-note:    #D1B628;
		--pitch2-primary-note:      #836E00;
		--pitch3-secondary-channel: #FF9D61;
		--pitch3-primary-channel:   #E14E00;
		--pitch3-secondary-note:    #F67D3C;
		--pitch3-primary-note:      #B64000;
		--pitch4-secondary-channel: #4BE24B;
		--pitch4-primary-channel:   #00A800;
		--pitch4-secondary-note:    #2DC82D;
		--pitch4-primary-note:      #008000;
		--pitch5-secondary-channel: #FF90FF;
		--pitch5-primary-channel:   #E12EDF;
		--pitch5-secondary-note:    #EC6EEC;
		--pitch5-primary-note:      #A600A5;
		--pitch6-secondary-channel: #B5B5FE;
		--pitch6-primary-channel:   #6969FD;
		--pitch6-secondary-note:    #9393FE;
		--pitch6-primary-note:      #4A4AD7;
		--pitch7-secondary-channel: #C2D848;
		--pitch7-primary-channel:   #8EA800;
		--pitch7-secondary-note:    #B0C82D;
		--pitch7-primary-note:      #6C8000;
		--pitch8-secondary-channel: #FF90A4;
		--pitch8-primary-channel:   #E12E4D;
		--pitch8-secondary-note:    #EC6E85;
		--pitch8-primary-note:      #A6001D;
		--pitch9-secondary-channel: #41E3B5;
		--pitch9-primary-channel:   #00B481;
		--pitch9-secondary-note:    #28D1A1;
		--pitch9-primary-note:      #00835E;
		--pitch10-secondary-channel:#CA77FF;
		--pitch10-primary-channel:  #9609FF;
		--pitch10-secondary-note:   #B54FFF;
		--pitch10-primary-note:     #8400E3;
		--noise1-secondary-channel: #C1C1C1;
		--noise1-primary-channel:   #898989;
		--noise1-secondary-note:    #ADADAD;
		--noise1-primary-note:      #6C6C6C;
		--noise2-secondary-channel: #E8BB8C;
		--noise2-primary-channel:   #BD7D3A;
		--noise2-secondary-note:    #D1A374;
		--noise2-primary-note:      #836342;
		--noise3-secondary-channel: #9BC4EB;
		--noise3-primary-channel:   #4481BE;
		--noise3-secondary-note:    #7CA7D3;
		--noise3-primary-note:      #476685;
		--noise4-secondary-channel: #C5A5E0;
		--noise4-primary-channel:   #8553AE;
		--noise4-secondary-note:    #B290CC;
		--noise4-primary-note:      #684F7D;
		--noise5-secondary-channel: #B8CE93;
		--noise5-primary-channel:   #87A74F;
		--noise5-secondary-note:    #ABC183;
		--noise5-primary-note:      #68784C;
			--mod1-secondary-channel:   #339955;
			--mod1-primary-channel:     #77dd55;
			--mod1-primary-note:        #2ad84a;
			--mod2-primary-note:        #ba124a;
			--mod3-primary-note:        #7a1caa;
			--mod4-primary-note:        #a86810;
			--mod-label-primary:        #dddddd;
			--mod-label-secondary-text: #777;
			--disabled-note-primary:    #666;
			--disabled-note-secondary:  #aaa;
	}

	.beepboxEditor button, .beepboxEditor select {
		box-shadow: inset 0 0 0 1px var(--secondary-text);
	}

		.select2-selection__rendered {
			box-shadow: inset 0 0 0 1px var(--secondary-text);
		}

		.promptContainerBG::before {
			box-shadow: inset 0 0 2000px rgba(255, 255, 255, .5);
		}
`;
