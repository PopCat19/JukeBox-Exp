// physics.worker.ts
//
// Owns all shiggy physics state. Receives commands + input each frame,
// returns a Float32Array of [x, y, rotation, tension, following, exploring, napping] per shiggy.
// No DOM access — pure math only.

declare function postMessage(message: any, transfer?: Transferable[]): void;

import {
    SHIGGY_SIZE, SHIGGY_RADIUS, ROPE_SLACK, ROPE_K, ROPE_DAMPING,
    ROPE_AXIAL_DAMPING, MAX_VEL, NPC_FRICTION, NPC_BOUNCE_ENERGY,
    NPC_IDLE_SPEED, NPC_WAYPOINT_DIST, NPC_WAYPOINT_MIN_MS, NPC_WAYPOINT_RAND_MS,
    CURSOR_RADIUS, CURSOR_MASS_TRANSFER,
    EXPLORE_CHANCE, EXPLORE_DURATION_MS, EXPLORE_MIN_FOLLOW_MS,
    UNFOLLOW_BUFFER_MS, MAX_FOLLOW_SPEED, MAX_FOLLOWERS,
    PROXIMITY_PX, DWELL_TIME_MS, OFFSET_RADIUS,
} from "./types";

interface PhysState {
    x: number; y: number;
    vx: number; vy: number;
    rotation: number;
    smoothVx: number; smoothVy: number;
    following: boolean;
    followingSince: number;
    unfollowAt: number;
    exploring: boolean;
    exploreUntil: number;
    isNapping: boolean;
    waypointX: number; waypointY: number;
    waypointTimer: number;
    offsetAngle: number;
    offsetDist: number;
    cursorBias: number;
    inConversation: boolean;
    battleTarget: number;
    congaLeaderIdx: number;
}

const states: PhysState[] = [];
let cursorX = 0, cursorY = 0;
let cursorVx = 0, cursorVy = 0;
let prevCursorX = 0, prevCursorY = 0;
let mouseSpeed = 0;
let dwellX = 0, dwellY = 0, dwellStart = 0;
let activeEvent: string | null = null;
let eventEndsAt = 0;
let eventCongaChain: number[] = [];
let viewW = 800, viewH = 600;

const FIELDS = 8;
let outBuffer = new Float32Array(0);

function ensureBuffer(n: number): void {
    if (outBuffer.length !== n * FIELDS) {
        outBuffer = new Float32Array(n * FIELDS);
    }
}

function lerpAngle(current: number, target: number, rate: number): number {
    const delta = ((target - current + 540) % 360) - 180;
    return current + delta * rate;
}

function clampVel(s: PhysState): void {
    const spd = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
    if (spd > MAX_VEL) {
        s.vx = (s.vx / spd) * MAX_VEL;
        s.vy = (s.vy / spd) * MAX_VEL;
    }
}

function collideViewport(s: PhysState): void {
    const maxX = viewW - SHIGGY_SIZE;
    const maxY = viewH - SHIGGY_SIZE;
    if (s.x < 0)    { s.x = 0;    if (s.vx < 0) s.vx =  Math.abs(s.vx) * NPC_BOUNCE_ENERGY; }
    if (s.x > maxX) { s.x = maxX; if (s.vx > 0) s.vx = -Math.abs(s.vx) * NPC_BOUNCE_ENERGY; }
    if (s.y < 0)    { s.y = 0;    if (s.vy < 0) s.vy =  Math.abs(s.vy) * NPC_BOUNCE_ENERGY; }
    if (s.y > maxY) { s.y = maxY; if (s.vy > 0) s.vy = -Math.abs(s.vy) * NPC_BOUNCE_ENERGY; }
}

function pickWaypoint(s: PhysState, now: number): void {
    const margin = SHIGGY_SIZE;
    s.waypointX = margin + Math.random() * (viewW - margin * 2);
    s.waypointY = margin + Math.random() * (viewH - margin * 2);
    s.waypointTimer = now + NPC_WAYPOINT_MIN_MS + Math.random() * NPC_WAYPOINT_RAND_MS;
}

