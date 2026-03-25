// Shiggy.ts
//
// Purpose: Summon shiggy toggle
//
// This module provides a toggle button to summon/hide shiggy.

// Add CSS keyframes for text animations
const style = document.createElement("style");
style.textContent = `
    @keyframes shiggy-text-fade {
        0% { opacity: 0; transform: translateY(5px); }
        100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes shiggy-text-pulse {
        0% { opacity: 0; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1.1); }
        100% { opacity: 1; transform: scale(1); }
    }
    @keyframes shiggy-text-glow {
        0% { opacity: 0; text-shadow: 0 0 5px var(--secondary-text); }
        50% { opacity: 1; text-shadow: 0 0 15px var(--secondary-text), 0 0 25px var(--secondary-text); }
        100% { opacity: 1; text-shadow: 0 0 5px var(--secondary-text); }
    }
`;
document.head.appendChild(style);

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
        "The shiggy multiplies its presence.",
        "Another shiggy emerges from the void.",
        "The shiggy's power grows exponentially.",
        "A new shiggy joins the divine circle.",
        "The shiggy's influence spreads.",
        "More shiggy appear to bless you.",
        "The shiggy's realm expands.",
        "You have awakened the shiggy legion.",
        "The shiggy's numbers increase.",
        "A shiggy army assembles.",
        "The shiggy's dominion grows.",
        "You are surrounded by shiggy's grace.",
        "The shiggy's presence is overwhelming.",
        "Shiggy's multiply in your honor.",
        "The shiggy's blessing intensifies.",
        "You have triggered the shiggy cascade.",
        "The shiggy's abundance knows no bounds.",
    ];

    constructor() {
        this._img = document.createElement("img");
        this._img.src = `assets/images/shiggy.gif?v=${Date.now()}`;
        this._img.style.cssText = "width: 60px; height: auto; pointer-events: auto; opacity: 0; transition: opacity 0.2s; cursor: pointer;";

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
            this._img.style.animation = "shiggy-enter 0.3s ease-out both, shiggy-bounce 1.5s ease-in-out 0.1s infinite, shiggy-rock 2s ease-in-out 0s infinite";
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
        const messageIndex = (this._petCount - 1) % this._petMessages.length;
        const message = this._petMessages[messageIndex];
        this._petDisplay.textContent = message;

        // Apply text animation based on context
        this._petDisplay.style.animation = "none";
        this._petDisplay.offsetHeight; // Trigger reflow

        if (this._petCount % 10 === 0) {
            // Threshold summon - dramatic glow animation
            this._petDisplay.style.animation = "shiggy-text-glow 0.6s ease-out";
        } else if (message.includes("ALL IS SHIGGY") || message.includes("shiggy legion") || message.includes("shiggy cascade")) {
            // Special messages - pulse animation
            this._petDisplay.style.animation = "shiggy-text-pulse 0.5s ease-out";
        } else {
            // Normal messages - fade animation
            this._petDisplay.style.animation = "shiggy-text-fade 0.3s ease-out";
        }

        // Brief visual feedback
        this._img.style.transform = "scale(1.1)";
        setTimeout(() => {
            this._img.style.transform = "scale(1)";
        }, 100);

        // Summon another shiggy at thresholds
        if (this._petCount % 10 === 0) {
            this.summonAnotherShiggy();
        }
    }

    private summonAnotherShiggy(): void {
        const newShiggy = document.createElement("img");
        newShiggy.src = `assets/images/shiggy.gif?v=${Date.now()}`;
        newShiggy.style.cssText = "width: 60px; height: auto; pointer-events: none; opacity: 0; position: fixed; z-index: 9999;";

        // Random position on screen
        const x = Math.random() * (window.innerWidth - 60);
        const y = Math.random() * (window.innerHeight - 60);
        newShiggy.style.left = `${x}px`;
        newShiggy.style.top = `${y}px`;

        document.body.appendChild(newShiggy);

        // Fade in
        setTimeout(() => {
            newShiggy.style.transition = "opacity 0.3s";
            newShiggy.style.opacity = "1";
        }, 10);

        // Fade out and remove after 3 seconds
        setTimeout(() => {
            newShiggy.style.opacity = "0";
            setTimeout(() => {
                newShiggy.remove();
            }, 300);
        }, 3000);
    }

    public get active(): boolean {
        return this._active;
    }
}
