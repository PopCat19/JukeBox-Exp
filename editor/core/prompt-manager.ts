// PromptManager
//
// Purpose: Manages the lifecycle of editor prompt dialogs
//
// This module:
// - Creates and destroys Prompt subclass instances by name
// - Handles play/pause state around prompt display
// - Manages prompt container DOM visibility

import { HarmonicsEditorPrompt } from "../components/harmonics-editor";
import { PatternEditor } from "../components/pattern-editor";
import { SpectrumEditorPrompt } from "../components/spectrum-editor";
import { AddSamplesPrompt } from "../prompts/add-samples-prompt";
import { BeatsPerBarPrompt } from "../prompts/beats-per-bar-prompt";
import { ChannelVolumeVisualizerPrompt } from "../prompts/channel-volume-visualizer-prompt";
import { ChannelSettingsPrompt } from "../prompts/channel-settings-prompt";
import { CustomChipPrompt } from "../prompts/custom-chip-prompt";
import { CustomFilterPrompt } from "../prompts/custom-filter-prompt";
import { CustomScalePrompt } from "../prompts/custom-scale-prompt";
import { CustomThemePrompt } from "../prompts/custom-theme-prompt";
import { EuclidgenRhythmPrompt } from "../prompts/euclidgen-rhythm-prompt";
import { ExportPrompt } from "../prompts/export-prompt";
import { ImportPrompt } from "../prompts/import-prompt";
import { InstrumentExportPrompt } from "../prompts/instrument-export-prompt";
import { InstrumentImportPrompt } from "../prompts/instrument-import-prompt";
import { LayoutPrompt } from "../prompts/layout-prompt";
import { LimiterPrompt } from "../prompts/limiter-prompt";
import { MoveNotesSidewaysPrompt } from "../prompts/move-notes-sideways-prompt";
import { OctaveCountPrompt } from "../prompts/octave-count-prompt";
import { Prompt } from "../prompts/prompt";
import { RecordingSetupPrompt } from "../prompts/recording-setup-prompt";
import { SampleLoadingStatusPrompt } from "../prompts/sample-loading-status-prompt";
import { ShortenerConfigPrompt } from "../prompts/shortener-config-prompt";
import { SongDurationPrompt } from "../prompts/song-duration-prompt";
import { SongRecoveryPrompt } from "../prompts/song-recovery-prompt";
import { SustainPrompt } from "../prompts/sustain-prompt";
import { ThemePrompt } from "../prompts/theme-prompt";
import { TipPrompt } from "../prompts/tip-prompt";
import { VisualLoopControlsPrompt } from "../prompts/visual-loop-controls-prompt";
import { SongDocument } from "../song-document";

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
      if (
        this._wasPlaying
        && !(this.prompt instanceof TipPrompt || this.prompt instanceof LimiterPrompt
          || this.prompt instanceof CustomScalePrompt || this.prompt instanceof CustomChipPrompt
          || this.prompt instanceof CustomFilterPrompt || this.prompt instanceof VisualLoopControlsPrompt
          || this.prompt instanceof SustainPrompt || this.prompt instanceof HarmonicsEditorPrompt
          || this.prompt instanceof SpectrumEditorPrompt || this.prompt instanceof ChannelVolumeVisualizerPrompt)
      ) {
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
        case "export":
          this.prompt = new ExportPrompt(doc);
          break;
        case "import":
          this.prompt = new ImportPrompt(doc);
          break;
        case "songRecovery":
          this.prompt = new SongRecoveryPrompt(doc);
          break;
        case "barCount":
          this.prompt = new SongDurationPrompt(doc);
          break;
        case "beatsPerBar":
          this.prompt = new BeatsPerBarPrompt(doc);
          break;
        case "octaves":
          this.prompt = new OctaveCountPrompt(doc);
          break;
        case "moveNotesSideways":
          this.prompt = new MoveNotesSidewaysPrompt(doc);
          break;
        case "channelSettings":
          this.prompt = new ChannelSettingsPrompt(doc);
          break;
        case "channelVolumeVisualizer":
          this.prompt = new ChannelVolumeVisualizerPrompt(doc, this._host as any);
          break;
        case "limiterSettings":
          this.prompt = new LimiterPrompt(doc, this._host as any);
          break;
        case "customScale":
          this.prompt = new CustomScalePrompt(doc);
          break;
        case "customChipSettings":
          this.prompt = new CustomChipPrompt(doc, this._host as any);
          break;
        case "customEQFilterSettings":
          this.prompt = new CustomFilterPrompt(doc, this._host as any, false);
          break;
        case "customNoteFilterSettings":
          this.prompt = new CustomFilterPrompt(doc, this._host as any, true);
          break;
        case "customSongEQFilterSettings":
          this.prompt = new CustomFilterPrompt(doc, this._host as any, false, true);
          break;
        case "theme":
          this.prompt = new ThemePrompt(doc);
          break;
        case "layout":
          this.prompt = new LayoutPrompt(doc);
          break;
        case "recordingSetup":
          this.prompt = new RecordingSetupPrompt(doc);
          break;
        case "exportInstrument":
          this.prompt = new InstrumentExportPrompt(doc);
          break;
        case "importInstrument":
          this.prompt = new InstrumentImportPrompt(doc);
          break;
        case "stringSustain":
          this.prompt = new SustainPrompt(doc);
          break;
        case "addExternal":
          this.prompt = new AddSamplesPrompt(doc);
          break;
        case "generateEuclideanRhythm":
          this.prompt = new EuclidgenRhythmPrompt(doc);
          break;
        case "customTheme":
          this.prompt = new CustomThemePrompt(
            doc,
            this._host.patternEditor,
            this._host.trackArea,
            document.getElementById("beepboxEditorContainer")!,
          );
          break;
        case "visualLoopControls":
          this.prompt = new VisualLoopControlsPrompt(doc, this._host as any);
          break;
        case "sampleLoadingStatus":
          this.prompt = new SampleLoadingStatusPrompt(doc);
          break;
        case "configureShortener":
          this.prompt = new ShortenerConfigPrompt(doc);
          break;
        case "harmonicsSettings":
          this.prompt = new HarmonicsEditorPrompt(doc, this._host as any);
          break;
        case "spectrumSettings":
          this.prompt = new SpectrumEditorPrompt(doc, this._host as any, false);
          break;
        case "drumsetSettings":
          this.prompt = new SpectrumEditorPrompt(doc, this._host as any, true);
          break;
        default:
          this.prompt = new TipPrompt(doc, promptName);
          break;
      }

      if (this.prompt) {
        if (
          !(this.prompt instanceof TipPrompt || this.prompt instanceof LimiterPrompt
            || this.prompt instanceof CustomChipPrompt || this.prompt instanceof CustomFilterPrompt
            || this.prompt instanceof VisualLoopControlsPrompt || this.prompt instanceof SustainPrompt
            || this.prompt instanceof HarmonicsEditorPrompt || this.prompt instanceof SpectrumEditorPrompt
            || this.prompt instanceof ChannelVolumeVisualizerPrompt)
        ) {
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
