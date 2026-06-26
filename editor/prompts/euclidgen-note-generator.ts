// Euclidgen Note Generator
//
// Purpose: Generates and applies Euclidean rhythm notes to song patterns
//
// This module:
// - Maps Euclidean rhythm patterns onto song time grid
// - Creates Note objects with correct positioning and pin interpolation
// - Merges new notes with existing pattern notes
// - Applies changes via ChangeGroup

import { makeNotePin, Note, type NotePin, type Pattern } from "../../synth";
import { Config } from "../../synth/synth-config";
import {
	ChangeEnsurePatternExists,
	ChangeInsertBars,
	ChangeNoteAdded,
	ChangePatternNumbers,
} from "../changes";
import { ChangeGroup } from "../core/change";
import type { SongDocument } from "../song-document";
import type { Sequence } from "./euclidgen-algorithm";

export function generateAndApplyEuclideanNotes(
	doc: SongDocument,
	sequences: Sequence[],
	generatedSequences: number[][],
	startBar: number,
	barAmount: number,
): void {
	const group: ChangeGroup = new ChangeGroup();
	const beatsPerBar: number = doc.song.beatsPerBar;
	const partsPerBeat: number = Config.partsPerBeat;
	const partsPerBar: number = partsPerBeat * beatsPerBar;
	const firstBar: number = startBar;
	const lastBar: number = firstBar + barAmount;

	if (lastBar > doc.song.barCount) {
		const existing: number = doc.song.barCount - firstBar;
		const remaining: number = barAmount - existing;
		group.append(new ChangeInsertBars(doc, doc.song.barCount, remaining));
	}

	type ResultingSequence = Note[];
	type ResultingBar = ResultingSequence[];
	type ResultingChannel = ResultingBar[];
	const allNewNotesByChannel: Map<number, ResultingChannel> = new Map();
	const pitchesToBeGenerated: Map<number, boolean> = new Map();

	for (let bar: number = firstBar; bar < lastBar; bar++) {
		const relativeBar: number = bar - firstBar;
		const partOffset: number = relativeBar * partsPerBar;

		for (let sequenceIndex: number = 0; sequenceIndex < sequences.length; sequenceIndex++) {
			const sequence: Sequence = sequences[sequenceIndex];
			const generatedSequence: number[] = generatedSequences[sequenceIndex];
			const hasGeneratedSequence: boolean = generatedSequence.length > 0;
			if (!hasGeneratedSequence) continue;
			const steps: number = sequence.steps;
			if (generatedSequence.length !== steps) continue;
			const stepSize: number = sequence.stepSizeNumerator / sequence.stepSizeDenominator;
			const pitch: number = sequence.pitch;
			const channelIndex: number = sequence.channel;
			const invert: boolean = sequence.invert;
			const on: number = invert ? 0 : 1;
			const generateFadingNotes: boolean = sequence.generateFadingNotes;
			pitchesToBeGenerated.set(pitch, true);
			let resultingChannel: ResultingChannel | undefined =
				allNewNotesByChannel.get(channelIndex);
			if (resultingChannel === undefined) {
				resultingChannel = [];
				for (let i: number = 0; i < barAmount; i++) {
					const newResultingBar: ResultingBar = [];
					for (let j: number = 0; j < sequences.length; j++) {
						newResultingBar.push([]);
					}
					resultingChannel.push(newResultingBar);
				}
				allNewNotesByChannel.set(channelIndex, resultingChannel);
			}
			const resultingBar: ResultingBar = resultingChannel[relativeBar];
			const resultingSequence: ResultingSequence = resultingBar[sequenceIndex];
			const firstStep: number = Math.floor((beatsPerBar * relativeBar) / stepSize);
			const lastStep: number = Math.ceil((beatsPerBar * (relativeBar + 1)) / stepSize);
			for (let step: number = firstStep; step < lastStep; step++) {
				let continuesLastPattern: boolean = false;
				let needToAdjustPins: boolean = false;
				const rawStepPartStart: number =
					Math.floor(step * partsPerBeat * stepSize) - partOffset;
				const rawStepPartEnd: number =
					Math.floor((step + 1) * partsPerBeat * stepSize) - partOffset;
				if (rawStepPartStart < 0) continuesLastPattern = true;
				if (continuesLastPattern || rawStepPartEnd > partsPerBar) needToAdjustPins = true;
				const stepPartStart: number = Math.max(0, Math.min(partsPerBar, rawStepPartStart));
				const stepPartEnd: number = Math.max(0, Math.min(partsPerBar, rawStepPartEnd));
				if (generatedSequence[step % steps] === on) {
					const note: Note = new Note(
						pitch,
						stepPartStart,
						stepPartEnd,
						Config.noteSizeMax,
						generateFadingNotes,
					);
					if (continuesLastPattern) note.continuesLastPattern = true;
					if (needToAdjustPins && generateFadingNotes) {
						const startRatio: number =
							(stepPartStart - rawStepPartStart) /
							(rawStepPartEnd - rawStepPartStart);
						const startPinSize: number = Math.round(
							Config.noteSizeMax + (0 - Config.noteSizeMax) * startRatio,
						);
						note.pins[0].size = startPinSize;
						const endRatio: number =
							(stepPartEnd - rawStepPartStart) / (rawStepPartEnd - rawStepPartStart);
						const endPinSize: number = Math.round(
							Config.noteSizeMax + (0 - Config.noteSizeMax) * endRatio,
						);
						note.pins[1].size = endPinSize;
					}
					resultingSequence.push(note);
				}
			}
		}
	}

	for (const [channelIndex, resultingChannel] of allNewNotesByChannel.entries()) {
		for (
			let resultingBarIndex: number = 0;
			resultingBarIndex < resultingChannel.length;
			resultingBarIndex++
		) {
			const resultingBar: ResultingBar = resultingChannel[resultingBarIndex];
			const bar: number = resultingBarIndex + firstBar;
			let oldNotes: Note[] = [];
			const oldPattern: Pattern | null = doc.song.getPattern(channelIndex, bar);
			if (oldPattern != null) oldNotes = oldPattern.cloneNotes();
			group.append(new ChangePatternNumbers(doc, 0, bar, channelIndex, 1, 1));
			group.append(new ChangeEnsurePatternExists(doc, channelIndex, bar));
			const pattern: Pattern | null = doc.song.getPattern(channelIndex, bar);
			if (pattern == null) throw new Error("Couldn't create new pattern");
			const merged: Note[] = [];
			for (
				let oldNoteIndex: number = oldNotes.length - 1;
				oldNoteIndex >= 0;
				oldNoteIndex--
			) {
				const oldNote: Note = oldNotes[oldNoteIndex];
				const newPitches: number[] = [];
				for (const oldPitch of oldNote.pitches) {
					if (!pitchesToBeGenerated.has(oldPitch)) newPitches.push(oldPitch);
				}
				oldNote.pitches = newPitches;
				if (oldNote.pitches.length < 1) oldNotes.splice(oldNoteIndex, 1);
			}
			interface MergeableEvent {
				noteType: "old" | "new";
				eventType: "start" | "end";
				part: number;
				note: Note;
			}
			const timeline: MergeableEvent[] = [];
			for (const note of oldNotes) {
				timeline.push({
					noteType: "old",
					eventType: "start",
					part: note.start,
					note: note,
				});
				timeline.push({ noteType: "old", eventType: "end", part: note.end, note: note });
			}
			for (const resultingSequence of resultingBar) {
				for (const note of resultingSequence) {
					timeline.push({
						noteType: "new",
						eventType: "start",
						part: note.start,
						note: note,
					});
					timeline.push({
						noteType: "new",
						eventType: "end",
						part: note.end,
						note: note,
					});
				}
			}
			timeline.sort((a, b) => a.part - b.part);
			interface MergeableEventGroup {
				part: number;
				events: MergeableEvent[];
			}
			const eventGroups: MergeableEventGroup[] = [];
			let currentEventGroup: MergeableEventGroup | null = null;
			for (const event of timeline) {
				if (currentEventGroup == null) {
					currentEventGroup = { part: event.part, events: [event] };
				} else {
					if (event.part !== currentEventGroup.part) {
						eventGroups.push(currentEventGroup);
						currentEventGroup = { part: event.part, events: [event] };
					} else {
						currentEventGroup.events.push(event);
					}
				}
			}
			if (currentEventGroup != null) eventGroups.push(currentEventGroup);
			interface MergeableNote {
				noteType: "old" | "new";
				note: Note;
			}
			const heldNotes: MergeableNote[] = [];
			let mergedStartPart: number = 0;
			let mergedEndPart: number = 0;
			const notesToDrop: Set<Note> = new Set();
			const notesToAdd: MergeableNote[] = [];
			const setOfPitchesToCommit: Set<number> = new Set();
			for (const eventGroup of eventGroups) {
				if (heldNotes.length === 0) {
					for (const event of eventGroup.events) {
						if (event.eventType === "start")
							heldNotes.push({ noteType: event.noteType, note: event.note });
					}
					mergedStartPart = eventGroup.part;
				} else {
					for (const event of eventGroup.events) {
						if (event.eventType === "end") notesToDrop.add(event.note);
						else if (event.eventType === "start")
							notesToAdd.push({ noteType: event.noteType, note: event.note });
					}
					mergedEndPart = eventGroup.part;
					const mergedNote: Note = new Note(
						0,
						mergedStartPart,
						mergedEndPart,
						Config.noteSizeMax,
						false,
					);
					let continuesLastPattern: boolean = false;
					let theNewNote: Note | null = null;
					let theOldNote: Note | null = null;
					for (const mergeableNote of heldNotes) {
						const note: Note = mergeableNote.note;
						for (const candidatePitch of note.pitches)
							setOfPitchesToCommit.add(candidatePitch);
						if (note.continuesLastPattern) continuesLastPattern = true;
						if (mergeableNote.noteType === "new") {
							if (
								theNewNote == null ||
								mergeableNote.note.start > theNewNote.start ||
								mergeableNote.note.end < theNewNote.end
							)
								theNewNote = mergeableNote.note;
						} else if (mergeableNote.noteType === "old") {
							theOldNote = mergeableNote.note;
						}
					}
					mergedNote.pitches = Array.from(setOfPitchesToCommit).sort((a, b) => a - b);
					mergedNote.continuesLastPattern = continuesLastPattern;
					if (theNewNote != null) {
						const startRatio: number =
							(mergedStartPart - theNewNote.start) /
							(theNewNote.end - theNewNote.start);
						const startPinSize: number = Math.round(
							theNewNote.pins[0].size +
								(theNewNote.pins[1].size - theNewNote.pins[0].size) * startRatio,
						);
						mergedNote.pins[0].size = startPinSize;
						const endRatio: number =
							(mergedEndPart - theNewNote.start) /
							(theNewNote.end - theNewNote.start);
						const endPinSize: number = Math.round(
							theNewNote.pins[0].size +
								(theNewNote.pins[1].size - theNewNote.pins[0].size) * endRatio,
						);
						mergedNote.pins[1].size = endPinSize;
					} else if (theOldNote != null) {
						const mergedNoteLength: number = mergedEndPart - mergedStartPart;
						const mergedStartRelativeToOldStart: number =
							mergedStartPart - theOldNote.start;
						const mergedEndRelativeToOldStart: number =
							mergedEndPart - theOldNote.start;
						const newPins: NotePin[] = [];
						let firstVisibleOldPinIndex: number = -1;
						let lastVisibleOldPinIndex: number = -1;
						let leftAdjacentOldPinIndex: number = 0;
						let rightAdjacentOldPinIndex: number = theOldNote.pins.length - 1;
						for (
							let oldPinIndex = 0;
							oldPinIndex < theOldNote.pins.length;
							oldPinIndex++
						) {
							const oldPin: NotePin = theOldNote.pins[oldPinIndex];
							if (oldPin.time < mergedStartRelativeToOldStart)
								leftAdjacentOldPinIndex = oldPinIndex;
							else if (
								oldPin.time >= mergedStartRelativeToOldStart &&
								oldPin.time <= mergedEndRelativeToOldStart
							) {
								if (firstVisibleOldPinIndex === -1)
									firstVisibleOldPinIndex = oldPinIndex;
								lastVisibleOldPinIndex = oldPinIndex;
							} else if (oldPin.time > mergedEndRelativeToOldStart) {
								rightAdjacentOldPinIndex = oldPinIndex;
								break;
							}
						}
						if (firstVisibleOldPinIndex !== -1) {
							for (
								let visibleOldPinIndex: number = firstVisibleOldPinIndex;
								visibleOldPinIndex <= lastVisibleOldPinIndex;
								visibleOldPinIndex++
							) {
								const visibleOldPin: NotePin = theOldNote.pins[visibleOldPinIndex];
								newPins.push(
									makeNotePin(
										0,
										visibleOldPin.time - mergedStartRelativeToOldStart,
										visibleOldPin.size,
									),
								);
							}
							const firstNewPin: NotePin = newPins[0];
							const lastNewPin: NotePin = newPins[newPins.length - 1];
							if (firstNewPin.time !== 0) {
								const leftAdjacentOldPin: NotePin =
									theOldNote.pins[leftAdjacentOldPinIndex];
								const ratio: number =
									(mergedStartRelativeToOldStart - leftAdjacentOldPin.time) /
									(firstNewPin.time +
										(mergedStartRelativeToOldStart - leftAdjacentOldPin.time));
								newPins.unshift(
									makeNotePin(
										0,
										0,
										Math.round(
											leftAdjacentOldPin.size +
												(firstNewPin.size - leftAdjacentOldPin.size) *
													ratio,
										),
									),
								);
							}
							if (lastNewPin.time !== mergedNoteLength) {
								const rightAdjacentOldPin: NotePin =
									theOldNote.pins[rightAdjacentOldPinIndex];
								const ratio: number =
									(mergedEndRelativeToOldStart -
										(lastNewPin.time + mergedStartRelativeToOldStart)) /
									(rightAdjacentOldPin.time -
										mergedEndRelativeToOldStart +
										(mergedEndRelativeToOldStart -
											(lastNewPin.time + mergedStartRelativeToOldStart)));
								newPins.push(
									makeNotePin(
										0,
										mergedNoteLength,
										Math.round(
											lastNewPin.size +
												(rightAdjacentOldPin.size - lastNewPin.size) *
													ratio,
										),
									),
								);
							}
						} else {
							const leftAdjacentOldPin: NotePin =
								theOldNote.pins[leftAdjacentOldPinIndex];
							const rightAdjacentOldPin: NotePin =
								theOldNote.pins[rightAdjacentOldPinIndex];
							const lineLength: number =
								rightAdjacentOldPin.time - leftAdjacentOldPin.time;
							newPins.push(
								makeNotePin(
									0,
									0,
									Math.round(
										leftAdjacentOldPin.size +
											(rightAdjacentOldPin.size - leftAdjacentOldPin.size) *
												((mergedStartRelativeToOldStart -
													leftAdjacentOldPin.time) /
													lineLength),
									),
								),
							);
							newPins.push(
								makeNotePin(
									0,
									mergedNoteLength,
									Math.round(
										leftAdjacentOldPin.size +
											(rightAdjacentOldPin.size - leftAdjacentOldPin.size) *
												((mergedEndRelativeToOldStart -
													leftAdjacentOldPin.time) /
													lineLength),
									),
								),
							);
						}
						mergedNote.pins = newPins;
					}
					merged.push(mergedNote);
					for (const note of notesToDrop) {
						for (
							let heldNoteIndex = heldNotes.length - 1;
							heldNoteIndex >= 0;
							heldNoteIndex--
						) {
							if (note === heldNotes[heldNoteIndex].note)
								heldNotes.splice(heldNoteIndex, 1);
						}
					}
					for (const note of notesToAdd) heldNotes.push(note);
					setOfPitchesToCommit.clear();
					notesToDrop.clear();
					notesToAdd.length = 0;
					mergedStartPart = mergedEndPart;
				}
			}
			pattern.notes = [];
			for (let noteIndex = 0; noteIndex < merged.length; noteIndex++)
				group.append(new ChangeNoteAdded(doc, pattern, merged[noteIndex], noteIndex));
		}
	}
	doc.record(group);
}
