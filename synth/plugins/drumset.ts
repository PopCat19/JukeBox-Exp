// synth/plugins/drumset.ts
//
// Purpose: Drumset synthesis plugin

import type { Instrument } from "../instruments";
import type { Synth } from "../synth";
import { Config, InstrumentType } from "../synth-config";
import { buildDrumSource } from "../synthesis/drum";
import { SpectrumWave } from "../waves";
import { registerPlugin } from "./registry";

function getSynthFunction(_instrument: Instrument, synth: typeof Synth): Function {
  return synth.getStaticSynthFunction(InstrumentType.drumset)!;
}

registerPlugin({
  type: InstrumentType.drumset,
  name: "Drumset",
  displayName: "drumset",
  editorRows: ["drumset"],
  initialize: (instrument: Instrument) => {
    instrument.chord = Config.chords.dictionary["simultaneous"].index;
    for (let i = 0; i < Config.drumCount; i++) {
      instrument.drumsetEnvelopes[i] = Config.envelopes.dictionary["twang 2"].index;
      if (instrument.drumsetSpectrumWaves[i] == undefined) {
        instrument.drumsetSpectrumWaves[i] = new SpectrumWave(true);
      }
      instrument.drumsetSpectrumWaves[i].reset(true);
    }
  },
  getSynthFunction,
  buildSource: (_instrument: Instrument, voiceCount?: number) => buildDrumSource(voiceCount ?? 0),
});
