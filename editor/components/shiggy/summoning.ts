// summoning.ts
//
// Purpose: Summoned shiggy lifecycle management
// - Spawns new shiggys at random positions with physics init
// - Manages GIF restart timers
// - Clears all summoned shiggys with exit animation

import { SummonedShiggy, SHIGGY_SIZE, GIF_RESTART_MS, OFFSET_RADIUS } from "./types";
import { clearDialogue } from "./dialogue";

export function spawnShiggy(onPop: () => void): SummonedShiggy {
    const img = document.createElement("img");
    img.src = `assets/images/shiggy.gif?v=${Date.now()}`;
    const floatDuration = 3 + Math.random() * 4;
    const wobbleDuration = 4 + Math.random() * 3;
    img.style.cssText = `width: ${SHIGGY_SIZE}px; height: auto; pointer-events: none; opacity: 0; position: fixed; z-index: 9999; image-rendering: auto;`;

    const maxX = window.innerWidth - SHIGGY_SIZE;
    const maxY = window.innerHeight - SHIGGY_SIZE;
    const x = Math.random() * maxX;
    const y = Math.random() * maxY;
    img.style.left = `${x}px`;
    img.style.top = `${y}px`;

    document.body.appendChild(img);

    requestAnimationFrame(() => {
        img.style.opacity = "1";
        img.style.animation = `shiggy-summon-enter 0.4s ease-out both, shiggy-float ${floatDuration}s ease-in-out 0.4s infinite, shiggy-wobble ${wobbleDuration}s ease-in-out 0.4s infinite`;
    });

    onPop();

    const gifTimer = setInterval(() => {
        restartGif(img);
    }, GIF_RESTART_MS);

    return {
        img, gifTimer,
        following: false, followingSince: 0, exploring: false, exploreUntil: 0,
        approaching: false,
        unfollowAt: 0, targetX: x, targetY: y,
        x, y, vx: 0, vy: 0,
        rotation: 0,
        smoothVx: 0, smoothVy: 0,
        offsetAngle: Math.random() * Math.PI * 2,
        offsetDist: OFFSET_RADIUS * (0.4 + Math.random() * 0.6),
        cursorBias: (Math.random() - 0.5) * 2,
        dialogue: null,
        waypointX: Math.random() * maxX,
        waypointY: Math.random() * maxY,
        waypointTimer: 0,
        inConversation: false, convoPartner: null,
        convoTurn: 0, convoTimer: null,
    };
}

export function clearAllSummoned(summoned: SummonedShiggy[]): void {
    for (const s of summoned) {
        clearInterval(s.gifTimer);
        if (s.convoTimer) clearTimeout(s.convoTimer);
        clearDialogue(s);
        s.img.style.animation = "shiggy-summon-exit 0.4s ease-in forwards";
        s.img.style.pointerEvents = "none";
        const img = s.img;
        setTimeout(() => img.remove(), 450);
    }
    summoned.length = 0;
}

export function restartGif(img: HTMLImageElement): void {
    const url = img.src.split("?")[0] + `?v=${Date.now()}`;
    const preloader = new Image();
    preloader.onload = () => { img.src = url; };
    preloader.src = url;
}

export function startGifRestart(
    mainImg: HTMLImageElement,
    summoned: SummonedShiggy[],
): ReturnType<typeof setInterval> {
    return setInterval(() => {
        restartGif(mainImg);
        for (const s of summoned) {
            restartGif(s.img);
        }
    }, GIF_RESTART_MS);
}
