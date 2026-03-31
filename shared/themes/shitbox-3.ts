// editor/rendering/themes/shitbox-3.ts
//
// Purpose: CSS variable definitions for the "shitbox 3.0" theme

export const shitbox3: string = `

		:root {
			font: 20px/2 monospace;
			--page-margin: #252525;
			--editor-background: #252525;
			--primary-text: #C8C8C8;
			--link-accent: #945800;
				--track-editor-bg-pitch-dim: #444;
				--track-editor-bg-noise-dim: #444;
				--pitch-channel-limit: 6;
				--noise-channel-limit: 3;
				--text-disabled-icon: ✗ ;
			}

			.beepboxEditor input[type="range"]::-moz-range-thumb {
				width: 8px !important;
			  }

			button.playButton {
				width: 80px;
			}
			button.prevBarButton {
				width: 40px;
				left:-5px;
			}
			button.nextBarButton {
				width: 40px;
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
			svg#firstImage
			{
				background: black !important;
			}

			.beepboxEditor {
				line-height: 1.25;
			}

			#text-content {
				font-size: 32px;
				line-height: 40px;
			}

			#text-content > section > h1 {
				color: #C8C8C8;
				}
		`;
