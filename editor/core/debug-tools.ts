// Debug Tools
//
// Purpose: Exposes window.__jukebox__ with dev inspection utilities
//
// This module:
// - Decodes URL hashes to human-readable JSON
// - Inspects clipboard contents (localStorage + system)
// - Runs consistency checks on song state
// - Records actions as replayable backend scripts

import type { Song } from "../../synth";
import type { Change } from "./change";
import type { SongDocument } from "../song-document";

interface ReplayOp {
	op: string;
	args?: any;
	ts: number;
}

interface DebugAPI {
	hash: () => object | null;
	clipboard: () => void;
	validate: () => string[];
	record: {
		start: () => void;
		stop: () => string;
		ops: () => ReplayOp[];
		dump: () => void;
	};
	replay: (ops: ReplayOp[]) => void;
}

function extractChangeArgs(change: Change): Record<string, any> | null {
	const name: string = change.constructor.name;
	if (!name) return null;
	const args: Record<string, any> = { _change: name };
	for (const key of Object.getOwnPropertyNames(change)) {
		if (key.startsWith("_")) continue;
		const val: any = (change as any)[key];
		if (typeof val === "number" || typeof val === "string" || typeof val === "boolean" || val === null || val === undefined) {
			args[key] = val;
		}
	}
	return Object.keys(args).length > 1 ? args : null;
}

