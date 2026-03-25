// Shiggy.ts
//
// Purpose: Summon shiggy toggle
//
// This module provides a toggle button to summon/hide shiggy.

export class Shiggy {
    private _active: boolean = false;
    private readonly _img: HTMLImageElement;
    private readonly _toggle: HTMLDivElement;

    constructor() {
        this._img = document.createElement("img");
        this._img.src = "assets/images/shiggy.gif";
        this._img.style.cssText = "width: 60px; height: auto; pointer-events: none; opacity: 0; transition: opacity 0.2s;";

        this._toggle = document.createElement("div");
        this._toggle.style.cssText = "text-align: center; cursor: pointer; user-select: none; margin-top: 2px;";

        const label = document.createElement("div");
        label.style.cssText = "font-size: 11px; color: var(--secondary-text);";
        label.textContent = "summon shiggy";
        label.onclick = () => this.toggle();

        this._toggle.appendChild(label);
        this._toggle.appendChild(this._img);
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
        }
    }

    public get active(): boolean {
        return this._active;
    }
}
