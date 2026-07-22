// SongRecoveryPrompt
//
// Purpose: Provides dialog for browsing and restoring song recovery snapshots
//
// This module:
// - Lists available recovery snapshots with timestamps
// - Handles snapshot selection and restoration

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "../../shared/color-config";
import { events } from "../../shared/events";
import { createPlayerThemeSyncMessage } from "../../shared/player-theme-sync";
import { SongDataError } from "../../synth";
import { ChangeSong } from "../changes";
import {
	errorAlert,
	type QuarantinedSong,
	type RecoveredSong,
	type RecoveredVersion,
	SongRecovery,
	versionToKey,
} from "../io/song-recovery";
import type { SongDocument } from "../song-document";
import { BasePrompt } from "./base-prompt";
import { save } from "./save";

const { button, div, h2, p, select, option, iframe } = HTML;

export class SongRecoveryPrompt extends BasePrompt {
	private readonly _songContainer: HTMLDivElement = div();
	private readonly _players = new Set<HTMLIFrameElement>();
	private readonly _syncPlayerThemes = (): void => {
		for (const player of this._players) this._syncPlayerTheme(player);
	};

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
		const quarantinedSongs: QuarantinedSong[] = SongRecovery.getQuarantinedSongs();

		if (songs.length === 0 && quarantinedSongs.length === 0) {
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
			player.src = `player/index.html#song=${window.localStorage.getItem(versionToKey(song.versions[0]))}`;
			this._players.add(player);
			player.addEventListener("load", this._syncLoadedPlayerTheme);
			const restoreButton: HTMLButtonElement = button({ type: "button" }, "Restore");
			const container: HTMLDivElement = div(
				{ class: "recoveryRow recoveryPreviewRow" },
				div({ class: "selectContainer recoverySelectRow" }, versionMenu),
				player,
				restoreButton,
			);
			this._songContainer.appendChild(container);

			restoreButton.addEventListener("click", () => {
				const version: RecoveredVersion = song.versions[versionMenu.selectedIndex];
				const raw: string | null = window.localStorage.getItem(versionToKey(version));
				if (raw == null) return;
				try {
					doc.record(new ChangeSong(doc, raw), false, true);
					this._close();
				} catch (error) {
					if (!(error instanceof SongDataError)) throw error;
					SongRecovery.quarantine("recovery", raw, version, error);
					errorAlert(error);
				}
			});

			versionMenu.addEventListener("change", () => {
				const version: RecoveredVersion = song.versions[versionMenu.selectedIndex];
				player.contentWindow!.location.replace(
					`player/index.html#song=${window.localStorage.getItem(versionToKey(version))}`,
				);
				player.contentWindow!.dispatchEvent(new Event("hashchange"));
			});
		}

		events.listen("themeChange", this._syncPlayerThemes);

		for (const record of quarantinedSongs) {
			const retryButton: HTMLButtonElement = button({ type: "button" }, "Retry");
			const exportButton: HTMLButtonElement = button({ type: "button" }, "Export Raw");
			const deleteButton: HTMLButtonElement = button({ type: "button" }, "Delete");
			const row: HTMLDivElement = div(
				{ class: "recoveryRow recoveryQuarantineRow" },
				p(`Quarantined ${new Date(record.time).toLocaleString()}: ${record.error}`),
				retryButton,
				exportButton,
				deleteButton,
			);
			this._songContainer.appendChild(row);
			retryButton.addEventListener("click", () => {
				try {
					doc.record(new ChangeSong(doc, record.hash), false, true);
					SongRecovery.deleteQuarantinedSong(record.id);
					this._close();
				} catch (error) {
					if (!(error instanceof SongDataError)) throw error;
					errorAlert(error);
				}
			});
			exportButton.addEventListener("click", () => {
				save(
					new Blob([record.hash], { type: "text/plain" }),
					`quarantined-song-${record.id}.txt`,
				);
			});
			deleteButton.addEventListener("click", () => {
				SongRecovery.deleteQuarantinedSong(record.id);
				row.remove();
			});
		}
	}

	private readonly _syncLoadedPlayerTheme = (event: Event): void => {
		if (event.currentTarget instanceof HTMLIFrameElement) {
			this._syncPlayerTheme(event.currentTarget);
		}
	};

	private _syncPlayerTheme(player: HTMLIFrameElement): void {
		const target = player.contentWindow;
		if (target === null) return;
		const targetOrigin = window.location.origin === "null" ? "*" : window.location.origin;
		target.postMessage(
			createPlayerThemeSyncMessage(
				ColorConfig.currentTheme,
				ColorConfig.pmdHue,
				ColorConfig.pmdEffectiveHue,
			),
			targetOrigin,
		);
	}

	public override cleanUp(): void {
		events.unlisten("themeChange", this._syncPlayerThemes);
		for (const player of this._players) {
			player.removeEventListener("load", this._syncLoadedPlayerTheme);
		}
		this._players.clear();
		super.cleanUp();
	}

	protected override _saveChanges(): void {
		// No changes to save
	}
}
