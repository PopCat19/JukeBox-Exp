// tracking.ts
//
// Purpose: Worker driver and DOM applier for shiggy tracking
// - Spawns Web Worker for all physics math
// - Sends cursor input each frame, receives position/rotation results
// - Applies results to DOM (style.left, style.transform, SVG lines)
// - Manages EventSystem for chaos events (UI side only)

import { SummonedShiggy, SHIGGY_SIZE } from "./types";
import { positionDialogue, clearDialogue, forceEndConversation } from "./dialogue";
import { freezeGif, unfreezeGif } from "./gif";
import { EventSystem } from "./events";

const FIELDS = 8;

export class CursorTracker {
    private _worker: Worker;
    private _animFrame: number = 0;
    private _active: boolean = false;
    private _lineOverlay: SVGSVGElement;
    private _events: EventSystem;
    private _summoned: SummonedShiggy[] = [];
    private _lastMouseX = 0;
    private _lastMouseY = 0;
    private _lastMoveTime = 0;
    private _mouseSpeed = 0;

    constructor() {
        this._worker = new Worker(
            new URL("./physics.worker.ts", import.meta.url),
            { type: "module" }
        );
        this._worker.onmessage = this._onWorkerMessage;

        this._lineOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this._lineOverlay.style.cssText =
            "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9998;";
        document.body.appendChild(this._lineOverlay);

        this._events = new EventSystem();

        document.addEventListener("mousemove", this._onMouseMove);
        window.addEventListener("resize", this._onResize);
        this._worker.postMessage({ type: "resize", w: window.innerWidth, h: window.innerHeight });
    }

    private _onResize = (): void => {
        this._worker.postMessage({ type: "resize", w: window.innerWidth, h: window.innerHeight });
    };

    public addShiggy(s: SummonedShiggy): void {
        this._worker.postMessage({ type: "addShiggy", x: s.x, y: s.y });
    }

    public releaseOne(summoned: SummonedShiggy[], index: number): void {
        const s = summoned[index];
        if (!s) return;
        clearInterval(s.gifTimer);
        if (s.convoTimer) clearTimeout(s.convoTimer);
        forceEndConversation(s);
        clearDialogue(s);
        s.img.style.animation = "shiggy-summon-exit 0.4s ease-in forwards";
        const img = s.img;
        setTimeout(() => img.remove(), 450);
        summoned.splice(index, 1);
        this._worker.postMessage({ type: "removeShiggy", index });
    }

    public start(summoned: SummonedShiggy[]): void {
        if (this._active) return;
        this._active = true;
        this._summoned = summoned;
        this._events.start(() => summoned, (event, endsAt, congaChain) => {
            this._worker.postMessage({
                type: "event",
                event,
                endsAt,
                congaChain: congaChain ?? [],
            });
        });
        const loop = (): void => {
            if (!this._active) return;
            this._animFrame = requestAnimationFrame(loop);
            this._worker.postMessage({ type: "tick", now: performance.now() });
        };
        this._animFrame = requestAnimationFrame(loop);
    }

    public stop(summoned: SummonedShiggy[]): void {
        this._active = false;
        this._events.stop();
        cancelAnimationFrame(this._animFrame);
        for (const s of summoned) {
            forceEndConversation(s);
            clearDialogue(s);
            if (s.isNapping) {
                unfreezeGif(s.img);
                s.isNapping = false;
            }
        }
        this._worker.postMessage({ type: "clearAll" });
        this._clearLines();
    }

    private _onMouseMove = (e: MouseEvent): void => {
        const now = performance.now();
        const dt = now - this._lastMoveTime;
        if (dt > 0) {
            const dx = e.clientX - this._lastMouseX;
            const dy = e.clientY - this._lastMouseY;
            this._mouseSpeed = Math.sqrt(dx * dx + dy * dy) / (dt / 1000);
        }
        this._lastMouseX = e.clientX;
        this._lastMouseY = e.clientY;
        this._lastMoveTime = now;
        this._worker.postMessage({
            type: "cursor",
            x: e.clientX, y: e.clientY,
            speed: this._mouseSpeed,
            now,
        });
    };

    private _onWorkerMessage = (e: MessageEvent): void => {
        if (e.data.type === "frame") {
            this._applyFrame(e.data.buffer, e.data.count);
        }
    };

    private _applyFrame(buffer: ArrayBuffer, count: number): void {
        const data = new Float32Array(buffer);
        const summoned = this._summoned;
        this._clearLines();

        for (let i = 0; i < count && i < summoned.length; i++) {
            const s = summoned[i];
            const base = i * FIELDS;
            const x         = data[base + 0];
            const y         = data[base + 1];
            const rotation  = data[base + 2];
            const tension   = data[base + 3];
            const following = data[base + 4] > 0.5;
            const isNapping = data[base + 6] > 0.5;
            const stressed = data[base + 7] > 0.5;

            s.x = x; s.y = y;

            if (isNapping && !s.isNapping) {
                s.isNapping = true;
                s.img.style.animation = "none";
                freezeGif(s.img);
            } else if (!isNapping && s.isNapping) {
                s.isNapping = false;
                unfreezeGif(s.img);
                const fDur = 3 + Math.random() * 4;
                const wDur = 4 + Math.random() * 3;
                s.img.style.animation =
                    `shiggy-float ${fDur}s ease-in-out infinite, shiggy-wobble ${wDur}s ease-in-out infinite`;
            }

            s.img.style.left = `${x}px`;
            s.img.style.top  = `${y}px`;
            s.img.style.transform = `rotate(${rotation.toFixed(1)}deg)`;
            positionDialogue(s);

            if (following) {
                this._drawLine(
                    x + SHIGGY_SIZE / 2, y + SHIGGY_SIZE / 2,
                    this._lastMouseX, this._lastMouseY,
                    tension, stressed,
                );
            }
        }
    }

    private _drawLine(
        x1: number, y1: number,
        x2: number, y2: number,
        tension: number, stressed: boolean,
    ): void {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(x1));
        line.setAttribute("y1", String(y1));
        line.setAttribute("x2", String(x2));
        line.setAttribute("y2", String(y2));
        line.setAttribute("stroke-width", "1.5");
        if (stressed) {
            line.setAttribute("stroke", "#ff6644");
            line.setAttribute("stroke-dasharray", "6 4");
            line.setAttribute("opacity", "0.5");
        } else if (tension > 0.7) {
            line.setAttribute("stroke", "#ff4444");
            line.setAttribute("opacity", "0.6");
        } else if (tension > 0.3) {
            line.setAttribute("stroke", "#ccaa44");
            line.setAttribute("opacity", "0.5");
        } else {
            line.setAttribute("stroke", "var(--secondary-text, #999)");
            line.setAttribute("opacity", "0.3");
        }
        this._lineOverlay.appendChild(line);
    }

    private _clearLines(): void {
        while (this._lineOverlay.firstChild) {
            this._lineOverlay.removeChild(this._lineOverlay.firstChild);
        }
    }
}
