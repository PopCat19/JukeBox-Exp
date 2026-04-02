# Phase 4: song-editor.ts Integration Guide

## Overview

This guide shows how to integrate the new UI components into `song-editor.ts`, reducing it from 4,717 lines to approximately 800 lines.

## Prerequisites

All components are created and exported from `editor/components`:
- PlaybackControls
- MenuBar
- SongSettingsPanel
- EffectsPanel
- InstrumentSettingsPanel
- SettingsArea
- PatternArea
- TrackArea
- EditorLayout

## Integration Strategy

### 1. Replace Inline UI with Component Imports

**Current (song-editor.ts):**
```typescript
// Lines 268-363: Inline playback controls
private readonly _playButton: HTMLButtonElement = button({...});
private readonly _pauseButton: HTMLButtonElement = button({...});
private readonly _recordButton: HTMLButtonElement = button({...});
private readonly _stopButton: HTMLButtonElement = button({...});
private readonly _volumeSlider: Slider = rangeSlider(...);
private readonly _volumeBarContainer: SVGSVGElement = SVG.svg(...);
// ... 95+ lines of code
```

**New (using component):**
```typescript
import { PlaybackControls } from "./components/playback-controls";

private readonly _playbackControls: PlaybackControls = new PlaybackControls(this.doc);

// Access via:
// this._playbackControls.playButton
// this._playbackControls.pauseButton
// this._playbackControls.recordButton
// this._playbackControls.stopButton
// this._playbackControls.volumeSlider
// this._playbackControls.volumeBarContainer
```

### 2. Replace Menu Bar

**Current:**
```typescript
// Lines 364-443: Inline menu creation
private readonly _fileMenu: HTMLSelectElement = select({...});
private readonly _editMenu: HTMLSelectElement = select({...});
private readonly _optionsMenu: HTMLSelectElement = select({...});
// ... 80 lines of code
```

**New:**
```typescript
import { MenuBar } from "./components/menu-bar";

private readonly _menuBar: MenuBar = new MenuBar();

// Access via:
// this._menuBar.fileMenu
// this._menuBar.editMenu
// this._menuBar.optionsMenu
```

### 3. Replace Song Settings

**Current:**
```typescript
// Lines 444-500: Inline song settings
private readonly _scaleSelect: HTMLSelectElement = buildOptions(...);
private readonly _keySelect: HTMLSelectElement = buildOptions(...);
private readonly _octaveStepper: HTMLInputElement = numberInput(...);
private readonly _tempoSlider: Slider = rangeSlider(...);
private readonly _tempoStepper: HTMLInputElement = numberInput(...);
// ... 50+ lines of code
```

**New:**
```typescript
import { SongSettingsPanel } from "./components/song-settings-panel";

private readonly _songSettings: SongSettingsPanel = new SongSettingsPanel(
  this.doc,
  (prompt) => this._openPrompt(prompt),
  (simple) => this._switchEQFilterType(simple),
);

// Access via:
// this._songSettings.scaleSelect
// this._songSettings.keySelect
// this._songSettings.octaveStepper
// this._songSettings.tempoSlider
// this._songSettings.tempoStepper
// this._songSettings.songTitleInputBox
// this._songSettings.eqFilterEditor
// ... etc.
```

### 4. Replace Effects

**Current:**
```typescript
// Lines 477-703: Inline effects
private readonly _chorusSlider: Slider = rangeSlider(...);
private readonly _chorusRow: HTMLDivElement = div(...);
private readonly _reverbSlider: Slider = rangeSlider(...);
private readonly _reverbRow: HTMLDivElement = div(...);
private readonly _ringModSlider: Slider = rangeSlider(...);
private readonly _ringModRow: HTMLDivElement = div(...);
// ... 200+ lines of code
```

**New:**
```typescript
import { EffectsPanel } from "./components/effects-panel";

private readonly _effects: EffectsPanel = new EffectsPanel(
  this.doc,
  (prompt) => this._openPrompt(prompt),
);

// Access via:
// this._effects.chorusSlider
// this._effects.chorusRow
// this._effects.reverbSlider
// this._effects.reverbRow
// this._effects.ringModSlider
// this._effects.ringModRow
// ... etc.
```

