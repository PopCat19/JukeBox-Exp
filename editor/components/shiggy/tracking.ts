// tracking.ts
//
// Purpose: Cursor tracking and NPC behavior for summoned shiggys
// - Buffers mouse positions for lean tracking delay
// - Elastic rope physics (pull only when stretched past slack)
// - Inertia-based centrifugal (only on curves, capped)
// - Hockey puck NPC sliding with elastic edge bounce
// - Pool-ball cursor collision with velocity transfer
// - Per-shiggy cursor bias (attract/repel)
// - Tension-based line coloring
// - NPC idle navigation and proximity conversations

import {
    SummonedShiggy, MouseSample,
    SHIGGY_SIZE, SHIGGY_RADIUS, PROXIMITY_PX, DWELL_TIME_MS,
    MAX_FOLLOW_SPEED, UNFOLLOW_BUFFER_MS,
    TRACK_DELAY_MS, MAX_FOLLOWERS, OFFSET_RADIUS,
    ROPE_SLACK, ROPE_K, ROPE_DAMPING, ROPE_AXIAL_DAMPING, MAX_VEL, CURSOR_RADIUS, CURSOR_MASS_TRANSFER,
    NPC_FRICTION, NPC_BOUNCE_ENERGY, NPC_IDLE_SPEED,
    NPC_WAYPOINT_DIST, NPC_WAYPOINT_MIN_MS, NPC_WAYPOINT_RAND_MS,
    EXPLORE_CHANCE, EXPLORE_DURATION_MS, EXPLORE_MIN_FOLLOW_MS,
    CONVO_PROXIMITY, CONVO_CHANCE,
} from "./types";
import { showNpcDialogue, positionDialogue, clearDialogue, forceEndConversation, startConversation } from "./dialogue";

export class CursorTracker {
    private _mouseBuffer: MouseSample[] = [];
    private _mouseSpeed: number = 0;
    private _lastMouseX: number = 0;
    private _lastMouseY: number = 0;
    private _lastMoveTime: number = 0;
    // Per-frame cursor velocity (computed in tick, not mouse event)
    private _cursorVx: number = 0;
    private _cursorVy: number = 0;
    private _prevCursorX: number = 0;
    private _prevCursorY: number = 0;
    private _dwellStartTime: number = 0;
    private _dwellX: number = 0;
    private _dwellY: number = 0;
    private _lineOverlay: SVGSVGElement;
    private _animFrame: number = 0;
    private _active: boolean = false;

    constructor() {
        this._lineOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this._lineOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 9998;";
        document.body.appendChild(this._lineOverlay);
        document.addEventListener("mousemove", this._onMouseMove);
    }

    public start(summoned: SummonedShiggy[]): void {
        if (this._active) return;
        this._active = true;
        this._dwellStartTime = 0;
        this._mouseBuffer = [];
        this._prevCursorX = this._lastMouseX;
        this._prevCursorY = this._lastMouseY;
        const loop = (): void => {
            if (!this._active) return;
            this._animFrame = requestAnimationFrame(loop);
            this._tick(summoned);
        };
        this._animFrame = requestAnimationFrame(loop);
    }

    public stop(summoned: SummonedShiggy[]): void {
        this._active = false;
        cancelAnimationFrame(this._animFrame);
        for (const s of summoned) {
            s.following = false;
            s.exploring = false;
            forceEndConversation(s);
            clearDialogue(s);
            s.vx = 0;
            s.vy = 0;
        }
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
        this._mouseBuffer.push({ x: e.clientX, y: e.clientY, t: now });
        while (this._mouseBuffer.length > 1 && now - this._mouseBuffer[0].t > TRACK_DELAY_MS + 50) {
            this._mouseBuffer.shift();
        }
    };

    private _getDelayedPos(): { x: number; y: number } {
        const now = performance.now();
        const targetTime = now - TRACK_DELAY_MS;
        if (this._mouseBuffer.length === 0) return { x: this._lastMouseX, y: this._lastMouseY };
        let best = this._mouseBuffer[0];
        for (const sample of this._mouseBuffer) {
            if (sample.t <= targetTime) best = sample;
            else break;
        }
        return { x: best.x, y: best.y };
    }

    private _clearLines(): void {
        while (this._lineOverlay.firstChild) {
            this._lineOverlay.removeChild(this._lineOverlay.firstChild);
        }
    }

    // --- Collision ---

