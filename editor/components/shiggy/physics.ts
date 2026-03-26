// physics.ts
//
// Purpose: Physics engine for shiggy system
// - Owns all mutable physics state (positions, velocities, rotation)
// - Computes rope, collision, idle nav each frame
// - Returns flat array of results for DOM applier

import {
    SHIGGY_SIZE, SHIGGY_RADIUS, ROPE_SLACK, ROPE_K, ROPE_DAMPING,
    ROPE_AXIAL_DAMPING, MAX_VEL, NPC_FRICTION, NPC_BOUNCE_ENERGY,
    NPC_IDLE_SPEED, NPC_WAYPOINT_DIST, NPC_WAYPOINT_MIN_MS, NPC_WAYPOINT_RAND_MS,
    CURSOR_RADIUS, CURSOR_MASS_TRANSFER,
    EXPLORE_CHANCE, EXPLORE_DURATION_MS, EXPLORE_MIN_FOLLOW_MS,
    UNFOLLOW_BUFFER_MS, MAX_FOLLOW_SPEED, MAX_FOLLOWERS,
    PROXIMITY_PX, DWELL_TIME_MS, OFFSET_RADIUS,
} from "./types";

export interface PhysState {
    x: number; y: number;
    vx: number; vy: number;
    rotation: number;
    smoothVx: number; smoothVy: number;
    following: boolean;
    followingSince: number;
    unfollowAt: number;
    exploring: boolean;
    exploreUntil: number;
    waypointX: number; waypointY: number;
    waypointTimer: number;
    offsetAngle: number;
    offsetDist: number;
    cursorBias: number;
    inConversation: boolean;
}

export interface PhysEvent {
    type: "explore" | "collision" | "conversation";
    index: number;
    partner?: number;
}

export interface FrameResult {
    x: number;
    y: number;
    rotation: number;
    tension: number;
    following: boolean;
    exploring: boolean;
    stressed: boolean;
}

export class PhysicsEngine {
    private _states: PhysState[] = [];
    private _cursorX = 0;
    private _cursorY = 0;
    private _cursorVx = 0;
    private _cursorVy = 0;
    private _prevCursorX = 0;
    private _prevCursorY = 0;
    private _mouseSpeed = 0;
    private _dwellX = 0;
    private _dwellY = 0;
    private _dwellStart = 0;
    private _viewW = 800;
    private _viewH = 600;
    private _events: PhysEvent[] = [];

    public getEvents(): PhysEvent[] {
        return this._events.splice(0);
    }

    public resize(w: number, h: number): void {
        this._viewW = w;
        this._viewH = h;
    }

    public addShiggy(x: number, y: number): void {
        this._states.push({
            x, y, vx: 0, vy: 0,
            rotation: 0, smoothVx: 0, smoothVy: 0,
            following: false, followingSince: 0, unfollowAt: 0,
            exploring: false, exploreUntil: 0,
            waypointX: Math.random() * this._viewW,
            waypointY: Math.random() * this._viewH,
            waypointTimer: 0,
            offsetAngle: Math.random() * Math.PI * 2,
            offsetDist: OFFSET_RADIUS * (0.4 + Math.random() * 0.6),
            cursorBias: (Math.random() - 0.5) * 2,
            inConversation: false,
        });
    }

    public removeShiggy(index: number): void {
        this._states.splice(index, 1);
    }

    public clearAll(): void {
        this._states.length = 0;
    }

    public setCursor(x: number, y: number, speed: number, now: number): void {
        this._cursorVx = x - this._prevCursorX;
        this._cursorVy = y - this._prevCursorY;
        this._prevCursorX = this._cursorX;
        this._prevCursorY = this._cursorY;
        this._cursorX = x;
        this._cursorY = y;
        this._mouseSpeed = speed;
        const ddx = x - this._dwellX;
        const ddy = y - this._dwellY;
        if (Math.sqrt(ddx * ddx + ddy * ddy) > PROXIMITY_PX * 0.5) {
            this._dwellX = x;
            this._dwellY = y;
            this._dwellStart = now;
        }
    }

    public setConversation(index: number, value: boolean): void {
        if (this._states[index]) this._states[index].inConversation = value;
    }

    public tick(now: number): FrameResult[] {
        this._events.length = 0;
        for (let i = 0; i < this._states.length; i++) {
            this._tickOne(this._states[i], i, now);
        }
        this._collideAll();
        this._collideCursor();
        for (const s of this._states) {
            this._collideViewport(s);
        }

        // NPC-to-NPC conversations
        for (let i = 0; i < this._states.length; i++) {
            const a = this._states[i];
            if (a.inConversation || a.following || a.exploring) continue;
            if (Math.random() > 0.002) continue;
            for (let j = i + 1; j < this._states.length; j++) {
                const b = this._states[j];
                if (b.inConversation || b.following || b.exploring) continue;
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    a.vx += dx > 0 ? -0.15 : 0.15;
                    a.vy += dy > 0 ? -0.15 : 0.15;
                    b.vx += dx > 0 ? 0.15 : -0.15;
                    b.vy += dy > 0 ? 0.15 : -0.15;
                    a.inConversation = true;
                    b.inConversation = true;
                    this._events.push({ type: "conversation", index: i, partner: j });
                    break;
                }
            }
        }

