import { SongDocument } from "../song-document";
import { FilterEditor } from "../components/filter-editor";
import { BarScrollBar } from "../components/bar-scroll-bar";

export class PlayerAnimator {
    public outVolumeHistoricTimer: number = 0;
    public outVolumeHistoricCap: number = 0;
    public lastOutVolumeCap: number = 0;

    constructor(
        private _doc: SongDocument,
        private _callbacks: {
            modSliderUpdate(): void;
            getCtrlHeld(): boolean;
            getShiftHeld(): boolean;
            eqFilterEditor: FilterEditor;
            noteFilterEditor: FilterEditor;
            songEqFilterEditor: FilterEditor;
            barScrollBar: BarScrollBar;
            outVolumeBar: SVGElement;
            outVolumeCap: SVGElement;
        },
    ) {}

    public animate = (): void => {
        this._callbacks.modSliderUpdate();
        if (this._doc.prefs.displayVolumeBar) {
            this.volumeUpdate();
        }
        this._callbacks.barScrollBar.animatePlayhead();

        const ctrlShift = this._callbacks.getCtrlHeld() || this._callbacks.getShiftHeld();
        if (this._doc.synth.isFilterModActive(false, this._doc.channel, this._doc.getCurrentInstrument())) {
            this._callbacks.eqFilterEditor.render(true, ctrlShift);
        }
        if (this._doc.synth.isFilterModActive(true, this._doc.channel, this._doc.getCurrentInstrument())) {
            this._callbacks.noteFilterEditor.render(true, ctrlShift);
        }
        if (this._doc.synth.isFilterModActive(false, 0, 0, true)) {
            this._callbacks.songEqFilterEditor.render(true, ctrlShift);
        }

        window.requestAnimationFrame(this.animate);
    }

    public volumeUpdate = (): void => {
        this.outVolumeHistoricTimer--;
        if (this.outVolumeHistoricTimer <= 0) {
            this.outVolumeHistoricCap -= 0.03;
        }
        if (this._doc.song.outVolumeCap > this.outVolumeHistoricCap) {
            this.outVolumeHistoricCap = this._doc.song.outVolumeCap;
            this.outVolumeHistoricTimer = 50;
        }

        if (this._doc.song.outVolumeCap != this.lastOutVolumeCap) {
            this.lastOutVolumeCap = this._doc.song.outVolumeCap;
            this._callbacks.outVolumeBar.setAttribute("width", "" + Math.min(144, this._doc.song.outVolumeCap * 144));
            this._callbacks.outVolumeCap.setAttribute("x", "" + (8 + Math.min(144, this.outVolumeHistoricCap * 144)));
        }
    }
}
