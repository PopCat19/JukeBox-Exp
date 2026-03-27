// physics.ts
//
// Purpose: Physics engine for shiggy system
// - Owns all mutable physics state (positions, velocities)
// - Computes rope, collision, idle nav each frame
// - Returns flat array of results for DOM applier

import {
    SHIGGY_SIZE, SHIGGY_HITBOX_RADIUS, ROPE_SLACK, ROPE_K, ROPE_DAMPING,
    ROPE_AXIAL_DAMPING, MAX_VEL, NPC_FRICTION, NPC_BOUNCE_ENERGY,
    NPC_IDLE_SPEED, NPC_WAYPOINT_DIST_MIN,
    NPC_WAYPOINT_MIN_MS, NPC_WAYPOINT_RAND_MS,
    NPC_IDLE_PAUSE_MIN_MS, NPC_IDLE_PAUSE_RAND_MS,
    CURSOR_RADIUS, CURSOR_MASS_TRANSFER,
    EXPLORE_CHANCE, EXPLORE_DURATION_MS, EXPLORE_MIN_FOLLOW_MS,
    UNFOLLOW_BUFFER_MS, MAX_FOLLOW_SPEED, UNFOLLOW_YANK_PX_S, MAX_FOLLOWERS,
    PROXIMITY_PX, DWELL_TIME_MS, CONVO_PROXIMITY, CONVO_CHANCE, FOLLOW_PROXIMITY_PX,
    OFFSET_RADIUS,
} from "./types";

export interface PhysState {
    x: number; y: number;
    vx: number; vy: number;
    smoothVx: number; smoothVy: number;
    following: boolean;
    followingSince: number;
    unfollowAt: number;
    exploring: boolean;
    exploreUntil: number;
    waypointX: number; waypointY: number;
    waypointTimer: number;
    pauseUntil: number;
    cursorBias: number;
    facingRight: boolean;
    inConversation: boolean;
    tension: number;
    approaching: boolean;
    offsetAngle: number;
    offsetDist: number;
}

export interface PhysEvent {
    type: "explore" | "collision" | "conversation";
    index: number;
    partner?: number;
}

export interface FrameResult {
    x: number;
    y: number;
    facingRight: boolean;
    tension: number;
    following: boolean;
    exploring: boolean;
    stressed: boolean;
    approaching: boolean;
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
            smoothVx: 0, smoothVy: 0,
            following: false, followingSince: 0, unfollowAt: 0,
            exploring: false, exploreUntil: 0,
            waypointX: Math.random() * this._viewW,
            waypointY: Math.random() * this._viewH,
            waypointTimer: 0,
            pauseUntil: 0,
            cursorBias: (Math.random() - 0.5) * 2,
            facingRight: true,
            inConversation: false,
            tension: 0,
            approaching: false,
            offsetAngle: Math.random() * Math.PI * 2,
            offsetDist: OFFSET_RADIUS * (0.4 + Math.random() * 0.6),
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
        // Store cursor position at start of tick for continuous collision detection
        const tickStartCursorX = this._cursorX;
        const tickStartCursorY = this._cursorY;

        for (let i = 0; i < this._states.length; i++) {
            this._tickOne(this._states[i], i, now);
        }
        this._collideAll();
        this._collideCursor(tickStartCursorX, tickStartCursorY);
        for (const s of this._states) {
            this._collideViewport(s);
        }

