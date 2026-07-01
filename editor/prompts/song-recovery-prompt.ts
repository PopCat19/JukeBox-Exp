// SongRecoveryPrompt
//
// Purpose: Provides dialog for browsing and restoring song recovery snapshots
//
// This module:
// - Lists available recovery snapshots with timestamps
// - Handles snapshot selection and restoration

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import {
	type RecoveredSong,
	type RecoveredVersion,
	SongRecovery,
	versionToKey,
} from "../io/song-recovery";
import type { SongDocument } from "../song-document";
import { BasePrompt } from "./base-prompt";

const { div, h2, p, select, option, iframe } = HTML;

declare const OFFLINE: boolean;

export class SongRecoveryPrompt extends BasePrompt {
	private readonly _songContainer: HTMLDivElement = div();

	public readonly container: HTMLDivElement = div(
		{ class: "prompt songRecoveryPrompt fill-y" },
		h2("Song Recovery"),
		div(
			{ class: "recoveryScroll" },
			p(
				"This is a TEMPORARY list of songs you have recently modified. Please keep your own backups of songs you care about! SONGS THAT USE SAMPLES WILL TAKE A WHILE TO LOAD, so be patient!",
			),
			this._songContainer,
			p(
				'(If "Display Song Data in URL" is enabled in your preferences, then you may also be able to find song versions in your browser history. However, song recovery won\'t work if you were browsing in private/incognito mode.)',
			),
		),
		this._cancelButton,
	);

	constructor(doc: SongDocument) {
		super(doc);
		this.buildTitlebar();
		const songs: RecoveredSong[] = SongRecovery.getAllRecoveredSongs();

		if (songs.length === 0) {
			this._songContainer.appendChild(
				p("There are no recovered songs available yet. Try making a song!"),
			);
		}

		for (const song of songs) {
			const versionMenu: HTMLSelectElement = select({});

			for (const version of song.versions) {
				versionMenu.appendChild(
					option(
						{ value: version.time },
						`${version.name}: ${new Date(version.time).toLocaleString()}`,
					),
				);
			}

			const player: HTMLIFrameElement = iframe({ class: "recoveryPlayer" });
			player.src = `player/${OFFLINE ? "index.html" : ""}#song=${window.localStorage.getItem(versionToKey(song.versions[0]))}`;
			const container: HTMLDivElement = div(
				{ class: "recoveryRow" },
				div({ class: "selectContainer recoverySelectRow" }, versionMenu),
				player,
			);
			this._songContainer.appendChild(container);

			versionMenu.addEventListener("change", () => {
				const version: RecoveredVersion = song.versions[versionMenu.selectedIndex];
				player.contentWindow!.location.replace(
					`player/${OFFLINE ? "index.html" : ""}#song=${window.localStorage.getItem(versionToKey(version))}`,
				);
				player.contentWindow!.dispatchEvent(new Event("hashchange"));
			});
		}
	}

	protected override _saveChanges(): void {
		// No changes to save
	}
}
