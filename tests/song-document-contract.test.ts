// song-document-contract.test.ts
//
// Purpose: Guards editor position persistence across navigation and history transitions.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const songDocumentSource = readFileSync(
	new URL("../editor/song-document.ts", import.meta.url),
	"utf8",
);
const selectionSource = readFileSync(
	new URL("../editor/core/selection.ts", import.meta.url),
	"utf8",
);
const songEditorSource = readFileSync(
	new URL("../editor/song-editor.ts", import.meta.url),
	"utf8",
);

function methodBody(source: string, signature: string, nextSignature: string): string {
	const start = source.indexOf(signature);
	const end = source.indexOf(nextSignature, start);
	expect(start).toBeGreaterThanOrEqual(0);
	expect(end).toBeGreaterThan(start);
	return source.slice(start, end);
}

describe("SongDocument position persistence", () => {
	test("record persists a committed change before requestAnimationFrame", () => {
		const body = methodBody(
			songDocumentSource,
			"public record(",
			"private _resetSongRecoveryUid(",
		);
		const commit = body.indexOf("change.commit()");
		const persist = body.indexOf("this.persistCurrentPosition()");
		const deferredUpdate = body.indexOf(
			"window.requestAnimationFrame(this._updateHistoryState)",
		);

		expect(commit).toBeGreaterThanOrEqual(0);
		expect(persist).toBeGreaterThan(commit);
		expect(deferredUpdate).toBeGreaterThan(persist);
	});

	test("setChannelBar persists outside the conditional record path", () => {
		const body = methodBody(
			selectionSource,
			"public setChannelBar(",
			"public resetBoxSelection(",
		);
		const conditionalStart = body.indexOf("if (!this._doc.hasRedoHistory())");
		const record = body.indexOf("this._doc.record(", conditionalStart);
		const conditionalEnd = body.indexOf("\n\t\t}", record);
		const persist = body.indexOf("this._doc.persistCurrentPosition()");

		expect(conditionalStart).toBeGreaterThanOrEqual(0);
		expect(record).toBeGreaterThan(conditionalStart);
		expect(conditionalEnd).toBeGreaterThan(record);
		expect(persist).toBeGreaterThan(conditionalEnd);
	});

	test("playback still refreshes controls after channel navigation", () => {
		const body = methodBody(
			songEditorSource,
			"public whenUpdated =",
			"public handleModRecording(",
		);
		const instrumentRead = body.indexOf(
			"const instrumentIndex: number = this.doc.getCurrentInstrument()",
		);
		const playingGuard = body.indexOf("this.doc.synth.playing", instrumentRead);
		const channelComparison = body.indexOf(
			"this._renderedChannel === this.doc.channel",
			playingGuard,
		);
		const instrumentComparison = body.indexOf(
			"this._renderedInstrument === instrumentIndex",
			channelComparison,
		);
		const renderedChannelUpdate = body.indexOf(
			"this._renderedChannel = this.doc.channel",
			instrumentComparison,
		);
		const renderedInstrumentUpdate = body.indexOf(
			"this._renderedInstrument = instrumentIndex",
			renderedChannelUpdate,
		);

		expect(instrumentRead).toBeGreaterThanOrEqual(0);
		expect(playingGuard).toBeGreaterThan(instrumentRead);
		expect(channelComparison).toBeGreaterThan(playingGuard);
		expect(instrumentComparison).toBeGreaterThan(channelComparison);
		expect(renderedChannelUpdate).toBeGreaterThan(instrumentComparison);
		expect(renderedInstrumentUpdate).toBeGreaterThan(renderedChannelUpdate);
	});

	test("history changes persist after applying and validating position", () => {
		const body = methodBody(
			songDocumentSource,
			"private _whenHistoryStateChanged",
			"private _cleanDocument",
		);
		const directHashStart = body.indexOf("if (window.history.state == null");
		const directHashEnd = body.indexOf(
			"\n\t\tconst state: HistoryState | null",
			directHashStart,
		);
		const directHashBody = body.slice(directHashStart, directHashEnd);
		const directHashTransition = directHashBody.indexOf("this.synth.goToBar(0)");
		const directHashValidate = directHashBody.indexOf("this._validateDocState()");
		const directHashPersist = directHashBody.indexOf("this.persistCurrentPosition()");
		const directHashReturn = directHashBody.lastIndexOf("return;");
		const normalHistoryBody = body.slice(directHashEnd);
		const barAssignment = normalHistoryBody.indexOf("this.bar = state.bar");
		const channelAssignment = normalHistoryBody.indexOf("this.channel = state.channel");
		const validate = normalHistoryBody.indexOf("this._validateDocState()");
		const persist = normalHistoryBody.indexOf("this.persistCurrentPosition()");

		expect(directHashTransition).toBeGreaterThanOrEqual(0);
		expect(directHashValidate).toBeGreaterThan(directHashTransition);
		expect(directHashPersist).toBeGreaterThan(directHashValidate);
		expect(directHashReturn).toBeGreaterThan(directHashPersist);
		expect(barAssignment).toBeGreaterThanOrEqual(0);
		expect(channelAssignment).toBeGreaterThan(barAssignment);
		expect(validate).toBeGreaterThan(channelAssignment);
		expect(persist).toBeGreaterThan(validate);
	});
});
