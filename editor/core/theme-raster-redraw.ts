// Theme Raster Redraw
//
// Purpose: Routes page-global theme changes to live SongEditor raster owners
//
// This module:
// - keeps only weak references to SongEditor raster owners
// - prunes dead owners while synchronously redrawing live owners

import { events } from "../../shared/events";

export interface ThemeRasterRedrawOwner {
	redrawThemeRasters(): void;
}

interface ThemeRasterOwnerReference {
	deref(): ThemeRasterRedrawOwner | undefined;
}

type ThemeRasterOwnerReferenceFactory = (
	owner: ThemeRasterRedrawOwner,
) => ThemeRasterOwnerReference;

export class ThemeRasterRedrawRegistry {
	private readonly _owners = new Set<ThemeRasterOwnerReference>();

	constructor(
		private readonly _makeReference: ThemeRasterOwnerReferenceFactory = (owner) =>
			new WeakRef(owner),
	) {}

	public register(owner: ThemeRasterRedrawOwner): void {
		this._owners.add(this._makeReference(owner));
	}

	public redrawAndPrune(): void {
		for (const reference of this._owners) {
			const owner = reference.deref();
			if (owner === undefined) {
				this._owners.delete(reference);
				continue;
			}
			owner.redrawThemeRasters();
		}
	}

	public get ownerReferenceCount(): number {
		return this._owners.size;
	}
}

const songEditorThemeRasterRegistry = new ThemeRasterRedrawRegistry();

events.listen("themeChange", () => {
	songEditorThemeRasterRegistry.redrawAndPrune();
});

export function registerSongEditorThemeRasterOwner(owner: ThemeRasterRedrawOwner): void {
	songEditorThemeRasterRegistry.register(owner);
}
