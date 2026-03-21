// Changes - Util
//
// Purpose: Shared utility functions for editor change operations
//
// This module:
// - Provides pattern instrument validation and union operations
// - Implements scale map generation, pattern deduplication, and note projection
// - Generates random waveforms for instrument creation

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { Config } from "../../synth/SynthConfig";
import { NotePin, Note, makeNotePin, Pattern, Song, Synth, clamp } from "../../synth";

export function patternsContainSameInstruments(pattern1Instruments: number[], pattern2Instruments: number[]): boolean {
    const pattern2Has1Instruments: boolean = pattern1Instruments.every(instrument => pattern2Instruments.indexOf(instrument) != -1);
    const pattern1Has2Instruments: boolean = pattern2Instruments.every(instrument => pattern1Instruments.indexOf(instrument) != -1);
    return pattern2Has1Instruments && pattern1Has2Instruments && pattern2Instruments.length == pattern1Instruments.length;
}

export function discardInvalidPatternInstruments(instruments: number[], song: Song, channelIndex: number) {
    const uniqueInstruments: Set<number> = new Set(instruments);
    instruments.length = 0;
    instruments.push(...uniqueInstruments);
    for (let i: number = 0; i < instruments.length; i++) {
        if (instruments[i] >= song.channels[channelIndex].instruments.length) {
            instruments.splice(i, 1);
            i--;
        }
    }
    if (instruments.length > song.getMaxInstrumentsPerPattern(channelIndex)) {
        instruments.length = song.getMaxInstrumentsPerPattern(channelIndex);
    }
    if (instruments.length <= 0) {
        instruments[0] = 0;
    }
}

export function unionOfUsedNotes(pattern: Pattern, flags: boolean[]): void {
    for (const note of pattern.notes) {
        for (const pitch of note.pitches) {
            for (const pin of note.pins) {
                const key: number = (pitch + pin.interval) % 12;
                if (!flags[key]) {
                    flags[key] = true;
                }
            }
        }
    }
}

export function generateScaleMap(oldScaleFlags: ReadonlyArray<boolean>, newScaleValue: number, customScaleFlags: ReadonlyArray<boolean>): number[] {
    const newScaleFlags: ReadonlyArray<boolean> = newScaleValue == Config.scales["dictionary"]["Custom"].index ? customScaleFlags : Config.scales[newScaleValue].flags;
    const oldScale: number[] = [];
    const newScale: number[] = [];
    for (let i: number = 0; i < 12; i++) {
        if (oldScaleFlags[i]) oldScale.push(i);
        if (newScaleFlags[i]) newScale.push(i);
    }
    const largerToSmaller: boolean = oldScale.length > newScale.length;
    const smallerScale: number[] = largerToSmaller ? newScale : oldScale;
    const largerScale: number[] = largerToSmaller ? oldScale : newScale;

    const roles: string[] = ["root", "second", "second", "third", "third", "fourth", "tritone", "fifth", "sixth", "sixth", "seventh", "seventh", "root"];
    let bestScore: number = Number.MAX_SAFE_INTEGER;
    let bestIndexMap: number[] = [];
    const stack: number[][] = [[0]]; // Root always maps to root.

    while (stack.length > 0) {
        const indexMap: number[] = stack.pop()!;

        if (indexMap.length == smallerScale.length) {
            // Score this mapping.
            let score: number = 0;
            for (let i: number = 0; i < indexMap.length; i++) {
                score += Math.abs(smallerScale[i] - largerScale[indexMap[i]]);
                if (roles[smallerScale[i]] != roles[largerScale[indexMap[i]]]) {
                    // Penalize changing roles.
                    score += 0.75;
                }
            }
            if (bestScore > score) {
                bestScore = score;
                bestIndexMap = indexMap;
            }
        } else {
            // Recursively choose next indices for mapping.
            const lowIndex: number = indexMap[indexMap.length - 1] + 1;
            const highIndex: number = largerScale.length - smallerScale.length + indexMap.length;
            for (let i: number = lowIndex; i <= highIndex; i++) {
                stack.push(indexMap.concat(i));
            }
        }
    }

    const sparsePitchMap: number[][] = [];
    for (let i: number = 0; i < bestIndexMap.length; i++) {
        const smallerScalePitch = smallerScale[i];
        const largerScalePitch = largerScale[bestIndexMap[i]];
        sparsePitchMap[i] = largerToSmaller
            ? [largerScalePitch, smallerScalePitch]
            : [smallerScalePitch, largerScalePitch];
    }

    // To make it easier to wrap around.
    sparsePitchMap.push([12, 12]);
    newScale.push(12);

    let sparseIndex: number = 0;
    const fullPitchMap: number[] = [];
    for (let i: number = 0; i < 12; i++) {
        const oldLow: number = sparsePitchMap[sparseIndex][0];
        const newLow: number = sparsePitchMap[sparseIndex][1];
        const oldHigh: number = sparsePitchMap[sparseIndex + 1][0];
        const newHigh: number = sparsePitchMap[sparseIndex + 1][1];
        if (i == oldHigh - 1) sparseIndex++;

        const transformedPitch: number = (i - oldLow) * (newHigh - newLow) / (oldHigh - oldLow) + newLow;

        let nearestPitch: number = 0;
        let nearestPitchDistance: number = Number.MAX_SAFE_INTEGER;
        for (const newPitch of newScale) {
            let distance: number = Math.abs(newPitch - transformedPitch);
            if (roles[newPitch] != roles[i]) {
                // Again, penalize changing roles.
                distance += 0.1;
            }
            if (nearestPitchDistance > distance) {
                nearestPitchDistance = distance;
                nearestPitch = newPitch;
            }
        }

        fullPitchMap[i] = nearestPitch;
    }

    return fullPitchMap;
}

