// Changes - Field Value
//
// Purpose: Generic change class for simple field value modifications
//
// This module:
// - Provides a generic ChangeFieldValue class that handles common patterns:
//   property set, clamp, maxLength, unsetMod, notifier.changed(), _didSomething()
// - Reduces duplication across ~30 simple Change subclasses

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { Change } from "../core/change";
import type { SongDocument } from "../song-document";

export interface FieldValueOptions<T> {
	/** Target object to set property on (e.g., doc.song, doc.getCurrentInstrumentObj()) */
	// biome-ignore lint/suspicious/noExplicitAny: target varies (Song, Channel, Instrument)
	target: any;
	/** Property name to set */
	property: string;
	/** Old value for undo/redo comparison */
	oldValue: T;
	/** New value to set */
	newValue: T;
	/** Optional clamp for numeric values */
	clamp?: { min: number; max: number };
	/** Optional max length for string values */
	maxLength?: number;
	/** Optional callback after setting value (e.g., update document.title) */
	afterSet?: () => void;
	/** Optional modulator key/index to unset (calls doc.synth.unsetMod) */
	unsetModKey?: number;
	/** Channel argument for unsetMod (defaults to doc.channel) */
	unsetModChannel?: number;
	/** Instrument argument for unsetMod (defaults to doc.getCurrentInstrument()) */
	unsetModInstrument?: number;
}

export class ChangeFieldValue<T> extends Change {
	constructor(doc: SongDocument, options: FieldValueOptions<T>) {
		super();
		let value = options.newValue;

		// Apply clamp for numbers
		if (options.clamp && typeof value === "number") {
			value = Math.max(
				options.clamp.min,
				Math.min(options.clamp.max, Math.round(value)),
			) as T;
		}

		// Apply max length for strings
		if (options.maxLength && typeof value === "string") {
			if (value.length > options.maxLength) {
				value = value.substring(0, options.maxLength) as T;
			}
		}

		// Set the property
		options.target[options.property] = value;

		// Unset modulator if specified
		if (options.unsetModKey !== undefined) {
			const channel = options.unsetModChannel ?? doc.channel;
			const instrument = options.unsetModInstrument ?? doc.getCurrentInstrument();
			doc.synth.unsetMod(options.unsetModKey, channel, instrument);
		}

		// Execute afterSet callback
		if (options.afterSet) {
			options.afterSet();
		}

		doc.notifier.changed();
		if (options.oldValue !== value) this._didSomething();
	}
}
