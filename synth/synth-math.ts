// synth-math
//
// Purpose: Pure math utility functions for the synth engine — volume conversion,
// amplitude curves, chord expression, LFO, and note pitch matching
//
// These were extracted from Synth static methods. They are stateless and
// operate entirely through their parameters, making them independently testable.

import type { Instrument } from "./instruments";
import type { Note } from "./notes";
import { Config } from "./synth-config";

export function getLFOAmplitude(instrument: Instrument, secondsIntoBar: number): number {
	let effect: number = 0.0;
	for (const vibratoPeriodSeconds of Config.vibratoTypes[instrument.vibratoType].periodsSeconds) {
		effect += Math.sin((Math.PI * 2.0 * secondsIntoBar) / vibratoPeriodSeconds);
	}
	return effect;
}

export function computeChordExpression(chordSize: number): number {
	return 1.0 / ((chordSize - 1) * 0.25 + 1.0);
}

export function operatorAmplitudeCurve(amplitude: number): number {
	return (16.0 ** (amplitude / 15.0) - 1.0) / 15.0;
}

export function adjacentNotesHaveMatchingPitches(firstNote: Note, secondNote: Note): boolean {
	if (firstNote.pitches.length !== secondNote.pitches.length) return false;
	const firstNoteInterval: number = firstNote.pins[firstNote.pins.length - 1].interval;
	for (const pitch of firstNote.pitches) {
		if (secondNote.pitches.indexOf(pitch + firstNoteInterval) === -1) return false;
	}
	return true;
}

export function volumeMultToInstrumentVolume(volumeMult: number): number {
	return volumeMult <= 0.0
		? -Config.volumeRange / 2
		: Math.min(Config.volumeRange, Math.log(volumeMult) / Math.LN2 / Config.volumeLogScale);
}

export function volumeMultToNoteSize(volumeMult: number): number {
	return Math.max(0.0, volumeMult) ** (1 / 1.5) * Config.noteSizeMax;
}
