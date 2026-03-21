// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { FilterType, EffectType, AutomationTarget, Config } from "../../synth/SynthConfig";
import { FilterSettings, FilterControlPoint, Instrument } from "../../synth";
import { Change, UndoableChange } from "../Change";
import { SongDocument } from "../SongDocument";

export class ChangeEQFilterType extends Change {
    constructor(doc: SongDocument, instrument: Instrument, newValue: boolean) {
        super();
        instrument.eqFilterType = newValue;
        if (newValue == true) { // To Simple - clear eq filter
            instrument.eqFilter.reset();
            instrument.tmpEqFilterStart = instrument.eqFilter;
            instrument.tmpEqFilterEnd = null;
        }
        else {
            // To Advanced - convert filter
            instrument.eqFilter.convertLegacySettings(instrument.eqFilterSimpleCut, instrument.eqFilterSimplePeak, Config.envelopes.dictionary["none"]);
            instrument.tmpEqFilterStart = instrument.eqFilter;
            instrument.tmpEqFilterEnd = null;
        }
        instrument.clearInvalidEnvelopeTargets();
        instrument.preset = instrument.type;
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeNoteFilterType extends Change {
    constructor(doc: SongDocument, instrument: Instrument, newValue: boolean) {
        super();
        instrument.noteFilterType = newValue;
        if (newValue == true) { // To Simple - clear note filter, kill modulators
            instrument.noteFilter.reset();
            instrument.tmpNoteFilterStart = instrument.noteFilter;
            instrument.tmpNoteFilterEnd = null;
        }
        else {
            // To Advanced - convert filter, kill modulators
            instrument.noteFilter.convertLegacySettings(instrument.noteFilterSimpleCut, instrument.noteFilterSimplePeak, Config.envelopes.dictionary["none"]);
            instrument.tmpNoteFilterStart = instrument.noteFilter;
            instrument.tmpNoteFilterEnd = null;
        }
        instrument.clearInvalidEnvelopeTargets();
        instrument.preset = instrument.type;
        doc.notifier.changed();
        this._didSomething();
    }
}

export class ChangeSongFilterAddPoint extends UndoableChange {
    private _doc: SongDocument;
    private _filterSettings: FilterSettings;
    private _point: FilterControlPoint;
    private _index: number;
    constructor(doc: SongDocument, filterSettings: FilterSettings, point: FilterControlPoint, index: number, deletion: boolean = false) {
            super(deletion);
            this._doc = doc;
            this._filterSettings = filterSettings;
            this._point = point;
            this._index = index;
    
                this._didSomething();
            this.redo();
        }

        protected _doForwards(): void {
this._filterSettings.controlPoints.splice(this._index, 0, this._point);
        this._filterSettings.controlPointCount++;
        this._filterSettings.controlPoints.length = this._filterSettings.controlPointCount;
        this._doc.song.tmpEqFilterStart = this._doc.song.eqFilter;
        this._doc.song.tmpEqFilterEnd = null;
        this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
this._filterSettings.controlPoints.splice(this._index, 1);
        this._filterSettings.controlPointCount--;
        this._filterSettings.controlPoints.length = this._filterSettings.controlPointCount;
        this._doc.song.tmpEqFilterStart = this._doc.song.eqFilter;
        this._doc.song.tmpEqFilterEnd = null;
        this._doc.notifier.changed();
    }
}

export class ChangeFilterAddPoint extends UndoableChange {
    private _doc: SongDocument;
    private _instrument: Instrument;
    private _instrumentPrevPreset: number;
    private _instrumentNextPreset: number;
    private _filterSettings: FilterSettings;
    private _point: FilterControlPoint;
    private _index: number;
    private _envelopeTargetsAdd: number[] = [];
    private _envelopeIndicesAdd: number[] = [];
    private _envelopeTargetsRemove: number[] = [];
    private _envelopeIndicesRemove: number[] = [];
    constructor(doc: SongDocument, filterSettings: FilterSettings, point: FilterControlPoint, index: number, isNoteFilter: boolean, deletion: boolean = false) {
        super(deletion);
        this._doc = doc;
        this._instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
        this._instrumentNextPreset = deletion ? this._instrument.preset : this._instrument.type;
        this._instrumentPrevPreset = deletion ? this._instrument.type : this._instrument.preset;
        this._filterSettings = filterSettings;
        this._point = point;
        this._index = index;

        for (let envelopeIndex: number = 0; envelopeIndex < this._instrument.envelopeCount; envelopeIndex++) {
            let target: number = this._instrument.envelopes[envelopeIndex].target;
            let targetIndex: number = this._instrument.envelopes[envelopeIndex].index;
            this._envelopeTargetsAdd.push(target);
            this._envelopeIndicesAdd.push(targetIndex);
            if (deletion) {
                const automationTarget: AutomationTarget = Config.instrumentAutomationTargets[target];
                if (automationTarget.isFilter && (automationTarget.effect == EffectType.noteFilter) == isNoteFilter) {
                    if (automationTarget.maxCount == Config.filterMaxPoints) {
                        if (targetIndex == index) {
                            target = Config.instrumentAutomationTargets.dictionary["none"].index;
                            targetIndex = 0;
                        } else if (targetIndex > index) {
                            targetIndex--;
                        }
                    } else {
                        if (filterSettings.controlPointCount <= 1) {
                            target = Config.instrumentAutomationTargets.dictionary["none"].index;
                            targetIndex = 0;
                        }
                    }
                }
            }
            this._envelopeTargetsRemove.push(target);
            this._envelopeIndicesRemove.push(targetIndex);
        }

        this._didSomething();
        this.redo();
    }

    protected _doForwards(): void {
        this._filterSettings.controlPoints.splice(this._index, 0, this._point);
        this._filterSettings.controlPointCount++;
        this._filterSettings.controlPoints.length = this._filterSettings.controlPointCount;
        this._instrument.preset = this._instrumentNextPreset;
        for (let envelopeIndex: number = 0; envelopeIndex < this._instrument.envelopeCount; envelopeIndex++) {
            this._instrument.envelopes[envelopeIndex].target = this._envelopeTargetsAdd[envelopeIndex];
            this._instrument.envelopes[envelopeIndex].index = this._envelopeIndicesAdd[envelopeIndex];
        }
        this._instrument.tmpEqFilterStart = this._instrument.eqFilter;
        this._instrument.tmpEqFilterEnd = null;
        this._instrument.tmpNoteFilterStart = this._instrument.noteFilter;
        this._instrument.tmpNoteFilterEnd = null;
        this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        this._filterSettings.controlPoints.splice(this._index, 1);
        this._filterSettings.controlPointCount--;
        this._filterSettings.controlPoints.length = this._filterSettings.controlPointCount;
        this._instrument.preset = this._instrumentPrevPreset;
        for (let envelopeIndex: number = 0; envelopeIndex < this._instrument.envelopeCount; envelopeIndex++) {
            this._instrument.envelopes[envelopeIndex].target = this._envelopeTargetsRemove[envelopeIndex];
            this._instrument.envelopes[envelopeIndex].index = this._envelopeIndicesRemove[envelopeIndex];
        }
        this._instrument.tmpEqFilterStart = this._instrument.eqFilter;
        this._instrument.tmpEqFilterEnd = null;
        this._instrument.tmpNoteFilterStart = this._instrument.noteFilter;
        this._instrument.tmpNoteFilterEnd = null;
        this._doc.notifier.changed();
    }
}

export class FilterMoveData {
    public point: FilterControlPoint;
    public freq: number;
    public gain: number;

    constructor(usePoint: FilterControlPoint, useFreq: number, useGain: number) {
        this.point = usePoint;
        this.freq = useFreq;
        this.gain = useGain;
    }
}

export class ChangeSongFilterMovePoint extends UndoableChange {
    private _doc: SongDocument;
    private _point: FilterControlPoint;
    private _oldFreq: number;
    private _newFreq: number;
    private _oldGain: number;
    private _newGain: number;
    public pointIndex: number;
    public pointType: FilterType;
    constructor(doc: SongDocument, point: FilterControlPoint, oldFreq: number, newFreq: number, oldGain: number, newGain: number, pointIndex: number) {
            super(false);
            this._doc = doc;
            this._point = point;
            this._oldFreq = oldFreq;
            this._newFreq = newFreq;
            this._oldGain = oldGain;
            this._newGain = newGain;
            this.pointIndex = pointIndex;
            this.pointType = point.type;
            this._didSomething();
            this.redo();
        }

        public getMoveData(beforeChange: boolean): FilterMoveData {
            if (beforeChange) {
                    return new FilterMoveData(this._point, this._oldFreq, this._oldGain);
                }
            return new FilterMoveData(this._point, this._newFreq, this._newGain);
        }

        protected _doForwards(): void {
 this._point.freq = this._newFreq;
        this._point.gain = this._newGain;
        this._doc.notifier.changed();
    }

        protected _doBackwards(): void {
 this._point.freq = this._oldFreq;
        this._point.gain = this._oldGain;
        this._doc.notifier.changed();
    }
}

export class ChangeFilterMovePoint extends UndoableChange {
    private _doc: SongDocument;
    private _instrument: Instrument;
    private _instrumentPrevPreset: number;
    private _instrumentNextPreset: number;
    private _point: FilterControlPoint;
    private _oldFreq: number;
    private _newFreq: number;
    private _oldGain: number;
    private _newGain: number;
    public useNoteFilter: boolean;
    public pointIndex: number;
    public pointType: FilterType;
    constructor(doc: SongDocument, point: FilterControlPoint, oldFreq: number, newFreq: number, oldGain: number, newGain: number, useNoteFilter: boolean, pointIndex: number) {
        super(false);
        this._doc = doc;
        this._instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
        this._instrumentNextPreset = this._instrument.type;
        this._instrumentPrevPreset = this._instrument.preset;
        this._point = point;
        this._oldFreq = oldFreq;
        this._newFreq = newFreq;
        this._oldGain = oldGain;
        this._newGain = newGain;
        this.useNoteFilter = useNoteFilter;
        this.pointIndex = pointIndex;
        this.pointType = point.type;
        this._didSomething();
        this.redo();
    }

    public getMoveData(beforeChange: boolean): FilterMoveData {
        if (beforeChange) {
            return new FilterMoveData(this._point, this._oldFreq, this._oldGain);
        }
        return new FilterMoveData(this._point, this._newFreq, this._newGain);
    }

    protected _doForwards(): void {
        this._point.freq = this._newFreq;
        this._point.gain = this._newGain;
        this._instrument.preset = this._instrumentNextPreset;
        this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        this._point.freq = this._oldFreq;
        this._point.gain = this._oldGain;
        this._instrument.preset = this._instrumentPrevPreset;
        this._doc.notifier.changed();
    }
}

export class ChangeSongFilterSettings extends UndoableChange {
    private _doc: SongDocument;
    private _filterSettings: FilterSettings;
    private _subFilters: (FilterSettings | null)[];
    private _oldSubFilters: (FilterSettings | null)[];
    private _oldSettings: FilterSettings;
    
    constructor(doc: SongDocument, settings: FilterSettings, oldSettings: FilterSettings, subFilters: (FilterSettings | null)[] | null = null, oldSubFilters: (FilterSettings | null)[] | null = null) {
        super(false);
        this._doc = doc;
        this._oldSettings = oldSettings;
        this._filterSettings = settings;
        if (subFilters != null && oldSubFilters != null) {
                this._subFilters = subFilters;
                this._oldSubFilters = oldSubFilters;
            }
        this._didSomething();
        this.redo();
    }

    protected _doForwards(): void {
        this._doc.song.eqFilter = this._filterSettings;
        if (this._subFilters != null)
                this._doc.song.eqSubFilters = this._subFilters;
        this._doc.song.tmpEqFilterStart = this._doc.song.eqFilter;
        this._doc.song.tmpEqFilterEnd = null;

            this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        this._doc.song.eqFilter = this._oldSettings;
        if (this._oldSubFilters != null)
                this._doc.song.eqSubFilters = this._oldSubFilters;
        this._doc.song.tmpEqFilterStart = this._doc.song.eqFilter;
        this._doc.song.tmpEqFilterEnd = null;
        this._doc.notifier.changed();
    }
}

export class ChangeFilterSettings extends UndoableChange {
    private _doc: SongDocument;
    private _instrument: Instrument;
    private _instrumentPrevPreset: number;
    private _instrumentNextPreset: number;
    private _filterSettings: FilterSettings;
    private _subFilters: (FilterSettings | null)[];
    private _oldSubFilters: (FilterSettings | null)[];
    private _oldSettings: FilterSettings;
    private _useNoteFilter: boolean;
    constructor(doc: SongDocument, settings: FilterSettings, oldSettings: FilterSettings, useNoteFilter: boolean, subFilters: (FilterSettings | null)[] | null = null, oldSubFilters: (FilterSettings | null)[] | null = null) {
        super(false);
        this._doc = doc;
        this._instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
        this._instrumentNextPreset = this._instrument.type;
        this._instrumentPrevPreset = this._instrument.preset;
        this._oldSettings = oldSettings;
        this._useNoteFilter = useNoteFilter;
        this._filterSettings = settings;
        if (subFilters != null && oldSubFilters != null) {
            this._subFilters = subFilters;
            this._oldSubFilters = oldSubFilters;
        }
        this._instrument.clearInvalidEnvelopeTargets();
        this._didSomething();
        this.redo();
    }

    protected _doForwards(): void {

        if (this._useNoteFilter) {
            this._instrument.noteFilter = this._filterSettings;
            if (this._subFilters != null)
                this._instrument.noteSubFilters = this._subFilters;
            this._instrument.tmpNoteFilterStart = this._instrument.noteFilter;
            this._instrument.tmpNoteFilterEnd = null;
        } else {
            this._instrument.eqFilter = this._filterSettings;
            if (this._subFilters != null)
                this._instrument.eqSubFilters = this._subFilters;
            this._instrument.tmpEqFilterStart = this._instrument.eqFilter;
            this._instrument.tmpEqFilterEnd = null;
        }

        this._instrument.preset = this._instrumentNextPreset;
        this._instrument.clearInvalidEnvelopeTargets();
        this._doc.notifier.changed();
    }

    protected _doBackwards(): void {
        if (this._useNoteFilter) {
            this._instrument.noteFilter = this._oldSettings;
            if (this._oldSubFilters != null)
                this._instrument.noteSubFilters = this._oldSubFilters;
            this._instrument.tmpNoteFilterStart = this._instrument.noteFilter;
            this._instrument.tmpNoteFilterEnd = null;
        } else {
            this._instrument.eqFilter = this._oldSettings;
            if (this._oldSubFilters != null)
                this._instrument.eqSubFilters = this._oldSubFilters;
            this._instrument.tmpEqFilterStart = this._instrument.eqFilter;
            this._instrument.tmpEqFilterEnd = null;
        }
        this._instrument.preset = this._instrumentPrevPreset;
        this._instrument.clearInvalidEnvelopeTargets();
        this._doc.notifier.changed();
    }
}
