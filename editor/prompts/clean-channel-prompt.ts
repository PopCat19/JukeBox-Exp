// clean-channel-prompt.ts
//
// Purpose: Preview and apply LSDj-style pattern/instrument cleaning with diff
//
// This module:
// - Computes a dry-run diff of duplicate pattern merges and instrument dedup
// - Displays per-bar before→after pattern numbers and instrument remap tables
// - Supports current-channel or all-channels scope
// - Collapsible per-channel sections, scrollable list, stationary buttons
// - Applies changes via ChangeCleanChannelPatterns / ChangeCleanChannelInstruments

import { HTML } from "imperative-html/dist/esm/elements-strict";
import type { Channel, Pattern } from "../../synth";
import { Config } from "../../synth/synth-config";
import { ChangeCleanChannelInstruments, ChangeCleanChannelPatterns, comparePatternNotes, patternsContainSameInstruments } from "../changes";
import { ChangeGroup } from "../core/change";
import type { SongDocument } from "../song-document";
import { BasePrompt } from "./base-prompt";

const { div, h2, span, p, table, tbody, tr, td, th } = HTML;

type CleanMode = "patterns" | "instruments";
type CleanScope = "current" | "all";

interface PatternDiff {
	channelIndex: number;
	channelLabel: string;
	patternsBefore: number;
	patternsAfter: number;
	barRemaps: { bar: number; from: number; to: number }[];
	mergedPatterns: { oldIndex: number; intoIndex: number }[];
}

interface InstrumentDiff {
	channelIndex: number;
	channelLabel: string;
	instrumentsBefore: number;
	instrumentsAfter: number;
	remap: { oldIndex: number; newIndex: number; fingerprint: string }[];
	dropped: number[];
}

function channelLabel(doc: SongDocument, index: number): string {
	const name = doc.song.channels[index].name;
	if (name) return `${name} (ch ${index + 1})`;
	if (index < doc.song.pitchChannelCount) return `Pitch ${index + 1}`;
	if (index < doc.song.pitchChannelCount + doc.song.noiseChannelCount) return `Noise ${index - doc.song.pitchChannelCount + 1}`;
	return `Mod ${index - doc.song.pitchChannelCount - doc.song.noiseChannelCount + 1}`;
}

function computePatternDiff(doc: SongDocument, channelIndex: number): PatternDiff | null {
	const channel: Channel = doc.song.channels[channelIndex];
	const bars: number[] = [...channel.bars];
	const patterns: (Pattern | null)[] = channel.patterns.map((p) => p);

	const newPatterns: Pattern[] = [];
	const oldToNew: number[] = new Array(patterns.length).fill(-1);

	for (let bar = 0; bar < bars.length; bar++) {
		if (bars[bar] === 0) continue;
		const oldIdx = bars[bar] - 1;
		const oldPattern = patterns[oldIdx];
		if (!oldPattern) continue;

		let foundMatching = false;
		for (let newIdx = 0; newIdx < newPatterns.length; newIdx++) {
			const newPattern = newPatterns[newIdx];
			if (!patternsContainSameInstruments(oldPattern.instruments, newPattern.instruments) || newPattern.notes.length !== oldPattern.notes.length)
				continue;
			if (comparePatternNotes(oldPattern.notes, newPattern.notes)) {
				foundMatching = true;
				bars[bar] = newIdx + 1;
				if (oldToNew[oldIdx] === -1) oldToNew[oldIdx] = newIdx + 1;
				break;
			}
		}

		if (!foundMatching) {
			newPatterns.push(oldPattern);
			bars[bar] = newPatterns.length;
			oldToNew[oldIdx] = newPatterns.length;
		}
	}

	const barRemaps: { bar: number; from: number; to: number }[] = [];
	for (let bar = 0; bar < channel.bars.length; bar++) {
		if (channel.bars[bar] !== 0 && channel.bars[bar] !== bars[bar]) {
			barRemaps.push({ bar, from: channel.bars[bar], to: bars[bar] });
		}
	}

	const mergedPatterns: { oldIndex: number; intoIndex: number }[] = [];
	for (let i = 0; i < oldToNew.length; i++) {
		if (oldToNew[i] !== -1 && oldToNew[i] !== i + 1) {
			mergedPatterns.push({ oldIndex: i + 1, intoIndex: oldToNew[i] });
		}
	}

	if (barRemaps.length === 0 && mergedPatterns.length === 0) return null;

	return {
		channelIndex,
		channelLabel: channelLabel(doc, channelIndex),
		patternsBefore: patterns.length,
		patternsAfter: newPatterns.length,
		barRemaps,
		mergedPatterns,
	};
}

