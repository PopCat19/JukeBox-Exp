// brucebox.ts
//
// Purpose: CSS variable definitions for the "brucebox" theme

export const brucebox: string = `
		:root {
				font: 16px/2 cursive;
				--page-margin: #4667CE;
				--editor-background: #4667CE;
					--track-editor-bg-pitch-dim: #444;
					--track-editor-bg-noise-dim: #444;
					--pitch-channel-limit: 3;
					--noise-channel-limit: 1;
				--pitch1-secondary-channel: #bda822;
				--pitch1-primary-channel:   #fcdb00;
				--pitch1-secondary-note:    #bda822;
				--pitch1-primary-note:      #fcdb00;
				--pitch2-secondary-channel: #612278;
				--pitch2-primary-channel:   #bb00ff;
				--pitch2-secondary-note:    #612278;
				--pitch2-primary-note:      #bb00ff;
				--pitch3-secondary-channel: #8b4343;
				--pitch3-primary-channel:   #ff8844;
				--pitch3-secondary-note:    #8b4343;
				--pitch3-primary-note:      #ff8844;
				--pitch4-secondary-channel: #bda822;
				--pitch4-primary-channel:   #fcdb00;
				--pitch4-secondary-note:    #bda822;
				--pitch4-primary-note:      #fcdb00;
				--pitch5-secondary-channel: #612278;
				--pitch5-primary-channel:   #bb00ff;
				--pitch5-secondary-note:    #612278;
				--pitch5-primary-note:      #bb00ff;
				--pitch6-secondary-channel: #8b4343;
				--pitch6-primary-channel:   #ff8844;
				--pitch6-secondary-note:    #8b4343;
				--pitch6-primary-note:      #ff8844;
				--pitch7-secondary-channel: #bda822;
				--pitch7-primary-channel:   #fcdb00;
				--pitch7-secondary-note:    #bda822;
				--pitch7-primary-note:      #fcdb00;
				--pitch8-secondary-channel: #612278;
				--pitch8-primary-channel:   #bb00ff;
				--pitch8-secondary-note:    #612278;
				--pitch8-primary-note:      #bb00ff;
				--pitch9-secondary-channel: #8b4343;
				--pitch9-primary-channel:   #ff8844;
				--pitch9-secondary-note:    #8b4343;
				--pitch9-primary-note:      #ff8844;
				--pitch10-secondary-channel: #bda822;
				--pitch10-primary-channel:   #fcdb00;
				--pitch10-secondary-note:    #bda822;
				--pitch10-primary-note:      #fcdb00;
				--noise1-secondary-channel: #991010;
				}

				.trackContainer .noSelection {
				background: black !important;
				}

				span input,
				div.harmonics svg,
				div.spectrum svg,
				div.filterEditor svg,
				div.fadeInOut svg,
				div.loopEditor svg,
				svg#firstImage,
				div.trackContainer div.noSelection
				{
					background: black !important;
				}

				input, textarea {
					background-color: black !important;
				}

				#text-content > section > h1 {
					color: white;
				}

			`;
