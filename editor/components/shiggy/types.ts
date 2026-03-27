// types.ts
//
// Purpose: Shared types and constants for shiggy system

export const GIF_RESTART_MS = 11000;
export const AUTO_SPAWN_MS = 6000;
export const PET_SUMMON_THRESHOLD = 5;
export const AUTO_SPAWN_MILESTONE = 100;
export const SHIGGY_SIZE = 60;
export const SHIGGY_RADIUS = 28;
export const SHIGGY_HITBOX_RADIUS = 18;
export const FOLLOW_UNLOCK_PETS = 5;
export const MAX_FOLLOWERS = 10;
export const PROXIMITY_PX = 200;
export const FOLLOW_PROXIMITY_PX = 80;
export const DWELL_TIME_MS = 2000;
export const MAX_FOLLOW_SPEED = 800;
export const UNFOLLOW_YANK_PX_S = 1800;
export const UNFOLLOW_BUFFER_MS = 800;
export const OFFSET_RADIUS = 80;

// Elastic rope physics
export const ROPE_SLACK = 60;
export const ROPE_K = 0.045;
export const ROPE_DAMPING = 0.978;
export const ROPE_AXIAL_DAMPING = 0.10;
export const MAX_VEL = Infinity;

// Collision
export const CURSOR_RADIUS = 16;
export const CURSOR_MASS_TRANSFER = 0.6;
export const CURSOR_HOTSPOT_RADIUS = 24;

// NPC movement (slow hockey puck)
export const NPC_FRICTION = 0.99;
export const NPC_BOUNCE_ENERGY = 1.0;
export const NPC_IDLE_SPEED = 0.45;
export const NPC_WAYPOINT_DIST_MIN = 60;
export const NPC_WAYPOINT_MIN_MS = 3000;
export const NPC_WAYPOINT_RAND_MS = 3000;
export const NPC_IDLE_PAUSE_MIN_MS = 500;
export const NPC_IDLE_PAUSE_RAND_MS = 1500;
export const EXPLORE_CHANCE = 0.00015;
export const EXPLORE_DURATION_MS = 8000;
export const EXPLORE_MIN_FOLLOW_MS = 12000;

// Conversation
export const CONVO_PROXIMITY = 100;
export const CONVO_CHANCE = 0.002;

export interface SummonedShiggy {
    img: HTMLImageElement;
    gifTimer: ReturnType<typeof setInterval>;
    following: boolean;
    followingSince: number;
    exploring: boolean;
    exploreUntil: number;
    approaching: boolean;
    unfollowAt: number;
    targetX: number;
    targetY: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    smoothVx: number;
    smoothVy: number;
    offsetAngle: number;
    offsetDist: number;
    cursorBias: number;
    dialogue: HTMLDivElement | null;
    waypointX: number;
    waypointY: number;
    waypointTimer: number;
    inConversation: boolean;
    convoPartner: SummonedShiggy | null;
    convoTurn: number;
    convoTimer: ReturnType<typeof setTimeout> | null;
}

export interface MouseSample {
    x: number;
    y: number;
    t: number;
}

export function injectShiggyCss(): void {
    if (document.getElementById("shiggy-css")) return;
    const style = document.createElement("style");
    style.id = "shiggy-css";
    style.textContent = `
        @keyframes shiggy-float {
            0%, 100% { transform: translateY(0); }
            25% { transform: translateY(-8px); }
            75% { transform: translateY(-4px); }
        }
        @keyframes shiggy-summon-enter {
            0% { transform: scale(0) rotate(-20deg); opacity: 0; }
            60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes shiggy-summon-exit {
            0% { transform: scale(1) rotate(0deg); opacity: 1; }
            40% { transform: scale(1.1) rotate(-10deg); opacity: 0.8; }
            100% { transform: scale(0) rotate(30deg); opacity: 0; }
        }
        @keyframes shiggy-convo-pop {
            0% { opacity: 0; transform: translateX(-50%) scale(0.7); }
            20% { opacity: 1; transform: translateX(-50%) scale(1.05); }
            35% { transform: translateX(-50%) scale(1); }
            80% { opacity: 1; }
            100% { opacity: 0; transform: translateX(-50%) translateY(-6px); }
        }
    `;
    document.head.appendChild(style);
}