        // NPC-to-NPC conversations
        for (let i = 0; i < this._states.length; i++) {
            const a = this._states[i];
            if (a.inConversation || a.following || a.exploring) continue;
            if (Math.random() > CONVO_CHANCE) continue;
            for (let j = i + 1; j < this._states.length; j++) {
                const b = this._states[j];
                if (b.inConversation || b.following || b.exploring) continue;
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONVO_PROXIMITY) {
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
                facingRight: s.facingRight,
                tension: s.tension,
                following: s.following,
                exploring: s.exploring,
                stressed: s.unfollowAt > 0,
                approaching: s.approaching,
            });
        }
        return results;
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
        const margin = SHIGGY_SIZE * 3;
        const safeW = this._viewW - margin * 2;
        const safeH = this._viewH - margin * 2;
        const wx = margin + Math.random() * safeW;
        const wy = margin + Math.random() * safeH;
        s.waypointX = wx;
        s.waypointY = wy;
        s.waypointTimer = now + NPC_WAYPOINT_MIN_MS + Math.random() * NPC_WAYPOINT_RAND_MS;
        s.pauseUntil = now + NPC_IDLE_PAUSE_MIN_MS + Math.random() * NPC_IDLE_PAUSE_RAND_MS;
    }

    private _tickIdle(s: PhysState, now: number): void {
        s.vx *= NPC_FRICTION;
        s.vy *= NPC_FRICTION;
        if (now < s.pauseUntil) {
            s.x += s.vx;
            s.y += s.vy;
            this._collideViewport(s);
        } else {
            const cx = s.x + SHIGGY_SIZE / 2;
            const cy = s.y + SHIGGY_SIZE / 2;
            const dx = s.waypointX - cx;
            const dy = s.waypointY - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > NPC_WAYPOINT_DIST_MIN) {
                s.vx += (dx / dist) * NPC_IDLE_SPEED * 0.02;
                s.vy += (dy / dist) * NPC_IDLE_SPEED * 0.02;
            } else if (now > s.waypointTimer) {
                this._pickWaypoint(s, now);
            }
            s.x += s.vx;
            s.y += s.vy;
            this._collideViewport(s);
        }

        const alpha = 0.08;
        s.smoothVx += alpha * (s.vx - s.smoothVx);
        s.smoothVy += alpha * (s.vy - s.smoothVy);
        if (Math.abs(s.smoothVx) > 0.04) {
            s.facingRight = s.smoothVx > 0;
        }

        const fdx = this._cursorX - (s.x + SHIGGY_SIZE / 2);
        const fdy = this._cursorY - (s.y + SHIGGY_SIZE / 2);
        const fdist = Math.sqrt(fdx * fdx + fdy * fdy);
        const dwelling = (now - this._dwellStart) > DWELL_TIME_MS;
        const tooFast = this._mouseSpeed > MAX_FOLLOW_SPEED;
        let followerCount = 0;
        for (const st of this._states) { if (st.following) followerCount++; }
        if (dwelling && !tooFast && followerCount < MAX_FOLLOWERS && fdist < FOLLOW_PROXIMITY_PX) {
            s.approaching = true;
        }
    }

    private _tickApproach(s: PhysState, now: number): void {
        if (this._mouseSpeed > MAX_FOLLOW_SPEED) {
            s.approaching = false;
            return;
        }

        const cx = s.x + SHIGGY_SIZE / 2;
        const cy = s.y + SHIGGY_SIZE / 2;
        const targetX = this._cursorX + Math.cos(s.offsetAngle) * s.offsetDist;
        const targetY = this._cursorY + Math.sin(s.offsetAngle) * s.offsetDist;
        const dx = targetX - cx;
        const dy = targetY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= ROPE_SLACK) {
            s.approaching = false;
            s.following = true;
            s.followingSince = now;
            s.unfollowAt = 0;
            return;
        }

        const nx = dx / dist;
        const ny = dy / dist;
        const targetSpeed = Math.min(dist * 0.06, 6);
        s.vx += (nx * targetSpeed - s.vx) * 0.12;
        s.vy += (ny * targetSpeed - s.vy) * 0.12;
        this._clampVel(s);

        s.x += s.vx;
        s.y += s.vy;

        const alpha = 0.08;
        s.smoothVx += alpha * (s.vx - s.smoothVx);
        s.smoothVy += alpha * (s.vy - s.smoothVy);
        if (Math.abs(s.smoothVx) > 0.04) {
            s.facingRight = s.smoothVx > 0;
        }
        this._collideViewport(s);
    }

    private _tickFollower(s: PhysState, idx: number, now: number): void {
        s.tension = 0;
        const followDuration = now - s.followingSince;
        if (followDuration > EXPLORE_MIN_FOLLOW_MS && Math.random() < EXPLORE_CHANCE) {
            s.following = false;
            s.followingSince = 0;
            s.exploring = true;
            s.exploreUntil = now + EXPLORE_DURATION_MS * (0.5 + Math.random());
            s.vx += (Math.random() - 0.5) * 4;
            s.vy += (Math.random() - 0.5) * 4;
            this._events.push({ type: "explore", index: idx });
            return;
        }

        const yanked = this._mouseSpeed > UNFOLLOW_YANK_PX_S;
        if (yanked) {
            s.following = false;
            s.followingSince = 0;
            s.unfollowAt = 0;
            s.vx += (this._cursorVx * 0.4);
            s.vy += (this._cursorVy * 0.4);
            return;
        }

        const tooFast = this._mouseSpeed > MAX_FOLLOW_SPEED;
        if (tooFast) {
            if (s.unfollowAt === 0) {
                s.unfollowAt = now + UNFOLLOW_BUFFER_MS;
            } else if (now >= s.unfollowAt) {
                s.following = false;
                s.followingSince = 0;
                s.unfollowAt = 0;
                return;
            }
        } else {
            s.unfollowAt = 0;
        }

        const cx = s.x + SHIGGY_SIZE / 2;
        const cy = s.y + SHIGGY_SIZE / 2;
        const targetX = this._cursorX + Math.cos(s.offsetAngle) * s.offsetDist;
        const targetY = this._cursorY + Math.sin(s.offsetAngle) * s.offsetDist;
        const dx = targetX - cx;
        const dy = targetY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > ROPE_SLACK) {
            const stretch = dist - ROPE_SLACK;
            s.tension = Math.min(stretch / 160, 1);
            const nx = dx / dist;
            const ny = dy / dist;
            const approachVel = s.vx * nx + s.vy * ny;
            const springScale = Math.max(0, 1 - approachVel / MAX_VEL);
            s.vx += nx * stretch * ROPE_K * springScale;
            s.vy += ny * stretch * ROPE_K * springScale;
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
        if (Math.abs(s.smoothVx) > 0.04) {
            s.facingRight = s.smoothVx > 0;
        }
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
            }
            s.x += s.vx;
            s.y += s.vy;
            const alpha = 0.08;
            s.smoothVx += alpha * (s.vx - s.smoothVx);
            s.smoothVy += alpha * (s.vy - s.smoothVy);
            if (Math.abs(s.smoothVx) > 0.04) {
                s.facingRight = s.smoothVx > 0;
            }
            this._collideViewport(s);
            return;
        }

        if (s.approaching) {
            this._tickApproach(s, now);
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
                const minDist = SHIGGY_HITBOX_RADIUS * 2;

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
                } else if (dist >= minDist) {
                    // Continuous collision detection for high-speed collisions
                    // Check if the relative motion path intersects
                    const relVx = a.vx - b.vx, relVy = a.vy - b.vy;
                    const relSpeedSq = relVx * relVx + relVy * relVy;

                    if (relSpeedSq > 0.01) {
                        // Vector from a to b
                        const toBx = bx - ax, toBy = by - ay;

                        // Project b onto relative velocity path
                        const t = Math.max(0, Math.min(1,
                            (toBx * relVx + toBy * relVy) / relSpeedSq
                        ));

                        // Closest point on relative path to b
                        const closestX = ax + relVx * t;
                        const closestY = ay + relVy * t;

                        // Distance from closest point to b
                        const closestDx = bx - closestX;
                        const closestDy = by - closestY;
                        const closestDist = Math.sqrt(closestDx * closestDx + closestDy * closestDy);

                        if (closestDist < minDist && closestDist > 0.01) {
                            // Collision detected along the path
                            const overlap = (minDist - closestDist) / 2;
                            const nx = closestDx / closestDist;
                            const ny = closestDy / closestDist;
                            a.x -= nx * overlap; a.y -= ny * overlap;
                            b.x += nx * overlap; b.y += ny * overlap;

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
        }
    }

    private _collideCursor(tickStartCursorX: number, tickStartCursorY: number): void {
        for (const s of this._states) {
            if (s.following || s.approaching) continue;
            const sx = s.x + SHIGGY_SIZE / 2, sy = s.y + SHIGGY_SIZE / 2;

            // Continuous collision detection: check if cursor path intersects shiggy hitbox
            // Use the cursor position at the start of the tick and the current position
            const dx = sx - this._cursorX, dy = sy - this._cursorY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = SHIGGY_HITBOX_RADIUS + CURSOR_RADIUS;

            // Check if current position is already colliding
            if (dist < minDist && dist > 0.01) {
                const overlap = minDist - dist;
                const nx = dx / dist, ny = dy / dist;
                s.x += nx * overlap; s.y += ny * overlap;
                const cursorNormal =
                    this._cursorVx * nx + this._cursorVy * ny;
                if (cursorNormal > 0) {
                    s.vx += nx * cursorNormal * CURSOR_MASS_TRANSFER;
                    s.vy += ny * cursorNormal * CURSOR_MASS_TRANSFER;
                }
            } else {
                // Check if cursor path between ticks intersects shiggy hitbox
                // This prevents tunneling at low FPS
                const pathDx = this._cursorX - tickStartCursorX;
                const pathDy = this._cursorY - tickStartCursorY;
                const pathLenSq = pathDx * pathDx + pathDy * pathDy;

                if (pathLenSq > 0.01) {
                    // Vector from tick start cursor to shiggy center
                    const toShiggyX = sx - tickStartCursorX;
                    const toShiggyY = sy - tickStartCursorY;

                    // Project shiggy center onto cursor path
                    const t = Math.max(0, Math.min(1,
                        (toShiggyX * pathDx + toShiggyY * pathDy) / pathLenSq
                    ));

                    // Closest point on cursor path to shiggy center
                    const closestX = tickStartCursorX + pathDx * t;
                    const closestY = tickStartCursorY + pathDy * t;

                    // Distance from closest point to shiggy center
                    const closestDx = sx - closestX;
                    const closestDy = sy - closestY;
                    const closestDist = Math.sqrt(closestDx * closestDx + closestDy * closestDy);

                    if (closestDist < minDist && closestDist > 0.01) {
                        // Collision detected along the path
                        const overlap = minDist - closestDist;
                        const nx = closestDx / closestDist;
                        const ny = closestDy / closestDist;
                        s.x += nx * overlap; s.y += ny * overlap;

                        // Use cursor velocity for momentum transfer
                        const cursorNormal =
                            this._cursorVx * nx + this._cursorVy * ny;
                        if (cursorNormal > 0) {
                            s.vx += nx * cursorNormal * CURSOR_MASS_TRANSFER;
                            s.vy += ny * cursorNormal * CURSOR_MASS_TRANSFER;
                        }
                    }
                }
            }
        }
    }
}