function computeInstrumentDiff(doc: SongDocument, channelIndex: number): InstrumentDiff | null {
	const channel: Channel = doc.song.channels[channelIndex];
	const instruments = channel.instruments;

	const usedIndices: Set<number> = new Set();
	for (const pattern of channel.patterns) {
		for (const instIdx of pattern.instruments) {
			if (instIdx >= 0 && instIdx < instruments.length) {
				usedIndices.add(instIdx);
			}
		}
	}

	if (usedIndices.size === 0) {
		if (instruments.length <= 1) return null;
		return {
			channelIndex,
			channelLabel: channelLabel(doc, channelIndex),
			instrumentsBefore: instruments.length,
			instrumentsAfter: 1,
			remap: instruments.map((_inst, i) => ({ oldIndex: i, newIndex: 0, fingerprint: "dropped" })),
			dropped: instruments.map((_inst, i) => i).slice(1),
		};
	}

	const sortedUsed = Array.from(usedIndices).sort((a, b) => a - b);
	const fingerprintToNew: Map<string, number> = new Map();
	const oldToNew: number[] = new Array(instruments.length).fill(-1);

	for (const oldIdx of sortedUsed) {
		const fingerprint = JSON.stringify(instruments[oldIdx].toJsonObject());
		let newIdx = fingerprintToNew.get(fingerprint);
		if (newIdx === undefined) {
			newIdx = fingerprintToNew.size;
			fingerprintToNew.set(fingerprint, newIdx);
		}
		oldToNew[oldIdx] = newIdx;
	}

	const finalCount = Math.max(Config.instrumentCountMin, Math.min(doc.song.getMaxInstrumentsPerChannel(), fingerprintToNew.size));

	const remap: { oldIndex: number; newIndex: number; fingerprint: string }[] = [];
	const dropped: number[] = [];
	for (let i = 0; i < instruments.length; i++) {
		if (oldToNew[i] >= 0) {
			const fp = JSON.stringify(instruments[i].toJsonObject());
			remap.push({ oldIndex: i, newIndex: oldToNew[i], fingerprint: fp.substring(0, 40) });
		} else {
			dropped.push(i);
		}
	}

	if (dropped.length === 0 && finalCount === instruments.length) return null;

	return {
		channelIndex,
		channelLabel: channelLabel(doc, channelIndex),
		instrumentsBefore: instruments.length,
		instrumentsAfter: finalCount,
		remap,
		dropped,
	};
}

export class CleanChannelPrompt extends BasePrompt {
	private readonly _mode: CleanMode;
	private readonly _scope: CleanScope;
	private readonly _diffList: HTMLDivElement = div({ class: "ccpList" });
	private _collapsed: Set<number> = new Set();

	public readonly container: HTMLDivElement;

	constructor(doc: SongDocument, mode: CleanMode, scope: CleanScope) {
		super(doc);
		this._mode = mode;
		this._scope = scope;

		const channels: number[] = scope === "all" ? Array.from({ length: doc.song.getChannelCount() }, (_, i) => i) : [doc.channel];

		const patternDiffs: PatternDiff[] =
			mode === "patterns" ? channels.map((ch) => computePatternDiff(doc, ch)).filter((d): d is PatternDiff => d !== null) : [];
		const instrumentDiffs: InstrumentDiff[] =
			mode === "instruments" ? channels.map((ch) => computeInstrumentDiff(doc, ch)).filter((d): d is InstrumentDiff => d !== null) : [];

		const hasChanges = patternDiffs.length > 0 || instrumentDiffs.length > 0;

		const title =
			mode === "patterns"
				? `Clean Patterns (LSDj) — ${scope === "all" ? "All Channels" : "Current Channel"}`
				: `Clean Instruments (LSDj) — ${scope === "all" ? "All Channels" : "Current Channel"}`;

		this.container = div(
			{ class: "prompt cleanChannelPrompt noSelection" },
			h2({}, title),
			this._diffList,
			hasChanges ? this._okayButton : div(),
			this._cancelButton,
		);

		this.buildTitlebar();
		this._render(patternDiffs, instrumentDiffs, hasChanges);
	}

	private _render(patternDiffs: PatternDiff[], instrumentDiffs: InstrumentDiff[], hasChanges: boolean): void {
		while (this._diffList.firstChild) this._diffList.removeChild(this._diffList.firstChild);

		if (!hasChanges) {
			this._diffList.appendChild(p({ class: "ccpEmpty" }, "No duplicate patterns or instruments found. Nothing to clean."));
			return;
		}

		if (this._mode === "patterns") {
			for (const diff of patternDiffs) {
				this._diffList.appendChild(this._buildPatternSection(diff));
			}
		} else {
			for (const diff of instrumentDiffs) {
				this._diffList.appendChild(this._buildInstrumentSection(diff));
			}
		}
	}

	private _toggleSection(channelIndex: number): void {
		if (this._collapsed.has(channelIndex)) {
			this._collapsed.delete(channelIndex);
		} else {
			this._collapsed.add(channelIndex);
		}
		// Re-render the list
		const channels: number[] = this._scope === "all" ? Array.from({ length: this._doc.song.getChannelCount() }, (_, i) => i) : [this._doc.channel];

		const patternDiffs: PatternDiff[] =
			this._mode === "patterns" ? channels.map((ch) => computePatternDiff(this._doc, ch)).filter((d): d is PatternDiff => d !== null) : [];
		const instrumentDiffs: InstrumentDiff[] =
			this._mode === "instruments" ? channels.map((ch) => computeInstrumentDiff(this._doc, ch)).filter((d): d is InstrumentDiff => d !== null) : [];
		this._render(patternDiffs, instrumentDiffs, patternDiffs.length > 0 || instrumentDiffs.length > 0);
	}