export function removeRedundantPins(pins: NotePin[]): void {
    for (let i: number = 1; i < pins.length - 1;) {
        if (pins[i - 1].interval == pins[i].interval &&
            pins[i].interval == pins[i + 1].interval &&
            pins[i - 1].size == pins[i].size &&
            pins[i].size == pins[i + 1].size) {
            pins.splice(i, 1);
        } else {
            i++;
        }
    }
}

export function projectNoteIntoBar(oldNote: Note, timeOffset: number, noteStartPart: number, noteEndPart: number, newNotes: Note[]): void {
    // Create a new note, and interpret the pitch bend and size events
    // to determine where we need to insert pins to control interval and volume.
    const newNote: Note = new Note(-1, noteStartPart, noteEndPart, Config.noteSizeMax, false);
    newNote.pins.length = 0;
    newNote.pitches.length = 0;
    const newNoteLength: number = noteEndPart - noteStartPart;

    for (const pitch of oldNote.pitches) {
        newNote.pitches.push(pitch);
    }

    for (let pinIndex: number = 0; pinIndex < oldNote.pins.length; pinIndex++) {
        const pin: NotePin = oldNote.pins[pinIndex];
        const newPinTime: number = pin.time + timeOffset;
        if (newPinTime < 0) {
            if (pinIndex + 1 >= oldNote.pins.length) throw new Error("Error converting pins in note overflow.");
            const nextPin: NotePin = oldNote.pins[pinIndex + 1];
            const nextPinTime: number = nextPin.time + timeOffset;
            if (nextPinTime > 0) {
                // Insert an interpolated pin at the start of the new note.
                const ratio: number = (-newPinTime) / (nextPinTime - newPinTime);
                newNote.pins.push(makeNotePin(Math.round(pin.interval + ratio * (nextPin.interval - pin.interval)), 0, Math.round(pin.size + ratio * (nextPin.size - pin.size))));

            }
        } else if (newPinTime <= newNoteLength) {
            newNote.pins.push(makeNotePin(pin.interval, newPinTime, pin.size));
        } else {
            if (pinIndex < 1) throw new Error("Error converting pins in note overflow.");
            const prevPin: NotePin = oldNote.pins[pinIndex - 1];
            const prevPinTime: number = prevPin.time + timeOffset;
            if (prevPinTime < newNoteLength) {
                // Insert an interpolated pin at the end of the new note.
                const ratio: number = (newNoteLength - prevPinTime) / (newPinTime - prevPinTime);
                newNote.pins.push(makeNotePin(Math.round(prevPin.interval + ratio * (pin.interval - prevPin.interval)), newNoteLength, Math.round(prevPin.size + ratio * (pin.size - prevPin.size))));
            }
        }
    }

    // Fix from Jummbus: Ensure the first pin's interval is zero, adjust pitches and pins to compensate.
    const offsetInterval: number = newNote.pins[0].interval;
    for (let pitchIdx: number = 0; pitchIdx < newNote.pitches.length; pitchIdx++) {
        newNote.pitches[pitchIdx] += offsetInterval;
    }
    for (let pinIdx: number = 0; pinIdx < newNote.pins.length; pinIdx++) {
        newNote.pins[pinIdx].interval -= offsetInterval;
    }

    let joinedWithPrevNote: boolean = false;
    if (newNote.start == 0) {
        newNote.continuesLastPattern = (timeOffset < 0 || oldNote.continuesLastPattern);
    } else {
        newNote.continuesLastPattern = false;
        if (newNotes.length > 0 && oldNote.continuesLastPattern) {
            const prevNote: Note = newNotes[newNotes.length - 1];
            if (prevNote.end == newNote.start && Synth.adjacentNotesHaveMatchingPitches(prevNote, newNote)) {
                joinedWithPrevNote = true;
                const newIntervalOffset: number = prevNote.pins[prevNote.pins.length - 1].interval;
                const newTimeOffset: number = prevNote.end - prevNote.start;
                for (let pinIndex: number = 1; pinIndex < newNote.pins.length; pinIndex++) {
                    const tempPin: NotePin = newNote.pins[pinIndex];
                    const transformedPin: NotePin = makeNotePin(tempPin.interval + newIntervalOffset, tempPin.time + newTimeOffset, tempPin.size);
                    prevNote.pins.push(transformedPin);
                    prevNote.end = prevNote.start + transformedPin.time;
                }
                removeRedundantPins(prevNote.pins);
            }
        }
    }
    if (!joinedWithPrevNote) {
        newNotes.push(newNote);
    }
}

