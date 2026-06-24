// index.ts
//
// Purpose: Theme registry assembling all named theme CSS variable maps
//
// This module:
// - Imports each theme's CSS string
// - Exports a single Record mapping theme names to CSS

import { abyssboxClassic } from "./abyssbox-classic";
import { abyssboxLight } from "./abyssbox-light";
import { amoledDark } from "./amoled-dark";
import { autumn } from "./autumn";
import { axobox } from "./axobox";
import { azurLane } from "./azur-lane";
import { beachcombing } from "./beachcombing";
import { bloxboxClassic } from "./bloxbox-classic";
import { bluboxClassic } from "./blubox-classic";
import { brucebox } from "./brucebox";
import { canyon } from "./canyon";
import { cardboardboxClassic } from "./cardboardbox-classic";
import { darkClassic } from "./dark-classic";
import { darkCompetition } from "./dark-competition";
import { death } from "./death";
import { dogeboxClassic } from "./dogebox-classic";
import { dogeboxDark } from "./dogebox-dark";
import { dogebox2 } from "./dogebox2";
import { edoboxClassic } from "./edobox-classic";
import { energized } from "./energized";
import { fmbox } from "./fmbox";
import { fogbox } from "./fogbox";
import { forest } from "./forest";
import { foxbox } from "./foxbox";
import { fruit } from "./fruit";
import { fusion } from "./fusion";
import { harrybox } from "./harrybox";
import { inverse } from "./inverse";
import { jummboxClassic } from "./jummbox-classic";
import { jummboxLight } from "./jummbox-light";
import { lemmboxDark } from "./lemmbox-dark";
import { lightClassic } from "./light-classic";
import { mainbox1 } from "./mainbox-1";
import { microbox } from "./microbox";
import { midnight } from "./midnight";
import { modboxClassic } from "./modbox-classic";
import { moonlight } from "./moonlight";
import { neapolitan } from "./neapolitan";
import { nebula } from "./nebula";
import { nepbox } from "./nepbox";
import { nerdbox } from "./nerdbox";
import { paandorasbox } from "./paandorasbox";
import { portal } from "./portal";
import { roe } from "./roe";
import { roeLight } from "./roe-light";
import { sandboxClassic } from "./sandbox-classic";
import { shitbox2 } from "./shitbox-2";
import { shitbox3 } from "./shitbox-3";
import { slarmoosbox } from "./slarmoosbox";
import { slushie } from "./slushie";
import { sunset } from "./sunset";
import { todboxDarkMode } from "./todbox-dark-mode";
import { toxic } from "./toxic";
import { ultraboxDark } from "./ultrabox-dark";
import { violetVerdant } from "./violet-verdant";
import { wackybox } from "./wackybox";
import { zefbox } from "./zefbox";

const customTheme: string = typeof localStorage !== "undefined" ? `${localStorage.getItem("customColors") || `:root {  }`}` : ":root {  }";

export const themes: { [name: string]: string } = {
	"dark classic": darkClassic,
	"dark competition": darkCompetition,
	"light classic": lightClassic,
	"jummbox classic": jummboxClassic,
	forest: forest,
	canyon: canyon,
	midnight: midnight,
	"jummbox light": jummboxLight,
	"amoled dark": amoledDark,
	beachcombing: beachcombing,
	roe: roe,
	moonlight: moonlight,
	autumn: autumn,
	fruit: fruit,
	sunset: sunset,
	toxic: toxic,
	"violet verdant": violetVerdant,
	portal: portal,
	fusion: fusion,
	inverse: inverse,
	nebula: nebula,
	"roe light": roeLight,
	energized: energized,
	neapolitan: neapolitan,
	slushie: slushie,
	"ultrabox dark": ultraboxDark,
	"modbox classic": modboxClassic,
	zefbox: zefbox,
	"sandbox classic": sandboxClassic,
	harrybox: harrybox,
	brucebox: brucebox,
	"shitbox 2.0": shitbox2,
	"shitbox 3.0": shitbox3,
	nerdbox: nerdbox,
	nepbox: nepbox,
	"cardboardbox classic": cardboardboxClassic,
	"blubox classic": bluboxClassic,
	"dogebox classic": dogeboxClassic,
	"dogebox dark": dogeboxDark,
	"todbox dark mode": todboxDarkMode,
	"mainbox 1.0": mainbox1,
	fogbox: fogbox,
	foxbox: foxbox,
	wackybox: wackybox,
	microbox: microbox,
	paandorasbox: paandorasbox,
	dogebox2: dogebox2,
	"abyssbox classic": abyssboxClassic,
	"abyssbox light": abyssboxLight,
	slarmoosbox: slarmoosbox,
	axobox: axobox,
	"lemmbox dark": lemmboxDark,
	death: death,
	"edobox classic": edoboxClassic,
	"bloxbox classic": bloxboxClassic,
	fmbox: fmbox,
	"azur lane": azurLane,
	custom: customTheme,
};
