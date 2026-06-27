// index.ts
//
// Purpose: Main Shiggy class - orchestrates shiggy system
// - Sidebar toggle with pettable shiggy image
// - Pet counter, message display, and release button
// - Delegates tracking, summoning, dialogue, and audio to submodules

import { Typography } from "../../ui/style-constants";
import { ShiggyAudio } from "./audio";
import { PET_MESSAGES } from "./bubbles";
import { clearAllSummoned, spawnShiggy, startGifRestart } from "./summoning";
import { CursorTracker } from "./tracking";
import {
	AUTO_SPAWN_MILESTONE,
	AUTO_SPAWN_MS,
	FOLLOW_UNLOCK_PETS,
	injectShiggyCss,
	PET_SUMMON_THRESHOLD,
	type SummonedShiggy,
} from "./types";

export class Shiggy {
	private _active: boolean = false;
	private readonly _img: HTMLImageElement;
	private readonly _toggle: HTMLDivElement;
	private readonly _petDisplay: HTMLDivElement;
	private readonly _counter: HTMLDivElement;
	private readonly _releaseBtn: HTMLDivElement;
	private _petCount: number = 0;
	private _autoSpawnUnlocked: boolean = false;
	private _isPetting: boolean = false;
	private _petScaleTimer: ReturnType<typeof setTimeout> | null = null;
	private _gifTimer: ReturnType<typeof setInterval> | null = null;
	private _autoSpawnTimer: ReturnType<typeof setInterval> | null = null;
	private _summoned: SummonedShiggy[] = [];
	private readonly _audio: ShiggyAudio;
	private readonly _tracker: CursorTracker;

	constructor() {
		injectShiggyCss();

		this._audio = new ShiggyAudio();
		this._tracker = new CursorTracker();

		// Sidebar image
		this._img = document.createElement("img");
		this._img.src = `assets/images/shiggy.gif?v=${Date.now()}`;
		this._img.style.cssText =
			"width: 60px; height: auto; pointer-events: none; opacity: 0; transition: opacity 0.2s; cursor: pointer;";

		this._img.ontouchstart = (e: TouchEvent) => {
			e.preventDefault();
			this._isPetting = true;
			this.pet();
		};
		this._img.ontouchmove = (e: TouchEvent) => {
			e.preventDefault();
			if (this._isPetting) this.pet();
		};
		this._img.ontouchend = () => {
			this._isPetting = false;
		};
		this._img.ontouchcancel = () => {
			this._isPetting = false;
		};

		this._img.onmousedown = (e: MouseEvent) => {
			e.preventDefault();
			this._isPetting = true;
			this.pet();
		};
		this._img.onmousemove = (_e: MouseEvent) => {
			if (this._isPetting) this.pet();
		};
		this._img.onmouseup = () => {
			this._isPetting = false;
		};
		this._img.onmouseleave = () => {
			this._isPetting = false;
		};

		// Sidebar layout
		this._toggle = document.createElement("div");
		this._toggle.style.cssText = "text-align: center; user-select: none; margin-top: 2px;";

		const label = document.createElement("div");
		label.style.cssText = `font-size: ${Typography.sizeSm}; color: var(--secondary-text); cursor: pointer;`;
		label.textContent = "summon shiggy";
		label.onclick = () => {
			this.toggle();
		};

		this._petDisplay = document.createElement("div");
		this._petDisplay.style.cssText = `font-size: ${Typography.sizeXs}; color: var(--secondary-text); min-height: 1.2em; text-align: center; margin-top: 2px; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;`;

		this._counter = document.createElement("div");
		this._counter.style.cssText = `font-size: ${Typography.sizeXs}; color: var(--secondary-text); opacity: 0; transition: opacity 0.3s; min-height: 1.2em;`;

		this._releaseBtn = document.createElement("div");
		this._releaseBtn.textContent = "release one";
		this._releaseBtn.style.cssText = `font-size: ${Typography.sizeXs}; color: var(--secondary-text); cursor: pointer; opacity: 0; pointer-events: none; transition: opacity 0.3s, pointer-events 0s 0.3s; margin-top: 2px; user-select: none;`;
		this._releaseBtn.onclick = () => {
			this._releaseOne();
		};

		this._toggle.appendChild(label);
		this._toggle.appendChild(this._img);
		this._toggle.appendChild(this._petDisplay);
		this._toggle.appendChild(this._counter);
		this._toggle.appendChild(this._releaseBtn);
	}

