// events.ts
//
// Purpose: Autonomous chaos events for the shiggy population
// - Fires periodically when enough shiggys are present
// - Each event type overrides or nudges normal physics for its duration
// - Clean entry/exit so normal tracking resumes after

import {
    SummonedShiggy, ShiggyEvent, ShiggyEventType,
    SHIGGY_SIZE, NPC_FRICTION,
    EVENT_MIN_SHIGGYS, EVENT_CHECK_INTERVAL_MS,
    EVENT_CHANCE, EVENT_DURATION_MS,
} from "./types";
import { showNpcDialogue, clearDialogue } from "./dialogue";

const EVENT_ANNOUNCE: Record<ShiggyEventType, string> = {
    zoomies:      "ZOOMIES!!!",
    gravitywell:  "...something pulls...",
    conga:        "conga conga conga!!",
    battleroyale: "*aggressive wiggling*",
    nap:          "zzzzzz",
};

export class EventSystem {
    private _current: ShiggyEvent | null = null;
    private _checkTimer: ReturnType<typeof setInterval> | null = null;

    private _onFire: ((event: string | null, endsAt: number, congaChain?: number[]) => void) | null = null;

    public start(getSummoned: () => SummonedShiggy[], onFire?: (event: string | null, endsAt: number, congaChain?: number[]) => void): void {
        this.stop();
        this._onFire = onFire ?? null;
        this._checkTimer = setInterval(() => {
            const summoned = getSummoned();
            if (this._current) return;
            if (summoned.length < EVENT_MIN_SHIGGYS) return;
            if (Math.random() > EVENT_CHANCE) return;
            this._fire(summoned);
        }, EVENT_CHECK_INTERVAL_MS);
    }

    public stop(): void {
        if (this._checkTimer !== null) {
            clearInterval(this._checkTimer);
            this._checkTimer = null;
        }
        this._current = null;
    }

    public get active(): ShiggyEvent | null {
        return this._current;
    }

