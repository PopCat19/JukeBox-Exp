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

	test("Browse activates the hidden input and selected filename updates live status", () => {
		const OriginalFileReader = globalThis.FileReader;
		class PendingFileReader {
			public onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
			readAsText(): void {}
			abort(): void {}
		}
		Object.defineProperty(globalThis, "FileReader", {
			configurable: true,
			value: PendingFileReader,
		});
		try {
			const prompt = new InstrumentImportPrompt(new SongDocument(), {
				surface: "navigator",
			});
			const fileInput = prompt.container.querySelector<HTMLInputElement>(
				"input[type='file']",
			)!;
			const browse = prompt.container.querySelector<HTMLButtonElement>(
				".importBrowseButton",
			)!;
			const status = prompt.container.querySelector<HTMLOutputElement>(
				".importFileStatus",
			)!;
			let activations = 0;
			fileInput.click = () => {
				activations++;
			};
			browse.click();
			expect(activations).toBe(1);
			expect(fileInput.style.display).toBe("none");
			expect(status.getAttribute("aria-live")).toBe("polite");
			Object.defineProperty(fileInput, "files", {
				configurable: true,
				value: [new File(["{}"], "picked-string.json")],
			});
			fileInput.dispatchEvent(new Event("change"));
			expect(status.textContent).toBe("picked-string.json");
			prompt.cleanUp();
		} finally {
			Object.defineProperty(globalThis, "FileReader", {
				configurable: true,
				value: OriginalFileReader,
			});
		}
	});

	test("cleanup aborts and invalidates a pending file reader", () => {
		const OriginalFileReader = globalThis.FileReader;
		let reader: {
			onload: ((event: { target: { result: string } }) => void) | null;
			aborted: boolean;
		} | null = null;
		class DeferredFileReader {
			public onload: ((event: { target: { result: string } }) => void) | null = null;
			public aborted = false;
			constructor() { reader = this; }
			readAsText(): void {}
			abort(): void { this.aborted = true; }
		}
		Object.defineProperty(globalThis, "FileReader", { configurable: true, value: DeferredFileReader });
		try {
			const doc = new SongDocument();
			const prompt = new InstrumentImportPrompt(doc);
			let closes = 0;
			prompt.closeCallback = () => { closes++; };
			const fileInput = prompt.container.querySelector<HTMLInputElement>("input[type='file']")!;
			Object.defineProperty(fileInput, "files", { configurable: true, value: [new File(["{}"], "instrument.json")] });
			(prompt as unknown as { _whenFileSelected(): void })._whenFileSelected();
			const pending = reader as unknown as { onload: ((event: { target: { result: string } }) => void) | null; aborted: boolean };
			prompt.cleanUp();
			pending.onload?.({ target: { result: "{}" } });
			expect(pending.aborted).toBeTrue();
			expect(closes).toBe(0);
		} finally {
			Object.defineProperty(globalThis, "FileReader", { configurable: true, value: OriginalFileReader });
		}
	});
});
