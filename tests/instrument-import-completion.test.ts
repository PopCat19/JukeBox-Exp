// instrument-import-completion.test.ts
//
// Purpose: Verifies instrument import completion closes through prompt authority.

import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { InstrumentImportPrompt } from "../editor/prompts/instrument-import-prompt";
import { SongDocument } from "../editor/song-document";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();

describe("instrument import completion", () => {
	test("successful direct import closes through bound Navigator authority", () => {
		const doc = new SongDocument();
		const prompt = new InstrumentImportPrompt(doc);
		let closes = 0;
		prompt.closeCallback = () => { closes++; };
		const direct = prompt as unknown as { _import_single(file: unknown): void };
		direct._import_single(doc.getCurrentInstrumentObj().toJsonObject());
		expect(closes).toBe(1);
		expect(doc.prompt).toBeNull();
		prompt.cleanUp();
	});
});