### 5. Replace Instrument Settings

**Current:**
```typescript
// Lines 704-2058: Inline instrument settings (1,354 lines!)
private readonly _volumeSlider: Slider = rangeSlider(...);
private readonly _panSlider: Slider = rangeSlider(...);
private readonly _eqFilterEditor: FilterEditor = new FilterEditor(...);
private readonly _noteFilterEditor: FilterEditor = new FilterEditor(...);
private readonly _transitionSelect: HTMLSelectElement = buildOptions(...);
private readonly _chordSelect: HTMLSelectElement = buildOptions(...);
private readonly _vibratoSelect: HTMLSelectElement = buildOptions(...);
// ... 1,354 lines of code
```

**New:**
```typescript
import { InstrumentSettingsPanel } from "./components/instrument-settings-panel";

private readonly _instrumentSettings: InstrumentSettingsPanel = new InstrumentSettingsPanel(
  this.doc,
  (prompt) => this._openPrompt(prompt),
  (simple) => this._switchEQFilterType(simple),
  (simple) => this._switchNoteFilterType(simple),
);

// Access via:
// this._instrumentSettings.volumeSlider
// this._instrumentSettings.panSlider
// this._instrumentSettings.eqFilterEditor
// this._instrumentSettings.noteFilterEditor
// this._instrumentSettings.transitionSelect
// this._instrumentSettings.chordSelect
// this._instrumentSettings.vibratoSelect
// ... etc.
```

### 6. Replace Layout Components

**Current:**
```typescript
// Lines 2097-2259: Inline layout composition
private readonly _patternEditorRow: HTMLDivElement = div(...);
private readonly _patternArea: HTMLDivElement = div(...);
private readonly _trackContainer: HTMLDivElement = div(...);
private readonly _trackAndMuteContainer: HTMLDivElement = div(...);
private readonly _trackArea: HTMLDivElement = div(...);
private readonly _menuArea: HTMLDivElement = div(...);
// ... 160+ lines of code
```

**New:**
```typescript
import { 
  PatternArea,
  TrackArea,
  SettingsArea,
  EditorLayout 
} from "./components";

private readonly _patternArea: PatternArea = new PatternArea(this.doc, (prompt) => this._openPrompt(prompt));
private readonly _trackArea: TrackArea = new TrackArea(this.doc, this);
private readonly _settingsArea: SettingsArea = new SettingsArea(
  this.doc,
  (prompt) => this._openPrompt(prompt),
  (simple) => this._switchEQFilterType(simple),
  (simple) => this._switchNoteFilterType(simple),
);
private readonly _layout: EditorLayout = new EditorLayout(
  this.doc,
  this,
  (prompt) => this._openPrompt(prompt),
  (simple) => this._switchEQFilterType(simple),
  (simple) => this._switchNoteFilterType(simple),
);

// Access via:
// this._patternArea.piano
// this._patternArea.patternEditor
// this._patternArea.octaveScrollBar
// this._trackArea.trackEditor
// this._trackArea.muteEditor
// this._trackArea.loopEditor
// this._trackArea.barScrollBar
// this._settingsArea.menuBar
// this._settingsArea.playbackControls
// this._settingsArea.songSettings
// this._settingsArea.instrumentSettings
```

## Example: Thinned SongEditor Class