function tickFollower(s: PhysState, now: number): number {
    const followDuration = now - s.followingSince;
    if (followDuration > EXPLORE_MIN_FOLLOW_MS && Math.random() < EXPLORE_CHANCE) {
        s.following = false;
        s.followingSince = 0;
        s.exploring = true;
        s.exploreUntil = now + EXPLORE_DURATION_MS * (0.5 + Math.random());
        s.vx += (Math.random() - 0.5) * 4;
        s.vy += (Math.random() - 0.5) * 4;
        return 0;
    }

    const tooFast = mouseSpeed > MAX_FOLLOW_SPEED;
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
    const dx = cursorX - cx;
    const dy = cursorY - cy;
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
    clampVel(s);

    s.x += s.vx;
    s.y += s.vy;

    const alpha = 0.08;
    s.smoothVx += alpha * (s.vx - s.smoothVx);
    s.smoothVy += alpha * (s.vy - s.smoothVy);
    const smoothSpd = Math.sqrt(s.smoothVx ** 2 + s.smoothVy ** 2);
    if (smoothSpd > 0.15) {
        const angle = Math.atan2(s.smoothVy, s.smoothVx) * (180 / Math.PI) + 90;
        s.rotation = lerpAngle(s.rotation, angle, 0.08 + tension * 0.08);
    } else {
        s.rotation = lerpAngle(s.rotation, 0, 0.04);
    }

    return tension;
}

function tickIdle(s: PhysState, now: number): void {
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
        pickWaypoint(s, now);
    }
    s.rotation = lerpAngle(s.rotation, 0, 0.06);
    s.x += s.vx;
    s.y += s.vy;
    collideViewport(s);

    const fdx = cursorX - cx;
    const fdy = cursorY - cy;
    const fdist = Math.sqrt(fdx * fdx + fdy * fdy);
    const dwelling = (now - dwellStart) > DWELL_TIME_MS;
    const tooFast = mouseSpeed > MAX_FOLLOW_SPEED;
    let followerCount = 0;
    for (const st of states) { if (st.following) followerCount++; }
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

function applyEvent(s: PhysState, idx: number, now: number): void {
    if (!activeEvent || now >= eventEndsAt) return;
    switch (activeEvent) {
        case "zoomies":
            s.vx += (Math.random() - 0.5) * 0.4;
            s.vy += (Math.random() - 0.5) * 0.4;
            break;
        case "gravitywell": {
            const cx = viewW / 2, cy = viewH / 2;
            const sx = s.x + SHIGGY_SIZE / 2, sy = s.y + SHIGGY_SIZE / 2;
            const dx = cx - sx, dy = cy - sy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1) {
                const progress = (now - (eventEndsAt - 8000)) / 8000;
                const strength = 0.08 * Math.sin(progress * Math.PI);
                s.vx += (dx / dist) * strength * dist * 0.012;
                s.vy += (dy / dist) * strength * dist * 0.012;
            }
            break;
        }
        case "conga": {
            const pos = eventCongaChain.indexOf(idx);
            if (pos <= 0) break;
            const leaderIdx = eventCongaChain[pos - 1];
            const leader = states[leaderIdx];
            if (!leader) break;
            const dx = (leader.x + SHIGGY_SIZE / 2) - (s.x + SHIGGY_SIZE / 2);
            const dy = (leader.y + SHIGGY_SIZE / 2) - (s.y + SHIGGY_SIZE / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const gap = SHIGGY_SIZE * 1.4;
            if (dist > gap) {
                s.vx += (dx / dist) * (dist - gap) * 0.06;
                s.vy += (dy / dist) * (dist - gap) * 0.06;
            }
            s.vx *= NPC_FRICTION;
            s.vy *= NPC_FRICTION;
            break;
        }
        case "battleroyale": {
            const t = s.battleTarget;
            if (t < 0 || !states[t]) break;
            const target = states[t];
            const dx = (target.x + SHIGGY_SIZE / 2) - (s.x + SHIGGY_SIZE / 2);
            const dy = (target.y + SHIGGY_SIZE / 2) - (s.y + SHIGGY_SIZE / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1) { s.vx += (dx / dist) * 0.35; s.vy += (dy / dist) * 0.35; }
            s.vx *= 0.95; s.vy *= 0.95;
            break;
        }
        case "nap":
            break;
    }
}

function tickOne(s: PhysState, idx: number, now: number): number {
    if (s.inConversation) {
        s.vx *= NPC_FRICTION;
        s.vy *= NPC_FRICTION;
        s.x += s.vx;
        s.y += s.vy;
        collideViewport(s);
        return 0;
    }

    if (activeEvent && now < eventEndsAt) {
        applyEvent(s, idx, now);
    }

    if (s.isNapping) {
        s.vx *= 0.82;
        s.vy *= 0.82;
        s.rotation = lerpAngle(s.rotation, 0, 0.05);
        s.x += s.vx;
        s.y += s.vy;
        collideViewport(s);
        return 0;
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
            s.rotation = lerpAngle(s.rotation, 0, 0.04);
        }
        s.x += s.vx;
        s.y += s.vy;
        collideViewport(s);
        return 0;
    }

    if (s.following) {
        return tickFollower(s, now);
    }

    tickIdle(s, now);
    return 0;
}

