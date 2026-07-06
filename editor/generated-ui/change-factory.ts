// change-factory.ts
//
// Purpose: Generic undoable Change class factory from ParamSchema
//
// This module:
// - Creates ChangeSetParam, a generic change for any schema-described param
// - Maps param key → instrument property write + optional mod unset
// - Drives doc.notifier.changed() + _didSomething() like all changes

import { Change } from "../core/change";
import type { SongDocument } from "../song-document";

export interface ModuleModMap {
	[key: string]: number | undefined;
}

export class ChangeSetParam extends Change {
	constructor(
		doc: SongDocument,
		paramKey: string,
		oldValue: number | boolean,
		newValue: number | boolean,
		modKey?: number,
	) {
		super();
		const instrument = doc.getCurrentInstrument();
		(instrument as unknown as Record<string, unknown>)[paramKey] = newValue;

		if (modKey !== undefined) {
			doc.synth.unsetMod(modKey, doc.channel, doc.getCurrentInstrument());
		}

		doc.notifier.changed();
		if (oldValue !== newValue) this._didSomething();
	}
}

export function createChangeForParam(
	doc: SongDocument,
	paramKey: string,
	oldValue: number | boolean,
	newValue: number | boolean,
	modMap?: ModuleModMap,
): ChangeSetParam {
	return new ChangeSetParam(doc, paramKey, oldValue, newValue, modMap?.[paramKey]);
}
