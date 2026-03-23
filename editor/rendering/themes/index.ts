// editor/rendering/themes/index.ts
//
// Purpose: Theme registry assembling all named theme CSS variable maps
//
// This module:
// - Imports each theme's CSS string
// - Exports a single Record mapping theme names to CSS

import { darkClassic } from "./dark-classic";
import { darkCompetition } from "./dark-competition";
import { lightClassic } from "./light-classic";
import { jummboxClassic } from "./jummbox-classic";
import { forest } from "./forest";
import { canyon } from "./canyon";
import { midnight } from "./midnight";
import { jummboxLight } from "./jummbox-light";
import { amoledDark } from "./amoled-dark";
import { beachcombing } from "./beachcombing";
import { roe } from "./roe";
import { moonlight } from "./moonlight";
import { autumn } from "./autumn";
import { fruit } from "./fruit";
import { sunset } from "./sunset";
import { toxic } from "./toxic";
import { violetVerdant } from "./violet-verdant";
import { portal } from "./portal";
import { fusion } from "./fusion";
import { inverse } from "./inverse";
import { nebula } from "./nebula";
import { roeLight } from "./roe-light";
import { energized } from "./energized";
import { neapolitan } from "./neapolitan";
import { slushie } from "./slushie";
import { ultraboxDark } from "./ultrabox-dark";
import { modboxClassic } from "./modbox-classic";
import { zefbox } from "./zefbox";
import { sandboxClassic } from "./sandbox-classic";
import { harrybox } from "./harrybox";
import { brucebox } from "./brucebox";
import { shitbox2 } from "./shitbox-2";
import { shitbox3 } from "./shitbox-3";
import { nerdbox } from "./nerdbox";
import { nepbox } from "./nepbox";
import { cardboardboxClassic } from "./cardboardbox-classic";
import { bluboxClassic } from "./blubox-classic";
import { dogeboxClassic } from "./dogebox-classic";
import { dogeboxDark } from "./dogebox-dark";
import { todboxDarkMode } from "./todbox-dark-mode";
import { mainbox1 } from "./mainbox-1";
import { fogbox } from "./fogbox";
import { foxbox } from "./foxbox";
import { wackybox } from "./wackybox";
import { microbox } from "./microbox";
import { paandorasbox } from "./paandorasbox";
import { dogebox2 } from "./dogebox2";
import { abyssboxClassic } from "./abyssbox-classic";
import { abyssboxLight } from "./abyssbox-light";
import { slarmoosbox } from "./slarmoosbox";
import { axobox } from "./axobox";
import { lemmboxDark } from "./lemmbox-dark";
import { death } from "./death";
import { edoboxClassic } from "./edobox-classic";
import { bloxboxClassic } from "./bloxbox-classic";
import { fmbox } from "./fmbox";
import { azurLane } from "./azur-lane";

const customTheme: string = `${localStorage.getItem("customColors") || `:root {  }`}`;

export const themes: { [name: string]: string } = {
    "dark classic": darkClassic,
    "dark competition": darkCompetition,
    "light classic": lightClassic,
    "jummbox classic": jummboxClassic,
    "forest": forest,
    "canyon": canyon,
    "midnight": midnight,
    "jummbox light": jummboxLight,
    "amoled dark": amoledDark,
    "beachcombing": beachcombing,
    "roe": roe,
    "moonlight": moonlight,
    "autumn": autumn,
    "fruit": fruit,
    "sunset": sunset,
    "toxic": toxic,
    "violet verdant": violetVerdant,
    "portal": portal,
    "fusion": fusion,
    "inverse": inverse,
    "nebula": nebula,
    "roe light": roeLight,
    "energized": energized,
    "neapolitan": neapolitan,
    "slushie": slushie,
    "ultrabox dark": ultraboxDark,
    "modbox classic": modboxClassic,
    "zefbox": zefbox,
    "sandbox classic": sandboxClassic,
    "harrybox": harrybox,
    "brucebox": brucebox,
    "shitbox 2.0": shitbox2,
    "shitbox 3.0": shitbox3,
    "nerdbox": nerdbox,
    "nepbox": nepbox,
    "cardboardbox classic": cardboardboxClassic,
    "blubox classic": bluboxClassic,
    "dogebox classic": dogeboxClassic,
    "dogebox dark": dogeboxDark,
    "todbox dark mode": todboxDarkMode,
    "mainbox 1.0": mainbox1,
    "fogbox": fogbox,
    "foxbox": foxbox,
    "wackybox": wackybox,
    "microbox": microbox,
    "paandorasbox": paandorasbox,
    "dogebox2": dogebox2,
    "abyssbox classic": abyssboxClassic,
    "abyssbox light": abyssboxLight,
    "slarmoosbox": slarmoosbox,
    "axobox": axobox,
    "lemmbox dark": lemmboxDark,
    "death": death,
    "edobox classic": edoboxClassic,
    "bloxbox classic": bloxboxClassic,
    "fmbox": fmbox,
    "azur lane": azurLane,
    "custom": customTheme,
};
