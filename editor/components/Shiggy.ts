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
    private _isPetting: boolean = false;
    private _petMessages: string[] = [
        "The shiggy acknowledges your devotion.",
        "A gentle warmth emanates from the shiggy.",
        "The shiggy's presence brings comfort.",
        "You are blessed by the shiggy's grace.",
        "The shiggy whispers ancient wisdom.",
        "Your touch pleases the shiggy.",
        "The shiggy bestows upon you serenity.",
        "A divine energy flows through the shiggy.",
        "The shiggy recognizes your sincerity.",
        "You are chosen by the shiggy.",
        "The shiggy's light shines upon you.",
        "The shiggy grants you inner peace.",
        "You have earned the shiggy's favor.",
        "The shiggy's love is eternal.",
        "The shiggy transcends all understanding.",
        "You are one with the shiggy.",
        "The shiggy is the beginning and the end.",
        "ALL IS SHIGGY. ALL IS DIVINE.",
    ];

    constructor() {
        this._img = document.createElement("img");
        this._img.src = "assets/images/shiggy.gif";
        this._img.style.cssText = "width: 60px; height: auto; pointer-events: auto; opacity: 0; transition: opacity 0.2s; cursor: pointer;";

        // Click/tap support
        this._img.onclick = () => this.pet();

        // Touch support for mobile
        this._img.ontouchstart = (e: TouchEvent) => {
            e.preventDefault();
            this._isPetting = true;
            this.pet();
        };
        this._img.ontouchmove = (e: TouchEvent) => {
            e.preventDefault();
            if (this._isPetting) {
                this.pet();
            }
        };
        this._img.ontouchend = () => {
            this._isPetting = false;
        };
        this._img.ontouchcancel = () => {
            this._isPetting = false;
        };

        // Mouse drag support
        this._img.onmousedown = (e: MouseEvent) => {
            e.preventDefault();
            this._isPetting = true;
            this.pet();
        };
        this._img.onmousemove = (e: MouseEvent) => {
            if (this._isPetting) {
                this.pet();
            }
        };
        this._img.onmouseup = () => {
            this._isPetting = false;
        };
        this._img.onmouseleave = () => {
            this._isPetting = false;
        };

        this._petDisplay = document.createElement("div");
        this._petDisplay.style.cssText = "font-size: 10px; color: var(--secondary-text); min-height: 1.2em; text-align: center; margin-top: 2px; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;";

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
