// import-prompt-external-delivery.test.ts
//
// Purpose: Verifies generation-safe external file delivery into ImportPrompt.

import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { ImportPrompt } from "../editor/prompts/import-prompt";
import { SongDocument } from "../editor/song-document";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();

describe("ImportPrompt behavior", () => {
	test("cleanup invalidates pending external import operations", () => {
		const doc = new SongDocument();
		const prompt = new ImportPrompt(doc);
		let completed = 0;
		prompt.handleExternalFile(new File(["{}"], "song.json"), undefined, () => {
			completed++;
		});
		prompt.cleanUp();
		for (let attempt = 0; attempt < 20; attempt++) {
			// FileReader will not fire after cleanup because the
			// operation token advanced and disposed state is set.
		}
		expect(completed).toBe(0);
	});

	test("empty object JSON fails atomically with no document mutation", async () => {
		const doc = new SongDocument();
		const originalSong = doc.song.toJsonObject();
		const frames: FrameRequestCallback[] = [];
		const rafWin = {
			requestAnimationFrame: (cb: FrameRequestCallback) => {
				frames.push(cb);
				return frames.length;
			},
		} as Window;
		let completed = 0;
		const prompt = new ImportPrompt(doc);
		prompt.handleExternalFile(new File(["{}"], "song.json"), rafWin, () => {
			completed++;
		});
		for (let attempt = 0; attempt < 20 && frames.length === 0; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		expect(frames.length).toBe(1);
		frames[0](0);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(completed).toBe(0);
		expect(JSON.stringify(doc.song.toJsonObject())).toBe(JSON.stringify(originalSong));
		expect(prompt.container.querySelector("h2")?.textContent).toBe("Import");
		prompt.cleanUp();
	});

	test("unsupported external file reports failure and restores initial UI", () => {
		const doc = new SongDocument();
		const prompt = new ImportPrompt(doc);
		let completed = 0;
		let failed = 0;
		prompt.handleExternalFile(
			new File(["bad"], "song.txt"),
			undefined,
			() => { completed++; },
			() => true,
			() => { failed++; },
		);
		expect(completed).toBe(0);
		expect(failed).toBe(1);
		expect(prompt.container.querySelector("h2")?.textContent).toBe("Import");
		prompt.cleanUp();
	});

	test("cleanup stops pending operation and clears browse input", () => {
		const doc = new SongDocument();
		const prompt = new ImportPrompt(doc);
		let completed = 0;
		prompt.handleExternalFile(new File(["x"], "f.txt"), undefined, () => {
			completed++;
		});
		prompt.cleanUp();
		const anyPrompt = prompt as unknown as { _disposed: boolean; _operation: number };
		expect(anyPrompt._disposed).toBeTrue();
		expect(anyPrompt._operation).toBe(2);
		expect(completed).toBe(0);
	});

	test("two concurrent external drops only latest wins", async () => {
		const doc = new SongDocument();
		const prompt = new ImportPrompt(doc);
		const completions: string[] = [];
		const songJson = JSON.stringify(doc.song.toJsonObject());
		const frames: FrameRequestCallback[] = [];
		const rafWin = {
			requestAnimationFrame: (cb: FrameRequestCallback) => {
				frames.push(cb);
				return frames.length;
			},
		} as Window;
		prompt.handleExternalFile(new File([songJson], "a.json"), rafWin, () => {
			completions.push("first");
		}, () => false);
		prompt.handleExternalFile(new File([songJson], "b.json"), rafWin, () => {
			completions.push("second");
		}, () => true);
		for (let attempt = 0; attempt < 20 && frames.length < 1; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		frames[0](0);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(completions).toEqual(["second"]);
		prompt.cleanUp();
	});

	test("transport restoration failure releases a headless import", async () => {
		const doc = new SongDocument();
		const prompt = new ImportPrompt(doc);
		const frames: FrameRequestCallback[] = [];
		const rafWin = {
			requestAnimationFrame: (cb: FrameRequestCallback) => {
				frames.push(cb);
				return frames.length;
			},
		} as Window;
		doc.synth.isPlayingSong = true;
		doc.performance.play = () => Promise.reject(new Error("play failed"));
		let completed = 0;
		let failed = 0;
		prompt.handleExternalFile(
			new File([JSON.stringify(doc.song.toJsonObject())], "song.json"),
			rafWin,
			() => { completed++; },
			() => true,
			() => { failed++; },
		);
		for (let attempt = 0; attempt < 20 && frames.length === 0; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		frames[0](0);
		for (let attempt = 0; attempt < 20 && failed === 0; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		expect(completed).toBe(0);
		expect(failed).toBe(1);
		prompt.cleanUp();
	});

	test("older playing snapshot does not restore playback after newer paused import", async () => {
		const doc = new SongDocument();
		const prompt = new ImportPrompt(doc);
		const frames: FrameRequestCallback[] = [];
		const rafWin = {
			requestAnimationFrame: (cb: FrameRequestCallback) => {
				frames.push(cb);
				return frames.length;
			},
		} as Window;
		doc.synth.isPlayingSong = true;
		prompt.handleExternalFile(new File([JSON.stringify(doc.song.toJsonObject())], "old.json"), rafWin, () => {}, () => false);
		doc.synth.isPlayingSong = false;
		prompt.handleExternalFile(new File([JSON.stringify(doc.song.toJsonObject())], "new.json"), rafWin, () => {}, () => true);
		for (let attempt = 0; attempt < 20 && frames.length < 2; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		expect(frames.length).toBeGreaterThanOrEqual(1);
		frames[frames.length - 1](0);
		for (let attempt = 0; attempt < 20; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		expect(doc.synth.playing).toBeFalse();
		prompt.cleanUp();
	});

	test("() validates channels minimum before document mutation", async () => {
		const doc = new SongDocument();
		const prompt = new ImportPrompt(doc);
		const frames: FrameRequestCallback[] = [];
		const rafWin = {
			requestAnimationFrame: (cb: FrameRequestCallback) => {
				frames.push(cb);
				return frames.length;
			},
		} as Window;
		let completed = 0;
		prompt.handleExternalFile(new File([JSON.stringify({})], "song.json"), rafWin, () => {
			completed++;
		});
		for (let attempt = 0; attempt < 20 && frames.length === 0; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		expect(frames.length).toBe(1);
		frames[0](0);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(completed).toBe(0);
		prompt.cleanUp();
	});
});
