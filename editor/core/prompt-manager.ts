// PromptManager
//
// Purpose: Manages the lifecycle of editor prompt dialogs
//
// This module:
// - Creates and destroys Prompt subclass instances by name
// - Handles play/pause state around prompt display
// - Manages prompt container DOM visibility

import { SongDocument } from "../SongDocument";
import { Prompt } from "../prompts/Prompt";
import { ExportPrompt } from "../prompts/ExportPrompt";
import { ImportPrompt } from "../prompts/ImportPrompt";
import { SongRecoveryPrompt } from "../prompts/SongRecoveryPrompt";
import { SongDurationPrompt } from "../prompts/SongDurationPrompt";
import { BeatsPerBarPrompt } from "../prompts/BeatsPerBarPrompt";
import { OctaveCountPrompt } from "../prompts/OctaveCountPrompt";
import { MoveNotesSidewaysPrompt } from "../prompts/MoveNotesSidewaysPrompt";
import { ChannelSettingsPrompt } from "../prompts/ChannelSettingsPrompt";
import { LimiterPrompt } from "../prompts/LimiterPrompt";
import { CustomScalePrompt } from "../prompts/CustomScalePrompt";
import { CustomChipPrompt } from "../prompts/CustomChipPrompt";
import { CustomFilterPrompt } from "../prompts/CustomFilterPrompt";
import { ThemePrompt } from "../prompts/ThemePrompt";
import { LayoutPrompt } from "../prompts/LayoutPrompt";
import { RecordingSetupPrompt } from "../prompts/RecordingSetupPrompt";
import { InstrumentExportPrompt } from "../prompts/InstrumentExportPrompt";
import { InstrumentImportPrompt } from "../prompts/InstrumentImportPrompt";
import { SustainPrompt } from "../prompts/SustainPrompt";
import { AddSamplesPrompt } from "../prompts/AddSamplesPrompt";
import { EuclideanRhythmPrompt } from "../prompts/EuclidgenRhythmPrompt";
import { CustomThemePrompt } from "../prompts/CustomThemePrompt";
import { VisualLoopControlsPrompt } from "../prompts/VisualLoopControlsPrompt";
import { SampleLoadingStatusPrompt } from "../prompts/SampleLoadingStatusPrompt";
import { ShortenerConfigPrompt } from "../prompts/ShortenerConfigPrompt";
import { TipPrompt } from "../prompts/TipPrompt";
import { HarmonicsEditorPrompt } from "../components/HarmonicsEditor";
import { SpectrumEditorPrompt } from "../components/SpectrumEditor";
import { PatternEditor } from "../components/PatternEditor";

export interface PromptHost {
    doc: SongDocument;
    refocusStage(): void;
    patternEditor: PatternEditor;
    trackArea: HTMLDivElement;
}

export class PromptManager {
    public prompt: Prompt | null = null;
    private _currentPromptName: string | null = null;
    private _wasPlaying: boolean = false;

    constructor(
        private _host: PromptHost,
        private _promptContainer: HTMLDivElement,
        private _promptContainerBG: HTMLDivElement,
    ) {}

    public open(promptName: string): void {
        this._host.doc.openPrompt(promptName);
        this._setPrompt(promptName);
    }

    public close(): void {
        this._setPrompt(null);
    }

    public getCurrentName(): string | null {
        return this._currentPromptName;
    }

    public sync(promptName: string | null): void {
        this._setPrompt(promptName);
    }