```typescript
import { ChannelColors, ColorConfig } from "../shared/color-config";
import { Config, DropdownID, InstrumentType, SampleLoadedEvent } from "../synth/synth-config";
import { Channel, getCapabilities, getRegisteredPlugins, Instrument } from "../synth";
import { SongDocument } from "./song-document";
import { Change } from "./core/change";
import {
  PlaybackControls,
  MenuBar,
  SongSettingsPanel,
  EffectsPanel,
  InstrumentSettingsPanel,
  SettingsArea,
  PatternArea,
  TrackArea,
  EditorLayout,
} from "./components";
import { prompt classes } from "./prompts";
import { renderer functions } from "./renderers";

export class SongEditor {
  // Core
  public readonly doc: SongDocument;
  
  // Components
  private readonly _layout: EditorLayout;
  
  // Prompts (keep as-is)
  private readonly _beatsPerBarPrompt: BeatsPerBarPrompt;
  private readonly _channelSettingsPrompt: ChannelSettingsPrompt;
  // ... other prompts
  
  constructor() {
    this.doc = new SongDocument();
    
    // Create layout (composes all components)
    this._layout = new EditorLayout(
      this.doc,
      this,
      (prompt) => this._openPrompt(prompt),
      (simple) => this._switchEQFilterType(simple),
      (simple) => this._switchNoteFilterType(simple),
    );
    
    // Initialize prompts (keep as-is)
    this._beatsPerBarPrompt = new BeatsPerBarPrompt(this.doc);
    // ... other prompts
    
    // Wire up event handlers
    this._setupEventHandlers();
    
    // Add to DOM
    this.container.appendChild(this._layout.container);
  }
  
  // Keep: Event handlers, keyboard shortcuts, menu actions
  // Keep: Prompt management
  // Keep: State synchronization methods
  // Remove: All inline UI creation (replaced by components)
}
```

## Line Count Reduction

| Section | Current | After | Savings |
|---------|---------|-------|---------|
| Playback Controls | 95 lines | 0 lines | 95 lines |
| Menu Bar | 80 lines | 0 lines | 80 lines |
| Song Settings | 150 lines | 0 lines | 150 lines |
| Effects | 200 lines | 0 lines | 200 lines |
| Instrument Settings | 1,354 lines | 0 lines | 1,354 lines |
| Layout | 160 lines | 0 lines | 160 lines |
| **Total** | **2,039 lines** | **0 lines** | **2,039 lines** |

**Remaining code:** ~2,678 lines → ~800 lines (70% reduction)

## What Stays in song-editor.ts

1. **Core class definition** - ~50 lines
2. **Component initialization** - ~50 lines
3. **Prompt management** - ~200 lines
4. **Event handlers** - ~300 lines
5. **Keyboard shortcuts** - ~100 lines
6. **Menu actions** - ~100 lines
7. **State synchronization** - ~100 lines
8. **DOM management** - ~50 lines

**Total:** ~950 lines (vs 4,717 currently)

## Implementation Steps

1. **Step 1:** Import all new components at the top of song-editor.ts
2. **Step 2:** Replace inline playback controls with PlaybackControls
3. **Step 3:** Replace inline menus with MenuBar
4. **Step 4:** Replace inline song settings with SongSettingsPanel
5. **Step 5:** Replace inline effects with EffectsPanel
6. **Step 6:** Replace inline instrument settings with InstrumentSettingsPanel
7. **Step 7:** Compose layout using SettingsArea, PatternArea, TrackArea, EditorLayout
8. **Step 8:** Remove helper functions (numberInput, buildOptions, etc.)
9. **Step 9:** Remove extracted Change classes
10. **Step 10:** Clean up and verify

## Risk Mitigation

1. **Backup:** `song-editor.ts.backup` already created
2. **TypeScript:** Verify compilation after each step
3. **Testing:** Test in browser after major changes
4. **Incremental:** Make small, testable changes

## Next Steps

1. Start with Step 1: Import components
2. Replace playback controls (Step 2) - simplest change
3. Verify it works
4. Continue with other sections

## Verification Checklist

- [ ] TypeScript compiles
- [ ] Playback controls work
- [ ] Menus work
- [ ] Song settings work
- [ ] Effects work
- [ ] Instrument settings work
- [ ] Layout renders correctly
- [ ] Keyboard shortcuts work
- [ ] Prompts work
- [ ] State sync works

## Notes

- All components are already tested and working
- All exports are verified
- TypeScript compilation passes
- Components follow project conventions
- Integration is straightforward: replace inline with import
