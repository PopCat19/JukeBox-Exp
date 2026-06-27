# Presets NG: GM Program Mapping Reference

Purpose: Cross-reference between JukeBox Exp's algorithmic presets and General MIDI
program numbers used by MIDI files and SoundFonts like FatBoy GM.

Used during finetuning: pick a FatBoy instrument, find the matching row, open the
JukeBox preset in-editor, tweak until it sounds close.

## Columns

- **Prog**: GM program number (0–127). This is what a MIDI file's `programChange`
  event sends — program 0 selects piano, program 40 selects violin, etc.
- **GM Name**: Standard General MIDI Level 1 instrument name.
- **JB Preset**: The `Presets NG` preset auto-selected on MIDI import.
- **JB Synth Type**: Which synthesis engine the preset uses.
- **Notes**: Noise-channel variants, subharmonic offsets, or multiple presets
  for the same program.

## Piano

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 0 | Acoustic Grand Piano | grand piano 1 NG | Picked String | 3 variants: 1/2/3 |
| 1 | Bright Acoustic Piano | bright piano NG | Picked String | |
| 2 | Electric Grand Piano | electric grand NG | chip | |
| 3 | Honky-tonk Piano | honky-tonk piano NG | Picked String | |
| 4 | Electric Piano 1 | electric piano 1 NG | harmonics | |
| 5 | Electric Piano 2 | electric piano 2 NG | FM | |
| 6 | Harpsichord | harpsichord NG | Picked String | |
| 7 | Clavinet | clavinet NG | FM | |

## Chromatic Percussion

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 8 | Celesta | celesta NG | FM | |
| 9 | Glockenspiel | glockenspiel NG | FM | |
| 10 | Music Box | music box 1 NG | Picked String | |
| 11 | Vibraphone | vibraphone NG | FM | |
| 12 | Marimba | marimba NG | FM | |
| 13 | Xylophone | xylophone NG | FM | |
| 14 | Tubular Bells | tubular bell NG | Picked String | −1 octave subharmonic |
| 15 | Dulcimer | dulcimer NG | Picked String | |

## Organ

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 16 | Drawbar Organ | drawbar organ 1 NG | harmonics | −1 octave |
| 17 | Percussive Organ | percussive organ NG | FM | −1 octave |
| 18 | Rock Organ | rock organ NG | FM | −1 octave |
| 19 | Church Organ | pipe organ NG | FM | −1 octave |
| 20 | Reed Organ | reed organ NG | harmonics | |
| 21 | Accordion | accordion NG | chip | |
| 22 | Harmonica | harmonica NG | FM | |
| 23 | Tango Accordion | bandoneon NG | harmonics | |

## Guitar

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 24 | Nylon String Guitar | nylon guitar NG | FM | |
| 25 | Steel String Guitar | steel guitar NG | Picked String | |
| 26 | Jazz Electric Guitar | jazz guitar NG | harmonics | |
| 27 | Clean Electric Guitar | clean guitar NG | harmonics | |
| 28 | Muted Electric Guitar | muted guitar NG | FM | |
| 29 | Overdriven Guitar | overdrive guitar NG | Picked String | |
| 30 | Distortion Guitar | distortion guitar NG | Picked String | |
| 31 | Guitar Harmonics | guitar harmonics NG | FM | |

## Bass

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 32 | Acoustic Bass | acoustic bass NG | harmonics | |
| 33 | Fingered Bass | fingered bass NG | harmonics | |
| 34 | Picked Bass | picked bass NG | FM | |
| 35 | Fretless Bass | fretless bass NG | harmonics | |
| 36 | Slap Bass 1 | slap bass 1 NG | harmonics | |
| 37 | Slap Bass 2 | slap bass 2 NG | FM | |
| 38 | Synth Bass 1 | bass synth 1 NG | FM | |
| 39 | Synth Bass 2 | bass synth 2 NG | FM | |

## Strings

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 40 | Violin | violin 1 NG | FM | 2 variants: 1/2 |
| 41 | Viola | viola NG | FM | |
| 42 | Cello | cello NG | FM | |
| 43 | Contrabass | contrabass NG | FM | |
| 44 | Tremolo Strings | tremolo strings NG | FM | |
| 45 | Pizzicato Strings | pizzicato strings NG | FM | |
| 46 | Orchestral Harp | harp NG | FM | |
| 47 | Timpani | timpani NG | FM | noise channel |
| 48 | String Ensemble 1 | strings NG | FM | |
| 49 | String Ensemble 2 | slow strings NG | FM | |
| 50 | Synth Strings 1 | strings synth 1 NG | chip | |
| 51 | Synth Strings 2 | strings synth 2 NG | FM | |

