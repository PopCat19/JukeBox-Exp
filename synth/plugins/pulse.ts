// synth/plugins/pulse.ts
//
// Purpose: Pulse width modulation synthesis plugin

import { InstrumentType } from "../SynthConfig";
import type { Instrument } from "../instruments";
import type { Synth } from "../synth";
import { buildPulseWidthSource } from "../synthesis/pulse";
import { registerPlugin } from "./registry";

function getSynthFunction(_instrument: Instrument, synth: typeof Synth): Function {
    return synth.getStaticSynthFunction(InstrumentType.pwm)!;
}

registerPlugin({
    type: InstrumentType.pwm,
    name: "Pulse Width",
    getSynthFunction,
    buildSource: (_instrument: Instrument, voiceCount?: number) => buildPulseWidthSource(voiceCount ?? 0),
});