        const results: FrameResult[] = [];
        for (const s of this._states) {
            results.push({
                x: s.x, y: s.y,
                rotation: s.rotation,
                tension: 0,
                following: s.following,
                exploring: s.exploring,
                stressed: s.unfollowAt > 0,
            });
        }
        return results;
    }

    private _lerpAngle(current: number, target: number, rate: number): number {
        const delta = ((target - current + 540) % 360) - 180;
        return current + delta * rate;
    }

    private _clampVel(s: PhysState): void {
        const spd = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        if (spd > MAX_VEL) {
            s.vx = (s.vx / spd) * MAX_VEL;
            s.vy = (s.vy / spd) * MAX_VEL;
        }
    }

    private _collideViewport(s: PhysState): void {
        const maxX = this._viewW - SHIGGY_SIZE;
        const maxY = this._viewH - SHIGGY_SIZE;
        if (s.x < 0)    { s.x = 0;    if (s.vx < 0) s.vx =  Math.abs(s.vx) * NPC_BOUNCE_ENERGY; }
        if (s.x > maxX) { s.x = maxX; if (s.vx > 0) s.vx = -Math.abs(s.vx) * NPC_BOUNCE_ENERGY; }
        if (s.y < 0)    { s.y = 0;    if (s.vy < 0) s.vy =  Math.abs(s.vy) * NPC_BOUNCE_ENERGY; }
        if (s.y > maxY) { s.y = maxY; if (s.vy > 0) s.vy = -Math.abs(s.vy) * NPC_BOUNCE_ENERGY; }
    }

    private _pickWaypoint(s: PhysState, now: number): void {
        const margin = SHIGGY_SIZE;
        s.waypointX = margin + Math.random() * (this._viewW - margin * 2);
        s.waypointY = margin + Math.random() * (this._viewH - margin * 2);
        s.waypointTimer = now + NPC_WAYPOINT_MIN_MS + Math.random() * NPC_WAYPOINT_RAND_MS;
    }

    private _tickIdle(s: PhysState, now: number): void {
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
        s.rotation = this._lerpAngle(s.rotation, 0, 0.06);
        s.x += s.vx;
        s.y += s.vy;
        this._collideViewport(s);

        const fdx = this._cursorX - cx;
        const fdy = this._cursorY - cy;
        const fdist = Math.sqrt(fdx * fdx + fdy * fdy);
        const dwelling = (now - this._dwellStart) > DWELL_TIME_MS;
        const tooFast = this._mouseSpeed > MAX_FOLLOW_SPEED;
        let followerCount = 0;
        for (const st of this._states) { if (st.following) followerCount++; }
        if (dwelling && !tooFast && followerCount < MAX_FOLLOWERS && fdist < PROXIMITY_PX) {
            s.following = true;
            s.followingSince = now;
            s.unfollowAt = 0;
            s.vx *= 0.5;
            s.vy *= 0.5;
            s.offsetAngle = Math.random() * Math.PI * 2;
            s.offsetDist = OFFSET_RADIUS * (0.4 + Math.random() * 0.6);
        }
    }

    private _tickFollower(s: PhysState, idx: number, now: number): number {
        const followDuration = now - s.followingSince;
        if (followDuration > EXPLORE_MIN_FOLLOW_MS && Math.random() < EXPLORE_CHANCE) {
            s.following = false;
            s.followingSince = 0;
            s.exploring = true;
            s.exploreUntil = now + EXPLORE_DURATION_MS * (0.5 + Math.random());
            s.vx += (Math.random() - 0.5) * 4;
            s.vy += (Math.random() - 0.5) * 4;
            this._events.push({ type: "explore", index: idx });
            return 0;
        }

        const tooFast = this._mouseSpeed > MAX_FOLLOW_SPEED;
        if (tooFast) {
            if (s.unfollowAt === 0) {
                s.unfollowAt = now + UNFOLLOW_BUFFER_MS;
            } else if (now >= s.unfollowAt) {
                s.following = false;
                s.followingSince = 0;
                s.unfollowAt = 0;
                return 0;
            }
        } else {
            s.unfollowAt = 0;
        }

        const cx = s.x + SHIGGY_SIZE / 2;
        const cy = s.y + SHIGGY_SIZE / 2;
        const dx = this._cursorX - cx;
        const dy = this._cursorY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let tension = 0;

        if (dist > ROPE_SLACK) {
            const stretch = dist - ROPE_SLACK;
            tension = Math.min(stretch / 160, 1);
            const nx = dx / dist;
            const ny = dy / dist;
            s.vx += nx * stretch * ROPE_K;
            s.vy += ny * stretch * ROPE_K;
            const vel = s.vx * nx + s.vy * ny;
            s.vx -= nx * vel * ROPE_AXIAL_DAMPING;
            s.vy -= ny * vel * ROPE_AXIAL_DAMPING;
        }

        if (dist > 0.01) {
            const nx = dx / dist;
            const ny = dy / dist;
            s.vx += nx * (s.cursorBias * 0.012);
            s.vy += ny * (s.cursorBias * 0.012);
        }

        s.vx *= ROPE_DAMPING;
        s.vy *= ROPE_DAMPING;
        this._clampVel(s);

        s.x += s.vx;
        s.y += s.vy;

        const alpha = 0.08;
        s.smoothVx += alpha * (s.vx - s.smoothVx);
        s.smoothVy += alpha * (s.vy - s.smoothVy);
        const smoothSpd = Math.sqrt(s.smoothVx ** 2 + s.smoothVy ** 2);
        if (smoothSpd > 0.15) {
            const angle = Math.atan2(s.smoothVy, s.smoothVx) * (180 / Math.PI) + 90;
            s.rotation = this._lerpAngle(s.rotation, angle, 0.08 + tension * 0.08);
        } else {
            s.rotation = this._lerpAngle(s.rotation, 0, 0.04);
        }

        return tension;
    }

    private _tickOne(s: PhysState, idx: number, now: number): void {
        if (s.inConversation) {
            s.vx *= NPC_FRICTION;
            s.vy *= NPC_FRICTION;
            s.x += s.vx;
            s.y += s.vy;
            this._collideViewport(s);
            return;
        }

        if (s.exploring) {
            if (now >= s.exploreUntil) {
                s.exploring = false;
                s.vx *= 0.3;
                s.vy *= 0.3;
            } else {
                s.vx *= NPC_FRICTION;
                s.vy *= NPC_FRICTION;
                s.vx += (Math.random() - 0.5) * 0.15;
                s.vy += (Math.random() - 0.5) * 0.15;
                s.rotation = this._lerpAngle(s.rotation, 0, 0.04);
            }
            s.x += s.vx;
            s.y += s.vy;
            this._collideViewport(s);
            return;
        }

        if (s.following) {
            this._tickFollower(s, idx, now);
            return;
        }

        this._tickIdle(s, now);
    }

    private _collideAll(): void {
        for (let i = 0; i < this._states.length; i++) {
            for (let j = i + 1; j < this._states.length; j++) {
                const a = this._states[i], b = this._states[j];
                const ax = a.x + SHIGGY_SIZE / 2, ay = a.y + SHIGGY_SIZE / 2;
                const bx = b.x + SHIGGY_SIZE / 2, by = b.y + SHIGGY_SIZE / 2;
                const dx = bx - ax, dy = by - ay;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = SHIGGY_RADIUS * 2;
                if (dist < minDist && dist > 0.01) {
                    const overlap = (minDist - dist) / 2;
                    const nx = dx / dist, ny = dy / dist;
                    a.x -= nx * overlap; a.y -= ny * overlap;
                    b.x += nx * overlap; b.y += ny * overlap;
                    const relVx = a.vx - b.vx, relVy = a.vy - b.vy;
                    const dot = relVx * nx + relVy * ny;
                    if (dot > 0) {
                        a.vx -= dot * nx * 0.5; a.vy -= dot * ny * 0.5;
                        b.vx += dot * nx * 0.5; b.vy += dot * ny * 0.5;
                        if (dot > 1.5 && Math.random() < 0.4) {
                            this._events.push({ type: "collision", index: Math.random() < 0.5 ? i : j });
                        }
                    }
                }
            }
        }
    }

    private _collideCursor(): void {
        for (const s of this._states) {
            if (s.following) continue;
            const sx = s.x + SHIGGY_SIZE / 2, sy = s.y + SHIGGY_SIZE / 2;
            const dx = sx - this._cursorX, dy = sy - this._cursorY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = SHIGGY_RADIUS + CURSOR_RADIUS;
            if (dist < minDist && dist > 0.01) {
                const overlap = minDist - dist;
                const nx = dx / dist, ny = dy / dist;
                s.x += nx * overlap; s.y += ny * overlap;
                s.vx += this._cursorVx * CURSOR_MASS_TRANSFER;
                s.vy += this._cursorVy * CURSOR_MASS_TRANSFER;
                const dot = s.vx * nx + s.vy * ny;
                if (dot < 0) { s.vx -= dot * nx * 1.5; s.vy -= dot * ny * 1.5; }
            }
        }
    }
}