function collideAll(): void {
    for (let i = 0; i < states.length; i++) {
        for (let j = i + 1; j < states.length; j++) {
            const a = states[i], b = states[j];
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
                }
            }
        }
    }
}

function collideCursor(): void {
    for (const s of states) {
        if (s.following) continue;
        const sx = s.x + SHIGGY_SIZE / 2, sy = s.y + SHIGGY_SIZE / 2;
        const dx = sx - cursorX, dy = sy - cursorY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = SHIGGY_RADIUS + CURSOR_RADIUS;
        if (dist < minDist && dist > 0.01) {
            const overlap = minDist - dist;
            const nx = dx / dist, ny = dy / dist;
            s.x += nx * overlap; s.y += ny * overlap;
            s.vx += cursorVx * CURSOR_MASS_TRANSFER;
            s.vy += cursorVy * CURSOR_MASS_TRANSFER;
            const dot = s.vx * nx + s.vy * ny;
            if (dot < 0) { s.vx -= dot * nx * 1.5; s.vy -= dot * ny * 1.5; }
        }
    }
}

self.onmessage = (e: MessageEvent) => {
    const msg = e.data;

    switch (msg.type) {

        case "resize":
            viewW = msg.w;
            viewH = msg.h;
            break;

        case "addShiggy":
            states.push({
                x: msg.x, y: msg.y, vx: 0, vy: 0,
                rotation: 0, smoothVx: 0, smoothVy: 0,
                following: false, followingSince: 0, unfollowAt: 0,
                exploring: false, exploreUntil: 0,
                isNapping: false,
                waypointX: Math.random() * viewW,
                waypointY: Math.random() * viewH,
                waypointTimer: 0,
                offsetAngle: Math.random() * Math.PI * 2,
                offsetDist: OFFSET_RADIUS * (0.4 + Math.random() * 0.6),
                cursorBias: (Math.random() - 0.5) * 2,
                inConversation: false,
                battleTarget: -1,
                congaLeaderIdx: -1,
            });
            break;

        case "removeShiggy":
            states.splice(msg.index, 1);
            for (const s of states) {
                if (s.battleTarget >= msg.index) s.battleTarget--;
            }
            break;

        case "clearAll":
            states.length = 0;
            activeEvent = null;
            break;

        case "cursor":
            cursorVx = msg.x - prevCursorX;
            cursorVy = msg.y - prevCursorY;
            prevCursorX = cursorX;
            prevCursorY = cursorY;
            cursorX = msg.x;
            cursorY = msg.y;
            mouseSpeed = msg.speed;
            {
                const ddx = msg.x - dwellX;
                const ddy = msg.y - dwellY;
                if (Math.sqrt(ddx * ddx + ddy * ddy) > PROXIMITY_PX * 0.5) {
                    dwellX = msg.x; dwellY = msg.y; dwellStart = msg.now;
                }
            }
            break;

        case "setConversation":
            if (states[msg.index]) states[msg.index].inConversation = msg.value;
            break;

        case "event":
            activeEvent = msg.event;
            eventEndsAt = msg.endsAt;
            eventCongaChain = msg.congaChain ?? [];
            if (msg.event === "nap") {
                for (const s of states) s.isNapping = true;
            }
            if (msg.event === null) {
                for (const s of states) {
                    s.isNapping = false;
                    s.battleTarget = -1;
                }
            }
            if (msg.event === "battleroyale") {
                for (let i = 0; i < states.length; i++) {
                    const others = states.map((_, j) => j).filter(j => j !== i);
                    states[i].battleTarget = others.length
                        ? others[Math.floor(Math.random() * others.length)]
                        : -1;
                }
            }
            break;

        case "tick": {
            const now = msg.now;
            ensureBuffer(states.length);

            const tensions: number[] = [];
            for (let i = 0; i < states.length; i++) {
                tensions[i] = tickOne(states[i], i, now);
            }
            collideAll();
            collideCursor();
            for (let i = 0; i < states.length; i++) {
                collideViewport(states[i]);
            }

            for (let i = 0; i < states.length; i++) {
                const s = states[i];
                const base = i * FIELDS;
                outBuffer[base + 0] = s.x;
                outBuffer[base + 1] = s.y;
                outBuffer[base + 2] = s.rotation;
                outBuffer[base + 3] = tensions[i];
                outBuffer[base + 4] = s.following ? 1 : 0;
                outBuffer[base + 5] = s.exploring ? 1 : 0;
                outBuffer[base + 6] = s.isNapping ? 1 : 0;
                outBuffer[base + 7] = s.unfollowAt > 0 ? 1 : 0;
            }

            const transfer = outBuffer.buffer.slice(0);
            postMessage({ type: "frame", buffer: transfer, count: states.length }, [transfer]);
            break;
        }
    }
};
