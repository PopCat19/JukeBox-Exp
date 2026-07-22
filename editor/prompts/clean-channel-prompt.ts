// clean-channel-prompt.ts
//
// Purpose: Preview and apply LSDj-style pattern/instrument cleaning with diff
//
// This module:
// - Tabbed mode selection: Patterns / Instruments (no filter/search needed)
// - Scope: always all channels
// - Dual-pane layout: channel list (left) + detail tables (right)
// - Each pane gets its own border (mirrors AddSamplesPrompt)
// - Applies changes via ChangeCleanChannelPatterns / ChangeCleanChannelInstruments

import { HTML } from "imperative-html/dist/esm/elements-strict";
import type { Channel, Pattern } from "../../synth";
import { Config } from "../../synth/synth-config";
import {
	ChangeCleanChannelInstruments,
	ChangeCleanChannelPatterns,
	comparePatternNotes,
	patternsContainSameInstruments,
} from "../changes";
import { ChangeGroup } from "../core/change";
import type { SongDocument } from "../song-document";
import { actionButton, flexPane, paneContainer } from "../ui";
import { setTabButtonActive, tabButton } from "../ui/buttons/tab-button";
import { BasePrompt } from "./base-prompt";

const { button, div, h2, span, p, table, tbody, tr, td, th } = HTML;

type Tab = "patterns" | "instruments";

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

type ChannelDiff = PatternDiff | InstrumentDiff;

