// shared/themes/azur-lane.ts
//
// Purpose: CSS variable definitions for the "azur lane" theme

export const azurLane: string = `
		:root {
			--page-margin: #19337e;
			--editor-background: #000333cf;
			--playhead: rgba(255, 255, 255, 0.9);
			--primary-text: #9af9ff;
			--secondary-text: #4072dd;
			--box-selection-fill: #044b94;
			--loop-accent: #950d0d;
			--link-accent: #0072ff;
			--ui-widget-background: #255bb3;
			--ui-widget-focus: #757575;
			--pitch-background: #20468b73;
			--tonic: #c9c9c9;
			--fifth-note: #731d1d;
			--white-piano-key: #eee;
			--black-piano-key: #000;
			--track-editor-bg-pitch: #535a73;
			--track-editor-bg-pitch-dim: #353643;
			--track-editor-bg-noise: #770000;
			--track-editor-bg-noise-dim: #430000;
			--track-editor-bg-mod: #5d1d06;
			--track-editor-bg-mod-dim: #270000;
			--multiplicative-mod-slider: #bb0000;
			--overwriting-mod-slider: #ad0000;
			--indicator-primary: #9c64f7;
			--indicator-secondary: #393e4f;
			--select2-opt-group: #5d576f;
			--input-box-outline: #002957;
			--mute-button-normal: #ffffff;
			--mute-button-mod: #4f4f4f;
			--mod-label-primary: #531313;
			--pitch1-secondary-channel: #80858d;
		  --pitch1-primary-channel: #f2f7ff;
		  --pitch1-secondary-note: #80858d;
		  --pitch1-primary-note: #f2f7ff;
		  --pitch2-secondary-channel: #7392ad;
		  --pitch2-primary-channel: #a8d6ff;
		  --pitch2-secondary-note: #7392ad;
		  --pitch2-primary-note: #a8d6ff;
		  --pitch3-secondary-channel: #4b7eaa;
		  --pitch3-primary-channel: #71bdff;
		  --pitch3-secondary-note: #4b7eaa;
		  --pitch3-primary-note: #71bdff;
		  --pitch4-secondary-channel: #3594b1;
		  --pitch4-primary-channel: #48d4ff;
		  --pitch4-secondary-note: #3594b1;
		  --pitch4-primary-note: #48d4ff;
		  --pitch5-secondary-channel: #1b98b1;
		  --pitch5-primary-channel: #30f1ff;
		  --pitch5-secondary-note: #1b98b1;
		  --pitch5-primary-note: #30f1ff;
		  --pitch6-secondary-channel: #9e0000;
		  --pitch6-primary-channel: #db0000;
		  --pitch6-secondary-note: #9e0000;
		  --pitch6-primary-note: #db0000;
		  --pitch7-secondary-channel: #7c1717;
		  --pitch7-primary-channel: #9e0000;
		  --pitch7-secondary-note: #7c1717;
		  --pitch7-primary-note: #9e0000;
		  --pitch8-secondary-channel: #5c1f1f;
		  --pitch8-primary-channel: #7c1717;
		  --pitch8-secondary-note: #5c1f1f;
		  --pitch8-primary-note: #7c1717;
		  --pitch9-secondary-channel: #3e2020;
		  --pitch9-primary-channel: #5c1f1f;
		  --pitch9-secondary-note: #3e2020;
		  --pitch9-primary-note: #5c1f1f;
		  --pitch10-secondary-channel: #2f1c1c;
		  --pitch10-primary-channel: #5c1f1f;
		  --pitch10-secondary-note: #2f1c1c;
		  --pitch10-primary-note: #5c1f1f;
		  --noise1-secondary-channel: #828282;
		  --noise1-primary-channel: #cacaca;
		  --noise1-secondary-note: #828282;
		  --noise1-primary-note: #cacaca;
		  --noise2-secondary-channel: #2f8baf;
		  --noise2-primary-channel: #3de2ff;
		  --noise2-secondary-note: #2f8baf;
		  --noise2-primary-note: #3de2ff;
		  --noise3-secondary-channel: #6f50b1;
		  --noise3-primary-channel: #8567ff;
		  --noise3-secondary-note: #6f50b1;
		  --noise3-primary-note: #8567ff;
		  --noise4-secondary-channel: #d38900;
		  --noise4-primary-channel: #ffb500;
		  --noise4-secondary-note: #d38900;
		  --noise4-primary-note: #ffb500;
		  --noise5-secondary-channel: #af0008;
		  --noise5-primary-channel: #00d70e;
		  --noise5-secondary-note: #29b700;
		  --noise5-primary-note: #00f7ff;
		  --mod1-secondary-channel: #9d5bb9;
		  --mod1-primary-channel: #e16bff;
		  --mod1-secondary-note: #3a3ea4;
		  --mod1-primary-note: #fff;
		  --mod2-secondary-channel: #3a8d58;
		  --mod2-primary-channel: #42ffff;
		  --mod2-secondary-note: #3a8d58;
		  --mod2-primary-note: #42ffff;
		  --mod3-secondary-channel: #af6c00;
		  --mod3-primary-channel: #fa0;
		  --mod3-secondary-note: #0001a2;
		  --mod3-primary-note: #970000;
		  --mod4-secondary-channel: #d3d3d3;
		  --mod4-primary-channel: #759bff;
		  --mod4-secondary-note: #a00000;
		  --mod4-primary-note: #fff;
		  --disabled-note-primary: #3a3a3a;
		  --disabled-note-secondary: #000;
			}
		/* replaces hotdog with an image of the girls using the same scratch sprites from the 404 page*/
		#Hotdog {
			display: inline !important;
			content: url("assets/images/AzurLaneThemeStarterSquad.png") !important;
			width: 75%;
			height: 75%;
			text-align: center;
			margin-top: 25px;
		}
		/* sets cursor */
		* {
		cursor: url("assets/images/AzurLaneThemeMouse.png"), auto !important;
		}
		/* sets background image */
		body {
		background-image: url("assets/images/AzurLaneThemeMemoryTaskBackground.png") !important;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
			}
			/* make editor background transparent */
		#beepboxEditorContainer, .beepboxEditor, #text-content {
		background: #0400257d !important;
		}
			#text-content > section > h1 > font {
		display: none;
		}
		#text-content > section > h1 {
		margin: auto;
		content: url("assets/images/AzurLaneThemeLogo.png");
		}
		.promptContainerBG::before {
			box-shadow: inset 0 0 2000px rgba(255, 255, 255, .5);
		}
		}`;
