// render-effects
//
// Purpose: Syncs effects select option text with on/off icons for current instrument
//
// This module:
// - Ensures enough option children exist in the effects select
// - Updates each effect option label with enabled/disabled icon prefix

import { Instrument } from "../../synth";
import { Config } from "../../synth/synth-config";
import { HTML } from "imperative-html/dist/esm/elements-strict";

const { option } = HTML;

export function renderEffectsSelect(effectsSelect: HTMLSelectElement, instrument: Instrument, textOnIcon: string, textOffIcon: string): void {
    for (let i: number = effectsSelect.childElementCount - 1; i < Config.effectOrder.length; i++) {
        effectsSelect.appendChild(option({ value: i }));
    }
    effectsSelect.selectedIndex = -1;
    for (let i: number = 0; i < Config.effectOrder.length; i++) {
        const effectFlag: number = Config.effectOrder[i];
        const selected: boolean = ((instrument.effects & (1 << effectFlag)) != 0);
        const label: string = (selected ? textOnIcon : textOffIcon) + Config.effectNames[effectFlag];
        const opt: HTMLOptionElement = <HTMLOptionElement>effectsSelect.children[i + 1];
        if (opt.textContent != label) opt.textContent = label;
    }
}
