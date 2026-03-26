// types.ts
//
// Purpose: Shared types and constants for shiggy system

export const GIF_RESTART_MS = 11000;
export const AUTO_SPAWN_MS = 6000;
export const PET_SUMMON_THRESHOLD = 5;
export const AUTO_SPAWN_MILESTONE = 100;
export const SHIGGY_SIZE = 60;
export const SHIGGY_RADIUS = 28;
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
export const MAX_VEL = 18;

// Collision
export const CURSOR_RADIUS = 16;
export const CURSOR_MASS_TRANSFER = 0.6;

// NPC movement (slow hockey puck)
export const NPC_FRICTION = 0.99;
export const NPC_BOUNCE_ENERGY = 0.75;
export const NPC_IDLE_SPEED = 0.45;
export const NPC_WAYPOINT_DIST_MIN = 60;
export const NPC_WAYPOINT_DIST_MAX = 220;
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
export const CONVO_LINE_INTERVAL = 2200;
export const CONVO_LINES = 4;

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
    rotation: number;
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
    const style = document.createElement("style");
    style.textContent = `
        @keyframes shiggy-float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-8px) rotate(3deg); }
            75% { transform: translateY(-4px) rotate(-3deg); }
        }
        @keyframes shiggy-wobble {
            0%, 100% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(5deg) scale(1.05); }
            50% { transform: rotate(0deg) scale(1); }
            75% { transform: rotate(-5deg) scale(1.05); }
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

export const PET_MESSAGES: string[] = [
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

export const NPC_LINES: string[] = [
    "boing boing", "shiggy shiggy!", "*wiggles*", "*squeak*",
    "bounnnnce", "wheeee~", "*happy shiggy noises*",
    "shiggy??", "more shiggy!", "*spins*",
    "boing!", "*pats the ground*", "shiggy here!",
    "slidy slide", "*hops*", "shiggy go brrr",
    "*wiggles ears*", "bounce bounce bounce",
    "shiggy shiggy boing!", "*vibrates happily*",
    "where cursor go?", "shiggy see shiggy do",
    "*taps*", "shiggy life best life",
];

export const CONVO_EXCHANGES: [string, string][] = [
    ["boing?", "boing boing!"],
    ["shiggy!", "shiggy shiggy!!"],
    ["*wiggles at you*", "*wiggles back*"],
    ["you bounce good", "no YOU bounce good"],
    ["shiggy count go up", "more boing for everyone"],
    ["*bonk*", "*bonk bonk*"],
    ["where cursor", "cursor everywhere and nowhere"],
    ["feel the boing", "i AM the boing"],
    ["shiggy", "shiggy."],
    ["*happy wiggle*", "*happier wiggle*"],
    ["we are legion", "we are shiggy"],
    ["*squeak squeak*", "*squeak*"],
    ["*slides into you*", "*slides away*"],
    ["boing theory", "boing practice"],
    ["shiggy friend?", "shiggy forever"],
    ["*nuzzle*", "*nuzzle nuzzle*"],
    ["bounce with me", "always and forever"],
    ["*looks at cursor*", "*also looks at cursor*"],
    ["shiggy power grows", "shiggy power infinite"],
];

export const CONVO_RESPONSES: [string, string][] = [
    ["boing!", "BOING!"],
    ["*wiggles more*", "*wiggles even more*"],
    ["shiggy shiggy", "shiggy shiggy shiggy"],
    ["*happy squeak*", "*happier squeak*"],
    ["yes yes", "more more"],
    ["*bounces*", "*bounces harder*"],
];