    private _setPrompt(promptName: string | null): void {
        if (this._currentPromptName == promptName) return;
        this._currentPromptName = promptName;
        const doc = this._host.doc;

        if (this.prompt) {
            if (this._wasPlaying && !(this.prompt instanceof TipPrompt || this.prompt instanceof LimiterPrompt || this.prompt instanceof CustomScalePrompt || this.prompt instanceof CustomChipPrompt || this.prompt instanceof CustomFilterPrompt || this.prompt instanceof VisualLoopControlsPrompt || this.prompt instanceof SustainPrompt || this.prompt instanceof HarmonicsEditorPrompt || this.prompt instanceof SpectrumEditorPrompt)) {
                doc.performance.play();
            }
            this._wasPlaying = false;
            this._promptContainerBG.style.display = "none";
            this._promptContainer.style.display = "none";
            this._promptContainer.removeChild(this.prompt.container);
            this.prompt.cleanUp();
            this.prompt = null;
            this._host.refocusStage();
        }

        if (promptName) {
            switch (promptName) {
                case "export": this.prompt = new ExportPrompt(doc); break;
                case "import": this.prompt = new ImportPrompt(doc); break;
                case "songRecovery": this.prompt = new SongRecoveryPrompt(doc); break;
                case "barCount": this.prompt = new SongDurationPrompt(doc); break;
                case "beatsPerBar": this.prompt = new BeatsPerBarPrompt(doc); break;
                case "octaves": this.prompt = new OctaveCountPrompt(doc); break;
                case "moveNotesSideways": this.prompt = new MoveNotesSidewaysPrompt(doc); break;
                case "channelSettings": this.prompt = new ChannelSettingsPrompt(doc); break;
                case "limiterSettings": this.prompt = new LimiterPrompt(doc, this._host as any); break;
                case "customScale": this.prompt = new CustomScalePrompt(doc); break;
                case "customChipSettings": this.prompt = new CustomChipPrompt(doc, this._host as any); break;
                case "customEQFilterSettings": this.prompt = new CustomFilterPrompt(doc, this._host as any, false); break;
                case "customNoteFilterSettings": this.prompt = new CustomFilterPrompt(doc, this._host as any, true); break;
                case "customSongEQFilterSettings": this.prompt = new CustomFilterPrompt(doc, this._host as any, false, true); break;
                case "theme": this.prompt = new ThemePrompt(doc); break;
                case "layout": this.prompt = new LayoutPrompt(doc); break;
                case "recordingSetup": this.prompt = new RecordingSetupPrompt(doc); break;
                case "exportInstrument": this.prompt = new InstrumentExportPrompt(doc); break;
                case "importInstrument": this.prompt = new InstrumentImportPrompt(doc); break;
                case "stringSustain": this.prompt = new SustainPrompt(doc); break;
                case "addExternal": this.prompt = new AddSamplesPrompt(doc); break;
                case "generateEuclideanRhythm": this.prompt = new EuclideanRhythmPrompt(doc); break;
                case "customTheme": this.prompt = new CustomThemePrompt(doc, this._host.patternEditor, this._host.trackArea, document.getElementById("beepboxEditorContainer")!); break;
                case "visualLoopControls": this.prompt = new VisualLoopControlsPrompt(doc, this._host as any); break;
                case "sampleLoadingStatus": this.prompt = new SampleLoadingStatusPrompt(doc); break;
                case "configureShortener": this.prompt = new ShortenerConfigPrompt(doc); break;
                case "harmonicsSettings": this.prompt = new HarmonicsEditorPrompt(doc, this._host as any); break;
                case "spectrumSettings": this.prompt = new SpectrumEditorPrompt(doc, this._host as any, false); break;
                case "drumsetSettings": this.prompt = new SpectrumEditorPrompt(doc, this._host as any, true); break;
                default: this.prompt = new TipPrompt(doc, promptName); break;
            }

            if (this.prompt) {
                if (!(this.prompt instanceof TipPrompt || this.prompt instanceof LimiterPrompt || this.prompt instanceof CustomChipPrompt || this.prompt instanceof CustomFilterPrompt || this.prompt instanceof VisualLoopControlsPrompt || this.prompt instanceof SustainPrompt || this.prompt instanceof HarmonicsEditorPrompt || this.prompt instanceof SpectrumEditorPrompt)) {
                    this._wasPlaying = doc.synth.playing;
                    doc.performance.pause();
                }
                this._promptContainer.style.display = "";
                if (doc.prefs.frostedGlassBackground == true) {
                    this._promptContainerBG.style.display = "";
                    this._promptContainerBG.style.backgroundColor = "rgba(0,0,0, 0)";
                    this._promptContainerBG.style.backdropFilter = "brightness(0.9) blur(14px)";
                    this._promptContainerBG.style.opacity = "1";
                } else {
                    this._promptContainerBG.style.display = "";
                    this._promptContainerBG.style.backgroundColor = "var(--editor-background)";
                    this._promptContainerBG.style.backdropFilter = "";
                    this._promptContainerBG.style.opacity = "0.5";
                }
                this._promptContainer.appendChild(this.prompt.container);
                document.body.appendChild(this._promptContainerBG);
            }
        }
    }
}
