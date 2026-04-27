# Micro-Loop Sub-Editor

## Purpose

A mini step-sequencer embedded inside a note for rate-independent density and texture effects.

## Overview

```
Pattern → Notes → [Sub-Editor → Pieces]
```

A sub-editor is a grid editor inside a note where "pieces" (mini-slices of the note's sound) are placed. A playhead loops through them at a configurable rate, creating density/texture effects independent of song BPM.

## Use Cases

### Speedcore Kick Rush
- Note: single kick
- Sub-editor: 4 pieces, all same kick slice
- Rate: 32 cycles/bar
- Result: 32 kicks/bar inside one note, song stays 174 BPM

### Pitch-Bent Texture
- Note: vocal chop
- Sub-editor: 8 pieces
- Pieces: pitch +0, +5, +7, +12 semitones
- Rate: 4 cycles/bar
- Result: cascading vocal fragments, pitch-arpeggio effect

### Drop "Riser" Kick
- Note: kick
- Range: 0..2 bars (before drop)
- Rate: curve from 2 → 16 cycles/bar
- Result: kick accelerates into the drop, all inside one note

### Tonal Noise Texture
- Note: noise sample
- Sub-editor: random pieces with varying pitch offsets
- Rate: 8 cycles/bar
- Result: shimmering noise texture for atmospheres/pads

### Snare Rush Fill
- Note: snare
- Range: last 0.5 bar of phrase
- Rate: 16 cycles/bar
- Result: snare roll without writing 8 separate notes

### Color Bass Growl
- Note: Reese bass
- Sub-editor: pitch-shifted slices
- Rate: 12 cycles/bar, slight pitch curve per cycle
- Result: moving harmonic content inside sustained note

## Genre Applications

### Frenchcore
- Distorted kick rolls, pitch-bent kicks
- Sub-editor: density + pitch ramps on kick
- No need for manual kick spam or resampling

### Psytrance
- Rolling bass gate patterns
- Sub-editor: 16th-note slices, tight rate, slight pitch movement across pieces

### Color Bass (Camellia, Laur, Seatrus)
- Complex harmonic movement inside sustained bass
- Sub-editor: pitch-shifted micro-loops at high rate
- The "shimmer" and "growl" come from rapid cycling through pitch offsets

### Technotrance
- Driving rhythmic textures
- Sub-editor: snare/hihat slices at odd densities
- Creates "rushing" feel without tempo automation

## Key Controls

| Param | Meaning |
|-------|---------|
| range | Bar offset within note (start, end) — where sub-editor activates |
| rate | Cycles per bar/beat (density) — tempo-relative unit, independent of song BPM |
| pitch | Pitch offset (global or per-piece) |
| pieces[] | Grid cells holding slice/pitch data |

## Difference From Existing Tools

| Tool | Limitation |
|------|------------|
| Arpeggiator | Tied to song tempo |
| LFO | Modulates parameters, not playback |
| Granular synth | Continuous, not grid-programmed |
| LSDJ chains | Still on tempo grid |
| Resampling | Destructive, hard to edit |

This concept: discrete programmed slices, rate-decoupled, fully editable.

## Modulator Support

Not redundant — adds expressiveness:

- Built-in curves: quick control
- Modulator routing: external/complex control (pattern automation, MIDI CC)

Both can coexist.

## Export As Sample

- Primary format: JukeBox-Exp schema (editor-native)
- Sample export: render feature, post-serialization
- Use cases: freeze CPU, use in other DAWs, share one-shots
- Status: optional later, not core

## Implementation Plan

### 1. Data Structure
- Note gets optional `subEditor` field
- Fields: `pieces[]`, `rate`, `range`, `pitch`

### 2. Playback Engine
- During note playback, check for sub-editor
- If present: play slices in loop order at given rate
- Rate runs independent clock from song BPM

### 3. UI
- Note property panel → "Edit Micro-Loop" button
- Opens mini grid editor
- Controls: rate slider, range start/end, pitch offset

### 4. Serialization
- Save to JukeBox-Exp schema as part of note data
- Nested in note object

### 5. Later (optional)
- Modulator routing
- Export rendered output as sample

## Build Order

1. Schema (where data lives)
2. Playback (does it sound right)
3. UI (how to edit it)
4. Extras