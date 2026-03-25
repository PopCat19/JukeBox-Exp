// Shiggy.ts
//
// Purpose: Summon shiggy toggle
//
// This module provides a toggle button to summon/hide shiggy.

export class Shiggy {
    private _active: boolean = false;
    private readonly _img: HTMLImageElement;
    private readonly _toggle: HTMLDivElement;
    private readonly _petDisplay: HTMLDivElement;
    private _petCount: number = 0;
    private _petMessages: string[] = [
        "shiggy purrs softly",
        "shiggy wags tail",
        "shiggy nuzzles you",
        "shiggy is delighted",
        "shiggy does a little dance",
        "shiggy winks at you",
        "shiggy feels appreciated",
        "shiggy is grateful",
        "shiggy sends good vibes",
        "shiggy believes in you",
        "shiggy is proud of you",
        "shiggy gives you energy",
        "shiggy shares wisdom",
        "shiggy radiates joy",
        "shiggy is eternal",
        "shiggy transcends",
        "shiggy is everything",
        "ALL IS SHIGGY",
    ];

    constructor() {
        this._img = document.createElement("img");
        this._img.src = "assets/images/shiggy.gif";
        this._img.style.cssText = "width: 60px; height: auto; pointer-events: auto; opacity: 0; transition: opacity 0.2s; cursor: pointer;";
        this._img.onclick = () => this.pet();

        this._petDisplay = document.createElement("div");
        this._petDisplay.style.cssText = "font-size: 10px; color: var(--secondary-text); min-height: 1.2em; text-align: center; margin-top: 2px;";

        this._toggle = document.createElement("div");
        this._toggle.style.cssText = "text-align: center; cursor: pointer; user-select: none; margin-top: 2px;";

        const label = document.createElement("div");
        label.style.cssText = "font-size: 11px; color: var(--secondary-text);";
        label.textContent = "summon shiggy";
        label.onclick = () => this.toggle();

        this._toggle.appendChild(label);
        this._toggle.appendChild(this._img);
        this._toggle.appendChild(this._petDisplay);
    }

    public get container(): HTMLDivElement {
        return this._toggle;
    }

    public toggle(): void {
        this._active = !this._active;
        if (this._active) {
            this._img.style.opacity = "1";
            this._img.style.animation = "shiggy-enter 0.3s ease-out both, shiggy-bounce 1.5s ease-in-out 0.1s infinite, shiggy-rock 1s ease-in-out 0s infinite";
        } else {
            this._img.style.opacity = "0";
            this._img.style.animation = "none";
            this._petDisplay.textContent = "";
            this._petCount = 0;
        }
    }

    public pet(): void {
        if (!this._active) return;

        this._petCount++;
        const messageIndex = Math.min(this._petCount - 1, this._petMessages.length - 1);
        this._petDisplay.textContent = this._petMessages[messageIndex];

        // Brief visual feedback
        this._img.style.transform = "scale(1.1)";
        setTimeout(() => {
            this._img.style.transform = "scale(1)";
        }, 100);
    }

    public get active(): boolean {
        return this._active;
    }
}