## Ensemble

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 52 | Choir Aahs | choir tenor NG | harmonics | |
| 53 | Voice Oohs | voice ooh NG | harmonics | |
| 54 | Synth Voice | voice synth NG | chip | |
| 55 | Orchestra Hit | orchestra hit 1 NG | FM | −1 octave, 2 variants |

## Brass

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 56 | Trumpet | trumpet NG | FM | |
| 57 | Trombone | trombone NG | FM | |
| 58 | Tuba | tuba NG | FM | |
| 59 | Muted Trumpet | muted trumpet NG | FM | |
| 60 | French Horn | french horn NG | FM | |
| 61 | Brass Section | brass section NG | FM | |
| 62 | Synth Brass 1 | brass synth 1 NG | FM | |
| 63 | Synth Brass 2 | brass synth 2 NG | FM | |

## Reed

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 64 | Soprano Sax | soprano sax NG | FM | |
| 65 | Alto Sax | alto sax NG | FM | |
| 66 | Tenor Sax | tenor sax NG | FM | |
| 67 | Baritone Sax | baritone sax NG | FM | |
| 68 | Oboe | oboe NG | FM | |
| 69 | English Horn | english horn NG | FM | |
| 70 | Bassoon | bassoon NG | FM | |
| 71 | Clarinet | clarinet NG | FM | |

## Pipe

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 72 | Piccolo | piccolo NG | FM | |
| 73 | Flute | flute 1 NG | FM | 2 variants: 1/2 |
| 74 | Recorder | recorder NG | chip | |
| 75 | Pan Flute | pan flute NG | FM | |
| 76 | Blown Bottle | blown bottle NG | FM | |
| 77 | Shakuhachi | shakuhachi NG | FM | |
| 78 | Whistle | whistle NG | chip | |
| 79 | Ocarina | ocarina NG | FM | |

## Synth Lead

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 80 | Lead 1 (square) | square lead NG | chip | |
| 81 | Lead 2 (sawtooth) | sawtooth lead 1 NG | chip | 2 variants: 1/2 |
| 82 | Lead 3 (calliope) | calliope NG | FM | |
| 83 | Lead 4 (chiff) | chiffer NG | FM | |
| 84 | Lead 5 (charang) | charango synth NG | FM | |
| 85 | Lead 6 (voice) | vox synth lead NG | FM | |
| 86 | Lead 7 (fifths) | fifth saw lead NG | supersaw | −1 octave |
| 87 | Lead 8 (bass+lead) | bass & lead NG | chip | |

## Synth Pad

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 88 | Pad 1 (new age) | new age pad NG | FM | |
| 89 | Pad 2 (warm) | warm pad NG | FM | |
| 90 | Pad 3 (polysynth) | polysynth pad NG | FM | |
| 91 | Pad 4 (choir) | space voice pad NG | FM | |
| 92 | Pad 5 (bowed) | bowed glass pad NG | FM | |
| 93 | Pad 6 (metallic) | metallic pad NG | FM | |
| 94 | Pad 7 (halo) | choir soprano NG | harmonics | |
| 95 | Pad 8 (sweep) | sweep pad NG | FM | |

## Synth Effects

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 96 | FX 1 (rain) | rain drop NG | FM | |
| 97 | FX 2 (soundtrack) | soundtrack NG | FM | |
| 98 | FX 3 (crystal) | crystal NG | FM | |
| 99 | FX 4 (atmosphere) | atmosphere NG | FM | |
| 100 | FX 5 (brightness) | brightness NG | FM | |
| 101 | FX 6 (goblins) | goblins NG | FM | |
| 102 | FX 7 (echoes) | echo drop NG | FM | |
| 103 | FX 8 (sci-fi) | sci-fi NG | FM | |

## Ethnic

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 104 | Sitar | sitar NG | FM | |
| 105 | Banjo | banjo NG | FM | |
| 106 | Shamisen | shamisen NG | FM | |
| 107 | Koto | koto NG | FM | |
| 108 | Kalimba | kalimba NG | FM | |
| 109 | Bagpipe | bagpipe NG | harmonics | |
| 110 | Fiddle | fiddle NG | FM | |
| 111 | Shanai | shehnai NG | FM | |