export function installDebugTools(doc: SongDocument): void {
	const ops: ReplayOp[] = [];
	let recording: boolean = false;
	let suppress: boolean = false; // true during replay to avoid double-recording

	// ── Recorder hooks ──────────────────────────────────────────

	const _origRecord = doc.record.bind(doc);
	doc.record = function (change: Change, replace?: boolean, newSong?: boolean): void {
		if (recording && !suppress) {
			const args = extractChangeArgs(change);
			ops.push({ op: "change", args: args ?? { _change: change.constructor.name }, ts: Date.now() });
		}
		return _origRecord(change, replace, newSong);
	};

	const _origCopy = doc.selection.copy.bind(doc.selection);
	doc.selection.copy = function (): void {
		if (recording && !suppress) ops.push({ op: "copy", args: { w: doc.selection.boxSelectionWidth, h: doc.selection.boxSelectionHeight }, ts: Date.now() });
		return _origCopy();
	};

	const _origPaste = doc.selection.pasteNotes.bind(doc.selection);
	doc.selection.pasteNotes = function (): void {
		if (recording && !suppress) ops.push({ op: "pasteNotes", args: { bar: doc.bar, ch: doc.channel }, ts: Date.now() });
		return _origPaste();
	};

	const _origInsert = doc.selection.insertChannel.bind(doc.selection);
	doc.selection.insertChannel = function (): void {
		if (recording && !suppress) ops.push({ op: "insertChannel", ts: Date.now() });
		return _origInsert();
	};

	const _origDelete = doc.selection.deleteChannel.bind(doc.selection);
	doc.selection.deleteChannel = function (): void {
		if (recording && !suppress) ops.push({ op: "deleteChannel", ts: Date.now() });
		return _origDelete();
	};

	const _origClone = doc.selection.cloneChannel.bind(doc.selection);
	doc.selection.cloneChannel = function (): void {
		if (recording && !suppress) ops.push({ op: "cloneChannel", args: { src: doc.selection.boxSelectionChannel }, ts: Date.now() });
		return _origClone();
	};

	// ── API ─────────────────────────────────────────────────────

	function genScript(): string {
		return [
			"// Replay script — paste into console on a fresh JukeBox page",
			`__jukebox__.replay(${JSON.stringify(ops, null, 2)});`,
		].join("\n");
	}

	const api: DebugAPI = {
		hash(): object | null {
			try {
				const h: string = window.location.hash.slice(1);
				if (!h) return null;
				const song: Song = new (doc.song.constructor as any)(h);
				return song.toJsonObject();
			} catch (e) {
				console.error("hash decode failed:", e);
				return null;
			}
		},

		clipboard(): void {
			const ls = window.localStorage.getItem("selectionCopy");
			if (ls) {
				try {
					const obj: any = JSON.parse(ls);
					console.log("── localStorage clipboard ──");
					console.log(`channels: ${obj.channels?.length}  partDuration: ${obj.partDuration}`);
					for (let i = 0; i < (obj.channels || []).length; i++) {
						const ch = obj.channels[i];
						const hasDefs = ch.instrumentDefs != null;
						console.log(`  ch${i}: noise=${ch.isNoise} mod=${ch.isMod}  bars=${ch.bars?.length}  patterns=${Object.keys(ch.patterns || {}).length}  instDefs=${hasDefs}`);
						if (hasDefs) console.log("    defs:", ch.instrumentDefs);
					}
				} catch (e) {
					console.log("localStorage: parse error", e);
				}
			} else {
				console.log("localStorage clipboard: empty");
			}
			if (navigator.clipboard?.readText) {
				navigator.clipboard.readText().then((text: string) => {
					try {
						const obj: any = JSON.parse(text);
						if (obj?.channels) {
							console.log("── system clipboard ──");
							console.log(`channels: ${obj.channels.length}  partDuration: ${obj.partDuration}`);
							for (let i = 0; i < obj.channels.length; i++) {
								const ch = obj.channels[i];
								console.log(`  ch${i}: noise=${ch.isNoise} mod=${ch.isMod}  instDefs=${ch.instrumentDefs != null}`);
							}
						} else {
							console.log("system clipboard: not a JukeBox copy");
						}
					} catch (_) { console.log("system clipboard: not JSON"); }
				}).catch(() => console.log("system clipboard: read denied"));
			}
		},

		validate(): string[] {
			const issues: string[] = [];
			const s = doc.song;
			for (let ci = 0; ci < s.getChannelCount(); ci++) {
				const ch = s.channels[ci];
				const isNoise = s.getChannelIsNoise(ci);
				const isMod = s.getChannelIsMod(ci);
				for (let ii = 0; ii < ch.instruments.length; ii++) {
					const inst: any = ch.instruments[ii];
					if (isMod && inst.type !== 9) issues.push(`ch${ci} inst${ii}: mod channel has non-mod type ${inst.type}`);
					if (isNoise && inst.type === 0) issues.push(`ch${ci} inst${ii}: noise channel has chip — cross-type contamination`);
				}
				for (let pi = 0; pi < ch.patterns.length; pi++) {
					const pat: any = ch.patterns[pi];
					for (const idx of pat.instruments) {
						if (idx >= ch.instruments.length) issues.push(`ch${ci} pat${pi + 1}: refs inst${idx} but only ${ch.instruments.length} exist`);
					}
				}
			}
			if (issues.length === 0) console.log("✓ consistent");
			else { console.warn(`✗ ${issues.length} issues:`); issues.forEach(i => console.warn("  -", i)); }
			return issues;
		},

		record: {
			start(): void {
				ops.length = 0;
				recording = true;
				console.log("🔴 recording — run __jukebox__.record.stop() to get replay script");
			},
			stop(): string {
				recording = false;
				console.log(`⏹ stopped — ${ops.length} ops`);
				const s = genScript();
				console.log(s);
				return s;
			},
			ops(): ReplayOp[] { return [...ops]; },
			dump(): void {
				console.log(`── recording (${ops.length} ops) ──`);
				ops.forEach(o => console.log(`  ${o.op}`, o.args ?? ""));
			},
		},

		replay(recordedOps: ReplayOp[]): void {
			suppress = true;
			console.log(`replaying ${recordedOps.length} ops...`);
			for (const op of recordedOps) {
				try {
					switch (op.op) {
						case "copy":             doc.selection.copy(); break;
						case "pasteNotes":       doc.selection.pasteNotes(); break;
						case "insertChannel":    doc.selection.insertChannel(); break;
						case "deleteChannel":    doc.selection.deleteChannel(); break;
						case "cloneChannel":     doc.selection.cloneChannel(); break;
						case "change":           console.log("  (change:", op.args?._change, "— not yet replayable)"); break;
						default:                 console.warn("  unknown op:", op.op);
					}
				} catch (e) {
					console.error("  failed at", op.op, e);
					break;
				}
			}
			console.log("done.");
			suppress = false;
		},
	};

	(window as any).__jukebox__ = api;
}
