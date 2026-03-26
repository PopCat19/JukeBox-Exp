// tracking.ts
//
// Purpose: Physics driver and DOM applier for shiggy tracking
// - Uses PhysicsEngine for all math (rope, collision, idle nav)
// - Sends cursor input, receives position/rotation results
// - Applies results to DOM (style.left, style.transform, SVG lines)

import { SummonedShiggy, SHIGGY_SIZE } from "./types";
import { positionDialogue, clearDialogue, forceEndConversation, showNpcDialogue, startConversation } from "./dialogue";
import { PhysicsEngine, FrameResult, PhysEvent } from "./physics";

export class CursorTracker {
    private _physics: PhysicsEngine = new PhysicsEngine();
    private _animFrame: number = 0;
    private _active: boolean = false;
    private _lineOverlay: SVGSVGElement;
    private _summoned: SummonedShiggy[] = [];
    private _lastMouseX = 0;
    private _lastMouseY = 0;
    private _lastMoveTime = 0;
    private _mouseSpeed = 0;

    constructor() {
        this._lineOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this._lineOverlay.style.cssText =
            "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9998;";
        document.body.appendChild(this._lineOverlay);

        document.addEventListener("mousemove", this._onMouseMove);
        window.addEventListener("resize", this._onResize);
        this._physics.resize(window.innerWidth, window.innerHeight);
    }

    private _onResize = (): void => {
        this._physics.resize(window.innerWidth, window.innerHeight);
    };

    public addShiggy(s: SummonedShiggy): void {
        this._physics.addShiggy(s.x, s.y);
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
        this._physics.removeShiggy(index);
    }

    public start(summoned: SummonedShiggy[]): void {
        if (this._active) return;
        this._active = true;
        this._summoned = summoned;
        const loop = (): void => {
            if (!this._active) return;
            this._animFrame = requestAnimationFrame(loop);
            const now = performance.now();

            // Sync conversation state from DOM back to physics
            for (let i = 0; i < this._summoned.length; i++) {
                this._physics.setConversation(i, this._summoned[i].inConversation);
            }

            const results = this._physics.tick(now);
            this._applyResults(results);
            this._handleEvents(this._physics.getEvents());
        };
        this._animFrame = requestAnimationFrame(loop);
    }

    public stop(summoned: SummonedShiggy[]): void {
        this._active = false;
        cancelAnimationFrame(this._animFrame);
        for (const s of summoned) {
            forceEndConversation(s);
            clearDialogue(s);
        }
        this._physics.clearAll();
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
        this._physics.setCursor(e.clientX, e.clientY, this._mouseSpeed, now);
    };

    private _applyResults(results: FrameResult[]): void {
        const summoned = this._summoned;
        this._clearLines();

        for (let i = 0; i < results.length && i < summoned.length; i++) {
            const r = results[i];
            const s = summoned[i];
            const wasExploring = s.exploring;
            const wasFollowing = s.following;
            const wasApproaching = s.approaching ?? false;

            s.x = r.x;
            s.y = r.y;
            s.exploring = r.exploring;
            s.following = r.following;
            s.approaching = r.approaching;

            // Handle state transitions
            if ((r.following && !wasFollowing) || (r.approaching && !wasApproaching)) {
                s.img.style.animation = "";
            } else if (!r.following && !r.exploring && (wasFollowing || wasExploring)) {
                const fDur = 3 + Math.random() * 4;
                const wDur = 4 + Math.random() * 3;
                s.img.style.animation = `shiggy-float ${fDur}s ease-in-out infinite, shiggy-wobble ${wDur}s ease-in-out infinite`;
            }
            if (r.exploring && !wasExploring) {
                s.img.style.animation = "";
            }

            s.img.style.left = `${r.x}px`;
            s.img.style.top = `${r.y}px`;
            s.img.style.zIndex = String(9999 + Math.round(r.y));
            s.img.style.scale = r.facingRight ? "-1 1" : "1 1";
            s.img.style.rotate = `${r.rotation.toFixed(1)}deg`;
            positionDialogue(s);

            if (r.following) {
                this._drawLine(
                    r.x + SHIGGY_SIZE / 2, r.y + SHIGGY_SIZE / 2,
                    this._lastMouseX,
                    this._lastMouseY,
                    r.tension, r.stressed,
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

    private _handleEvents(events: PhysEvent[]): void {
        const summoned = this._summoned;
        for (const ev of events) {
            switch (ev.type) {
                case "explore": {
                    const s = summoned[ev.index];
                    if (s) showNpcDialogue(s);
                    break;
                }
                case "collision": {
                    const s = summoned[ev.index];
                    if (s) showNpcDialogue(s);
                    break;
                }
                case "conversation": {
                    const a = summoned[ev.index];
                    const b = ev.partner !== undefined ? summoned[ev.partner] : undefined;
                    if (a && b) startConversation(a, b);
                    break;
                }
            }
        }
    }

    private _clearLines(): void {
        while (this._lineOverlay.firstChild) {
            this._lineOverlay.removeChild(this._lineOverlay.firstChild);
        }
    }
}