    private _collideViewport(s: SummonedShiggy): void {
        const maxX = window.innerWidth - SHIGGY_SIZE;
        const maxY = window.innerHeight - SHIGGY_SIZE;
        if (s.x < 0) { s.x = 0; if (s.vx < 0) s.vx = Math.abs(s.vx) * NPC_BOUNCE_ENERGY; }
        if (s.x > maxX) { s.x = maxX; if (s.vx > 0) s.vx = -Math.abs(s.vx) * NPC_BOUNCE_ENERGY; }
        if (s.y < 0) { s.y = 0; if (s.vy < 0) s.vy = Math.abs(s.vy) * NPC_BOUNCE_ENERGY; }
        if (s.y > maxY) { s.y = maxY; if (s.vy > 0) s.vy = -Math.abs(s.vy) * NPC_BOUNCE_ENERGY; }
    }

    private _collideShiggys(summoned: SummonedShiggy[]): void {
        for (let i = 0; i < summoned.length; i++) {
            for (let j = i + 1; j < summoned.length; j++) {
                const a = summoned[i];
                const b = summoned[j];
                const ax = a.x + SHIGGY_SIZE / 2;
                const ay = a.y + SHIGGY_SIZE / 2;
                const bx = b.x + SHIGGY_SIZE / 2;
                const by = b.y + SHIGGY_SIZE / 2;
                const dx = bx - ax;
                const dy = by - ay;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = SHIGGY_RADIUS * 2;
                if (dist < minDist && dist > 0.01) {
                    const overlap = (minDist - dist) / 2;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    a.x -= nx * overlap;
                    a.y -= ny * overlap;
                    b.x += nx * overlap;
                    b.y += ny * overlap;
                    const relVx = a.vx - b.vx;
                    const relVy = a.vy - b.vy;
                    const relDot = relVx * nx + relVy * ny;
                    if (relDot > 0) {
                        a.vx -= relDot * nx * 0.5;
                        a.vy -= relDot * ny * 0.5;
                        b.vx += relDot * nx * 0.5;
                        b.vy += relDot * ny * 0.5;
                    }
                    // Show collision message on impact
                    if (relDot > 1.5 && Math.random() < 0.4) {
                        showNpcDialogue(Math.random() < 0.5 ? a : b);
                    }
                }
            }
        }
    }