	private _buildPatternSection(diff: PatternDiff): HTMLDivElement {
		const isCollapsed = this._collapsed.has(diff.channelIndex);

		const section = div({ class: "ccpCategory" });
		if (isCollapsed) section.classList.add("collapsed");

		// Header (clickable, collapsible)
		const header = div({ class: "ccpCategoryHeader" });
		const toggleIcon = span({ class: "ccpCollapseIcon" });
		toggleIcon.textContent = isCollapsed ? "\u25B6" : "\u25BC";
		header.appendChild(toggleIcon);
		header.appendChild(h2({}, diff.channelLabel));
		header.appendChild(span({ class: "ccpHeaderSummary" }, `${diff.patternsBefore} → ${diff.patternsAfter}`));
		header.addEventListener("click", () => this._toggleSection(diff.channelIndex));
		section.appendChild(header);

		if (!isCollapsed) {
			const body = div({ class: "ccpCategoryBody" });

			// Summary line
			body.appendChild(p({ class: "ccpSummary" }, `${diff.mergedPatterns.length} duplicate${diff.mergedPatterns.length !== 1 ? "s" : ""} removed`));

			// Bar remap table
			const barRows: HTMLTableRowElement[] = [tr(th("Bar"), th("Before"), th({ class: "ccpArrow" }, "→"), th("After"))];
			for (const r of diff.barRemaps) {
				barRows.push(tr(td(`${r.bar + 1}`), td(`${r.from}`), td({ class: "ccpArrow" }, "→"), td(`${r.to}`)));
			}
			body.appendChild(div({ class: "ccpTableWrap" }, p({ class: "ccpTableLabel" }, "Bar remap"), table(tbody(...barRows))));

			// Merged patterns table
			if (diff.mergedPatterns.length > 0) {
				const mergedRows: HTMLTableRowElement[] = [tr(th("Old #"), th({ class: "ccpArrow" }, "→"), th("Merged into #"))];
				for (const m of diff.mergedPatterns) {
					mergedRows.push(tr(td(`${m.oldIndex}`), td({ class: "ccpArrow" }, "→"), td(`${m.intoIndex}`)));
				}
				body.appendChild(div({ class: "ccpTableWrap" }, p({ class: "ccpTableLabel" }, "Merged patterns"), table(tbody(...mergedRows))));
			}

			section.appendChild(body);
		}

		return section;
	}

	private _buildInstrumentSection(diff: InstrumentDiff): HTMLDivElement {
		const isCollapsed = this._collapsed.has(diff.channelIndex);

		const section = div({ class: "ccpCategory" });
		if (isCollapsed) section.classList.add("collapsed");

		// Header
		const header = div({ class: "ccpCategoryHeader" });
		const toggleIcon = span({ class: "ccpCollapseIcon" });
		toggleIcon.textContent = isCollapsed ? "\u25B6" : "\u25BC";
		header.appendChild(toggleIcon);
		header.appendChild(h2({}, diff.channelLabel));
		header.appendChild(span({ class: "ccpHeaderSummary" }, `${diff.instrumentsBefore} → ${diff.instrumentsAfter}`));
		header.addEventListener("click", () => this._toggleSection(diff.channelIndex));
		section.appendChild(header);

		if (!isCollapsed) {
			const body = div({ class: "ccpCategoryBody" });

			// Remap table
			const rows: HTMLTableRowElement[] = [tr(th("Old Inst"), th({ class: "ccpArrow" }, "→"), th("New Inst"), th("Fingerprint"))];
			for (const r of diff.remap) {
				rows.push(
					tr(
						td(`${r.oldIndex + 1}`),
						td({ class: "ccpArrow" }, "→"),
						td(r.newIndex >= 0 ? `${r.newIndex + 1}` : "dropped"),
						td({ class: "ccpFingerprint" }, r.fingerprint === "dropped" ? "(unused)" : r.fingerprint),
					),
				);
			}
			body.appendChild(div({ class: "ccpTableWrap" }, p({ class: "ccpTableLabel" }, "Instrument remap"), table(tbody(...rows))));

			if (diff.dropped.length > 0) {
				body.appendChild(p({ class: "ccpDropped" }, `Dropped: ${diff.dropped.map((i) => i + 1).join(", ")}`));
			}

			section.appendChild(body);
		}

		return section;
	}

	protected override _saveChanges(): void {
		const channels: number[] = this._scope === "all" ? Array.from({ length: this._doc.song.getChannelCount() }, (_, i) => i) : [this._doc.channel];

		const group = new ChangeGroup();

		if (this._mode === "patterns") {
			for (const ch of channels) {
				group.append(new ChangeCleanChannelPatterns(this._doc, ch));
			}
		} else {
			for (const ch of channels) {
				group.append(new ChangeCleanChannelInstruments(this._doc, ch));
			}
		}

		this._doc.prompt = null;
		this._doc.record(group);
	}
}