## Percussive

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 112 | Tinkle Bell | tinkle bell NG | FM | |
| 113 | Agogo | agogo NG | FM | |
| 114 | Steel Drums | steel pan NG | FM | |
| 115 | Woodblock | woodblock NG | FM | noise channel |
| 116 | Taiko Drum | taiko drum NG | FM | noise channel |
| 117 | Melodic Tom | melodic drum NG | FM | noise channel |
| 118 | Synth Drum | drum synth NG | FM | noise channel |

## Sound Effects

| Prog | GM Name | JB Preset | JB Synth Type | Notes |
|------|---------|-----------|---------------|-------|
| 119 | Reverse Cymbal | reverse cymbal NG | noise | noise channel |
| 120 | Guitar Fret Noise | guitar fret noise NG | spectrum | |
| 121 | Breath Noise | breath noise NG | FM | |
| 122 | Seashore | seashore NG | noise | noise channel |
| 123 | Bird Tweet | bird tweet NG | FM | |
| 124 | Telephone Ring | telephone ring NG | FM | |
| 125 | Helicopter | helicopter NG | noise | noise channel |
| 126 | Applause | applause NG | noise | noise channel |
| 127 | Gunshot | gunshot NG | spectrum | noise channel |

---

## FatBoy GM Reference

FatBoy GM is a General MIDI Level 1 SoundFont. Program numbers map 1:1 to the
GM Name column — program 0 in your MIDI file selects "Acoustic Grand Piano" in
both FatBoy and JukeBox Exp.

The fundamental difference is synthesis approach:

| | FatBoy GM | JukeBox Exp |
|---|---|---|
| Sound source | Sampled/wavetable | Algorithmic (FM, Karplus-Strong, additive) |
| Piano | Multi-sample velocity layers | Picked String (Karplus-Strong) model |
| Brass/Reed | Sampled from real instruments | FM with feedback routing |
| Drums | Sampled kit | Algorithmic drum synthesis + noise |

**They will never sound identical.** The goal is musically usable approximation
— warm enough, punchy enough, and recognisable as the intended instrument.

---

## How MIDI import works

1. MIDI file has a `programChange` event (e.g. program 0 = piano)
2. `EditorConfig.midiProgramToPresetValue(program)` scans all preset categories
   for a preset with `generalMidi: true` and matching `midiProgram`
3. First match wins → loaded onto the channel
4. If no match: default instrument for that channel type

The `Presets NG` category ensures all 128 programs have a match.

---

## Finetuning workflow

```bash
# 1. Open the preset in-editor, tweak until it sounds close to FatBoy
# 2. Export the finetuned instrument JSON:
#    Ctrl+Shift+I  → copies to clipboard
# 3. Paste the JSON into presets-ng.ts, replacing the old settings block
# 4. Rebuild and verify:
bun run build
bun run dev
# 5. Import a MIDI file using the target program to test auto-mapping
```

## Synth types and what to tweak per family

| Synth Type | Best for | Key parameters to adjust |
|---|---|---|
| Picked String | Pianos, guitars, harps | `harmonics[]` array, `stringSustain`, `eqFilter[]`, `unison` |
| FM | Brass, reeds, basses, bells, pads | `operators[]` freq/amp/waveform, `algorithm`, `feedback*`, envelopes |
| harmonics | Strings, choirs, organs | `harmonics[]` weights, `filterCutoffHz`, `filterResonance` |
| chip | Leads, retro, simple waves | `wave` (square/saw/triangle), `unison`, `eqFilter[]` |
| supersaw | Thick pads, leads | `dynamism`, `spread`, `shape`, `pulseWidth` |
| PWM | Thick basses, pads | `pulseWidth`, `decimalOffset`, envelopes on pulse width |
| noise | Percussion, FX | `wave` (white/retro), `filterCutoffHz` |
| spectrum | FX, noise-based tones | `spectrum[]` bin weights |
| custom chip | Retro console waves | `customChipWave[]` 64-sample waveform |

---

## Key: noise-channel vs normal presets

Some drum/percussion programs (47, 115–119, 122, 125–127) are mapped to
**noise-channel** presets (`isNoise: true`). In JukeBox Exp, noise channels
use a different oscillator path than pitched channels — they ignore pitch and
play at a fixed frequency. This is intentional: timpani, woodblock, taiko,
applause, gunshot don't need pitch tracking.