    private _collideCursor(s: SummonedShiggy, cx: number, cy: number): void {
        // Skip collision for following shiggys (rope handles connection)
        if (s.following) return;
        const sx = s.x + SHIGGY_SIZE / 2;
        const sy = s.y + SHIGGY_SIZE / 2;
        const dx = sx - cx;
        const dy = sy - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = SHIGGY_RADIUS + CURSOR_RADIUS;
        if (dist < minDist && dist > 0.01) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;
            s.x += nx * overlap;
            s.y += ny * overlap;
            s.vx += this._cursorVx * CURSOR_MASS_TRANSFER;
            s.vy += this._cursorVy * CURSOR_MASS_TRANSFER;
            const dot = s.vx * nx + s.vy * ny;
            if (dot < 0) {
                s.vx -= dot * nx * 1.5;
                s.vy -= dot * ny * 1.5;
            }
        }
    }

    // --- NPC idle ---

    private _lerpRotation(current: number, target: number, rate: number): number {
        let delta = ((target - current + 540) % 360) - 180;
        return current + delta * rate;
    }

    private _applyRotation(s: SummonedShiggy): void {
        s.img.style.transform = `rotate(${s.rotation.toFixed(1)}deg)`;
    }

    private _pickWaypoint(s: SummonedShiggy, now: number): void {
        const margin = SHIGGY_SIZE;
        s.waypointX = margin + Math.random() * (window.innerWidth - margin * 2);
        s.waypointY = margin + Math.random() * (window.innerHeight - margin * 2);
        s.waypointTimer = now + NPC_WAYPOINT_MIN_MS + Math.random() * NPC_WAYPOINT_RAND_MS;
    }

    private _tickIdle(s: SummonedShiggy, now: number): void {
        s.vx *= NPC_FRICTION;
        s.vy *= NPC_FRICTION;

        const cx = s.x + SHIGGY_SIZE / 2;
        const cy = s.y + SHIGGY_SIZE / 2;
        const dx = s.waypointX - cx;
        const dy = s.waypointY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > NPC_WAYPOINT_DIST) {
            s.vx += (dx / dist) * NPC_IDLE_SPEED * 0.02;
            s.vy += (dy / dist) * NPC_IDLE_SPEED * 0.02;
        } else if (now > s.waypointTimer) {
            this._pickWaypoint(s, now);
        }

        // Cat righting: ease back to upright regardless of drift direction
        s.rotation = this._lerpRotation(s.rotation, 0, 0.06);

        s.x += s.vx;
        s.y += s.vy;
        this._collideViewport(s);
        s.img.style.left = `${s.x}px`;
        s.img.style.top = `${s.y}px`;
        this._applyRotation(s);
        positionDialogue(s);
    }

    private _tickExploring(s: SummonedShiggy, now: number): void {
        if (now >= s.exploreUntil) {
            s.exploring = false;
            clearDialogue(s);
            s.vx *= 0.3;
            s.vy *= 0.3;
            return;
        }
        s.vx *= NPC_FRICTION;
        s.vy *= NPC_FRICTION;
        s.vx += (Math.random() - 0.5) * 0.15;
        s.vy += (Math.random() - 0.5) * 0.15;

        // Drift rotation during explore, but lean toward upright
        s.rotation = this._lerpRotation(s.rotation, 0, 0.04);

        s.x += s.vx;
        s.y += s.vy;
        this._collideViewport(s);
        s.img.style.left = `${s.x}px`;
        s.img.style.top = `${s.y}px`;
        this._applyRotation(s);
        positionDialogue(s);
    }

    private _tickFollower(
        s: SummonedShiggy,
        delayed: { x: number; y: number },
        tooFast: boolean,
        now: number,
    ): { following: boolean; tension: number } {
        // Random explore break — only eligible after minimum follow time
        const followDuration = now - s.followingSince;
        if (followDuration > EXPLORE_MIN_FOLLOW_MS && Math.random() < EXPLORE_CHANCE) {
            s.following = false;
            s.followingSince = 0;
            s.exploring = true;
            s.exploreUntil = now + EXPLORE_DURATION_MS * (0.5 + Math.random());
            s.vx += (Math.random() - 0.5) * 4;
            s.vy += (Math.random() - 0.5) * 4;
            s.img.style.animation = `shiggy-float ${3 + Math.random() * 4}s ease-in-out infinite, shiggy-wobble ${4 + Math.random() * 3}s ease-in-out infinite`;
            showNpcDialogue(s);
            return { following: false, tension: 0 };
        }

        // Speed check with buffer
        if (tooFast) {
            if (s.unfollowAt === 0) {
                s.unfollowAt = now + UNFOLLOW_BUFFER_MS;
            } else if (now >= s.unfollowAt) {
                s.following = false;
                s.followingSince = 0;
                s.unfollowAt = 0;
                const fDur = 3 + Math.random() * 4;
                const wDur = 4 + Math.random() * 3;
                s.img.style.animation = `shiggy-float ${fDur}s ease-in-out infinite, shiggy-wobble ${wDur}s ease-in-out infinite`;
                return { following: false, tension: 0 };
            }
        } else {
            s.unfollowAt = 0;
        }

        // Rope anchor is just the cursor — no forced offset.
        const anchorX = delayed.x;
        const anchorY = delayed.y;

        const cx = s.x + SHIGGY_SIZE / 2;
        const cy = s.y + SHIGGY_SIZE / 2;
        const dx = anchorX - cx;
        const dy = anchorY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let tension = 0;

        // Pull only when rope is taut
        if (dist > ROPE_SLACK) {
            const stretch = dist - ROPE_SLACK;
            tension = Math.min(stretch / 160, 1);
            const nx = dx / dist;
            const ny = dy / dist;

            // Spring pull toward anchor
            s.vx += nx * stretch * ROPE_K;
            s.vy += ny * stretch * ROPE_K;

            // Axial damping: bleed off velocity along the rope axis only
            const velAlongRope = s.vx * nx + s.vy * ny;
            s.vx -= nx * velAlongRope * ROPE_AXIAL_DAMPING;
            s.vy -= ny * velAlongRope * ROPE_AXIAL_DAMPING;
        }

        // Cursor bias: flat nudge
        if (dist > 0.01) {
            const nx = dx / dist;
            const ny = dy / dist;
            s.vx += nx * (s.cursorBias * 0.012);
            s.vy += ny * (s.cursorBias * 0.012);
        }

        // Global ice friction — barely any
        s.vx *= ROPE_DAMPING;
        s.vy *= ROPE_DAMPING;

        // Clamp top speed
        const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        if (speed > MAX_VEL) {
            s.vx = (s.vx / speed) * MAX_VEL;
            s.vy = (s.vy / speed) * MAX_VEL;
        }

        // Integrate
        s.x += s.vx;
        s.y += s.vy;

        // Smooth velocity via EMA — decoupled from physics, only used for angle
        const alpha = 0.08;
        s.smoothVx = s.smoothVx + alpha * (s.vx - s.smoothVx);
        s.smoothVy = s.smoothVy + alpha * (s.vy - s.smoothVy);

        const smoothSpeed = Math.sqrt(s.smoothVx * s.smoothVx + s.smoothVy * s.smoothVy);
        if (smoothSpeed > 0.15) {
            const travelAngle = Math.atan2(s.smoothVy, s.smoothVx) * (180 / Math.PI) + 90;
            const tiltStrength = 0.08 + tension * 0.08;
            s.rotation = this._lerpRotation(s.rotation, travelAngle, tiltStrength);
        } else {
            s.rotation = this._lerpRotation(s.rotation, 0, 0.04);
        }

        s.img.style.left = `${s.x}px`;
        s.img.style.top = `${s.y}px`;
        this._applyRotation(s);

        return { following: true, tension };
    }

    private _tick(summoned: SummonedShiggy[]): void {
        const now = performance.now();
        const delayed = this._getDelayedPos();

        // Per-frame cursor velocity (smooth, frame-rate independent)
        this._cursorVx = delayed.x - this._prevCursorX;
        this._cursorVy = delayed.y - this._prevCursorY;
        this._prevCursorX = delayed.x;
        this._prevCursorY = delayed.y;

        // Dwell detection
        const dwellDx = delayed.x - this._dwellX;
        const dwellDy = delayed.y - this._dwellY;
        const dwellDist = Math.sqrt(dwellDx * dwellDx + dwellDy * dwellDy);
        if (dwellDist > PROXIMITY_PX * 0.5) {
            this._dwellX = delayed.x;
            this._dwellY = delayed.y;
            this._dwellStartTime = now;
        }
        const dwelling = (now - this._dwellStartTime) > DWELL_TIME_MS;
        const tooFast = this._mouseSpeed > MAX_FOLLOW_SPEED;

        let followerCount = 0;
        for (const s of summoned) {
            if (s.following) followerCount++;
        }

        this._clearLines();

        // Track tension per follower for line coloring
        const followerTensions = new Map<SummonedShiggy, number>();

        for (const s of summoned) {
            if (s.inConversation) {
                s.vx *= NPC_FRICTION;
                s.vy *= NPC_FRICTION;
                s.rotation = this._lerpRotation(s.rotation, 0, 0.06);
                s.x += s.vx;
                s.y += s.vy;
                this._collideViewport(s);
                s.img.style.left = `${s.x}px`;
                s.img.style.top = `${s.y}px`;
                this._applyRotation(s);
                positionDialogue(s);
                continue;
            }

            if (s.exploring) {
                this._tickExploring(s, now);
            } else if (s.following) {
                const result = this._tickFollower(s, delayed, tooFast, now);
                if (result.following) {
                    followerTensions.set(s, result.tension);
                } else {
                    followerCount--;
                }
            } else {
                this._tickIdle(s, now);

                // Check follow eligibility
                if (dwelling && !tooFast && followerCount < MAX_FOLLOWERS) {
                    const cx = s.x + SHIGGY_SIZE / 2;
                    const cy = s.y + SHIGGY_SIZE / 2;
                    const dx = delayed.x - cx;
                    const dy = delayed.y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < PROXIMITY_PX) {
                        s.following = true;
                        s.followingSince = now;
                        s.unfollowAt = 0;
                        s.vx *= 0.5;
                        s.vy *= 0.5;
                        s.offsetAngle = Math.random() * Math.PI * 2;
                        s.offsetDist = OFFSET_RADIUS * (0.4 + Math.random() * 0.6);
                        s.img.style.animation = "";
                        followerCount++;
                    }
                }
            }
        }

        // Collisions (after all movement)
        this._collideShiggys(summoned);
        for (const s of summoned) {
            this._collideCursor(s, delayed.x, delayed.y);
            this._collideViewport(s);
            s.img.style.left = `${s.x}px`;
            s.img.style.top = `${s.y}px`;
        }

        // Draw lines with tension coloring
        for (const [s, tension] of followerTensions) {
            const lineX = s.x + SHIGGY_SIZE / 2;
            const lineY = s.y + SHIGGY_SIZE / 2;
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", String(lineX));
            line.setAttribute("y1", String(lineY));
            line.setAttribute("x2", String(delayed.x));
            line.setAttribute("y2", String(delayed.y));
            line.setAttribute("stroke-width", "1.5");
            if (s.unfollowAt > 0) {
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

        // NPC-to-NPC conversations
        for (let i = 0; i < summoned.length; i++) {
            const a = summoned[i];
            if (a.inConversation || a.following || a.exploring) continue;
            if (Math.random() > CONVO_CHANCE) continue;
            for (let j = i + 1; j < summoned.length; j++) {
                const b = summoned[j];
                if (b.inConversation || b.following || b.exploring) continue;
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONVO_PROXIMITY) {
                    a.vx += dx > 0 ? -0.15 : 0.15;
                    a.vy += dy > 0 ? -0.15 : 0.15;
                    b.vx += dx > 0 ? 0.15 : -0.15;
                    b.vy += dy > 0 ? 0.15 : -0.15;
                    startConversation(a, b);
                    break;
                }
            }
        }
    }
}