    private _fire(summoned: SummonedShiggy[]): void {
        const types: ShiggyEventType[] = [
            "zoomies", "gravitywell", "conga", "battleroyale", "nap",
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        const now = performance.now();

        const event: ShiggyEvent = {
            type,
            startedAt: now,
            endsAt: now + EVENT_DURATION_MS,
        };

        switch (type) {
            case "zoomies": {
                for (const s of summoned) {
                    const angle = Math.random() * Math.PI * 2;
                    const power = 6 + Math.random() * 8;
                    s.vx += Math.cos(angle) * power;
                    s.vy += Math.sin(angle) * power;
                    showNpcDialogue(s);
                }
                break;
            }
            case "conga": {
                const chain = [...summoned].sort(() => Math.random() - 0.5);
                event.congaChain = chain;
                if (chain.length > 0) showNpcDialogue(chain[0]);
                break;
            }
            case "battleroyale": {
                for (let i = 0; i < summoned.length; i++) {
                    const others = summoned.filter((_, j) => j !== i);
                    if (others.length > 0) {
                        summoned[i].battleTarget =
                            others[Math.floor(Math.random() * others.length)];
                        showNpcDialogue(summoned[i]);
                    }
                }
                break;
            }
            case "nap":
            case "gravitywell": {
                const pick = summoned[Math.floor(Math.random() * summoned.length)];
                showNpcDialogue(pick);
                break;
            }
        }

        for (const s of summoned) {
            if (!s.dialogue) {
                _announceEvent(s, EVENT_ANNOUNCE[type]);
            }
        }

        this._current = event;

        // Notify worker
        if (this._onFire) {
            const congaIndices = event.congaChain
                ? event.congaChain.map(s => summoned.indexOf(s)).filter(i => i >= 0)
                : [];
            this._onFire(type, event.endsAt, congaIndices);
        }

        setTimeout(() => {
            this._end(summoned);
        }, EVENT_DURATION_MS);
    }

    private _end(summoned: SummonedShiggy[]): void {
        if (!this._current) return;
        for (const s of summoned) {
            s.battleTarget = null;
        }
        this._current = null;
        if (this._onFire) {
            this._onFire(null, 0, []);
        }
    }

    public tickEvent(
        s: SummonedShiggy,
        summoned: SummonedShiggy[],
        now: number,
    ): boolean {
        const ev = this._current;
        if (!ev || now > ev.endsAt) return false;
        if (s.inConversation || s.following) return false;

        switch (ev.type) {

            case "zoomies": {
                s.vx += (Math.random() - 0.5) * 0.4;
                s.vy += (Math.random() - 0.5) * 0.4;
                return false;
            }

            case "gravitywell": {
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2;
                const sx = s.x + SHIGGY_SIZE / 2;
                const sy = s.y + SHIGGY_SIZE / 2;
                const dx = cx - sx;
                const dy = cy - sy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 1) {
                    const progress = (now - ev.startedAt) / (ev.endsAt - ev.startedAt);
                    const strength = 0.08 * Math.sin(progress * Math.PI);
                    s.vx += (dx / dist) * strength * dist * 0.012;
                    s.vy += (dy / dist) * strength * dist * 0.012;
                }
                return false;
            }

            case "conga": {
                if (!ev.congaChain || ev.congaChain.length < 2) return false;
                const idx = ev.congaChain.indexOf(s);
                if (idx <= 0) return false;
                const leader = ev.congaChain[idx - 1];
                const tx = leader.x + SHIGGY_SIZE / 2;
                const ty = leader.y + SHIGGY_SIZE / 2;
                const sx = s.x + SHIGGY_SIZE / 2;
                const sy = s.y + SHIGGY_SIZE / 2;
                const dx = tx - sx;
                const dy = ty - sy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const gap = SHIGGY_SIZE * 1.4;
                if (dist > gap) {
                    const stretch = dist - gap;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    s.vx += nx * stretch * 0.06;
                    s.vy += ny * stretch * 0.06;
                }
                s.vx *= NPC_FRICTION;
                s.vy *= NPC_FRICTION;
                return false;
            }

            case "battleroyale": {
                const target = s.battleTarget;
                if (!target) return false;
                const sx = s.x + SHIGGY_SIZE / 2;
                const sy = s.y + SHIGGY_SIZE / 2;
                const tx = target.x + SHIGGY_SIZE / 2;
                const ty = target.y + SHIGGY_SIZE / 2;
                const dx = tx - sx;
                const dy = ty - sy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 1) {
                    s.vx += (dx / dist) * 0.35;
                    s.vy += (dy / dist) * 0.35;
                }
                s.vx *= 0.95;
                s.vy *= 0.95;
                return false;
            }

            case "nap": {
                s.vx *= 0.88;
                s.vy *= 0.88;
                return false;
            }
        }

        return false;
    }
}

function _announceEvent(s: SummonedShiggy, text: string): void {
    clearDialogue(s);
    const bubble = document.createElement("div");
    bubble.textContent = text;
    bubble.style.cssText = `
        position: fixed; z-index: 10001; pointer-events: none;
        font-family: 'Varela', 'Trebuchet MS', sans-serif;
        font-size: 10px; color: var(--primary-text, white);
        background: var(--ui-widget-background, #444);
        border: 1px solid var(--secondary-text, #999);
        border-radius: 8px; padding: 3px 8px;
        white-space: nowrap; left: 50%; transform: translateX(-50%);
        animation: shiggy-convo-pop 2400ms ease-out forwards;
    `;
    document.body.appendChild(bubble);
    s.dialogue = bubble;
    bubble.style.left = `${s.x + SHIGGY_SIZE / 2}px`;
    bubble.style.top  = `${s.y - 20}px`;
    setTimeout(() => {
        if (s.dialogue === bubble) {
            bubble.remove();
            s.dialogue = null;
        }
    }, 2400);
}
