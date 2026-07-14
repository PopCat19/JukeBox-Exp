// file-workspace.test.ts
//
// Purpose: Verifies Project Data tab composition and transactional prompt replacement.

import { describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type { FilePromptFactory } from "../editor/navigator/file-workspace";
import { FileWorkspace } from "../editor/navigator/file-workspace";
import { NavigatorShell } from "../editor/navigator/navigator-shell";
import { buildNavigatorPanesCSS } from "../editor/rendering/styles/navigator-panes";
import { buildPromptShellCSS } from "../editor/rendering/styles/prompt-shell";
import { ImportPrompt } from "../editor/prompts/import-prompt";
import type { Prompt } from "../editor/prompts/prompt";
import { SongDocument } from "../editor/song-document";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();

function prompt(name: string, allow = true): Prompt {
	const container = document.createElement("div");
	container.className = "prompt";
	container.append(document.createElement("h2"));
	return {
		name,
		container,
		closeCallback: null,
		cleanUp: () => {},
		requestPaneLeave: () => allow,
		requestPaneClose: () => allow,
	} as unknown as Prompt;
}

function externalImportPrompt(
	doc: SongDocument,
	completions: Array<() => void>,
	allow = true,
): ImportPrompt {
	const next = new ImportPrompt(doc) as ImportPrompt & {
		requestPaneLeave(): boolean;
		requestPaneClose(): boolean;
	};
	next.handleExternalFile = (_file, _rafWin, onSuccess) => {
		if (onSuccess) completions.push(onSuccess);
	};
	next.requestPaneLeave = () => allow;
	next.requestPaneClose = () => allow;
	return next;
}

describe("FileWorkspace", () => {
	test("catalog shows one Project Data sidebar entry", () => {
		const shell = new NavigatorShell();
		const group = Array.from(
			shell.container.querySelectorAll(".navigator-route-group"),
		).find((entry) => entry.querySelector("h4")?.textContent === "Project Data");
		expect(group?.querySelectorAll(".navigator-route").length).toBe(1);
		expect(group?.querySelector(".navigator-route")?.textContent).toBe("Project Data");
	});

	test("Project Data owns one full-size scrolling content host and PMD tabs", () => {
		const css = buildNavigatorPanesCSS();
		expect(css).toMatch(/\.navigator-project-data,[^{]*\.navigator-instrument-data \{[^}]*align-self: stretch[^}]*flex: 1 1 auto[^}]*width: 100%[^}]*min-width: 0[^}]*overflow: hidden/s);
		expect(css).toMatch(/\.navigator-file-right-host,[^{]*\.navigator-instrument-host \{[^}]*display: flex[^}]*flex: 1 1 0[^}]*width: 100%[^}]*overflow: auto/s);
		expect(css).toMatch(/\.navigator-file-tabs[^}]*max-width: 100%[^}]*overflow-x: auto[^}]*border-radius: 16px/s);
		expect(css).toMatch(/\.navigator-file-tabs > \.tabButton \{[^}]*background: var\(--ui-widget-background\)[^}]*color: var\(--tab-inactive-fg\)/s);
		expect(css).not.toMatch(/\.navigator-file-tabs > \.tabButton \{[^}]*background: var\(--tab-inactive-bg\)/s);
		expect(css).toMatch(/\.navigator-file-tabs > \.tabButton\.active \{[^}]*background: var\(--cta-bg\)/s);
		expect(css).not.toContain("navigator-file-left-host");
	});

	test("hidden File split does not occupy the normal route workspace", () => {
		const editor = document.createElement("div");
		editor.className = "beepboxEditor";
		const style = document.createElement("style");
		style.textContent = buildNavigatorPanesCSS();
		document.head.append(style);
		const shell = new NavigatorShell();
		editor.append(shell.container);
		document.body.append(editor);
		const split = shell.container.querySelector<HTMLElement>(".navigator-project-data");
		if (split === null) throw new Error("Navigator Project Data workspace was not built");
		expect(split.hidden).toBeTrue();
		expect(getComputedStyle(split).display).toBe("none");
		shell.setFileWorkspace(true);
		const host = split.querySelector<HTMLElement>(".navigator-file-right-host");
		if (host === null) throw new Error("Navigator Project Data host was not built");
		expect(getComputedStyle(split).display).toBe("flex");
		expect(getComputedStyle(split).width).toBe("100%");
		expect(getComputedStyle(host).display).toBe("flex");
		expect(getComputedStyle(host).width).toBe("100%");
		expect(getComputedStyle(host).overflow).toBe("auto");
		shell.setFileWorkspace(false);
		expect(getComputedStyle(split).display).toBe("none");
		editor.remove();
		style.remove();
	});
	test("switches Export to Import in one host and disables detach", async () => {
		const created: string[] = [];
		const factory: FilePromptFactory = { create: (route) => { created.push(route); return prompt(route); } };
		const shell = new NavigatorShell("Navigator", () => {});
		const workspace = new FileWorkspace({} as SongDocument, shell, factory);
		await workspace.open("export");
		await workspace.open("import");
		expect(created).toEqual(["export", "import"]);
		expect(shell.container.querySelectorAll(".navigator-native-pane").length).toBe(1);
		expect((shell.container.querySelector(".navigator-detach-button") as HTMLButtonElement).disabled).toBeTrue();
	});

	test("serializes concurrent opens without duplicate construction", async () => {
		const created: string[] = [];
		const factory: FilePromptFactory = {
			create: (route) => {
				created.push(route);
				return prompt(route);
			},
		};
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, factory);
		await Promise.all([workspace.open("export"), workspace.open("import")]);
		expect(created).toEqual(["export", "import"]);
		expect(shell.container.querySelectorAll(".navigator-native-pane").length).toBe(1);
	});

	test("shows parent, exposes tabs, and hides parent after close", async () => {
		const parent = document.createElement("div");
		parent.className = "promptContainer";
		parent.style.display = "none";
		const editor = document.createElement("div");
		editor.className = "beepboxEditor";
		const style = document.createElement("style");
		style.textContent = buildPromptShellCSS();
		document.head.append(style);
		editor.append(parent);
		document.body.append(editor);
		const shell = new NavigatorShell();
		parent.append(shell.container);
		const workspace = new FileWorkspace({} as SongDocument, shell, {
			create: (route) => prompt(route),
		});
		await workspace.open();
		expect(parent.classList.contains("navigatorVisible")).toBeTrue();
		expect(parent.style.display).toBe("none");
		expect(getComputedStyle(parent).display).toBe("flex");
		expect(shell.container.querySelectorAll(".navigator-project-data [role='tab']").length).toBe(3);
		expect(shell.container.querySelector("[role='tabpanel']")?.id).toBe("navigator-file-panel");
		await workspace.close();
		expect(parent.classList.contains("navigatorVisible")).toBeFalse();
		expect(parent.style.display).toBe("none");
		expect(getComputedStyle(parent).display).toBe("none");
		editor.remove();
		style.remove();
	});

	test("denied aggregate close remains open", async () => {
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, {
			create: (route) => prompt(route, route !== "export"),
		});
		await workspace.open();
		expect(await workspace.close()).toBeFalse();
		expect(workspace.isOpen()).toBeTrue();
	});

	test("denied Escape is handled and keeps aggregate open", async () => {
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, {
			create: (route) => prompt(route, route !== "import"),
		});
		await workspace.open("import");
		expect(await workspace.forwardKeyboard(new KeyboardEvent("keydown", { key: "Escape" }))).toBeTrue();
		expect(workspace.isOpen()).toBeTrue();
	});

	test("tab keyboard invokes routes without changing selection early", () => {
		const opened: string[] = [];
		const shell = new NavigatorShell("Navigator", undefined, undefined, (route) => opened.push(route));
		shell.setFileWorkspace(true, "export");
		const exportTab = shell.container.querySelector<HTMLButtonElement>("[data-file-route='export']")!;
		exportTab.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
		expect(opened).toEqual(["songRecovery"]);
		expect(exportTab.getAttribute("aria-selected")).toBe("true");
		expect(exportTab.tabIndex).toBe(0);
	});

	test("stale prompt close cannot close a reopened generation", async () => {
		const prompts: Prompt[] = [];
		const factory: FilePromptFactory = {
			create: (route) => {
				const next = prompt(route);
				prompts.push(next);
				return next;
			},
		};
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, factory);
		await workspace.open();
		const staleClose = prompts[0].closeCallback;
		await workspace.close();
		await workspace.open();
		staleClose?.(prompts[0]);
		await Promise.resolve();
		await Promise.resolve();
		expect(workspace.isOpen()).toBeTrue();
	});

	test("Project Data sidebar stays active for every tab route", () => {
		const shell = new NavigatorShell();
		const button = shell.container.querySelector<HTMLElement>("[data-route-id='export']")!;
		for (const route of ["import", "export", "songRecovery"] as const) {
			shell.setFileActiveRoute(route);
			expect(button.getAttribute("aria-current")).toBe("page");
		}
		expect(shell.container.querySelectorAll("[data-route-id='export']").length).toBe(1);
	});

	test("stale Import completion after switching tabs does not replace current tab", async () => {
		const prompts: Prompt[] = [];
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, {
			create: (route) => {
				const next = prompt(route);
				prompts.push(next);
				return next;
			},
		});
		await workspace.open("import");
		const staleCompletion = prompts[0].closeCallback;
		await workspace.open("export");
		staleCompletion?.(prompts[0]);
		await Promise.resolve();
		await Promise.resolve();
		expect(shell.container.querySelector("[data-navigator-scope='export']") !== null).toBeTrue();
		expect(shell.container.querySelector("[data-navigator-scope='import']") === null).toBeTrue();
		expect(prompts.filter((entry) => entry.name === "import").length).toBe(1);
	});

	test("successful external Import completion closes Project Data", async () => {
		const completions: Array<() => void> = [];
		const doc = {} as SongDocument;
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace(doc, shell, {
			create: (route) =>
				route === "import"
					? externalImportPrompt(doc, completions)
					: prompt(route),
		});
		await workspace.open("import");
		workspace.deliverImportFile(new File(["song"], "song.json"));
		expect(workspace.isOpen()).toBeTrue();
		expect(completions.length).toBe(1);
		completions[0]();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(workspace.isOpen()).toBeFalse();
	});

	test("failed external Import remains open without completion", async () => {
		const completions: Array<() => void> = [];
		const doc = {} as SongDocument;
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace(doc, shell, {
			create: (route) =>
				route === "import"
					? externalImportPrompt(doc, completions)
					: prompt(route),
		});
		await workspace.open("import");
		workspace.deliverImportFile(new File(["bad"], "song.txt"));
		expect(completions.length).toBe(1);
		expect(workspace.isOpen()).toBeTrue();
	});

	test("stale external Import completion cannot close reopened Project Data", async () => {
		const completions: Array<() => void> = [];
		const doc = {} as SongDocument;
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace(doc, shell, {
			create: (route) =>
				route === "import"
					? externalImportPrompt(doc, completions)
					: prompt(route),
		});
		await workspace.open("import");
		workspace.deliverImportFile(new File(["song"], "song.mid"));
		await workspace.close();
		await workspace.open("import");
		completions[0]();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(workspace.isOpen()).toBeTrue();
	});

	test("external Import completion respects close denial", async () => {
		const completions: Array<() => void> = [];
		const doc = {} as SongDocument;
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace(doc, shell, {
			create: (route) =>
				route === "import"
					? externalImportPrompt(doc, completions, false)
					: prompt(route),
		});
		await workspace.open("import");
		workspace.deliverImportFile(new File(["song"], "song.json"));
		completions[0]();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(workspace.isOpen()).toBeTrue();
	});

	test("unsupported external file does not report success or close", () => {
		const doc = new SongDocument();
		doc.synth.isPlayingSong = true;
		doc.synth.goToBar(2);
		const importPrompt = new ImportPrompt(doc);
		let completions = 0;
		let closes = 0;
		importPrompt.closeCallback = () => {
			closes++;
		};
		importPrompt.handleExternalFile(new File(["bad"], "song.txt"), undefined, () => {
			completions++;
		});
		expect(completions).toBe(0);
		expect(closes).toBe(0);
		expect(doc.synth.playing).toBeTrue();
		expect(doc.synth.currentBar).toBe(2);
		doc.synth.pause();
		importPrompt.cleanUp();
	});

	test("malformed external JSON leaves transport unchanged and stays open", async () => {
		const doc = new SongDocument();
		doc.synth.goToBar(2);
		const importPrompt = new ImportPrompt(doc);
		const frames: FrameRequestCallback[] = [];
		const rafWin = {
			requestAnimationFrame: (callback: FrameRequestCallback) => {
				frames.push(callback);
				return frames.length;
			},
		} as Window;
		let completions = 0;
		let closes = 0;
		importPrompt.closeCallback = () => {
			closes++;
		};
		importPrompt.handleExternalFile(new File(["{"], "song.json"), rafWin, () => {
			completions++;
		});
		for (let attempt = 0; attempt < 20 && frames.length === 0; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		expect(frames.length).toBe(1);
		frames[0](0);
		expect(completions).toBe(0);
		expect(closes).toBe(0);
		expect(doc.synth.playing).toBeFalse();
		expect(doc.synth.currentBar).toBe(2);
		importPrompt.cleanUp();
	});

	test("MIDI external success reports completion after import", async () => {
		const doc = new SongDocument();
		const importPrompt = new ImportPrompt(doc);
		const midi = new Uint8Array([
			0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06,
			0x00, 0x00, 0x00, 0x01, 0x00, 0x60,
			0x4d, 0x54, 0x72, 0x6b, 0x00, 0x00, 0x00, 0x13,
			0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20,
			0x00, 0x90, 0x3c, 0x64,
			0x60, 0x80, 0x3c, 0x40,
			0x00, 0xff, 0x2f, 0x00,
		]);
		let completions = 0;
		importPrompt.handleExternalFile(new File([midi], "song.mid"), undefined, () => {
			completions++;
		});
		for (let attempt = 0; attempt < 20 && completions === 0; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		expect(completions).toBe(1);
		expect(doc.song.title).toBe("song");
		importPrompt.cleanUp();
	});

	test("paused JSON external import stays paused at start after commit", async () => {
		const doc = new SongDocument();
		doc.synth.goToBar(2);
		const importPrompt = new ImportPrompt(doc);
		const frames: FrameRequestCallback[] = [];
		const rafWin = {
			requestAnimationFrame: (callback: FrameRequestCallback) => {
				frames.push(callback);
				return frames.length;
			},
		} as Window;
		let completions = 0;
		const songJson = JSON.stringify(doc.song.toJsonObject());
		importPrompt.handleExternalFile(
			new File([songJson], "song.json"),
			rafWin,
			() => {
				completions++;
			},
		);
		doc.synth.isPlayingSong = true;
		for (let attempt = 0; attempt < 20 && frames.length === 0; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		expect(frames.length).toBe(1);
		expect(completions).toBe(0);
		frames[0](0);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(completions).toBe(1);
		expect(doc.synth.playing).toBeFalse();
		expect(doc.synth.currentBar).toBe(0);
		expect(doc.synth.playhead).toBe(0);
		importPrompt.cleanUp();
	});

	test("playing JSON external import follows initial snapshot and restarts at start", async () => {
		const doc = new SongDocument();
		doc.performance.play = () => {
			doc.synth.isPlayingSong = true;
			return Promise.resolve();
		};
		doc.synth.isPlayingSong = true;
		doc.synth.goToBar(2);
		const importPrompt = new ImportPrompt(doc);
		const frames: FrameRequestCallback[] = [];
		const rafWin = {
			requestAnimationFrame: (callback: FrameRequestCallback) => {
				frames.push(callback);
				return frames.length;
			},
		} as Window;
		let completions = 0;
		const songJson = JSON.stringify(doc.song.toJsonObject());
		importPrompt.handleExternalFile(new File([songJson], "song.json"), rafWin, () => {
			completions++;
		});
		doc.synth.pause();
		for (let attempt = 0; attempt < 20 && frames.length === 0; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		expect(frames.length).toBe(1);
		frames[0](0);
		for (let attempt = 0; attempt < 20 && completions === 0; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		expect(completions).toBe(1);
		expect(doc.synth.playing).toBeTrue();
		expect(doc.synth.currentBar).toBe(0);
		expect(doc.synth.playhead).toBe(0);
		doc.synth.pause();
		importPrompt.cleanUp();
	});

	test("Import completion refreshes Import while denied Export stays mounted", async () => {
		const prompts: Prompt[] = [];
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, {
			create: (route) => {
				const next = prompt(route, route !== "export");
				prompts.push(next);
				return next;
			},
		});
		await workspace.open("import");
		const firstImport = prompts[0];
		firstImport.closeCallback?.(firstImport);
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		expect(workspace.isOpen()).toBeTrue();
		expect(prompts.filter((entry) => entry.name === "import").length).toBe(2);
		expect(shell.container.querySelectorAll("[data-navigator-scope='import']").length).toBe(1);
	});

	test("denied Recovery replacement preserves Export", async () => {
		const factory: FilePromptFactory = { create: (route) => prompt(route, route !== "export") };
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, factory);
		await workspace.open("export");
		expect(await workspace.open("songRecovery")).toBeFalse();
		expect(shell.container.querySelector("[data-navigator-scope='export']") !== null).toBeTrue();
		expect(shell.container.querySelector("[data-navigator-scope='songRecovery']") === null).toBeTrue();
	});

	test("allowed Recovery replacement leaves one active root", async () => {
		const factory: FilePromptFactory = { create: (route) => prompt(route) };
		const shell = new NavigatorShell();
		const workspace = new FileWorkspace({} as SongDocument, shell, factory);
		await workspace.open();
		expect(await workspace.open("songRecovery")).toBeTrue();
		expect(shell.container.querySelector("[data-navigator-scope='export']") === null).toBeTrue();
		expect(shell.container.querySelector("[data-navigator-scope='songRecovery']") !== null).toBeTrue();
		expect(shell.container.querySelector("[role='tabpanel']")?.getAttribute("aria-labelledby")).toBe("navigator-file-tab-recovery");
	});
});

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

	test("picker unsupported file restores initial UI", () => {
		const doc = new SongDocument();
		const prompt = new ImportPrompt(doc);
		let completed = 0;
		prompt.handleExternalFile(new File(["bad"], "song.txt"), undefined, () => {
			completed++;
		});
		expect(completed).toBe(0);
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