function channelLabel(doc: SongDocument, index: number): string {
	const name = doc.song.channels[index].name;
	if (name) return `${name} (ch ${index + 1})`;
	if (index < doc.song.pitchChannelCount) return `Pitch ${index + 1}`;
	if (index < doc.song.pitchChannelCount + doc.song.noiseChannelCount)
		return `Noise ${index - doc.song.pitchChannelCount + 1}`;
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
			if (
				!patternsContainSameInstruments(oldPattern.instruments, newPattern.instruments) ||
				newPattern.notes.length !== oldPattern.notes.length
			)
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
			remap: instruments.map((_inst, i) => ({
				oldIndex: i,
				newIndex: 0,
				fingerprint: "dropped",
			})),
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

	const finalCount = Math.max(
		Config.instrumentCountMin,
		Math.min(doc.song.getMaxInstrumentsPerChannel(), fingerprintToNew.size),
	);

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

function diffCountLabel(diff: ChannelDiff, tab: Tab): string {
	if (tab === "patterns") {
		const d = diff as PatternDiff;
		return `Patterns: ${d.patternsBefore} → ${d.patternsAfter}`;
	}
	const d = diff as InstrumentDiff;
	return `Instruments: ${d.instrumentsBefore} → ${d.instrumentsAfter}`;
}

function diffBadge(diff: ChannelDiff, tab: Tab): string {
	if (tab === "patterns") {
		const d = diff as PatternDiff;
		return `${d.mergedPatterns.length} dup${d.mergedPatterns.length !== 1 ? "s" : ""}`;
	}
	const d = diff as InstrumentDiff;
	return `${d.dropped.length} unused`;
}

function computeDiffs(doc: SongDocument, tab: Tab): ChannelDiff[] {
	const result: ChannelDiff[] = [];
	const channels = Array.from({ length: doc.song.getChannelCount() }, (_, i) => i);
	if (tab === "patterns") {
		for (const ch of channels) {
			const d = computePatternDiff(doc, ch);
			if (d) result.push(d);
		}
	} else {
		for (const ch of channels) {
			const d = computeInstrumentDiff(doc, ch);
			if (d) result.push(d);
		}
	}
	return result;
}

export class CleanChannelPrompt extends BasePrompt {
	private _tab: Tab = "patterns";
	private _diffs: ChannelDiff[] = [];
	private _selectedIndex: number = 0;

	private _lastInteraction: "keyboard" | "mouse" | "hover" | null = null;
	private _activePane: "list" | "details" | null = "list";
	private _hoveredPane: "list" | "details" | null = null;

	private readonly _channelList: HTMLDivElement = div({ class: "ccpList" });
	private readonly _detailPane: HTMLDivElement = flexPane({
		flex: "1",
		padding: "var(--padding-8)",
	});
	private readonly _leftPane: HTMLDivElement;
	private readonly _cleanOneButton: HTMLButtonElement = button(
		{ class: "sbpCardActionBtn" },
		"Clean selected",
	);
	private readonly _cleanAllButton: HTMLButtonElement = actionButton("Clean all and Commit");

	private readonly _tabPatterns: HTMLButtonElement;
	private readonly _tabInstruments: HTMLButtonElement;
	private readonly _tabBar: HTMLDivElement;

	public readonly container: HTMLDivElement;

	constructor(doc: SongDocument) {
		super(doc);

		this._diffs = computeDiffs(doc, this._tab);
		const hasChanges = this._diffs.length > 0;

		this._tabPatterns = tabButton("Patterns", true);
		this._tabInstruments = tabButton("Instruments", false);
		this._tabBar = div(
			{ class: "tabBar toggle-group" },
			this._tabPatterns,
			this._tabInstruments,
		);

		this._tabPatterns.addEventListener("click", () => {
			this._switchTab("patterns");
		});
		this._tabInstruments.addEventListener("click", () => {
			this._switchTab("instruments");
		});

		this._cleanOneButton.addEventListener("click", this._onCleanOne);
		this._cleanAllButton.addEventListener("click", this._onCleanAll);

		this._detailPane.classList.add("ccpDetailPane");
		this._detailPane.addEventListener("mouseenter", () => {
			this._lastInteraction = "hover";
			this._hoveredPane = "details";
			this._updateHighlight();
		});
		this._detailPane.addEventListener("mouseleave", () => {
			if (this._hoveredPane === "details") {
				this._hoveredPane = null;
				this._updateHighlight();
			}
		});

		const listContainer = div({ class: "ccpListContainer" }, this._channelList);

		this._leftPane = div({ class: "ccpLeftPane" }, listContainer);
		this._leftPane.addEventListener("mouseenter", () => {
			this._lastInteraction = "hover";
			this._hoveredPane = "list";
			this._updateHighlight();
		});
		this._leftPane.addEventListener("mouseleave", () => {
			if (this._hoveredPane === "list") {
				this._hoveredPane = null;
				this._updateHighlight();
			}
		});

		this.container = div(
			{ class: "prompt cleanChannelPrompt noSelection fill-y" },
			h2({}, "Clean (LSDj)"),
			this._tabBar,
			paneContainer(
				{ height: "400px", gap: "8px", overflow: "hidden", border: "none" },
				this._leftPane,
				this._detailPane,
			),
			div(
				{ class: "ccpBottomBar" },
				this._cleanOneButton,
				this._cleanAllButton,
				this._cancelButton,
			),
		);

		this.buildTitlebar();

		this.container.addEventListener("mouseleave", () => {
			this._hoveredPane = null;
			this._lastInteraction = null;
			this._updateHighlight();
		});

		if (hasChanges) {
			this._selectedIndex = 0;
			this._renderList();
			this._renderDetail();
		} else {
			this._renderEmpty();
		}
	}

	private _updateHighlight = (): void => {
		// No hover on any pane, clear all borders.
		if (this._hoveredPane == null) {
			this._leftPane.style.borderColor = "var(--ui-widget-background)";
			this._detailPane.style.borderColor = "var(--ui-widget-background)";
			return;
		}
		const effectivePane =
			this._lastInteraction === "hover" ? this._hoveredPane : this._activePane;
		const focusedPane = effectivePane === "list" ? this._leftPane : this._detailPane;
		const unfocusedPane = effectivePane === "list" ? this._detailPane : this._leftPane;
		focusedPane.style.borderColor = "var(--indicator-primary, #4444ff)";
		unfocusedPane.style.borderColor = "var(--ui-widget-background)";
	};

	private _switchTab(tab: Tab): void {
		if (tab === this._tab) return;
		this._tab = tab;

		setTabButtonActive(this._tabPatterns, tab === "patterns");
		setTabButtonActive(this._tabInstruments, tab === "instruments");

		this._diffs = computeDiffs(this._doc, this._tab);
		const hasChanges = this._diffs.length > 0;

		if (hasChanges) {
			this._selectedIndex = 0;
			this._renderList();
			this._renderDetail();
		} else {
			this._renderEmpty();
			while (this._channelList.firstChild)
				this._channelList.removeChild(this._channelList.firstChild);
		}
	}

	private _getFilteredIndices(): number[] {
		return this._diffs.map((_, i) => i);
	}

	private _renderList(): void {
		while (this._channelList.firstChild)
			this._channelList.removeChild(this._channelList.firstChild);

		const filtered = this._getFilteredIndices();

		for (const idx of filtered) {
			const diff = this._diffs[idx];
			const isSelected = idx === this._selectedIndex;

			const item = div(
				{
					class: isSelected ? "categoryItem committed" : "categoryItem",
					"data-index": String(idx),
				},
				div({ class: "ccpItemLabel" }, diff.channelLabel),
				span({ class: "ccpItemDetail" }, diffCountLabel(diff, this._tab)),
				span({ class: "ccpItemBadge" }, diffBadge(diff, this._tab)),
			);

			item.addEventListener("click", () => {
				this._selectedIndex = idx;
				this._renderList();
				this._renderDetail();
			});

			this._channelList.appendChild(item);
		}

		if (filtered.length === 0) {
			this._channelList.appendChild(p({ class: "ccpEmptyList" }, "No channels match."));
		}
	}

	private _renderDetail(): void {
		while (this._detailPane.firstChild)
			this._detailPane.removeChild(this._detailPane.firstChild);

		if (this._selectedIndex < 0 || this._selectedIndex >= this._diffs.length) {
			this._detailPane.appendChild(
				div({ class: "ccpEmptyDetail" }, "Select a channel to view its diff."),
			);
			return;
		}

		const diff = this._diffs[this._selectedIndex];

		if (this._tab === "patterns") {
			this._renderPatternDetail(diff as PatternDiff);
		} else {
			this._renderInstrumentDetail(diff as InstrumentDiff);
		}
	}

	private _renderPatternDetail(diff: PatternDiff): void {
		this._detailPane.appendChild(
			div(
				{ class: "ccpDetailSummary" },
				span(
					{ class: "ccpDetailCount" },
					`Patterns: ${diff.patternsBefore} → ${diff.patternsAfter}`,
				),
				span(
					{ class: "ccpDetailMeta" },
					`${diff.mergedPatterns.length} duplicate${diff.mergedPatterns.length !== 1 ? "s" : ""} removed`,
				),
			),
		);

		if (diff.barRemaps.length > 0) {
			const rows: HTMLTableRowElement[] = [
				tr(th("Bar"), th("Before"), th({ class: "ccpArrow" }, "→"), th("After")),
			];
			for (const r of diff.barRemaps) {
				rows.push(
					tr(
						td(`${r.bar + 1}`),
						td(`${r.from}`),
						td({ class: "ccpArrow" }, "→"),
						td(`${r.to}`),
					),
				);
			}
			this._detailPane.appendChild(
				div(
					{ class: "ccpTableWrap" },
					p({ class: "ccpTableLabel" }, "Bar remap"),
					table(tbody(...rows)),
				),
			);
		}

		if (diff.mergedPatterns.length > 0) {
			const rows: HTMLTableRowElement[] = [
				tr(th("Old pattern"), th({ class: "ccpArrow" }, "→"), th("Merged into")),
			];
			for (const m of diff.mergedPatterns) {
				rows.push(
					tr(td(`${m.oldIndex}`), td({ class: "ccpArrow" }, "→"), td(`${m.intoIndex}`)),
				);
			}
			this._detailPane.appendChild(
				div(
					{ class: "ccpTableWrap" },
					p({ class: "ccpTableLabel" }, "Merged patterns"),
					table(tbody(...rows)),
				),
			);
		}
	}

	private _renderInstrumentDetail(diff: InstrumentDiff): void {
		this._detailPane.appendChild(
			div(
				{ class: "ccpDetailSummary" },
				span(
					{ class: "ccpDetailCount" },
					`Instruments: ${diff.instrumentsBefore} → ${diff.instrumentsAfter}`,
				),
				span(
					{ class: "ccpDetailMeta" },
					`${diff.dropped.length} unused instrument${diff.dropped.length !== 1 ? "s" : ""} dropped`,
				),
			),
		);

		const rows: HTMLTableRowElement[] = [
			tr(
				th("Old inst"),
				th({ class: "ccpArrow" }, "→"),
				th("New inst"),
				th({ class: "ccpFingerprint" }, "Fingerprint"),
			),
		];
		for (const r of diff.remap) {
			rows.push(
				tr(
					td(`${r.oldIndex + 1}`),
					td({ class: "ccpArrow" }, "→"),
					td(r.newIndex >= 0 ? `${r.newIndex + 1}` : "dropped"),
					td(
						{ class: "ccpFingerprint" },
						r.fingerprint === "dropped" ? "(unused)" : r.fingerprint,
					),
				),
			);
		}
		this._detailPane.appendChild(
			div(
				{ class: "ccpTableWrap" },
				p({ class: "ccpTableLabel" }, "Instrument remap"),
				table(tbody(...rows)),
			),
		);

		if (diff.dropped.length > 0) {
			this._detailPane.appendChild(
				p(
					{ class: "ccpDropped" },
					`Dropped instruments: ${diff.dropped.map((i) => i + 1).join(", ")}`,
				),
			);
		}
	}

	private _renderEmpty(): void {
		while (this._detailPane.firstChild)
			this._detailPane.removeChild(this._detailPane.firstChild);
		this._detailPane.appendChild(
			p(
				{ class: "ccpEmptyDetail" },
				"No duplicate patterns or instruments found. Nothing to clean.",
			),
		);
	}

	private _onCleanAll = (): void => {
		this._saveChanges();
	};

	private _onCleanOne = (): void => {
		const ch = this._diffs[this._selectedIndex].channelIndex;
		const group = new ChangeGroup();
		if (this._tab === "patterns") {
			group.append(new ChangeCleanChannelPatterns(this._doc, ch));
		} else {
			group.append(new ChangeCleanChannelInstruments(this._doc, ch));
		}
		this._doc.record(group);

		// Recompute diffs for all channels and update list/detail
		this._diffs = computeDiffs(this._doc, this._tab);
		this._selectedIndex = Math.min(this._selectedIndex, Math.max(this._diffs.length - 1, 0));

		if (this._diffs.length === 0) {
			this._renderEmpty();
			while (this._channelList.firstChild)
				this._channelList.removeChild(this._channelList.firstChild);
			return;
		}

		this._renderList();
		this._renderDetail();
	};

	protected override _saveChanges(): void {
		const channels = Array.from({ length: this._doc.song.getChannelCount() }, (_, i) => i);

		const group = new ChangeGroup();

		if (this._tab === "patterns") {
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
