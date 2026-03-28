// synth/plugins/pulse.ts
//
// Purpose: Pulse width modulation synthesis plugin

import type { Instrument } from "../instruments";
import type { Synth } from "../synth";
import { Config, InstrumentType } from "../synth-config";
import { buildPulseWidthSource } from "../synthesis/pulse";
import { registerPlugin } from "./registry";

function getSynthFunction(_instrument: Instrument, synth: typeof Synth): Function {
  return synth.getStaticSynthFunction(InstrumentType.pwm)!;
}

registerPlugin({
  type: InstrumentType.pwm,
  name: "Pulse Width",
  displayName: "pulse width",
  editorRows: ["pulseWidth"],
  initialize: (instrument: Instrument) => {
    instrument.chord = Config.chords.dictionary["arpeggio"].index;
    instrument.pulseWidth = Config.pulseWidthRange;
    instrument.decimalOffset = 0;
  },
  getSynthFunction,
  buildSource: (_instrument: Instrument, voiceCount?: number) => buildPulseWidthSource(voiceCount ?? 0),
});