export function mod(a: number, b: number): number {
    return (a % b + b) % b;
}

export function sigma(a: number, b: (i: number) => number, c: number): number {
    let result = 0;
    for (let i = c; i <= a; i++) {
        result += b(i);
    }
    return result;
}

// Custom chip generation functions.
export function randomSineWave(wave: Float32Array): void {
    const randomRoundWave: Float32Array = new Float32Array(64);
    const waveLength: number = 64;
    let foundNonZero = false;
    const roundedWaveType: number = (Math.random() * 2 + 1) | 0;
    if (roundedWaveType == 1 || roundedWaveType == 3) {
        const randomNumber1 = Math.random() * 2 + 0.5;
        const randomNumber2 = Math.random() * 13 + 3;
        const randomNumber3 = Math.random() * 48 - 24;
        for (let i = 0; i < waveLength; i++) {
            randomRoundWave[i] = clamp(-24, 24 + 1, Math.round(mod(randomNumber3 + ((Math.sin((i + randomNumber3) / randomNumber2) * 24) + i * randomNumber1), 48) - 24));
        }
    } else if (roundedWaveType == 2) {
        const randomNumber1 = Math.random() * 0.19 + 0.06;
        const randomNumber2 = Math.random() * 2 + 1;
        const randomNumber3 = Math.random() * 48 - 24;
        const randomNumber4 = Math.random() * 2 - 1;
        for (let i = 0; i < waveLength; i++) {
            randomRoundWave[i] = clamp(-24, 24 + 1, Math.round(randomNumber4 * Math.abs(2 * Math.floor((Math.sin((i / randomNumber2) * randomNumber1 + randomNumber3) * Math.cos((i * randomNumber2) * (randomNumber1 / 2)) * 24))) - randomNumber4 * 24));
        }
    }
    for (let i = 0; i < waveLength; i++) {
        wave[i] = randomRoundWave[i];
        let minimum = Infinity;
        let maximum = -Infinity;
        for (let i = 0; i < waveLength; i++) {
            minimum = Math.min(minimum, wave[i]);
            maximum = Math.max(maximum, wave[i]);
        }
        const distance = maximum - minimum;
        if (distance >= 7) {
            foundNonZero = true;
        }
    }
    if (!foundNonZero) randomSineWave(wave);
}
export function randomPulses(wave: Float32Array): void {
    const randomPulse: Float32Array = new Float32Array(64);
    const waveLength: number = 64;
    let foundNonZero = false;
    const randomNumber2 = Math.round(Math.random() * 15 + 15);
    const randomNumber3 = Math.round(Math.random() * 3 + 1);
    const randomNumber4 = Math.round(Math.random() * 13 + 2);
    for (let i = 0; i < waveLength; i++) {
        const randomNumber1 = sigma(mod(i, randomNumber2), (i) => 1, randomNumber4);
        randomPulse[i] = clamp(-24, 24 + 1, Math.round(mod(24 * (sigma(i, (i) => randomNumber1, Math.round(randomNumber2 / randomNumber3))), 24.0000000000001)));
    }
    for (let i = 0; i < waveLength; i++) {
        wave[i] = randomPulse[i];
        let minimum = Infinity;
        let maximum = -Infinity;
        for (let i = 0; i < waveLength; i++) {
            minimum = Math.min(minimum, wave[i]);
            maximum = Math.max(maximum, wave[i]);
        }
        const distance = maximum - minimum;
        if (distance >= 7) {
            foundNonZero = true;
        }
    }
    if (!foundNonZero) randomPulses(wave);
}
export function randomChipWave(wave: Float32Array): void {
    const randomChip: Float32Array = new Float32Array(64);
    const waveLength: number = 64;
    let foundNonZero = false;
    const chipType: number = (Math.random() * 2 + 1) | 0;
    if (chipType == 1) {
        const randomNumber1 = Math.random() * 3;
        const randomNumber2 = Math.random() * 0.99 - 1;
        const randomNumber3 = Math.random() * 9 + 2;
        const randomNumber4 = Math.random() * 2 - 1;
        for (let i = 0; i < waveLength; i++) {
            randomChip[i] = clamp(-24, 24 + 1, (Math.round(Math.abs(randomNumber4 * mod(((randomNumber2 / randomNumber3) * randomNumber3) + (sigma(i / (randomNumber1 * randomNumber1), (i) => randomNumber3, randomNumber1 * -randomNumber2)) * randomNumber4, 24)))) * 2 - 24);
        }
    } else if (chipType == 2) {
        const randomNumber1 = Math.random() * 3;
        const randomNumber2 = Math.random() * 2 - 1;
        const randomNumber3 = Math.random() * 100;
        for (let i = 0; i < waveLength; i++) {
            randomChip[i] = clamp(-24, 24 + 1, mod(Math.round(mod((sigma(i / randomNumber1, (i) => (randomNumber1 * randomNumber3), 0)), 25 + randomNumber2) * 24), 48) - 24);
        }
    }
    for (let i = 0; i < waveLength; i++) {
        wave[i] = randomChip[i];
        let minimum = Infinity;
        let maximum = -Infinity;
        for (let i = 0; i < waveLength; i++) {
            minimum = Math.min(minimum, wave[i]);
            maximum = Math.max(maximum, wave[i]);
        }
        const distance = maximum - minimum;
        if (distance >= 7) {
            foundNonZero = true;
        }
    }
    if (!foundNonZero) randomChipWave(wave);
}
export function biasedFullyRandom(wave: Float32Array): void {
    const fullyRandomWave: Float32Array = new Float32Array(64);
    const waveLength: number = 64;
    let foundNonZero = false;
    for (let i: number = 0; i < waveLength; i++) {
        const v = Math.random() * 2 - 1;
        const bias = 6;
        const biased = v > 0 ? Math.pow(v, bias) : -Math.pow(-v, bias);
        fullyRandomWave[i] = clamp(-24, 24 + 1, Math.floor(biased * 24));
    }
    for (let i = 0; i < waveLength; i++) {
        wave[i] = fullyRandomWave[i];
        let minimum = Infinity;
        let maximum = -Infinity;
        for (let i = 0; i < waveLength; i++) {
            minimum = Math.min(minimum, wave[i]);
            maximum = Math.max(maximum, wave[i]);
        }
        const distance = maximum - minimum;
        if (distance >= 7) {
            foundNonZero = true;
        }
    }
    if (!foundNonZero) biasedFullyRandom(wave);
}
export function fullyRandom(wave: Float32Array): void {
    const fullyRandomWave: Float32Array = new Float32Array(64);
    const waveLength: number = 64;
    for (let i: number = 0; i < waveLength; i++) {
        fullyRandomWave[i] = clamp(-24, 24 + 1, ((Math.random() * 48) | 0) - 24);
    }
    for (let i = 0; i < waveLength; i++) {
        wave[i] = fullyRandomWave[i];
    }
}

export function comparePatternNotes(a: Note[], b: Note[]): boolean {
    if (a.length != b.length) return false;

    for (let noteIndex: number = 0; noteIndex < a.length; noteIndex++) {
        const oldNote: Note = a[noteIndex];
        const newNote: Note = b[noteIndex];
        if (newNote.start != oldNote.start || newNote.end != oldNote.end || newNote.pitches.length != oldNote.pitches.length || newNote.pins.length != oldNote.pins.length) {
            return false;
        }

        for (let pitchIndex: number = 0; pitchIndex < oldNote.pitches.length; pitchIndex++) {
            if (newNote.pitches[pitchIndex] != oldNote.pitches[pitchIndex]) {
                return false;
            }
        }

        for (let pinIndex: number = 0; pinIndex < oldNote.pins.length; pinIndex++) {
            if (newNote.pins[pinIndex].interval != oldNote.pins[pinIndex].interval || newNote.pins[pinIndex].time != oldNote.pins[pinIndex].time || newNote.pins[pinIndex].size != oldNote.pins[pinIndex].size) {
                return false;
            }
        }
    }

    return true;
}