	public get container(): HTMLDivElement {
		return this._toggle;
	}

	public toggle(): void {
		this._active = !this._active;
		if (this._active) {
			this._img.style.opacity = "1";
			this._img.style.pointerEvents = "auto";
			this._img.style.animation =
				"shiggy-enter 0.3s ease-out both, shiggy-bounce 1.5s ease-in-out 0.1s infinite, shiggy-rock 2s ease-in-out 0s infinite";
			this._counter.style.opacity = "1";
			this._releaseBtn.style.opacity = "1";
			this._releaseBtn.style.pointerEvents = "auto";
			this._updateCounter();
			this._gifTimer = startGifRestart(this._img, this._summoned);
			this._audio.playSfx("shiggy-summon");
			this._audio.playBgm();
		} else {
			this._img.style.opacity = "0";
			this._img.style.pointerEvents = "none";
			this._img.style.animation = "none";
			this._petCount = 0;
			this._autoSpawnUnlocked = false;
			this._counter.style.opacity = "0";
			this._counter.textContent = "";
			this._releaseBtn.style.opacity = "0";
			this._releaseBtn.style.pointerEvents = "none";
			this._petDisplay.textContent = "";
			this._tracker.stop(this._summoned);
			this._stopGifRestart();
			this._stopAutoSpawn();
			clearAllSummoned(this._summoned);
			this._audio.playSfx("shiggy-dismiss");
			this._audio.stopBgm();
		}
	}

	public pet(): void {
		if (!this._active) return;

		this._petCount++;
		this._updateCounter();

		// Message every 5 pets
		if (this._petCount % 5 === 0) {
			const messageIndex = Math.floor(this._petCount / 5 - 1) % PET_MESSAGES.length;
			this._petDisplay.textContent = PET_MESSAGES[messageIndex];
		}

		this._audio.playSfx("shiggy-pet");

		this._img.style.transform = "scale(1.1)";
		if (this._petScaleTimer !== null) clearTimeout(this._petScaleTimer);
		this._petScaleTimer = setTimeout(() => {
			this._img.style.transform = "scale(1)";
			this._petScaleTimer = null;
		}, 150);

		if (this._petCount % PET_SUMMON_THRESHOLD === 0) {
			this._audio.playSfx("shiggy-blessing");
			this._spawnOne();
		}

		if (!this._autoSpawnUnlocked && this._petCount >= AUTO_SPAWN_MILESTONE) {
			this._autoSpawnUnlocked = true;
			this._startAutoSpawn();
		}

		if (this._petCount === FOLLOW_UNLOCK_PETS) {
			this._tracker.start(this._summoned);
		}
	}

	public get active(): boolean {
		return this._active;
	}

	private _spawnOne(): void {
		const s = spawnShiggy(() => {
			this._audio.playSfx("shiggy-pop");
		});
		this._summoned.push(s);
		this._tracker.addShiggy(s);
		this._releaseBtn.style.opacity = this._summoned.length > 0 ? "1" : "0";
	}

	private _releaseOne(): void {
		if (!this._active || this._summoned.length === 0) return;
		this._tracker.releaseOne(this._summoned, this._summoned.length - 1);
		this._updateCounter();
		this._releaseBtn.style.opacity = this._summoned.length > 0 ? "1" : "0";
	}

	private _updateCounter(): void {
		this._counter.textContent = `pets: ${this._petCount}`;
	}

	private _stopGifRestart(): void {
		if (this._gifTimer !== null) {
			clearInterval(this._gifTimer);
			this._gifTimer = null;
		}
	}

	private _startAutoSpawn(): void {
		this._stopAutoSpawn();
		this._autoSpawnTimer = setInterval(() => {
			if (!this._active) return;
			this._spawnOne();
		}, AUTO_SPAWN_MS);
	}

	private _stopAutoSpawn(): void {
		if (this._autoSpawnTimer !== null) {
			clearInterval(this._autoSpawnTimer);
			this._autoSpawnTimer = null;
		}
	}
}
